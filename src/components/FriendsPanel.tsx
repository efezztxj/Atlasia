import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePanelAccess } from "../hooks/usePanelAccess";
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
  subscribeFriendRequests,
  subscribeFriends,
  type FriendIndex,
  type FriendRequest,
} from "../lib/friendships";
import { subscribeUserProfileSearch, type UserProfile } from "../lib/userProfiles";
import {
  PROFILE_SEARCH_DEBOUNCE_MS,
  PROFILE_SEARCH_MIN_CHARS,
  clearRecentSearches,
  isSearchableQuery,
  normalizeProfileQuery,
  profileInitials,
  pushRecentSearch,
  rankProfiles,
  readRecentSearches,
  writeRecentSearches,
  type RecentProfileSearch,
} from "../lib/profileSearch";

interface Props {
  onClose: () => void;
}

type Tab = "friends" | "requests" | "add";

function errorText(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  switch (code) {
    case "friend-request/exists":
      return "Bu kişiye bekleyen isteğin var ya da zaten arkadaşsınız.";
    case "friend-request/opposite-exists":
      return "Karşı taraf sana zaten istek göndermiş. İstekler sekmesinden kabul et.";
    case "friend-request/self":
      return "Kendine istek gönderemezsin.";
    case "friend-request/uid-invalid":
      return "Hesap kimliği geçersiz görünüyor.";
    case "friend-request/not-found":
      return "Bu istek artık yok. Liste yenilendiğinde güncellenir.";
    case "friend-request/already-friends":
      return "Bu kişi zaten arkadaşın. Arkadaşlar sekmesinden yönetebilirsin.";
    case "friend-request/offline":
      return "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
    case "friend-request/not-signed-in":
      return "İstek göndermek için giriş yap.";
    case "friend-request/rules-mismatch":
      return "İstek gönderilemedi: sunucu bu işlemi reddetti. Uygulama güncellendiyse sunucu güvenlik kurallarının da güncellenmesi gerekir; yöneticiye bildir.";
    case "friend-request/failed":
      return "İstek gönderilemedi. Biraz sonra tekrar dene.";
    case "friendship/not-found":
      return "Arkadaşlık kaydı bulunamadı.";
    case "data/unavailable":
      return "Bulut bağlantısı hazır değil. İnternetini kontrol edip tekrar dene.";
    default:
      return "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.";
  }
}

export default function FriendsPanel({ onClose }: Props) {
  const { user } = useAuth();
  const panelRef = usePanelAccess(true, onClose);
  const cloud = user?.backend === "firebase";
  const uid = user?.uid ?? "";
  const myName = user?.displayName?.trim() || "Gezgin";

  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendIndex[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [targetUid, setTargetUid] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentUids, setSentUids] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentProfileSearch[]>([]);

  useEffect(() => {
    if (!cloud || !uid) {
      setFriends([]);
      setRequests([]);
      return;
    }
    const onError = (error: Error) => setLoadError(errorText(error));
    const offFriends = subscribeFriends(uid, setFriends, onError);
    const offRequests = subscribeFriendRequests(uid, setRequests, onError);
    return () => {
      offFriends();
      offRequests();
    };
  }, [cloud, uid]);

  useEffect(() => {
    setRecent(uid ? readRecentSearches(typeof localStorage === "undefined" ? null : localStorage, uid) : []);
  }, [uid]);

  // Her tuşta Firestore sorgusu açmamak için yazma durunca aranır (ücretsiz kota).
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), PROFILE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!cloud || tab !== "add" || !isSearchableQuery(debouncedSearch)) {
      setProfiles([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const unsubscribe = subscribeUserProfileSearch(
      debouncedSearch,
      (items) => {
        if (!active) return;
        setProfiles(items);
        setSearching(false);
      },
      () => {
        if (!active) return;
        setProfiles([]);
        setSearching(false);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [cloud, tab, debouncedSearch]);

  // Dizin gecikmeli olabildiği için sıralama/süzme her zaman yerelde de yapılır.
  const suggestions = useMemo(
    () => (isSearchableQuery(debouncedSearch) ? rankProfiles(profiles, debouncedSearch, { excludeUid: uid }) : []),
    [profiles, debouncedSearch, uid],
  );

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    setBusy(key);
    setStatus(null);
    try {
      await action();
      if (success) setStatus(success);
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setBusy(null);
    }
  };

  const addByUid = () => {
    const target = targetUid.trim();
    if (!target) {
      setStatus("Eklemek için karşı tarafın hesap kimliğini gir.");
      return;
    }
    if (target === uid) {
      setStatus("Kendine istek gönderemezsin.");
      return;
    }
    void run(
      "add",
      () => sendFriendRequest({ fromUid: uid, fromName: myName, toUid: target }),
      "İstek gönderildi. Karşı taraf kabul edince arkadaş listende görünecek.",
    );
  };

  const invite = (profile: UserProfile) => {
    void run(
      `invite-${profile.uid}`,
      async () => {
        await sendFriendRequest({ fromUid: uid, fromName: myName, toUid: profile.uid });
        setSentUids((current) => (current.includes(profile.uid) ? current : [...current, profile.uid]));
        setRecent((current) => {
          const next = pushRecentSearch(current, { uid: profile.uid, displayName: profile.displayName });
          writeRecentSearches(typeof localStorage === "undefined" ? null : localStorage, uid, next);
          return next;
        });
      },
      `${profile.displayName} kişisine istek gönderildi. Arkadaş listende kabul edince görünecek.`,
    );
  };

  const accept = (request: FriendRequest) => {
    void run(
      `accept-${request.fromUid}`,
      async () => {
        await acceptFriendRequest(uid, request.fromUid, myName);
      },
      `${request.fromName} artık arkadaşın.`,
    );
  };

  const decline = (request: FriendRequest) => {
    void run(`decline-${request.fromUid}`, () => declineFriendRequest(uid, request.fromUid), "İstek reddedildi.");
  };

  const remove = (friendUid: string) => {
    void run(
      `remove-${friendUid}`,
      async () => {
        await removeFriend(uid, friendUid);
        setConfirmRemove(null);
      },
      "Arkadaşlıktan çıkarıldı.",
    );
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "friends", label: "Arkadaşlar", count: friends.length },
    { id: "requests", label: "İstekler", count: requests.length },
    { id: "add", label: "Ekle" },
  ];

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="friends-title"
      className="settings-sheet fixed top-[68px] right-0 bottom-0 z-[55] flex w-full max-w-[390px] flex-col overflow-hidden border-l border-leaf/20 bg-ink-2 md:top-[88px] md:right-4 md:bottom-4 md:rounded-3xl md:border"
    >
      <header className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
        <h2 id="friends-title" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Users className="size-5 text-sun" />Arkadaşlarım
        </h2>
        <button type="button" onClick={onClose} aria-label="Arkadaşlar panelini kapat" className="grid size-11 place-items-center rounded-full hover:bg-white/5">
          <X size={19} />
        </button>
      </header>

      {!cloud ? (
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <p className="mt-2 flex items-start gap-2 rounded-xl border border-sun/25 bg-sun/[0.07] p-3 text-[13px] leading-relaxed text-mint/80">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-sun" />
            Arkadaşlık, hesaplar arası bir özellik. Bu cihaza özel hesapta arkadaş ekleme kapalı; e-posta ile giriş yaparsan
            açılır.
          </p>
          <p className="mt-3 text-[12px] text-mint/70">Kaydettiğin yerler ve rotalar bu cihazda güvende kalır.</p>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Arkadaşlık sekmeleri" className="mx-6 flex shrink-0 gap-1 rounded-full border border-white/10 p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={tab === item.id}
                onClick={() => {
                  setTab(item.id);
                  setStatus(null);
                }}
                className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold transition ${
                  tab === item.id ? "bg-sun text-ink" : "text-mint/75 hover:bg-white/5"
                }`}
              >
                {item.label}
                {typeof item.count === "number" && item.count > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] ${tab === item.id ? "bg-ink/20" : "bg-white/10"}`}>{item.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
            {loadError && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-[12px] text-red-200">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />{loadError}
              </p>
            )}

            {tab === "friends" && (
              <section aria-label="Arkadaş listesi">
                {friends.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-[14px] font-medium">Henüz arkadaşın yok.</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-mint/70">
                      Ekle sekmesinden hesap kimliğiyle ya da isimle arayarak istek gönder. Karşı taraf kabul edince
                      listende görünür.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {friends.map((friend) => (
                      <li key={friend.friendUid} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold">{friend.friendName}</p>
                            <code className="mt-0.5 block truncate text-[11px] text-mint/70">{friend.friendUid}</code>
                          </div>
                          {confirmRemove === friend.friendUid ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => remove(friend.friendUid)}
                                disabled={busy === `remove-${friend.friendUid}`}
                                className="flex min-h-8 items-center gap-1 rounded-full bg-red-400/90 px-2.5 text-[11px] font-semibold text-ink disabled:opacity-60"
                              >
                                {busy === `remove-${friend.friendUid}` ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                Onayla
                              </button>
                              <button type="button" onClick={() => setConfirmRemove(null)} className="grid size-8 place-items-center rounded-full border border-white/10" aria-label="Vazgeç">
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(friend.friendUid)}
                              className="flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 text-[11px] text-mint/75 hover:bg-white/5"
                            >
                              <UserMinus className="size-3" />Çıkar
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === "requests" && (
              <section aria-label="Gelen arkadaşlık istekleri">
                {requests.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-[13px] text-mint/70">
                    Bekleyen istek yok. Sana istek geldiğinde burada ve bildirimlerde görünür.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {requests.map((request) => (
                      <li key={request.fromUid} className="rounded-xl border border-sun/20 bg-sun/[0.06] p-3">
                        <p className="truncate text-[14px] font-semibold">{request.fromName}</p>
                        <code className="mt-0.5 block truncate text-[11px] text-mint/70">{request.fromUid}</code>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => accept(request)}
                            disabled={busy === `accept-${request.fromUid}`}
                            className="flex min-h-9 items-center gap-1.5 rounded-full bg-leaf px-3 text-[12px] font-semibold text-ink disabled:opacity-60"
                          >
                            {busy === `accept-${request.fromUid}` ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                            Kabul et
                          </button>
                          <button
                            type="button"
                            onClick={() => decline(request)}
                            disabled={busy === `decline-${request.fromUid}`}
                            className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/12 px-3 text-[12px] text-mint/80 disabled:opacity-60"
                          >
                            {busy === `decline-${request.fromUid}` ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                            Reddet
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === "add" && (
              <section aria-label="Arkadaş ekle" className="space-y-4">
                <div>
                  <label htmlFor="friend-search" className="block text-[13px] text-mint/80">İsimle ara</label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mint/70" />
                    <input
                      id="friend-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={`En az ${PROFILE_SEARCH_MIN_CHARS} harf yaz`}
                      autoComplete="off"
                      spellCheck={false}
                      className="h-11 w-full rounded-xl border border-leaf/25 bg-ink pr-10 pl-9 text-[13px] outline-none placeholder:text-mint/70 focus:border-sun/60"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Aramayı temizle"
                        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-mint/70 hover:bg-white/5"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {!isSearchableQuery(search) && recent.length > 0 && (
                  <div aria-label="Son aramalar">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-mint/70">Son aramalar</p>
                      <button
                        type="button"
                        onClick={() => {
                          setRecent([]);
                          clearRecentSearches(typeof localStorage === "undefined" ? null : localStorage, uid);
                        }}
                        className="min-h-8 text-[11px] text-mint/70 hover:text-sun"
                      >
                        Temizle
                      </button>
                    </div>
                    <ul className="mt-1 space-y-1">
                      {recent.map((item) => (
                        <li key={item.uid}>
                          <button
                            type="button"
                            onClick={() => setSearch(item.displayName)}
                            className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2 text-left hover:bg-white/5"
                          >
                            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sun/15 text-[11px] font-semibold text-sun">
                              {profileInitials(item.displayName)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px]">{item.displayName}</span>
                            <Search size={13} className="shrink-0 text-mint/70" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isSearchableQuery(search) && (
                  <div aria-busy={searching || undefined}>
                    {searching && suggestions.length === 0 && (
                      <ul aria-hidden="true" className="space-y-1.5">
                        {[0, 1, 2].map((row) => (
                          <li key={row} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                            <span className="size-9 shrink-0 animate-pulse rounded-full bg-white/10" />
                            <span className="h-3 flex-1 animate-pulse rounded bg-white/10" />
                          </li>
                        ))}
                      </ul>
                    )}

                    {!searching && suggestions.length === 0 && (
                      <p className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[12px] leading-relaxed text-mint/70">
                        “{normalizeProfileQuery(search)}” ile eşleşen profil yok. Arkadaşının adını farklı yazmayı ya da
                        aşağıdan hesap kimliğiyle eklemeyi dene.
                      </p>
                    )}

                    {suggestions.length > 0 && (
                      <ul aria-label="Arama sonuçları" className="space-y-1.5">
                        {suggestions.map((profile) => {
                          const sent = sentUids.includes(profile.uid);
                          const pending = busy === `invite-${profile.uid}`;
                          return (
                            <li key={profile.uid} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                              {profile.photoURL ? (
                                <img src={profile.photoURL} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                              ) : (
                                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-sun/15 text-[12px] font-semibold text-sun">
                                  {profileInitials(profile.displayName)}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium">{profile.displayName}</p>
                                <p className="truncate font-mono text-[10px] text-mint/70">{profile.uid.slice(0, 8)}…</p>
                              </div>
                              {sent ? (
                                <span className="flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-leaf/30 px-2.5 text-[11px] font-semibold text-mint/70">
                                  <Check className="size-3" />Gönderildi
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => invite(profile)}
                                  disabled={pending}
                                  aria-label={`${profile.displayName} kişisine istek gönder`}
                                  className="flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-sun/40 px-2.5 text-[11px] font-semibold text-sun disabled:opacity-60"
                                >
                                  {pending ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                                  Ekle
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                <details className="border-t border-white/8 pt-3">
                  <summary className="min-h-8 cursor-pointer text-[12px] text-mint/70">Hesap kimliği (UID) ile ekle</summary>
                  <div className="mt-2">
                    <label htmlFor="friend-uid" className="block text-[13px] text-mint/80">Hesap kimliğiyle ekle</label>
                    <input
                      id="friend-uid"
                      value={targetUid}
                      onChange={(event) => setTargetUid(event.target.value)}
                      placeholder="Karşı tarafın UID'si"
                      autoComplete="off"
                      spellCheck={false}
                      className="mt-2 h-11 w-full rounded-xl border border-leaf/25 bg-ink px-3 font-mono text-[12px] outline-none placeholder:text-mint/70 focus:border-sun/60"
                    />
                    <button
                      type="button"
                      onClick={addByUid}
                      disabled={busy === "add" || !targetUid.trim()}
                      className="mt-2 flex min-h-10 items-center gap-2 rounded-full bg-sun px-4 text-[12px] font-semibold text-ink disabled:opacity-50"
                    >
                      {busy === "add" ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                      İstek gönder
                    </button>
                    <p className="mt-2 text-[11px] leading-relaxed text-mint/70">
                      Kendi kimliğini Profil sekmesinden kopyalayıp paylaşabilirsin.
                    </p>
                  </div>
                </details>

                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-mint/70">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                  Arkadaş listesi yalnızca iki taraf da kabul ettiğinde oluşur; tek taraflı yazma kurallarla engellenir.
                </p>
              </section>
            )}

            {status && (
              <p role="status" className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-[12px] text-sun">
                {status}
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

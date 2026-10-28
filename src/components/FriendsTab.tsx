import { useEffect, useRef, useState } from "react";
import { Check, Link2, Loader2, Search, UserMinus, UserPlus, X } from "lucide-react";
import { requestConfirm } from "./ConfirmDialog";
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
  type FriendIndex,
  type FriendRequest,
} from "../lib/friendships";
import { fetchUserProfile, searchUserProfiles, type UserProfile } from "../lib/userProfiles";
import { PROFILE_SEARCH_MIN_CHARS, isSearchableQuery, normalizeProfileQuery } from "../lib/profileSearch";
import { clearRecentSearches, pushRecentSearch, readRecentSearches } from "../lib/searchHistory";
import { SEARCH_DEBOUNCE_MS } from "../hooks/useDebouncedValue";
import { friendlyDataError } from "../lib/firestoreValue";
import { buildFriendInviteLink, shareOrCopy } from "../utils/inviteLink";

interface Props {
  currentUid: string;
  currentName: string;
  friends: FriendIndex[];
  requests: FriendRequest[];
  isBlocked: (uid?: string | null) => boolean;
  /** Arkadaş davet bağlantısıyla gelen kişi (bir kez gösterilir). */
  invitedByUid?: string | null;
  onInviteHandled?: () => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}

const ALREADY: Record<string, string> = {
  "friend-request/exists": "Bu kişiye zaten istek göndermişsin.",
  "friend-request/already-friends": "Zaten arkadaşsınız.",
  "friend-request/opposite-exists": "Bu kişi sana zaten istek göndermiş; aşağıdan kabul et.",
};

export default function FriendsTab({ currentUid, currentName, friends, requests, isBlocked, invitedByUid, onInviteHandled, onStatus, onError }: Props) {
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<UserProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches(currentUid));
  const [sent, setSent] = useState<Record<string, true>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [inviter, setInviter] = useState<UserProfile | null>(null);

  // Girdi değiştiği AN eski yanıt geçersizleşir; yalnız debounce sonrasında
  // kimlik artırmak, önceki isteğin 350 ms penceresinde sonuç yazmasına yol açar.
  const searchSeqRef = useRef(0);
  const queryRef = useRef("");
  const uidRef = useRef(currentUid);
  const mountedRef = useRef(true);
  const activeTermRef = useRef<string | null>(null);
  const requestedTermRef = useRef<string | null>(null);

  /** Bekleyen aramayı geçersiz kılar; eski sonuç ve "aranıyor" durumu temizlenir. */
  const invalidateSearch = () => {
    searchSeqRef.current += 1;
    activeTermRef.current = null;
    requestedTermRef.current = null;
    setSearching(false);
    setResults(null);
  };

  const changeQuery = (value: string) => {
    const normalized = normalizeProfileQuery(value);
    if (normalized !== queryRef.current) {
      queryRef.current = normalized;
      invalidateSearch();
    }
    setQueryText(value);
  };

  const friendSet = new Set(friends.map((friend) => friend.friendUid));
  const incoming = requests.filter((request) => !isBlocked(request.fromUid));
  const incomingSet = new Set(incoming.map((request) => request.fromUid));

  // En son `invalidateSearch` kimliği; hesap efekti işlevi ref üzerinden çağırır.
  const invalidateSearchRef = useRef(invalidateSearch);
  useEffect(() => { invalidateSearchRef.current = invalidateSearch; });

  useEffect(() => {
    // Bileşen başka hesapla yeniden kullanılırsa eski metin de yeni hesaba kalmaz.
    if (uidRef.current !== currentUid) {
      uidRef.current = currentUid;
      queryRef.current = "";
      setQueryText("");
      setSent({});
    }
    invalidateSearchRef.current();
    setRecent(readRecentSearches(currentUid));
  }, [currentUid]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      searchSeqRef.current += 1;
      activeTermRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!invitedByUid || invitedByUid === currentUid) {
      if (invitedByUid) onInviteHandled?.();
      return;
    }
    let active = true;
    void fetchUserProfile(invitedByUid)
      .then((profile) => { if (active) setInviter(profile ?? { uid: invitedByUid, displayName: "Atlasia gezgini", displayNameLower: "atlasia gezgini", createdAt: 0, updatedAt: 0 }); })
      .catch(() => { if (active) setInviter({ uid: invitedByUid, displayName: "Atlasia gezgini", displayNameLower: "atlasia gezgini", createdAt: 0, updatedAt: 0 }); });
    return () => { active = false; };
  }, [invitedByUid, currentUid, onInviteHandled]);

  const runSearch = async (value: string) => {
    const term = normalizeProfileQuery(value);
    if (!isSearchableQuery(term) || term !== queryRef.current || uidRef.current !== currentUid || !mountedRef.current) return;
    if (activeTermRef.current === term) return;
    const seq = ++searchSeqRef.current;
    activeTermRef.current = term;
    // Otomatik efekt, hızlı hata verse dahi çip/form sorgusunu tekrarlamaz.
    // Kullanıcı açık Ara eylemiyle hata sonrası aynı terimi yeniden deneyebilir.
    requestedTermRef.current = term;
    setSearching(true);
    try {
      const found = await searchUserProfiles(term, currentUid);
      if (seq !== searchSeqRef.current || !mountedRef.current || uidRef.current !== currentUid) return;
      setResults(found.filter((profile) => !isBlocked(profile.uid)));
      // Son aramalar cihazda, kişi başına tutulur (gizlilik + kota).
      setRecent(pushRecentSearch(currentUid, term));
    } catch (failure) {
      if (seq === searchSeqRef.current && mountedRef.current && uidRef.current === currentUid) {
        onError(friendlyDataError(failure, "Arama yapılamadı."));
      }
    } finally {
      // Aynı terim yeni bir nesilde yeniden aranmış olabilir: eski isteğin
      // bitişi yenisinin aktif kilidini kaldırmamalı.
      if (seq === searchSeqRef.current) {
        if (activeTermRef.current === term) activeTermRef.current = null;
        if (mountedRef.current) setSearching(false);
      }
    }
  };

  const search = () => runSearch(queryText);

  // En son `runSearch` kimliği: gecikmiş girdi değiştiğinde çağrılır, ancak
  // prop kimlikleri her render'da değişse bile efekt yeniden tetiklenmez.
  const runSearchRef = useRef(runSearch);
  useEffect(() => { runSearchRef.current = runSearch; });

  // Girdi değişimine bağlı zamanlayıcı: al → ali → al dönüşünde çıktı yine
  // "al" olsa da yeni niyet 350 ms sonra aranır. Eşit değer döndüren bir
  // debounce hook'unun efekti bu durumda yeniden çalışmazdı.
  useEffect(() => {
    const term = normalizeProfileQuery(queryText);
    if (!isSearchableQuery(term)) return;
    const timer = setTimeout(() => {
      if (term !== queryRef.current || uidRef.current !== currentUid) return;
      if (activeTermRef.current === term || requestedTermRef.current === term) return;
      void runSearchRef.current(term);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryText, currentUid]);

  const add = async (uid: string, name: string) => {
    setBusyUid(uid);
    try {
      await sendFriendRequest({ fromUid: currentUid, fromName: currentName, toUid: uid });
      setSent((current) => ({ ...current, [uid]: true }));
      onStatus(`${name} kişisine arkadaşlık isteği gönderildi.`);
    } catch (failure) {
      const code = (failure as { code?: string }).code ?? "";
      if (ALREADY[code]) {
        if (code === "friend-request/exists") setSent((current) => ({ ...current, [uid]: true }));
        onStatus(ALREADY[code]);
      } else {
        onError(friendlyDataError(failure, "İstek gönderilemedi."));
      }
    } finally {
      setBusyUid(null);
    }
  };

  const accept = async (request: FriendRequest) => {
    setBusyUid(request.fromUid);
    try {
      await acceptFriendRequest(currentUid, request.fromUid, currentName);
      onStatus(`${request.fromName} artık arkadaşın.`);
    } catch (failure) {
      onError(friendlyDataError(failure, "İstek kabul edilemedi."));
    } finally {
      setBusyUid(null);
    }
  };

  const decline = async (request: FriendRequest) => {
    setBusyUid(request.fromUid);
    try {
      await declineFriendRequest(currentUid, request.fromUid);
    } catch (failure) {
      onError(friendlyDataError(failure, "İstek reddedilemedi."));
    } finally {
      setBusyUid(null);
    }
  };

  const remove = async (friend: FriendIndex) => {
    const accepted = await requestConfirm({
      title: "Arkadaşı çıkar",
      message: `${friend.friendName} arkadaşlarından çıkarılsın mı?`,
      confirmLabel: "Çıkar",
      danger: true,
    });
    if (!accepted) return;
    setBusyUid(friend.friendUid);
    try {
      await removeFriend(currentUid, friend.friendUid);
      onStatus(`${friend.friendName} arkadaşlarından çıkarıldı.`);
    } catch (failure) {
      onError(friendlyDataError(failure, "Arkadaş çıkarılamadı."));
    } finally {
      setBusyUid(null);
    }
  };

  const shareMyLink = async () => {
    const outcome = await shareOrCopy(buildFriendInviteLink(window.location.origin, currentUid), "Atlasia'da beni arkadaş ekle");
    if (outcome === "copied") onStatus("Arkadaş davet bağlantın kopyalandı. WhatsApp ya da mesajla gönder.");
    else if (outcome === "failed") onError("Bağlantı paylaşılamadı.");
  };

  const actionFor = (uid: string, name: string) => {
    if (friendSet.has(uid)) return <span className="text-[11px] text-leaf">Arkadaşsınız</span>;
    if (incomingSet.has(uid)) return <span className="text-[11px] text-sun">Sana istek atmış</span>;
    if (sent[uid]) return <span className="text-[11px] text-mint/60">İstek gönderildi</span>;
    return (
      <button type="button" disabled={busyUid === uid} onClick={() => void add(uid, name)} className="flex min-h-8 items-center gap-1 rounded-full bg-sun px-3 text-[12px] font-semibold text-ink disabled:opacity-50">
        {busyUid === uid ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}Ekle
      </button>
    );
  };

  return (
    <div className="grid gap-3">
      {inviter && (
        <div className="rounded-2xl border border-sun/30 bg-sun/10 p-3">
          <p className="text-[13px]"><span className="font-semibold">{inviter.displayName}</span> seni Atlasia'ya davet etti.</p>
          <div className="mt-2 flex items-center gap-2">
            {actionFor(inviter.uid, inviter.displayName)}
            <button type="button" onClick={() => { setInviter(null); onInviteHandled?.(); }} className="ml-auto text-[12px] text-mint/60">Kapat</button>
          </div>
        </div>
      )}

      <button type="button" onClick={() => void shareMyLink()} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink"><Link2 size={15} />Arkadaş davet bağlantımı paylaş</button>

      <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="flex items-center gap-2">
        <input value={queryText} onChange={(event) => changeQuery(event.target.value)} maxLength={40} aria-label="İsimle kişi ara" placeholder={`İsimle ara (en az ${PROFILE_SEARCH_MIN_CHARS} harf)`} className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-ink px-3 text-[13px] text-mint outline-none focus:border-sun/50" />
        <button type="submit" disabled={searching || !isSearchableQuery(queryText)} aria-label="Ara" className="grid size-10 shrink-0 place-items-center rounded-full border border-leaf/30 text-leaf disabled:opacity-50">{searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}</button>
      </form>
      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-mint/50">Son aramalar</span>
          {recent.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => { changeQuery(term); void runSearch(term); }}
              className="min-h-8 rounded-full border border-white/12 px-2.5 text-[11.5px] text-mint/80 transition hover:border-sun/50 hover:text-white"
            >
              {term}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRecent(clearRecentSearches(currentUid))}
            className="ml-auto min-h-8 px-1 text-[11px] text-mint/45 underline-offset-2 hover:underline"
          >
            Temizle
          </button>
        </div>
      )}
      {results && (
        <ul className="space-y-1.5">
          {results.length === 0 && <li className="px-1 text-[12px] text-mint/60">Bu isimle kimse bulunamadı. Davet bağlantını göndermeyi dene.</li>}
          {results.map((profile) => (
            <li key={profile.uid} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px]">{profile.displayName}</span>
              {actionFor(profile.uid, profile.displayName)}
            </li>
          ))}
        </ul>
      )}

      {incoming.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[12px] font-semibold text-sun">Gelen istekler ({incoming.length})</h3>
          <ul className="space-y-1.5">
            {incoming.map((request) => (
              <li key={request.fromUid} className="flex items-center gap-2 rounded-xl border border-sun/20 bg-sun/[0.06] px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[13px]">{request.fromName}</span>
                <button type="button" disabled={busyUid === request.fromUid} onClick={() => void accept(request)} className="flex min-h-8 items-center gap-1 rounded-full bg-sun px-3 text-[12px] font-semibold text-ink disabled:opacity-50"><Check size={12} />Kabul et</button>
                <button type="button" disabled={busyUid === request.fromUid} onClick={() => void decline(request)} aria-label={`${request.fromName} isteğini reddet`} className="grid size-8 place-items-center rounded-full border border-white/10 text-mint/70 disabled:opacity-50"><X size={13} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-mint/80">Arkadaşların ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="px-1 text-[12px] text-mint/60">Henüz arkadaşın yok. Yukarıdan isimle ara ya da davet bağlantını gönder.</p>
        ) : (
          <ul className="space-y-1.5">
            {friends.map((friend) => (
              <li key={friend.friendUid} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[13px]">{friend.friendName}</span>
                <button type="button" disabled={busyUid === friend.friendUid} onClick={() => void remove(friend)} aria-label={`${friend.friendName} arkadaşlarından çıkar`} className="grid size-8 place-items-center rounded-full text-mint/50 hover:bg-white/5 disabled:opacity-50"><UserMinus size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

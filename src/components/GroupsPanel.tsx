import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  Flag,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import {
  createGroup,
  deleteGroup,
  deleteGroupMessage,
  fetchGroup,
  generateJoinCode,
  joinGroupWithCode,
  leaveGroup,
  rotateGroupCode,
  sendGroupMessage,
  subscribeMessages,
  subscribeMyGroups,
  visibleMessages,
  type Group,
  type GroupIndexEntry,
  type GroupMessage,
} from "../lib/groups";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
  subscribeFriendRequests,
  subscribeFriends,
  type FriendIndex,
  type FriendRequest,
} from "../lib/friendships";
import { subscribeUserProfiles, syncUserProfile, type UserProfile } from "../lib/userProfiles";
import ReportDialog from "./ReportDialog";
import { blockUser } from "../lib/moderation";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { relativeTime } from "../utils/time";

interface Props {
  currentUid: string;
  currentName: string;
  blockedSet: Set<string>;
  isBlocked: (uid?: string | null) => boolean;
  initialGroupId?: string | null;
  onClose: () => void;
}

type Tab = "groups" | "friends" | "requests";

export default function GroupsPanel({ currentUid, currentName, blockedSet, isBlocked, initialGroupId, onClose }: Props) {
  const panelRef = usePanelAccess(true, onClose);
  const [index, setIndex] = useState<GroupIndexEntry[]>([]);
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [tab, setTab] = useState<Tab>("groups");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [joinId, setJoinId] = useState("");
  const [newCode, setNewCode] = useState(() => generateJoinCode());
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportSender, setReportSender] = useState<string | null>(null);

  // Arkadaslik durumu
  const [friends, setFriends] = useState<FriendIndex[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendActionBusy, setFriendActionBusy] = useState<string | null>(null);

  // Profil senkronu (UID yazmadan arama icin public dizin)
  useEffect(() => {
    if (!currentUid || !currentName.trim()) return;
    void syncUserProfile({ uid: currentUid, displayName: currentName }).catch(() => {});
  }, [currentUid, currentName]);

  useEffect(() => {
    const unsubscribe = subscribeMyGroups(
      currentUid,
      (groups) => {
        setIndex(groups);
        setLoading(false);
      },
      (failure) => {
        console.warn("[Atlasia] Gruplar okunamadı:", failure);
        setError("Grupların yüklenemedi. Bağlantını kontrol et.");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [currentUid]);

  useEffect(() => {
    const unsubFriends = subscribeFriends(currentUid, setFriends);
    const unsubRequests = subscribeFriendRequests(currentUid, setRequests);
    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [currentUid]);

  // Arama (userProfiles prefix search)
  useEffect(() => {
    const needle = searchText.trim();
    if (needle.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const unsub = subscribeUserProfiles(
      needle,
      (profiles) => {
        const filtered = profiles.filter((profile) => profile.uid !== currentUid && !friends.some((friend) => friend.friendUid === profile.uid));
        setSearchResults(filtered);
        setSearching(false);
      },
      () => setSearching(false),
    );
    return () => unsub();
  }, [searchText, currentUid, friends]);

  useEffect(() => {
    if (!openGroup) {
      setMessages([]);
      return;
    }
    const unsubscribe = subscribeMessages(
      openGroup.id,
      (items) => setMessages(items),
      (failure) => {
        console.warn("[Atlasia] Mesajlar okunamadı:", failure);
        setError("Mesajlar yüklenemedi. Üyeliğin sona ermiş olabilir.");
      },
    );
    return unsubscribe;
  }, [openGroup]);

  const visible = useMemo(() => visibleMessages(messages, blockedSet).slice().reverse(), [messages, blockedSet]);

  const openChat = useCallback(async (groupId: string) => {
    setError(null);
    setStatus(null);
    try {
      const group = await fetchGroup(groupId);
      if (!group) throw new Error("Grup bulunamadı veya erişim yok.");
      setOpenGroup(group);
    } catch (failure) {
      setError((failure as Error).message || "Grup açılamadı.");
    }
  }, []);

  useEffect(() => {
    if (!initialGroupId) return;
    void openChat(initialGroupId);
  }, [initialGroupId, openChat]);

  const toggleFriendSelection = (friendUid: string) => {
    setSelectedFriends((current) => {
      const next = new Set(current);
      if (next.has(friendUid)) next.delete(friendUid);
      else {
        if (next.size >= 19) {
          setError("En fazla 19 arkadaş ekleyebilirsin (toplam üye 20).");
          return current;
        }
        next.add(friendUid);
      }
      return next;
    });
  };

  const submitCreate = async () => {
    if (!newName.trim()) {
      setError("Grup adı 2–80 karakter olmalı.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const memberUids = Array.from(selectedFriends);
      const result = await createGroup({
        name: newName,
        ownerUid: currentUid,
        ownerName: currentName,
        memberUids,
        joinCode: newCode,
      });
      setCreateOpen(false);
      setNewName("");
      setSelectedFriends(new Set());
      setNewCode(generateJoinCode());
      setStatus(
        result.invited > 0
          ? `Grup oluşturuldu ve ${result.invited} kişiye davet bildirimi gönderildi. Katılma kodu: ${result.group.joinCode}`
          : `Grup oluşturuldu. Katılma kodu: ${result.group.joinCode}`,
      );
      setIndex((current) => [{ groupId: result.group.id, name: result.group.name, role: "owner", joinedAt: Date.now() }, ...current]);
      setOpenGroup(result.group);
    } catch (failure) {
      setError((failure as Error).message || "Grup oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  const submitJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const group = await joinGroupWithCode(joinId, joinCodeInput, currentUid);
      setJoinId("");
      setJoinCodeInput("");
      setStatus(`“${group.name}” grubuna katıldın.`);
      setIndex((current) => current.some((item) => item.groupId === group.id)
        ? current
        : [{ groupId: group.id, name: group.name, role: group.ownerUid === currentUid ? "owner" : "member", joinedAt: Date.now() }, ...current]);
      setOpenGroup(group);
    } catch (failure) {
      setError((failure as Error).message || "Gruba katılınamadı.");
    } finally {
      setBusy(false);
    }
  };

  const rotateCode = async () => {
    if (!openGroup || openGroup.ownerUid !== currentUid) return;
    if (!confirm("Katılma kodu yenilensin mi? Eski kod artık geçersiz olur.")) return;
    try {
      const next = await rotateGroupCode(openGroup.id, currentUid);
      setOpenGroup({ ...openGroup, joinCode: next });
      setStatus(`Yeni katılma kodu: ${next}`);
    } catch (failure) {
      setError((failure as Error).message || "Kod yenilenemedi.");
    }
  };

  const copyCode = async () => {
    if (!openGroup?.joinCode) return;
    try {
      await navigator.clipboard.writeText(openGroup.joinCode);
      setStatus("Katılma kodu kopyalandı.");
    } catch {
      setError("Kod kopyalanamadı; elle seçip kopyalayabilirsin.");
    }
  };

  const send = async () => {
    if (!openGroup || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await sendGroupMessage(openGroup, { uid: currentUid, name: currentName || "Gezgin" }, draft);
      setDraft("");
      setMessages((current) => [created, ...current].slice(0, 50));
    } catch (failure) {
      setError((failure as Error).message || "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (messageId: string) => {
    if (!openGroup) return;
    try {
      await deleteGroupMessage(openGroup.id, messageId);
      setMessages((current) => current.filter((item) => item.id !== messageId));
    } catch (failure) {
      setError((failure as Error).message || "Mesaj silinemedi.");
    }
  };

  const blockSender = async (uid: string, name: string) => {
    if (!uid || uid === currentUid) return;
    if (!confirm(`${name} kullanıcısını engellemek istiyor musun? Mesajları gizlenir.`)) return;
    try {
      await blockUser(uid, currentUid);
      setStatus(`${name} engellendi.`);
    } catch (failure) {
      setError((failure as Error).message || "Kullanıcı engellenemedi.");
    }
  };

  const removeGroup = async () => {
    if (!openGroup) return;
    if (!confirm(`“${openGroup.name}” grubunu silmek istiyor musun?`)) return;
    try {
      if (openGroup.ownerUid === currentUid) await deleteGroup(openGroup.id, currentUid);
      else await leaveGroup(openGroup.id, currentUid);
      setIndex((current) => current.filter((item) => item.groupId !== openGroup.id));
      setOpenGroup(null);
      setStatus("Gruptan ayrıldın.");
    } catch (failure) {
      setError((failure as Error).message || "İşlem tamamlanamadı.");
    }
  };

  const handleSendRequest = async (target: UserProfile) => {
    setFriendActionBusy(target.uid);
    setError(null);
    try {
      await sendFriendRequest({ fromUid: currentUid, fromName: currentName || "Gezgin", toUid: target.uid });
      setStatus(`${target.displayName} kişisine arkadaşlık isteği gönderildi.`);
      setSearchText("");
      setSearchResults([]);
    } catch (failure) {
      setError((failure as Error).message || "İstek gönderilemedi.");
    } finally {
      setFriendActionBusy(null);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    setFriendActionBusy(request.fromUid);
    setError(null);
    try {
      await acceptFriendRequest({ recipientUid: currentUid, recipientName: currentName || "Gezgin", fromUid: request.fromUid, fromName: request.fromName });
      setStatus(`${request.fromName} ile artık arkadaşsın. Birlikte grup kurabilirsiniz.`);
    } catch (failure) {
      setError((failure as Error).message || "İstek kabul edilemedi.");
    } finally {
      setFriendActionBusy(null);
    }
  };

  const handleDecline = async (request: FriendRequest) => {
    setFriendActionBusy(request.fromUid);
    try {
      await declineFriendRequest(currentUid, request.fromUid);
      setStatus("İstek reddedildi.");
    } catch (failure) {
      setError((failure as Error).message || "İşlem tamamlanamadı.");
    } finally {
      setFriendActionBusy(null);
    }
  };

  const handleCancel = async (request: FriendRequest) => {
    setFriendActionBusy(request.fromUid);
    try {
      await cancelFriendRequest(request.fromUid, request.toUid);
      setStatus("İstek iptal edildi.");
    } catch (failure) {
      setError((failure as Error).message || "İptal edilemedi.");
    } finally {
      setFriendActionBusy(null);
    }
  };

  const handleRemoveFriend = async (friend: FriendIndex) => {
    if (!confirm(`${friend.friendName} ile arkadaşlığı bitirmek istiyor musun?`)) return;
    setFriendActionBusy(friend.friendUid);
    try {
      await removeFriend(currentUid, friend.friendUid);
      setStatus(`${friend.friendName} arkadaşlıktan çıkarıldı.`);
    } catch (failure) {
      setError((failure as Error).message || "Arkadaş silinemedi.");
    } finally {
      setFriendActionBusy(null);
    }
  };

  // Tam ekran: grup açıkken sohbet, değilken liste + arkadaş yönetimi
  return (
    <div className="fixed inset-0 z-[66] flex h-dvh w-screen flex-col bg-[#041c16] text-mint">
      <div ref={panelRef as unknown as React.RefObject<HTMLDivElement>} role="dialog" aria-modal="true" aria-labelledby="groups-title" className="flex h-dvh w-screen flex-col bg-[#041c16]">
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3 safe-top">
          {openGroup ? (
            <button type="button" onClick={() => { setOpenGroup(null); setMessages([]); }} className="grid size-11 place-items-center rounded-full hover:bg-white/5" aria-label="Grup listesine dön"><ArrowLeft size={20} /></button>
          ) : (
            <UsersRound size={22} className="text-sun shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h2 id="groups-title" className="truncate font-display text-[18px] font-semibold">{openGroup ? openGroup.name : "Gruplar ve Arkadaşlar"}</h2>
            <p className="text-[11px] text-mint/55">
              {openGroup
                ? `${openGroup.memberUids.length} üye · en yeni 50 mesaj · kodla katılma korumalı`
                : `${index.length} grup · ${friends.length} arkadaş · UID yazmadan davet`}
            </p>
          </div>
          {openGroup ? (
            <button type="button" onClick={() => void removeGroup()} aria-label="Gruptan ayrıl veya grubu sil" className="grid size-11 place-items-center rounded-full text-red-200/80 hover:bg-white/5"><LogOut size={18} /></button>
          ) : null}
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-11 place-items-center rounded-full hover:bg-white/5"><X size={22} /></button>
        </header>

        {(error || status) && (
          <div className="mx-3 mt-2 space-y-1 shrink-0">
            {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">{error}</p>}
            {status && <p role="status" className="rounded-xl border border-leaf/20 bg-leaf/10 px-3 py-2 text-[12px] text-leaf">{status}</p>}
          </div>
        )}

        {!openGroup && (
          <>
            <nav className="flex shrink-0 gap-1 border-b border-white/10 px-2 py-2" aria-label="Gruplar bölümleri">
              {(["groups", "friends", "requests"] as Tab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  aria-current={tab === value ? "page" : undefined}
                  className={`flex-1 rounded-full px-3 py-2 text-[12px] font-semibold transition ${tab === value ? "bg-sun text-ink" : "bg-white/[0.04] text-mint/70 hover:bg-white/10"}`}
                >
                  {value === "groups" ? `Gruplar (${index.length})` : value === "friends" ? `Arkadaşlar (${friends.length})` : `İstekler (${requests.length})`}
                </button>
              ))}
            </nav>

            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
              {tab === "groups" && (
                <div className="grid gap-3">
                  <button type="button" onClick={() => setCreateOpen((value) => !value)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sun px-4 text-[14px] font-semibold text-ink shadow-sm"><Plus size={18} />Yeni grup — arkadaşlarını seç</button>
                  {createOpen && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <label className="block text-[12px] font-medium text-mint/80">Grup adı<input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Örn. Kapadokya ekibi" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-[13px] text-mint outline-none focus:border-sun/50" /></label>

                      <div className="mt-3">
                        <p className="text-[12px] font-medium text-mint/80">Arkadaşlarını seç (en fazla 19) — UID yazma yok</p>
                        <p className="text-[11px] text-mint/50">Listeden seç, grup kurulduğunda davet bildirimi gider. Henüz arkadaşın yoksa “Arkadaşlar” sekmesinden ekle.</p>
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-ink/40 p-1">
                          {friends.length === 0 && <p className="p-3 text-center text-[12px] text-mint/60">Henüz arkadaşın yok. “Arkadaşlar” sekmesinde arama yaparak ekle.</p>}
                          {friends.map((friend) => {
                            const checked = selectedFriends.has(friend.friendUid);
                            return (
                              <label key={friend.friendUid} className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition ${checked ? "bg-sun/15" : "hover:bg-white/5"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleFriendSelection(friend.friendUid)} className="size-4 rounded border-white/20 accent-sun" />
                                <span className="grid size-8 place-items-center rounded-full bg-leaf/15 text-leaf text-[11px] font-semibold">{friend.friendName.slice(0, 1).toLocaleUpperCase("tr")}</span>
                                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{friend.friendName}</span><span className="text-[11px] text-mint/50">{friend.friendUid.slice(0, 8)}</span></span>
                                {checked && <Check size={16} className="text-sun" />}
                              </label>
                            );
                          })}
                        </div>
                        {selectedFriends.size > 0 && <p className="mt-1 text-[11px] text-leaf">{selectedFriends.size} arkadaş seçildi.</p>}
                      </div>

                      <label className="mt-3 block text-[12px] text-mint/70">Katılma kodu (4–8 hane — kodu bilmeyen giremez)<span className="mt-1 flex items-center gap-2"><input value={newCode} onChange={(event) => setNewCode(event.target.value.replace(/\D/g, ""))} maxLength={8} inputMode="numeric" placeholder="123456" className="h-11 w-32 rounded-xl border border-white/10 bg-ink px-3 text-[13px] text-mint outline-none focus:border-sun/50" /><button type="button" onClick={() => setNewCode(generateJoinCode())} className="h-11 rounded-full border border-white/10 px-4 text-[11px] text-mint/70 hover:border-sun/40">Yeni kod</button></span></label>
                      <p className="mt-1 text-[11px] text-mint/50">Katılma kodu grup üyelerine özeldir; dışarıdan gelenler kodu olmadan giremez. Kurucu kodu yenileyebilir.</p>
                      <button type="button" disabled={busy || !newName.trim()} onClick={() => void submitCreate()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sun text-[13px] font-semibold text-ink disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Grubu kur</button>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[12px] font-semibold">Davet edildiğin gruba katıl</p>
                    <p className="text-[11px] text-mint/60">Grup kimliği ve katılma kodu gerekir; ikisi de grup üyesinden gelir.</p>
                    <label className="mt-2 block text-[12px] text-mint/70">Grup kimliği<input value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Grup kimliği" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                    <label className="mt-2 block text-[12px] text-mint/70">Katılma kodu (4–8 hane)<input value={joinCodeInput} onChange={(event) => setJoinCodeInput(event.target.value.replace(/\D/g, ""))} maxLength={8} inputMode="numeric" placeholder="4–8 hane" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-ink px-3 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                    <button type="button" disabled={busy || joinId.trim().length < 3 || joinCodeInput.trim().length < 4} onClick={() => void submitJoin()} className="mt-2 min-h-11 w-full rounded-full border border-leaf/30 text-[13px] font-semibold text-leaf disabled:opacity-50">Kod ile katıl</button>
                  </div>

                  <ul className="space-y-2">
                    {loading && <li className="p-3 text-center text-[12px] text-mint/60"><Loader2 className="mx-auto mb-1 size-4 animate-spin" />Gruplar yükleniyor…</li>}
                    {!loading && index.length === 0 && <li className="p-4 text-center text-[12px] text-mint/60">Henüz grubun yok. Yeni bir grup kur veya davet bildirimini bekle.</li>}
                    {index.map((entry) => (
                      <li key={entry.groupId}>
                        <button type="button" onClick={() => void openChat(entry.groupId)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-leaf/40">
                          <span className="grid size-10 place-items-center rounded-full bg-leaf/15 text-leaf"><MessageCircle size={18} /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{entry.name}</span><span className="text-[11px] text-mint/50">{entry.role === "owner" ? "Kurucu" : "Üye"} · {entry.groupId.slice(0, 8)} · katılım kodlu</span></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === "friends" && (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[12px] font-semibold">Arkadaş ara — UID yazma yok, isimle ara</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-ink px-3">
                        <Search size={16} className="text-mint/40" />
                        <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="İsimle ara (en az 2 harf)" className="h-11 w-full bg-transparent text-[13px] text-mint outline-none" />
                        {searchText && <button type="button" onClick={() => setSearchText("")} className="text-mint/40 hover:text-mint"><X size={16} /></button>}
                      </div>
                    </div>
                    {searching && <p className="mt-2 text-[11px] text-mint/60"><Loader2 size={12} className="inline animate-spin" /> aranıyor…</p>}
                    {searchText.trim().length >= 2 && !searching && searchResults.length === 0 && <p className="mt-2 text-[11px] text-mint/50">Sonuç yok. İsimle tam eşleşme dene (örn. “Ayşe”).</p>}
                    <ul className="mt-2 space-y-1">
                      {searchResults.slice(0, 20).map((profile) => (
                        <li key={profile.uid} className="flex items-center gap-3 rounded-xl border border-white/10 p-2">
                          <span className="grid size-8 place-items-center rounded-full bg-sun/15 text-sun text-[11px] font-semibold">{profile.displayName.slice(0, 1).toLocaleUpperCase("tr")}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{profile.displayName}</span><span className="text-[11px] text-mint/50">{profile.uid.slice(0, 8)}</span></span>
                          <button type="button" disabled={friendActionBusy === profile.uid} onClick={() => void handleSendRequest(profile)} className="flex h-9 items-center gap-1 rounded-full bg-sun px-3 text-[11px] font-semibold text-ink disabled:opacity-50"><UserPlus size={12} />İstek gönder</button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-mint/50">Arama public profil dizininden 20 kayıtla sınırlıdır. Bildirim alıcıya gider; kabul edene kadar arkadaş olmazsınız.</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <h3 className="text-[12px] font-semibold">Arkadaşların ({friends.length})</h3>
                    {friends.length === 0 && <p className="mt-2 text-[12px] text-mint/60">Henüz arkadaşın yok. Yukarıdan arama yaparak istek gönder.</p>}
                    <ul className="mt-2 space-y-1">
                      {friends.map((friend) => (
                        <li key={friend.friendUid} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2">
                          <span className="grid size-9 place-items-center rounded-full bg-leaf/15 text-leaf text-[12px] font-semibold">{friend.friendName.slice(0, 1).toLocaleUpperCase("tr")}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{friend.friendName}</span><span className="text-[11px] text-mint/50">{relativeTime(friend.since)}</span></span>
                          <button type="button" disabled={friendActionBusy === friend.friendUid} onClick={() => void handleRemoveFriend(friend)} className="grid size-8 place-items-center rounded-full hover:bg-white/10 text-mint/60"><Trash2 size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {tab === "requests" && (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <h3 className="text-[12px] font-semibold">Gelen istekler ({requests.length})</h3>
                    {requests.length === 0 && <p className="mt-2 text-[12px] text-mint/60">Bekleyen istek yok.</p>}
                    <ul className="mt-2 space-y-2">
                      {requests.map((request) => (
                        <li key={request.id} className="rounded-xl border border-white/10 p-3">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-sun/15 text-sun text-[12px] font-semibold">{request.fromName.slice(0, 1).toLocaleUpperCase("tr")}</span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{request.fromName}</span><span className="text-[11px] text-mint/50">{relativeTime(request.createdAt)}</span></span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" disabled={friendActionBusy === request.fromUid} onClick={() => void handleAccept(request)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-sun py-2 text-[12px] font-semibold text-ink disabled:opacity-50"><Check size={14} />Kabul et</button>
                            <button type="button" disabled={friendActionBusy === request.fromUid} onClick={() => void handleDecline(request)} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-white/10 py-2 text-[12px] text-mint/70 disabled:opacity-50"><X size={14} />Reddet</button>
                          </div>
                          <button type="button" onClick={() => void handleCancel(request)} className="mt-2 w-full text-[11px] text-mint/50">İptal (gönderen iptal edebilir)</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-400/5 p-3">
                    <p className="text-[11px] leading-relaxed text-amber-200/90"><strong>Güvenlik:</strong> Yalnız senin hesabından istek gönderebilir, yalnız sana geleni kabul edebilirsin. Herkese açık tarama yok; istek ve arkadaş listelerin sana özel ve 50/100 kayıtla sınırlı. Gruba eklemeden önce arkadaş olman gerekir — UID ezberleme yok.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {openGroup && (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-mint/60 safe-top">
              <span>Katılma kodu: <b className="tracking-widest text-mint">{openGroup.joinCode || "—"}</b></span>
              <button type="button" onClick={() => void copyCode()} className="rounded-full border border-white/10 px-2 py-0.5 hover:border-leaf/40">Kopyala</button>
              {openGroup.ownerUid === currentUid && (
                <button type="button" onClick={() => void rotateCode()} className="ml-auto rounded-full border border-sun/30 px-2 py-0.5 text-sun/80 hover:border-sun/60">Kodu yenile</button>
              )}
            </div>
            <div className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {visible.length === 0 && <p className="py-8 text-center text-[12px] text-mint/55">Henüz mesaj yok. İlk mesajı yaz.</p>}
              {visible.map((message) => {
                const mine = message.senderUid === currentUid;
                return (
                  <article key={message.id} className={`max-w-[92%] rounded-2xl px-3 py-2 ${mine ? "ml-auto bg-sun/15 text-mint" : "mr-auto bg-white/[0.05] text-mint"}`}>
                    <div className="flex items-center gap-2 text-[11px] text-mint/55">
                      <span className="font-semibold text-mint/80">{mine ? "Sen" : message.senderName}</span>
                      <span>· {relativeTime(message.createdAt)}</span>
                      {!mine && (
                        <span className="ml-auto flex items-center gap-1">
                          {isBlocked(message.senderUid) ? (
                            <span className="text-[10px] text-red-200/70">engelli</span>
                          ) : (
                            <button type="button" onClick={() => void blockSender(message.senderUid, message.senderName)} aria-label={`${message.senderName} kullanıcısını engelle`} className="grid size-7 place-items-center rounded-full hover:bg-white/10"><Ban size={12} /></button>
                          )}
                          <button type="button" onClick={() => setReportSender(message.senderUid)} aria-label="Kullanıcıyı bildir" className="grid size-7 place-items-center rounded-full hover:bg-white/10"><Flag size={12} /></button>
                        </span>
                      )}
                      {mine && <button type="button" onClick={() => void removeMessage(message.id)} aria-label="Mesajı sil" className="ml-auto grid size-7 place-items-center rounded-full text-red-200/70 hover:bg-white/10"><Trash2 size={12} /></button>}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line">{message.text}</p>
                  </article>
                );
              })}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3 safe-bottom">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder={`${openGroup.name} grubuna yaz…`} className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-ink px-3 text-[13px] text-mint outline-none focus:border-sun/50" />
              <button type="submit" disabled={sending || draft.trim().length === 0} aria-label="Mesajı gönder" className="grid size-11 shrink-0 place-items-center rounded-full bg-sun text-ink disabled:opacity-40">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
            </form>
          </>
        )}
      </div>
      {reportSender && (
        <ReportDialog targetType="user" targetId={reportSender} targetOwnerUid={reportSender} targetLabel="Sohbet kullanıcısı" reporterUid={currentUid} onClose={() => setReportSender(null)} onReported={() => setStatus("Raporun alındı.")} />
      )}
    </div>
  );
}

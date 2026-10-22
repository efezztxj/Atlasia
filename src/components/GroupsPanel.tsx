import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Check, Flag, Link2, Loader2, LogOut, MessageCircle, Plus, RefreshCw, Send, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import {
  acceptGroupInvite,
  createGroup,
  declineGroupInvite,
  deleteGroup,
  deleteGroupMessage,
  fetchGroup,
  inviteFriendsToGroup,
  joinGroup,
  joinGroupWithCode,
  leaveGroup,
  rotateGroupCode,
  sendGroupMessage,
  subscribeMessages,
  subscribeMyGroupInvites,
  subscribeMyGroups,
  subscribeSentGroupInvites,
  visibleMessages,
  type Group,
  type GroupIndexEntry,
  type GroupInvite,
  type GroupMessage,
} from "../lib/groups";
import { pruneStaleFriends, subscribeFriendRequests, subscribeFriends, type FriendIndex, type FriendRequest } from "../lib/friendships";
import ReportDialog from "./ReportDialog";
import FriendsTab from "./FriendsTab";
import { blockUser } from "../lib/moderation";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { friendlyDataError } from "../lib/firestoreValue";
import { relativeTime } from "../utils/time";
import { buildGroupInviteLink, parseInvite, shareOrCopy, type ParsedInvite, type SocialTarget } from "../utils/inviteLink";

interface Props {
  currentUid: string;
  currentName: string;
  blockedSet: Set<string>;
  isBlocked: (uid?: string | null) => boolean;
  initialTarget?: SocialTarget | null;
  onClose: () => void;
}

type Tab = "groups" | "friends";

export default function GroupsPanel({ currentUid, currentName, blockedSet, isBlocked, initialTarget, onClose }: Props) {
  const panelRef = usePanelAccess(true, onClose);
  const [tab, setTab] = useState<Tab>(initialTarget?.kind === "friends" || (initialTarget?.kind === "invite" && initialTarget.invite.kind === "friend") ? "friends" : "groups");
  const [index, setIndex] = useState<GroupIndexEntry[]>([]);
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [friends, setFriends] = useState<FriendIndex[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [myInvites, setMyInvites] = useState<GroupInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GroupInvite[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [joinInput, setJoinInput] = useState("");
  const [linkInvite, setLinkInvite] = useState<ParsedInvite | null>(initialTarget?.kind === "invite" && initialTarget.invite.kind === "group" ? initialTarget.invite : null);
  const [friendInviteUid, setFriendInviteUid] = useState<string | null>(initialTarget?.kind === "invite" && initialTarget.invite.kind === "friend" ? initialTarget.invite.uid : null);
  const [highlightInvite, setHighlightInvite] = useState<string | null>(null);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [reportSender, setReportSender] = useState<string | null>(null);

  const showError = useCallback((message: string) => { setStatus(null); setError(message); }, []);
  const showStatus = useCallback((message: string) => { setError(null); setStatus(message); }, []);
  // Kararlı referans: FriendsTab bunu efekt bağımlılığında kullanır (her render profil yeniden okunmasın).
  const clearFriendInvite = useCallback(() => setFriendInviteUid(null), []);

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
    const warn = (what: string) => (failure: Error) => console.warn(`[Atlasia] ${what} okunamadı:`, failure);
    const stops = [
      subscribeFriends(currentUid, setFriends, warn("Arkadaşlar")),
      subscribeFriendRequests(currentUid, setFriendRequests, warn("Arkadaşlık istekleri")),
      subscribeMyGroupInvites(currentUid, setMyInvites, warn("Grup davetleri")),
    ];
    return () => stops.forEach((stop) => stop());
  }, [currentUid]);

  // Karşı tarafın bitirdiği arkadaşlıklar listede kalmasın: her kayıt oturumda
  // bir kez denetlenir, bitmişse kendi kaydımız silinir (snapshot listeyi günceller).
  const friendUidsKey = useMemo(() => friends.map((friend) => friend.friendUid).sort().join(","), [friends]);
  useEffect(() => {
    if (!friendUidsKey) return;
    pruneStaleFriends(currentUid, friendUidsKey.split(",")).catch((failure) => console.warn("[Atlasia] Arkadaş listesi temizlenemedi:", failure));
  }, [currentUid, friendUidsKey]);

  const isOwner = Boolean(openGroup && openGroup.ownerUid === currentUid);
  const openGroupId = openGroup?.id ?? null;

  useEffect(() => {
    if (!openGroupId || !isOwner) {
      setSentInvites([]);
      return;
    }
    return subscribeSentGroupInvites(openGroupId, currentUid, setSentInvites, (failure) => console.warn("[Atlasia] Gönderilen davetler okunamadı:", failure));
  }, [openGroupId, isOwner, currentUid]);

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
  const visibleInvites = useMemo(() => myInvites.filter((invite) => !isBlocked(invite.inviterUid)), [myInvites, isBlocked]);
  const pendingFriendRequests = friendRequests.filter((request) => !isBlocked(request.fromUid)).length;

  const rememberGroup = useCallback((group: Group) => {
    setIndex((current) => current.some((item) => item.groupId === group.id)
      ? current
      : [{ groupId: group.id, name: group.name, role: group.ownerUid === currentUid ? "owner" : "member", joinedAt: Date.now() }, ...current]);
  }, [currentUid]);

  const openChat = useCallback(async (groupId: string) => {
    setError(null);
    setStatus(null);
    setAddPeopleOpen(false);
    try {
      const group = await fetchGroup(groupId);
      if (!group) throw new Error("Grup bulunamadı veya erişim yok.");
      setOpenGroup(group);
    } catch (failure) {
      setError(friendlyDataError(failure, "Grup açılamadı."));
    }
  }, []);

  // Bildirimden gelen grup: üyeyse açılır; değilse bekleyen daveti öne çıkarılır.
  useEffect(() => {
    if (initialTarget?.kind !== "group") return;
    const groupId = initialTarget.groupId;
    void joinGroup(groupId, currentUid)
      .then((group) => { rememberGroup(group); setOpenGroup(group); })
      .catch(() => {
        setTab("groups");
        setHighlightInvite(groupId);
        setStatus("Bu grubun davetini aşağıda “Katıl” ile kabul edebilirsin.");
      });
  }, [initialTarget, currentUid, rememberGroup]);

  const acceptInvite = async (invite: GroupInvite) => {
    setBusyUid(invite.groupId);
    try {
      const group = await acceptGroupInvite(invite.groupId, currentUid);
      rememberGroup(group);
      setHighlightInvite(null);
      setOpenGroup(group);
      showStatus(`“${group.name}” grubuna katıldın.`);
    } catch (failure) {
      showError(friendlyDataError(failure, "Davet kabul edilemedi."));
    } finally {
      setBusyUid(null);
    }
  };

  const declineInvite = async (invite: GroupInvite) => {
    setBusyUid(invite.groupId);
    try {
      await declineGroupInvite(invite.groupId, currentUid);
    } catch (failure) {
      showError(friendlyDataError(failure, "Davet reddedilemedi."));
    } finally {
      setBusyUid(null);
    }
  };

  const joinWithInvite = async (invite: ParsedInvite) => {
    if (invite.kind !== "group") {
      setFriendInviteUid(invite.uid);
      setTab("friends");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const group = await joinGroupWithCode(invite.groupId, invite.code, currentUid);
      rememberGroup(group);
      setOpenGroup(group);
      setLinkInvite(null);
      setJoinInput("");
      showStatus(`“${group.name}” grubuna katıldın.`);
    } catch (failure) {
      const code = (failure as { code?: string }).code ?? "";
      if (code === "group/already-member") {
        setLinkInvite(null);
        setJoinInput("");
        await openChat(invite.groupId);
        showStatus("Zaten bu gruptasın.");
      } else if (code === "group/locked") {
        showError("Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.");
      } else if (code === "group/bad-code" || code === "permission-denied" || code === "not-found" || code === "group/not-found") {
        showError("Bu davet bağlantısı geçersiz ya da süresi dolmuş. Grubu kurandan yeni bağlantı iste.");
      } else {
        showError(friendlyDataError(failure, "Gruba katılınamadı."));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitJoinInput = () => {
    const invite = parseInvite(joinInput);
    if (!invite) {
      showError("Bu bir davet bağlantısı değil. Grubu kuranın gönderdiği bağlantının tamamını yapıştır.");
      return;
    }
    void joinWithInvite(invite);
  };

  const togglePick = (uid: string) => {
    setPicked((current) => current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]);
  };

  const submitCreate = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await createGroup({ name: newName, ownerUid: currentUid, ownerName: currentName, memberUids: picked });
      setCreateOpen(false);
      setNewName("");
      setPicked([]);
      const invitedNote = result.invited > 0 ? ` ${result.invited} arkadaşına davet gitti; kabul edince grupta görünecekler.` : "";
      const skippedNote = result.skipped > 0 ? ` ${result.skipped} kişiye davet gönderilemedi.` : "";
      showStatus(`Grup kuruldu.${invitedNote}${skippedNote} Başkalarını eklemek için “Davet bağlantısı”nı paylaş.`);
      rememberGroup(result.group);
      setOpenGroup(result.group);
    } catch (failure) {
      showError(friendlyDataError(failure, "Grup oluşturulamadı."));
    } finally {
      setBusy(false);
    }
  };

  const addPerson = async (friend: FriendIndex) => {
    if (!openGroup) return;
    setBusyUid(friend.friendUid);
    try {
      const result = await inviteFriendsToGroup(openGroup, { uid: currentUid, name: currentName }, [friend.friendUid]);
      if (result.delivered.length > 0) showStatus(`${friend.friendName} davet edildi. Kabul edince grupta olacak.`);
      else showError(`${friend.friendName} davet edilemedi (zaten davetli olabilir ya da grup dolu).`);
    } catch (failure) {
      showError(friendlyDataError(failure, "Davet gönderilemedi."));
    } finally {
      setBusyUid(null);
    }
  };

  const shareGroupLink = async () => {
    if (!openGroup?.joinCode) {
      showError("Bu eski grubun davet kodu yok. Önce “Kodu yenile”ye bas.");
      return;
    }
    const outcome = await shareOrCopy(buildGroupInviteLink(window.location.origin, openGroup.id, openGroup.joinCode), `Atlasia'da “${openGroup.name}” grubuna katıl`);
    if (outcome === "copied") showStatus("Davet bağlantısı kopyalandı. WhatsApp ya da mesajla gönder; açan kişi tek dokunuşla katılır.");
    else if (outcome === "failed") showError("Bağlantı paylaşılamadı.");
  };

  const rotateCode = async () => {
    if (!openGroup) return;
    if (!confirm("Kod yenilenirse daha önce gönderdiğin davet bağlantıları çalışmaz. Devam edilsin mi?")) return;
    try {
      const newCode = await rotateGroupCode(openGroup.id, currentUid);
      setOpenGroup({ ...openGroup, joinCode: newCode });
      showStatus("Kod yenilendi. Eski bağlantılar artık çalışmaz; yeni bağlantıyı paylaş.");
    } catch (failure) {
      showError(friendlyDataError(failure, "Kod yenilenemedi."));
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
      setError(friendlyDataError(failure, "Mesaj gönderilemedi."));
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
      setError(friendlyDataError(failure, "Mesaj silinemedi."));
    }
  };

  const blockSender = async (uid: string, name: string) => {
    if (!uid || uid === currentUid) return;
    if (!confirm(`${name} kullanıcısını engellemek istiyor musun? Mesajları gizlenir.`)) return;
    try {
      await blockUser(uid, currentUid);
      setStatus(`${name} engellendi.`);
    } catch (failure) {
      setError(friendlyDataError(failure, "Kullanıcı engellenemedi."));
    }
  };

  const removeGroup = async () => {
    if (!openGroup) return;
    if (!confirm(openGroup.ownerUid === currentUid ? `“${openGroup.name}” grubunu silmek istiyor musun?` : `“${openGroup.name}” grubundan ayrılmak istiyor musun?`)) return;
    try {
      if (openGroup.ownerUid === currentUid) await deleteGroup(openGroup.id, currentUid);
      else await leaveGroup(openGroup.id, currentUid);
      setIndex((current) => current.filter((item) => item.groupId !== openGroup.id));
      setOpenGroup(null);
      setStatus(openGroup.ownerUid === currentUid ? "Grup silindi." : "Gruptan ayrıldın.");
    } catch (failure) {
      setError(friendlyDataError(failure, "İşlem tamamlanamadı."));
    }
  };

  const sentSet = new Set(sentInvites.map((invite) => invite.invitedUid));
  const tabButton = (value: Tab, label: string, badge: number) => (
    <button type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setError(null); setStatus(null); }} className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold ${tab === value ? "bg-sun text-ink" : "text-mint/70 hover:bg-white/5"}`}>
      {label}
      {badge > 0 && <span className={`rounded-full px-1.5 text-[10px] leading-4 ${tab === value ? "bg-ink/20" : "bg-sun text-ink"}`}>{badge}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[66] flex justify-end bg-black/40">
      <button type="button" aria-label="Paneli kapat" onClick={onClose} className="absolute inset-0" />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="groups-title" className="relative flex h-dvh w-full max-w-[430px] flex-col border-l border-leaf/20 bg-[#041c16] shadow-2xl">
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          {openGroup ? (
            <button type="button" onClick={() => { setOpenGroup(null); setMessages([]); setAddPeopleOpen(false); }} className="grid size-10 place-items-center rounded-full hover:bg-white/5" aria-label="Listeye dön"><ArrowLeft size={18} /></button>
          ) : (
            <UsersRound size={18} className="text-sun" />
          )}
          <div className="min-w-0 flex-1">
            <h2 id="groups-title" className="truncate font-display text-base font-semibold">{openGroup ? openGroup.name : "Gruplar ve arkadaşlar"}</h2>
            <p className="text-[11px] text-mint/55">{openGroup ? `${openGroup.memberUids.length} üye · en yeni 50 mesaj` : `${index.length} grup · ${friends.length} arkadaş`}</p>
          </div>
          {openGroup && (
            <button type="button" onClick={() => void removeGroup()} aria-label={isOwner ? "Grubu sil" : "Gruptan ayrıl"} className="grid size-10 place-items-center rounded-full text-red-200/80 hover:bg-white/5"><LogOut size={16} /></button>
          )}
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-10 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
        </header>

        {!openGroup && (
          <div role="tablist" aria-label="Bölüm" className="mx-3 mt-3 flex gap-1 rounded-full border border-white/10 p-1">
            {tabButton("groups", "Gruplar", visibleInvites.length)}
            {tabButton("friends", "Arkadaşlar", pendingFriendRequests)}
          </div>
        )}

        {(error || status) && (
          <div className="mx-3 mt-2 space-y-1">
            {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">{error}</p>}
            {status && <p role="status" className="rounded-xl border border-leaf/20 bg-leaf/10 px-3 py-2 text-[12px] text-leaf">{status}</p>}
          </div>
        )}

        {!openGroup && tab === "friends" && (
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
            <FriendsTab
              currentUid={currentUid}
              currentName={currentName}
              friends={friends}
              requests={friendRequests}
              isBlocked={isBlocked}
              invitedByUid={friendInviteUid}
              onInviteHandled={clearFriendInvite}
              onStatus={showStatus}
              onError={showError}
            />
          </div>
        )}

        {!openGroup && tab === "groups" && (
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
            <div className="grid gap-3">
              {linkInvite?.kind === "group" && (
                <div className="rounded-2xl border border-sun/30 bg-sun/10 p-3">
                  <p className="text-[13px]">Bir gruba davet bağlantısıyla geldin.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => void joinWithInvite(linkInvite)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-sun px-4 text-[12px] font-semibold text-ink disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}Gruba katıl</button>
                    <button type="button" onClick={() => setLinkInvite(null)} className="ml-auto text-[12px] text-mint/60">Vazgeç</button>
                  </div>
                </div>
              )}

              {visibleInvites.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-[12px] font-semibold text-sun">Grup davetlerin ({visibleInvites.length})</h3>
                  <ul className="space-y-1.5">
                    {visibleInvites.map((invite) => (
                      <li key={invite.groupId} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${highlightInvite === invite.groupId ? "border-sun/60 bg-sun/15" : "border-sun/20 bg-sun/[0.06]"}`}>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{invite.groupName}</span>
                        <button type="button" disabled={busyUid === invite.groupId} onClick={() => void acceptInvite(invite)} className="flex min-h-8 items-center gap-1 rounded-full bg-sun px-3 text-[12px] font-semibold text-ink disabled:opacity-50"><Check size={12} />Katıl</button>
                        <button type="button" disabled={busyUid === invite.groupId} onClick={() => void declineInvite(invite)} aria-label={`${invite.groupName} davetini reddet`} className="grid size-8 place-items-center rounded-full border border-white/10 text-mint/70 disabled:opacity-50"><X size={13} /></button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <button type="button" onClick={() => setCreateOpen((value) => !value)} aria-expanded={createOpen} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink"><Plus size={15} />Yeni grup</button>
              {createOpen && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <label className="block text-[12px] text-mint/70">Grup adı<input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Örn. Kapadokya ekibi" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[13px] text-mint outline-none focus:border-sun/50" /></label>
                  <p className="mt-3 text-[12px] text-mint/70">Arkadaşlarını ekle {picked.length > 0 && <span className="text-sun">({picked.length} seçili)</span>}</p>
                  {friends.length === 0 ? (
                    <p className="mt-1 text-[11px] text-mint/55">Henüz arkadaşın yok. Grubu kurduktan sonra davet bağlantısını paylaşabilir ya da “Arkadaşlar” sekmesinden arkadaş ekleyebilirsin.</p>
                  ) : (
                    <ul className="thin-scroll mt-1 max-h-52 space-y-1 overflow-y-auto">
                      {friends.map((friend) => {
                        const on = picked.includes(friend.friendUid);
                        return (
                          <li key={friend.friendUid} className="flex items-center gap-2 rounded-lg px-1 py-1">
                            <span className="min-w-0 flex-1 truncate text-[13px]">{friend.friendName}</span>
                            <button type="button" aria-pressed={on} onClick={() => togglePick(friend.friendUid)} className={`flex min-h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold ${on ? "border border-leaf/40 text-leaf" : "bg-sun text-ink"}`}>{on ? <><Check size={12} />Eklendi</> : <><UserPlus size={12} />Ekle</>}</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <button type="button" disabled={busy || newName.trim().length < 2} onClick={() => void submitCreate()} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-sun text-[12px] font-semibold text-ink disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Grubu kur</button>
                </div>
              )}

              <form onSubmit={(event) => { event.preventDefault(); submitJoinInput(); }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <label className="block text-[12px] text-mint/70">Davet bağlantısıyla katıl<input value={joinInput} onChange={(event) => setJoinInput(event.target.value)} placeholder="Gelen bağlantıyı buraya yapıştır" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                <button type="submit" disabled={busy || joinInput.trim().length < 8} className="mt-2 min-h-9 w-full rounded-full border border-leaf/30 text-[12px] text-leaf disabled:opacity-50">Katıl</button>
              </form>
            </div>

            <ul className="mt-4 space-y-2">
              {loading && <li className="p-3 text-center text-[12px] text-mint/60"><Loader2 className="mx-auto mb-1 size-4 animate-spin" />Gruplar yükleniyor…</li>}
              {!loading && index.length === 0 && <li className="p-4 text-center text-[12px] text-mint/60">Henüz grubun yok. Yeni bir grup kur ya da bir davet bağlantısı aç.</li>}
              {index.map((entry) => (
                <li key={entry.groupId}>
                  <button type="button" onClick={() => void openChat(entry.groupId)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:border-leaf/40">
                    <span className="grid size-9 place-items-center rounded-full bg-leaf/15 text-leaf"><MessageCircle size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{entry.name}</span><span className="text-[11px] text-mint/50">{entry.role === "owner" ? "Kurucu" : "Üye"}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openGroup && (
          <>
            {isOwner && (
              <div className="mx-3 mt-2 grid gap-2">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddPeopleOpen((value) => !value)} aria-expanded={addPeopleOpen} className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-sun text-[12px] font-semibold text-ink"><UserPlus size={13} />Kişi ekle</button>
                  <button type="button" onClick={() => void shareGroupLink()} className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-leaf/30 text-[12px] text-leaf"><Link2 size={13} />Davet bağlantısı</button>
                </div>
                {addPeopleOpen && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    {friends.length === 0 ? (
                      <p className="p-1 text-[12px] text-mint/60">Henüz arkadaşın yok. “Davet bağlantısı”nı paylaş ya da önce arkadaş ekle.</p>
                    ) : (
                      <ul className="thin-scroll max-h-56 space-y-1 overflow-y-auto">
                        {friends.map((friend) => {
                          const member = openGroup.memberUids.includes(friend.friendUid);
                          const invited = sentSet.has(friend.friendUid);
                          return (
                            <li key={friend.friendUid} className="flex items-center gap-2 px-1 py-1">
                              <span className="min-w-0 flex-1 truncate text-[13px]">{friend.friendName}</span>
                              {member ? <span className="text-[11px] text-leaf">Grupta</span>
                                : invited ? <span className="text-[11px] text-mint/60">Davet edildi</span>
                                : <button type="button" disabled={busyUid === friend.friendUid} onClick={() => void addPerson(friend)} className="flex min-h-8 items-center gap-1 rounded-full bg-sun px-3 text-[12px] font-semibold text-ink disabled:opacity-50">{busyUid === friend.friendUid ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}Ekle</button>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 px-1 text-[11px] text-mint/55">
                  <span>Kod: <span className="font-mono text-[12px] text-sun">{openGroup.joinCode || "yok"}</span></span>
                  <button type="button" onClick={() => void rotateCode()} className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/5"><RefreshCw size={11} />Kodu yenile</button>
                </div>
              </div>
            )}
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
            <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} aria-label="Gruba mesaj yaz" placeholder={`${openGroup.name} grubuna yaz…`} className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-ink px-3 text-[13px] text-mint outline-none focus:border-sun/50" />
              <button type="submit" disabled={sending || draft.trim().length === 0} aria-label="Mesajı gönder" className="grid size-11 shrink-0 place-items-center rounded-full bg-sun text-ink disabled:opacity-40">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
            </form>
          </>
        )}
      </aside>
      {reportSender && (
        <ReportDialog targetType="user" targetId={reportSender} targetOwnerUid={reportSender} targetLabel="Sohbet kullanıcısı" reporterUid={currentUid} onClose={() => setReportSender(null)} onReported={() => setStatus("Raporun alındı.")} />
      )}
    </div>
  );
}

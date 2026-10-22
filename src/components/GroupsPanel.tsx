import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Check, Flag, Loader2, LogOut, MessageCircle, Plus, Send, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import {
  acceptGroupInvite,
  createGroup,
  deleteGroup,
  deleteGroupMessage,
  fetchGroup,
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  subscribeMessages,
  subscribeMyGroups,
  visibleMessages,
  type Group,
  type GroupIndexEntry,
  type GroupMessage,
} from "../lib/groups";
import ReportDialog from "./ReportDialog";
import { blockUser } from "../lib/moderation";
import {
  acceptFriendRequest,
  acceptedFriends,
  declineFriendRequest,
  incomingRequests,
  normalizeFriendName,
  outgoingRequests,
  removeFriendship,
  sendFriendRequest,
  subscribeFriendships,
  type FriendshipMirror,
} from "../lib/friends";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { relativeTime } from "../utils/time";
import { cn } from "../utils/cn";

interface Props {
  currentUid: string;
  currentName: string;
  blockedSet: Set<string>;
  isBlocked: (uid?: string | null) => boolean;
  initialGroupId?: string | null;
  onClose: () => void;
}

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

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportSender, setReportSender] = useState<string | null>(null);

  /**
   * Arkadaş seçimi. Eskiden burada serbest metin bir UID alanı vardı; kullanıcı
   * kimlik yazmak zorunda kalıyordu. Artık liste kabul edilmiş arkadaşlardan
   * geliyor ve seçim onay kutusuyla yapılıyor.
   */
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [mirror, setMirror] = useState<FriendshipMirror[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(() => new Set());
  const [friendUidInput, setFriendUidInput] = useState("");
  /** Üyesi olmadığımız bir gruba gelen davet: açık onay bekler, kendiliğinden kabul edilmez. */
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  const friends = useMemo(() => acceptedFriends(mirror), [mirror]);
  const requestsIn = useMemo(() => incomingRequests(mirror), [mirror]);
  const requestsOut = useMemo(() => outgoingRequests(mirror), [mirror]);

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
    const unsubscribe = subscribeFriendships(
      currentUid,
      (items) => setMirror(items),
      (failure) => {
        console.warn("[Atlasia] Arkadaşlar okunamadı:", failure);
        setError("Arkadaşların yüklenemedi. Bağlantını kontrol et.");
      },
    );
    return unsubscribe;
  }, [currentUid]);

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
      setPendingInviteId(null);
      setOpenGroup(group);
    } catch {
      // Grup dokümanı yalnız üyelere açıktır; okuyamıyorsan bu bir DAVETTİR.
      // Rıza olmadan otomatik kabul edilmez — kullanıcıya açık onay butonu sunulur.
      setPendingInviteId(groupId.trim() || null);
      setError("Bu gruba henüz üye değilsin. Daveti kabul etmek için aşağıdaki düğmeyi kullan.");
    }
  }, []);

  useEffect(() => {
    if (!initialGroupId) return;
    void openChat(initialGroupId);
  }, [initialGroupId, openChat]);

  const submitCreate = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await createGroup({
        name: newName,
        ownerUid: currentUid,
        ownerName: currentName,
        memberUids: [...selectedFriends],
        acceptedFriendUids: friends.map((friend) => friend.otherUid),
      });
      setCreateOpen(false);
      setNewName("");
      setSelectedFriends(new Set());
      setStatus(
        result.invited > 0
          ? `Grup oluşturuldu ve ${result.invited} arkadaşına davet gönderildi. Daveti kabul ettiklerinde üye olurlar.`
          : "Grup oluşturuldu. Arkadaşlarını sonradan da davet edebilirsin.",
      );
      setIndex((current) => [{ groupId: result.group.id, name: result.group.name, role: "owner", joinedAt: Date.now() }, ...current]);
      setOpenGroup(result.group);
    } catch (failure) {
      setError((failure as Error).message || "Grup oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  const toggleFriendSelection = (friendUid: string) => {
    setSelectedFriends((current) => {
      const next = new Set(current);
      if (next.has(friendUid)) next.delete(friendUid);
      else next.add(friendUid);
      return next;
    });
  };

  /* ─────────── Arkadaşlık: açık rıza akışı ─────────── */

  const submitFriendRequest = async () => {
    const target = friendUidInput.trim();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await sendFriendRequest(target, { uid: currentUid, name: currentName });
      setFriendUidInput("");
      setStatus("Arkadaşlık isteği gönderildi. Karşı taraf kabul edince gruplarına davet edebilirsin.");
    } catch (failure) {
      setError((failure as Error).message || "Arkadaşlık isteği gönderilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const acceptRequest = async (pairId: string) => {
    setBusy(true);
    setError(null);
    try {
      await acceptFriendRequest(pairId, { uid: currentUid, name: currentName });
      setStatus("Arkadaşlık kabul edildi. Artık grup daveti gönderebilirsin.");
    } catch (failure) {
      setError((failure as Error).message || "İstek kabul edilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const declineRequest = async (pairId: string) => {
    setBusy(true);
    setError(null);
    try {
      await declineFriendRequest(pairId, currentUid);
      setStatus("İstek reddedildi.");
    } catch (failure) {
      setError((failure as Error).message || "İstek reddedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Arkadaşlığı sonlandırır. `otherUid` ayrıca verilir çünkü `selectedFriends`
   * kümesi pairId değil ARKADAŞ UID'si tutar; seçimin de temizlenmesi gerekir.
   */
  const endFriendship = async (pairId: string, otherUid: string, label: string) => {
    if (!confirm(`${label} ile arkadaşlığını sonlandırmak istiyor musun?`)) return;
    setBusy(true);
    setError(null);
    try {
      await removeFriendship(pairId, currentUid);
      setSelectedFriends((current) => {
        const next = new Set(current);
        next.delete(otherUid);
        return next;
      });
      setStatus("Arkadaşlık sonlandırıldı.");
    } catch (failure) {
      setError((failure as Error).message || "Arkadaşlık sonlandırılamadı.");
    } finally {
      setBusy(false);
    }
  };

  /** Daveti KABUL et: kullanıcı kendini ekler; kural arkadaşlığı doğrular. */
  const acceptInvite = async (groupId: string) => {
    setBusy(true);
    setError(null);
    try {
      const group = await acceptGroupInvite(groupId, currentUid);
      setPendingInviteId(null);
      setStatus(`“${group.name}” davetini kabul ettin.`);
      setIndex((current) => current.some((item) => item.groupId === group.id)
        ? current
        : [{ groupId: group.id, name: group.name, role: "member", joinedAt: Date.now() }, ...current]);
      setOpenGroup(group);
    } catch (failure) {
      setError((failure as Error).message || "Davet kabul edilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const submitJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      let group: Group;
      try {
        // Mevcut akış KORUNDU: üye listesinde zaten görünen kullanıcı doğrudan katılır.
        group = await joinGroup(joinId, currentUid);
      } catch (failure) {
        // Üye değilse bu bir davettir; açık onayla kendini ekler.
        if ((failure as { code?: string })?.code !== "group/not-member") throw failure;
        group = await acceptGroupInvite(joinId, currentUid);
      }
      setJoinId("");
      setPendingInviteId(null);
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

  return (
    <div className="fixed inset-0 z-[66] flex justify-end bg-black/40">
      <button type="button" aria-label="Grupları kapat" onClick={onClose} className="absolute inset-0" />
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="groups-title" className="relative flex h-dvh w-full max-w-[430px] flex-col border-l border-leaf/20 bg-[#041c16] shadow-2xl">
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          {openGroup ? (
            <button type="button" onClick={() => { setOpenGroup(null); setMessages([]); }} className="grid size-10 place-items-center rounded-full hover:bg-white/5" aria-label="Grup listesine dön"><ArrowLeft size={18} /></button>
          ) : (
            <UsersRound size={18} className="text-sun" />
          )}
          <div className="min-w-0 flex-1">
            <h2 id="groups-title" className="truncate font-display text-base font-semibold">{openGroup ? openGroup.name : "Gruplar"}</h2>
            <p className="text-[11px] text-mint/55">{openGroup ? `${openGroup.memberUids.length} üye · en yeni 50 mesaj` : `${index.length} grup · kişisel sohbet`}</p>
          </div>
          {openGroup && (
            <button type="button" onClick={() => void removeGroup()} aria-label="Gruptan ayrıl veya grubu sil" className="grid size-10 place-items-center rounded-full text-red-200/80 hover:bg-white/5"><LogOut size={16} /></button>
          )}
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-10 place-items-center rounded-full hover:bg-white/5"><X size={18} /></button>
        </header>

        {(error || status) && (
          <div className="mx-3 mt-2 space-y-1">
            {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-[12px] text-red-200">{error}</p>}
            {status && <p role="status" className="rounded-xl border border-leaf/20 bg-leaf/10 px-3 py-2 text-[12px] text-leaf">{status}</p>}
          </div>
        )}

        {!openGroup && (
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
            <div className="grid gap-2">
              <button type="button" onClick={() => setCreateOpen((value) => !value)} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-sun px-4 text-[13px] font-semibold text-ink"><Plus size={15} />Yeni grup</button>
              {createOpen && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <label className="block text-[12px] text-mint/70">Grup adı<input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Örn. Kapadokya ekibi" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[13px] text-mint outline-none focus:border-sun/50" /></label>
                  <fieldset className="mt-3">
                    <legend className="text-[12px] text-mint/70">Arkadaşlarından davet et</legend>
                    {friends.length === 0 ? (
                      <p className="mt-1 rounded-lg border border-white/10 bg-ink/60 px-2 py-2 text-[11px] leading-relaxed text-mint/55">
                        Henüz kabul edilmiş arkadaşın yok. Grubu yine de kurabilirsin; aşağıdaki
                        “Arkadaşlar” bölümünden istek gönderip kabul edilince davet edebilirsin.
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-[11px] text-mint/50">
                          {selectedFriends.size} kişi seçildi (en fazla 19). Daveti kabul ettiklerinde üye olurlar.
                        </p>
                        <ul className="thin-scroll mt-2 max-h-[190px] space-y-1 overflow-y-auto pr-1">
                          {friends.map((friend) => {
                            const checked = selectedFriends.has(friend.otherUid);
                            const label = normalizeFriendName(friend.otherName);
                            return (
                              <li key={friend.pairId}>
                                <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2", checked ? "border-sun/50 bg-sun/10" : "border-white/10 bg-ink/40")}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleFriendSelection(friend.otherUid)}
                                    disabled={busy}
                                    className="size-4 accent-sun"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] text-mint">{label}</span>
                                    <span className="block truncate text-[10px] text-mint/45">{friend.otherUid.slice(0, 10)}…</span>
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </fieldset>
                  <button type="button" disabled={busy} onClick={() => void submitCreate()} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-sun text-[12px] font-semibold text-ink disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{selectedFriends.size > 0 ? `Oluştur ve ${selectedFriends.size} kişiyi davet et` : "Oluştur"}</button>
                </div>
              )}
              {pendingInviteId && (
                <div className="rounded-2xl border border-sun/30 bg-sun/10 p-3">
                  <p className="text-[12px] leading-relaxed text-mint">
                    Bu gruba davet edildin ama henüz üye değilsin. Kabul edersen kendini üye
                    olarak eklersin; kurucuyla arkadaşlığın doğrulanır.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => void acceptInvite(pendingInviteId)} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-sun text-[12px] font-semibold text-ink disabled:opacity-50">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Daveti kabul et
                    </button>
                    <button type="button" disabled={busy} onClick={() => { setPendingInviteId(null); setError(null); }} className="min-h-10 rounded-full border border-white/15 px-3 text-[12px] text-mint">Vazgeç</button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <button type="button" onClick={() => setFriendsOpen((value) => !value)} aria-expanded={friendsOpen} className="flex min-h-11 w-full items-center justify-between gap-2 text-left">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-mint"><UserPlus size={15} className="text-sun" />Arkadaşlar</span>
                  <span className="text-[11px] text-mint/55">
                    {friends.length} arkadaş{requestsIn.length > 0 ? ` · ${requestsIn.length} istek` : ""}
                  </span>
                </button>

                {friendsOpen && (
                  <div className="mt-2 space-y-3 border-t border-white/10 pt-3">
                    {requestsIn.length > 0 && (
                      <section>
                        <h3 className="text-[11px] font-semibold text-sun">Gelen istekler</h3>
                        <ul className="mt-1 space-y-1">
                          {requestsIn.map((entry) => (
                            <li key={entry.pairId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/40 px-2.5 py-2">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] text-mint">{normalizeFriendName(entry.otherName)}</span>
                                <span className="block truncate text-[10px] text-mint/45">{relativeTime(entry.createdAt)}</span>
                              </span>
                              <button type="button" disabled={busy} onClick={() => void acceptRequest(entry.pairId)} aria-label={`${normalizeFriendName(entry.otherName)} isteğini kabul et`} className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf disabled:opacity-50"><Check size={15} /></button>
                              <button type="button" disabled={busy} onClick={() => void declineRequest(entry.pairId)} aria-label={`${normalizeFriendName(entry.otherName)} isteğini reddet`} className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 text-mint/70 disabled:opacity-50"><X size={15} /></button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {requestsOut.length > 0 && (
                      <section>
                        <h3 className="text-[11px] font-semibold text-mint/60">Gönderdiğin istekler</h3>
                        <ul className="mt-1 space-y-1">
                          {requestsOut.map((entry) => (
                            <li key={entry.pairId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/30 px-2.5 py-2">
                              <span className="min-w-0 flex-1 truncate text-[12px] text-mint/70">{entry.otherUid.slice(0, 12)}… · beklemede</span>
                              <button type="button" disabled={busy} onClick={() => void endFriendship(entry.pairId, entry.otherUid, "Bu istek")} aria-label="İsteği geri çek" className="grid size-8 shrink-0 place-items-center rounded-full text-mint/60 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50"><Trash2 size={13} /></button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <section>
                      <h3 className="text-[11px] font-semibold text-mint/60">Yeni istek gönder</h3>
                      <label className="mt-1 block text-[11px] text-mint/50">
                        Karşı tarafın hesap kimliği
                        <input
                          value={friendUidInput}
                          onChange={(event) => setFriendUidInput(event.target.value)}
                          placeholder="Profil panelindeki “Hesap kimliğin”"
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-sun/50"
                        />
                      </label>
                      <button type="button" disabled={busy || friendUidInput.trim().length < 3} onClick={() => void submitFriendRequest()} className="mt-2 min-h-9 w-full rounded-full border border-sun/30 text-[12px] text-sun disabled:opacity-50">İstek gönder</button>
                      <p className="mt-1 text-[11px] leading-relaxed text-mint/45">
                        İstek karşı tarafın onayı olmadan hiçbir şey açmaz. Kabul edilince buradaki
                        listede görünür ve grup davetinde seçebilirsin.
                      </p>
                    </section>

                    {friends.length > 0 && (
                      <section>
                        <h3 className="text-[11px] font-semibold text-mint/60">Arkadaşların</h3>
                        <ul className="mt-1 space-y-1">
                          {friends.map((entry) => (
                            <li key={entry.pairId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/30 px-2.5 py-2">
                              <span className="min-w-0 flex-1 truncate text-[12px] text-mint">{normalizeFriendName(entry.otherName)}</span>
                              <button type="button" disabled={busy} onClick={() => void endFriendship(entry.pairId, entry.otherUid, normalizeFriendName(entry.otherName))} aria-label={`${normalizeFriendName(entry.otherName)} ile arkadaşlığı sonlandır`} className="grid size-8 shrink-0 place-items-center rounded-full text-mint/60 hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50"><Trash2 size={13} /></button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <label className="block text-[12px] text-mint/70">Davet edildiğin gruba katıl<input value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Grup kimliği" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                <button type="button" disabled={busy || joinId.trim().length < 3} onClick={() => void submitJoin()} className="mt-2 min-h-9 w-full rounded-full border border-leaf/30 text-[12px] text-leaf disabled:opacity-50">Katıl</button>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {loading && <li className="p-3 text-center text-[12px] text-mint/60"><Loader2 className="mx-auto mb-1 size-4 animate-spin" />Gruplar yükleniyor…</li>}
              {!loading && index.length === 0 && <li className="p-4 text-center text-[12px] text-mint/60">Henüz grubun yok. Yeni bir grup kur veya davet bildirimini bekle.</li>}
              {index.map((entry) => (
                <li key={entry.groupId}>
                  <button type="button" onClick={() => void openChat(entry.groupId)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:border-leaf/40">
                    <span className="grid size-9 place-items-center rounded-full bg-leaf/15 text-leaf"><MessageCircle size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{entry.name}</span><span className="text-[11px] text-mint/50">{entry.role === "owner" ? "Kurucu" : "Üye"} · {entry.groupId.slice(0, 8)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openGroup && (
          <>
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
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder={`${openGroup.name} grubuna yaz…`} className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-ink px-3 text-[13px] text-mint outline-none focus:border-sun/50" />
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

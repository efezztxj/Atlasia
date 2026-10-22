import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Copy, Flag, Loader2, LogOut, MessageCircle, Plus, RefreshCw, Send, Trash2, UsersRound, X } from "lucide-react";
import {
  createGroup,
  deleteGroup,
  deleteGroupMessage,
  fetchGroup,
  joinGroup,
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
  const [newMembers, setNewMembers] = useState("");
  const [joinId, setJoinId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportSender, setReportSender] = useState<string | null>(null);

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

  // Davet bildiriminden veya "Katıl" alanından gelen grup: üyeyse kendi grup
  // indeksine yazılır (listede kalıcı görünür), sonra sohbet açılır.
  const joinAndOpen = useCallback(async (groupId: string) => {
    const group = await joinGroup(groupId, currentUid);
    setIndex((current) => current.some((item) => item.groupId === group.id)
      ? current
      : [{ groupId: group.id, name: group.name, role: group.ownerUid === currentUid ? "owner" : "member", joinedAt: Date.now() }, ...current]);
    setOpenGroup(group);
    return group;
  }, [currentUid]);

  useEffect(() => {
    if (!initialGroupId) return;
    setError(null);
    setStatus(null);
    void joinAndOpen(initialGroupId).catch((failure: unknown) => {
      setError((failure as Error).message || "Grup açılamadı.");
    });
  }, [initialGroupId, joinAndOpen]);

  const copyGroupId = async (groupId: string) => {
    try {
      await navigator.clipboard.writeText(groupId);
      setStatus(`Grup kimliği kopyalandı: ${groupId}`);
    } catch (failure) {
      console.warn("[Atlasia] Grup kimliği panoya kopyalanamadı:", failure);
      setStatus(`Grup kimliği: ${groupId} (panoya kopyalanamadı, elle seç)`);
    }
  };

  const submitCreate = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await createGroup({
        name: newName,
        ownerUid: currentUid,
        ownerName: currentName,
        memberUids: newMembers.split(",").map((value) => value.trim()).filter(Boolean),
      });
      setCreateOpen(false);
      setNewName("");
      setNewMembers("");
      setStatus(
        result.invited > 0
          ? `Grup oluşturuldu ve ${result.invited} kişiye davet bildirimi gönderildi. Katılma kodu: ${result.group.joinCode} — bu kodu paylaşın, asıl katılım bu kodla yapılır.`
          : `Grup oluşturuldu. Katılma kodu: ${result.group.joinCode} — bu kodu paylaşın, asıl katılım bu kodla yapılır.`,
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
      const group = await joinAndOpen(joinId);
      setJoinId("");
      setStatus(`“${group.name}” grubuna katıldın.`);
    } catch (failure) {
      setError((failure as Error).message || "Gruba katılınamadı.");
    } finally {
      setBusy(false);
    }
  };

  const submitJoinWithCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const group = await joinGroupWithCode(joinId, joinCode, currentUid);
      setJoinId("");
      setJoinCode("");
      setStatus(`“${group.name}” grubuna katıldın.`);
      setIndex((current) => current.some((item) => item.groupId === group.id)
        ? current
        : [{ groupId: group.id, name: group.name, role: group.ownerUid === currentUid ? "owner" : "member", joinedAt: Date.now() }, ...current]);
      setOpenGroup(group);
    } catch (failure) {
      const msg = (failure as Error).message || "";
      const code = (failure as { code?: string }).code ?? "";
      if (code === "group/locked" || msg.includes("kilit")) {
        setError("Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.");
      } else {
        setError(msg || "Katılma kodu yanlış veya grup bulunamadı.");
      }
    } finally {
      setBusy(false);
    }
  };

  const rotateCode = async () => {
    if (!openGroup) return;
    try {
      const newCode = await rotateGroupCode(openGroup.id, currentUid);
      setOpenGroup({ ...openGroup, joinCode: newCode });
      setStatus(`Yeni katılma kodu: ${newCode} — yeni kodu paylaşın, eski kod geçersiz.`);
    } catch (failure) {
      setError((failure as Error).message || "Kod yenilenemedi.");
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
            <button type="button" onClick={() => void copyGroupId(openGroup.id)} aria-label="Grup kimliğini kopyala" title="Grup kimliğini kopyala" className="grid size-10 place-items-center rounded-full hover:bg-white/5"><Copy size={16} /></button>
          )}
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
                  <label className="mt-2 block text-[12px] text-mint/70">Üye hesap kimlikleri (virgülle, en fazla 19) — asıl yol kod paylaşımı<textarea value={newMembers} onChange={(event) => setNewMembers(event.target.value)} rows={2} placeholder="UID1, UID2" className="mt-1 w-full rounded-lg border border-white/10 bg-ink px-2 py-1.5 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                  <p className="mt-1 text-[11px] text-mint/50">Davet bildirimi gider; ancak kalıcı çözüm katılma kodunu paylaşmaktır. Kod, grup içinden görüntülenir ve yenilenebilir.</p>
                  <button type="button" disabled={busy} onClick={() => void submitCreate()} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-sun text-[12px] font-semibold text-ink disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Oluştur</button>
                </div>
              )}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <label className="block text-[12px] text-mint/70">Davet edildiğin gruba katıl<input value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Grup kimliği" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                <button type="button" disabled={busy || joinId.trim().length < 3} onClick={() => void submitJoin()} className="mt-2 min-h-9 w-full rounded-full border border-leaf/30 text-[12px] text-leaf disabled:opacity-50">Davetle katıl</button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <label className="block text-[12px] text-mint/70">Kod ile katıl — grup kimliği<input value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Grup kimliği" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                <label className="mt-2 block text-[12px] text-mint/70">Katılma kodu (6–8 hane)<input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} maxLength={8} placeholder="Örn. 123456" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-ink px-2 text-[12px] text-mint outline-none focus:border-sun/50" /></label>
                <p className="mt-1 text-[11px] text-mint/50">5 hatalı denemede 15 dk kilit. Kod grup kurucusundan alınır; doğrudan “üye ekle” yerine kod paylaşımı asıl yoldur.</p>
                <button type="button" disabled={busy || joinId.trim().length < 3 || joinCode.trim().length < 6} onClick={() => void submitJoinWithCode()} className="mt-2 min-h-9 w-full rounded-full border border-leaf/30 text-[12px] text-leaf disabled:opacity-50">Kodla katıl</button>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {loading && <li className="p-3 text-center text-[12px] text-mint/60"><Loader2 className="mx-auto mb-1 size-4 animate-spin" />Gruplar yükleniyor…</li>}
              {!loading && index.length === 0 && <li className="p-4 text-center text-[12px] text-mint/60">Henüz grubun yok. Yeni bir grup kur veya davet bildirimini bekle.</li>}
              {index.map((entry) => (
                <li key={entry.groupId}>
                  <button type="button" onClick={() => void openChat(entry.groupId)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:border-leaf/40">
                    <span className="grid size-9 place-items-center rounded-full bg-leaf/15 text-leaf"><MessageCircle size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{entry.name}</span><span className="text-[11px] text-mint/50">{entry.role === "owner" ? "Kurucu" : "Üye"} · <span className="select-all break-all">{entry.groupId}</span></span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openGroup && (
          <>
            {openGroup.ownerUid === currentUid && (
              <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="text-[11px] text-mint/60">Katılma kodu: <span className="font-mono text-[13px] font-semibold text-sun">{openGroup.joinCode ?? "— (eski grup, kodu ekleyin)"}</span></span>
                <button type="button" onClick={() => void rotateCode()} className="ml-auto flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-mint hover:bg-white/5"><RefreshCw size={12} />Yenile</button>
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

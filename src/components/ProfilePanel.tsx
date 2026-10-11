import { useState } from "react";
import { Bookmark, CheckCircle2, Loader2, LogOut, Mail, Monitor, Phone, Route, ShieldCheck, UserRound, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCollections } from "../hooks/useCollections";
import { authErrorMessage } from "../lib/auth";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props { onClose: () => void; onRecords: () => void; }

export default function ProfilePanel({ onClose, onRecords }: Props) {
  const { user, logout, setName } = useAuth();
  const { savedPlaces, savedRoutes } = useCollections();
  const panelRef = usePanelAccess(true, onClose);
  const [name, updateName] = useState(user?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try { await setName(name); setStatus("Profilin güncellendi."); }
    catch (error) { setStatus(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <aside ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="profile-title" className="settings-sheet fixed bottom-0 right-0 top-[68px] z-[55] flex w-full max-w-[390px] flex-col border-l border-leaf/20 bg-ink-2 p-6 md:bottom-4 md:right-4 md:top-[88px] md:rounded-3xl md:border">
    <header className="flex items-center justify-between"><h2 id="profile-title" className="font-display text-xl font-semibold">Profilim</h2><button type="button" onClick={onClose} aria-label="Profili kapat" className="grid size-11 place-items-center"><X size={19} /></button></header>
    <div className="mt-6 flex items-center gap-4"><span className="grid size-16 place-items-center rounded-full bg-sun/15 font-display text-2xl text-sun">{user?.displayName?.[0]?.toLocaleUpperCase("tr") ?? <UserRound size={25} />}</span><div><p className="text-lg font-semibold">{user?.displayName ?? "Profil adını ekle"}</p><p className="mt-1 flex items-center gap-1.5 text-[13px] text-leaf">{user?.backend === "device" ? <><Monitor size={14} />Bu cihaza özel hesap</> : <><ShieldCheck size={14} />Doğrulanmış hesap</>}</p></div></div>
    <p className="mt-6 flex items-center gap-2 break-all text-sm text-mint/80">{user?.phoneNumber ? <Phone size={15} /> : <Mail size={15} />}{user?.email ?? user?.phoneNumber}</p>
    <form onSubmit={(event) => void submit(event)} className="mt-7"><label htmlFor="profile-name" className="block text-sm text-mint/80">Profil adın</label><input id="profile-name" value={name} onChange={(event) => updateName(event.target.value)} maxLength={40} className="mt-2 h-12 w-full rounded-xl border border-leaf/25 bg-ink px-3 text-[15px]" /><button type="submit" disabled={busy || name.trim().length < 2} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full bg-sun px-5 text-sm font-semibold text-ink disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Değişiklikleri kaydet</button></form>
    {status && <p role="status" className="mt-3 text-sm text-sun">{status}</p>}
    <button type="button" onClick={onRecords} className="mt-8 flex w-full items-center justify-between border-y border-white/10 py-4 text-left"><span className="flex items-center gap-2 text-sm"><Bookmark size={17} className="text-sun" />Kayıtlarım</span><span className="text-[13px] text-mint/70">{savedPlaces.length} yer · {savedRoutes.length} rota</span></button>
    <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-mint/65"><Route size={15} className="mt-1 shrink-0" />Kaydettiğin yerler ve rotalar bu cihazda, hesabına özel tutulur.</p>
    <button type="button" onClick={() => void logout().catch((error) => setStatus(authErrorMessage(error)))} className="mt-auto flex min-h-12 items-center gap-2 pt-5 text-[14px] text-mint/80"><LogOut size={17} />Çıkış yap</button>
  </aside>;
}
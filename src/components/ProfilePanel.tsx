import { useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Phone,
  Route,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCollections } from "../hooks/useCollections";
import { authErrorMessage } from "../lib/auth";
import { usePanelAccess } from "../hooks/usePanelAccess";

interface Props {
  onClose: () => void;
  onRecords: () => void;
}

export default function ProfilePanel({ onClose, onRecords }: Props) {
  const { user, logout, setName } = useAuth();
  const { savedPlaces, savedRoutes } = useCollections();
  const panelRef = usePanelAccess(true, onClose);
  const [name, updateName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await setName(name);
      setStatus("Profilin güncellendi.");
    } catch (error) {
      setStatus(authErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const completeLogout = async () => {
    setLoggingOut(true);
    setStatus(null);
    try {
      await logout();
    } catch (error) {
      setStatus(authErrorMessage(error));
      setConfirmLogout(false);
      setLoggingOut(false);
    }
  };

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="profile-title"
      className="settings-sheet fixed top-[68px] right-0 bottom-0 z-[55] flex w-full max-w-[390px] flex-col overflow-hidden border-l border-leaf/20 bg-ink-2 md:top-[88px] md:right-4 md:bottom-4 md:rounded-3xl md:border"
    >
      <header className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
        <h2 id="profile-title" className="font-display text-xl font-semibold">Profilim</h2>
        <button type="button" onClick={onClose} aria-label="Profili kapat" className="grid size-11 place-items-center rounded-full hover:bg-white/5">
          <X size={19} />
        </button>
      </header>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        <div className="mt-2 flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-sun/15 font-display text-2xl text-sun">
            {user?.displayName?.[0]?.toLocaleUpperCase("tr") ?? <UserRound size={25} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{user?.displayName ?? "Profil adını ekle"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-leaf">
              {user?.backend === "device" ? <><Monitor size={14} />Bu cihaza özel hesap</> : <><ShieldCheck size={14} />Doğrulanmış hesap</>}
            </p>
          </div>
        </div>

        <p className="mt-6 flex items-center gap-2 break-all text-sm text-mint/80">
          {user?.phoneNumber ? <Phone size={15} /> : <Mail size={15} />}
          {user?.email ?? user?.phoneNumber}
        </p>

        <form onSubmit={(event) => void submit(event)} className="mt-7">
          <label htmlFor="profile-name" className="block text-sm text-mint/80">Profil adın</label>
          <input
            id="profile-name"
            value={name}
            onChange={(event) => updateName(event.target.value)}
            maxLength={40}
            className="mt-2 h-12 w-full rounded-xl border border-leaf/25 bg-ink px-3 text-[15px] outline-none focus:border-sun/60"
          />
          <button
            type="submit"
            disabled={saving || name.trim().length < 2}
            className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full bg-sun px-5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Değişiklikleri kaydet
          </button>
        </form>

        {status && <p role="status" className="mt-3 text-sm text-sun">{status}</p>}

        <button
          type="button"
          onClick={onRecords}
          className="mt-8 flex w-full items-center justify-between gap-3 border-y border-white/10 py-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm"><Bookmark size={17} className="text-sun" />Kayıtlarım</span>
          <span className="text-right text-[13px] text-mint/70">{savedPlaces.length} yer · {savedRoutes.length} rota</span>
        </button>
        <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-mint/65">
          <Route size={15} className="mt-1 shrink-0" />
          Kaydettiğin yerler ve rotalar bu cihazda, hesabına özel tutulur.
        </p>
      </div>

      <footer className="shrink-0 border-t border-white/10 bg-ink-2 px-6 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-4">
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-red-300/20 text-[14px] text-red-200/90 transition hover:bg-red-400/10"
        >
          <LogOut size={17} />Hesaptan çık
        </button>
      </footer>

      {confirmLogout && (
        <div className="absolute inset-0 z-20 grid place-items-end bg-black/65 p-4 backdrop-blur-sm md:place-items-center">
          <section role="alertdialog" aria-modal="true" aria-labelledby="logout-title" className="w-full rounded-[24px] border border-white/10 bg-[#06221b] p-5 shadow-2xl">
            <h3 id="logout-title" className="font-display text-lg font-semibold">Hesaptan çıkılsın mı?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-mint/70">Tekrar keşfetmek için hesabınla yeniden giriş yapman gerekir.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" disabled={loggingOut} onClick={() => setConfirmLogout(false)} className="min-h-11 rounded-full border border-white/15 text-sm text-mint disabled:opacity-50">Vazgeç</button>
              <button type="button" disabled={loggingOut} onClick={() => void completeLogout()} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-300 px-4 text-sm font-semibold text-[#30110f] disabled:opacity-60">
                {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                Çıkış yap
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

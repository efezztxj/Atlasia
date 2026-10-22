import { useState } from "react";
import {
  AlertCircle,
  Bookmark,
  Download,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Phone,
  RefreshCw,
  Route,
  Copy,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCollections } from "../hooks/useCollections";
import { authErrorMessage } from "../lib/auth";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { deleteAccount } from "../lib/moderation";
import { downloadAccountExport, exportAccountData } from "../lib/accountExport";
import FeedbackDialog from "./FeedbackDialog";

interface Props {
  onClose: () => void;
  onRecords: () => void;
}

export default function ProfilePanel({ onClose, onRecords }: Props) {
  const { user, logout, setName, resendVerification, refreshSession } = useAuth();
  const { savedPlaces, savedRoutes } = useCollections();
  const panelRef = usePanelAccess(true, onClose);
  const [name, updateName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState<"send" | "check" | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [exporting, setExporting] = useState(false);
  const needsEmailVerification = user?.backend === "firebase" && !!user.email && !user.emailVerified;

  const sendVerification = async () => {
    setVerificationBusy("send");
    setStatus(null);
    try {
      await resendVerification();
      setVerificationSent(true);
      setStatus("Doğrulama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.");
    } catch (error) {
      setStatus(authErrorMessage(error));
    } finally {
      setVerificationBusy(null);
    }
  };

  const checkVerification = async () => {
    setVerificationBusy("check");
    setStatus(null);
    try {
      const account = await refreshSession();
      setStatus(account?.emailVerified ? "E-posta adresin doğrulandı." : "Doğrulama henüz görünmüyor. Bağlantıyı açtıktan sonra tekrar kontrol et.");
    } catch (error) {
      setStatus(authErrorMessage(error));
    } finally {
      setVerificationBusy(null);
    }
  };

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

  // KVKK md. 11: kendi verisini tek JSON olarak indirir. Hata gösterilir; kısmi dosya indirilmez.
  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    setStatus(null);
    try {
      const file = await exportAccountData({ uid: user.uid, backend: user.backend, account: { displayName: user.displayName, email: user.email } });
      downloadAccountExport(file);
      setStatus("Verilerin JSON dosyası hazırlandı.");
    } catch (error) {
      setStatus(`Veriler indirilemedi: ${(error as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const completeDelete = async () => {
    if (!user) return;
    setDeleting(true);
    setStatus(null);
    setDeleteError(null);
    try {
      await deleteAccount({ uid: user.uid, backend: user.backend, password: deletePassword });
      setDeletePassword("");
      setStatus("Hesabın ve tüm verilerin silindi.");
      // Oturum zaten kalktı; kısa gecikme sonrası kapan
      setTimeout(() => {
        setConfirmDelete(false);
        onClose();
      }, 800);
    } catch (error) {
      setDeleteError(authErrorMessage(error) || (error as Error).message);
    } finally {
      setDeleting(false);
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
            <p className={`mt-1 flex items-center gap-1.5 text-[13px] ${needsEmailVerification ? "text-sun" : "text-leaf"}`}>
              {user?.backend === "device"
                ? <><Monitor size={14} />Bu cihaza özel hesap</>
                : needsEmailVerification
                  ? <><AlertCircle size={14} />E-posta doğrulanmadı</>
                  : <><ShieldCheck size={14} />Doğrulanmış hesap</>}
            </p>
          </div>
        </div>

        <p className="mt-6 flex items-center gap-2 break-all text-sm text-mint/80">
          {user?.phoneNumber ? <Phone size={15} /> : <Mail size={15} />}
          {user?.email ?? user?.phoneNumber}
        </p>

        <div className="mt-4 rounded-xl border border-leaf/20 bg-white/[0.03] p-3">
          <p className="text-[11px] text-mint/60">Hesap kimliğin (grup daveti için paylaş)</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-[11px] text-mint/85">{user?.uid}</code>
            <button
              type="button"
              onClick={async () => {
                if (!user) return;
                try {
                  await navigator.clipboard.writeText(user.uid);
                  setStatus("Hesap kimliğin kopyalandı.");
                } catch (error) {
                  setStatus("Kopyalanamadı. Kimliği elle seçip kopyalayabilirsin.");
                  console.warn("[Atlasia] Kimlik kopyalanamadı:", error);
                }
              }}
              aria-label="Hesap kimliğini kopyala"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-mint/70 hover:bg-white/5"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        {needsEmailVerification && (
          <section className="mt-4 rounded-2xl border border-sun/25 bg-sun/[0.07] p-4" aria-labelledby="verify-email-title">
            <h3 id="verify-email-title" className="flex items-center gap-2 text-[14px] font-semibold text-sun"><AlertCircle size={16} />E-postanı doğrula</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-mint/70">Hesabını daha güvenilir hâle getirmek için e-postandaki bağlantıyı aç. Keşfe devam etmen bu sırada engellenmez.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void sendVerification()} disabled={!!verificationBusy || verificationSent} className="flex min-h-10 items-center gap-2 rounded-full bg-sun px-3.5 text-[12px] font-semibold text-ink disabled:opacity-50">
                {verificationBusy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}{verificationSent ? "Bağlantı gönderildi" : "Bağlantı gönder"}
              </button>
              <button type="button" onClick={() => void checkVerification()} disabled={!!verificationBusy} className="flex min-h-10 items-center gap-2 rounded-full border border-sun/30 px-3.5 text-[12px] font-semibold text-sun disabled:opacity-50">
                {verificationBusy === "check" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Doğrulamayı kontrol et
              </button>
            </div>
          </section>
        )}

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
        <button type="button" onClick={() => setFeedbackOpen(true)} className="mt-6 flex min-h-10 items-center gap-2 rounded-full border border-sun/30 px-4 text-[12px] font-semibold text-sun">
          Geri bildirim gönder
        </button>
        <button type="button" disabled={exporting} onClick={() => void exportData()} className="mt-2 flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-[12px] font-semibold text-mint disabled:opacity-60">
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Verilerimi indir
        </button>
      </div>
      {feedbackOpen && <FeedbackDialog uid={user?.uid ?? null} onClose={() => setFeedbackOpen(false)} />}

      <footer className="shrink-0 border-t border-white/10 bg-ink-2 px-6 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-4">
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-red-300/20 text-[14px] text-red-200/90 transition hover:bg-red-400/10"
        >
          <LogOut size={17} />Hesaptan çık
        </button>
        {/* Hesap silme panel kaydırılmadan görünür: alt alanda, çıkışın hemen altında. */}
        <button
          type="button"
          onClick={() => { setDeleteError(null); setConfirmDelete(true); }}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-red-200/80 transition hover:bg-red-400/10"
        >
          <Trash2 size={15} />Hesabımı ve verilerimi sil
        </button>
      </footer>

      {confirmLogout && (
        <div className="absolute inset-0 z-20 grid place-items-end bg-black/65 p-4 backdrop-blur-sm md:place-items-center">
          <section role="alertdialog" aria-modal="true" aria-labelledby="logout-title" className="logout-confirm w-full rounded-[24px] border border-white/10 bg-[#06221b] p-5 shadow-2xl">
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
      {confirmDelete && (
        <div className="absolute inset-0 z-20 grid place-items-end bg-black/65 p-4 backdrop-blur-sm md:place-items-center">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full rounded-[24px] border border-red-300/20 bg-[#1a0f0f] p-5 shadow-2xl">
            <h3 id="delete-title" className="font-display text-lg font-semibold text-red-200">Hesabın tamamen silinsin mi?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-mint/70">İzlerin, rotaların, kayıtların, gönderilerin, hikâyelerin, arkadaşlıkların, grup üyeliklerin, bildirimlerin, raporların, engellerin ve geri bildirimlerin silinir. Bir adım başarısız olursa hesabın silinmez ve tekrar deneyebilirsin. Bu işlem geri alınamaz. Onaylıyor musun?</p>
            {user?.backend === "firebase" && (
              <label className="mt-4 block text-[12px] text-mint/75">
                Şifren (e-posta hesabıysan zorunlu; Google/Apple ile girdiysen boş bırak)
                <input
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  disabled={deleting}
                  className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-sun"
                />
              </label>
            )}
            {deleteError && <p role="alert" className="mt-3 text-[13px] leading-relaxed text-red-200">{deleteError}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className="min-h-11 rounded-full border border-white/15 text-sm text-mint disabled:opacity-50">Vazgeç</button>
              <button type="button" disabled={deleting} onClick={() => void completeDelete()} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-300 px-4 text-sm font-semibold text-[#30110f] disabled:opacity-60">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Evet, sil
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

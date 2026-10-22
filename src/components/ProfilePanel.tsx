import { lazy, Suspense, useState } from "react";
import {
  AlertCircle,
  Bell,
  Bookmark,
  ChevronRight,
  Download,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Phone,
  RefreshCw,
  Route,
  Copy,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCollections } from "../hooks/useCollections";
import { authErrorMessage } from "../lib/auth";
import { usePanelAccess } from "../hooks/usePanelAccess";
import { deleteAccount } from "../lib/moderation";
import { SettingsContent, type SettingsContentProps } from "./SettingsPanel";
// Seyrek kullanılan akışlar başlangıç paketine girmez (bundle bütçesi): yalnız
// tıklanınca yüklenir.
const FeedbackDialog = lazy(() => import("./FeedbackDialog"));

interface Props {
  onClose: () => void;
  onRecords: () => void;
  settings: SettingsContentProps;
  myPlacesCount: number;
  onMyPlaces: () => void;
  unreadCount: number;
  onNotifications: () => void;
  onAtlasAI: () => void;
}

export default function ProfilePanel({ onClose, onRecords, settings, myPlacesCount, onMyPlaces, unreadCount, onNotifications, onAtlasAI }: Props) {
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
  const [activeSection, setActiveSection] = useState("profile-account");
  const needsEmailVerification = user?.backend === "firebase" && !!user.email && !user.emailVerified;
  const accountType = user?.backend === "device" ? "Bu cihaza özel" : "Bulut hesabı";
  const verificationLabel = user?.backend === "device" ? "Cihaz hesabı" : needsEmailVerification ? "Doğrulama bekliyor" : user?.emailVerified ? "Doğrulandı" : "Kayıtlı";

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

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
      const { downloadAccountExport, exportAccountData } = await import("../lib/accountExport");
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
      className="settings-sheet gold-frame fixed inset-0 z-[55] flex w-full flex-col overflow-hidden bg-ink-2 md:inset-auto md:top-[88px] md:right-4 md:bottom-4 md:w-[min(520px,calc(100vw-2rem))] md:rounded-3xl md:border"
    >
      <header className="flex shrink-0 items-center justify-between px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-3 md:px-6 md:pt-5">
        <div>
          <h2 id="profile-title" className="font-display text-xl font-semibold">Profilim</h2>
          <p className="mt-0.5 text-[12px] text-mint/70">Hesabın, kayıtların ve tüm ayarların</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Profili kapat" className="grid size-11 place-items-center rounded-full hover:bg-white/5">
          <X size={19} />
        </button>
      </header>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        <section aria-label="Hesap özeti" className="mt-2 overflow-hidden rounded-[24px] border border-sun/25 bg-gradient-to-br from-sun/[0.13] via-leaf/[0.07] to-transparent p-4">
          <div className="flex items-center gap-4">
            <span className="avatar-gold-ring size-[74px] shrink-0">
              <span className="grid size-full place-items-center bg-ink-2 font-display text-[26px] font-bold text-sun">
                {user?.displayName?.[0]?.toLocaleUpperCase("tr") ?? <UserRound size={25} />}
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">{user?.displayName ?? "Profil adını ekle"}</p>
              <p className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${needsEmailVerification ? "bg-sun/12 text-sun ring-sun/35" : "bg-leaf/12 text-leaf ring-leaf/35"}`}>
                {user?.backend === "device"
                  ? <><Monitor size={13} />Bu cihaza özel hesap</>
                  : needsEmailVerification
                    ? <><AlertCircle size={13} />E-posta doğrulanmadı</>
                    : <><ShieldCheck size={13} />Doğrulanmış hesap</>}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] break-all text-mint/80">
                {user?.phoneNumber ? <Phone size={14} className="shrink-0" /> : <Mail size={14} className="shrink-0" />}
                <span className="min-w-0">{user?.email ?? user?.phoneNumber}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3.5 text-center">
            <div className="px-1.5">
              <p className="font-display text-[21px] leading-none font-bold text-white tabular-nums">{myPlacesCount}</p>
              <p className="mt-1.5 text-[12px] text-mint/70">izim</p>
            </div>
            <div className="px-1.5">
              <p className="font-display text-[21px] leading-none font-bold text-white tabular-nums">{savedPlaces.length}</p>
              <p className="mt-1.5 text-[12px] text-mint/70">yer kaydı</p>
            </div>
            <div className="px-1.5">
              <p className="font-display text-[21px] leading-none font-bold text-white tabular-nums">{savedRoutes.length}</p>
              <p className="mt-1.5 text-[12px] text-mint/70">rota kaydı</p>
            </div>
          </div>
        </section>

        <nav aria-label="Profil bölümleri" className="sticky top-0 z-10 -mx-6 mt-4 grid grid-cols-4 gap-1.5 border-y border-white/[0.06] bg-ink-2/95 px-3 py-2 backdrop-blur-xl md:gap-2 md:px-6">
          {[
            { id: "profile-account", label: "Hesabım", icon: UserRound },
            { id: "profile-library", label: "Kayıtlar", icon: Bookmark },
            { id: "profile-settings", label: "Ayarlar", icon: SlidersHorizontal },
            { id: "location-settings", label: "Konum", icon: MapPin },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeSection === id}
              onClick={() => scrollToSection(id)}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold transition min-[380px]:gap-1.5 min-[380px]:px-2 min-[380px]:text-[12px] md:px-3 ${activeSection === id ? "border-sun/55 bg-sun/12 text-sun" : "border-white/12 text-mint/75 hover:border-sun/40 hover:text-mint"}`}
            >
              <Icon size={14} className="hidden shrink-0 min-[410px]:block" /><span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div id="profile-account" className="mt-4 scroll-mt-20 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="grid grid-cols-2 gap-3 border-b border-white/[0.07] pb-3">
            <div>
              <p className="text-[11px] text-mint/70">Hesap türü</p>
              <p className="mt-1 text-[13px] font-semibold text-mint">{accountType}</p>
            </div>
            <div>
              <p className="text-[11px] text-mint/70">Doğrulama</p>
              <p className="mt-1 text-[13px] font-semibold text-mint">{verificationLabel}</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-mint/70">Hesap kimliğin (grup daveti için paylaş)</p>
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
            className="btn-gold mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Değişiklikleri kaydet
          </button>
        </form>

        {status && <p role="status" className="mt-3 text-sm text-sun">{status}</p>}

        <section id="profile-library" aria-labelledby="profile-library-title" className="mt-8 scroll-mt-20">
          <h3 id="profile-library-title" className="text-[12px] font-bold tracking-[0.16em] text-mint/70 uppercase">Keşiflerim</h3>
          <div className="mt-3 divide-y divide-white/[0.07] overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={onRecords}
              className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.04]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun/12 text-sun ring-1 ring-sun/30"><Bookmark size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Kayıtlarım</span>
                <span className="mt-0.5 block text-[12px] text-mint/70">{savedPlaces.length} yer · {savedRoutes.length} rota</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-mint/70" />
            </button>
            <button type="button" onClick={onMyPlaces} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.04] md:hidden">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf/12 text-leaf ring-1 ring-leaf/30"><MapPin size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">İzlerim</span>
                <span className="mt-0.5 block text-[12px] text-mint/70">{myPlacesCount} iz · haritaya bıraktığın noktalar</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-mint/70" />
            </button>
            <button type="button" onClick={onNotifications} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.04]">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-mint ring-1 ring-white/15">
                <Bell size={16} />
                {unreadCount > 0 && <span aria-hidden className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sun px-1 text-[10px] leading-none font-bold text-ink ring-2 ring-ink-2">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Bildirimler</span>
                <span className="mt-0.5 block text-[12px] text-mint/70">{unreadCount > 0 ? `${unreadCount} yeni bildirimin var` : "Yeni bildirim yok"}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-mint/70" />
            </button>
            <button type="button" onClick={onAtlasAI} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.04]">
              <span className="btn-gold grid size-9 shrink-0 place-items-center rounded-full"><Sparkles size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Atlas AI ile planla</span>
                <span className="mt-0.5 block text-[12px] text-mint/70">Rota önerisi ve yakındaki izler</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-mint/70" />
            </button>
          </div>
          <p className="mt-3.5 flex items-start gap-2 px-1 text-[12px] leading-relaxed text-mint/70">
            <Route size={14} className="mt-0.5 shrink-0" />
            Kaydettiğin yerler ve rotalar bu cihazda, hesabına özel tutulur.
          </p>
        </section>

        <section id="profile-settings" aria-labelledby="profile-settings-title" className="mt-9 scroll-mt-20">
          <h3 id="profile-settings-title" className="font-display text-lg font-semibold">Ayarlar</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-mint/70">Görünüm, harita, çevrimdışı kullanım, uygulama ve konum tercihlerinin tamamı burada.</p>
          <div className="mt-5">
            <SettingsContent {...settings} />
          </div>
        </section>

        <section aria-labelledby="profile-support-title" className="mt-9">
          <h3 id="profile-support-title" className="text-[12px] font-bold tracking-[0.16em] text-mint/70 uppercase">Destek ve verilerin</h3>
          <div className="mt-3 divide-y divide-white/[0.07] overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.02]">
            <button type="button" onClick={() => setFeedbackOpen(true)} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.04]">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf/12 text-leaf ring-1 ring-leaf/30"><Send size={15} /></span>
              <span className="min-w-0 flex-1 text-sm font-semibold">Geri bildirim gönder</span>
              <ChevronRight size={16} className="shrink-0 text-mint/70" />
            </button>
            <button type="button" disabled={exporting} onClick={() => void exportData()} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left transition hover:bg-white/[0.04] disabled:opacity-60">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-mint ring-1 ring-white/15">{exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold">Verilerimi indir</span>
              <ChevronRight size={16} className="shrink-0 text-mint/70" />
            </button>
          </div>
        </section>
      </div>
      {feedbackOpen && <Suspense fallback={null}><FeedbackDialog uid={user?.uid ?? null} onClose={() => setFeedbackOpen(false)} /></Suspense>}

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

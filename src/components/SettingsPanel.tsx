import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Accessibility,
  ArrowRight,
  CheckCircle2,
  Contrast,
  Crosshair,
  Download,
  Eye,
  Globe2,
  HardDriveDownload,
  Loader2,
  Map,
  MapPin,
  Moon,
  Mountain,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Tags,
  Type,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatAccuracy, type GeoFix, type GeoStatus } from "../hooks/useGeolocation";
import type { BaseMapStyle } from "./MapView";
import type { AppTheme } from "../hooks/useTheme";
import type { InstallAppController } from "../hooks/useInstallApp";
import { cn } from "../utils/cn";
import { formatCoords } from "../utils/geo";
import type { BBox } from "../utils/offlineCache";
import { useAccessibilityPrefs, type TextScale } from "../hooks/useAccessibilityPrefs";

// P15: indirme kodu yalnız kullanıcı bölümü açınca yüklenir (entry bütçesi).
const OfflinePackage = lazy(() => import("./OfflinePackage"));

export type SettingsTab = "location";

export interface SettingsContentProps {
  theme: AppTheme;
  onTheme: (theme: AppTheme) => void;
  baseMap: BaseMapStyle;
  onBaseMap: (style: BaseMapStyle) => void;
  installApp: InstallAppController;
  location: {
    supported: boolean;
    secure: boolean;
    permission: PermissionState | "unknown";
    status: GeoStatus;
    fix: GeoFix | null;
    label: string | null;
  };
  onAllowLocation: () => void;
  onClearLocation: () => void;
  onShowLocation: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  terrainEnabled: boolean;
  onToggleTerrain: () => void;
  /** Haritanın görünen alanı; çevrimdışı paket bu alanı indirir. */
  mapBounds?: BBox | null;
}

interface Props extends SettingsContentProps {
  onClose: () => void;
}

function InfoRow({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5 py-3.5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
        <Icon className="size-4" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-mint">{title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-mint/60">{children}</p>
      </div>
    </li>
  );
}

/** Erişilebilirlik anahtarı: iOS/Material diline yakın, role="switch" ile. */
function A11ySwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative grid h-8 w-[52px] shrink-0 place-items-center rounded-full border transition",
        checked ? "border-sun/60 bg-sun/85" : "border-white/20 bg-white/10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 size-6 -translate-y-1/2 rounded-full transition-all",
          checked ? "left-[24px] bg-[#10241a]" : "left-[3px] bg-mint/80",
        )}
      />
      <span className="sr-only">{checked ? "Açık" : "Kapalı"}</span>
    </button>
  );
}

function A11yRow({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-leaf/10 text-leaf">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-mint">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-mint/65">{description}</p>
      </div>
      <div className="mt-0.5 flex shrink-0 items-center">{children}</div>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-sun/30 bg-sun/[0.08] px-3.5 py-3 text-[14px] leading-relaxed text-sun">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const THEME_OPTIONS = [
  { id: "dark", label: "Koyu", icon: Moon, activeClass: "bg-ink-3 text-sun shadow-lg" },
  { id: "light", label: "Açık", icon: Sun, activeClass: "bg-sun text-ink shadow-lg" },
  { id: "midnight", label: "Gece", icon: Sparkles, activeClass: "bg-ink-2 text-sun-2 shadow-lg" },
] as const;

export function SettingsContent({
  theme,
  onTheme,
  baseMap,
  onBaseMap,
  installApp,
  location: geo,
  onAllowLocation,
  onClearLocation,
  onShowLocation,
  showLabels,
  onToggleLabels,
  terrainEnabled,
  onToggleTerrain,
  mapBounds = null,
}: SettingsContentProps) {
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const [offlineOpen, setOfflineOpen] = useState(false);
  // P18: erişilebilirlik tercihleri cihazda saklanır (Ayarlar ve Profil aynı
  // içeriği paylaşır; iki görünümde de aynı anahtarlar görünür).
  const a11y = useAccessibilityPrefs();

  const requestInstall = async () => {
    try {
      const accepted = await installApp.install();
      setInstallNotice(accepted ? "Atlasia cihazına eklendi." : "Yükleme şimdilik iptal edildi.");
    } catch {
      setInstallNotice("Yükleme başlatılamadı. Tarayıcı menüsündeki uygulama yükleme seçeneğini deneyebilirsin.");
    }
  };

  const busy = geo.status === "locating" || geo.status === "refining";
  const denied = geo.permission === "denied" || geo.status === "denied";
  const blocked = !geo.supported || !geo.secure || denied;
  const statusText = busy
    ? geo.status === "refining"
      ? "Konum hassaslaştırılıyor"
      : "Konumun belirleniyor"
    : geo.fix
      ? "Konumun hazır"
      : denied
        ? "Konum izni kapalı"
        : "İzin senin kontrolünde";

  return (
    <>
      <section aria-labelledby="appearance-title">
        <p id="appearance-title" className="text-[12px] font-bold tracking-[0.16em] text-mint/55 uppercase">Görünüm</p>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-leaf/20 bg-white/[0.04] p-1.5">
          {THEME_OPTIONS.map(({ id, label, icon: Icon, activeClass }) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme === id}
              onClick={() => onTheme(id)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition",
                theme === id ? activeClass : "text-mint/65 hover:bg-white/[0.05]",
              )}
            >
              <Icon className="size-4 shrink-0" />{label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-mint/50">Renk seçimin bu cihazda saklanır.</p>

        <p className="mt-5 text-[12px] font-semibold text-mint/70">Harita altlığı</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([
            { id: "satellite", label: "Uydu", icon: Globe2 },
            { id: "dark", label: "Karanlık", icon: Moon },
            { id: "street", label: "Sokak", icon: Map },
            { id: "topographic", label: "Topoğrafik", icon: Mountain },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={baseMap === id}
              onClick={() => onBaseMap(id)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition",
                baseMap === id ? "border-sun/60 bg-sun/10 text-sun" : "border-leaf/20 text-mint/65 hover:border-leaf/45 hover:text-mint",
              )}
            >
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-mint/45">Pinlerin, rota çizgin ve 3B arazi tercihin korunur.</p>

        <p className="mt-5 text-[12px] font-semibold text-mint/70">Harita gösterimi</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={showLabels}
            onClick={onToggleLabels}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition",
              showLabels ? "border-sun/60 bg-sun/10 text-sun" : "border-leaf/20 text-mint/65 hover:border-leaf/45 hover:text-mint",
            )}
          >
            <Tags className="size-4" />Yer adları
            <span className="text-[11px] font-medium opacity-80">{showLabels ? "Açık" : "Kapalı"}</span>
          </button>
          <button
            type="button"
            aria-pressed={terrainEnabled}
            onClick={onToggleTerrain}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition",
              terrainEnabled ? "border-sun/60 bg-sun/10 text-sun" : "border-leaf/20 text-mint/65 hover:border-leaf/45 hover:text-mint",
            )}
          >
            <Mountain className="size-4" />3B arazi
            <span className="text-[11px] font-medium opacity-80">{terrainEnabled ? "Açık" : "Kapalı"}</span>
          </button>
        </div>
      </section>

      <div className="my-6 h-px bg-leaf/15" />
      <section aria-labelledby="accessibility-title" className="scroll-mt-24">
        <p id="accessibility-title" className="text-[12px] font-bold tracking-[0.16em] text-mint/55 uppercase">Erişilebilirlik</p>
        <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-2xl border border-leaf/20 bg-white/[0.04]">
          <A11yRow
            icon={Accessibility}
            title="Hareketi azalt"
            description="Harita dönüşü, panel ve geçiş animasyonları durur; içerik aynı yerde açılır."
          >
            <A11ySwitch label="Hareketi azalt" checked={a11y.reducedMotion} onChange={a11y.setReducedMotion} />
          </A11yRow>

          <div className="px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-leaf/10 text-leaf">
                <Type className="size-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p id="a11y-text-scale-title" className="text-[15px] font-semibold text-mint">Yazı boyutu</p>
                <p className="mt-1 text-[13px] leading-relaxed text-mint/65">Küçük etiketler ve açıklamalar bir kademe büyür.</p>
              </div>
            </div>
            <div role="group" aria-labelledby="a11y-text-scale-title" className="mt-3 flex gap-2">
              {([["normal", "Normal"], ["large", "Büyük"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={a11y.textScale === value}
                  onClick={() => a11y.setTextScale(value as TextScale)}
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border text-[13px] font-semibold transition",
                    a11y.textScale === value ? "btn-gold border-transparent text-ink" : "border-leaf/25 text-mint hover:border-leaf/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <A11yRow
            icon={Contrast}
            title="Yüksek kontrast"
            description="Soluk metinler beyaza yaklaşır, kenarlıklar ve odak halkası kalınlaşır."
          >
            <A11ySwitch label="Yüksek kontrast" checked={a11y.highContrast} onChange={a11y.setHighContrast} />
          </A11yRow>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-mint/60">Bu seçimler yalnız bu cihazda saklanır. Klavye ile gezinme, “İçeriğe geç” bağlantısı, görünür odak halkası ve en az 44px dokunma hedefi her zaman açıktır.</p>
      </section>

      <div className="my-6 h-px bg-leaf/15" />
      <section aria-labelledby="offline-title">
        <p id="offline-title" className="text-[12px] font-bold tracking-[0.16em] text-mint/55 uppercase">Çevrimdışı harita</p>
        {offlineOpen ? (
          <Suspense fallback={<p className="mt-3 flex items-center gap-2 text-[13px] text-mint/70"><Loader2 className="size-4 animate-spin" />Yükleniyor…</p>}>
            <OfflinePackage bbox={mapBounds} />
          </Suspense>
        ) : (
          <button
            type="button"
            onClick={() => setOfflineOpen(true)}
            aria-expanded={false}
            className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-2xl border border-leaf/20 bg-white/[0.04] px-4 text-left text-[14px] font-semibold text-mint transition hover:border-leaf/45"
          >
            <HardDriveDownload className="size-4 text-leaf" />Görünen alanı internetsiz kullanmak için indir
          </button>
        )}
      </section>

      <div className="my-6 h-px bg-leaf/15" />
      <section aria-labelledby="install-title">
        <p id="install-title" className="text-[12px] font-bold tracking-[0.16em] text-mint/55 uppercase">Uygulama</p>
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-leaf/20 bg-white/[0.04] p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-leaf/10 text-leaf"><Smartphone className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-mint">Atlasia’yı cihazına ekle</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mint/55">Tam ekran açılır; son yüklenen uygulama kabuğuna bağlantı kesildiğinde de ulaşabilirsin. Canlı harita ve hesap işlemleri internet ister.</p>
            {installApp.installed ? (
              <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-leaf"><CheckCircle2 className="size-4" />Bu cihazda yüklü</p>
            ) : installApp.canPrompt ? (
              <button type="button" onClick={() => void requestInstall()} disabled={installApp.busy} className="mt-3 flex min-h-11 items-center gap-2 rounded-full border border-leaf/35 px-4 text-[13px] font-semibold text-leaf disabled:opacity-50">
                {installApp.busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Uygulamayı yükle
              </button>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-mint/65">{installApp.ios ? "Safari’de Paylaş menüsünü açıp ‘Ana Ekrana Ekle’ seçeneğini kullan." : "Tarayıcı menüsündeki ‘Uygulamayı yükle’ veya ‘Ana ekrana ekle’ seçeneğini kullanabilirsin."}</p>
            )}
            {installNotice && <p role="status" className="mt-2 text-[12px] text-sun">{installNotice}</p>}
          </div>
        </div>
      </section>

      <div className="my-6 h-px bg-leaf/15" />
      <section id="location-settings" aria-labelledby="location-settings-title" className="scroll-mt-24">
      <p id="location-settings-title" className="mb-3 text-[12px] font-bold tracking-[0.16em] text-mint/55 uppercase">Konum ve gizlilik</p>
      <div className="flex items-center gap-3 rounded-2xl border border-leaf/20 bg-white/[0.05] p-4">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", geo.fix ? "bg-leaf/15 text-leaf" : "bg-sun/15 text-sun")}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : geo.fix ? <CheckCircle2 className="size-5" /> : <Crosshair className="size-5" />}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-[15px] font-semibold text-mint">{statusText}</p>
          <p className="mt-1 truncate text-[14px] text-mint/60">
            {geo.fix ? (geo.label ?? "Bulunduğun nokta") : "Konumunu yalnızca onayından sonra alırız."}
          </p>
        </div>
        {geo.fix && <span className="shrink-0 text-[13px] font-semibold text-leaf">{formatAccuracy(geo.fix.accuracy)}</span>}
      </div>

      <ul className="mt-2 divide-y divide-white/[0.06]">
        <InfoRow icon={MapPin} title="Doğru nokta, doğru tavsiye">
          İz bırakırken bulunduğun gerçek noktayı seçebilirsin.
        </InfoRow>
        <InfoRow icon={Eye} title="Yakınındakileri gör">
          Çevrendeki gezgin ipuçlarını ve harita izlerini bul.
        </InfoRow>
        <InfoRow icon={ShieldCheck} title="Kontrol sende">
          Canlı konumun hesabına kaydedilmez ve otomatik paylaşılmaz. Yalnızca açıkça bıraktığın izler hesabında saklanır.
        </InfoRow>
      </ul>

      {geo.fix && <p className="mt-2 mb-1 font-mono text-[13px] text-mint/50">{formatCoords(geo.fix.lat, geo.fix.lng)}</p>}

      {!geo.supported && <Notice>Bu tarayıcı konum servisini desteklemiyor. Haritadan elle nokta seçebilirsin.</Notice>}
      {geo.supported && !geo.secure && <Notice>Konum için güvenli bağlantı (https) gerekir.</Notice>}
      {geo.supported && geo.secure && denied && (
        <Notice>Adres çubuğundaki site ayarlarından Konum iznini “İzin ver” yapıp tekrar dene.</Notice>
      )}
      {geo.status === "timeout" && <Notice>Konum zaman aşımına uğradı. Cihazının konum servisini açıp tekrar dene.</Notice>}
      {geo.status === "unavailable" && <Notice>Konum şu an alınamıyor. Sinyal yetersiz olabilir.</Notice>}

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onAllowLocation}
          disabled={blocked || busy}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-sun px-5 text-[15px] font-bold text-[#10241A] transition hover:bg-sun-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
          {busy ? "Konum alınıyor…" : geo.fix ? "Konumu yenile" : "Konum iznini ver"}
        </button>
        {geo.fix && (
          <button
            type="button"
            onClick={onShowLocation}
            className="flex min-h-[48px] items-center gap-2 rounded-full border border-leaf/35 px-4 text-[15px] font-semibold text-leaf transition hover:bg-leaf/10"
          >
            Haritada gör <ArrowRight className="size-4" />
          </button>
        )}
      </div>
      {(geo.fix || busy) && (
        <button
          type="button"
          onClick={onClearLocation}
          className="mt-3 min-h-[44px] w-full text-[14px] text-mint/60 transition hover:text-mint"
        >
          {busy ? "Ölçümü durdur" : "Konum işaretini kaldır"}
        </button>
      )}
      <p className="mt-4 text-[13px] leading-relaxed text-mint/45">
        İlk kullanımda tarayıcın ayrıca izin ister. Yer adını bulmak için koordinatlar OSM verisini kullanan Photon hizmetine gönderilir.
      </p>
      </section>
    </>
  );
}

export default function SettingsPanel({ onClose, ...contentProps }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="settings-overlay fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Konum ayarlarını kapat"
        onClick={onClose}
        className="settings-scrim absolute inset-0 bg-black/60"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="settings-sheet panel-solid relative flex h-dvh w-full max-w-[460px] flex-col border-l border-leaf/20 shadow-2xl shadow-black/60 sm:m-4 sm:h-[calc(100dvh-32px)] sm:rounded-[28px] sm:border"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") {
            const nodes = Array.from(
              panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? [],
            ).filter((el) => el.offsetParent !== null);
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="flex items-start justify-between px-6 pt-6 sm:px-7">
          <div>
            <p className="text-[12px] font-bold tracking-[0.18em] text-sun uppercase">Ayarlar</p>
            <h2 id="settings-title" className="font-display mt-1.5 text-[26px] leading-tight font-semibold text-mint">
              Atlasia deneyimin
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="grid size-11 place-items-center rounded-full text-mint/60 transition hover:bg-white/[0.07] hover:text-white"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          <SettingsContent {...contentProps} />
        </div>
      </aside>
    </div>
  );
}

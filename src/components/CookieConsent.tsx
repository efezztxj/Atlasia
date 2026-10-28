import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_PREFERENCES_EVENT,
  readCookieConsent,
  saveCookieConsent,
  saveEssentialCookieConsent,
  type CookieConsentRecord,
} from "../lib/cookieConsent";
import { analytics } from "../lib/analytics";

const LegalNotice = lazy(() => import("./LegalNotice"));

const CATEGORIES = [
  ["Zorunlu", "Her zaman açık"],
  ["Analitik", "Kullanılmıyor"],
  ["Pazarlama", "Kullanılmıyor"],
] as const;

export default function CookieConsent() {
  const [saved, setSaved] = useState<CookieConsentRecord | null>(() => readCookieConsent());
  const [open, setOpen] = useState<boolean>(() => readCookieConsent() === null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const restoreFocus = useCallback(() => {
    const previous = previousFocusRef.current;
    previousFocusRef.current = null;
    if (previous?.isConnected) previous.focus();
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    setDetailsOpen(false);
    restoreFocus();
  }, [restoreFocus]);

  useEffect(() => {
    const onOpenPreferences = () => {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const current = readCookieConsent();
      setSaved(current);
      setOpen(true);
      setTimeout(() => (current ? closeRef.current ?? primaryRef.current : primaryRef.current)?.focus(), 0);
    };
    const onConsentChanged = () => setSaved(readCookieConsent());

    window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChanged);
    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences);
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChanged);
    };
  }, []);

  useEffect(() => {
    if (!open || !saved || privacyOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, saved, privacyOpen, dismiss]);

  const handleSaveWithAnalytics = () => {
    const { record } = saveCookieConsent({ analytics: true });
    // T2: tercih olayı. "Yalnız zorunlu" seçen kullanıcıda rıza kapısı kapalı
    // olduğu için bu olay gönderilmez (bilinçli: rıza öncesi ağ trafiği yok).
    analytics.consentChoice({ analytics: true });
    setSaved(record);
    setOpen(false);
    setDetailsOpen(false);
    restoreFocus();
  };

  const handleSave = () => {
    const { record } = saveEssentialCookieConsent();
    analytics.consentChoice({ analytics: false });
    setSaved(record);
    setOpen(false);
    setDetailsOpen(false);
    restoreFocus();
  };

  if (!open && !privacyOpen) return null;

  return (
    <>
      {open && (
        // Yerleşim kararı (T7): hero CTA'sı ekranın solunda durur; bu yüzden
        // masaüstünde kart sağ alt köşeye yaslanır ve "Dünyayı keşfet" düğmesini
        // hiçbir genişlikte örtmez. Mobilde tam genişlikte alt sayfa olur ve
        // güvenli alanı (çentik/gesture çubuğu) hesaba katar.
        <section
          aria-labelledby="cookie-consent-title"
          className="thin-scroll fixed inset-x-0 bottom-[calc(66px+env(safe-area-inset-bottom))] z-[90] max-h-[70dvh] w-full overflow-y-auto rounded-t-3xl border border-leaf/25 bg-ink-2 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-mint shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:max-h-dvh md:w-96 md:rounded-3xl md:p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-leaf/10 text-leaf">
              <ShieldCheck className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="cookie-consent-title" className="font-display text-[15px] leading-tight font-semibold text-mint">
                Çerez ve cihaz depolaması
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-mint/75">
                Reklam çerezi kullanmıyoruz. Anonim kullanım ölçümü <span className="font-semibold text-mint">isteğe bağlıdır ve kapalı başlar</span>; açarsan hata ve temel olay sayaçları toplanır — kimlik, konum ve içerik gönderilmez. Zorunlu{" "}
                <span className="font-semibold text-mint">atlasia_consent</span> çerezi bu tercihi 12 ay hatırlar.
              </p>
            </div>
            {saved && (
              <button
                ref={closeRef}
                type="button"
                onClick={dismiss}
                aria-label="Çerez tercihlerini kapat"
                className="grid size-8 shrink-0 place-items-center rounded-full text-mint/70 transition hover:text-mint"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {detailsOpen && (
            <div id="cookie-consent-details" className="mt-3 space-y-2.5 rounded-2xl border border-leaf/20 bg-ink-3 p-3 text-[12px] leading-relaxed text-mint/75">
              <ul className="space-y-1.5" aria-label="Çerez kategorileri">
                {CATEGORIES.map(([label, status]) => (
                  <li key={label} className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-mint">{label}</span>
                    <span className="rounded-full border border-leaf/20 px-2.5 py-0.5 text-[11px] font-semibold text-mint/80">
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                <strong className="font-semibold text-mint">Anonim ölçüm:</strong> isteğe bağlıdır. Açtığında yalnız
                şunlar gönderilir: hata türü ve mesajı (e-posta/telefon/konum temizlenir), oturum başına rastgele
                kimlik, sayfa yolu (sorgu ve hash atılmış) ve sayaç olayları (kayıt, iz, rota, paylaşım). Çerez
                kullanılmaz; reklam profili çıkarılmaz.
              </p>
              <p>
                <strong className="font-semibold text-mint">Zorunlu çerez:</strong>{" "}
                atlasia_consent (12 ay, Path=/, SameSite=Lax, HTTPS’de Secure) ve tarayıcı çerezi engellenirse atlasia.cookieConsent.v1 yerel yedeği.
              </p>
              <p>
                <strong className="font-semibold text-mint">Yerel depolama envanteri:</strong>{" "}
                tema (atlasia.theme.v1), harita stili (atlasia.mapStyle.v1), erişilebilirlik (atlasia.accessibility.v1), son aramalar, clientId, yerel iz/gönderi/hikâye kayıtları, çevrimdışı paketler, davet/oturum bilgileri, cihaz hesabı (IndexedDB) ve Service Worker Cache Storage.
              </p>
              <p>
                <strong className="font-semibold text-mint">Oturum ve güvenlik:</strong>{" "}
                Firebase Authentication kendi tarayıcı deposunu; Google App Check / reCAPTCHA ise suistimali önlemek için kendi güvenlik mekanizmalarını kullanabilir (reklam çerezi değildir).
              </p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            <button
              ref={primaryRef}
              type="button"
              onClick={handleSave}
              className="btn-gold min-h-11 w-full rounded-full px-4 text-[13px] font-bold text-[#10241a]"
            >
              Yalnız zorunlularla devam et
            </button>
            <button
              type="button"
              onClick={handleSaveWithAnalytics}
              className="min-h-11 w-full rounded-full border border-leaf/30 px-4 text-[13px] font-semibold text-mint transition hover:border-leaf/60"
            >
              Anonim ölçümü açarak devam et
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls="cookie-consent-details"
                onClick={() => setDetailsOpen((prev) => !prev)}
                className="min-h-9 rounded-full border border-leaf/25 px-3.5 text-[12px] font-semibold text-mint/80 transition hover:border-leaf/50 hover:text-mint"
              >
                Ayrıntılar
              </button>
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="min-h-9 rounded-full px-3 text-[12px] font-semibold text-sun transition hover:text-mint"
              >
                Gizlilik açıklaması
              </button>
            </div>
          </div>
        </section>
      )}

      {privacyOpen && (
        <Suspense fallback={null}>
          <LegalNotice type="privacy" onClose={() => setPrivacyOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

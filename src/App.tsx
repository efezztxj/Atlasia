/**
 * Atlasia — uygulama kapısı (hafif kabuk).
 *
 * NEDEN BÖYLE: Bu dosya landing ve giriş ekranının ilk yükleme grafiğidir. Burada
 * STATİK olarak yalnız landing, oturum bağlamı ve kurulum ipucu bulunur; harita,
 * Firestore, moderasyon ve paneller `Explorer` parçasında yaşar ve oturum açılınca
 * `import()` ile gelir. Böylece `firebase-vendor` (~150 KB gzip) ve `map-vendor`
 * landing'de indirilmez (bkz. config/lazyLoading.test.ts, scripts/bundle-budget.mjs).
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useRouteMeta } from "./hooks/useRouteMeta";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { analytics, type CtaPlacement } from "./lib/analytics";
import LandingPage from "./components/LandingPage";
import { useInstallApp, type InstallAppController } from "./hooks/useInstallApp";

// Oturum sonrası kabuk: harita + paneller + Firestore.
const Explorer = lazy(() => import("./components/Explorer"));
// Giriş ekranı ve hesap adımları yalnız "Keşfe başla" sonrası gerekir.
const AccountAccess = lazy(() => import("./components/AccountAccess"));
const EmailVerification = lazy(() => import("./components/AccountAccess").then((m) => ({ default: m.EmailVerification })));
const ProfileSetup = lazy(() => import("./components/AccountAccess").then((m) => ({ default: m.ProfileSetup })));

function BootSplash({ label }: { label?: string }) {
  return (
    <div className="grid h-dvh place-items-center bg-ink" role="status" aria-label={label ?? "Atlasia yükleniyor"}>
      <p className="font-display text-3xl font-semibold text-mint">atlasia<span className="text-sun">.</span></p>
    </div>
  );
}

function AuthGate({ installApp }: { installApp: InstallAppController }) {
  const { user, checking, guest, startGuest, accountRequest, clearAccountRequest } = useAuth();
  // F3: tanıtım ve uygulama kabuğu ayrı başlık/açıklama taşır (tek belge olsa da).
  useRouteMeta(!user && !guest ? "landing" : "app");
  const [accessOpen, setAccessOpen] = useState(false);
  const previousUser = useRef(user);

  const closeAccess = () => { clearAccountRequest(); setAccessOpen(false); };

  useEffect(() => {
    if (previousUser.current && !user) setAccessOpen(false);
    // Hesap açıldı: giriş ekranı kapanır, kullanıcı doğrudan haritaya döner (T5).
    if (user) { setAccessOpen(false); clearAccountRequest(); }
    previousUser.current = user;
  }, [user, clearAccountRequest]);

  // T4: misafir yazmaya kalkarsa bağlam korunarak giriş/kayıt ekranı açılır.
  // `accountRequest` sayaçtır: aynı niyet iki kez tetiklense de ekran açılır.
  const requested = useRef(0);
  useEffect(() => {
    if (accountRequest === 0 || accountRequest === requested.current) return;
    requested.current = accountRequest;
    setAccessOpen(true);
  }, [accountRequest]);

  // T2 huni adımı: landing'deki birincil eylem. T4 ile birlikte bu adım artık
  // kayıt duvarı değil: harita misafir olarak açılır, yazma anında hesap istenir.
  // `signedIn` burada sabit false: tanıtım ekranı yalnız oturumsuzken görünür.
  const handleStart = (placement: CtaPlacement) => {
    analytics.ctaClick({ placement, signedIn: false });
    startGuest();
  };

  if (checking) return <BootSplash />;
  if (!user) {
    if (accessOpen) {
      return (
        <Suspense fallback={<BootSplash label="Giriş ekranı yükleniyor" />}>
          <AccountAccess onClose={closeAccess} />
        </Suspense>
      );
    }
    if (guest) {
      return <Suspense fallback={<BootSplash label="Harita hazırlanıyor" />}><Explorer installApp={installApp} /></Suspense>;
    }
    return <LandingPage onStart={handleStart} />;
  }
  if (user.requiresEmailVerification) {
    return <Suspense fallback={<BootSplash />}><EmailVerification /></Suspense>;
  }
  if (!user.displayName?.trim()) {
    return <Suspense fallback={<BootSplash />}><ProfileSetup /></Suspense>;
  }
  return <Suspense fallback={<BootSplash label="Harita hazırlanıyor" />}><Explorer installApp={installApp} /></Suspense>;
}

export default function App() {
  const installApp = useInstallApp();
  return <AuthProvider><AuthGate installApp={installApp} /></AuthProvider>;
}

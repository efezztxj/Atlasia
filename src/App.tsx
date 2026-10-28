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
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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
  const { user, checking } = useAuth();
  const [accessOpen, setAccessOpen] = useState(false);
  const previousUser = useRef(user);

  useEffect(() => {
    if (previousUser.current && !user) setAccessOpen(false);
    previousUser.current = user;
  }, [user]);

  if (checking) return <BootSplash />;
  if (!user) {
    return accessOpen
      ? <Suspense fallback={<BootSplash label="Giriş ekranı yükleniyor" />}><AccountAccess /></Suspense>
      : <LandingPage onStart={() => setAccessOpen(true)} />;
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

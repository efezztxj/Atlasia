import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import CookieConsent from "./components/CookieConsent";
import NetworkStatus from "./components/NetworkStatus";
import UpdateNotice from "./components/UpdateNotice";
import { captureInviteFromLocation } from "./utils/inviteLink";
import { initAccessibilityPrefs } from "./hooks/useAccessibilityPrefs";
import { initTheme } from "./hooks/useTheme";
import { startTelemetry } from "./lib/telemetryBootstrap";

// Davet bağlantısı giriş ekranından önce yakalanır; girişten sonra açılır.
captureInviteFromLocation();

// Kalıcı görünüm tercihlerini ilk boyamadan önce uygula.
initTheme();
initAccessibilityPrefs();

// Ölçüm katmanı (P0-2 hata izleme, P0-3 analitik). Uç nokta tanımlı değilse ve
// çerez onayı yoksa ağa hiçbir şey gitmez; bkz. lib/telemetryBootstrap.ts.
startTelemetry({ endpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT ?? null });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
      <CookieConsent />
      <NetworkStatus />
      {/* Çevrimdışı kabuk güncellemesi: sessizce zorlanmaz, kullanıcıya sorulur. */}
      <UpdateNotice />
    </AppErrorBoundary>
  </StrictMode>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import { captureInviteFromLocation } from "./utils/inviteLink";
import { initAccessibilityPrefs } from "./hooks/useAccessibilityPrefs";

// Davet bağlantısı giriş ekranından önce yakalanır; girişten sonra açılır.
captureInviteFromLocation();

// Erişilebilirlik tercihleri ilk boyamadan önce uygulanır (tema gibi kalıcı).
initAccessibilityPrefs();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
      <NetworkStatus />
    </AppErrorBoundary>
  </StrictMode>
);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      // SW kaydı başarısızsa uygulama çevrimdışı kabuk olmadan çevrimiçi
      // çalışmaya devam eder; hatayı yutma, tanı için görünür bırak.
      console.warn("Service worker kaydedilemedi; çevrimiçi modda devam ediliyor.", error);
    });
  });
}

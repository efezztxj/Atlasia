import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import UpdateNotice from "./components/UpdateNotice";
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
      {/* Çevrimdışı kabuk güncellemesi: sessizce zorlanmaz, kullanıcıya sorulur. */}
      <UpdateNotice />
    </AppErrorBoundary>
  </StrictMode>
);

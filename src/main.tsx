import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import UpdateNotice from "./components/UpdateNotice";
import { captureInviteFromLocation } from "./utils/inviteLink";

// Davet bağlantısı giriş ekranından önce yakalanır; girişten sonra açılır.
captureInviteFromLocation();

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

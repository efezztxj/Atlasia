import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";

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
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

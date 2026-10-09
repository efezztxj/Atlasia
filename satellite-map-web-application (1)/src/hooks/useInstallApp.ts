import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallApp() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    return standalone || iosStandalone;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    setBusy(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setPromptEvent(null);
        return true;
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, [promptEvent]);

  const downloadHtml = useCallback(async () => {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "Atlasia.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 20_000);
  }, []);

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canPrompt = Boolean(promptEvent) && !installed;

  return { installed, canPrompt, busy, ios, install, downloadHtml };
}

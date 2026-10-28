import { useEffect, useRef } from "react";

const openStack: symbol[] = [];

export function usePanelAccess(open: boolean, onClose: () => void, modal = false) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const token = Symbol("panel-access");
    openStack.push(token);
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>("button, input, [tabindex='0']")?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (openStack.length > 0 && openStack[openStack.length - 1] !== token) return;
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (modal && event.key === "Tab") {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex='0']") ?? []).filter((item) => item.offsetParent !== null);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      const idx = openStack.lastIndexOf(token);
      if (idx !== -1) openStack.splice(idx, 1);
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, modal]);
  return ref;
}
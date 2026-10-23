import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "../utils/storage";

export type TextScale = "normal" | "large";

export interface AccessibilityPrefs {
  /** Kullanıcı hareketi azaltmayı seçti mi (işletim sistemi tercihinden bağımsız). */
  reducedMotion: boolean;
  /** Soluk metin ve ince kenarlıklar belirginleşir. */
  highContrast: boolean;
  /** Küçük etiketlerin taban boyutu büyür. */
  textScale: TextScale;
}

const STORAGE_KEY = "atlasia.accessibility.v1";

const DEFAULTS: AccessibilityPrefs = { reducedMotion: false, highContrast: false, textScale: "normal" };

let current: AccessibilityPrefs = DEFAULTS;
const listeners = new Set<() => void>();

function parse(raw: string | null): AccessibilityPrefs {
  if (!raw) return DEFAULTS;
  try {
    const value = JSON.parse(raw) as Partial<AccessibilityPrefs>;
    return {
      reducedMotion: value.reducedMotion === true,
      highContrast: value.highContrast === true,
      textScale: value.textScale === "large" ? "large" : "normal",
    };
  } catch {
    return DEFAULTS;
  }
}

/** Tercihleri <html> veri özniteliklerine yazar; CSS bunları okur. */
function apply(prefs: AccessibilityPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.motion = prefs.reducedMotion ? "reduced" : "full";
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";
  root.dataset.textScale = prefs.textScale;
}

/**
 * İlk boyamadan önce çağrılır (main.tsx): kayıtlı tercih varsa uygulanır,
 * böylece ekran bir an eski görünümle çakmaz.
 */
export function initAccessibilityPrefs() {
  current = parse(storageGet(STORAGE_KEY));
  apply(current);
  return current;
}

function commit(next: AccessibilityPrefs) {
  current = next;
  apply(next);
  storageSet(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

export function updateAccessibilityPrefs(patch: Partial<AccessibilityPrefs>) {
  commit({ ...current, ...patch });
}

export function resetAccessibilityPrefs() {
  commit(DEFAULTS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

export function useAccessibilityPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
  return {
    ...prefs,
    setReducedMotion: (value: boolean) => updateAccessibilityPrefs({ reducedMotion: value }),
    setHighContrast: (value: boolean) => updateAccessibilityPrefs({ highContrast: value }),
    setTextScale: (value: TextScale) => updateAccessibilityPrefs({ textScale: value }),
  };
}

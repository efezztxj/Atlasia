import { useEffect } from "react";
import { applyRouteMeta } from "../lib/routeMeta";

/**
 * F3 — ekran değişince belge başlığını ve açıklamayı günceller.
 * Bağımlılık tek: yüzey adı. Böylece gereksiz DOM yazımı olmaz.
 * Uygulama içi yüzeyler için `useAppRouteMeta` (ayrı, tembel chunk).
 */
export function useRouteMeta(surface: string) {
  useEffect(() => {
    applyRouteMeta(surface);
  }, [surface]);
}

import { useEffect } from "react";
import { applyAppSurfaceMeta } from "../lib/appSurfaceMeta";

/**
 * F3 — uygulama içi sekme/panel değişiminde başlık ve açıklama.
 * Metinler `appSurfaceMeta.ts` içinde: bu kanca tembel yüklenen Explorer ile
 * birlikte gelir, entry paketini büyütmez.
 */
export function useAppRouteMeta(surface: string) {
  useEffect(() => {
    applyAppSurfaceMeta(surface);
  }, [surface]);
}

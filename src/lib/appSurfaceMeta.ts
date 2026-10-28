import { applyMeta, type SurfaceMeta } from "./routeMeta";

/**
 * F3 — uygulama içi yüzeylerin başlık/açıklamaları.
 *
 * Yalnız tembel yüklenen `Explorer` parçasından import edilir; entry paketine
 * girmez (bkz. `routeMeta.ts` başlığı ve `scripts/bundle-budget.mjs`).
 */
export type AppSurface = "explore" | "add" | "profile" | "records" | "community";

export const APP_SURFACE_META: Record<AppSurface, SurfaceMeta> = {
  explore: {
    title: "Keşfet — Atlasia",
    description: "Kategorileri ve çevrendeki izleri gör; bir noktaya dokunup hikâyesini oku, rotana ekle.",
  },
  add: {
    title: "İz bırak — Atlasia",
    description: "Gittiğin yeri haritaya ekle: konum, kısa not ve fotoğrafla kendi keşfini kaydet.",
  },
  profile: {
    title: "Profil — Atlasia",
    description: "Hesabın, dil ve görünüm tercihlerin, gizlilik ve veri ayarların tek yerde.",
  },
  records: {
    title: "Kayıtlarım — Atlasia",
    description:
      "Kaydettiğin yerler, rotaların ve çevrimdışı paketlerin. Hesabına bağlı kayıtlar cihazlar arasında eşitlenir.",
  },
  community: {
    title: "Topluluk — Atlasia",
    description:
      "Diğer gezginlerin paylaştığı rotalar ve izler; kendi keşfini paylaş, beğen ve kaydet.",
  },
};

export function appMetaFor(surface: string | null | undefined): SurfaceMeta | null {
  if (surface && surface in APP_SURFACE_META) return APP_SURFACE_META[surface as AppSurface];
  return null;
}

/** Uygulama yüzeyi etiketlerini yazar; bilinmeyen yüzeyde hiçbir şey yapmaz. */
export function applyAppSurfaceMeta(surface: string | null | undefined): SurfaceMeta | null {
  const meta = appMetaFor(surface);
  if (meta) applyMeta(meta);
  return meta;
}

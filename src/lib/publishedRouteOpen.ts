import type { AtlasRoute, RouteVisibility } from "../types";
import { getPublishedRoute } from "./routeData";

/**
 * Paylaşılan rota bağlantısını (`?route=<id>`) açmanın tek kapısı.
 *
 * #31 sonrası `getPublishedRoute` "yok", "silinmiş" ve "başkasının özel
 * rotası" durumlarında **null** döner; `permission-denied` artık bir hata
 * değildir. Bu yüzden eski `permission-denied` dalı ölü koddur ve buradan
 * kaldırılmıştır. Kullanıcıya görünen metinler değişmedi.
 */
export const ROUTE_OPEN_MESSAGES = {
  missing: "Bu rota bulunamadı veya artık paylaşılmıyor.",
  error: "Rota yüklenemedi. Bağlantıyı ve internetini kontrol et.",
  opened: "Paylaşılan rota açıldı. Kendi kayıtlarına ekleyebilirsin.",
} as const;

export type PublishedRouteLookup = (routeId: string) => Promise<{
  route: AtlasRoute;
  authorUid: string;
  visibility: RouteVisibility;
} | null>;

export type PublishedRouteOutcome =
  | { status: "opened"; route: AtlasRoute; message: string }
  | { status: "missing"; message: string }
  | { status: "error"; message: string };

export async function openPublishedRoute(
  routeId: string,
  lookup: PublishedRouteLookup = getPublishedRoute,
): Promise<PublishedRouteOutcome> {
  try {
    const found = await lookup(routeId);
    if (!found) return { status: "missing", message: ROUTE_OPEN_MESSAGES.missing };
    return { status: "opened", route: found.route, message: ROUTE_OPEN_MESSAGES.opened };
  } catch (failure) {
    // Gerçek hata (ağ, yapılandırma) kullanıcıya söylenir; ayrıntı konsolda kalır.
    console.warn("[Atlasia] Paylaşılan rota açılamadı:", failure);
    return { status: "error", message: ROUTE_OPEN_MESSAGES.error };
  }
}

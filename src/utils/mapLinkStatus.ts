import { GOOGLE_MOBILE_MAX_WAYPOINTS } from "./mapLinks";

export interface RouteProviderAvailability {
  google: boolean;
  yandex: boolean;
  apple: boolean;
  hasRoutePoints: boolean;
  routeCoordinatesValid: boolean;
  hasAppleStop: boolean;
  appleStopValid: boolean;
}

export function googleRouteSplitNotice(linkCount: number, maxWaypoints: number): string | null {
  if (linkCount <= 1) return null;
  const platform = maxWaypoints <= GOOGLE_MOBILE_MAX_WAYPOINTS
    ? "mobil tarayıcı"
    : "masaüstü";
  return `Google'ın ${platform} ara durak sınırı nedeniyle rota, durak sırası korunarak ${linkCount} bağlantıya ayrıldı; bağlantıları sırayla aç.`;
}

export function unavailableRouteProviderMessages(
  availability: RouteProviderAvailability,
): string[] {
  const messages: string[] = [];
  const missingOrInvalidRoute = !availability.hasRoutePoints || !availability.routeCoordinatesValid;

  if (!availability.google) {
    messages.push(missingOrInvalidRoute
      ? "Google Haritalar bağlantısı geçerli rota koordinatı olmadığı için oluşturulamadı."
      : "Google Haritalar bağlantısı güvenli bağlantı sınırları içinde oluşturulamadı.");
  }

  if (!availability.yandex) {
    messages.push(missingOrInvalidRoute
      ? "Yandex Haritalar bağlantısı geçerli rota koordinatı olmadığı için oluşturulamadı."
      : "Yandex Haritalar bağlantısı URL uzunluğu güvenli sınırı aştığı için oluşturulamadı.");
  }

  if (!availability.apple) {
    messages.push(!availability.hasAppleStop
      ? "Apple Haritalar bağlantısı için seçili günde bir durak bulunamadı."
      : availability.appleStopValid
        ? "Apple Haritalar bağlantısı güvenli biçimde oluşturulamadı."
        : "Apple Haritalar bağlantısı ilk durağın koordinatı geçerli olmadığı için oluşturulamadı.");
  }

  return messages;
}

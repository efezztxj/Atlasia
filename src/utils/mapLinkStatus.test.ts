import { describe, expect, it } from "vitest";
import {
  googleRouteSplitNotice,
  unavailableRouteProviderMessages,
  type RouteProviderAvailability,
} from "./mapLinkStatus";

const available: RouteProviderAvailability = {
  google: true,
  yandex: true,
  apple: true,
  hasRoutePoints: true,
  routeCoordinatesValid: true,
  hasAppleStop: true,
  appleStopValid: true,
};

describe("map link status messages", () => {
  it("does not show a split notice for one Google link", () => {
    expect(googleRouteSplitNotice(1, 3)).toBeNull();
  });

  it("describes the actual mobile or desktop waypoint limit", () => {
    expect(googleRouteSplitNotice(2, 3)).toContain("mobil tarayıcı ara durak sınırı");
    expect(googleRouteSplitNotice(3, 9)).toContain("masaüstü ara durak sınırı");
  });

  it("does not report an unavailable provider when all links exist", () => {
    expect(unavailableRouteProviderMessages(available)).toEqual([]);
  });

  it("explains an overlong Yandex route without hiding the other providers", () => {
    expect(unavailableRouteProviderMessages({ ...available, yandex: false })).toEqual([
      "Yandex Haritalar bağlantısı URL uzunluğu güvenli sınırı aştığı için oluşturulamadı.",
    ]);
  });

  it("distinguishes a missing Apple stop from invalid route coordinates", () => {
    expect(unavailableRouteProviderMessages({
      ...available,
      apple: false,
      hasAppleStop: false,
      appleStopValid: false,
    })).toEqual(["Apple Haritalar bağlantısı için seçili günde bir durak bulunamadı."]);

    expect(unavailableRouteProviderMessages({
      ...available,
      google: false,
      yandex: false,
      routeCoordinatesValid: false,
    })).toEqual([
      "Google Haritalar bağlantısı geçerli rota koordinatı olmadığı için oluşturulamadı.",
      "Yandex Haritalar bağlantısı geçerli rota koordinatı olmadığı için oluşturulamadı.",
    ]);
  });
});

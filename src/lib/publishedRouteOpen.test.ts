import { describe, expect, it, vi } from "vitest";
import type { AtlasRoute } from "../types";
import { ROUTE_OPEN_MESSAGES, openPublishedRoute, type PublishedRouteLookup } from "./publishedRouteOpen";

const route: AtlasRoute = {
  id: "route-paylasilan",
  routeTitle: "Kayıtlı yürüyüş",
  routeSummary: "Özet",
  totalDurationHours: 1,
  totalDistanceKm: 3,
  transport: "walking",
  vibe: "Yürüyüş kaydı",
  days: [],
  weatherNote: null,
  alternatives: [],
  createdAt: 1,
};

describe("openPublishedRoute · kullanıcı mesajları (#31 sonrası ölü dal kaldırıldı)", () => {
  it("rota bulunursa rotayı ve açılış mesajını döner", async () => {
    const lookup = vi.fn<PublishedRouteLookup>(async () => ({
      route,
      authorUid: "u1",
      visibility: "unlisted" as const,
    }));

    const outcome = await openPublishedRoute("route-paylasilan", lookup);

    expect(lookup).toHaveBeenCalledWith("route-paylasilan");
    expect(outcome).toEqual({
      status: "opened",
      route,
      message: "Paylaşılan rota açıldı. Kendi kayıtlarına ekleyebilirsin.",
    });
  });

  it("rota yoksa/silinmişse 'bulunamadı' mesajı verir (izin reddi artık hata değil)", async () => {
    // #31: kurallar okunamayan rotada permission-denied fırlatır, routeData bunu null'a çevirir.
    const outcome = await openPublishedRoute("yok", async () => null);
    expect(outcome).toEqual({
      status: "missing",
      message: "Bu rota bulunamadı veya artık paylaşılmıyor.",
    });
    expect(JSON.stringify(outcome)).not.toContain("özel");
  });

  it("gerçek hatada ağ mesajını verir, ham hata metnini kullanıcıya sızdırmaz", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failure = Object.assign(new Error("service unavailable"), { code: "unavailable" });

    const outcome = await openPublishedRoute("route-x", async () => {
      throw failure;
    });

    expect(outcome).toEqual({
      status: "error",
      message: "Rota yüklenemedi. Bağlantıyı ve internetini kontrol et.",
    });
    expect(warn).toHaveBeenCalledWith("[Atlasia] Paylaşılan rota açılamadı:", failure);
    warn.mockRestore();
  });

  it("permission-denied artık özel-rota mesajı üretmez (eski ölü dal kaldırıldı)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // #31 öncesi App.tsx bu hatayı "Bu rota özel. Yalnız sahibi açabilir." diye gösteriyordu.
    const outcome = await openPublishedRoute("route-gizli", async () => {
      throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
    });

    expect(outcome.status).toBe("error");
    expect(outcome.message).toBe("Rota yüklenemedi. Bağlantıyı ve internetini kontrol et.");
    expect(outcome.message).not.toContain("özel");
    warn.mockRestore();
  });

  it("mesaj sabitleri değişmez: kullanıcıya görünen metin aynı kalır", () => {
    expect(ROUTE_OPEN_MESSAGES).toEqual({
      missing: "Bu rota bulunamadı veya artık paylaşılmıyor.",
      error: "Rota yüklenemedi. Bağlantıyı ve internetini kontrol et.",
      opened: "Paylaşılan rota açıldı. Kendi kayıtlarına ekleyebilirsin.",
    });
    // Ölü dalın metni ("Bu rota özel. Yalnız sahibi açabilir.") artık hiçbir yerde yok.
    expect(Object.values(ROUTE_OPEN_MESSAGES).join(" ")).not.toContain("Yalnız sahibi açabilir");
  });
});

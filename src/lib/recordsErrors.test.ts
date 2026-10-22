import { describe, expect, it } from "vitest";
import {
  dedupeRecordsErrors,
  errorsForTab,
  isSharedRecordsError,
  primaryErrorForTab,
  tabForSavedSource,
  tabForWriteAction,
  type RecordsError,
} from "./recordsErrors";

function error(partial: Partial<RecordsError> & { tab: RecordsError["tab"] }): RecordsError {
  return { scope: "read", message: "varsayılan", ...partial };
}

describe("Kayıtlarım sekme bazlı hata ayrıştırma", () => {
  it("bir sekmenin okuma hatası diğer sekmelere SIZMAZ", () => {
    // Kanıtlanan sorun: savedRoutes dinleyicisindeki tek bir permission-denied
    // dört sekmenin hepsinde aynı metni gösteriyordu.
    const routesFailure = error({
      tab: "routes",
      scope: "read",
      message: "İzin verilmedi: kayıtlı rotalar dinlenirken.",
      code: "permission-denied",
      genuine: true,
    });

    expect(errorsForTab("routes", [routesFailure])).toHaveLength(1);
    expect(errorsForTab("places", [routesFailure])).toHaveLength(0);
    expect(errorsForTab("discover", [routesFailure])).toHaveLength(0);
    expect(errorsForTab("tracks", [routesFailure])).toHaveLength(0);
  });

  it("shared kapsamlı hata (oturum kopması) her sekmede görünür", () => {
    const sessionFailure = error({
      tab: "routes",
      scope: "shared",
      message: "Oturum doğrulanamadı. Yeniden giriş yapman gerekebilir.",
      code: "unauthenticated",
      genuine: true,
    });
    for (const tab of ["places", "routes", "discover", "tracks"] as const) {
      expect(errorsForTab(tab, [sessionFailure])).toHaveLength(1);
    }
  });

  it("genuine=false olan gürültü kullanıcıya gösterilmez ama gerçek izin hatası gizlenmez", () => {
    const noise = error({ tab: "routes", message: "yoklama yan etkisi", genuine: false });
    const real = error({ tab: "routes", message: "gerçek izin hatası", genuine: true });
    expect(errorsForTab("routes", [noise])).toHaveLength(0);
    expect(errorsForTab("routes", [noise, real])).toHaveLength(1);
    expect(primaryErrorForTab("routes", [noise, real])).toBe("gerçek izin hatası");
  });

  it("aynı sekmede yazma hatası okuma hatasından önce gelir", () => {
    const read = error({ tab: "routes", scope: "read", message: "dinleyici hatası" });
    const write = error({ tab: "routes", scope: "write", message: "kaydetme hatası" });
    expect(errorsForTab("routes", [read, write]).map((item) => item.message))
      .toEqual(["kaydetme hatası", "dinleyici hatası"]);
    expect(primaryErrorForTab("routes", [read, write])).toBe("kaydetme hatası");
  });

  it("hata yoksa null döner", () => {
    expect(primaryErrorForTab("places", [])).toBeNull();
    expect(errorsForTab("tracks", [])).toEqual([]);
  });

  it("kayıt kaynağı doğru sekmeye eşlenir", () => {
    expect(tabForSavedSource("saved-places")).toBe("places");
    expect(tabForSavedSource("saved-routes")).toBe("routes");
    // Tek bir rota detayının okunamaması "Kaydettiklerim" sekmesine aittir.
    expect(tabForSavedSource("saved-routes/detail")).toBe("routes");
  });

  it("yazma eylemi aktif sekmeyi bildirdiğinde oraya yazılır", () => {
    // saveRoute hem "Kaydettiklerim" hem "Rota keşfi" sekmesinden tetiklenebilir.
    expect(tabForWriteAction("saveRoute", "discover")).toBe("discover");
    expect(tabForWriteAction("saveRoute", "routes")).toBe("routes");
    expect(tabForWriteAction("saveRoute")).toBe("routes");
    expect(tabForWriteAction("togglePlace", "discover")).toBe("places");
    expect(tabForWriteAction("deleteTrack", "places")).toBe("tracks");
    expect(tabForWriteAction("removeRoute", "discover")).toBe("discover");
  });

  it("oturum/bağlantı kodları shared sayılır, izin hatası sayılmaz", () => {
    expect(isSharedRecordsError("unauthenticated", "İzin verilmedi.")).toBe(true);
    expect(isSharedRecordsError("unavailable", "Bağlantı sorunu.")).toBe(true);
    expect(isSharedRecordsError("permission-denied", "İzin verilmedi: kayıtlı rotalar dinlenirken.")).toBe(false);
    expect(isSharedRecordsError(undefined, "Oturum doğrulanamadı.")).toBe(true);
  });

  it("aynı sekme+kapsam+mesaj üçlüsü yalnız bir kez kalır", () => {
    const duplicate = error({ tab: "routes", scope: "write", message: "aynı" });
    expect(dedupeRecordsErrors([duplicate, duplicate, duplicate])).toHaveLength(1);
    expect(dedupeRecordsErrors([
      error({ tab: "routes", scope: "write", message: "bir" }),
      error({ tab: "routes", scope: "read", message: "bir" }),
    ])).toHaveLength(2);
  });
});

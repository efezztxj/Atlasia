import { describe, expect, it } from "vitest";
import type { AtlasRoute } from "../types";
import {
  PUBLIC_ROUTE_PAGE_SIZE,
  durationMatchesFilter,
  filterPublicRoutes,
  sortPublicRoutes,
  type PublicRouteRecord,
} from "./routeData";

const record = (
  id: string,
  fields: Partial<AtlasRoute> & { saveCount?: number },
): PublicRouteRecord => ({
  route: {
    id,
    routeTitle: `Rota ${id}`,
    routeSummary: "",
    totalDurationHours: 3,
    totalDistanceKm: 5,
    transport: "walking",
    vibe: "sakin",
    days: [],
    weatherNote: null,
    alternatives: [],
    createdAt: 1,
    ...fields,
  },
  authorUid: "yazar",
  saveCount: fields.saveCount ?? 0,
});

const ids = (records: PublicRouteRecord[]) => records.map((item) => item.route.id);

describe("keşif sıralaması (sortPublicRoutes)", () => {
  const records = [
    record("eski-cok", { saveCount: 9, createdAt: 100, totalDurationHours: 10 }),
    record("yeni-az", { saveCount: 2, createdAt: 300, totalDurationHours: 2 }),
    record("orta", { saveCount: 9, createdAt: 200, totalDurationHours: 6 }),
  ];

  it("varsayılan 'saved': kaydetme sayısı, eşitlikte en yeni önce", () => {
    expect(ids(sortPublicRoutes(records, "saved"))).toEqual(["orta", "eski-cok", "yeni-az"]);
  });

  it("'newest' oluşturma zamanına göre azalan sıralar", () => {
    expect(ids(sortPublicRoutes(records, "newest"))).toEqual(["yeni-az", "orta", "eski-cok"]);
  });

  it("'shortest' ve 'longest' toplam süreye göre sıralar", () => {
    expect(ids(sortPublicRoutes(records, "shortest"))).toEqual(["yeni-az", "orta", "eski-cok"]);
    expect(ids(sortPublicRoutes(records, "longest"))).toEqual(["eski-cok", "orta", "yeni-az"]);
  });

  it("girdi dizisini değiştirmez", () => {
    const before = ids(records);
    sortPublicRoutes(records, "newest");
    expect(ids(records)).toEqual(before);
  });
});

describe("keşif filtresi (filterPublicRoutes + durationMatchesFilter)", () => {
  const records = [
    record("a", { region: "İzmir", vibe: "sakin", totalDurationHours: 3 }),
    record("b", { region: "Muğla", vibe: "macera", totalDurationHours: 8 }),
    record("c", { region: "İzmir", vibe: "macera", totalDurationHours: 20 }),
    record("d", { totalDurationHours: 30 }),
  ];

  it("süre eşikleri: ≤4 kısa, 4–12 gün, >12 çok gün", () => {
    expect(durationMatchesFilter(4, "short")).toBe(true);
    expect(durationMatchesFilter(4.1, "short")).toBe(false);
    expect(durationMatchesFilter(12, "day")).toBe(true);
    expect(durationMatchesFilter(12.5, "day")).toBe(false);
    expect(durationMatchesFilter(13, "multi")).toBe(true);
    expect(durationMatchesFilter(99, "all")).toBe(true);
  });

  it("bölge + süre + tema birlikte uygulanır, sıra korunur", () => {
    expect(ids(filterPublicRoutes(records, { region: "İzmir", duration: "all", theme: "all" }))).toEqual(["a", "c"]);
    expect(ids(filterPublicRoutes(records, { region: "all", duration: "day", theme: "all" }))).toEqual(["b"]);
    expect(ids(filterPublicRoutes(records, { region: "all", duration: "all", theme: "macera" }))).toEqual(["b", "c"]);
    expect(ids(filterPublicRoutes(records, { region: "İzmir", duration: "multi", theme: "macera" }))).toEqual(["c"]);
    expect(filterPublicRoutes(records, { region: "Ankara", duration: "all", theme: "all" })).toEqual([]);
  });

  it("keşif sayfası sınırlıdır (40) ve sabitten okunur", () => {
    // Sınırın kendisi sözleşmedir: sorgu limitsiz büyüyemez (ücretsiz kota).
    expect(PUBLIC_ROUTE_PAGE_SIZE).toBe(40);
  });
});

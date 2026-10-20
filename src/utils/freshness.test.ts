import { describe, expect, it } from "vitest";
import type { Place } from "../types";
import {
  VERIFICATION_STATUSES,
  applyFreshness,
  canVerifyAgain,
  freshnessBand,
  groupVerificationsByPlace,
  summarizeFreshness,
  validateVerificationInput,
  type PlaceVerification,
} from "./freshness";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

function verification(overrides: Partial<PlaceVerification> = {}): PlaceVerification {
  return {
    id: "vr-1",
    placeId: "place-1",
    uid: "member-a",
    status: "still_open",
    createdAt: NOW - 5 * DAY,
    ...overrides,
  };
}

function place(id: string): Place {
  return {
    id,
    title: `Yer ${id}`,
    region: "İzmir",
    category: "history",
    lat: 38.42,
    lng: 27.14,
    note: "Yeterince uzun bir keşif notu.",
    author: "Atlasia",
    kind: "guide",
  };
}

describe("tazelik döngüsü", () => {
  it("doğrulama durumları kapalı listedir ve yük sınırlarını doğrular", () => {
    expect(VERIFICATION_STATUSES).toEqual(["still_open", "fee_changed", "road_closed", "free_entry", "closed"]);
    expect(validateVerificationInput({ placeId: "place-1", status: "still_open" })).toBeNull();
    expect(validateVerificationInput({ placeId: " ", status: "still_open" })).toBe("verification/place-invalid");
    expect(validateVerificationInput({ placeId: "place-1", status: "harika" })).toBe("verification/status-invalid");
    expect(validateVerificationInput({ placeId: "place-1", status: "still_open", note: "x".repeat(281) })).toBe("verification/note-too-long");
  });

  it("30 gün taze, 90 gün eskime, sonrası bayat bandına düşer", () => {
    expect(freshnessBand(null, NOW)).toBe("unknown");
    expect(freshnessBand(NOW - 30 * DAY, NOW)).toBe("fresh");
    expect(freshnessBand(NOW - 31 * DAY, NOW)).toBe("aging");
    expect(freshnessBand(NOW - 90 * DAY, NOW)).toBe("aging");
    expect(freshnessBand(NOW - 91 * DAY, NOW)).toBe("stale");
  });

  it("doğrulanmamış yer için dürüst özet üretir", () => {
    const summary = summarizeFreshness("place-1", [], NOW);
    expect(summary).toMatchObject({ latestAt: null, recentCount: 0, band: "unknown", score: 1, distinctUids: 0, isSingleContributor: false });
    expect(summary.label).toContain("Henüz doğrulanmadı");
    expect(summary.disclaimer).toContain("Resmî");
  });

  it("son doğrulama tarihini ve son 90 gündeki kişi sayısını gösterir", () => {
    const summary = summarizeFreshness("place-1", [
      verification({ id: "a", uid: "member-a", createdAt: NOW - 5 * DAY }),
      verification({ id: "b", uid: "member-b", createdAt: NOW - 40 * DAY }),
      verification({ id: "c", uid: "member-c", createdAt: NOW - 120 * DAY }),
    ], NOW);

    expect(summary.latestAt).toBe(NOW - 5 * DAY);
    expect(summary.recentCount).toBe(2);
    expect(summary.totalCount).toBe(3);
    expect(summary.distinctUids).toBe(2);
    expect(summary.band).toBe("fresh");
    expect(summary.score).toBeCloseTo(1.35);
    expect(summary.label).toContain("2 kişi son 3 ayda");
    expect(summary.label).toContain("5 gün önce");
    expect(summary.label).toContain("Hâlâ açık");
    expect(summary.label).toContain("topluluk bildirimi");
    expect(summary.disclaimer).toContain("Topluluk doğrulaması");
    expect(summary.isSingleContributor).toBe(false);
    expect(summary.sourceDetail).toContain("2 farklı gezgin");
  });

  it("eski bilgiyi rota motoru için geriye düşürür", () => {
    const stale = summarizeFreshness("place-1", [verification({ createdAt: NOW - 100 * DAY })], NOW);
    expect(stale.band).toBe("stale");
    expect(stale.score).toBeLessThan(1);
    expect(stale.label).toContain("3 ay önce");
  });

  it("yer listesine tazelik eklerken orijinali değiştirmez", () => {
    const places = [place("place-1"), place("place-2")];
    const [fresh] = applyFreshness(places, [verification()], NOW);
    expect(fresh.freshness?.band).toBe("fresh");
    expect(places[0].freshness).toBeUndefined();
    expect(applyFreshness(places, [verification()], NOW)[1]).toBe(places[1]);
  });

  it("doğrulamaları yer kimliğine göre gruplar", () => {
    const grouped = groupVerificationsByPlace([
      verification({ id: "a", placeId: "place-1" }),
      verification({ id: "b", placeId: "place-2" }),
      verification({ id: "c", placeId: "place-1" }),
    ]);
    expect(grouped.get("place-1")?.map((item) => item.id)).toEqual(["a", "c"]);
    expect(grouped.get("place-2")).toHaveLength(1);
  });

  it("aynı kullanıcının gün içinde tekrar doğrulamasını engeller", () => {
    const items = [verification({ uid: "member-a", createdAt: NOW - 2 * 60 * 60 * 1000 })];
    expect(canVerifyAgain(items[0].createdAt, "member-a", items, NOW)).toBe(false);
    expect(canVerifyAgain(items[0].createdAt, "member-b", items, NOW)).toBe(true);
    expect(canVerifyAgain(null, "member-a", [], NOW)).toBe(true);
  });

  it("tek kisinin katkisi resmi bilgiyi belirlemez ve skor sinirlanir", () => {
    const single = summarizeFreshness("place-1", [verification({ uid: "solo", createdAt: NOW - 2 * DAY, status: "fee_changed" })], NOW);
    expect(single.distinctUids).toBe(1);
    expect(single.isSingleContributor).toBe(true);
    expect(single.disclaimer).toContain("tek kişinin katkısı");
    expect(single.label).toContain("topluluk bildirimi");
    expect(single.label).not.toContain("resmî");
    expect(single.score).toBeCloseTo(1.15);
    expect(single.sourceDetail).toContain("1 gezgin");
    const multi = summarizeFreshness("place-1", [
      verification({ uid: "a", createdAt: NOW - 2 * DAY }),
      verification({ uid: "b", createdAt: NOW - 3 * DAY }),
    ], NOW);
    expect(multi.isSingleContributor).toBe(false);
    expect(multi.score).toBeCloseTo(1.35);
  });
});

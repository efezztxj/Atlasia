import { describe, expect, it } from "vitest";
import { isPermissionDenied, withoutUndefined } from "./firestoreValue";

class Sentinel { constructor(public readonly kind: string) {} }

describe("withoutUndefined", () => {
  it("iç içe nesne ve dizilerden undefined alan/öğeleri ayıklar, null ve falsy değerleri korur", () => {
    const input = {
      title: "Şanlıurfa · Göbeklitepe",
      image: undefined,
      zero: 0,
      empty: "",
      flag: false,
      nothing: null,
      origin: { lat: 37.22, lng: undefined },
      days: [{ stops: [undefined, { name: "İç Kale", imageUrl: null, tip: undefined }] }],
    };

    expect(withoutUndefined(input)).toEqual({
      title: "Şanlıurfa · Göbeklitepe",
      zero: 0,
      empty: "",
      flag: false,
      nothing: null,
      origin: { lat: 37.22 },
      days: [{ stops: [{ name: "İç Kale", imageUrl: null }] }],
    });
  });

  it("girdiyi değiştirmez", () => {
    const input = { a: undefined, b: [1, undefined] };
    withoutUndefined(input);
    expect("a" in input).toBe(true);
    expect(input.b).toHaveLength(2);
  });

  it("sınıf örneklerine (serverTimestamp gibi sentinel'ler) dokunmaz", () => {
    const sentinel = new Sentinel("serverTimestamp");
    const result = withoutUndefined({ createdAt: sentinel, gone: undefined });
    expect(result.createdAt).toBe(sentinel);
    expect("gone" in result).toBe(false);
  });

  it("ilkel değerleri aynen döndürür", () => {
    expect(withoutUndefined("metin")).toBe("metin");
    expect(withoutUndefined(42)).toBe(42);
    expect(withoutUndefined(null)).toBeNull();
  });
});

describe("isPermissionDenied", () => {
  it("yalnız permission-denied kodunu tanır", () => {
    expect(isPermissionDenied({ code: "permission-denied" })).toBe(true);
    expect(isPermissionDenied(Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" }))).toBe(true);
    expect(isPermissionDenied({ code: "unavailable" })).toBe(false);
    expect(isPermissionDenied(new Error("permission-denied"))).toBe(false);
    expect(isPermissionDenied(null)).toBe(false);
    expect(isPermissionDenied("permission-denied")).toBe(false);
  });
});

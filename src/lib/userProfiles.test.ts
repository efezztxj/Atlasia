import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ db: {} }));

import { DISPLAY_NAME_MAX, USER_PROFILES_LIMIT, normalizeUserProfile, profilePrefixes, searchProfilesLocal, validateDisplayName, type UserProfile } from "./userProfiles";

/** Denetim 2026-10-22: P16 sonrası eklenen modülün saf kısmı için karakterizasyon. */
describe("validateDisplayName", () => {
  it("kırpılmış uzunluğu 2–40 aralığında denetler", () => {
    expect(validateDisplayName(" A ")).toBe("profile/name-too-short");
    expect(validateDisplayName("Ada")).toBeNull();
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX))).toBeNull();
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX + 1))).toBe("profile/name-too-long");
  });
});

describe("normalizeUserProfile", () => {
  it("eksik alanlara varsayılan; geçersiz foto alanı düşer", () => {
    expect(normalizeUserProfile("u1", { photoURL: 5, createdAt: { toMillis: () => 4 } })).toEqual({ uid: "u1", displayName: "Gezgin", displayNameLower: "gezgin", photoURL: undefined, createdAt: 4, updatedAt: 0 });
  });
});

describe("displayNameLower (arama anahtarı)", () => {
  it("Türkçe küçük harfe indirger; eski belgede alanı displayName'den türetir", () => {
    expect(normalizeUserProfile("u1", { displayName: "İrem" }).displayNameLower).toBe("irem");
    expect(normalizeUserProfile("u2", { displayName: "IŞIK" }).displayNameLower).toBe("ışık");
    expect(normalizeUserProfile("u3", { displayName: "İrem", displayNameLower: "irem" }).displayNameLower).toBe("irem");
  });

  it("arama öneki tek ve küçük harfli; büyük harf hack'i yok", () => {
    expect(profilePrefixes("İrem")).toEqual(["irem"]);
    expect(profilePrefixes("IŞIK")).toEqual(["ışık"]);
    expect(profilePrefixes("  ")).toEqual([]);
  });
});

describe("searchProfilesLocal", () => {
  const profile = (displayName: string, i = 0): UserProfile => ({ uid: `u${i}`, displayName, displayNameLower: displayName.toLocaleLowerCase("tr"), createdAt: 0, updatedAt: 0 });

  it("Türkçe büyük/küçük harf duyarsız arar (İ/ı)", () => {
    const list = [profile("İlkay"), profile("Işık", 1), profile("Can", 2)];
    expect(searchProfilesLocal(list, "ilk").map((p) => p.displayName)).toEqual(["İlkay"]);
    expect(searchProfilesLocal(list, "IŞI").map((p) => p.displayName)).toEqual(["Işık"]);
  });

  it("boş sorgu sonuç döndürmez; sonuç üst sınırla kesilir", () => {
    const many = Array.from({ length: USER_PROFILES_LIMIT + 5 }, (_, i) => profile(`Gezgin ${i}`, i));
    expect(searchProfilesLocal(many, "  ")).toEqual([]);
    expect(searchProfilesLocal(many, "gezgin")).toHaveLength(USER_PROFILES_LIMIT);
  });
});

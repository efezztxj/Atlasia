import { describe, expect, it } from "vitest";
import {
  PROFILE_SEARCH_LIMIT,
  isSearchableProfile,
  isSearchableQuery,
  legacyDisplayNamePrefixes,
  normalizeProfileQuery,
  profileQueryPrefixes,
  profileSearchKey,
  rankProfiles,
  turkishLower,
} from "./profileSearch";
import type { UserProfile } from "./userProfiles";

const profile = (uid: string, displayName: string): UserProfile => ({
  uid,
  displayName,
  displayNameLower: turkishLower(displayName),
  createdAt: 0,
  updatedAt: 0,
});

describe("profil arama — sorgu hazırlığı", () => {
  it("boşlukları kırpar, çoklu boşluğu tekile indirir", () => {
    expect(normalizeProfileQuery("  ada   nur ")).toBe("ada nur");
  });

  it("2 harften kısa metin aranmaz (kod noktasıyla ölçülür)", () => {
    expect(isSearchableQuery(" a ")).toBe(false);
    expect(isSearchableQuery("ad")).toBe(true);
    expect(isSearchableQuery("🧭")).toBe(false);
  });

  it("Türkçe küçük harf: İ→i ve I→ı, dilsiz toLowerCase tuzağı yok", () => {
    expect(turkishLower("İrem")).toBe("irem");
    expect(turkishLower("IŞIK")).toBe("ışık");
    expect(turkishLower("İ")).toHaveLength(1);
    expect(turkishLower("İ")).not.toContain("\u0307");
  });

  it("önek tek ve Türkçe küçük harfli; kısa sorgu önek üretmez", () => {
    expect(profileQueryPrefixes("İrem")).toEqual(["irem"]);
    expect(profileQueryPrefixes("IŞIK")).toEqual(["ışık"]);
    expect(profileQueryPrefixes(" i ")).toEqual([]);
    expect(profileQueryPrefixes("  ")).toEqual([]);
  });

  it("eski belgeler için displayName önekleri: yazıldığı gibi + Türkçe baş harf", () => {
    expect(legacyDisplayNamePrefixes("irem")).toEqual(["irem", "İrem"]);
    expect(legacyDisplayNamePrefixes("ılgaz")).toEqual(["ılgaz", "Ilgaz"]);
    expect(legacyDisplayNamePrefixes("Ada")).toEqual(["Ada"]);
    expect(legacyDisplayNamePrefixes("a")).toEqual([]);
  });
});

describe("profil arama — adsız kayıtlar", () => {
  it("isSearchableProfile adsız ve yer tutucu adı eler", () => {
    expect(isSearchableProfile({ displayName: "Ada" })).toBe(true);
    expect(isSearchableProfile({ displayName: "Gezgin" })).toBe(false);
    expect(isSearchableProfile({ displayName: "GEZGİN" })).toBe(false);
    expect(isSearchableProfile({ displayName: " a " })).toBe(false);
    expect(isSearchableProfile({})).toBe(false);
    // "Gezgin" ile BAŞLAYAN gerçek ad elenmez; yalnız birebir yer tutucu elenir.
    expect(isSearchableProfile({ displayName: "Gezgin 2000" })).toBe(true);
  });

  it("arama anahtarı: alan varsa o, yoksa displayName'den türetilir", () => {
    expect(profileSearchKey({ displayName: "İrem", displayNameLower: "irem" })).toBe("irem");
    expect(profileSearchKey({ displayName: "İrem" })).toBe("irem");
    expect(profileSearchKey({ displayName: "IŞIK" })).toBe("ışık");
    expect(profileSearchKey({})).toBe("");
  });
});

describe("profil arama — sıralama (önek only)", () => {
  const all = [
    profile("u1", "Kaan Ada"),
    profile("u2", "Ada Nur"),
    profile("u3", "Mehmet"),
    profile("u4", "ADALI"),
    profile("me", "Ada"),
  ];

  it("yalnız önek ile eşleşir: kelime İÇİ eşleşme sonuç vermez, kendini gizler", () => {
    // "Kaan Ada" içinde "ada" geçer ama önek değildir → gelmez.
    expect(rankProfiles(all, "ada", { excludeUid: "me" }).map((item) => item.uid)).toEqual(["u2", "u4"]);
    expect(rankProfiles(all, "da n")).toEqual([]);
  });

  it("Türkçe küçültme ile eşleşir (İ → i, I → ı)", () => {
    const list = [profile("u9", "İrem Atlas"), profile("u8", "Işık Demir")];
    expect(rankProfiles(list, "İREM").map((item) => item.uid)).toEqual(["u9"]);
    expect(rankProfiles(list, "irem").map((item) => item.uid)).toEqual(["u9"]);
    expect(rankProfiles(list, "ışı").map((item) => item.uid)).toEqual(["u8"]);
    // "isi" (noktasız i yerine i) Türkçe'de farklı harftir; eşleşmez.
    expect(rankProfiles(list, "isi")).toEqual([]);
  });

  it("tekrarlanan uid'leri bir kez döndürür; adsızlar görünmez; limit aşılmaz", () => {
    const dup = [profile("u2", "Ada Nur"), profile("u2", "Ada Nur"), profile("u5", "Gezgin")];
    expect(rankProfiles(dup, "ada").map((item) => item.uid)).toEqual(["u2"]);
    expect(rankProfiles(dup, "gezgin")).toEqual([]);

    const many = Array.from({ length: PROFILE_SEARCH_LIMIT + 5 }, (_, i) => profile(`u${i}`, `Ada ${i}`));
    expect(rankProfiles(many, "ada")).toHaveLength(PROFILE_SEARCH_LIMIT);
  });

  it("eşleşme yoksa ve sorgu kısaysa boş dizi döner", () => {
    expect(rankProfiles(all, "zzz")).toEqual([]);
    expect(rankProfiles(all, "a")).toEqual([]);
    expect(rankProfiles(all, "  ")).toEqual([]);
  });
});

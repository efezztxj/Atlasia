import { describe, expect, it } from "vitest";
import {
  PROFILE_SEARCH_LIMIT,
  isSearchableQuery,
  normalizeProfileQuery,
  profileInitials,
  profileQueryPrefixes,
  isSearchableProfile,
  pushRecentSearch,
  rankProfiles,
  readRecentSearches,
  recentSearchStorageKey,
  writeRecentSearches,
  type RecentProfileSearch,
} from "./profileSearch";
import type { UserProfile } from "./userProfiles";

const profile = (uid: string, displayName: string, photoURL?: string): UserProfile => ({
  uid,
  displayName,
  ...(photoURL ? { photoURL } : {}),
  createdAt: 0,
  updatedAt: 0,
});

describe("profil arama — sorgu hazırlığı", () => {
  it("boşlukları kırpar, çoklu boşluğu tekile indirir", () => {
    expect(normalizeProfileQuery("  ada   nur ")).toBe("ada nur");
  });

  it("2 harften kısa metin aranmaz", () => {
    expect(isSearchableQuery(" a ")).toBe(false);
    expect(isSearchableQuery("ad")).toBe(true);
    // Tek karakterlik emoji tek harf sayılır: uzunluk kod noktasıyla ölçülür.
    expect(isSearchableQuery("🧭")).toBe(false);
  });

  it("ilk harfin yazıldığı, büyük ve küçük hâlini tekilleştirerek dener", () => {
    expect(profileQueryPrefixes("ada")).toEqual(["a", "A"]);
    expect(profileQueryPrefixes("Ada")).toEqual(["A", "a"]);
    // Türkçe: "ı" ve "I" farklı harflerdir, ikisi de ayrı sorgu olur.
    expect(profileQueryPrefixes("ılgaz")).toEqual(["ı", "I"]);
    expect(profileQueryPrefixes("a")).toEqual([]);
  });

  it("avatar baş harflerini Türkçe büyütmeyle üretir", () => {
    expect(profileInitials("ada nur yılmaz")).toBe("AY");
    expect(profileInitials("  irem ")).toBe("İ");
    expect(profileInitials("")).toBe("?");
  });
});

describe("profil arama — adsız kayıtlar", () => {
  it("isSearchableProfile adsız ve yer tutucu adı eler", () => {
    expect(isSearchableProfile({ displayName: "Ada" })).toBe(true);
    expect(isSearchableProfile({ displayName: "Gezgin" })).toBe(false);
    expect(isSearchableProfile({ displayName: " a " })).toBe(false);
    expect(isSearchableProfile({})).toBe(false);
  });
});

describe("profil arama — sıralama", () => {
  const all = [
    profile("u1", "Kaan Ada"),
    profile("u2", "Ada Nur"),
    profile("u3", "Mehmet"),
    profile("u4", "ADALI"),
    profile("me", "Ada"),
  ];

  it("ada ile başlayanlar önce, içinde geçenler sonra; kendini gizler", () => {
    // "ada" ile başlayanlar kendi aralarında Türkçe alfabeye göre sıralanır ("Ada Nur" < "ADALI").
    expect(rankProfiles(all, "ada", { excludeUid: "me" }).map((item) => item.uid)).toEqual(["u2", "u4", "u1"]);
  });

  it("Türkçe küçültme ile eşleşir (İ → i)", () => {
    const list = [profile("u9", "İrem Atlas")];
    expect(rankProfiles(list, "İREM")).toHaveLength(1);
    expect(rankProfiles(list, "irem")).toHaveLength(1);
  });

  it("tekrarlanan uid'leri bir kez döndürür", () => {
    const result = rankProfiles([profile("u1", "Ada Nur"), profile("u1", "Ada Nur")], "ada");
    expect(result.map((item) => item.uid)).toEqual(["u1"]);
  });

  it("sonuç sayısı limiti aşmaz", () => {
    const many = Array.from({ length: 30 }, (_, i) => profile(`x${i}`, `Ada ${String(i).padStart(2, "0")}`));
    expect(rankProfiles(many, "ada")).toHaveLength(PROFILE_SEARCH_LIMIT);
  });

  it("adsız/yer tutucu adlı profiller (anonim görünen kayıtlar) sonuçta görünmez", () => {
    const list = [profile("u1", "Gezgin"), profile("u2", " gezgin "), profile("u3", ""), profile("u4", "Gezgin Ada")];
    // Yalnız "Gezgin" adlı kayıtlar elenir; "Gezgin Ada" gerçek bir isimdir ve kalır.
    expect(rankProfiles(list, "gezgin").map((item) => item.uid)).toEqual(["u4"]);
    expect(rankProfiles(list, "gez").map((item) => item.uid)).toEqual(["u4"]);
  });

  it("eşleşme yoksa boş dizi döner", () => {
    expect(rankProfiles(all, "zzz")).toEqual([]);
    expect(rankProfiles(all, "")).toEqual([]);
  });
});

describe("son aramalar", () => {
  const memoryStorage = () => {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    };
  };

  it("aynı kişi tekrar arandığında başa taşınır, liste 5'te kalır", () => {
    let list: RecentProfileSearch[] = [];
    for (const [uid, name] of [["u1", "Ada"], ["u2", "Ece"], ["u3", "Kaan"], ["u4", "Nil"], ["u5", "Umut"], ["u6", "Zeynep"]]) {
      list = pushRecentSearch(list, { uid, displayName: name }, 1);
    }
    expect(list.map((item) => item.uid)).toEqual(["u6", "u5", "u4", "u3", "u2"]);
    list = pushRecentSearch(list, { uid: "u4", displayName: "Nil" }, 2);
    expect(list.map((item) => item.uid)).toEqual(["u4", "u6", "u5", "u3", "u2"]);
  });

  it("boş kimlik/ad ile liste bozulmaz", () => {
    const list = pushRecentSearch([], { uid: "", displayName: "Ada" });
    expect(list).toEqual([]);
  });

  it("depoya yazar, bozuk kaydı sessizce yok sayar, uid başına ayrı tutar", () => {
    const storage = memoryStorage();
    writeRecentSearches(storage, "me", [{ uid: "u1", displayName: "Ada", at: 1 }]);
    expect(readRecentSearches(storage, "me")).toEqual([{ uid: "u1", displayName: "Ada", at: 1 }]);
    expect(readRecentSearches(storage, "baska")).toEqual([]);
    expect(recentSearchStorageKey(" me ")).toBe("atlasia:profil-arama:me");

    storage.setItem(recentSearchStorageKey("me"), "{bozuk");
    expect(readRecentSearches(storage, "me")).toEqual([]);

    writeRecentSearches(storage, "me", []);
    expect(storage.getItem(recentSearchStorageKey("me"))).toBeNull();
  });
});

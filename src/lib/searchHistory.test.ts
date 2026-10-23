// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
  recentSearchesKey,
  RECENT_SEARCHES_LIMIT,
} from "./searchHistory";

beforeEach(() => {
  window.localStorage.clear();
  clearRecentSearches("me");
  clearRecentSearches("other");
});

describe("son aramalar", () => {
  it("en yeni başta, tekrar eden arama tekilleşir", () => {
    pushRecentSearch("me", "efe");
    pushRecentSearch("me", "irem");
    const list = pushRecentSearch("me", "EFE");
    expect(list).toEqual(["EFE", "irem"]);
  });

  it("Türkçe harf farkı aynı arama sayılır (İ/ı)", () => {
    pushRecentSearch("me", "İrem");
    const list = pushRecentSearch("me", "irem");
    expect(list).toHaveLength(1);
  });

  it("en fazla 5 kayıt tutar, en eski düşer", () => {
    for (let i = 1; i <= RECENT_SEARCHES_LIMIT + 2; i += 1) pushRecentSearch("me", `kişi ${i}`);
    const list = readRecentSearches("me");
    expect(list).toHaveLength(RECENT_SEARCHES_LIMIT);
    expect(list[0]).toBe("kişi 7");
    expect(list).not.toContain("kişi 1");
  });

  it("2 harften kısa aramalar saklanmaz", () => {
    pushRecentSearch("me", "e");
    pushRecentSearch("me", "   ");
    expect(readRecentSearches("me")).toEqual([]);
  });

  it("hesaplar birbirinin aramasını görmez (izolasyon)", () => {
    pushRecentSearch("me", "efe");
    expect(readRecentSearches("other")).toEqual([]);
    expect(recentSearchesKey("me")).not.toBe(recentSearchesKey("other"));
  });

  it("bozuk kayıt çökmez, boş liste döner", () => {
    window.localStorage.setItem(recentSearchesKey("me"), "{bozuk");
    expect(readRecentSearches("me")).toEqual([]);
    window.localStorage.setItem(recentSearchesKey("me"), "[\"ef\",5,null]");
    expect(readRecentSearches("me")).toEqual(["ef"]);
  });
});

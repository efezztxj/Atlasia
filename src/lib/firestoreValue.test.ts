import { describe, expect, it } from "vitest";
import { friendlyDataError, isPermissionDenied, placeDeleteErrorMessage, withoutUndefined } from "./firestoreValue";

/**
 * Metin kilidi: bu cümleler kullanıcıya birebir gösteriliyor. App.tsx
 * temizliğinde (fonksiyon buraya taşındı) metinlerin değişmediğinin kanıtı
 * bu testtir — metin değişecekse bilinçli olarak burası da güncellenir.
 */
describe("placeDeleteErrorMessage — kullanıcı metinleri kilitli", () => {
  it("sahip değilsen ve Rules reddi aynı metni verir", () => {
    const expected = "Bu iz başka bir hesaba ait. Yalnızca bırakan hesap silebilir.";
    expect(placeDeleteErrorMessage({ code: "place/not-owner" })).toBe(expected);
    expect(placeDeleteErrorMessage({ code: "permission-denied" })).toBe(expected);
    expect(placeDeleteErrorMessage(new Error("FirebaseError: Missing or insufficient permissions. (permission-denied)"))).toBe(expected);
  });

  it("sahiplik kaydı eksik eski iz ayrı söylenir", () => {
    expect(placeDeleteErrorMessage({ code: "place/owner-missing" }))
      .toBe("Bu eski izin sahiplik kaydı eksik. Güvenli taşıma yapılmadan silinemez.");
  });

  it("bağlantı hataları ayrı söylenir", () => {
    const expected = "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.";
    expect(placeDeleteErrorMessage({ code: "unavailable" })).toBe(expected);
    expect(placeDeleteErrorMessage(new Error("network request failed"))).toBe(expected);
  });

  it("bilinmeyen hata genel metne düşer; hiç hata olmasa da çökmez", () => {
    const expected = "İz silinemedi. Kayıt korunuyor; biraz sonra tekrar deneyebilirsin.";
    expect(placeDeleteErrorMessage(new Error("bilinmeyen"))).toBe(expected);
    expect(placeDeleteErrorMessage(null)).toBe(expected);
    expect(placeDeleteErrorMessage(undefined)).toBe(expected);
  });
});

describe("isPermissionDenied", () => {
  it("yalnız 'permission-denied' kodunu tanır", () => {
    expect(isPermissionDenied({ code: "permission-denied" })).toBe(true);
    expect(isPermissionDenied({ code: "unavailable" })).toBe(false);
    expect(isPermissionDenied(new Error("permission-denied"))).toBe(false); // mesaj değil, kod
    expect(isPermissionDenied(null)).toBe(false);
    expect(isPermissionDenied("permission-denied")).toBe(false);
  });
});

describe("withoutUndefined", () => {
  it("iç içe undefined alanları ayıklar, girdiyi değiştirmez, sınıf örneklerine dokunmaz", () => {
    class Sentinel {
      readonly mark = 1;
    }
    const sentinel = new Sentinel();
    const input = { a: 1, b: undefined, c: { d: undefined, e: [1, undefined, { f: undefined, g: 2 }] }, ts: sentinel };
    const result = withoutUndefined(input);
    expect(result).toEqual({ a: 1, c: { e: [1, { g: 2 }] }, ts: sentinel });
    expect(result.ts).toBe(sentinel); // aynı nesne
    expect("b" in input).toBe(true); // girdi bozulmadı
  });
});

describe("friendlyDataError", () => {
  it("Firebase'in ham İngilizce mesajını göstermez", () => {
    const failure = Object.assign(new Error("Missing or insufficient permissions."), { name: "FirebaseError", code: "permission-denied" });
    const text = friendlyDataError(failure, "Grup oluşturulamadı.");
    expect(text).not.toContain("Missing");
    expect(text.startsWith("Grup oluşturulamadı.")).toBe(true);
    expect(friendlyDataError(Object.assign(new Error("x"), { name: "FirebaseError", code: "unavailable" }), "Olmadı.")).toContain("Bağlantı");
    expect(friendlyDataError(Object.assign(new Error("Firebase Storage: x"), { name: "FirebaseError", code: "storage/unknown" }), "Olmadı.")).toBe("Olmadı.");
    expect(friendlyDataError("string", "Olmadı.")).toBe("Olmadı.");
  });

  it("uygulamanın kendi Türkçe hatalarını aynen geçirir", () => {
    const failure = Object.assign(new Error("Grup adı 2–80 karakter olmalı."), { code: "group/name-too-short" });
    expect(friendlyDataError(failure, "Olmadı.")).toBe("Grup adı 2–80 karakter olmalı.");
    expect(friendlyDataError(new Error("Rota bulunamadı."), "Olmadı.")).toBe("Rota bulunamadı.");
  });
});

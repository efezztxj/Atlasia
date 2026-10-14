import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LEGAL_PLACEHOLDERS,
  LEGAL_REVIEW_NOTICE,
  LEGAL_SOURCE,
  LEGAL_VERSION,
  legalDocumentText,
  privacyDocument,
  termsDocument,
  unresolvedLegalPlaceholders,
} from "./legal";

describe("TASK-021 A yasal metin paketi", () => {
  it("kanonik v2 belge yapısını eksiksiz taşır", () => {
    expect(LEGAL_VERSION).toBe("2.0");
    expect(privacyDocument.sections).toHaveLength(10);
    expect(termsDocument.sections).toHaveLength(12);
    expect(privacyDocument.updatedLine).toBe("Son güncelleme: [TARİH] · Sürüm 2.0");
    expect(termsDocument.updatedLine).toBe("Son güncelleme: [TARİH] · Sürüm 2.0");
    expect(LEGAL_SOURCE).toContain("3f90097a-5569-813f-9e27-e9f2f4f3135e");
    expect(LEGAL_SOURCE).toContain("MSG-059");
  });

  it("Firebase ve cihaz modu veri akışını birlikte ve dürüstçe açıklar", () => {
    const privacy = legalDocumentText(privacyDocument);

    expect(privacy).toContain("Google Firebase");
    expect(privacy).toContain("Firestore Rules");
    expect(privacy).toContain("Google App Check (reCAPTCHA)");
    expect(privacy).toContain("sunucularımıza gönderilmez");
    expect(privacy).not.toContain("Yerler ve rotalar bu sürümde cihazında saklanır");
  });

  it("sağlayıcı, hak ve dürüst rozet hükümlerini korur", () => {
    const privacy = legalDocumentText(privacyDocument);
    const terms = legalDocumentText(termsDocument);

    for (const provider of ["Cloudflare", "Esri", "OpenFreeMap/OpenMapTiles", "Google Fonts"]) {
      expect(privacy).toContain(provider);
    }
    expect(privacy).toContain("KVKK m.11");
    expect(terms).toContain("Hiçbir gösterge/resmi sıralama satın alınamaz");
    expect(terms).toContain("Satın alma yapılmadan ücretlendirme yapılamaz");
  });

  it("künye yer tutucularını ve avukat onayı bekleyen taslak durumunu görünür tutar", () => {
    expect(LEGAL_PLACEHOLDERS).toEqual(["[TARİH]", "[AD SOYAD / UNVAN]", "[E-POSTA]", "[ŞEHİR]"]);
    expect(unresolvedLegalPlaceholders(privacyDocument)).toEqual(["[TARİH]", "[AD SOYAD / UNVAN]", "[E-POSTA]"]);
    expect(unresolvedLegalPlaceholders(termsDocument)).toEqual(["[TARİH]", "[E-POSTA]", "[ŞEHİR]"]);
    expect(LEGAL_REVIEW_NOTICE).toBe("Taslak · Künye ve avukat onayı bekleniyor");
  });

  it("mevcut kayıt onayını yeni tam metin modalına bağlı tutar", () => {
    const accountAccess = readFileSync("src/components/AccountAccess.tsx", "utf8");
    const legalNotice = readFileSync("src/components/LegalNotice.tsx", "utf8");

    expect(accountAccess).toContain("Kullanım koşullarını ve gizlilik açıklamasını kabul ediyorum.");
    expect(accountAccess).toContain("<LegalNotice type={legal}");
    expect(legalNotice).toContain("getLegalDocument(type)");
    expect(legalNotice).toContain("aria-modal=\"true\"");
    expect(legalNotice).toContain("data-legal-source={LEGAL_SOURCE}");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LEGAL_IMPRINT,
  LEGAL_PLACEHOLDERS,
  LEGAL_REVIEW_NOTICE,
  LEGAL_SOURCE,
  LEGAL_VERSION,
  getLegalDocument,
  getLegalReviewNotice,
  isLegalImprintComplete,
  kvkkNoticeDocument,
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

  it("künye yer tutucularını tek LEGAL_IMPRINT kaynağında tutar ve avukat onayıyla otomatik çözülür", () => {
    expect(LEGAL_PLACEHOLDERS).toEqual(["[TARİH]", "[AD SOYAD / UNVAN]", "[E-POSTA]", "[ŞEHİR]"]);
    expect(unresolvedLegalPlaceholders(privacyDocument)).toEqual(["[TARİH]", "[AD SOYAD / UNVAN]", "[E-POSTA]"]);
    expect(unresolvedLegalPlaceholders(termsDocument)).toEqual(["[TARİH]", "[E-POSTA]", "[ŞEHİR]"]);
    expect(LEGAL_REVIEW_NOTICE).toBe("Taslak · Künye ve avukat onayı bekleniyor");
    expect(isLegalImprintComplete(LEGAL_IMPRINT)).toBe(false);
    expect(getLegalReviewNotice(LEGAL_IMPRINT)).toBe(LEGAL_REVIEW_NOTICE);

    // Gerçek künye + avukat onayı girildiğinde taslak rozeti otomatik kalkar.
    const completed = {
      updatedDate: "2026-10-29",
      controllerName: "Atlasia Teknoloji A.Ş.",
      contactEmail: "kvkk@atlasia.example",
      jurisdictionCity: "İzmir",
      reviewApproved: true,
    };
    expect(isLegalImprintComplete(completed)).toBe(true);
    expect(getLegalReviewNotice(completed)).toBeNull();

    // Belge gövdelerinde dağınık yer tutucu dizgesi kalmamalı (yalnız LEGAL_PLACEHOLDERS dizisinde).
    const source = readFileSync("src/content/legal.ts", "utf8");
    const bodyAfterImprint = source.slice(source.indexOf("export const privacyDocument"));
    for (const placeholder of LEGAL_PLACEHOLDERS) {
      expect(bodyAfterImprint).not.toContain(placeholder);
    }
  });

  it("Gizlilik bölüm 3 zorunlu atlasia_consent çerezini, 12 ay süresini ve Ayarlar erişimini açıklar", () => {
    const section3 = privacyDocument.sections[2];
    expect(section3.title).toContain("3. YEREL DEPOLAMA VE ÇEREZ");
    const text = section3.paragraphs.join(" ");
    expect(text).toContain("atlasia_consent");
    expect(text).toContain("12 ay");
    expect(text).toContain("atlasia.cookieConsent.v1");
    expect(text).toContain("Ayarlar > Konum ve gizlilik > Çerez ve depolama");
    expect(text).toContain("Microsoft Clarity yalnız ayrı izninle analitik çerezleri kullanabilir");
  });
});

describe("TASK KVKK aydınlatma akışı (Tur 4)", () => {
  it("kvkk belgesi zorunlu başlıklarla ayrı bir dokümandır", () => {
    expect(getLegalDocument("kvkk")).toBe(kvkkNoticeDocument);
    const kvkk = legalDocumentText(kvkkNoticeDocument);
    for (const heading of ["VERİ SORUMLUSU", "İŞLEME AMAÇLARI", "HUKUKİ SEBEPLER", "AKTARIM", "HAKLARIN VE BAŞVURU"]) {
      expect(kvkk).toContain(heading);
    }
    expect(kvkk).toContain("KVKK");
    // Künye bilinçli yer tutucu; gerçek kimlik uydurulmaz.
    expect(unresolvedLegalPlaceholders(kvkkNoticeDocument)).toEqual(["[TARİH]", "[AD SOYAD / UNVAN]", "[E-POSTA]"]);
    expect(kvkkNoticeDocument.title).toBe("KVKK Aydınlatma Metni");
  });

  it("privacy/terms belgeleri kvkk'dan bağımsız kalır ve getLegalDocument üçünü de doğru yönlendirir", () => {
    expect(getLegalDocument("privacy")).toBe(privacyDocument);
    expect(getLegalDocument("terms")).toBe(termsDocument);
    expect(legalDocumentText(privacyDocument)).not.toContain("İŞLEME AMAÇLARI\n");
  });

  it("aydınlatma metinleri kabule bağlanmaz; tek KVKK aydınlatma metni vardır", () => {
    expect(privacyDocument.title).toBe("Gizlilik Açıklaması");
    expect(legalDocumentText(privacyDocument)).not.toContain("kabul etmeden önce");
    const terms = legalDocumentText(termsDocument);
    expect(terms).not.toContain("Gizlilik/KVKK metnini kabul");
    expect(terms).toContain("kabul edilmesi gerekmez");
  });

  it("kayıt akışında iki ayrı yasal öğe vardır: zorunlu koşul onayı + kutusuz KVKK bilgilendirmesi", () => {
    const accountAccess = readFileSync("src/components/AccountAccess.tsx", "utf8");

    // (a) Tek zorunlu onay kutusu: yalnız kullanım koşulları.
    expect(accountAccess).toContain("Kullanım koşullarını kabul ediyorum.");
    expect(accountAccess).not.toContain("Kullanım koşullarını ve gizlilik açıklamasını kabul ediyorum.");

    // (b) KVKK "okudum" ibaresi + bağlantı; onay kutusu DEĞİL.
    expect(accountAccess).toContain("KVKK aydınlatma metnini okudum");
    expect(accountAccess).toContain('onClick={() => setLegal("kvkk")}');
    expect(accountAccess).not.toMatch(/type="checkbox"[^>]*\/?>\s*<span>[^<]*KVKK/);

    // Açık rıza gerektiren bir işleme yok; açık rıza kutusu eklenmedi.
    expect(accountAccess).not.toContain("açık rıza");

    // Modal bağları korunur; kvkk da aynı modalde açılır.
    expect(accountAccess).toContain("<LegalNotice type={legal}");
    const legalNotice = readFileSync("src/components/LegalNotice.tsx", "utf8");
    expect(legalNotice).toContain("getLegalDocument(type)");
    expect(legalNotice).toContain("aria-modal=\"true\"");
    expect(legalNotice).toContain("data-legal-source={LEGAL_SOURCE}");
  });

  it("mevcut kayıt onayını yeni tam metin modalına bağlı tutar", () => {
    const accountAccess = readFileSync("src/components/AccountAccess.tsx", "utf8");
    const legalNotice = readFileSync("src/components/LegalNotice.tsx", "utf8");

    expect(accountAccess).toContain("<LegalNotice type={legal}");
    expect(legalNotice).toContain("getLegalDocument(type)");
    expect(legalNotice).toContain("aria-modal=\"true\"");
    expect(legalNotice).toContain("data-legal-source={LEGAL_SOURCE}");
  });
});

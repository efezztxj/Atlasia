import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUIDE_PLACES } from "./places";

interface RawEntry {
  id: string;
  title: string;
  tr: { audio: string; text: string };
  en: { audio: string; text: string };
}

const raw = JSON.parse(readFileSync("public/audio/listen/place-listen.json", "utf8")) as {
  version: number;
  entries: RawEntry[];
};

const entries = raw.entries;
// İngilizce alıntı sözcükler aksanı korur (façade → façades); bunlar sızıntı değil.
const ENGLISH_LOANWORD_STEMS = ["façad", "café", "naïve", "résumé"];
const byId = new Map(entries.map((entry) => [entry.id, entry]));

/**
 * Genel dinleme metinleri — 28 rehber yerinin tamamı iki dilde.
 *
 * NEDEN TEST: metinler kod değil içerik; ama yayına çıkan şey bu metin ve
 * yanlış yere bağlanmış bir ses dosyası sessizce yanlış anlatım çalar. Burada
 * kilitlenen şey kimlik, yol kuralı ve uzunluk; editoryal doğruluk değil
 * (o, `docs/icerik/sesli-anlatim-rehberi/genel-dinleme-kaynaklar.md`).
 */
describe("genel dinleme metinleri", () => {
  it("rehberdeki 28 yerin tamamını kapsar, fazlasını değil", () => {
    expect(entries).toHaveLength(28);
    expect([...byId.keys()].sort()).toEqual(GUIDE_PLACES.map((place) => place.id).sort());
  });

  it("başlık yer kartındaki başlıkla aynıdır", () => {
    for (const place of GUIDE_PLACES) {
      expect(byId.get(place.id)?.title).toBe(place.title);
    }
  });

  it("ses yolu ada bağlı ve iki dilde ayrı", () => {
    const paths = new Set<string>();
    for (const entry of entries) {
      expect(entry.tr.audio).toBe(`/audio/listen/${entry.id}.mp3`);
      expect(entry.en.audio).toBe(`/audio/listen/en-${entry.id}.mp3`);
      for (const path of [entry.tr.audio, entry.en.audio]) {
        expect(paths.has(path)).toBe(false);
        paths.add(path);
      }
    }
  });

  it("metinler konuşulabilir uzunlukta ve cümle bitirir", () => {
    for (const entry of entries) {
      for (const text of [entry.tr.text, entry.en.text]) {
        expect(text).toBe(text.trim());
        expect(text).not.toMatch(/\s{2,}/);
        expect(text.length).toBeGreaterThanOrEqual(450);
        expect(text.length).toBeLessThanOrEqual(900);
        expect(text).toMatch(/[.!?]$/);
        expect(text.split(/[.!?]\s/).length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  // Özel adlar Türkçe yazımını korur (Kaputaş, Kaçkar, Göreme); bu yüzden
  // harf taraması yerine Türkçe işlev sözcükleri ve noktasız "ı" aranır.
  it("İngilizce metne Türkçe cümle sızmaz", () => {
    for (const entry of entries) {
      expect(entry.en.text).not.toMatch(/(^|\s)(ve|bir|için|ile|değil|olarak|ancak|daha|çok)(\s|$)/i);
      const lowerCaseTurkish = entry.en.text
        .split(/[^A-Za-zÇĞİÖŞÜçğıöşü]+/)
        .filter((word) => word.length > 0)
        .filter((word) => /[çğıöşü]/.test(word))
        .filter((word) => !/^[A-ZÇĞİÖŞÜ]/.test(word))
        .filter((word) => !ENGLISH_LOANWORD_STEMS.some((stem) => word.toLowerCase().startsWith(stem)));
      expect(lowerCaseTurkish).toEqual([]);
    }
  });

  it("taslak ya da yer tutucu metin yok", () => {
    for (const entry of entries) {
      for (const text of [entry.tr.text, entry.en.text]) {
        expect(text).not.toMatch(/TODO|FIXME|lorem|XXX|{.*}|<.*>/i);
      }
    }
  });

  it("kayıt paketi JSON'daki metni birebir taşır", () => {
    const pack = "docs/icerik/sesli-anlatim-rehberi/kayit-paketi/genel-dinleme";
    for (const [index, entry] of entries.entries()) {
      const no = String(index + 1).padStart(2, "0");
      expect(readFileSync(`${pack}/metinler/tr-${no}-${entry.id}.txt`, "utf8").trim()).toBe(entry.tr.text);
      expect(readFileSync(`${pack}/metinler/en-${no}-${entry.id}.txt`, "utf8").trim()).toBe(entry.en.text);
    }
    const csv = readFileSync(`${pack}/kayit-listesi-tr.csv`, "utf8");
    for (const entry of entries) expect(csv).toContain(`"${entry.tr.audio}"`);
  });

  it("klasördeki her ses dosyası bir kayda bağlıdır", () => {
    const referenced = new Set(entries.flatMap((entry) => [entry.tr.audio, entry.en.audio]));
    const files = readdirSync("public/audio/listen").filter((name) => name.endsWith(".mp3"));
    for (const file of files) {
      expect(referenced.has(`/audio/listen/${file}`)).toBe(true);
    }
  });
});

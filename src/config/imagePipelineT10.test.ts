import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CLOUD_PHOTO_ATTEMPTS,
  MAX_CLOUD_PHOTO_CHARS,
  MAX_INPUT_BYTES,
  compressImage,
  compressForLocal,
} from "../utils/image";

/**
 * T10 — görsel boru hattı (yükleme kapıları + teslim işaretleri).
 *
 * NEDEN VAR: boru hattı (küçültme + JPEG + kademeli kalite) zaten vardı ama
 * girişte **hiçbir kapı yoktu**: 48 MP bir telefon fotoğrafı ya da iPhone'un
 * HEIC dosyası doğrudan decode edilmeye çalışılıyor, mobilde sekme
 * düşebiliyor / anlaşılmaz bir hata görünüyordu. Bu test kapıları ve teslim
 * tarafındaki `decoding="async"` işaretlerini kilitler.
 */

describe("T10 · yükleme kapıları", () => {
  it("girdi boyutu sınırı decode'dan önce uygulanır", async () => {
    expect(MAX_INPUT_BYTES).toBe(25 * 1024 * 1024);
    // 26 MB'lık sahte görsel: decode edilmeden, anlaşılır Türkçe hatayla döner.
    const big = new File([new Uint8Array(26 * 1024 * 1024)], "buyuk.jpg", { type: "image/jpeg" });
    await expect(compressImage(big)).rejects.toThrow(/Fotoğraf çok büyük/);
    await expect(compressForLocal(big)).rejects.toThrow(/üst sınır 25 MB/i);
  });

  it("HEIC dosyası net bir çözüm önerisiyle reddedilir", async () => {
    const heic = new File([new Uint8Array(10)], "IMG_0001.HEIC", { type: "image/heic" });
    await expect(compressImage(heic)).rejects.toThrow(/HEIC/);
    await expect(compressImage(heic)).rejects.toThrow(/En Uyumlu/);
  });

  it("görsel olmayan dosya hâlâ reddedilir", async () => {
    const text = new File(["merhaba"], "not.txt", { type: "text/plain" });
    await expect(compressImage(text)).rejects.toThrow("Bu bir görsel değil");
  });

  it("kademeli küçültme planı tek yönlü: her adım küçülür ve kalite düşer", () => {
    for (let i = 1; i < CLOUD_PHOTO_ATTEMPTS.length; i += 1) {
      expect(CLOUD_PHOTO_ATTEMPTS[i].maxSide).toBeLessThan(CLOUD_PHOTO_ATTEMPTS[i - 1].maxSide);
      expect(CLOUD_PHOTO_ATTEMPTS[i].quality).toBeLessThan(CLOUD_PHOTO_ATTEMPTS[i - 1].quality);
    }
    // Firestore kuralındaki 180.000 karakter kilidi ile aynı kalmalı.
    expect(MAX_CLOUD_PHOTO_CHARS).toBe(180_000);
    expect(CLOUD_PHOTO_ATTEMPTS.at(-1)!.maxSide).toBeLessThanOrEqual(480);
  });

  it("EXIF yönü açıkça istenir (telefon fotoğrafı yan yatmasın)", () => {
    const source = readFileSync("src/utils/image.ts", "utf8");
    expect(source).toContain('createImageBitmap(file, { imageOrientation: "from-image" })');
    // Girdi kapıları her iki giriş noktasında da çağrılır.
    expect(source.match(/assertUsableImage\(file\)/g)?.length).toBe(2);
  });
});

describe("T10 · teslim işaretleri", () => {
  it("galeri/akış görselleri `decoding=\"async\"` taşır", () => {
    for (const file of [
      "src/components/PlaceDetails.tsx",
      "src/components/SocialPanel.tsx",
      "src/components/PlaceImage.tsx",
    ]) {
      expect(readFileSync(file, "utf8"), `${file} kod çözümünü ana iş parçacığına yıkmamalı`).toContain(
        'decoding="async"',
      );
    }
  });

  it("hero görseli LCP için öncelikli, alt katman görselleri tembel", () => {
    const landing = readFileSync("src/components/LandingPage.tsx", "utf8");
    const hero = landing.slice(landing.indexOf("/images/atlasia-earth-hero.jpg") - 200, landing.indexOf("/images/atlasia-earth-hero.jpg") + 300);
    expect(hero).toContain('fetchPriority="high"');
    // Hero tembel olmamalı: LCP'yi geciktirir.
    expect(hero).not.toContain('loading="lazy"');

    const dock = readFileSync("src/components/RecordsDock.tsx", "utf8");
    // Ekran dışında başlayan yatay kaydırmadaki kart görselleri tembel olmalı.
    expect(dock).toContain('loading="lazy"');
  });
});

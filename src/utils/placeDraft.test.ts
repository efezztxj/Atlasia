import { describe, expect, it, vi } from "vitest";
import { countWords, MAX_PLACE_NOTE_WORDS, MAX_PLACE_PHOTOS, preparePlacePhotos } from "./placeDraft";

const photo = (name: string) => new File([name], name, { type: "image/jpeg" });
const explainError = () => "Dosya açılamadı.";

describe("pin notu ve galeri", () => {
  it("Türkçe metinde satır ve boşluklardan bağımsız 300 kelime sayar", () => {
    const note = Array.from({ length: MAX_PLACE_NOTE_WORDS }, (_, i) => `sözcük${i}`).join(" \n  ");
    expect(countWords("  \n  ")).toBe(0);
    expect(countWords(note)).toBe(300);
    expect(countWords(`${note} ek`)).toBe(301);
  });

  it("NBSP, Unicode ayırıcı ve BOM ile ayrılan sözcükleri de 300/301 olarak sayar", () => {
    const separators = "\t\n\v\u00A0\u2028\u202F\u3000\uFEFF";
    const note = Array(MAX_PLACE_NOTE_WORDS).fill("kelime").join(separators);
    expect(countWords(note)).toBe(MAX_PLACE_NOTE_WORDS);
    expect(countWords(`${note}\u00A0ek`)).toBe(MAX_PLACE_NOTE_WORDS + 1);
    expect(countWords("a\u200Bb")).toBe(1); // sıfır genişlikli boşluk JS \S için ayırıcı değildir
  });

  it("tek seçimde birden fazla fotoğrafı sıra ile ekler, 3 sınırını korur", async () => {
    const upload = vi.fn(async (file: File) => `jpeg:${file.name}`);
    const result = await preparePlacePhotos([], [photo("a.jpg"), photo("b.jpg"), photo("c.jpg"), photo("d.jpg")], upload, explainError);
    expect(result).toEqual({ photos: ["jpeg:a.jpg", "jpeg:b.jpg", "jpeg:c.jpg"], failures: [], skipped: 1 });
    expect(upload).toHaveBeenCalledTimes(MAX_PLACE_PHOTOS);
  });

  it("başarısız dosyayı açıkça bildirir, başarıları ve önceki fotoğrafı kaybetmez", async () => {
    const upload = vi.fn(async (file: File) => {
      if (file.name === "bozuk.heic") throw new Error("decode failed");
      return `jpeg:${file.name}`;
    });
    const result = await preparePlacePhotos(
      ["onceki"],
      [photo("bozuk.heic"), photo("yeni.jpg"), photo("son.jpg"), photo("ek.jpg")],
      upload,
      explainError,
    );
    expect(result).toEqual({
      photos: ["onceki", "jpeg:yeni.jpg", "jpeg:son.jpg"],
      failures: [{ name: "bozuk.heic", reason: "Dosya açılamadı." }],
      skipped: 1,
    });
    expect(upload).toHaveBeenCalledTimes(3);
  });

  it("aynı JPEG'i iki kez kaydetmez; kurallardaki galeri tekilliğini korur", async () => {
    const result = await preparePlacePhotos([], [photo("a.jpg"), photo("a.jpg"), photo("b.jpg")],
      async (file) => `jpeg:${file.name}`, explainError);
    expect(result.photos).toEqual(["jpeg:a.jpg", "jpeg:b.jpg"]);
    expect(result.failures).toEqual([{ name: "a.jpg", reason: "Bu fotoğraf zaten eklendi." }]);
  });

  it("galeri doluysa yeni fotoğrafı işleme sokmaz", async () => {
    const upload = vi.fn(async () => "olmaz");
    const result = await preparePlacePhotos(["a", "b", "c"], [photo("d.jpg")], upload, explainError);
    expect(result.skipped).toBe(1);
    expect(result.photos).toEqual(["a", "b", "c"]);
    expect(upload).not.toHaveBeenCalled();
  });
});

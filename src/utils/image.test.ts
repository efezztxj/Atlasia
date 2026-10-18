import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compressImageWithinLimit,
  isHeicFile,
  MAX_PLACE_PHOTO_CHARS,
  PhotoProcessingError,
  photoUploadErrorMessage,
} from "./image";

afterEach(() => vi.unstubAllGlobals());

describe("mobil fotoğraf hazırlama", () => {
  it("MIME tipi boş dosya sağlayıcısının JPEG'ini hazırlayıp JPEG data URL döndürür", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 400, height: 300, close })));
    vi.stubGlobal("document", { createElement: () => ({
      getContext: () => ({ drawImage: vi.fn(), imageSmoothingQuality: "high" }),
      toDataURL: () => "data:image/jpeg;base64,AQ==",
    }) });

    const result = await compressImageWithinLimit(new File(["jpeg"], "kamera.jpg"), MAX_PLACE_PHOTO_CHARS);
    expect(result).toMatchObject({ dataUrl: "data:image/jpeg;base64,AQ==", width: 400, height: 300 });
    expect(close).toHaveBeenCalledOnce();
  });

  it("HEIC türü, uzantısı ve ftyp imzasını tanır; AVIF'i karıştırmaz", async () => {
    expect(await isHeicFile(new File(["x"], "kamera.heic"))).toBe(true);
    expect(await isHeicFile(new File(["x"], "bilinmiyor", { type: "image/heif" }))).toBe(true);
    const header = (brand: string) => new File([new Uint8Array([0, 0, 0, 20]), "ftyp", brand], "bilinmiyor");
    expect(await isHeicFile(header("heic"))).toBe(true);
    expect(await isHeicFile(header("avif"))).toBe(false);
  });

  it("görsel olmayan veya boş dosyada denenebilir hata verir", async () => {
    await expect(compressImageWithinLimit(new File(["PDF"], "dosya.pdf", { type: "application/pdf" })))
      .rejects.toMatchObject({ code: "photo/type" });
    await expect(compressImageWithinLimit(new File([], "bos.jpg", { type: "image/jpeg" })))
      .rejects.toMatchObject({ code: "photo/empty" });
    expect(photoUploadErrorMessage(new PhotoProcessingError("photo/type"))).toContain("JPG");
    expect(photoUploadErrorMessage(new PhotoProcessingError("photo/heic"))).toContain("JPG");
    expect(photoUploadErrorMessage(new Error("Bulut bağlantısı yok"))).toContain("İnternetini");
  });

  it("yer galerisinde JPEG 100.000 karakteri aşarsa önce yeniden küçültür, yine sığmazsa reddeder", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 600, close })));
    vi.stubGlobal("document", { createElement: () => ({
      getContext: () => ({ drawImage: vi.fn(), imageSmoothingQuality: "high" }),
      toDataURL: () => `data:image/jpeg;base64,${"A".repeat(MAX_PLACE_PHOTO_CHARS)}`,
    }) });
    await expect(compressImageWithinLimit(new File(["img"], "buyuk.jpg", { type: "image/jpeg" }), MAX_PLACE_PHOTO_CHARS))
      .rejects.toMatchObject({ code: "photo/limit" });
    expect(close).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it } from "vitest";
import { MAX_CLOUD_PHOTO_CHARS, compressImage } from "./image";

// Canvas/ImageBitmap yolu node ortamında yok; bu test erken sözleşmeyi
// (görsel olmayan dosyayı reddetme) ve kota kilidini karakterize eder.

describe("image — foto sıkıştırma sözleşmesi", () => {
  it("bulut foto sınırı rules'taki 180.000 karakter kilidiyle aynıdır", () => {
    expect(MAX_CLOUD_PHOTO_CHARS).toBe(180_000);
  });

  it("görsel olmayan dosyayı decode etmeden reddeder", async () => {
    const file = new File(["merhaba"], "not.txt", { type: "text/plain" });
    await expect(compressImage(file)).rejects.toThrow("Bu bir görsel değil");
  });
});

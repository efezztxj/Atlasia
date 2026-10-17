import { describe, expect, it } from "vitest";
import { parseAllowedHosts } from "./allowedHosts";

describe("Vite host izin listesi", () => {
  it("virgülle ayrılmış açık alan adlarını temizler ve tekilleştirir", () => {
    expect(parseAllowedHosts("preview.example.com, .e2b.app,preview.example.com")).toEqual([
      "preview.example.com",
      ".e2b.app",
    ]);
  });

  it("boş ayarda varsayılan güvenli Vite davranışını korur", () => {
    expect(parseAllowedHosts()).toEqual([]);
    expect(parseAllowedHosts("   ")).toEqual([]);
  });

  it.each(["*", "https://example.com", "example.com/path", "user@example.com", "example.com:5173"])(
    "geniş veya host dışı girdiyi reddeder: %s",
    (value) => expect(() => parseAllowedHosts(value)).toThrow("Geçersiz ATLASIA_ALLOWED_HOSTS"),
  );
});

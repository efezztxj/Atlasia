import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("depo hijyeni", () => {
  it("Atlasia paket kimliğini ve araç sürümlerini açıkça tanımlar", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      name?: string;
      version?: string;
      description?: string;
      packageManager?: string;
      engines?: { node?: string };
    };

    expect(pkg).toMatchObject({
      name: "atlasia",
      version: "0.1.0",
      packageManager: "npm@10.9.2",
      engines: { node: "^22.13.0 || >=24.0.0" },
    });
    expect(pkg.description).toContain("Atlasia");
  });

  it("örnek ortam dosyası dokuz boş VITE_ değişkeni içerir ve README belge hedeflerini bağlar", () => {
    // 7 üretim değişkeni (3 zorunlu Firebase + GEOCODER_URL + APPLE + PHONE + GOOGLE_MAPS_EMBED) + 1 yerel geliştirme
    // (App Check debug token) + 1 ölçüm toplayıcısı (VITE_TELEMETRY_ENDPOINT, boşsa ağ kapalı) = 9.
    const env = readFileSync(".env.example", "utf8");
    const viteVariables = env.split(/\r?\n/).filter((line) => line.startsWith("VITE_"));
    expect(viteVariables).toHaveLength(9);
    expect(viteVariables.every((line) => /^VITE_[A-Z0-9_]+=$/.test(line))).toBe(true);

    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("(AUTH_SETUP.md)");
    expect(readme).toContain("(CHANGELOG.md)");
  });

  it("kopya uygulama, zip ve bağımlılığı olmayan capture betiğini tutmaz", () => {
    expect(existsSync("satellite-map-web-application (1)")).toBe(false);
    expect(existsSync("satellite-map-web-application.zip")).toBe(false);
    expect(existsSync("capture.mjs")).toBe(false);
  });

  it("Firebase Hosting yerine yalnız kural, indeks ve emulator kapsamını tutar", () => {
    const firebase = JSON.parse(readFileSync("firebase.json", "utf8")) as Record<string, unknown>;
    expect(firebase).toHaveProperty("firestore");
    expect(firebase).toHaveProperty("emulators");
    expect(firebase).not.toHaveProperty("hosting");
  });
});

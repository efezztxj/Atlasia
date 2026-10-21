import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("firestore kuralları test çalıştırıcısı", () => {
  it("Windows EINVAL koruması: npm CLI Node üzerinden, yedek ComSpec ile çağrılır", () => {
    // Node 18.20+/20.12+ (CVE-2024-27980) shell olmadan .cmd/.bat spawn'ını
    // EINVAL ile reddeder. Doğru yol: npm_execpath'i process.execPath ile
    // çağırmak; npm yaşam döngüsü dışından ise cmd.exe (ComSpec) yedeği.
    const source = readFileSync("scripts/run-firestore-rules-tests.mjs", "utf8");
    expect(source).toContain("npm_execpath");
    expect(source).toContain("process.execPath");
    expect(source).toContain("ComSpec");
  });

  it("Java 21 kapısı, SHA-256 pin ve port çakışma kontrolü erken hata verir", () => {
    const source = readFileSync("scripts/run-firestore-rules-tests.mjs", "utf8");
    expect(source).toContain("Java 21 veya üzerini gerektirir");
    expect(source).toContain("expectedSha256");
    expect(source).toContain("ensurePortAvailable");
    // Yerel demo proje: gerçek projeye yanlışlıkla bağlanma yok.
    expect(source).toContain('"demo-atlasia-rules"');
  });

  it("emulator JVM locale bayrakları her platformda aynı şekilde verilir", () => {
    // Türkçe sistem locale'i (örn. Windows) emulator davranışını bozmasın diye
    // JVM locale'i spawn argümanlarında sabitlenir; ortam değişkenine dayanmaz.
    const source = readFileSync("scripts/run-firestore-rules-tests.mjs", "utf8");
    expect(source).toContain('"-Duser.language=en"');
    expect(source).toContain('"-Duser.country=US"');
    const javaIndex = source.indexOf('spawn(\n  "java"');
    expect(javaIndex).toBeGreaterThan(-1);
    const localeIndex = source.indexOf('"-Duser.language=en"');
    const jarIndex = source.indexOf('"-jar"');
    expect(localeIndex).toBeGreaterThan(javaIndex);
    expect(localeIndex).toBeGreaterThan(-1);
    expect(localeIndex).toBeLessThan(jarIndex);
  });
});

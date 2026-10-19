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
});

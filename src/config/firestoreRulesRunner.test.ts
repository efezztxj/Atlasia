import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("firestore kuralları test çalıştırıcısı", () => {
  it("Windows'ta .cmd spawn'ı için shell açar (Node EINVAL koruması)", () => {
    // Node 18.20+/20.12+ (CVE-2024-27980) shell olmadan .cmd spawn'ını EINVAL
    // ile reddeder; bu kilit kapatılırsa Windows kullanıcılarında emülatör
    // başlar ama testler spawn edilemez.
    const source = readFileSync("scripts/run-firestore-rules-tests.mjs", "utf8");
    expect(source).toContain("shell: isWindows");
  });
});

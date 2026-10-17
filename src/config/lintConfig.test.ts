import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("React hook lint kapısı", () => {
  it("exhaustive-deps kuralını hata seviyesinde zorunlu tutar", () => {
    const config = readFileSync("eslint.config.js", "utf8");
    expect(config).toContain('"react-hooks/exhaustive-deps": "error"');
    expect(config).not.toContain('"react-hooks/exhaustive-deps": "off"');
  });
});

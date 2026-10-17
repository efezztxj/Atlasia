import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const EXPECTED_PINS = [
  "actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
  "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0",
  "actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4.9.1",
  "actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0",
] as const;

describe("GitHub Actions tedarik zinciri", () => {
  it("tüm üçüncü taraf action kullanımlarını tam commit SHA'sına sabitler", () => {
    const workflows = readdirSync(".github/workflows")
      .filter((name) => /\.ya?ml$/.test(name))
      .sort()
      .map((name) => readFileSync(`.github/workflows/${name}`, "utf8"))
      .join("\n");
    const uses = [...workflows.matchAll(/^\s*uses:\s*(\S+.*)$/gm)].map((match) => match[1].trim());

    expect(uses).toEqual(EXPECTED_PINS);
    uses.forEach((entry) => {
      expect(entry).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    });
    expect(workflows).not.toMatch(/uses:\s*[^\s]+@v\d+/);
  });

  it("workflow yetkisini yalnız içerik okumayla sınırlar", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toMatch(/permissions:\n\s+contents:\s+read/);
    expect(workflow).not.toMatch(/permissions:\s+write-all/);
  });
});

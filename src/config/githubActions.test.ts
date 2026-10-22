import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const EXPECTED_PINS = [
  "actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
  "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0",
  "actions/setup-java@b843ebf9b913146b38da2eaa7aeddf76074ae1ad # v6.1.0",
  "actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0",
] as const;

describe("GitHub Actions tedarik zinciri", () => {
  it("tüm üçüncü taraf action kullanımlarını tam commit SHA'sına sabitler", () => {
    const workflows = readdirSync(".github/workflows")
      .filter((name) => /\.ya?ml$/.test(name))
      .sort()
      .map((name) => readFileSync(`.github/workflows/${name}`, "utf8"))
      .join("\n");
    const uses = [...workflows.matchAll(/^\s*uses:\s*(\S+.*)$/gm)].map((match) => match[1].trim());

    // Birden çok workflow aynı sabitlenmiş sürümü kullanabilir; izinli küme değişmez.
    expect([...new Set(uses)]).toEqual(EXPECTED_PINS);
    uses.forEach((entry) => {
      expect(entry).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    });
    expect(workflows).not.toMatch(/uses:\s*[^\s]+@v\d+/);
  });

  it("workflow yetkisini yalnız içerik okumayla sınırlar", () => {
    for (const name of readdirSync(".github/workflows").filter((file) => /\.ya?ml$/.test(file))) {
      const workflow = readFileSync(`.github/workflows/${name}`, "utf8").replace(/\r\n/g, "\n");
      expect(workflow, name).toMatch(/permissions:\n\s+contents:\s+read/);
      expect(workflow, name).not.toMatch(/permissions:\s+write-all/);
    }
  });
});

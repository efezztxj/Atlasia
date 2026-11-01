/**
 * F5-6 — Node sürümü tek cevap.
 *
 * Denetimde üç ayrı cevap bulundu: `.nvmrc` 20, CI dört iş akışında 22,
 * `package.json` engines `^22.13 || >=24`. Bu kapı tek kaynağı kilitler:
 * **`.nvmrc`**. İş akışları sabit sayı yazmaz, dosyayı okur (`node-version-file`).
 *
 * Not: `.nvmrc` **hat** yazar (`22`), tam yama değil. Tam yama (`22.13.0`)
 * denendi ve CI'yı kırdı: Node 22.13 ile vitest'in kullandığı `undici`
 * `Pool.schedule` aşamasında `TypeError: Cannot read properties of undefined
 * (reading 'bind')` veriyor (run 41334088490). 22.x hattının güncel yamasında
 * aynı test seti yeşil.
 *
 * Açık kalan (ölçülmedi): `@firebase/app@0.16.4` `engines.node = ">=24.12.0"`
 * istiyor; Node 22 hattında `npm ci` bu paket için `EBADENGINE` **uyarısı**
 * üretir. Node 24.12+ hattına geçiş bu ortamda doğrulanamadığı için (yerel
 * çalışma zamanı 22) karar ertelendi; kapı bugün yalnız **tutarlılığı** ölçer.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (relative: string) => readFileSync(root + relative, "utf8");

const nvmrc = read(".nvmrc").trim();

function majorMinor(version: string): [number, number] {
  const [major, minor] = version.split(".").map(Number);
  return [major, minor];
}

describe("F5-6 · Node sürümü tek cevap", () => {
  it(".nvmrc geçerli bir sürüm yazar", () => {
    // `22` (hat) ya da `22.13.0` (tam) kabul: ikisi de tek kaynak olarak çalışır.
    expect(nvmrc).toMatch(/^\d+(\.\d+){0,2}$/);
  });

  it("engines ve .nvmrc çelişmez", () => {
    const engines = JSON.parse(read("package.json")).engines.node as string;
    expect(engines, "engines alanı tek alt sınır olmalı").toMatch(/^>=\d+\.\d+\.\d+$/);
    const minimum = engines.slice(2);
    const [minMajor, minMinor] = majorMinor(minimum);
    const parts = nvmrc.split(".").map(Number);
    const [major, minor] = [parts[0], parts[1]];
    expect(major, ".nvmrc alt sınırın altında").toBeGreaterThanOrEqual(minMajor);
    // Hattın en yeni yaması kurulur; alt sınır yalnız `engines`ta yaşar.
    if (major === minMajor && minor !== undefined) {
      expect(minor, ".nvmrc alt sınırın altında").toBeGreaterThanOrEqual(minMinor);
    }
  });

  it("dört iş akışı da sabit sürüm yazmaz, .nvmrc dosyasını okur", () => {
    const workflows = readdirSync(root + ".github/workflows").filter((name) => name.endsWith(".yml"));
    const withNode = workflows.filter((name) => read(`.github/workflows/${name}`).includes("actions/setup-node"));
    expect(withNode.length, "setup-node kullanan iş akışı sayısı").toBe(4);
    for (const name of withNode) {
      const source = read(`.github/workflows/${name}`);
      expect(source, `${name}: node-version-file yok`).toContain("node-version-file: .nvmrc");
      expect(source, `${name}: sabit node-version kaldı`).not.toMatch(/^\s+node-version: \d+$/m);
    }
  });

  it("README tek kaynağı adıyla anar", () => {
    expect(read("README.md")).toContain(".nvmrc");
  });
});

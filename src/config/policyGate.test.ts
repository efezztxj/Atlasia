/**
 * Atlasia — depo politikası kapısı.
 *
 * NEDEN VAR: `as any`, `@ts-ignore`, `@ts-expect-error` ve `eslint-disable`
 * yasakları daha önce yalnız insan dikkatine bırakılmıştı. `eslint.config.js`
 * `@typescript-eslint/no-explicit-any` kuralını bilinçli olarak KAPATIYOR
 * (mevcut kod tabanı için), `eslint-disable` ise lint'in kendi kaçış yolu;
 * yani hiçbir otomatik adım bu yasakları denetlemiyordu. Sonuç: #72 ile bir
 * `eslint-disable` sessizce `main`'e girdi ve ancak elle taramayla yakalandı.
 *
 * Bu dosya politikayı CI'ın parçası yapar; ihlal artık `vitest run` ile kırmızı.
 * Kapsam bilinçli olarak geniştir: `src/`, `tests/`, `scripts/`, `public/`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Kapının kendisi bu dosyadır: yasak dizeleri (regex olarak) kendi içinde taşır. */
const SELF = "src/config/policyGate.test.ts";

const SCAN_ROOTS = ["src", "tests", "scripts", "public"] as const;
const SCANNED_EXTENSIONS = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

const FORBIDDEN: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "as any", pattern: /\bas\s+any\b/ },
  { label: "@ts-ignore", pattern: /@ts-ignore/ },
  { label: "@ts-expect-error", pattern: /@ts-expect-error/ },
  { label: "eslint-disable", pattern: /eslint-disable/ },
];

function walk(directory: string, found: string[] = []): string[] {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (SCANNED_EXTENSIONS.test(name)) found.push(path.split("\\").join("/"));
  }
  return found;
}

const scannedFiles = SCAN_ROOTS.flatMap((root) => walk(root)).filter((path) => path !== SELF);

/** Kural dosyasındaki koşulsuz izinler; her biri gerekçesiyle burada kilitlidir. */
const UNCONDITIONAL_READ_ALLOWLIST = ["places", "posts"] as const;

describe("depo politikası — insan dikkatine bırakılmayan yasaklar", () => {
  it("tarama gerçekten kaynak dosyaları görüyor (boş küme yeşil sayılmaz)", () => {
    expect(scannedFiles.length).toBeGreaterThan(100);
    expect(scannedFiles).toContain("src/App.tsx");
    expect(scannedFiles).toContain("public/sw.js");
  });

  it("kendi kendini taramayan tek dosya bu kapıdır (kaçış listesi büyütülemez)", () => {
    const all = SCAN_ROOTS.flatMap((root) => walk(root));
    expect(all.filter((path) => path === SELF)).toHaveLength(1);
    expect(all.length - scannedFiles.length).toBe(1);
  });

  it("as any / ts-ignore / ts-expect-error / eslint-disable hiçbir kaynakta yok", () => {
    const violations = scannedFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return FORBIDDEN.flatMap(({ label, pattern }) => {
        const match = pattern.exec(source);
        if (!match) return [];
        const line = source.slice(0, match.index).split("\n").length;
        return [`${file}:${line} → ${label}`];
      });
    });
    expect(violations).toEqual([]);
  });

  it("koşulsuz okuma izni yalnız places ve posts get kuralında kalır", () => {
    const rules = readFileSync("firestore.rules", "utf8").split("\n");
    const unconditional: string[] = [];
    let currentMatch = "";

    rules.forEach((line, index) => {
      const matchDeclaration = /^\s*match\s+\/(\w+)\//.exec(line);
      if (matchDeclaration) currentMatch = matchDeclaration[1];
      // Yalnız "if true" ile BİTEN satır koşulsuzdur; "if true && ..." değildir.
      if (/^\s*allow\s+\w+\s*:\s*if\s+true\s*;/.test(line)) {
        unconditional.push(`${currentMatch} (satır ${index + 1})`);
      }
    });

    expect(unconditional.map((entry) => entry.split(" ")[0]).sort()).toEqual(
      [...UNCONDITIONAL_READ_ALLOWLIST].sort(),
    );
  });

  it("catch-all fail-closed kalır ve koşulsuz izin kapsamaz", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const catchAll = rules.indexOf("match /{document=**}");
    expect(catchAll).toBeGreaterThan(-1);
    expect(rules.slice(catchAll)).toMatch(/allow\s+read,\s*write\s*:\s*if\s+false/);
  });

  it("gerçek ortam dosyaları izlenmez, yalnız boş şablon serbest", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    expect(gitignore).toMatch(/^\.env\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });
});

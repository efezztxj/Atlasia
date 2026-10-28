/**
 * Güvenlik duruşu kapıları (denetim A1, A2, A5, A6, A7).
 *
 * NEDEN STATİK TEST: Bu maddelerin hepsi "yayınlanan dosyalarda ne var" sorusudur
 * ve tarayıcı açmadan doğrulanabilir. Canlı ölçüm (Lighthouse/axe) ayrı iş; burada
 * amaç, bir sonraki düzenlemenin sessizce geri almasını engellemek — örneğin
 * tema betiğinin yeniden `index.html` içine satır içi yazılması CSP'de anında
 * ihlal üretiyordu.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
const exists = (relative: string) => existsSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)));

const indexHtml = read("index.html");
const headers = read("public/_headers");
const themeBoot = read("public/theme-boot.js");

/** `_headers` içindeki bir bloktaki başlığı (küçük harf) döndürür. */
function headerOf(selector: string, name: string): string {
  const lines = headers.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === selector);
  if (start === -1) return "";
  const collected: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || !line.startsWith("  ")) break;
    collected.push(line);
  }
  for (const line of collected) {
    const [key, ...rest] = line.trim().split(":");
    if (key.toLowerCase() === name.toLowerCase()) return rest.join(":").trim();
  }
  return "";
}

describe("A1 — tema önyüklemesi CSP ile uyumlu", () => {
  it("tema betiği satır içi DEĞİL, ayrı dosyadan ve senkron yüklenir", () => {
    expect(indexHtml).toContain('<script src="/theme-boot.js"></script>');
    // Satır içi tema kodunun geri gelmesi CSP ihlali üretir.
    expect(indexHtml).not.toContain("localStorage.getItem(\"atlasia.theme.v1\")");
    expect(exists("public/theme-boot.js")).toBe(true);
  });

  it("index.html içinde src'siz script yok (uygulama verisi hariç)", () => {
    const inline = [...indexHtml.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)]
      .map((match) => match[1])
      .filter((attrs) => !attrs.includes("application/ld+json"));
    expect(inline).toEqual([]);
  });

  it("tema paleti useTheme ile aynı üç renk kodunu taşır", () => {
    const hook = read("src/hooks/useTheme.ts");
    for (const color of ["#ffffff", "#021512", "#071827"]) {
      expect(themeBoot.toLowerCase()).toContain(color);
      expect(hook.toLowerCase()).toContain(color);
    }
  });
});

describe("A2 — Google ile giriş popup'ı CSP'de açık", () => {
  it("apis.google.com script-src, connect-src ve frame-src içinde", () => {
    const policy = headerOf("/*", "content-security-policy");
    for (const directive of ["script-src", "connect-src", "frame-src"]) {
      const part = policy.split(";").map((chunk) => chunk.trim()).find((chunk) => chunk.startsWith(`${directive} `));
      expect(part, `${directive} bulunamadı`).toBeTruthy();
      expect(part).toContain("https://apis.google.com");
    }
  });
});

describe("A5 — HSTS", () => {
  it("includeSubDomains var; preload yok (apex başvurusu yapılmadan girilmez)", () => {
    const hsts = headerOf("/*", "strict-transport-security");
    expect(hsts).toContain("max-age=31536000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).not.toContain("preload");
    // Gerekçe dosyada yazılı olmalı; gelecekteki okuyucu "eksik" sanmasın.
    expect(headers).toContain("preload");
  });
});

describe("A6 — kaynak haritaları yayında değil, CI'da saklı", () => {
  it("derleme gizli source map üretir ve taşıma adımı bağlıdır", () => {
    expect(read("vite.config.ts")).toContain('sourcemap: "hidden"');
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.postbuild).toContain("collect-sourcemaps.mjs");
    expect(exists("scripts/collect-sourcemaps.mjs")).toBe(true);
  });

  it("taşınan haritalar depoya girmez ve SW kapısı onları saymaz", () => {
    expect(read(".gitignore")).toContain("/sourcemaps/");
    expect(read("scripts/verify-sw-shell.mjs")).toContain('!entry.name.endsWith(".map")');
  });

  it("CI haritaları artifact olarak yükler (SHA pinli)", () => {
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9");
    expect(workflow).toContain("path: sourcemaps/");
  });
});

describe("A7 — satır sonları platformdan bağımsız", () => {
  it("kural dosyaları depoda LF'e sabitlenir", () => {
    const attributes = read(".gitattributes");
    expect(attributes).toContain("/firestore.rules text eol=lf");
  });

  it("kural ayrıştırıcı CRLF'i de kabul eder", () => {
    expect(read("scripts/rules-inventory.mjs")).toContain("split(/\\r?\\n/)");
    expect(read("scripts/firestore-backup.mjs")).toContain("split(/\\r?\\n/)");
  });
});

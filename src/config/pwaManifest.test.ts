/**
 * İŞ 5 — PWA kilidi: kurulabilirlik, güncelleme akışı ve önbellek sınırları.
 *
 * Bu testler dosyaları **statik** okur; tarayıcı çalıştırmaz. Amaç, manifest
 * alanlarının ya da service worker güvenlik sınırlarının sessizce kaybolmasını
 * engellemek (depoda aynı yaklaşım `cloudflareHeaders.test.ts` içinde var).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)), "utf8");
const exists = (relative: string) => existsSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)));

const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
  id?: string;
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  shortcuts?: Array<{ name: string; url: string; icons?: Array<{ src: string; sizes: string }> }>;
};
const sw = read("public/sw.js");
const main = read("src/main.tsx");
const headers = read("public/_headers");

function swBlock(marker: string): string {
  const start = sw.indexOf(marker);
  if (start < 0) throw new Error(`SW bloğu yok: ${marker}`);
  const open = sw.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < sw.length; i += 1) {
    if (sw[i] === "{") depth += 1;
    else if (sw[i] === "}") {
      depth -= 1;
      if (depth === 0) return sw.slice(open + 1, i);
    }
  }
  throw new Error(`SW bloğu kapanmadı: ${marker}`);
}

describe("manifest — kurulabilirlik", () => {
  it("kimlik, kapsam ve tek başına görünüm tanımlı", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe("standalone");
    expect(manifest.name).toBe("Atlasia");
    expect(manifest.short_name).toBe("Atlasia");
  });

  it("192 ve 512 ikonları var; maskable ayrı dosya", () => {
    const icons = manifest.icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    // Android uyarlanabilir ikonu logoyu kırpmasın: maskable ayrı, dolgulu dosya.
    const maskable = icons.find((icon) => icon.purpose === "maskable");
    expect(maskable).toBeDefined();
    expect(maskable?.sizes).toBe("512x512");
    expect(maskable?.src).toContain("maskable");
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(exists(`public/${icon.src}`)).toBe(true);
    }
  });

  it("kısayollar var ve dosya içi hedefler gösteriyor", () => {
    const shortcuts = manifest.shortcuts ?? [];
    expect(shortcuts.length).toBeGreaterThanOrEqual(2);
    for (const shortcut of shortcuts) {
      expect(shortcut.name.length).toBeGreaterThan(1);
      expect(shortcut.url.startsWith("./")).toBe(true);
      expect(shortcut.icons?.[0]?.sizes).toBe("192x192");
    }
    // Kısayol hedefleri uygulamada karşılığı olan eylemler olmalı (?tab=…).
    expect(shortcuts.every((shortcut) => shortcut.url.includes("tab="))).toBe(true);
  });
});

describe("service worker — güncelleme akışı", () => {
  it("install adımı sessizce skipWaiting çağırmıyor", () => {
    expect(swBlock('self.addEventListener("install"')).not.toContain("skipWaiting");
  });

  it("güncelleme yalnız mesajla devreye giriyor", () => {
    const message = swBlock('self.addEventListener("message"');
    expect(message).toContain("SKIP_WAITING");
    expect(message).toContain("skipWaiting");
  });

  it("arayüz bileşeni main.tsx'e bağlı", () => {
    expect(main).toContain('import UpdateNotice from "./components/UpdateNotice"');
    expect(main).toContain("<UpdateNotice />");
    expect(main).toContain("<NetworkStatus />");
  });
});

describe("service worker — önbellek sınırları", () => {
  it("Firebase/Auth/Firestore hiçbir önbellek listesinde yok", () => {
    const allowlist = swBlock("const CACHEABLE_TILE_SOURCES");
    for (const forbidden of ["firebase", "googleapis", "firebaseio", "identitytoolkit", "google.com"]) {
      expect(allowlist).not.toContain(forbidden);
    }
  });

  it("çapraz kaynak istekler yalnız karo izin listesiyle ele alınıyor", () => {
    expect(sw).toContain("if (parsed.origin !== self.location.origin");
    expect(sw).toContain("isCacheableTile");
  });

  it("karo önbelleği boyutla sınırlı, dış API'ler önbelleklenmiyor", () => {
    expect(sw).toMatch(/TILE_CACHE_MAX = \d+/);
    for (const api of ["api.open-meteo.com", "photon.komoot.io"]) {
      expect(sw).not.toContain(api);
    }
  });

  it("sw.js için no-cache başlığı tanımlı", () => {
    expect(headers).toMatch(/\/sw\.js[\s\S]{0,80}Cache-Control: no-cache, no-store, must-revalidate/);
  });
});

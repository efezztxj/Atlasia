/**
 * Atlasia — modül boyutu ratchet kapısı (F1-0).
 *
 * NEDEN VAR: `src/components/Explorer.tsx` 1.796 satıra, 58 `useState`'e çıktı;
 * her yeni özellik aynı dosyaya dokunuyor. Bunu bir defa bölmek yetmez —
 * bölündükten sonra dosyanın yeniden büyümesini engelleyen bir kapı yoksa
 * aynı borç 3 ayda geri gelir. Bu dosya o kapıdır.
 *
 * KURAL: `src/` altındaki hiçbir kaynak dosya **500 satırdan** uzun olamaz.
 * Bugünkü 12 dosya "borç defteri"nde (DEBT) tutulur; her satır o dosyanın
 * **bugünkü boyutuyla üst sınırdır**:
 *   · dosya büyürse test kırmızı (ratchet kapalı yönde çalışır),
 *   · dosya 500'ün altına inerse kayıt **silinmek zorunda** (defter şişemez).
 * Deftere yeni satır eklemek, PR'da açık gerekçe isteyen bilinçli bir karardır;
 * bu yüzden defter boyutu ayrıca test edilir.
 *
 * Kapsam bilinçli olarak `src/**` ile sınırlı: `public/sw.js`, `scripts/*.mjs`
 * ve `firestore.rules` kendi kapılarına (sw.node-test, bundle-budget, kural
 * testleri) sahiptir.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LIMIT = 500;

/**
 * Borç defteri — ölçüm: 2026-11-01, `main` @ `c19eff7`.
 * Değer = o tarihteki satır sayısı (= üst sınır). Aşağı çekmek serbest,
 * yukarı çekmek faz geri alınmadan yapılamaz.
 */
const DEBT: Readonly<Record<string, number>> = Object.freeze({
  "src/components/Explorer.tsx": 627,
  "src/lib/moderation.ts": 1199,
  "src/components/SocialPanel.tsx": 936,
  "src/lib/firestoreData.ts": 972,
  "src/components/MapView.tsx": 812,
  "src/lib/groups.ts": 775,
  "src/utils/track.ts": 655,
  "src/components/ReportsPanel.tsx": 635,
  "src/components/GroupsPanel.tsx": 584,
  "src/utils/weather.ts": 570,
  "src/hooks/useFirestoreAtlasData.ts": 569,
  "src/utils/mapWeather.ts": 530,
});

/** Defterin büyümemesi için üst sınır: bugünkü kayıt sayısı. */
const DEBT_ENTRY_CAP = Object.keys(DEBT).length;

const SOURCE_FILE = /\.(?:ts|tsx)$/;

function walk(directory: string, found: string[] = []): string[] {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name).split("\\").join("/");
    if (statSync(path).isDirectory()) walk(path, found);
    else if (SOURCE_FILE.test(name) && !/\.test\.(?:ts|tsx)$/.test(name)) found.push(path);
  }
  return found;
}

/** `wc -l` ile aynı sayım: yeni satır karakteri sayısı. */
function lineCount(path: string): number {
  const content = readFileSync(path, "utf8");
  return content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
}

const sourceFiles = walk("src");
const oversized = sourceFiles
  .map((path) => ({ path, lines: lineCount(path) }))
  .filter((file) => file.lines > LIMIT);
const undeclared = oversized.filter((file) => !(file.path in DEBT));

function formatFiles(files: ReadonlyArray<{ path: string; lines: number }>): string {
  return files.map((file) => `${file.path} (${file.lines} satır)`).join(", ");
}

describe("modül boyutu — tanrı-bileşen geri gelmesin", () => {
  it("tarama gerçekten kaynak dosyaları görüyor (boş küme yeşil sayılmaz)", () => {
    expect(sourceFiles.length).toBeGreaterThan(100);
    expect(sourceFiles).toContain("src/App.tsx");
    expect(sourceFiles).toContain("src/components/Explorer.tsx");
    // Test dosyaları kapsam dışı: yoksa testlerin kendisi defteri kirletirdi.
    expect(sourceFiles.some((path) => path.endsWith(".test.ts"))).toBe(false);
  });

  it("borç defteri dışında hiçbir dosya 500 satırı geçmiyor", () => {
    expect(undeclared, `Sınırı aşan yeni dosya(lar): ${formatFiles(undeclared)}`).toEqual([]);
  });

  it("defterdeki dosyalar bugünkü boyutlarını aşmıyor (ratchet)", () => {
    const grown = Object.entries(DEBT)
      .map(([path, cap]) => ({ path, cap, lines: lineCount(path) }))
      .filter((entry) => entry.lines > entry.cap)
      .map((entry) => `${entry.path}: ${entry.lines} > ${entry.cap}`);

    expect(grown, `Büyüyen dosya(lar): ${grown.join(", ")}`).toEqual([]);
  });

  it("500'ün altına inen dosya defterden silinir (defter yalnız küçülür)", () => {
    const resolved = Object.entries(DEBT)
      .filter(([path]) => lineCount(path) <= LIMIT)
      .map(([path, cap]) => `${path} (defterde ${cap}, bugün ${lineCount(path)})`);

    expect(resolved, `Defterden çıkarılması gerekenler: ${resolved.join(", ")}`).toEqual([]);
  });

  it("defterdeki her dosya hâlâ var ve defter kendiliğinden büyümüyor", () => {
    for (const path of Object.keys(DEBT)) expect(existsSync(path), `${path} yok`).toBe(true);
    expect(Object.keys(DEBT).length).toBeLessThanOrEqual(DEBT_ENTRY_CAP);
    // Defterdeki her kayıt gerçekten sınırın üstünde olmalı; aksi halde
    // "küçüldü ama silinmedi" durumu sessizce kalırdı.
    for (const [path, cap] of Object.entries(DEBT)) {
      expect(cap, `${path} kaydı ${LIMIT} sınırının altında olamaz`).toBeGreaterThan(LIMIT);
    }
  });
});

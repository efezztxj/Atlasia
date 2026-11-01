/**
 * Atlasia — canlı durum dokümanı kapısı (F0-5).
 *
 * NEDEN VAR: tarihli raporlardaki sayılar kayıyordu (ör. `docs/mvp-denetimi-2026-10-27.md`
 * "152 dosya / 1.233 test", `ROADMAP.md` `App.tsx` için "58 satır" — bugün 88).
 * Çözüm: tarihli raporlar **dondurulmuş kesit** kalır, güncel sayı tek dosyada
 * (`docs/DURUM.md`) üretilir ve **bayatlaması test kırmızısı olur**.
 *
 * Test, betiği alt süreç olarak çalıştırır: böylece kapı, üretimi yapan kodun
 * kendisiyle aynı yolu ölçer (iki ayrı uygulama yok).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = "scripts/state-doc.mjs";
const DOC = "docs/DURUM.md";

function check(env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [SCRIPT, "--check"], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("canlı durum dokümanı — bayat sayı kalmaz", () => {
  it("docs/DURUM.md üretilenle birebir aynı (bayat değil)", () => {
    const result = check();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("güncel");
  });

  it("doküman zorunlu bölümleri ve 'elle düzenlenmez' uyarısını taşır", () => {
    const doc = readFileSync(DOC, "utf8");
    for (const heading of [
      "## 1. Depo ölçeği",
      "## 2. Güvenlik yüzeyi",
      "## 3. Çalışma zamanı",
      "## 4. Zorunlu kapılar",
      "## 5. Ölçülmeyenler",
    ]) {
      expect(doc).toContain(heading);
    }
    expect(doc).toContain("ELLE DÜZENLENMEZ");
    // Sayı uydurmama sözü dokümanda da yazılı olmalı.
    expect(doc).toContain("Toplam test sayısı");
  });

  it("bayat veya eksik doküman sessizce geçmez (negatif kontrol)", () => {
    const dir = mkdtempSync(join(tmpdir(), "atlasia-state-doc-"));
    try {
      const missing = join(dir, "yok.md");
      const missingResult = check({ ATLASIA_STATE_DOC: missing });
      expect(missingResult.status).toBe(1);
      expect(missingResult.stderr).toContain("npm run state:doc");

      const stale = join(dir, "bayat.md");
      writeFileSync(stale, "# elle yazılmış eski durum\n", "utf8");
      const staleResult = check({ ATLASIA_STATE_DOC: stale });
      expect(staleResult.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

#!/usr/bin/env node
/**
 * Lighthouse özeti (S4).
 *
 * NEDEN VAR: CI'da Lighthouse raporu `.lighthouseci/` altına yazılıyor ama
 * artifact indirmek bu ortamda çalışmıyor (GitHub blob adresleri "EOF" veriyor)
 * ve adım log'u API'den okunamıyor. Kırmızının nedenini görebilmek için ölçümün
 * özeti annotation'a basılabilecek tek satırlık metne çevriliyor.
 *
 * Kullanım: node scripts/lighthouse-summary.mjs [dizin]
 * Çıktı: her URL için medyan puan + Core Web Vitals + en pahalı 3 fırsat.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2] ?? ".lighthouseci";

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const seconds = (ms) => (ms === null || ms === undefined ? "—" : `${(ms / 1000).toFixed(2)} sn`);
const score = (value) => (value === null || value === undefined ? "—" : value.toFixed(2));

if (!existsSync(directory)) {
  console.log(`Lighthouse raporu yok: ${directory}`);
  process.exit(0);
}

const reports = readdirSync(directory)
  .filter((name) => name.startsWith("lhr-") && name.endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(join(directory, name), "utf8")));

if (!reports.length) {
  console.log(`Lighthouse raporu bulunamadı: ${directory}`);
  process.exit(0);
}

const groups = new Map();
for (const report of reports) {
  const url = new URL(report.finalDisplayedUrl ?? report.finalUrl ?? report.requestedUrl ?? "http://localhost/");
  const key = `${url.pathname}${url.search}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(report);
}

const lines = [];
for (const [key, runs] of groups) {
  const audit = (id) => median(runs.map((run) => run.audits?.[id]?.numericValue ?? null).filter((v) => typeof v === "number"));
  const categoryScore = (id) => median(runs.map((run) => run.categories?.[id]?.score ?? null).filter((v) => typeof v === "number"));

  lines.push(
    `${key} · perf ${score(categoryScore("performance"))} · a11y ${score(categoryScore("accessibility"))}` +
      ` · LCP ${seconds(audit("largest-contentful-paint"))} · TBT ${audit("total-blocking-time")?.toFixed(0) ?? "—"} ms` +
      ` · CLS ${audit("cumulative-layout-shift")?.toFixed(3) ?? "—"} · FCP ${seconds(audit("first-contentful-paint"))}` +
      ` (${runs.length} koşu)`,
  );

  // En pahalı fırsatlar (yalnız ilk koşudan; fırsat listesi koşular arasında sabit).
  const opportunities = Object.entries(runs[0].audits ?? {})
    .filter(([, value]) => typeof value?.details?.overallSavingsMs === "number" && value.details.overallSavingsMs > 50)
    .sort((a, b) => b[1].details.overallSavingsMs - a[1].details.overallSavingsMs)
    .slice(0, 3)
    .map(([id, value]) => `${id} (-${Math.round(value.details.overallSavingsMs)} ms)`);
  if (opportunities.length) lines.push(`  fırsatlar: ${opportunities.join(" · ")}`);
}

console.log(lines.join("\n"));

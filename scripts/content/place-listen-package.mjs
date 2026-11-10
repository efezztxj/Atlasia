#!/usr/bin/env node
/**
 * Genel dinleme kayıt paketini üretir.
 *
 * TEK KAYNAK: `public/audio/listen/place-listen.json`. Uygulamanın okuduğu
 * metin ile ses ajanına verilen metin aynı olmalı; iki yerde tutulursa biri
 * sessizce kayar. Bu betik JSON'dan CSV, birleşik metin ve tek tek .txt
 * dosyalarını yeniden üretir.
 *
 * Kullanım: `npm run content:listen-paket`
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SOURCE = path.join(ROOT, "public/audio/listen/place-listen.json");
const OUT = path.join(ROOT, "docs/icerik/sesli-anlatim-rehberi/kayit-paketi/genel-dinleme");

/** Mevcut Efes paketiyle aynı kestirim: dakikada ~900 karakter. */
function estimatedSeconds(text) {
  return Math.max(10, Math.round(text.trim().length / 15));
}

function words(text) {
  return text.trim().split(/\s+/).length;
}

function quote(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csv(rows, header) {
  return [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
}

export function buildPackage(raw) {
  const entries = raw.entries;
  const files = new Map();
  const trRows = [];
  const enRows = [];
  const trBlocks = [];
  const enBlocks = [];

  entries.forEach((entry, index) => {
    const no = String(index + 1);
    const tr = entry.tr.text.trim();
    const en = entry.en.text.trim();

    files.set(`metinler/tr-${String(index + 1).padStart(2, "0")}-${entry.id}.txt`, `${tr}\n`);
    files.set(`metinler/en-${String(index + 1).padStart(2, "0")}-${entry.id}.txt`, `${en}\n`);

    trBlocks.push(`=== ${entry.id} ===\n${tr}\n`);
    enBlocks.push(`=== ${entry.id} ===\n${en}\n`);

    trRows.push([
      no,
      entry.id,
      `${entry.id}.mp3`,
      entry.title,
      entry.tr.audio,
      tr.length,
      words(tr),
      estimatedSeconds(tr),
      tr,
    ]);
    enRows.push([
      no,
      entry.id,
      `en-${entry.id}.mp3`,
      entry.title,
      entry.en.audio,
      en.length,
      words(en),
      estimatedSeconds(en),
      en,
    ]);
  });

  files.set(
    "kayit-listesi-tr.csv",
    csv(trRows, ["no", "id", "dosya_adi", "baslik", "hedef_yol", "karakter", "kelime", "tahmini_sure_sn", "seslendirme_metni"]),
  );
  files.set(
    "kayit-listesi-en.csv",
    csv(enRows, ["no", "id", "dosya_adi", "baslik", "hedef_yol", "karakter", "kelime", "tahmini_sure_sn", "seslendirme_metni"]),
  );
  files.set("TUMU-tr.txt", trBlocks.join("\n"));
  files.set("TUMU-en.txt", enBlocks.join("\n"));

  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(SOURCE, "utf8"));
  const files = buildPackage(raw);
  mkdirSync(path.join(OUT, "metinler"), { recursive: true });
  for (const [relative, content] of files) {
    writeFileSync(path.join(OUT, relative), content, "utf8");
  }
  console.log(`Genel dinleme paketi yazıldı: ${files.size} dosya → ${path.relative(ROOT, OUT)}`);
}

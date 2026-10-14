#!/usr/bin/env node
/**
 * Panel dosyalarını (public/**) tek bir JS modülüne gömer: lib/panel-assets.generated.mjs
 * Böylece paketlenmiş exe hiçbir dış dosyaya ihtiyaç duymaz (pkg "assets" ayarına bağımlı değil).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, "lib", "panel-assets.generated.mjs");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

const files = {};
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      const rel = `/${path.relative(PUBLIC, full).split(path.sep).join("/")}`;
      const ext = path.extname(full).toLowerCase();
      const body = fs.readFileSync(full);
      const isText = [".html", ".js", ".css", ".svg", ".json"].includes(ext);
      files[rel] = { type: MIME[ext] || "application/octet-stream", text: isText ? body.toString("utf8") : null, base64: isText ? null : body.toString("base64") };
    }
  }
};
walk(PUBLIC);

if (!files["/index.html"]) {
  console.error("public/index.html bulunamadı — gömme başarısız.");
  process.exit(1);
}

const source = `// OTOMATİK ÜRETİLDİ (scripts/embed-assets.mjs) — elle düzenlemeyin.
// Panel dosyaları derleme anında gömülür; paketlenmiş exe dış dosya aramaz.
const PANEL = ${JSON.stringify(files, null, 2)};

export default PANEL;
export const panelFiles = PANEL;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, source);
console.log(`✓ ${Object.keys(files).length} panel dosyası gömüldü → ${path.relative(ROOT, OUT)} (${(source.length / 1024).toFixed(1)} KB)`);

import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (result.error || !result.stdout) {
  console.error("npm audit çalıştırılamadı.", result.error ?? result.stderr);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("npm audit geçerli JSON üretmedi.", result.stderr || result.stdout);
  process.exit(1);
}

if (report.error) {
  console.error("npm audit API hatası:", report.error.summary ?? report.error);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const packageNames = Object.keys(vulnerabilities);
const totals = report.metadata?.vulnerabilities ?? {};
const total = totals.total ?? packageNames.length;

if (total !== 0 || packageNames.length !== 0) {
  console.error("Üretim bağımlılıklarında açık bulundu; sıfır-açık kapısı geçilemedi.");
  if (packageNames.length) console.error("Etkilenen paketler:", packageNames.join(", "));
  console.error("Seviye toplamları:", JSON.stringify(totals));
  process.exit(1);
}

console.log("Üretim bağımlılıklarında bilinen açık bulunmadı.");

import { spawnSync } from "node:child_process";

const knownPackages = new Set([
  "@firebase/firestore",
  "@firebase/firestore-compat",
  "@grpc/grpc-js",
  "firebase",
]);

const knownAdvisories = new Set([
  "https://github.com/advisories/GHSA-m9gg-hp2v-232j",
  "https://github.com/advisories/GHSA-f596-whhp-79r4",
]);

const maximumKnown = { critical: 0, high: 4, moderate: 0, low: 0 };
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
const unknownPackages = packageNames.filter((name) => !knownPackages.has(name));
const advisoryUrls = new Set(
  Object.values(vulnerabilities)
    .flatMap((item) => item.via ?? [])
    .filter((item) => typeof item === "object" && item.url)
    .map((item) => item.url),
);
const unknownAdvisories = [...advisoryUrls].filter((url) => !knownAdvisories.has(url));
const totals = report.metadata?.vulnerabilities ?? {};
const increasedSeverities = Object.entries(maximumKnown)
  .filter(([severity, maximum]) => (totals[severity] ?? 0) > maximum)
  .map(([severity]) => severity);

if (unknownPackages.length || unknownAdvisories.length || increasedSeverities.length) {
  console.error("Üretim bağımlılığı güvenlik tabanı aşıldı.");
  if (unknownPackages.length) console.error("Yeni etkilenen paketler:", unknownPackages.join(", "));
  if (unknownAdvisories.length) console.error("Yeni advisories:", unknownAdvisories.join(", "));
  if (increasedSeverities.length) console.error("Artan seviyeler:", increasedSeverities.join(", "));
  process.exit(1);
}

if (packageNames.length === 0) {
  console.log("Üretim bağımlılıklarında bilinen açık bulunmadı.");
} else {
  console.log(
    `Yalnız SECURITY.md içinde kayıtlı üretim açıkları görüldü: ${packageNames.join(", ")}.`,
  );
}

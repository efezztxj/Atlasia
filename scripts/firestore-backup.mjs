/**
 * Spark ($0) uyumlu Firestore yerel yedekleme ve bütünlük doğrulama aracı.
 *
 * Google Cloud "Managed Export" (gcloud firestore export gs://...) Blaze planı ve
 * Cloud Storage bucket zorunlu kıldığı için, bu betik Firestore REST v1 okuma uçlarını
 * kullanarak veriyi doğrudan operatörün yerel diskine (git-dışı backups/ klasörüne)
 * NDJSON + SHA-256 manifest olarak indirir.
 *
 * Güvenlik ve kota kilitleri:
 * - Repoda veya VITE_* değişkenlerinde sır tutmaz; çalışma anında kısa ömürlü
 *   FIREBASE_ACCESS_TOKEN (ör. `gcloud auth print-access-token`) bekler ve asla loglamaz.
 * - `--project <id>` zorunludur; `--allow-dev` verilmedikçe `atlasia-dev` reddedilir.
 * - Spark günlük 50.000 okuma kotasını korumak için varsayılan `--max-reads 5000` tavanı uygular.
 * - `--verify <manifest.json>` modu ağa çıkmadan (0 okuma) SHA-256 ve satır sayısı doğrular.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const SPARK_DAILY_READ_LIMIT = 50_000;
export const DEFAULT_MAX_READS = 5_000;
export const HARD_MAX_READS_WITHOUT_OVERRIDE = 25_000;
export const DEFAULT_PAGE_SIZE = 250;

// firestore.rules içindeki alt koleksiyon barındıran üst koleksiyonlar
export const SUBCOLLECTION_ROOTS = new Set(["users", "posts", "groups"]);

export function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sha256OptionalFile(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/**
 * @param {string[]} argv
 */
export function parseBackupArgs(argv) {
  const opts = {
    project: "",
    outDir: "",
    verifyManifest: "",
    maxReads: DEFAULT_MAX_READS,
    pageSize: DEFAULT_PAGE_SIZE,
    allowDev: false,
    allowHighReads: false,
    allSubcollections: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--project") {
      opts.project = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--project=")) {
      opts.project = arg.slice("--project=".length).trim();
    } else if (arg === "--out") {
      opts.outDir = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--out=")) {
      opts.outDir = arg.slice("--out=".length).trim();
    } else if (arg === "--verify") {
      opts.verifyManifest = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--verify=")) {
      opts.verifyManifest = arg.slice("--verify=".length).trim();
    } else if (arg === "--max-reads") {
      opts.maxReads = Number(argv[++i]);
    } else if (arg.startsWith("--max-reads=")) {
      opts.maxReads = Number(arg.slice("--max-reads=".length));
    } else if (arg === "--page-size") {
      opts.pageSize = Number(argv[++i]);
    } else if (arg === "--allow-dev") {
      opts.allowDev = true;
    } else if (arg === "--allow-high-reads") {
      opts.allowHighReads = true;
    } else if (arg === "--all-subcollections") {
      opts.allSubcollections = true;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else {
      throw new Error(`Bilinmeyen argüman: ${arg}`);
    }
  }

  return opts;
}

export function validateBackupOptions(opts, env = process.env) {
  if (opts.verifyManifest) {
    return;
  }

  if (!opts.project) {
    throw new Error(
      "Eksik proje kimliği: `--project <uretim-proje-id>` açıkça yazılmalıdır (.firebaserc varsayılanı kullanılmaz).",
    );
  }

  if (!/^[a-z0-9-]+$/i.test(opts.project)) {
    throw new Error("Geçersiz Firebase proje kimliği biçimi.");
  }

  if (opts.project.toLowerCase() === "atlasia-dev" && !opts.allowDev) {
    throw new Error(
      "Güvenlik kilidi: `atlasia-dev` geliştirme projesidir. Üretim yedeği için canlı proje kimliğini yazın (geliştirme testi için `--allow-dev` ekleyin).",
    );
  }

  if (!Number.isInteger(opts.maxReads) || opts.maxReads < 1) {
    throw new Error("`--max-reads` pozitif tam sayı olmalıdır.");
  }

  if (opts.maxReads > HARD_MAX_READS_WITHOUT_OVERRIDE && !opts.allowHighReads) {
    throw new Error(
      `Kota kilidi: --max-reads (${opts.maxReads}) Spark günlük okuma kotasının yarısını (${HARD_MAX_READS_WITHOUT_OVERRIDE}) aşıyor. Bilinçli ise --allow-high-reads ekleyin.`,
    );
  }

  const token = typeof env.FIREBASE_ACCESS_TOKEN === "string" ? env.FIREBASE_ACCESS_TOKEN.trim() : "";
  if (!token) {
    throw new Error(
      "Eksik erişim belirteci: FIREBASE_ACCESS_TOKEN ortam değişkeni tanımlı değil. Örnek: FIREBASE_ACCESS_TOKEN=\"$(gcloud auth print-access-token)\" node scripts/firestore-backup.mjs --project <id>",
    );
  }
}

export function isMaterializedDocument(doc) {
  return Boolean(doc && (doc.createTime || doc.updateTime || doc.fields));
}

export function toRelativeDocPath(fullName, projectId) {
  const prefix = `projects/${projectId}/databases/(default)/documents/`;
  return fullName.startsWith(prefix) ? fullName.slice(prefix.length) : fullName;
}

export function collectionKeyFromDocPath(relativePath) {
  const segments = relativePath.split("/");
  const collectionSegments = [];
  for (let i = 0; i < segments.length - 1; i += 2) {
    collectionSegments.push(segments[i]);
  }
  return collectionSegments.join("__") || "unknown";
}

function shouldInspectSubcollections(relativePath, allSubcollections) {
  if (allSubcollections) return true;
  const segments = relativePath.split("/");
  return segments.length === 2 && SUBCOLLECTION_ROOTS.has(segments[0]);
}

async function firestoreFetchJson(url, { method = "GET", token, body, fetchImpl = fetch }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetchImpl(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Firestore REST hatası: HTTP ${response.status} (${method})`);
  }

  return response.json();
}

async function listCollectionIds(parentResourcePath, { token, fetchImpl }) {
  const ids = [];
  let pageToken = "";

  do {
    const payload = { pageSize: 100 };
    if (pageToken) payload.pageToken = pageToken;
    const data = await firestoreFetchJson(
      `https://firestore.googleapis.com/v1/${parentResourcePath}:listCollectionIds`,
      { method: "POST", token, body: payload, fetchImpl },
    );
    if (Array.isArray(data.collectionIds)) {
      ids.push(...data.collectionIds);
    }
    pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
  } while (pageToken);

  return ids.sort();
}

/**
 * Canlı Firestore veritabanını Spark okuma kotası tavanıyla yerel NDJSON dosyalarına yedekler.
 */
export async function runBackup(opts, { env = process.env, fetchImpl = fetch, log = console.log, cwd = process.cwd() } = {}) {
  validateBackupOptions(opts, env);
  const token = env.FIREBASE_ACCESS_TOKEN.trim();
  const rootResource = `projects/${opts.project}/databases/(default)/documents`;

  let estimatedReads = 0;
  let phantomParentsVisited = 0;
  /** @type {Map<string, string[]>} */
  const buckets = new Map();

  const chargeReads = (count) => {
    estimatedReads += count;
    if (estimatedReads > opts.maxReads) {
      throw new Error(
        `Kota tavanı aşıldı: tahmini okuma (${estimatedReads}) > --max-reads (${opts.maxReads}). İşlem Spark kotasını korumak için durduruldu.`,
      );
    }
  };

  const exportCollection = async (parentResource, collectionId) => {
    let pageToken = "";
    const encodedCollection = encodeURIComponent(collectionId);

    do {
      const params = new URLSearchParams({
        pageSize: String(opts.pageSize),
        showMissing: "true",
      });
      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const data = await firestoreFetchJson(
        `https://firestore.googleapis.com/v1/${parentResource}/${encodedCollection}?${params.toString()}`,
        { method: "GET", token, fetchImpl },
      );

      const docs = Array.isArray(data.documents) ? data.documents : [];
      chargeReads(Math.max(1, docs.length));

      for (const doc of docs) {
        if (!doc || typeof doc.name !== "string") continue;
        const relativePath = toRelativeDocPath(doc.name, opts.project);

        if (isMaterializedDocument(doc)) {
          const key = collectionKeyFromDocPath(relativePath);
          const serialized = JSON.stringify({
            relativePath,
            name: doc.name,
            createTime: doc.createTime ?? null,
            updateTime: doc.updateTime ?? null,
            fields: doc.fields ?? {},
          });
          const list = buckets.get(key) ?? [];
          list.push(serialized);
          buckets.set(key, list);
        } else {
          phantomParentsVisited += 1;
        }

        if (!opts.dryRun && shouldInspectSubcollections(relativePath, opts.allSubcollections)) {
          const subIds = await listCollectionIds(doc.name, { token, fetchImpl });
          for (const subId of subIds) {
            await exportCollection(doc.name, subId);
          }
        }
      }

      pageToken = !opts.dryRun && typeof data.nextPageToken === "string" ? data.nextPageToken : "";
    } while (pageToken);
  };

  const rootCollections = await listCollectionIds(rootResource, { token, fetchImpl });
  for (const collectionId of rootCollections) {
    await exportCollection(rootResource, collectionId);
  }

  const timestampSlug = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = opts.outDir
    ? resolve(cwd, opts.outDir)
    : resolve(cwd, "backups", `${opts.project}-${timestampSlug}`);

  const collectionEntries = [];
  let totalDocuments = 0;
  let totalBytes = 0;

  for (const key of [...buckets.keys()].sort()) {
    const lines = buckets.get(key) ?? [];
    const content = `${lines.join("\n")}\n`;
    const bytes = Buffer.byteLength(content, "utf8");
    const sha256 = sha256Text(content);
    const relativeFile = `collections/${key}.ndjson`;

    if (!opts.dryRun) {
      const fullPath = join(targetDir, relativeFile);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf8");
    }

    totalDocuments += lines.length;
    totalBytes += bytes;
    collectionEntries.push({
      key,
      file: relativeFile,
      documentCount: lines.length,
      bytes,
      sha256,
    });
  }

  const sparkDailyReadPercent = Number(
    ((estimatedReads / SPARK_DAILY_READ_LIMIT) * 100).toFixed(2),
  );

  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    projectId: opts.project,
    dryRun: opts.dryRun,
    sparkDailyReadLimit: SPARK_DAILY_READ_LIMIT,
    maxReadsCap: opts.maxReads,
    estimatedReads,
    sparkDailyReadPercent,
    phantomParentsVisited,
    totalDocuments,
    totalBytes,
    rulesSha256: sha256OptionalFile(resolve(cwd, "firestore.rules")),
    indexesSha256: sha256OptionalFile(resolve(cwd, "firestore.indexes.json")),
    collections: collectionEntries,
  };

  if (!opts.dryRun) {
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(
      join(targetDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  }

  log(
    `[firestore-backup] project=${opts.project} mode=${opts.dryRun ? "dry-run" : "backup"} collections=${collectionEntries.length} docs=${totalDocuments} reads=${estimatedReads}/${SPARK_DAILY_READ_LIMIT} (${sparkDailyReadPercent}%)`,
  );

  return { targetDir, manifest };
}

/**
 * Yerel yedek klasöründeki manifest.json ve NDJSON dosyalarının SHA-256 + belge sayısı bütünlüğünü doğrular.
 */
export function verifyBackupManifest(manifestPath, { log = console.log } = {}) {
  const resolvedManifest = resolve(manifestPath);
  if (!existsSync(resolvedManifest)) {
    throw new Error(`Manifest bulunamadı: ${resolvedManifest}`);
  }

  const baseDir = dirname(resolvedManifest);
  const manifest = JSON.parse(readFileSync(resolvedManifest, "utf8"));
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.collections)) {
    throw new Error("Geçersiz yedek manifest şeması.");
  }

  let verifiedDocuments = 0;
  for (const entry of manifest.collections) {
    const fullFile = join(baseDir, entry.file);
    if (!existsSync(fullFile)) {
      throw new Error(`Eksik koleksiyon dosyası: ${entry.file}`);
    }
    const content = readFileSync(fullFile, "utf8");
    const actualSha = sha256Text(content);
    if (actualSha !== entry.sha256) {
      throw new Error(`SHA-256 uyuşmazlığı: ${entry.file}`);
    }
    // A7: CRLF'te satır sonundaki \r satırı bozmaz; sayım aynı kalır.
  const nonEmptyLines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length !== entry.documentCount) {
      throw new Error(
        `Belge sayısı uyuşmazlığı (${entry.file}): beklenen ${entry.documentCount}, bulunan ${nonEmptyLines.length}`,
      );
    }
    for (const line of nonEmptyLines) {
      JSON.parse(line);
    }
    verifiedDocuments += nonEmptyLines.length;
  }

  if (verifiedDocuments !== manifest.totalDocuments) {
    throw new Error(
      `Toplam belge sayısı uyuşmazlığı: beklenen ${manifest.totalDocuments}, bulunan ${verifiedDocuments}`,
    );
  }

  log(
    `[firestore-backup] VERIFIED project=${manifest.projectId} collections=${manifest.collections.length} docs=${verifiedDocuments}`,
  );

  return {
    ok: true,
    projectId: manifest.projectId,
    collections: manifest.collections.length,
    totalDocuments: verifiedDocuments,
  };
}

function printUsage(log = console.log) {
  log(`Kullanım:
  FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" node scripts/firestore-backup.mjs --project <uretim-proje-id> [seçenekler]
  node scripts/firestore-backup.mjs --verify backups/<klasor>/manifest.json

Seçenekler:
  --project <id>          Canlı Firebase proje kimliği (zorunlu; atlasia-dev reddedilir)
  --out <klasor>          Çıktı klasörü (varsayılan: backups/<proje>-<zaman>)
  --max-reads <sayi>      Maksimum Firestore okuma tavanı (varsayılan: 5000)
  --dry-run               Diske yazmadan koleksiyon ve Spark kota tahmini yapar
  --all-subcollections    Tüm koleksiyonlarda alt koleksiyon taraması yapar
  --verify <manifest>     Ağa çıkmadan (0 okuma) yerel yedeğin SHA-256 bütünlüğünü doğrular`);
}

export async function runCli(argv = process.argv.slice(2), io = {}) {
  const opts = parseBackupArgs(argv);
  if (opts.help) {
    printUsage(io.log);
    return { help: true };
  }
  if (opts.verifyManifest) {
    return verifyBackupManifest(opts.verifyManifest, io);
  }
  return runBackup(opts, io);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    console.error(`[firestore-backup] HATA: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

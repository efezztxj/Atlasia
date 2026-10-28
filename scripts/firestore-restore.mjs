/**
 * P1-7 / M-58 — Spark ($0) uyumlu Firestore geri yükleme (restore) ve tatbikat aracı.
 *
 * `scripts/firestore-backup.mjs` tarafından üretilen yerel NDJSON + SHA-256 manifest
 * paketini önce çevrimdışı doğrular (`verifyBackupManifest`), ardından varsayılan
 * olarak YALNIZ `--dry-run` planı çıkarır. Gerçek yazma için:
 *  - `--apply` ve `--confirm-project <hedef-id>` açıkça verilmelidir,
 *  - kaynak ile hedef proje aynıysa (`manifest.projectId === targetProject`), canlı
 *    verinin yanlışlıkla ezilmesini önlemek için ayrıca `--allow-overwrite-source` gerekir,
 *  - Spark günlük 20.000 yazma kotasını korumak için varsayılan `--max-writes 2000`
 *    tavanı uygulanır (tek bir belge bile yazılmadan önce kontrol edilir),
 *  - `--emulator 127.0.0.1:8080` ile yerel Firestore emülatörüne $0 maliyetle
 *    geri yükleme tatbikatı yapılabilir.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { verifyBackupManifest } from "./firestore-backup.mjs";

export const SPARK_DAILY_WRITE_LIMIT = 20_000;
export const DEFAULT_MAX_WRITES = 2_000;
export const HARD_MAX_WRITES_WITHOUT_OVERRIDE = 10_000;
export const DEFAULT_COMMIT_BATCH_SIZE = 200;

/**
 * @param {string[]} argv
 */
export function parseRestoreArgs(argv) {
  const opts = {
    manifest: "",
    targetProject: "",
    confirmProject: "",
    collections: /** @type {string[]} */ ([]),
    maxWrites: DEFAULT_MAX_WRITES,
    batchSize: DEFAULT_COMMIT_BATCH_SIZE,
    emulatorHost: "",
    apply: false,
    allowOverwriteSource: false,
    allowHighWrites: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--manifest") {
      opts.manifest = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--manifest=")) {
      opts.manifest = arg.slice("--manifest=".length).trim();
    } else if (arg === "--target-project") {
      opts.targetProject = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--target-project=")) {
      opts.targetProject = arg.slice("--target-project=".length).trim();
    } else if (arg === "--confirm-project") {
      opts.confirmProject = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--confirm-project=")) {
      opts.confirmProject = arg.slice("--confirm-project=".length).trim();
    } else if (arg === "--collections") {
      const raw = (argv[++i] ?? "").trim();
      opts.collections = raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
    } else if (arg.startsWith("--collections=")) {
      const raw = arg.slice("--collections=".length).trim();
      opts.collections = raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
    } else if (arg === "--max-writes") {
      opts.maxWrites = Number(argv[++i]);
    } else if (arg.startsWith("--max-writes=")) {
      opts.maxWrites = Number(arg.slice("--max-writes=".length));
    } else if (arg === "--batch-size") {
      opts.batchSize = Number(argv[++i]);
    } else if (arg === "--emulator") {
      opts.emulatorHost = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--emulator=")) {
      opts.emulatorHost = arg.slice("--emulator=".length).trim();
    } else if (arg === "--apply") {
      opts.apply = true;
    } else if (arg === "--dry-run") {
      opts.apply = false;
    } else if (arg === "--allow-overwrite-source") {
      opts.allowOverwriteSource = true;
    } else if (arg === "--allow-high-writes") {
      opts.allowHighWrites = true;
    } else {
      throw new Error(`Bilinmeyen argüman: ${arg}`);
    }
  }

  return opts;
}

export function validateRestoreOptions(opts, manifest, env = process.env) {
  if (!opts.manifest) {
    throw new Error("Eksik manifest yolu: `--manifest backups/<klasor>/manifest.json` zorunludur.");
  }

  if (!opts.targetProject || !/^[a-z0-9-]+$/i.test(opts.targetProject)) {
    throw new Error("Geçerli bir hedef proje kimliği zorunludur: `--target-project <proje-id>`.");
  }

  if (!Number.isInteger(opts.maxWrites) || opts.maxWrites < 1) {
    throw new Error("`--max-writes` pozitif tam sayı olmalıdır.");
  }

  if (opts.maxWrites > HARD_MAX_WRITES_WITHOUT_OVERRIDE && !opts.allowHighWrites) {
    throw new Error(
      `Kota kilidi: --max-writes (${opts.maxWrites}) Spark günlük yazma kotasının yarısını (${HARD_MAX_WRITES_WITHOUT_OVERRIDE}) aşıyor. Bilinçli ise --allow-high-writes ekleyin.`,
    );
  }

  if (!Number.isInteger(opts.batchSize) || opts.batchSize < 1 || opts.batchSize > 500) {
    throw new Error("`--batch-size` 1 ile 500 arasında tam sayı olmalıdır.");
  }

  if (opts.apply) {
    if (opts.confirmProject !== opts.targetProject) {
      throw new Error(
        `Güvenlik kilidi: gerçek yazma (--apply) için \`--confirm-project ${opts.targetProject}\` açıkça eşleşmelidir.`,
      );
    }

    if (
      manifest.projectId === opts.targetProject &&
      !opts.emulatorHost &&
      !opts.allowOverwriteSource
    ) {
      throw new Error(
        `Üretim ezme kilidi: kaynak proje (${manifest.projectId}) ile hedef proje aynı. Önce ayrı test/emülatör projesine yükleyin; canlı üzerine yazmak zorunluysa --allow-overwrite-source ekleyin.`,
      );
    }

    const token = typeof env.FIREBASE_ACCESS_TOKEN === "string" ? env.FIREBASE_ACCESS_TOKEN.trim() : "";
    if (!opts.emulatorHost && !token) {
      throw new Error(
        "Eksik erişim belirteci: canlı geri yükleme için FIREBASE_ACCESS_TOKEN ortam değişkeni tanımlı olmalıdır (emülatör tatbikatı için `--emulator 127.0.0.1:8080` kullanın).",
      );
    }
  }
}

export function buildCommitEndpoint(targetProject, emulatorHost = "") {
  const base = emulatorHost
    ? `http://${emulatorHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}/v1`
    : "https://firestore.googleapis.com/v1";
  return `${base}/projects/${targetProject}/databases/(default)/documents:commit`;
}

/**
 * Doğrulanmış yedekten geri yükleme planını oluşturur ve `--apply` verilmişse
 * Firestore REST `:commit` uçlarıyla yazar.
 */
export async function runRestore(
  opts,
  { env = process.env, fetchImpl = fetch, log = console.log } = {},
) {
  if (!opts.manifest) {
    throw new Error("Eksik manifest yolu: `--manifest backups/<klasor>/manifest.json` zorunludur.");
  }

  // Adım 1: SHA-256 + satır sayısı bütünlüğünü yazmadan ÖNCE doğrula.
  verifyBackupManifest(opts.manifest, { log });

  const resolvedManifest = resolve(opts.manifest);
  const baseDir = dirname(resolvedManifest);
  const manifest = JSON.parse(readFileSync(resolvedManifest, "utf8"));
  validateRestoreOptions(opts, manifest, env);

  const selectedKeys = opts.collections.length > 0 ? new Set(opts.collections) : null;
  const selectedEntries = manifest.collections.filter((entry) =>
    selectedKeys ? selectedKeys.has(entry.key) : true,
  );

  /** @type {Array<{ name: string; fields: Record<string, unknown> }>} */
  const writes = [];

  for (const entry of selectedEntries) {
    const content = readFileSync(join(baseDir, entry.file), "utf8");
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) {
      const record = JSON.parse(line);
      if (!record || typeof record.relativePath !== "string" || !record.relativePath.includes("/")) {
        throw new Error(`Geçersiz belge yolu (${entry.file}): relativePath eksik.`);
      }
      writes.push({
        name: `projects/${opts.targetProject}/databases/(default)/documents/${record.relativePath}`,
        fields: record.fields && typeof record.fields === "object" ? record.fields : {},
      });
    }
  }

  if (writes.length > opts.maxWrites) {
    throw new Error(
      `Kota tavanı aşıldı: yazılacak belge (${writes.length}) > --max-writes (${opts.maxWrites}). Tek bir belge bile yazılmadan işlem durduruldu.`,
    );
  }

  const sparkDailyWritePercent = Number(
    ((writes.length / SPARK_DAILY_WRITE_LIMIT) * 100).toFixed(2),
  );
  const batches = Math.ceil(writes.length / opts.batchSize);

  if (!opts.apply) {
    log(
      `[firestore-restore] DRY-RUN source=${manifest.projectId} target=${opts.targetProject} collections=${selectedEntries.length} docs=${writes.length} batches=${batches} sparkWrite=${sparkDailyWritePercent}%`,
    );
    return {
      applied: false,
      sourceProject: manifest.projectId,
      targetProject: opts.targetProject,
      collectionsRestored: selectedEntries.length,
      documentsPlanned: writes.length,
      documentsWritten: 0,
      batches,
      sparkDailyWritePercent,
    };
  }

  const endpoint = buildCommitEndpoint(opts.targetProject, opts.emulatorHost);
  const token = opts.emulatorHost
    ? "owner"
    : String(env.FIREBASE_ACCESS_TOKEN ?? "").trim();

  let documentsWritten = 0;
  for (let offset = 0; offset < writes.length; offset += opts.batchSize) {
    const slice = writes.slice(offset, offset + opts.batchSize);
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        writes: slice.map((doc) => ({
          update: {
            name: doc.name,
            fields: doc.fields,
          },
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Firestore REST commit hatası: HTTP ${response.status} (${documentsWritten}/${writes.length} belge yazıldı)`,
      );
    }
    await response.json();
    documentsWritten += slice.length;
  }

  log(
    `[firestore-restore] APPLIED source=${manifest.projectId} target=${opts.targetProject} collections=${selectedEntries.length} docs=${documentsWritten} batches=${batches} sparkWrite=${sparkDailyWritePercent}%`,
  );

  return {
    applied: true,
    sourceProject: manifest.projectId,
    targetProject: opts.targetProject,
    collectionsRestored: selectedEntries.length,
    documentsPlanned: writes.length,
    documentsWritten,
    batches,
    sparkDailyWritePercent,
  };
}

function printUsage(log = console.log) {
  log(`Kullanım:
  # 1. Ön izleme (varsayılan --dry-run; ağa yazmaz, SHA-256 bütünlüğünü doğrular):
  node scripts/firestore-restore.mjs --manifest backups/<klasor>/manifest.json --target-project <hedef-proje>

  # 2. Yerel emülatöre $0 tatbikat:
  node scripts/firestore-restore.mjs --manifest backups/<klasor>/manifest.json --target-project atlasia-restore-drill --confirm-project atlasia-restore-drill --emulator 127.0.0.1:8080 --apply

  # 3. Canlı kurtarma (ayrı kurtarma projesine veya bilinçli kaynak üzerine):
  FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \\
    node scripts/firestore-restore.mjs --manifest backups/<klasor>/manifest.json --target-project <hedef-proje> --confirm-project <hedef-proje> --apply`);
}

export async function runRestoreCli(argv = process.argv.slice(2), io = {}) {
  const opts = parseRestoreArgs(argv);
  if (opts.help) {
    printUsage(io.log);
    return { help: true };
  }
  return runRestore(opts, io);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runRestoreCli().catch((err) => {
    console.error(`[firestore-restore] HATA: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

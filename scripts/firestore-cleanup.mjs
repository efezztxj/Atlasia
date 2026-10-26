/**
 * Spark ($0) uyumlu Firestore süresi dolan veri ve yetim kayıt temizleme aracı (Madde 4).
 *
 * `firestore.rules` gevşetilmeden, istemcilerin silemediği süresi dolmuş / geçici
 * belgeleri (1 GiB Spark depolama sınırını koruyacak şekilde) temizler.
 *
 * Varsayılan davranış GÜVENLİ ÖNİZLEMEDİR (`--dry-run`): `--apply` açıkça
 * verilmedikçe tek bir belge bile silinmez.
 *
 * Kapsam (kalıcı kullanıcı verilerine — places, posts, routes, tracks, userProfiles,
 * friendships, bans, moderators, reports, verifications — ASLA dokunmaz):
 *  1. `stories`                  : `createdAt` > 48 saat (24s canlı pencere + 24s güvenlik payı; en az >=25s)
 *  2. `friendDeclines`           : `createdAt` > 7 gün (geçici ret bildirim kanıtı)
 *  3. `groups/* /joinAttempts`   : `windowStart` > 24 saat (15 dk hız sınırı penceresi)
 *  4. `groups/* /invites`        : `createdAt` > 30 gün (veya `--include-orphans` ile silinmiş grup)
 *  5. `users/* /groupInvites`    : `createdAt` > 30 gün (veya `--include-orphans` ile silinmiş grup)
 *  6. `users/* /notifications`   : okunmuş > 30 gün, okunmamış > 90 gün
 *  7. `feedback`                 : `createdAt` > 180 gün
 *  8. Yetim kayıtlar (`--include-orphans` açık verilirse):
 *     - Silinmiş (phantom) `posts/{postId}` altındaki `replies`
 *     - Silinmiş `/groups/{groupId}` için kalan `users/{uid}/groups/{groupId}` indeksleri
 */

import { isMaterializedDocument, SPARK_DAILY_READ_LIMIT } from "./firestore-backup.mjs";

export const SPARK_DAILY_DELETE_LIMIT = 20_000;
export const DEFAULT_CLEANUP_MAX_READS = 5_000;
export const DEFAULT_CLEANUP_MAX_DELETES = 2_000;
export const COMMIT_BATCH_SIZE = 200;

export const DEFAULT_RETENTION_POLICY = Object.freeze({
  storiesHours: 48,
  friendDeclinesDays: 7,
  joinAttemptsHours: 24,
  invitesDays: 30,
  readNotificationsDays: 30,
  unreadNotificationsDays: 90,
  feedbackDays: 180,
});

// Bu koleksiyonlardan ASLA belge silinmez (savunma amaçlı beyaz/kara liste kilidi)
export const PROTECTED_COLLECTIONS = new Set([
  "places",
  "posts",
  "routes",
  "tracks",
  "userProfiles",
  "friendships",
  "moderators",
  "bans",
  "reports",
  "verifications",
  "blocks",
]);

export function parseCleanupArgs(argv) {
  const opts = {
    project: "",
    apply: false,
    allowDev: false,
    includeOrphans: false,
    maxReads: DEFAULT_CLEANUP_MAX_READS,
    maxDeletes: DEFAULT_CLEANUP_MAX_DELETES,
    pageSize: 250,
    policy: { ...DEFAULT_RETENTION_POLICY },
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--apply") {
      opts.apply = true;
    } else if (arg === "--dry-run") {
      opts.apply = false;
    } else if (arg === "--allow-dev") {
      opts.allowDev = true;
    } else if (arg === "--include-orphans") {
      opts.includeOrphans = true;
    } else if (arg === "--project") {
      opts.project = (argv[++i] ?? "").trim();
    } else if (arg.startsWith("--project=")) {
      opts.project = arg.slice("--project=".length).trim();
    } else if (arg === "--max-reads") {
      opts.maxReads = Number(argv[++i]);
    } else if (arg === "--max-deletes") {
      opts.maxDeletes = Number(argv[++i]);
    } else if (arg === "--stories-hours") {
      opts.policy.storiesHours = Number(argv[++i]);
    } else if (arg === "--invites-days") {
      opts.policy.invitesDays = Number(argv[++i]);
    } else if (arg === "--read-notifications-days") {
      opts.policy.readNotificationsDays = Number(argv[++i]);
    } else if (arg === "--unread-notifications-days") {
      opts.policy.unreadNotificationsDays = Number(argv[++i]);
    } else if (arg === "--feedback-days") {
      opts.policy.feedbackDays = Number(argv[++i]);
    } else {
      throw new Error(`Bilinmeyen argüman: ${arg}`);
    }
  }

  return opts;
}

export function validateCleanupOptions(opts, env = process.env) {
  if (!opts.project) {
    throw new Error(
      "Eksik proje kimliği: `--project <uretim-proje-id>` açıkça yazılmalıdır.",
    );
  }
  if (!/^[a-z0-9-]+$/i.test(opts.project)) {
    throw new Error("Geçersiz Firebase proje kimliği biçimi.");
  }
  if (opts.project.toLowerCase() === "atlasia-dev" && !opts.allowDev) {
    throw new Error(
      "Güvenlik kilidi: `atlasia-dev` geliştirme projesidir (test için `--allow-dev` ekleyin).",
    );
  }
  if (!Number.isInteger(opts.maxReads) || opts.maxReads < 1 || opts.maxReads > 25_000) {
    throw new Error("`--max-reads` 1 ile 25000 arasında tam sayı olmalıdır.");
  }
  if (!Number.isInteger(opts.maxDeletes) || opts.maxDeletes < 1 || opts.maxDeletes > 10_000) {
    throw new Error("`--max-deletes` 1 ile 10000 arasında tam sayı olmalıdır.");
  }
  if (!Number.isFinite(opts.policy.storiesHours) || opts.policy.storiesHours < 25) {
    throw new Error(
      "Canlı hikâye kilidi: `--stories-hours` en az 25 saat olmalıdır (24 saatlik canlı hikâyeler silinemez).",
    );
  }

  const token = typeof env.FIREBASE_ACCESS_TOKEN === "string" ? env.FIREBASE_ACCESS_TOKEN.trim() : "";
  if (!token) {
    throw new Error(
      "Eksik erişim belirteci: FIREBASE_ACCESS_TOKEN ortam değişkeni tanımlı değil.",
    );
  }
}

export function extractTimestampMs(fields, fieldName) {
  const raw = fields && typeof fields === "object" ? fields[fieldName] : null;
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.timestampValue === "string") {
    const parsed = Date.parse(raw.timestampValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof raw.integerValue === "string" || typeof raw.integerValue === "number") {
    const parsed = Number(raw.integerValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function extractBoolean(fields, fieldName) {
  const raw = fields && typeof fields === "object" ? fields[fieldName] : null;
  if (!raw || typeof raw !== "object") return false;
  return raw.booleanValue === true;
}

/**
 * Tek bir belgenin saklama süresinin dolup dolmadığını değerlendirir.
 * Zaman damgası okunamayan veya korunan koleksiyondaki belgeler fail-safe olarak KORUNUR.
 *
 * @returns {{ expired: boolean, reason: string | null }}
 */
export function evaluateDocumentRetention(
  category,
  doc,
  { nowMs = Date.now(), policy = DEFAULT_RETENTION_POLICY, includeOrphans = false, parentExists = true } = {},
) {
  const fields = (doc && doc.fields) || {};
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  switch (category) {
    case "stories": {
      const createdAt = extractTimestampMs(fields, "createdAt");
      if (createdAt === null) return { expired: false, reason: null };
      return createdAt < nowMs - policy.storiesHours * HOUR
        ? { expired: true, reason: `story_older_than_${policy.storiesHours}h` }
        : { expired: false, reason: null };
    }
    case "friendDeclines": {
      const createdAt = extractTimestampMs(fields, "createdAt");
      if (createdAt === null) return { expired: false, reason: null };
      return createdAt < nowMs - policy.friendDeclinesDays * DAY
        ? { expired: true, reason: `friend_decline_older_than_${policy.friendDeclinesDays}d` }
        : { expired: false, reason: null };
    }
    case "feedback": {
      const createdAt = extractTimestampMs(fields, "createdAt");
      if (createdAt === null) return { expired: false, reason: null };
      return createdAt < nowMs - policy.feedbackDays * DAY
        ? { expired: true, reason: `feedback_older_than_${policy.feedbackDays}d` }
        : { expired: false, reason: null };
    }
    case "groups__joinAttempts": {
      const windowStart = extractTimestampMs(fields, "windowStart");
      if (windowStart === null) return { expired: false, reason: null };
      return windowStart < nowMs - policy.joinAttemptsHours * HOUR
        ? { expired: true, reason: `join_attempt_older_than_${policy.joinAttemptsHours}h` }
        : { expired: false, reason: null };
    }
    case "groups__invites":
    case "users__groupInvites": {
      if (includeOrphans && !parentExists) {
        return { expired: true, reason: "orphan_missing_group" };
      }
      const createdAt = extractTimestampMs(fields, "createdAt");
      if (createdAt === null) return { expired: false, reason: null };
      return createdAt < nowMs - policy.invitesDays * DAY
        ? { expired: true, reason: `invite_older_than_${policy.invitesDays}d` }
        : { expired: false, reason: null };
    }
    case "users__notifications": {
      const createdAt = extractTimestampMs(fields, "createdAt");
      if (createdAt === null) return { expired: false, reason: null };
      const isRead = extractBoolean(fields, "read");
      const maxDays = isRead ? policy.readNotificationsDays : policy.unreadNotificationsDays;
      return createdAt < nowMs - maxDays * DAY
        ? {
            expired: true,
            reason: isRead
              ? `read_notification_older_than_${maxDays}d`
              : `unread_notification_older_than_${maxDays}d`,
          }
        : { expired: false, reason: null };
    }
    case "posts__replies": {
      if (includeOrphans && !parentExists) {
        return { expired: true, reason: "orphan_reply_missing_post" };
      }
      return { expired: false, reason: null };
    }
    case "users__groups": {
      if (includeOrphans && !parentExists) {
        return { expired: true, reason: "orphan_group_index_missing_group" };
      }
      return { expired: false, reason: null };
    }
    default:
      return { expired: false, reason: null };
  }
}

function assertNotProtectedDocName(fullName, projectId) {
  const prefix = `projects/${projectId}/databases/(default)/documents/`;
  const rel = fullName.startsWith(prefix) ? fullName.slice(prefix.length) : fullName;
  const segments = rel.split("/");
  if (segments.length === 2 && PROTECTED_COLLECTIONS.has(segments[0])) {
    throw new Error(`Güvenlik kilidi: korunan koleksiyon silinemez (${segments[0]}).`);
  }
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

export async function runCleanup(
  opts,
  { env = process.env, fetchImpl = fetch, nowMs = Date.now(), log = console.log } = {},
) {
  validateCleanupOptions(opts, env);
  const token = env.FIREBASE_ACCESS_TOKEN.trim();
  const root = `projects/${opts.project}/databases/(default)/documents`;

  let estimatedReads = 0;
  /** @type {{ name: string, category: string, reason: string }[]} */
  const candidates = [];
  /** @type {Record<string, number>} */
  const summaryByCategory = {};

  const chargeReads = (count) => {
    estimatedReads += count;
    if (estimatedReads > opts.maxReads) {
      throw new Error(
        `Okuma kotası tavanı aşıldı: (${estimatedReads}) > --max-reads (${opts.maxReads}). Temizlik durduruldu.`,
      );
    }
  };

  const listDocs = async (parentPath, collectionId, { showMissing = false } = {}) => {
    const out = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({ pageSize: String(opts.pageSize) });
      if (showMissing) params.set("showMissing", "true");
      if (pageToken) params.set("pageToken", pageToken);
      const data = await firestoreFetchJson(
        `https://firestore.googleapis.com/v1/${parentPath}/${encodeURIComponent(collectionId)}?${params.toString()}`,
        { method: "GET", token, fetchImpl },
      );
      const docs = Array.isArray(data.documents) ? data.documents : [];
      chargeReads(Math.max(1, docs.length));
      out.push(...docs);
      pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
    } while (pageToken);
    return out;
  };

  const recordCandidate = (category, doc, evalOpts) => {
    if (!isMaterializedDocument(doc) || typeof doc.name !== "string") return;
    const verdict = evaluateDocumentRetention(category, doc, evalOpts);
    if (!verdict.expired || !verdict.reason) return;
    assertNotProtectedDocName(doc.name, opts.project);
    if (candidates.length >= opts.maxDeletes) return;
    candidates.push({ name: doc.name, category, reason: verdict.reason });
    summaryByCategory[category] = (summaryByCategory[category] ?? 0) + 1;
  };

  const baseEval = {
    nowMs,
    policy: opts.policy,
    includeOrphans: opts.includeOrphans,
  };

  // 1) Üst seviye geçici koleksiyonlar: stories, friendDeclines, feedback
  for (const topCategory of ["stories", "friendDeclines", "feedback"]) {
    const docs = await listDocs(root, topCategory);
    for (const doc of docs) {
      recordCandidate(topCategory, doc, baseEval);
    }
  }

  // 2) Gruplar: joinAttempts ve invites (+ canlı grup kimliği kümesi)
  const groupDocs = await listDocs(root, "groups", { showMissing: true });
  const liveGroupIds = new Set();
  for (const groupDoc of groupDocs) {
    if (!groupDoc || typeof groupDoc.name !== "string") continue;
    const groupId = groupDoc.name.split("/").pop() ?? "";
    const groupAlive = isMaterializedDocument(groupDoc);
    if (groupAlive && groupId) {
      liveGroupIds.add(groupId);
    }

    const attempts = await listDocs(groupDoc.name, "joinAttempts");
    for (const attempt of attempts) {
      recordCandidate("groups__joinAttempts", attempt, { ...baseEval, parentExists: groupAlive });
    }

    const invites = await listDocs(groupDoc.name, "invites");
    for (const invite of invites) {
      recordCandidate("groups__invites", invite, { ...baseEval, parentExists: groupAlive });
    }
  }

  // 3) Kullanıcı alt koleksiyonları: notifications, groupInvites (+ yetim groups indeksi)
  const userDocs = await listDocs(root, "users", { showMissing: true });
  for (const userDoc of userDocs) {
    if (!userDoc || typeof userDoc.name !== "string") continue;

    const notifications = await listDocs(userDoc.name, "notifications");
    for (const notif of notifications) {
      recordCandidate("users__notifications", notif, baseEval);
    }

    const groupInvites = await listDocs(userDoc.name, "groupInvites");
    for (const inv of groupInvites) {
      const targetGroupId = typeof inv?.name === "string" ? (inv.name.split("/").pop() ?? "") : "";
      recordCandidate("users__groupInvites", inv, {
        ...baseEval,
        parentExists: liveGroupIds.has(targetGroupId),
      });
    }

    if (opts.includeOrphans) {
      const groupIndexes = await listDocs(userDoc.name, "groups");
      for (const idx of groupIndexes) {
        const targetGroupId = typeof idx?.name === "string" ? (idx.name.split("/").pop() ?? "") : "";
        recordCandidate("users__groups", idx, {
          ...baseEval,
          parentExists: liveGroupIds.has(targetGroupId),
        });
      }
    }
  }

  // 4) İsteğe bağlı yetim yanıtlar: silinmiş (phantom) posts/{postId} altındaki replies
  if (opts.includeOrphans) {
    const postDocs = await listDocs(root, "posts", { showMissing: true });
    for (const postDoc of postDocs) {
      if (!postDoc || typeof postDoc.name !== "string") continue;
      if (isMaterializedDocument(postDoc)) continue;
      const orphanReplies = await listDocs(postDoc.name, "replies");
      for (const reply of orphanReplies) {
        recordCandidate("posts__replies", reply, { ...baseEval, parentExists: false });
      }
    }
  }

  let deletedCount = 0;
  if (opts.apply && candidates.length > 0) {
    for (let i = 0; i < candidates.length; i += COMMIT_BATCH_SIZE) {
      const slice = candidates.slice(i, i + COMMIT_BATCH_SIZE);
      await firestoreFetchJson(`https://firestore.googleapis.com/v1/${root}:commit`, {
        method: "POST",
        token,
        body: {
          writes: slice.map((item) => ({ delete: item.name })),
        },
        fetchImpl,
      });
      deletedCount += slice.length;
    }
  }

  const readPct = Number(((estimatedReads / SPARK_DAILY_READ_LIMIT) * 100).toFixed(2));
  const delPct = Number(((deletedCount / SPARK_DAILY_DELETE_LIMIT) * 100).toFixed(2));

  log(
    `[firestore-cleanup] project=${opts.project} mode=${opts.apply ? "APPLY" : "DRY-RUN"} candidates=${candidates.length} deleted=${deletedCount} reads=${estimatedReads}/${SPARK_DAILY_READ_LIMIT} (${readPct}%) deletes=${deletedCount}/${SPARK_DAILY_DELETE_LIMIT} (${delPct}%)`,
  );

  return {
    projectId: opts.project,
    applied: opts.apply,
    estimatedReads,
    candidateCount: candidates.length,
    deletedCount,
    summaryByCategory,
    candidates,
  };
}

function printUsage(log = console.log) {
  log(`Kullanım:
  # 1) Önce güvenli önizleme (hiçbir şey silmez — varsayılan):
  FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \\
    node scripts/firestore-cleanup.mjs --project <uretim-proje-id>

  # 2) Yedek aldıktan sonra gerçek fiziksel silme:
  FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \\
    node scripts/firestore-cleanup.mjs --project <uretim-proje-id> --apply

Seçenekler:
  --project <id>                  Canlı Firebase proje kimliği (zorunlu; atlasia-dev reddedilir)
  --apply                         Fiziksel silmeyi uygular (verilmezse yalnız dry-run raporlar)
  --include-orphans               Silinmiş grup/gönderi altındaki yetim kayıtları da temizler
  --max-reads <sayi>              Maksimum okuma tavanı (varsayılan: 5000)
  --max-deletes <sayi>            Maksimum silme tavanı (varsayılan: 2000)
  --stories-hours <saat>          Hikâye saklama süresi (varsayılan: 48, minimum: 25)`);
}

export async function runCleanupCli(argv = process.argv.slice(2), io = {}) {
  const opts = parseCleanupArgs(argv);
  if (opts.help) {
    printUsage(io.log);
    return { help: true };
  }
  return runCleanup(opts, io);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runCleanupCli().catch((err) => {
    console.error(`[firestore-cleanup] HATA: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

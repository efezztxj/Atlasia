/**
 * P4 — Verilerimi indir (KVKK md. 11).
 * Kullanıcının KENDİ verisini tek bir JSON dosyasında toplar. Başka kullanıcının
 * verisi dahil edilmez: grup mesajlarında yalnız kendi mesajları, arkadaşlıkta
 * yalnız karşı tarafın uid ve adı (arkadaş indeksi) yer alır.
 *
 * KARAR: hata yutulmaz. Herhangi bir okuma başarısız olursa dosya üretilmez
 * (kısmi dosya yok) ve hata çağırana iletilir.
 * KARAR: cihaz hesabında veri yalnız yerel depodan (atlasia.*.v2) okunur; Firestore'a
 * dokunulmaz.
 */
import {
  collection,
  collectionGroup,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { storageGet } from "../utils/storage";
import type { AccountBackend } from "./moderation";

export const ACCOUNT_EXPORT_SCHEMA_VERSION = 1;

const EXPORT_PAGE_SIZE = 20;
const EXPORT_MAX_PAGES = 500;

/** Cihaz yerel deposunda kullanıcının gönderilerini tutan anahtarlar (useAtlasData ile aynı). */
const DEVICE_KEYS = {
  places: "atlasia.places.v2",
  posts: "atlasia.posts.v2",
  stories: "atlasia.stories.v2",
} as const;

export interface AccountExportInput {
  uid: string;
  backend: AccountBackend;
  account?: { displayName?: string | null; email?: string | null } | null;
}

export interface AccountExportFile {
  schemaVersion: number;
  exportedAt: string;
  uid: string;
  backend: AccountBackend;
  account: { displayName: string | null; email: string | null } | null;
  /** Koleksiyon adı → kayıt dizisi. Her kayıt `id` alanı taşır. */
  collections: Record<string, Array<Record<string, unknown>>>;
}

export type ExportRecord = Record<string, unknown>;

function exportError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

/**
 * Firestore değerini JSON'a çevirir: Timestamp → ISO metni; dizi/nesne özyinelemeli;
 * belge referansı → yol metni. Tanınmayan nesneler sessizce atılmaz, hata verir.
 */
export function toExportValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => toExportValue(item));
  if (typeof value === "object") {
    const candidate = value as { toDate?: unknown; path?: unknown };
    if (typeof candidate.toDate === "function") {
      const date = (candidate.toDate as () => unknown).call(value);
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
      throw exportError("export/invalid-timestamp", "Tarih alanı okunamadı.");
    }
    if (typeof candidate.path === "string") return candidate.path;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      out[key] = toExportValue(item);
    }
    return out;
  }
  throw exportError("export/unsupported-value", "Desteklenmeyen veri türü dışa aktarılamadı.");
}

/** Kayıt: kimlik + alanlar (Timestamp dönüşümlü). */
export function toExportRecord(id: string, data: Record<string, unknown>): ExportRecord {
  return { id, ...(toExportValue(data) as Record<string, unknown>) };
}

/** Dosya gövdesini kurar. Saf fonksiyon: ağ ve depo yok. */
export function buildAccountExport(
  input: AccountExportInput,
  collections: Record<string, ExportRecord[]>,
  exportedAt: Date = new Date(),
): AccountExportFile {
  return {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    uid: input.uid,
    backend: input.backend,
    account: input.account
      ? { displayName: input.account.displayName ?? null, email: input.account.email ?? null }
      : null,
    collections,
  };
}

export function serializeAccountExport(file: AccountExportFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

function requireDb() {
  if (!db) throw exportError("data/unavailable", "Firestore hazır değil; veri dışa aktarılamadı.");
  return db;
}

/**
 * Sorguyu sayfa sayfa okur (imleç: belge kimliği). Sınır aşılırsa hata verir.
 * Her sayfa en fazla EXPORT_PAGE_SIZE kayıt döndürür (kurallardaki boundedList ile uyumlu).
 */
async function readAllPages(
  base: () => { ref: Query; constraints: QueryConstraint[] },
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const out: Array<{ id: string; data: Record<string, unknown> }> = [];
  let cursor: QueryDocumentSnapshot | null = null;
  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const { ref, constraints } = base();
    const cursorConstraints: QueryConstraint[] = cursor ? [startAfter(cursor)] : [];
    const snap = await getDocs(query(ref, ...constraints, orderBy(documentId()), ...cursorConstraints, limit(EXPORT_PAGE_SIZE)));
    if (snap.size === 0) return out;
    for (const item of snap.docs) out.push({ id: item.id, data: item.data() as Record<string, unknown> });
    cursor = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < EXPORT_PAGE_SIZE) return out;
  }
  throw exportError("data/export-incomplete", "Veri dışa aktarma sınırına ulaşıldı; kısmi dosya üretilmedi.");
}

/** Kullanıcının kendi sahip alanına göre filtrelenmiş üst düzey koleksiyon. */
async function readOwnedTopLevel(firestore: ReturnType<typeof requireDb>, uid: string, collectionName: string, uidField: string) {
  const rows = await readAllPages(() => ({
    ref: collection(firestore, collectionName),
    constraints: [where(uidField, "==", uid)],
  }));
  return rows.map((row) => toExportRecord(row.id, row.data));
}

/** Kullanıcının alt koleksiyonu (users/{uid}/...). Tümü sahibinindir. */
async function readOwnSubcollection(firestore: ReturnType<typeof requireDb>, uid: string, subcollection: string) {
  const rows = await readAllPages(() => ({
    ref: collection(firestore, `users/${uid}/${subcollection}`),
    constraints: [],
  }));
  return rows.map((row) => toExportRecord(row.id, row.data));
}

/** Kullanıcının başka gönderilerdeki yanıtları (collection-group, yalnız authorUid == uid). */
async function readOwnReplies(firestore: ReturnType<typeof requireDb>, uid: string) {
  const rows = await readAllPages(() => ({
    ref: collectionGroup(firestore, "replies"),
    constraints: [where("authorUid", "==", uid)],
  }));
  return rows.map((row) => toExportRecord(row.id, row.data));
}

/** Üye olunan gruplardaki yalnız kendi mesajları; grup kimliği her kayda eklenir. */
async function readOwnGroupMessages(firestore: ReturnType<typeof requireDb>, uid: string, groupIds: string[]) {
  const out: ExportRecord[] = [];
  for (const groupId of groupIds) {
    const rows = await readAllPages(() => ({
      ref: collection(firestore, `groups/${groupId}/messages`),
      constraints: [where("senderUid", "==", uid)],
    }));
    for (const row of rows) out.push({ groupId, ...toExportRecord(row.id, row.data) });
  }
  return out;
}

async function readOwnProfile(firestore: ReturnType<typeof requireDb>, uid: string): Promise<ExportRecord[]> {
  const snap = await getDoc(doc(firestore, "userProfiles", uid));
  if (!snap.exists()) return [];
  return [toExportRecord(snap.id, (snap.data() ?? {}) as Record<string, unknown>)];
}

const OWNED_TOP_LEVEL: Array<{ name: string; uidField: string }> = [
  { name: "places", uidField: "authorUid" },
  { name: "posts", uidField: "authorUid" },
  { name: "stories", uidField: "authorUid" },
  { name: "routes", uidField: "authorUid" },
  { name: "tracks", uidField: "authorUid" },
  { name: "reports", uidField: "reporterUid" },
  { name: "blocks", uidField: "blockerUid" },
  { name: "verifications", uidField: "uid" },
  { name: "feedback", uidField: "uid" },
];

const OWN_SUBCOLLECTIONS = ["notifications", "savedPlaces", "savedRoutes", "friendRequests", "blocks", "friends", "groupInvites"] as const;

/**
 * Firebase hesabı: kullanıcının kendi koleksiyonlarını okur. Hiçbir okuma hatası
 * yutulmaz; herhangi biri başarısızsa fırlatılır ve dosya üretilmez.
 */
export async function collectFirestoreExport(uid: string): Promise<Record<string, ExportRecord[]>> {
  const firestore = requireDb();
  const collections: Record<string, ExportRecord[]> = {};

  for (const { name, uidField } of OWNED_TOP_LEVEL) {
    collections[name] = await readOwnedTopLevel(firestore, uid, name, uidField);
  }
  for (const sub of OWN_SUBCOLLECTIONS) {
    collections[`users/${sub}`] = await readOwnSubcollection(firestore, uid, sub);
  }
  collections["users/groups"] = await readOwnSubcollection(firestore, uid, "groups");
  collections.replies = await readOwnReplies(firestore, uid);
  const groupIds = collections["users/groups"].map((row) => String(row.id));
  collections["groups/messages"] = await readOwnGroupMessages(firestore, uid, groupIds);
  collections.userProfiles = await readOwnProfile(firestore, uid);
  return collections;
}

/** Cihaz hesabı: yalnız yerel depo; yalnız bu uid'nin gönderileri. Bozuk veri hata verir. */
export function collectDeviceExport(uid: string): Record<string, ExportRecord[]> {
  const collections: Record<string, ExportRecord[]> = {};
  for (const [name, key] of Object.entries(DEVICE_KEYS)) {
    const raw = storageGet(key);
    if (!raw) {
      collections[name] = [];
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw exportError("export/local-corrupt", `Yerel ${name} verisi okunamadı; dışa aktarma yapılmadı.`);
    }
    if (!Array.isArray(parsed)) throw exportError("export/local-corrupt", `Yerel ${name} verisi beklenen biçimde değil.`);
    collections[name] = parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .filter((item) => item.authorUid === uid)
      .map((item) => toExportRecord(String(item.id ?? ""), item));
  }
  return collections;
}

/** Dışa aktarma: veriyi topla, dosyayı kur, tarayıcıdan indir. Hata çağırana iletilir. */
export async function exportAccountData(input: AccountExportInput): Promise<AccountExportFile> {
  const uid = input.uid.trim();
  if (!uid) throw exportError("auth/required", "Hesap bilgisi geçersiz.");
  const collections = input.backend === "device"
    ? collectDeviceExport(uid)
    : await collectFirestoreExport(uid);
  return buildAccountExport({ ...input, uid }, collections);
}

export function downloadAccountExport(file: AccountExportFile): void {
  const blob = new Blob([serializeAccountExport(file)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `atlasia-verilerim-${file.uid.slice(0, 8)}-${file.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

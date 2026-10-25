/**
 * P20 · Link içi rota paylaşımı (Firestore'suz).
 *
 * **Karar:** Yayınlanmış rota için kalıcı bağlantı (`?route=<id>`, Adım 5)
 * kullanılır; P20 onun ulaşamadığı yeri doldurur — yayınlanmamış /
 * bulut hesabı olmayan kullanıcı da rota paylaşabilsin. Rota, bağlantının
 * **fragment'ında** taşınır: `#r=v1.<base64url(zlib(JSON))>`. Fragment
 * sunucuya hiç gitmez (erişim günlüklerine ve yönlendiren başlıklarına
 * düşmez); hiçbir yere yazılmaz. Alan kişi önizlemeyi görür, kaydetmek
 * açık eylemdir. İlk üretim biçimi olan `?r=` sorgusu da okunmaya devam
 * eder (bkz. `readShareTokenFromUrl`), ama yeni bağlantılar fragment ile
 * üretilir (Tur 4 varsayılan kararı).
 *
 * Gizlilik sözleşmesi (`trackPrivacy` ile aynı kapı):
 * - Bağlantı ancak `resolveTrackShare` onayıyla üretilir (açık eylem +
 *   paylaşım onayı + isteğe bağlı uç kırpma). Ham iz alanları linke giremez.
 * - Kapak fotoğrafı (data URL) bağlantıya sığmaz; çıkarılır ve çağırana
 *   `droppedPhoto` ile bildirilir. Durak hava tahminleri bayatlayacağı için
 *   taşınmaz.
 *
 * Sınırlar (iki yönde de uygulanır):
 * - Token en fazla {@link SHARE_LINK_MAX_CHARS} karakter; üstü "çok büyük".
 * - Açılmış veri en fazla {@link SHARE_PAYLOAD_MAX_BYTES} bayt.
 * - Gelen veri alan alan doğrulanıp **beyaz listeyle yeniden kurulur**;
 *   bilinmeyen alanlar taşınmaz, bozuk/değiştirilmiş bağlantı sessizce
 *   yutulmaz — nedeni kullanıcıya söylenir.
 *
 * `shareLink.ts` yalnız dinamik `import("./utils/shareLink")` ile yüklenir:
 * `fflate` isimlendirilmiş ESM import ile ağaç-budamaya (tree-shaking) girer
 * ve ilk yük paketine taşınmaz; yalnız bağlantı üretilirken/açılırken iner.
 */
import { strFromU8, strToU8, Unzlib, zlibSync } from "fflate";
import type { AtlasRoute, LegMode, RouteDay, RouteLeg, RouteStop, StopType, TransportMode } from "../types";
import { decodePolyline, encodePolyline } from "./polyline";
import { resolveTrackShare, routeLeaksRawTrack } from "./trackPrivacy";

import { SHARE_LINK_PARAM } from "./shareLinkUrl";

export { SHARE_LINK_PARAM };

/**
 * Token üst sınırı. Tipik rota (birkaç gün, duraklar, polyline dizgileri)
 * zlib sonrası bunun çok altında kalır; sınır, bağlantının mesajlaşma
 * uygulamalarında bozulmadan taşınabildiği pratik bölgenin üstünde ama
 * kötüye kullanımı (dev URL) dışarıda bırakacak kadar alçaktır.
 */
export const SHARE_LINK_MAX_CHARS = 12_000;

/** Açılmış JSON üst sınırı: token sınırı varken bile şişirme bombası kapısı. */
export const SHARE_PAYLOAD_MAX_BYTES = 512_000;

const SHARE_VERSION = 1;

export interface ShareLinkRequest {
  /** Kullanıcı açıkça "bağlantı oluştur" dedi mi? */
  userInitiated: boolean;
  /** Paylaşım onay kutusu. Bağlantı = unlisted semantiği; onaysız üretilmez. */
  shareConsent?: boolean;
  /** Baş/son kırpma (m). Varsayılan: trackPrivacy varsayılanı (0). */
  trimEndsMeters?: number;
}

export type ShareEncodeResult =
  | { ok: true; token: string; droppedPhoto: boolean; warnings: string[] }
  | { ok: false; message: string };

export type ShareDecodeResult =
  | { ok: true; route: AtlasRoute }
  | { ok: false; reason: "empty" | "unknown-version" | "corrupt" | "too-large" | "invalid"; message: string };

export const SHARE_LINK_MESSAGES = {
  tooLarge: "Bu rota bağlantı olarak paylaşılamayacak kadar büyük. Bulut hesabıyla yayımlayıp kalıcı bağlantı kullan.",
  notShareable: "Bu rota bağlantı olarak paylaşılamaz (eksik veya geçersiz alan var).",
  empty: "Paylaşım bağlantısı eksik görünüyor.",
  unknownVersion: "Bu bağlantı daha yeni bir Atlasia sürümüyle oluşturulmuş olabilir. Sayfayı güncelleyip tekrar dene.",
  corrupt: "Paylaşım bağlantısı bozuk veya eksik kopyalanmış. Bağlantının tamamını aldığından emin ol.",
  invalid: "Bağlantıdaki rota verisi geçerli bir rotaya benzemiyor; açılmadı.",
} as const;

/* ───────────────────────── base64url ───────────────────────── */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

/* ───────────────────────── tel (wire) biçimi ───────────────────────── */

type WireLeg = Omit<RouteLeg, "coords"> & { coordsPolyline: string };
type WireDay = Omit<RouteDay, "legs"> & { legs?: WireLeg[] };
type WireRoute = Omit<AtlasRoute, "days" | "photo"> & { days: WireDay[] };

interface SharePayloadV1 {
  v: 1;
  route: WireRoute;
}

/** Rotayı bağlantı yüküne çevirir: bacak koordinatları polyline metni olur. */
function toWireRoute(route: AtlasRoute): WireRoute {
  const { photo: _photoDropped, ...rest } = route;
  return {
    ...rest,
    days: route.days.map((day) => ({
      ...day,
      // Hava tahmini varışta bayat olur; alan kişi güncel tahmini kendisi çeker.
      stops: day.stops.map(({ weather: _staleWeather, ...stop }) => stop),
      legs: day.legs?.map(({ coords, ...leg }) => ({ ...leg, coordsPolyline: encodePolyline(coords) })),
    })),
  };
}

/* ───────────────────────── doğrulama (beyaz liste) ───────────────────────── */

const TRANSPORT_MODES: readonly TransportMode[] = ["walking", "cycling", "driving", "transit", "trail", "offroad"];
const STOP_TYPES: readonly StopType[] = [
  "city", "nature", "history", "food", "photo", "camp", "beach",
  "viewpoint", "hidden_gem", "other", "parking", "trailhead", "descent", "water",
];
const LEG_MODES: readonly LegMode[] = [...TRANSPORT_MODES, "descent"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number, fallback = ""): string {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

function finiteNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function latOf(value: unknown): number | null {
  return finiteNumber(value, -90, 90);
}

function lngOf(value: unknown): number | null {
  return finiteNumber(value, -180, 180);
}

function parseStop(value: unknown, index: number): RouteStop | null {
  if (!isRecord(value)) return null;
  const lat = latOf(value.lat);
  const lng = lngOf(value.lng);
  if (lat === null || lng === null) return null;
  const durationMinutes = finiteNumber(value.durationMinutes, 0, 100_000) ?? 0;
  const tips = Array.isArray(value.tips)
    ? value.tips.filter((tip): tip is string => typeof tip === "string").slice(0, 20).map((tip) => tip.slice(0, 500))
    : [];
  const source = value.source === "atlasia" || value.source === "community" || value.source === "openstreetmap"
    ? value.source
    : undefined;
  return {
    order: index + 1,
    name: text(value.name, 200, `Durak ${index + 1}`),
    type: STOP_TYPES.includes(value.type as StopType) ? (value.type as StopType) : "other",
    lat,
    lng,
    startTime: text(value.startTime, 8),
    endTime: text(value.endTime, 8),
    durationMinutes: Math.round(durationMinutes),
    description: text(value.description, 5000),
    aiReason: text(value.aiReason, 2000),
    tips,
    isCommunityPin: value.isCommunityPin === true,
    pinId: typeof value.pinId === "string" && value.pinId.length <= 128 ? value.pinId : null,
    category: text(value.category, 120),
    imageUrl: safeShareImageUrl(value.imageUrl),
    ...(source ? { source } : {}),
  };
}

/**
 * Paylaşım bağlantısından gelen fotoğraf adresi yalnız bilinen fotoğraf
 * kaynaklarından olabilir. Aksi hâlde bağlantıyı hazırlayan, CSP'nin izin
 * verdiği genel bir sunucuya (ör. s3.amazonaws.com) koyduğu görselle açan
 * kişinin IP'sini ve açılış anını izleyebilirdi (izleme pikseli).
 */
const SHARE_IMAGE_HOSTS = new Set(["images.pexels.com", "upload.wikimedia.org", "commons.wikimedia.org"]);

export function safeShareImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && SHARE_IMAGE_HOSTS.has(url.hostname) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function parseLeg(value: unknown, index: number): RouteLeg | null {
  if (!isRecord(value)) return null;
  if (typeof value.coordsPolyline !== "string" || value.coordsPolyline.length > 250_000) return null;
  const coords = decodePolyline(value.coordsPolyline);
  if (coords.length > 20_000) return null;
  if (!coords.every(([lng, lat]) => latOf(lat) !== null && lngOf(lng) !== null)) return null;
  const distanceKm = finiteNumber(value.distanceKm, 0, 100_000);
  const durationMinutes = finiteNumber(value.durationMinutes, 0, 100_000);
  if (distanceKm === null || durationMinutes === null) return null;
  const elevationGain = value.elevationGain === undefined ? undefined : finiteNumber(value.elevationGain, -100_000, 100_000);
  if (elevationGain === null) return null;
  return {
    id: text(value.id, 128, `leg-${index + 1}`),
    coords,
    mode: LEG_MODES.includes(value.mode as LegMode) ? (value.mode as LegMode) : "walking",
    distanceKm,
    durationMinutes: Math.round(durationMinutes),
    ...(elevationGain !== undefined ? { elevationGain } : {}),
  };
}

function parseDay(value: unknown, index: number): RouteDay | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.stops) || value.stops.length > 100) return null;
  if (typeof value.polyline !== "string" || value.polyline.length > 250_000) return null;
  const stops: RouteStop[] = [];
  for (let stopIndex = 0; stopIndex < value.stops.length; stopIndex += 1) {
    const stop = parseStop(value.stops[stopIndex], stopIndex);
    if (!stop) return null;
    stops.push(stop);
  }
  let legs: RouteLeg[] | undefined;
  if (value.legs !== undefined) {
    if (!Array.isArray(value.legs) || value.legs.length > 64) return null;
    legs = [];
    for (let legIndex = 0; legIndex < value.legs.length; legIndex += 1) {
      const leg = parseLeg(value.legs[legIndex], legIndex);
      if (!leg) return null;
      legs.push(leg);
    }
  }
  return {
    dayNumber: finiteNumber(value.dayNumber, 1, 365) ?? index + 1,
    title: text(value.title, 200),
    summary: text(value.summary, 5000),
    stops,
    polyline: value.polyline,
    ...(legs ? { legs } : {}),
  };
}

/**
 * Bağlantıdan gelen bilinmeyen değeri güvenli bir `AtlasRoute`'a çevirir.
 * Alanlar tek tek doğrulanır; tek bozuk alan bütün rotayı reddeder (yarı
 * geçerli rota sessizce açılmaz). Bilinmeyen alanlar taşınmaz.
 */
export function parseShareRoute(value: unknown): AtlasRoute | null {
  if (!isRecord(value)) return null;
  if (routeLeaksRawTrack(value).length > 0) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  // Kimlik, alıcının kayıtlarında belge kimliği olur: yol ayracı taşıyamaz.
  if (!id || id.length > 128 || id.includes("/") || id === "." || id === "..") return null;
  const routeTitle = typeof value.routeTitle === "string" ? value.routeTitle.trim().slice(0, 160) : "";
  if (!routeTitle) return null;
  const totalDurationHours = finiteNumber(value.totalDurationHours, 0, 1000);
  const totalDistanceKm = finiteNumber(value.totalDistanceKm, 0, 100_000);
  const createdAt = finiteNumber(value.createdAt, 0, Number.MAX_SAFE_INTEGER);
  if (totalDurationHours === null || totalDistanceKm === null || createdAt === null) return null;
  if (!TRANSPORT_MODES.includes(value.transport as TransportMode)) return null;
  if (!Array.isArray(value.days) || value.days.length === 0 || value.days.length > 30) return null;

  const days: RouteDay[] = [];
  for (let dayIndex = 0; dayIndex < value.days.length; dayIndex += 1) {
    const day = parseDay(value.days[dayIndex], dayIndex);
    if (!day) return null;
    days.push(day);
  }

  const alternatives: AtlasRoute["alternatives"] = [];
  if (value.alternatives !== undefined) {
    if (!Array.isArray(value.alternatives) || value.alternatives.length > 20) return null;
    for (const item of value.alternatives) {
      if (!isRecord(item)) return null;
      alternatives.push({ label: text(item.label, 200), prompt: text(item.prompt, 2000) });
    }
  }

  let origin: AtlasRoute["origin"];
  if (value.origin !== undefined) {
    if (!isRecord(value.origin)) return null;
    const lat = latOf(value.origin.lat);
    const lng = lngOf(value.origin.lng);
    if (lat === null || lng === null) return null;
    origin = { lat, lng };
  }

  const dataSources = Array.isArray(value.dataSources)
    ? value.dataSources.filter((item): item is string => typeof item === "string").slice(0, 20).map((item) => item.slice(0, 200))
    : undefined;

  return {
    id,
    routeTitle,
    routeSummary: text(value.routeSummary, 5000),
    totalDurationHours,
    totalDistanceKm,
    transport: value.transport as TransportMode,
    vibe: text(value.vibe, 200),
    days,
    weatherNote: value.weatherNote === null ? null : text(value.weatherNote, 2000) || null,
    alternatives,
    createdAt: Math.round(createdAt),
    ...(typeof value.region === "string" && value.region.trim() ? { region: value.region.trim().slice(0, 120) } : {}),
    ...(dataSources && dataSources.length > 0 ? { dataSources } : {}),
    ...(origin ? { origin } : {}),
  };
}

/* ───────────────────────── üret / aç ───────────────────────── */

/**
 * Rotadan paylaşım token'ı üretir. Gizlilik kapısı (`resolveTrackShare`,
 * "unlisted" semantiği) geçilmeden token oluşmaz; üretilen her token'ın
 * kendi doğrulayıcımızdan geçtiği garanti edilir (açılamayan bağlantı yok).
 */
export async function createRouteShareLink(route: AtlasRoute, request: ShareLinkRequest): Promise<ShareEncodeResult> {
  const decision = resolveTrackShare(route, {
    userInitiated: request.userInitiated,
    visibility: "unlisted",
    shareConsent: request.shareConsent,
    trimEndsMeters: request.trimEndsMeters,
  });
  if (!decision.ok) return { ok: false, message: decision.reason };

  const shareable = decision.route;
  const wire = toWireRoute(shareable);
  if (!parseShareRoute(wire)) return { ok: false, message: SHARE_LINK_MESSAGES.notShareable };

  const payload: SharePayloadV1 = { v: SHARE_VERSION, route: wire };
  const compressed = zlibSync(strToU8(JSON.stringify(payload)), { level: 9 });
  const token = `v${SHARE_VERSION}.${bytesToBase64Url(compressed)}`;
  if (token.length > SHARE_LINK_MAX_CHARS) return { ok: false, message: SHARE_LINK_MESSAGES.tooLarge };

  return {
    ok: true,
    token,
    droppedPhoto: typeof shareable.photo === "string" && shareable.photo.length > 0,
    warnings: decision.warnings,
  };
}

/** Akışlı açma girdisi parçası: 1 KB sıkıştırılmış veri en fazla ~1 MB açılır. */
const INFLATE_CHUNK_BYTES = 1024;

type UnzlibCtor = typeof Unzlib;

/**
 * Sıkıştırma bombasına karşı sınırlı açma: veri parça parça açılır ve açılmış
 * boyut {@link SHARE_PAYLOAD_MAX_BYTES}'ı geçtiği anda durulur. (Tek seferde
 * `unzlibSync` tüm veriyi — en kötü ~9 MB — belleğe açıp sonra ölçüyordu.)
 * Sınır aşılırsa `null`; bozuk veri istisna fırlatır.
 */
export function inflateBounded(bytes: Uint8Array, Unzlib: UnzlibCtor, maxBytes = SHARE_PAYLOAD_MAX_BYTES): Uint8Array | null {
  const parts: Uint8Array[] = [];
  let total = 0;
  let overflow = false;
  let done = false;
  const stream = new Unzlib((chunk, final) => {
    if (overflow) return;
    total += chunk.length;
    if (total > maxBytes) { overflow = true; return; }
    parts.push(chunk);
    if (final) done = true;
  });
  for (let offset = 0; offset < bytes.length && !overflow; offset += INFLATE_CHUNK_BYTES) {
    const end = Math.min(bytes.length, offset + INFLATE_CHUNK_BYTES);
    stream.push(bytes.subarray(offset, end), end === bytes.length);
  }
  if (overflow) return null;
  if (!done) throw new Error("Sıkıştırılmış veri eksik.");
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

/** Token'ı doğrulanmış bir rotaya açar; hiçbir durumda sessizce yutmaz. */
export async function parseRouteShareLink(token: string): Promise<ShareDecodeResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "empty", message: SHARE_LINK_MESSAGES.empty };
  if (trimmed.length > SHARE_LINK_MAX_CHARS) {
    return { ok: false, reason: "too-large", message: SHARE_LINK_MESSAGES.tooLarge };
  }
  const match = /^v(\d+)\.([A-Za-z0-9_-]+)$/.exec(trimmed);
  if (!match) return { ok: false, reason: "corrupt", message: SHARE_LINK_MESSAGES.corrupt };
  if (Number(match[1]) !== SHARE_VERSION) {
    return { ok: false, reason: "unknown-version", message: SHARE_LINK_MESSAGES.unknownVersion };
  }
  const bytes = base64UrlToBytes(match[2]);
  if (!bytes) return { ok: false, reason: "corrupt", message: SHARE_LINK_MESSAGES.corrupt };

  let raw: unknown;
  try {
    const inflated = inflateBounded(bytes, Unzlib);
    if (!inflated) {
      return { ok: false, reason: "too-large", message: SHARE_LINK_MESSAGES.tooLarge };
    }
    raw = JSON.parse(strFromU8(inflated)) as unknown;
  } catch {
    // zlib bütünlük denetimi (Adler-32) veya JSON ayrıştırma: bozuk/değiştirilmiş bağlantı.
    return { ok: false, reason: "corrupt", message: SHARE_LINK_MESSAGES.corrupt };
  }

  if (!isRecord(raw) || raw.v !== SHARE_VERSION) {
    return { ok: false, reason: "invalid", message: SHARE_LINK_MESSAGES.invalid };
  }
  const route = parseShareRoute(raw.route);
  if (!route) return { ok: false, reason: "invalid", message: SHARE_LINK_MESSAGES.invalid };
  return { ok: true, route };
}

// Adres okuma ayrı küçük modülde: App ilk yükte yalnız onu alır, açma/doğrulama kodu tembel yüklenir.
export { buildRouteShareUrl, readShareTokenFromUrl } from "./shareLinkUrl";

/**
 * Genel dinleme metinleri.
 *
 * NEDEN AYRI DOSYA: rehberdeki 28 yerin Türkçe + İngilizce anlatımı yaklaşık
 * 41 kB metin. Bu metinler ana pakete girseydi JS bütçesinin kalan payını
 * (2026-11-10 ölçümü: ~13,6 kB gzip) tek başına tüketirdi. Bu yüzden metinler
 * `/audio/listen/place-listen.json` içinde duruyor; kart açıldığında bir kez
 * çekilip modül düzeyinde önbellekleniyor. Ses dosyaları da aynı klasörde.
 *
 * Sözleşme: her kayıt iki dilli; `audio` her zaman `/audio/listen/` altında.
 * Dosya adı kuralı `<id>.mp3` (TR) ve `en-<id>.mp3` (EN) — testler kilitler.
 */
export type ListenLanguage = "tr" | "en";

export interface PlaceListenText {
  audio: string;
  text: string;
}

export interface PlaceListenEntry {
  id: string;
  title: string;
  tr: PlaceListenText;
  en: PlaceListenText;
}

/** Metinlerin yayın yolu; `public/audio/listen/place-listen.json`. */
export const PLACE_LISTEN_SOURCE = "/audio/listen/place-listen.json";

/** Metnin okunma süresi kestirimi (saniye). Ölçüm: mevcut kayıtlar ~15 karakter/sn. */
export function estimatedListenSeconds(text: string): number {
  return Math.max(10, Math.round(text.trim().length / 15));
}

function readBlock(value: unknown, where: string): PlaceListenText {
  if (!value || typeof value !== "object") throw new Error(`${where}: metin bloğu yok`);
  const block = value as Record<string, unknown>;
  const { audio, text } = block;
  if (typeof audio !== "string" || !audio.startsWith("/audio/listen/") || !audio.endsWith(".mp3")) {
    throw new Error(`${where}: ses yolu /audio/listen/*.mp3 değil`);
  }
  if (typeof text !== "string" || text.trim().length < 120) throw new Error(`${where}: metin çok kısa`);
  return { audio, text: text.trim() };
}

/** Ham JSON'u sözlüğe çevirir; bozuk kayıt sessizce atlanmaz. */
export function parsePlaceListen(raw: unknown): Record<string, PlaceListenEntry> {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { entries?: unknown }).entries)) {
    throw new Error("place-listen: entries dizisi yok");
  }
  const entries = (raw as { entries: unknown[] }).entries;
  const map: Record<string, PlaceListenEntry> = {};
  for (const [index, item] of entries.entries()) {
    if (!item || typeof item !== "object") throw new Error(`place-listen[${index}]: kayıt nesne değil`);
    const record = item as Record<string, unknown>;
    const id = record.id;
    const title = record.title;
    if (typeof id !== "string" || !id.trim()) throw new Error(`place-listen[${index}]: id yok`);
    if (typeof title !== "string" || !title.trim()) throw new Error(`place-listen[${index}]: title yok`);
    if (map[id]) throw new Error(`place-listen: ${id} iki kez tanımlı`);
    map[id] = {
      id,
      title: title.trim(),
      tr: readBlock(record.tr, `${id}.tr`),
      en: readBlock(record.en, `${id}.en`),
    };
  }
  return map;
}

let cache: Promise<Record<string, PlaceListenEntry>> | null = null;

/** Metinleri bir kez çeker. Başarısızlıkta önbellek temizlenir, sonraki açılış yeniden dener. */
export function loadPlaceListen(): Promise<Record<string, PlaceListenEntry>> {
  cache ??= fetch(PLACE_LISTEN_SOURCE, { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Genel dinleme metinleri yüklenemedi (${response.status})`);
      return parsePlaceListen(await response.json());
    })
    .catch((error: unknown) => {
      cache = null;
      throw error instanceof Error ? error : new Error(String(error));
    });
  return cache;
}

export function resetPlaceListenCacheForTests(): void {
  cache = null;
}

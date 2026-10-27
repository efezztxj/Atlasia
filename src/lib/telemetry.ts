/**
 * Atlasia — Ölçüm çekirdeği (hata izleme + olay toplama)
 *
 * Neden kendi modülümüz: ürün 2026-10-27 itibarıyla ne hatayı ne kullanıcı
 * davranışını ölçüyordu; P0-2/P0-3 bu yüzden blokajdı. Üçüncü taraf SDK
 * eklemek paket bütçesini (pay %1,4) ve KVKK yüzeyini büyütürdü. Bu modül
 * bağımlılıksız çalışır ve aktarım katmanı dışarıdan verilebilir.
 *
 * Sözleşme (bilinçli sınırlar):
 * 1. **Rıza kapısı:** Ağa hiçbir şey gönderilmez unless `canSend()` true.
 *    Varsayılan uygulama `analytics` çerez onayına bakar; reddeden kullanıcı
 *    için modül tamamen sessizdir (yalnız bellek içi halka tamponu döner).
 * 2. **PII temizliği:** e-posta, telefon, koordinat, ad, uid, token ve serbest
 *    metin alanları atılır; kalan dizgeler kısaltılır. Gizli değer asla çıkmaz.
 * 3. **Aktarım yoksa gürültü yok:** `VITE_TELEMETRY_ENDPOINT` tanımlı değilse
 *    ağ çağrısı yapılmaz; yalnız geliştirme konsolunda görünür.
 * 4. **Kotayı yakmaz:** toplu gönderim (batch), en fazla 20 kayıt, dakikada en
 *    fazla 12 gönderim, oturumda en fazla 200 olay.
 * 5. **Çökme üretmez:** her dış çağrı try/catch içinde; telemetri hatası
 *    uygulamanın akışını kesmez.
 */

export const TELEMETRY_VERSION = 1;
/** Oturum başına gönderilecek en fazla olay (sonsuz döngü koruması). */
export const MAX_EVENTS_PER_SESSION = 200;
/** Tek gönderimde en fazla kayıt. */
export const MAX_BATCH = 20;
/** Gönderimler arası en kısa süre (ms). */
export const MIN_SEND_INTERVAL_MS = 5_000;
/** Tek bir özellik değerinin en fazla uzunluğu. */
export const MAX_VALUE_CHARS = 300;
/** Özellik nesnesinde en fazla alan. */
export const MAX_PROP_KEYS = 20;

export type TelemetryLevel = "error" | "event";

export interface TelemetryRecord {
  /** Olay/hatar adı: `error`, `app_open`, `place_created` … */
  name: string;
  level: TelemetryLevel;
  /** Epoch ms. */
  at: number;
  /** Sekme ömrü boyunca sabit, rastgele kimlik. Kişiyi tanımlamaz. */
  sessionId: string;
  /** Sorgu dizesi ve hash atılmış sayfa yolu. */
  path: string;
  /** Temizlenmiş özellikler. */
  props: Record<string, string | number | boolean>;
  /** Modül sürümü; toplayıcı tarafında şema ayrımı için. */
  v: number;
}

/**
 * Değeri (veya anahtarı) PII sayılan alanlar. Anahtar eşleşmesi büyük/küçük
 * harf duyarsızdır ve "içerir" mantığıyla çalışır: `userEmail` de düşer.
 */
export const PII_KEY_PATTERNS = [
  "email",
  "mail",
  "phone",
  "tel",
  "gsm",
  "name",
  "ad",
  "soyad",
  "surname",
  "uid",
  "userid",
  "token",
  "password",
  "secret",
  "key",
  "lat",
  "lng",
  "lon",
  "coord",
  "konum",
  "location",
  "address",
  "adres",
  "ip",
  "message",
  "mesaj",
  "text",
  "note",
  "query",
  "sorgu",
  "content",
  "icerik",
  "photo",
  "foto",
] as const;

/** Değer içinde geçerse kaydı atan desenler (kullanıcı metni sızmasın). */
const PII_VALUE_PATTERNS: RegExp[] = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // e-posta
  /\+?\d[\d\s().-]{7,}\d/g, // telefon benzeri sayı dizisi
  /\bdata:image\/[a-z]+;base64,[A-Za-z0-9+/=]{20,}/gi, // base64 görsel
];

function isPiiKey(key: string): boolean {
  const lower = key.toLowerCase();
  return PII_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** Telemetriye gidecek serbest metni PII'den arındırır ve kısaltır. */
export function scrubString(value: string): string {
  let clean = value;
  for (const pattern of PII_VALUE_PATTERNS) {
    clean = clean.replace(pattern, "[gizli]");
  }
  return clean.length > MAX_VALUE_CHARS ? `${clean.slice(0, MAX_VALUE_CHARS)}…` : clean;
}

/** Özellikleri temizler: PII anahtarları atılır, derinlik ve uzunluk sınırlanır. */
export function scrubProps(
  props: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  if (!props) return clean;
  let count = 0;
  for (const [key, raw] of Object.entries(props)) {
    if (count >= MAX_PROP_KEYS) break;
    if (!/^[A-Za-z0-9_]{1,40}$/.test(key)) continue;
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "boolean") {
      // Boolean kişisel veri taşımaz: `hasPhoto` gibi alanlar PII desenine
      // takılsa da (içinde "photo" var) güvenle tutulur.
      clean[key] = raw;
      count += 1;
      continue;
    }
    if (isPiiKey(key)) continue;
    if (typeof raw === "number") {
      if (Number.isFinite(raw)) {
        clean[key] = raw;
        count += 1;
      }
    } else if (typeof raw === "string") {
      if (!raw.trim()) continue;
      clean[key] = scrubString(raw);
      count += 1;
    }
    // Nesne/dizi/fonksiyon bilinçli olarak atılır: iç içe PII denetlenemez.
  }
  return clean;
}

/** Sorgu dizesi ve hash atılmış yol — davet jetonları adres çubuğunda yaşar. */
export function safePath(href: string): string {
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/\/{2,}/g, "/");
    return path.slice(0, 120) || "/";
  } catch {
    return "/";
  }
}

/** Kişiyi tanımlamayan, sekme ömrü boyunca sabit kimlik. */
export function createSessionId(random: () => number = Math.random): string {
  const hex = () => Math.floor(random() * 0xffff).toString(16).padStart(4, "0");
  return `${hex()}${hex()}-${hex()}${hex()}`;
}

export interface TelemetryOptions {
  /** Üretimde `VITE_TELEMETRY_ENDPOINT`; yoksa ağ kapalı. */
  endpoint?: string | null;
  /** Rıza kapısı. Varsayılan çağıran tarafından verilir (çerez onayı). */
  canSend?: () => boolean;
  /** Test enjeksiyonu. */
  now?: () => number;
  /** Test enjeksiyonu; varsayılan `navigator.sendBeacon` → `fetch`. */
  send?: (batch: TelemetryRecord[]) => void;
  /** Kaç oturumda kalacağı; varsayılan `window.location.href`. */
  path?: () => string;
  /** Test enjeksiyonu. */
  sessionId?: string;
  /** Geliştirme görünürlüğü için halka tamponu boyutu. */
  bufferSize?: number;
}

export interface Telemetry {
  /** Hata kaydı. Rıza yoksa yalnız bellekte tutulur. */
  captureError: (error: unknown, props?: Record<string, unknown>) => void;
  /** Serbest olay kaydı; `analytics.ts` bunun üzerine tipli API kurar. */
  track: (name: string, props?: Record<string, unknown>) => void;
  /** Bekleyen kayıtları hemen gönderir (sayfa kapanmadan önce). */
  flush: () => void;
  /** Bellekteki son kayıtlar (geliştirme/teşhis). */
  drainBuffer: () => TelemetryRecord[];
  /** Oturum kimliği (test/teşhis). */
  sessionId: string;
}

/** Hata nesnesinden yalnız güvenli alanları çıkarır. */
export function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name || "Error", message: scrubString(error.message || "") };
  }
  if (typeof error === "string") return { name: "Error", message: scrubString(error) };
  return { name: "Unknown", message: "" };
}

export function createTelemetry(options: TelemetryOptions = {}): Telemetry {
  const now = options.now ?? (() => Date.now());
  const pathOf = options.path ?? (() => (typeof window === "undefined" ? "/" : safePath(window.location.href)));
  const canSend = options.canSend ?? (() => false);
  const sessionId = options.sessionId ?? createSessionId();
  const endpoint = options.endpoint ?? null;
  const bufferSize = options.bufferSize ?? 50;
  const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

  const buffer: TelemetryRecord[] = [];
  let queue: TelemetryRecord[] = [];
  let sessionCount = 0;
  /** `null` = henüz hiç gönderilmedi; ilk kayıt beklemeden çıkar. */
  let lastSendAt: number | null = null;

  const defaultSend = (batch: TelemetryRecord[]) => {
    if (!endpoint) return;
    const body = JSON.stringify(batch);
    // Sayfa kapanırken `fetch` iptal edilebilir; beacon vermeyi dene.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
    if (typeof fetch !== "function") return;
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    }).catch(() => {
      /* Ağ hatası telemetri yüzünden kullanıcıya yansımaz. */
    });
  };
  const send = options.send ?? defaultSend;

  function record(level: TelemetryLevel, name: string, props?: Record<string, unknown>) {
    if (sessionCount >= MAX_EVENTS_PER_SESSION) return;
    sessionCount += 1;
    const entry: TelemetryRecord = {
      name: name.slice(0, 60),
      level,
      at: now(),
      sessionId,
      path: pathOf(),
      props: scrubProps(props),
      v: TELEMETRY_VERSION,
    };
    buffer.push(entry);
    if (buffer.length > bufferSize) buffer.shift();

    if (isDev) {
      // Geliştirmede görünür olsun; üretimde konsol sessiz kalır.
      console.info(`[telemetry:${level}] ${entry.name}`, entry.props);
    }

    let allowed = false;
    try {
      allowed = canSend();
    } catch {
      allowed = false;
    }
    if (!allowed || !endpoint) return;

    queue.push(entry);
    flush();
  }

  function flush() {
    if (!queue.length) return;
    const stamp = now();
    const tooSoon = lastSendAt !== null && stamp - lastSendAt < MIN_SEND_INTERVAL_MS;
    if (tooSoon && queue.length < MAX_BATCH) return;
    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(batch.length);
    lastSendAt = stamp;
    try {
      send(batch);
    } catch {
      /* Gönderim hatası kaydı kaybetmez; kuyrukta kalır (tavan MAX_EVENTS). */
      queue = batch.concat(queue).slice(0, MAX_BATCH * 2);
    }
  }

  return {
    captureError(error, props) {
      const described = describeError(error);
      // `errorType`/`errorDetail` bilinçli adlar: `name`/`message` PII anahtar
      // desenlerine takılıp silinirdi (kullanıcı metni sanılmasın diye).
      record("error", "error", {
        ...props,
        errorType: described.name,
        errorDetail: described.message,
      });
    },
    track(name, props) {
      record("event", name, props);
    },
    flush,
    drainBuffer: () => [...buffer],
    sessionId,
  };
}

/** Uygulama genelinde tek örnek: `main.tsx` kurar, bileşenler `telemetry` kullanır. */
let active: Telemetry = createTelemetry();

export function getTelemetry(): Telemetry {
  return active;
}

/** Test ve giriş noktası için: yeni yapılandırmayla örneği değiştirir. */
export function setTelemetry(next: Telemetry): Telemetry {
  active = next;
  return active;
}

/**
 * Yakalanmamış hata ve reddedilmiş sözleri dinler. Dönen fonksiyon temizler
 * (test ve HMR için). Aynı olay iki kez bağlanmaz.
 */
export function installGlobalErrorHandlers(
  telemetry: Telemetry = getTelemetry(),
  target: Pick<Window, "addEventListener" | "removeEventListener"> | null =
    typeof window === "undefined" ? null : window,
): () => void {
  if (!target) return () => {};

  const onError = (event: Event) => {
    const detail = event as ErrorEvent;
    telemetry.captureError(detail.error ?? detail.message, {
      source: "window.error",
      file: safePath(detail.filename ?? "/"),
      line: Number(detail.lineno) || 0,
    });
  };
  const onRejection = (event: Event) => {
    const detail = event as PromiseRejectionEvent;
    telemetry.captureError(detail.reason, { source: "unhandledrejection" });
  };

  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}

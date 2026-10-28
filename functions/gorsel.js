/**
 * Atlasia — Pexels görsel köprüsü (Cloudflare Pages Function, E7).
 *
 * NEDEN VAR: Rehber fotoğrafları doğrudan `images.pexels.com`'dan çekiliyordu.
 * Sonuçları: (a) her ziyaretçinin IP'si üçüncü tarafa gidiyor (KVKK), (b) CDN
 * adresi değişirse sayfa bozuluyor, (c) o alan adı CSP'de zorunlu kalıyor.
 * Artık tarayıcı yalnız kendi origin'imizi çağırıyor; Pexels'e giden istek
 * sunucudan yapılıyor.
 *
 * GÜVENLİK: Bu bir açık proxy DEĞİL.
 *   - Yalnız `images.pexels.com` host'una ve yalnız `/photos/<sayı>/...` yoluna
 *     izin var (SSRF ve keyfi URL engellenir).
 *   - Yalnız GET/HEAD; yanıt `image/*` değilse geçmez.
 *   - Yanıt `s-maxage` ile kenarda önbelleklenir; Pexels'e trafik artmaz.
 *
 * Kullanım: `/gorsel?u=https%3A%2F%2Fimages.pexels.com%2Fphotos%2F123%2F...`
 */

const ALLOWED_HOST = "images.pexels.com";
const ALLOWED_PATH = /^\/photos\/\d{1,12}\/[A-Za-z0-9._-]{1,120}$/;
const MAX_BYTES = 8 * 1024 * 1024;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
};

export function isAllowedTarget(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.hostname !== ALLOWED_HOST) return false;
  if (!ALLOWED_PATH.test(url.pathname)) return false;
  // Sorgu dizesi Pexels'in kendi boyutlandırma parametreleridir (w/h/fit/auto).
  return url.search.length <= 200;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Yöntem desteklenmiyor", { status: 405, headers: CORS });
  }

  const target = new URL(request.url).searchParams.get("u");
  if (!target) return new Response("Eksik parametre", { status: 400, headers: CORS });
  if (!isAllowedTarget(target)) return new Response("İzin verilmeyen adres", { status: 403, headers: CORS });

  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: { accept: "image/*" },
      // Kenar önbelleği için: aynı adres kısa süre bir kez çekilir.
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
  } catch {
    return new Response("Görsel kaynağına ulaşılamadı", { status: 502, headers: CORS });
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response("Görsel alınamadı", { status: 502, headers: CORS });
  }

  const length = Number(upstream.headers.get("content-length") ?? "0");
  if (length > MAX_BYTES) return new Response("Görsel çok büyük", { status: 413, headers: CORS });

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...CORS,
      "content-type": type,
      // 30 gün tarayıcı, 1 gün kenar: içerik adresi Pexels id'sine sabit.
      "cache-control": "public, max-age=2592000, s-maxage=86400, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

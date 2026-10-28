/**
 * F3 — rota bazlı başlık ve açıklama (çekirdek).
 *
 * NEDEN: Tek sayfa uygulamasında `document.title` ve `meta[name=description]`
 * hep tanıtım metninde kalıyordu. Sonuç: sekme geçmişinde, paylaşım
 * önizlemelerinde ve arama sonuçlarında "Keşfet" ya da "İzlerim" ekranındayken
 * bile aynı başlık görünüyordu.
 *
 * NEDEN İKİ DOSYA: Bu modül **entry** paketine girer (App.tsx kullanır), bu
 * yüzden yalnız tanıtım ve kabuk metinlerini taşır. Uygulama içi yüzeylerin
 * metinleri `appSurfaceMeta.ts` içinde ve tembel yüklenen `Explorer` chunk'ıyla
 * gelir. Böylece ilk boya JS bütçesi (16.700 B) açılmaz.
 *
 * KURAL: Açıklama metinleri kısa (≤ 160 karakter) ve sayfada gerçekten olan
 * şeyi anlatır; "en iyi", "%100 ücretsiz" gibi kanıtsız iddia yok.
 */

export type Surface = "landing";

export interface SurfaceMeta {
  title: string;
  description: string;
}

/**
 * Tanıtım yüzeyi index.html'deki değerlere **geri döner**: aynı metni pakete
 * ikinci kez koymak entry bütçesini boşa harcamak olurdu (16.700 B sınırı).
 * Bu yüzden modül yüklenirken belgedeki mevcut başlık/açıklama saklanır.
 */
interface MetaDocument {
  title: string;
  querySelector(selector: string): { setAttribute(name: string, value: string): void; content?: string } | null;
}

const doc = (): MetaDocument | undefined =>
  typeof document === "undefined" ? undefined : (document as unknown as MetaDocument);

const documentMeta = doc();
const BASE_META: SurfaceMeta = {
  title: documentMeta?.title || "Atlasia — Dünyayı merakınla keşfet",
  // Tanıtım açıklaması index.html'de durur; pakete ikinci kez koymuyoruz
  // (entry bütçesi). Etiket yoksa boş bırakılır ve yazılmaz.
  description: documentMeta?.querySelector('meta[name="description"]')?.content ?? "",
};

export const SURFACE_META: Record<Surface, SurfaceMeta> = {
  landing: BASE_META,
};

/** Bilinmeyen/uygulama yüzeyleri için tanıtım metni değil, nötr kabuk başlığı. */
export function metaFor(surface: string | null | undefined): SurfaceMeta {
  if (surface === "landing") return BASE_META;
  return { title: "Harita — Atlasia", description: "Dünya haritası, gezgin izleri ve rota planlama tek ekranda." };
}

/**
 * Başlığı ve açıklama etiketlerini günceller.
 *
 * `og:title`/`og:description`/`twitter:*` de eşitlenir: SPA paylaşımında bazı
 * botlar bu etiketleri JS çalıştırarak okur; tutarsız kalmak önizlemeyi
 * yanıltıyordu.
 */
export function applyMeta(meta: SurfaceMeta, doc?: MetaDocument): SurfaceMeta {
  const target = doc ?? documentMeta;
  if (!target) return meta;

  target.title = meta.title;
  const pairs: Array<[string, string]> = [
    ['meta[name="description"]', meta.description],
    ['meta[property="og:title"]', meta.title],
    ['meta[property="og:description"]', meta.description],
    ['meta[name="twitter:title"]', meta.title],
    ['meta[name="twitter:description"]', meta.description],
  ];
  for (const [selector, value] of pairs) {
    // Boş değer yazmak mevcut (index.html'den gelen) açıklamayı silerdi.
    if (value) target.querySelector(selector)?.setAttribute("content", value);
  }
  return meta;
}

/** Kısayol: yüzey adı → etiketlere yaz. */
export function applyRouteMeta(surface: string | null | undefined, doc?: MetaDocument): SurfaceMeta {
  return applyMeta(metaFor(surface), doc);
}

/**
 * Atlasia — Kayıtlarım sekme bazlı hata ayrıştırma.
 *
 * Kanıtlanan sorun: `RecordsDock` tek bir `currentError = error ?? savedError`
 * değerini çiziyordu. `savedError` (savedPlaces + savedRoutes dinleyicileri) ve
 * `error` (keşif + özel iz sorguları) dört sekmenin HEPSİNDE gösteriliyordu ve
 * sekme değişince temizlenmiyordu. Sonuç: `savedRoutes` üzerindeki tek bir
 * `permission-denied`, "Yerler / Kaydettiklerim / Rota keşfi / Özel izler"
 * sekmelerinin hepsinde aynı izin hatası gibi görünüyordu.
 *
 * Bu modül saf mantıktır (React/JSX yok) çünkü repo test ortamı `node`'dur ve
 * yalnızca src altındaki .test.ts dosyalarını koşar; bileşen test altyapısı
 * (jsdom + testing-library) kurulu değildir.
 */

export type RecordsTab = "places" | "routes" | "discover" | "tracks";

/**
 * Bir hatanın ait olduğu kaynak. `read` = sekmenin kendi dinleyicisi/sorgusu,
 * `write` = kullanıcının o sekmede tetiklediği yazma işlemi,
 * `shared` = tüm sekmeleri gerçekten ilgilendiren oturum/bağlantı sorunu.
 */
export type RecordsErrorScope = "read" | "write" | "shared";

export interface RecordsError {
  /** Hatanın görünmesi gereken sekme. */
  tab: RecordsTab;
  scope: RecordsErrorScope;
  /** Kullanıcıya gösterilecek mesaj; hangi aşamanın patladığını söyler. */
  message: string;
  /** Firestore hata kodu (varsa). Teşhis için; kullanıcıya ham gösterilmez. */
  code?: string;
  /** Gerçek bir yetki sorunu mu? `false` ise "yok sayıldı" anlamına gelir. */
  genuine?: boolean;
  /** Geçici mi (ağ/oturum)? Kullanıcıya "yeniden dene" önerilebilir. */
  retryable?: boolean;
}

/**
 * Sekme için gösterilecek hataları seçer.
 *
 * Kurallar:
 *  - `shared` kapsamındaki hatalar her sekmede görünür (oturum gerçekten kopmuş).
 *  - Diğer hatalar YALNIZ kendi sekmelerinde görünür.
 *  - Aynı sekmede hem okuma hem yazma hatası varsa yazma hatası önce gelir,
 *    çünkü kullanıcı az önce bir eylem yapmıştır ve onu merak eder.
 *  - `genuine === false` olan hatalar kullanıcıya gösterilmez (ör. var olmayan
 *    bir rota belgesini yoklamanın `permission-denied` yan etkisi). Böylece
 *    gerçek izin hataları gizlenmez, gürültü gizlenir.
 */
export function errorsForTab(tab: RecordsTab, errors: readonly RecordsError[]): RecordsError[] {
  const relevant = errors.filter(
    (error) => error.genuine !== false && (error.scope === "shared" || error.tab === tab),
  );
  const writes = relevant.filter((error) => error.scope === "write");
  const reads = relevant.filter((error) => error.scope !== "write");
  return [...writes, ...reads];
}

/** Sekmede gösterilecek tek ana mesaj (yoksa `null`). */
export function primaryErrorForTab(tab: RecordsTab, errors: readonly RecordsError[]): string | null {
  return errorsForTab(tab, errors)[0]?.message ?? null;
}

/** Kaynak adını `SavedCollectionSource` değerinden sekmeye eşler. */
export function tabForSavedSource(
  source: "saved-places" | "saved-routes" | "saved-routes/detail",
): RecordsTab {
  return source === "saved-places" ? "places" : "routes";
}

/**
 * Yazma hatasının hangi sekmeye ait olduğunu belirler. `saveRoute` hem
 * "Kaydettiklerim" hem "Rota keşfi" sekmesinden tetiklenebildiği için
 * çağıran aktif sekmeyi bildirmelidir; bildirmezse hatayı `routes`'a yazarız.
 */
export function tabForWriteAction(
  action: "savePlace" | "togglePlace" | "saveRoute" | "removeRoute" | "deleteTrack",
  activeTab?: RecordsTab,
): RecordsTab {
  if (action === "savePlace" || action === "togglePlace") return "places";
  if (action === "deleteTrack") return "tracks";
  return activeTab ?? "routes";
}

/**
 * Oturum/bağlantı düzeyinde bir hata mı? Bunlar tek sekmeye indirgenemez;
 * kullanıcının tüm kayıtlarını etkiler ve `shared` olarak işaretlenir.
 */
export function isSharedRecordsError(code: string | undefined, message: string): boolean {
  if (code === "unauthenticated" || code === "unavailable") return true;
  return /oturum|giriş yap|bağlantı/i.test(message);
}

/** Hata listesini sabit tutar: aynı sekme+kapsam+mesaj üçlüsü bir kez kalır. */
export function dedupeRecordsErrors(errors: readonly RecordsError[]): RecordsError[] {
  const seen = new Set<string>();
  const result: RecordsError[] = [];
  for (const error of errors) {
    const key = `${error.tab}|${error.scope}|${error.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(error);
  }
  return result;
}

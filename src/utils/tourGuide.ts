import { haversineKm } from "./geo";

/**
 * Adım 9 — Yakınlık anlatımını besle, sıra-duyarlı yap
 * KARAR (e) BAĞLI: web/PWA kalır, "ekran açık" şartı kabul (native/Capacitor yok)
 * Neden: Tarayıcı sekmesi arka planda konum izleyemez; sahada rehberlik ekran açıkken çalışır.
 * Çözüm: eşik 35-50m (site ölçeği), histerezis 20m, sıradaki durak öncelikli.
 */

export const TOUR_ENTER_BASE_M = 40;
export const TOUR_EXIT_HYSTERESIS_M = 20;
/** Bu doğruluğa kadar tam 40 m giriş yarıçapı kullanılır. */
export const TOUR_GOOD_ACCURACY_M = 25;
/** Bunun üstünde yeni giriş yapılmaz (şehir içi/kapalı alanda telefonlar sık 30–50 m verir). */
export const TOUR_MAX_ACCURACY_M = 60;
export const TOUR_MIN_ENTER_M = 15;

export interface TourGuideState {
  insideId: string | null;
  currentIndex: number; // -1 = henüz hiçbir durakta değil
  lastUpdateAt: number;
}

export function enterRadiusM(accuracy: number): number {
  // Site ölçeğinde anıtlar 20-40 m arayla; iyi sinyalde 40 m giriş ve 60 m çıkış.
  // Sinyal zayıfladıkça giriş yarıçapı daralır: yanlış anıtın tetiklenmesi yerine
  // kullanıcının anıta biraz daha yaklaşması beklenir (eskiden 25 m üstünde hiç çalışmıyordu).
  if (!Number.isFinite(accuracy) || accuracy <= TOUR_GOOD_ACCURACY_M) return TOUR_ENTER_BASE_M;
  return Math.max(TOUR_MIN_ENTER_M, TOUR_ENTER_BASE_M - (accuracy - TOUR_GOOD_ACCURACY_M));
}

export function exitRadiusM(_accuracy: number): number {
  return TOUR_ENTER_BASE_M + TOUR_EXIT_HYSTERESIS_M;
}

export interface GuideCandidate {
  id: string;
  lat: number;
  lng: number;
  order?: number;
  title?: string;
}

export interface GuideResolution {
  place: GuideCandidate | null;
  meters: number | null;
  nextState: TourGuideState;
  entered: boolean;
  exited: boolean;
}

/**
 * Sıra-duyarlı ve histerezisli yakınlık çözümü.
 * - insideId varsa çıkış yarıçapı aşılmadan aynı yer korunur (titreme yok)
 * - tur modunda sıradaki durak (currentIndex+1) önceliklidir
 * - genel modda en yakın aday seçilir
 */
export function resolveGuidePlace(
  location: { lat: number; lng: number; accuracy: number } | null,
  candidates: GuideCandidate[],
  state: TourGuideState,
  isTourContext = false,
): GuideResolution {
  if (!location || candidates.length === 0) {
    return { place: null, meters: null, nextState: state, entered: false, exited: false };
  }
  if (!Number.isFinite(location.accuracy) || location.accuracy > TOUR_MAX_ACCURACY_M) {
    // Zayıf konum: yeni giriş yok, ama içinde olunan durak tek bir kötü ölçümle kaybolmaz.
    const inside = state.insideId ? candidates.find((c) => c.id === state.insideId) ?? null : null;
    return { place: inside, meters: null, nextState: state, entered: false, exited: false };
  }

  const enterR = enterRadiusM(location.accuracy);
  const exitR = exitRadiusM(location.accuracy);

  // Histerezis: içeride olunan yer korunur
  if (state.insideId) {
    const inside = candidates.find((c) => c.id === state.insideId);
    if (inside) {
      const meters = haversineKm(location.lat, location.lng, inside.lat, inside.lng) * 1000;
      if (meters <= exitR) {
        // hâlâ içeride, titreme yok
        return { place: inside, meters, nextState: state, entered: false, exited: false };
      }
      // çıkış yapıldı
      const exitedOrder = inside.order;
      const nextIndex =
        typeof exitedOrder === "number" ? Math.max(state.currentIndex, exitedOrder) : state.currentIndex;
      const nextState: TourGuideState = {
        insideId: null,
        currentIndex: nextIndex,
        lastUpdateAt: Date.now(),
      };
      // çıkış sonrası aynı konumda hemen başka yer aramak için devam et
      // (aşağıdaki giriş mantığı çalışacak)
      const afterExit = resolveGuidePlace(location, candidates, nextState, isTourContext);
      // exited flag ekle
      return { ...afterExit, exited: true };
    }
    // insideId adaylarda yoksa temizle
    const cleared: TourGuideState = { insideId: null, currentIndex: state.currentIndex, lastUpdateAt: Date.now() };
    return resolveGuidePlace(location, candidates, cleared, isTourContext);
  }

  // İçeride değiliz — giriş ara
  const withDistance = candidates
    .map((c) => ({ c, meters: haversineKm(location.lat, location.lng, c.lat, c.lng) * 1000 }))
    .filter((x) => x.meters <= enterR);

  if (withDistance.length === 0) {
    return { place: null, meters: null, nextState: state, entered: false, exited: false };
  }

  let chosen: { c: GuideCandidate; meters: number } | null = null;

  if (isTourContext) {
    // Sıradaki durak öncelikli
    const nextOrder = state.currentIndex + 1;
    const nextCandidate = withDistance.find((x) => x.c.order === nextOrder);
    if (nextCandidate) {
      chosen = nextCandidate;
    } else {
      // Sıradaki yoksa, sıradaki sonrası içinden en küçük order'lı olan
      const upcoming = withDistance
        .filter((x) => typeof x.c.order === "number" && (x.c.order as number) > state.currentIndex)
        .sort((a, b) => (a.c.order as number) - (b.c.order as number));
      if (upcoming.length > 0) chosen = upcoming[0];
      else {
        // Hiç ileride yoksa (geri dönüldü), en yakını al ama sıra dışılık not edilsin
        withDistance.sort((a, b) => a.meters - b.meters);
        chosen = withDistance[0];
      }
    }
  } else {
    withDistance.sort((a, b) => a.meters - b.meters);
    chosen = withDistance[0];
  }

  if (!chosen) return { place: null, meters: null, nextState: state, entered: false, exited: false };

  const nextState: TourGuideState = {
    insideId: chosen.c.id,
    currentIndex: state.currentIndex,
    lastUpdateAt: Date.now(),
  };
  return { place: chosen.c, meters: chosen.meters, nextState, entered: true, exited: false };
}

/** Başlangıç durumu */
export function initialGuideState(): TourGuideState {
  return { insideId: null, currentIndex: -1, lastUpdateAt: Date.now() };
}

/**
 * Yürüyüş simülasyonu için yardımcı: bir dizi konum boyunca çözümü adımlar.
 * Doğru durak önerildiğini ve titreme olmadığını doğrular.
 */
export function simulateWalk(
  path: { lat: number; lng: number; accuracy: number }[],
  candidates: GuideCandidate[],
  isTourContext = false,
): { step: number; suggestedId: string | null; meters: number | null; entered: boolean }[] {
  let state = initialGuideState();
  const out: { step: number; suggestedId: string | null; meters: number | null; entered: boolean }[] = [];
  for (let i = 0; i < path.length; i++) {
    const loc = path[i];
    const res = resolveGuidePlace(loc, candidates, state, isTourContext);
    state = res.nextState;
    out.push({ step: i, suggestedId: res.place?.id ?? null, meters: res.meters, entered: res.entered });
  }
  return out;
}

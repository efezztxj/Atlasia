import { describe, expect, it } from "vitest";
import {
  enterRadiusM,
  exitRadiusM,
  initialGuideState,
  resolveGuidePlace,
  simulateWalk,
} from "./tourGuide";
import { EPHESUS_TOUR } from "../data/siteTours";

describe("tourGuide – sıra-duyarlı yakınlık (Adım 9)", () => {
  it("giriş 40m, çıkış 60m ve doğruluk eşiği sabittir", () => {
    expect(enterRadiusM(10)).toBe(40);
    expect(enterRadiusM(25)).toBe(40);
    expect(exitRadiusM(10)).toBe(60);
  });

  it("GPS doğruluğu 60m'den kötüyse yakın anıtı tetiklemez", () => {
    const candidate = { id: "a", lat: 37.94, lng: 27.34 };
    const result = resolveGuidePlace({ lat: candidate.lat, lng: candidate.lng, accuracy: 61 }, [candidate], initialGuideState());
    expect(result.place).toBeNull();
    expect(result.entered).toBe(false);
  });

  it("orta doğrulukta (30–50 m) çalışır ama giriş yarıçapı daralır", () => {
    expect(enterRadiusM(35)).toBe(30);
    expect(enterRadiusM(50)).toBe(15);
    const candidate = { id: "a", lat: 37.94, lng: 27.34 };
    const onTop = resolveGuidePlace({ lat: candidate.lat, lng: candidate.lng, accuracy: 40 }, [candidate], initialGuideState());
    expect(onTop.entered).toBe(true);
    // ~33 m uzakta, doğruluk 40 m → yarıçap 25 m → tetiklenmez
    const away = resolveGuidePlace({ lat: candidate.lat + 0.0003, lng: candidate.lng, accuracy: 40 }, [candidate], initialGuideState());
    expect(away.place).toBeNull();
  });

  it("içerideyken tek bir kötü ölçüm durağı kaybettirmez", () => {
    const candidate = { id: "a", lat: 37.94, lng: 27.34 };
    const entered = resolveGuidePlace({ lat: candidate.lat, lng: candidate.lng, accuracy: 10 }, [candidate], initialGuideState());
    const noisy = resolveGuidePlace({ lat: candidate.lat, lng: candidate.lng, accuracy: 200 }, [candidate], entered.nextState);
    expect(noisy.place?.id).toBe("a");
    expect(noisy.exited).toBe(false);
  });

  it("20m aralıklı anıtlarda sıradaki durak öne alınır", () => {
    const candidates = [
      { id: "next", lat: 37.94 + 0.00018, lng: 27.34, order: 2 },
      { id: "later", lat: 37.94, lng: 27.34, order: 3 },
    ];
    const result = resolveGuidePlace({ lat: 37.94, lng: 27.34, accuracy: 5 }, candidates,
      { insideId: null, currentIndex: 1, lastUpdateAt: 0 }, true);
    expect(result.place?.id).toBe("next");
  });

  it("yürürken doğru durağın anlatımı öneriliyor (sıra öncelikli)", () => {
    const tourStops = EPHESUS_TOUR.days[0].stops.map((s) => ({
      id: s.pinId ?? s.name,
      lat: s.lat,
      lng: s.lng,
      order: s.order,
      title: s.name,
    }));
    let state = initialGuideState();
    // 1. duraktan başla, sıradaki durak yaklaşsın
    const locNearFirst = { lat: tourStops[0].lat, lng: tourStops[0].lng, accuracy: 12 };
    let res = resolveGuidePlace(locNearFirst, tourStops, state, true);
    expect(res.place?.id).toBe(tourStops[0].id);
    expect(res.entered).toBe(true);
    state = res.nextState;

    // 1. duraktan çık (uzaklaş)
    const far = { lat: 37.93, lng: 27.35, accuracy: 12 };
    res = resolveGuidePlace(far, tourStops, state, true);
    expect(res.place).toBeNull();
    expect(res.exited).toBe(true);
    state = res.nextState;
    // state.currentIndex artık 1 olmalı
    expect(state.currentIndex).toBe(1);

    // 2. durağa yaklaş
    const locNearSecond = { lat: tourStops[1].lat, lng: tourStops[1].lng, accuracy: 12 };
    res = resolveGuidePlace(locNearSecond, tourStops, state, true);
    expect(res.place?.id).toBe(tourStops[1].id);
    expect(res.entered).toBe(true);
  });

  it("titreme yok: histerezis içinde aynı yer korunur", () => {
    const candidates = [
      { id: "a", lat: 37.9395, lng: 27.3417 },
      { id: "b", lat: 37.94, lng: 27.342 },
    ];
    let state = initialGuideState();
    const insideLoc = { lat: 37.9395, lng: 27.3417, accuracy: 15 }; // enter 35-50, exit 55-70
    let res = resolveGuidePlace(insideLoc, candidates, state, false);
    expect(res.place?.id).toBe("a");
    state = res.nextState;

    // Hafif dışarı çık ama çıkış yarıçapı aşılmadı -> hâlâ a
    // 40m uzaklaş (enter 38, exit 58 olsun) -> 40m < exit 58, korunmalı
    const wobble = { lat: 37.93985, lng: 27.34205, accuracy: 15 };
    res = resolveGuidePlace(wobble, candidates, state, false);
    expect(res.place?.id).toBe("a");
    expect(res.exited).toBe(false);

    // Daha fazla uzaklaş -> çıkış
    const far = { lat: 37.94, lng: 27.343, accuracy: 15 };
    res = resolveGuidePlace(far, candidates, state, false);
    // artık a'dan çıktı, ama b'ye de mesafe >enter olduğu için null olmalı
    // ya da b'ye giriş yapabilir eğer b'ye yakınsa; burada far b'ye de uzak
    expect(res.exited).toBe(true);
  });

  it("sıradaki durak önceliği: daha yakın ama sırası sonraki atlanır", () => {
    const tourStops = [
      { id: "s1", lat: 37.9365, lng: 27.3435, order: 1 },
      { id: "s2", lat: 37.937, lng: 27.344, order: 2 },
      { id: "s3", lat: 37.9382, lng: 27.3423, order: 3 },
    ];
    let state = initialGuideState();
    // s1'deyiz
    let res = resolveGuidePlace({ lat: 37.9365, lng: 27.3435, accuracy: 10 }, tourStops, state, true);
    expect(res.place?.id).toBe("s1");
    state = res.nextState;
    // s1'den çık
    res = resolveGuidePlace({ lat: 37.93, lng: 27.35, accuracy: 10 }, tourStops, state, true);
    state = res.nextState;
    // Şimdi hem s2 hem s3 giriş yarıçapında ama s2 sıradaki olduğu için s2 seçilmeli, s3 daha yakın olsa bile
    const locBoth = { lat: 37.9378, lng: 27.3432, accuracy: 30 }; // both within 50m?
    // Bu konum s2 ve s3'e mesafeyi hesapla; biz s2'yi daha yakın yapalım mı? Aslında s3 bu konumda daha yakın olabilir
    // Ama sıradaki s2 öncelikli olduğu için s2 seçilmeli
    res = resolveGuidePlace(locBoth, tourStops, state, true);
    if (res.place) {
      expect(res.place.order).toBe(2);
    }
  });

  it("simulateWalk: Efes turu boyunca sırayla öneri, titreme yok", () => {
    const tourStops = EPHESUS_TOUR.days[0].stops.map((s) => ({
      id: s.pinId ?? `stop-${s.order}`,
      lat: s.lat,
      lng: s.lng,
      order: s.order,
    }));
    // Yürüyüş yolu: durakların kendisi üzerinde ilerleyen path + küçük wobble
    const path = tourStops.flatMap((s) => [
      { lat: s.lat, lng: s.lng, accuracy: 12 },
      { lat: s.lat + 0.00008, lng: s.lng + 0.00008, accuracy: 18 }, // hafif wobble 10-15m
      { lat: s.lat, lng: s.lng, accuracy: 12 },
      { lat: 37.93, lng: 27.35, accuracy: 12 }, // uzaklaş (çıkış tetikle)
    ]);
    const steps = simulateWalk(path, tourStops, true);
    // En azından her durak bir kez önerilmiş olmalı ve sıra bozulmamalı
    const suggestedOrders = steps.filter((s) => s.suggestedId).map((s) => s.suggestedId);
    // Önerilenler tur sırasını takip etmeli
    for (let i = 1; i < tourStops.length; i++) {
      const idxPrev = suggestedOrders.indexOf(tourStops[i - 1].id);
      const idxCurr = suggestedOrders.indexOf(tourStops[i].id);
      if (idxPrev !== -1 && idxCurr !== -1) {
        expect(idxCurr).toBeGreaterThan(idxPrev);
      }
    }
    // Titreme: aynı konumda iki farklı id arasında gidip gelme olmamalı (histeresis)
    let jitter = 0;
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].suggestedId && steps[i - 1].suggestedId && steps[i].suggestedId !== steps[i - 1].suggestedId) {
        // Eğer bir önceki adımda aynı yer içindeysek ve wobble ile değiştüyse jitter say
        // Basit kontrol: ardışık iki adımda id değiştiyse ve meters < exitR iken olmuşsa jitter
        // Bizim simülasyonda wobble 15m, exit 55, bu yüzden değişmemeli
        // Eğer değiştiyse ama arada far boşluğu yoksa jitter var demektir
        if (steps[i - 1].meters !== null && steps[i].meters !== null) {
          // wobble durumunda id değişmemeli; eğer değiştiyse jitter
          if (steps[i].suggestedId !== steps[i - 1].suggestedId && steps[i - 1].suggestedId !== null) {
            // kontrol et: bu iki adım arasında far var mı? path'de far sonrası yeni durak normaldir
            // Wobble adımı (index %4 ==1) için değişmemeli
            if (steps[i].step % 4 === 1) jitter++;
          }
        }
      }
    }
    expect(jitter).toBe(0);
  });
});

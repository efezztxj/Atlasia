import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mapView = readFileSync("src/components/MapView.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");

/**
 * Kasma/donma regresyon kilidi.
 *
 * Harita `zoom` olayı animasyon boyunca her karede gelir; doğrudan state
 * güncellendiğinde tüm keşif ağacı saniyede ~60 kez yeniden çiziliyordu.
 * Otomatik dönüş döngüsü de dönüş kapalıyken boş boş 60 FPS koşuyordu.
 * Bu iki davranış sessizce geri gelirse test kırılır.
 */
describe("harita çizim döngüsü ve görünüm bildirimi", () => {
  it("zoom olayında görünüm bildirimi sınırlanır (her karede state güncellenmez)", () => {
    expect(mapView).toContain("shouldReportView");
    expect(mapView).toContain("reportThrottled");
    // `zoom` dinleyicisi doğrudan `report()` çağırmamalı.
    expect(mapView).not.toMatch(/map\.on\("zoom",\s*\(\)\s*=>\s*\{[^}]*report\(\);/);
  });

  it("hareket bittiğinde eşik atlanır, kesin görünüm yazılır", () => {
    // moveend her zaman güncel görünümü yazar: throttle ve commit eşiği
    // son kareyi kaçırmaz.
    expect(mapView).toMatch(/map\.on\("moveend",\s*\(\)\s*=>\s*\{[^}]*report\(true\);/);
  });

  it("mikro hareketlerde görünüm state'i hiç güncellenmez", () => {
    // Eşik geçilmedikçe onViewChange çağrılmaz: React state aynı nesne kalır
    // ve yeniden render olmaz.
    expect(mapView).toContain("shouldCommitView");
    expect(mapView).toContain("lastCommitted");
    expect(mapView).toMatch(/if \(!force && lastCommitted && !shouldCommitView\([^)]*\)\) return;/);
    // İlk bildirim eşiğe takılmasın.
    expect(mapView).toMatch(/report\(true\);\s*\n\s*\n\s*return \(\) =>/);
  });

  it("autospin döngüsü koşul sağlanmıyorsa kendini yeniden kurmaz", () => {
    const tickBody = mapView.slice(mapView.indexOf("const tick = (t: number) =>"), mapView.indexOf("const ensureSpinLoop"));
    expect(tickBody).toContain("raf = 0;");
    // Erken çıkış, döngünün boşta dönmesini engeller: koşul sağlanmıyorsa
    // yeni kare istenmez.
    expect(tickBody).toMatch(/if \(!shouldAdvanceSpin\([\s\S]*?raf = 0;\s*return;/);
    expect(tickBody).toContain("spinDisposed");
    // Yalnız iki yerde kare istenir: koşul geçtiğinde ve döngü kurulurken.
    expect(mapView.match(/requestAnimationFrame\(tick\)/g)?.length).toBe(2);
  });

  it("sekme görünürlüğü dinleyicisi temizlenir", () => {
    expect(mapView).toContain('document.addEventListener("visibilitychange", onVisibilityForSpin)');
    expect(mapView).toContain('document.removeEventListener("visibilitychange", onVisibilityForSpin)');
  });

  it("harita tuvali cihaz DPR'ı yerine uyarlanabilir oranla çizilir", () => {
    // Telefonlarda DPR 3 → 9 kat piksel; kademe + dokunmatik sınırı bunu keser.
    expect(mapView).toContain("recommendedPixelRatio(");
    expect(mapView).toContain("signals.coarsePointer");
    expect(mapView).toMatch(/pixelRatio: appliedPixelRatio,/);
  });

  it("tepe gölgesi dokunmatik cihazda kapalı başlar, arazi 3B kalır", () => {
    expect(mapView).toContain("hillshade: recommendedHillshade(signals)");
    expect(mapView).toMatch(/layout: \{ visibility: hillshade \? "visible" : "none" \}/);
    // Görünürlük hem arazi hem tepe gölgesi koşuluna bağlı.
    expect(mapView).toContain('terrainEnabled && hillshade ? "visible" : "none"');
  });

  it("kademeli düşürme: önce piksel oranı, sonra arazi (her adım bir kez)", () => {
    expect(mapView).toContain("shouldDisableTerrain");
    expect(mapView).toMatch(/degradeStep === 0 && shouldLowerMapQuality/);
    expect(mapView).toMatch(/degradeStep === 1 && shouldDisableTerrain/);
    // Arazi kararı sahibine bırakılır (kullanıcı seçimini ezmemek için).
    expect(mapView).toContain("live.current.onSlowDevice?.()");
  });

  it("cihaz üstü teşhis kancası var ve temizleniyor", () => {
    expect(mapView).toContain("window.atlasiaMapPerf = perfSnapshot");
    expect(mapView).toContain("delete window.atlasiaMapPerf");
    expect(mapView).toContain("fps: Math.round(lastFps)");
  });

  it("otomatik dönüş panel açıkken durur, kapanınca yeniden başlar", () => {
    const explorer = readFileSync("src/components/Explorer.tsx", "utf8");
    expect(explorer).toContain("const sheetOpen = feedOpen || atlasOpen || profileOpen || layersOpen || settingsOpen || drawerOpen;");
    expect(explorer).toContain("!draft && !sheetOpen}");
    // Döngü kendini durdurduğu için dışarıdan canlandırma şart.
    expect(mapView).toContain("spinResumeRef");
    expect(mapView).toMatch(/if \(spin\) spinResumeRef\.current\?\.\(\);/);
  });

  it("ölçülen kare hızı düşükse piksel oranı bir kez düşürülür", () => {
    expect(mapView).toContain("shouldLowerMapQuality");
    expect(mapView).toMatch(/map\.on\("movestart", onSampleStart\)/);
    expect(mapView).toMatch(/map\.on\("moveend", onSampleEnd\)/);
    expect(mapView).toMatch(/map\.setPixelRatio\(1\)/);
  });

  it("arazi varsayılanı cihaz sinyallerine bağlı, kullanıcı seçimi ezilmiyor", () => {
    const explorer = readFileSync("src/components/Explorer.tsx", "utf8");
    expect(explorer).toContain("useState(() => recommendedTerrain(readDeviceSignals()))");
    // Otomatik düşürme yalnız kullanıcı dokunmadıysa devreye girer.
    expect(explorer).toContain("terrainTouched.current = true");
    expect(explorer).toContain("if (!terrainTouched.current) setTerrain(false)");
  });

  it("ölçüm sonrası ağır katman kapatma isteği sahibine bildirilir", () => {
    expect(mapView).toContain("live.current.onSlowDevice?.()");
  });

  it("pin etiketi bulanıklığı yalnız görünürken uygulanır", () => {
    const start = css.indexOf(".atl-pin__label {");
    const base = css.slice(start, css.indexOf("}", start));
    expect(base).not.toContain("backdrop-filter");
    const hoverStart = css.indexOf(".atl-pin:hover .atl-pin__label");
    const hover = css.slice(hoverStart, css.indexOf("}", hoverStart));
    expect(hover).toContain("backdrop-filter");
  });
});

import * as maplibregl from "maplibre-gl";
import type { AudioDiscoveryStop } from "../data/audioDiscovery";

/**
 * Aynı koordinatı paylaşan durakları (bkz. `sharedWith`) küçük bir yay üzerinde
 * kaydırır. Koordinat VERİSİ değişmez — yalnız pin görsel olarak ayrılır; böylece
 * "Bazilika Stoası + Heksagon" gibi tek noktadaki iki yapı üst üste binmez ve
 * kullanıcı ikisine de dokunabilir.
 *
 * Yarıçap metre cinsinden; zoom'dan bağımsız küçük bir ofset (≈14 m) seçildi ki
 * pin'ler ayrı görünsün ama yanlış bir yapıyı işaret etmesin.
 */
const SHARED_PIN_OFFSET_METERS = 14;

function offsetLngLat(lat: number, lng: number, indexInGroup: number, groupSize: number): [number, number] {
  if (groupSize <= 1) return [lng, lat];
  // Yay: 2 durak yan yana, 3 durak üçgen, daha fazlası çember.
  const angle = (2 * Math.PI * indexInGroup) / groupSize - Math.PI / 2;
  const dLat = (SHARED_PIN_OFFSET_METERS * Math.cos(angle)) / 111_320;
  const dLng = (SHARED_PIN_OFFSET_METERS * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lng + dLng, lat + dLat];
}

/** Uç, temsilî koordinata sabitlenir; pin pozisyonu yol veya giriş doğrulamaz. */
export function addAudioStopMarkers(map: maplibregl.Map, stops: AudioDiscoveryStop[], selected: number, onSelect: (index: number) => void) {
  // Koordinat kümesi → o kümedeki durakların sırası (paylaşılan pin ofseti için).
  const coordGroups = new Map<string, number>();
  stops.forEach((stop) => {
    const key = `${stop.lat},${stop.lng}`;
    coordGroups.set(key, (coordGroups.get(key) ?? 0) + 1);
  });
  const coordSeen = new Map<string, number>();

  const entries = stops.map((stop, index) => {
    const key = `${stop.lat},${stop.lng}`;
    const groupSize = coordGroups.get(key) ?? 1;
    const indexInGroup = coordSeen.get(key) ?? 0;
    coordSeen.set(key, indexInGroup + 1);
    const [lng, lat] = offsetLngLat(stop.lat, stop.lng, indexInGroup, groupSize);

    const button = document.createElement("button");
    button.type = "button";
    // Numara VERİDEN gelir (tur içinde 1..N kesintisiz); dizi indeksi kullanılmaz.
    // Eski kod `index + 1` yazıyordu ve ören yeri dışı duraklar numara tüketmediği
    // için haritada 16/17/18/24/25/26/27/29/38 numaraları boş görünüyordu.
    button.setAttribute("aria-label", stop.markerStyle === "additional" ? `Ören yeri dışı ${stop.no}. durak: ${stop.title}` : `${stop.no}. durak: ${stop.title}`);
    const outside = stop.markerStyle === "additional";
    button.style.cssText = outside ? "width:44px;height:44px;border:0;padding:0;background:none" : "width:48px;height:56px;border:0;padding:0;background:none";
    // Sabit SVG işaretleme; kullanıcı verisi HTML'e eklenmez.
    button.innerHTML = outside
      ? '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><path d="M22 2a20 20 0 1 0 0 40 20 20 0 0 0 0-40Z" stroke="white" stroke-width="2.5"/><text x="22" y="29" text-anchor="middle" font-size="17" font-weight="700"></text></svg>'
      : '<svg viewBox="0 0 48 56" width="48" height="56" aria-hidden="true"><path d="M24 2C-3 2-4 32 24 54 52 32 51 2 24 2Z" stroke="white" stroke-width="2.5"/><text x="24" y="29" text-anchor="middle" font-size="17" font-weight="700"></text></svg>';
    const pin = button.querySelector("path")!;
    const number = button.querySelector("text")!;
    // Her durak numarasını gösterir (ören yeri dışı ◆ dahil): numaralar
    // 1..N kesintisiz olduğu için ekran görüntüsündeki boşluklar oluşmaz.
    number.textContent = String(stop.no);
    button.addEventListener("click", (event) => { event.stopPropagation(); onSelect(index); });
    const marker = new maplibregl.Marker({ element: button, anchor: outside ? "center" : "bottom" }).setLngLat([lng, lat]).addTo(map);
    return { marker, button, pin, number, outside };
  });
  const update = (selectedIndex: number) => entries.forEach(({ button, pin, number, outside }, index) => {
    const active = index === selectedIndex;
    button.setAttribute("aria-pressed", String(active));
    pin.setAttribute("fill", outside ? "#704b87" : active ? "#eab54f" : "#176d68");
    pin.setAttribute("stroke", outside && active ? "#eab54f" : "white");
    pin.setAttribute("stroke-width", outside && active ? "4" : "2.5");
    number.setAttribute("fill", outside ? "#ffffff" : active ? "#021512" : "#ffffff");
  });
  update(selected);
  return { update, remove: () => entries.forEach(({ marker }) => marker.remove()) };
}

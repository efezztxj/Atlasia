import * as maplibregl from "maplibre-gl";
import type { AudioDiscoveryStop } from "../data/audioDiscovery";

export interface SpiderPoint {
  x: number;
  y: number;
}

export interface SpiderOffset {
  dx: number;
  dy: number;
}

/** Aynı piksele düşen pinler bu uzaklığın altındaysa çakışık sayılır. */
export const SPIDER_COLLIDE_PX = 28;
/** Halka başına pin sayısı; pin gövdesi (~48px) halkada birbirine değmesin diye 8. */
const RING_CAPACITY = 8;
/** İlk halkanın yarıçapı (px); kalabalık gruplar dışa doğru halkalanır. */
const RING_RADIUS = 64;
const RING_STEP = 48;

/**
 * Çakışan pinleri halkaya açar (spiderfy): düşük zoom'da üst üste binip birbirini
 * tamamen örten durak pinlerinin her biri görünür kalır. Halka yalnızca görsel bir
 * kalabalık gösterimidir; gerçek koordinat değişmez, yakınlaştırınca halka kendiliğinden
 * çözülür çünkü piksel uzaklıkları çakışma eşiğini aşar.
 */
export function computeSpiderOffsets(points: SpiderPoint[], collidePx: number = SPIDER_COLLIDE_PX): SpiderOffset[] {
  const count = points.length;
  const offsets: SpiderOffset[] = points.map(() => ({ dx: 0, dy: 0 }));
  if (count < 2) return offsets;

  const parent = points.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    return root;
  };
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < collidePx) {
        const ra = find(i);
        const rb = find(j);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  }

  const groups = new Map<number, number[]>();
  points.forEach((_, index) => {
    const root = find(index);
    const members = groups.get(root) ?? [];
    members.push(index);
    groups.set(root, members);
  });

  for (const members of groups.values()) {
    if (members.length < 2) continue;
    for (let position = 0; position < members.length; position++) {
      const ring = Math.floor(position / RING_CAPACITY);
      const inRing = Math.min(RING_CAPACITY, members.length - ring * RING_CAPACITY);
      const slot = position - ring * RING_CAPACITY;
      const radius = RING_RADIUS + ring * RING_STEP;
      const angle = -Math.PI / 2 + (slot * 2 * Math.PI) / inRing;
      offsets[members[position]] = { dx: Math.round(radius * Math.cos(angle)), dy: Math.round(radius * Math.sin(angle)) };
    }
  }
  return offsets;
}

/** Uç, temsilî koordinata sabitlenir; pin pozisyonu yol veya giriş doğrulamaz. */
export function addAudioStopMarkers(map: maplibregl.Map, stops: AudioDiscoveryStop[], selected: number, onSelect: (index: number) => void) {
  const entries = stops.map((stop, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${index + 1}. durak: ${stop.title}`);
    const outside = stop.markerStyle === "additional";
    button.style.cssText = outside ? "width:44px;height:44px;border:0;padding:0;background:none" : "width:48px;height:56px;border:0;padding:0;background:none";
    // Sabit SVG işaretleme; kullanıcı verisi HTML'e eklenmez.
    button.innerHTML = outside
      ? '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><path d="M22 2a20 20 0 1 0 0 40 20 20 0 0 0 0-40Z" stroke="white" stroke-width="2.5"/><text x="22" y="29" text-anchor="middle" font-size="21" font-weight="700">◆</text></svg>'
      : '<svg viewBox="0 0 48 56" width="48" height="56" aria-hidden="true"><path d="M24 2C-3 2-4 32 24 54 52 32 51 2 24 2Z" stroke="white" stroke-width="2.5"/><text x="24" y="29" text-anchor="middle" font-size="17" font-weight="700"></text></svg>';
    const pin = button.querySelector("path")!;
    const number = button.querySelector("text")!;
    if (!outside) number.textContent = String(index + 1);
    button.addEventListener("click", (event) => { event.stopPropagation(); onSelect(index); });
    const marker = new maplibregl.Marker({ element: button, anchor: outside ? "center" : "bottom" }).setLngLat([stop.lng, stop.lat]).addTo(map);
    return { marker, button, pin, number, outside };
  });

  // Kalabalık zoom seviyelerinde pinler birbirini tamamen örtmesin: çakışanlar halkaya açılır.
  const relayout = () => {
    if (!map || typeof map.project !== "function") return;
    const points = stops.map((stop) => map.project([stop.lng, stop.lat]));
    const offsets = computeSpiderOffsets(points);
    entries.forEach((entry, index) => {
      if (typeof entry.marker.setOffset === "function") entry.marker.setOffset([offsets[index].dx, offsets[index].dy]);
    });
  };
  const canListen = typeof map.on === "function" && typeof map.off === "function";
  if (canListen) {
    map.on("moveend", relayout);
    map.on("resize", relayout);
  }
  relayout();

  const update = (selectedIndex: number) => entries.forEach(({ button, pin, number, outside }, index) => {
    const active = index === selectedIndex;
    button.setAttribute("aria-pressed", String(active));
    pin.setAttribute("fill", outside ? "#704b87" : active ? "#eab54f" : "#176d68");
    pin.setAttribute("stroke", outside && active ? "#eab54f" : "white");
    pin.setAttribute("stroke-width", outside && active ? "4" : "2.5");
    number.setAttribute("fill", outside ? "#ffffff" : active ? "#021512" : "#ffffff");
    // Seçili pin kısmi örtüşmede bile en üstte dursun.
    const wrapper = button.parentElement;
    if (wrapper) wrapper.style.zIndex = active ? "6" : "";
  });
  update(selected);
  return {
    update,
    remove: () => {
      if (canListen) {
        map.off("moveend", relayout);
        map.off("resize", relayout);
      }
      entries.forEach(({ marker }) => marker.remove());
    },
  };
}

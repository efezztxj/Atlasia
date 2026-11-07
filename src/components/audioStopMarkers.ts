import * as maplibregl from "maplibre-gl";
import type { AudioDiscoveryStop } from "../data/audioDiscovery";

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

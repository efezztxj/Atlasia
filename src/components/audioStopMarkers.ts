import * as maplibregl from "maplibre-gl";
import type { AudioDiscoveryStop } from "../data/audioDiscovery";

/** Uç, temsilî koordinata sabitlenir; pin pozisyonu yol veya giriş doğrulamaz. */
export function addAudioStopMarkers(map: maplibregl.Map, stops: AudioDiscoveryStop[], selected: number, onSelect: (index: number) => void) {
  const entries = stops.map((stop, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${index + 1}. durak: ${stop.title}`);
    button.style.cssText = "width:48px;height:56px;border:0;padding:0;background:none";
    // Sabit SVG işaretleme; kullanıcı verisi HTML'e eklenmez.
    button.innerHTML = '<svg viewBox="0 0 48 56" width="48" height="56" aria-hidden="true"><path d="M24 2C-3 2-4 32 24 54 52 32 51 2 24 2Z" stroke="white" stroke-width="2.5"/><text x="24" y="29" text-anchor="middle" font-size="17" font-weight="700"></text></svg>';
    const pin = button.querySelector("path")!;
    const number = button.querySelector("text")!;
    number.textContent = String(index + 1);
    button.addEventListener("click", (event) => { event.stopPropagation(); onSelect(index); });
    const marker = new maplibregl.Marker({ element: button, anchor: "bottom" }).setLngLat([stop.lng, stop.lat]).addTo(map);
    return { marker, button, pin, number };
  });
  const update = (selectedIndex: number) => entries.forEach(({ button, pin, number }, index) => {
    const active = index === selectedIndex;
    button.setAttribute("aria-pressed", String(active));
    pin.setAttribute("fill", active ? "#eab54f" : "#176d68");
    number.setAttribute("fill", active ? "#021512" : "#ffffff");
  });
  update(selected);
  return { update, remove: () => entries.forEach(({ marker }) => marker.remove()) };
}

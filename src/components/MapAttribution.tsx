import type { BaseMapStyle } from "./MapView";

interface Props {
  baseMap: BaseMapStyle;
  showLabels: boolean;
  terrainEnabled: boolean;
}

/** Kaynak bağlantıları alt keşif kartının altında görünür kalır. */
export default function MapAttribution({ baseMap, showLabels, terrainEnabled }: Props) {
  const openFreeMap = baseMap === "dark" || (baseMap === "satellite" && showLabels);
  const esri = baseMap !== "dark";
  return (
    <div
      role="contentinfo"
      aria-label="Harita kaynakları"
      className="map-attribution text-[10px]"
      style={{ color: "#e0ebe5", lineHeight: 1.3, textShadow: "0 0 3px #000, 0 0 4px #000" }}
    >
      {esri && <><a className="underline" href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>{baseMap === "satellite" && ", Maxar, Earthstar Geographics, USGS"}{openFreeMap && " · "}</>}
      {openFreeMap && <><a className="underline" href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>{" · © "}<a className="underline" href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a>{" · © "}<a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap katkıcıları</a></>}
      {terrainEnabled && <> · <a className="underline" href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">AWS Terrain Tiles</a></>}
    </div>
  );
}

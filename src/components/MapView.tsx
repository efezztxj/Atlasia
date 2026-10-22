import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  calibrateMapLabelLayers,
  mapLabelPaint,
  type MapLabelTheme,
  type MapStyleLayer,
} from "../config/mapLabelCalibration";
import openFreeMapDarkStyle from "../data/openFreeMapDarkStyle.json";
import { KKTC_GEOMETRY, KKTC_NAME } from "../data/regions";
import { attachMapResume } from "../lib/mapResume";
import type { PlaceViewport } from "../lib/firestoreData";
import type { Place, RouteLeg, ViewState } from "../types";
import { shouldAdvanceSpin } from "../utils/mapLifecycle";
import type { WeatherLayerHandle } from "../utils/mapWeather";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export type BaseMapStyle = "satellite" | "dark" | "street" | "topographic";

export interface MapViewHandle {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  fitBox: (box: [number, number, number, number]) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** Kullanıcının konumunu doğruluk yarıçapıyla göster */
  showMe: (lng: number, lat: number, accuracy?: number, fly?: boolean) => void;
  clearMe: () => void;
  drawRoute: (coords: [number, number][], preview?: boolean) => void;
  drawRouteLegs: (legs: RouteLeg[], preview?: boolean) => void;
  clearRoute: () => void;
  pulseAt: (lng: number, lat: number) => void;
  fitCoords: (coords: [number, number][]) => void;
}

interface Props {
  ref?: Ref<MapViewHandle>;
  places: Place[];
  activeId: string | null;
  onSelect: (id: string) => void;
  addMode: boolean;
  onMapClick: (lng: number, lat: number) => void;
  showLabels: boolean;
  terrainEnabled: boolean;
  baseMap: BaseMapStyle;
  theme: MapLabelTheme;
  spin: boolean;
  onUserInteract: () => void;
  onViewChange: (v: ViewState) => void;
  onViewportChange?: (viewport: PlaceViewport) => void;
}

const HOME_CENTER: [number, number] = [30, 30];
const SPIN_DEG_PER_SEC = 4;
const SPIN_MAX_ZOOM = 3.2;

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
// Snapshot of https://tiles.openfreemap.org/styles/dark fetched on 2026-10-14.
// OpenFreeMap's public instance requires no account or API key; attribution is mandatory.
const OPEN_FREE_MAP_SOURCE_PREFIX = "openfreemap-";
const OPEN_FREE_MAP_LAYER_PREFIX = "openfreemap-dark-";
const OPEN_FREE_MAP_ATTRIBUTION = "OpenFreeMap © OpenMapTiles · OpenStreetMap contributors";

const openFreeMapLayerIds = openFreeMapDarkStyle.layers.map((layer) => `${OPEN_FREE_MAP_LAYER_PREFIX}${layer.id}`);
const openFreeMapSymbolLayerIds = new Set(
  openFreeMapDarkStyle.layers
    .filter((layer) => layer.type === "symbol")
    .map((layer) => `${OPEN_FREE_MAP_LAYER_PREFIX}${layer.id}`),
);

function openFreeMapSources(): Record<string, maplibregl.SourceSpecification> {
  return Object.fromEntries(
    Object.entries(openFreeMapDarkStyle.sources).map(([id, rawSource]) => {
      const source = { ...rawSource } as Record<string, unknown>;
      if (id === "openmaptiles") source.attribution = OPEN_FREE_MAP_ATTRIBUTION;
      return [`${OPEN_FREE_MAP_SOURCE_PREFIX}${id}`, source as unknown as maplibregl.SourceSpecification];
    }),
  );
}

function openFreeMapLayerVisible(layerId: string, labels: boolean, baseMap: BaseMapStyle) {
  if (openFreeMapSymbolLayerIds.has(layerId)) {
    return labels && (baseMap === "dark" || baseMap === "satellite");
  }
  return baseMap === "dark";
}

function kktcLabelVisible(labels: boolean, baseMap: BaseMapStyle) {
  // Street/topographic Esri altlıklarının gömülü etiketleri vardır; özel KKTC
  // yazısı orada ikinci bir isim katmanı oluşturur. Sınır çizgisi metin
  // çakışmasına yol açmadığı için bu koşul yalnız etikete uygulanır.
  return labels && (baseMap === "dark" || baseMap === "satellite");
}

function openFreeMapLayers(
  labels: boolean,
  baseMap: BaseMapStyle,
  theme: MapLabelTheme,
): maplibregl.LayerSpecification[] {
  const calibratedLayers = calibrateMapLabelLayers(
    openFreeMapDarkStyle.layers as unknown as readonly MapStyleLayer[],
    { theme, baseMap },
  );

  return calibratedLayers.map((rawLayer) => {
    const raw = rawLayer as Record<string, unknown>;
    const id = `${OPEN_FREE_MAP_LAYER_PREFIX}${rawLayer.id}`;
    const layer: Record<string, unknown> = {
      ...raw,
      id,
      layout: {
        ...((raw.layout as Record<string, unknown> | undefined) ?? {}),
        visibility: openFreeMapLayerVisible(id, labels, baseMap) ? "visible" : "none",
      },
    };
    if (typeof raw.source === "string") layer.source = `${OPEN_FREE_MAP_SOURCE_PREFIX}${raw.source}`;
    return layer as unknown as maplibregl.LayerSpecification;
  });
}

const PIN_COLORS = { guide: "#eab54f", user: "#5be0a6" } as const;

// Adım 11 — bacak bazlı çizim için renk ve kesikli stil haritası (MapLibre data-driven değil, ayrı layer)
const LEG_STYLE: Record<string, { color: string; dash?: number[]; width: number }> = {
  walking: { color: "#F2D77C", width: 3.2 },
  trail: { color: "#5be0a6", dash: [6, 4], width: 3 },
  offroad: { color: "#a78bfa", dash: [2, 4], width: 2.8 },
  descent: { color: "#f87171", dash: [4, 4], width: 3 },
  driving: { color: "#60a5fa", width: 3.2 },
  cycling: { color: "#fbbf24", width: 2.8 },
  transit: { color: "#94a3b8", dash: [8, 4], width: 2.6 },
};

function baseZoom(el: HTMLElement) {
  const d = Math.min(el.clientHeight * 0.6, el.clientWidth * 0.9);
  return Math.max(1.1, Math.log2((d * Math.PI) / 512));
}

function buildStyle(
  labels: boolean,
  terrainEnabled: boolean,
  baseMap: BaseMapStyle,
  theme: MapLabelTheme,
): maplibregl.StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    glyphs: openFreeMapDarkStyle.glyphs,
    sprite: openFreeMapDarkStyle.sprite,
    sky: {
      "sky-color": "#1e7d62",
      "sky-horizon-blend": 0.55,
      "horizon-color": "#4fd3a0",
      "horizon-fog-blend": 0.45,
      "fog-color": "#0a3d33",
      "fog-ground-blend": 0.2,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 8, 0],
    },
    sources: {
      satellite: {
        type: "raster",
        tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 18,
        attribution: "Esri, Maxar, Earthstar Geographics, USGS",
      },
      street: {
        type: "raster",
        tiles: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri",
      },
      topographic: {
        type: "raster",
        tiles: [`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Esri",
      },
      ...openFreeMapSources(),
      terrain: {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 15,
        encoding: "terrarium",
        attribution: "Terrain data: AWS Terrain Tiles",
      },
      "kktc-region": {
        type: "geojson",
        data: { type: "Feature", properties: { name: KKTC_NAME }, geometry: KKTC_GEOMETRY },
        attribution: "Regional geography: Natural Earth / Datahub (public domain)",
      },
      "kktc-name": {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { name: "KUZEY KIBRIS\nTÜRK CUMHURİYETİ" },
          geometry: { type: "Point", coordinates: [33.58, 35.265] },
        },
      },
    },
    terrain: terrainEnabled ? { source: "terrain", exaggeration: 1.08 } : undefined,
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#04231d" } },
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        layout: { visibility: baseMap === "satellite" ? "visible" : "none" },
        paint: {
          "raster-fade-duration": 250,
          "raster-saturation": 0.13,
          "raster-contrast": 0.12,
          "raster-brightness-min": 0.045,
          "raster-brightness-max": 0.97,
        },
      },
      {
        id: "street",
        type: "raster",
        source: "street",
        layout: { visibility: baseMap === "street" ? "visible" : "none" },
        paint: { "raster-fade-duration": 250 },
      },
      {
        id: "topographic",
        type: "raster",
        source: "topographic",
        layout: { visibility: baseMap === "topographic" ? "visible" : "none" },
        paint: { "raster-fade-duration": 250 },
      },
      {
        id: "terrain-relief",
        type: "hillshade",
        source: "terrain",
        paint: {
          "hillshade-illumination-direction": 328,
          "hillshade-illumination-anchor": "map",
          "hillshade-exaggeration": 0.24,
          "hillshade-shadow-color": "#00120f",
          "hillshade-highlight-color": "#e5d9b2",
          "hillshade-accent-color": "#0a7b60",
        },
      },
      ...openFreeMapLayers(labels, baseMap, theme),
      {
        id: "kktc-outline",
        type: "line",
        source: "kktc-region",
        minzoom: 6,
        maxzoom: 13,
        layout: { visibility: labels ? "visible" : "none" },
        paint: {
          "line-color": "#eab54f",
          "line-width": 1,
          "line-opacity": 0.45,
          "line-dasharray": [3, 3],
        },
      },
      // KÖK NEDEN (kktc-label fontu): Stil snapshot'ının glyphs ucu
      // tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf yalnız kendi
      // kümesini sunar; snapshot'ın 13 symbol katmanının TAMAMI "Noto Sans
      // Regular" kullanır. Buradaki "Open Sans Semibold" 404 dönüyor ve
      // maplibre yerel glyph üretimine düşüyordu (konsolda iki 404 + "Unable to
      // load glyph range"). Haritanın geri kalanıyla aynı ve endpoint'in
      // gerçekten sunduğu fonta eşitlendi.
      // Not: bu açıklama bilerek `id:` satırının ÜSTÜNDE durur.
      // mapLabelVisibility.test.ts katman bloğunu `id: "kktc-label"`'dan
      // itibaren 700 karakter keserek doğruluyor; blok içine yazılan uzun
      // yorum, `"text-allow-overlap": true` kilidini pencerenin dışına itiyordu.
      {
        id: "kktc-label",
        type: "symbol",
        source: "kktc-name",
        minzoom: 5.2,
        maxzoom: 11,
        layout: {
          visibility: kktcLabelVisible(labels, baseMap) ? "visible" : "none",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 8, 14],
          "text-letter-spacing": 0.08,
          "text-line-height": 1.4,
          "text-max-width": 18,
          "text-allow-overlap": true,
          "text-pitch-alignment": "viewport",
        },
        paint: {
          "text-color": "#ffdb8d",
          "text-halo-color": "#031d17",
          "text-halo-width": 1.6,
          "text-halo-blur": 0.6,
        },
      },
    ],
  };
}

/** Metre yarıçaplı daireyi enlem/boylam çokgenine çevirir */
function circlePolygon(lng: number, lat: number, meters: number, steps = 72) {
  const coords: number[][] = [];
  const dLat = meters / 110_574;
  const dLng = meters / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    coords.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  };
}

/** Ölçüm hassasiyetine göre makul bir yakınlaştırma seviyesi */
function zoomForAccuracy(a?: number) {
  if (!a || !Number.isFinite(a)) return 13;
  if (a <= 30) return 16.4;
  if (a <= 100) return 15;
  if (a <= 500) return 13.4;
  if (a <= 2000) return 12;
  if (a <= 10_000) return 10;
  return 8.5;
}

function createPinElement(place: Place) {
  const color = PIN_COLORS[place.kind];
  const root = document.createElement("div");
  root.className = "atl-pin";
  root.style.setProperty("--pin-color", color);
  root.setAttribute("role", "button");
  root.tabIndex = 0;
  root.setAttribute("aria-label", place.title);
  root.dataset.placeId = place.id;
  root.innerHTML = `
    <span class="atl-pin__pulse"></span>
    <span class="atl-pin__body">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 37C15 37 28 24.5 28 14.5C28 7.1 22.2 1 15 1C7.8 1 2 7.1 2 14.5C2 24.5 15 37 15 37Z" fill="${color}" stroke="#021512" stroke-width="2"/>
        <circle cx="15" cy="14.5" r="5" fill="#021512"/>
      </svg>
    </span>
    <span class="atl-pin__label"></span>
  `;
  (root.querySelector(".atl-pin__label") as HTMLElement).textContent = place.title;
  return root;
}

export default function MapView({
  ref,
  places,
  activeId,
  onSelect,
  addMode,
  onMapClick,
  showLabels,
  terrainEnabled,
  baseMap,
  theme,
  spin,
  onUserInteract,
  onViewChange,
  onViewportChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLElement }>>(new Map());
  const initialStyleOptions = useRef({ showLabels, terrainEnabled, baseMap, theme });
  const meMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pulseRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);

  // En güncel değerleri harita olaylarında kullanmak için
  const live = useRef({ onSelect, onMapClick, onUserInteract, onViewChange, onViewportChange, addMode, spin });
  live.current = { onSelect, onMapClick, onUserInteract, onViewChange, onViewportChange, addMode, spin };
  const internalMove = useRef(false);

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom = 6.5) {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom,
        pitch: terrainEnabled && zoom >= 5 ? 42 : 0,
        duration: 2800,
        curve: 1.5,
        essential: true,
      });
    },
    fitBox([w, s, e, n]) {
      const map = mapRef.current;
      const el = containerRef.current;
      if (!map || !el) return;
      const lat = (s + n) / 2;
      const lngSpan = Math.max(e - w, 0.0006);
      const latSpan = Math.max(n - s, 0.0006);
      const zx = Math.log2(((el.clientWidth * 0.6) / 512) * (360 / lngSpan));
      const zy = Math.log2(((el.clientHeight * 0.4) / 512) * ((360 * Math.cos((lat * Math.PI) / 180)) / latSpan));
      const zoom = Math.min(14, Math.max(1.6, Math.min(zx, zy)));
      map.flyTo({
        center: [(w + e) / 2, lat],
        zoom,
        pitch: terrainEnabled && zoom >= 5 ? 38 : 0,
        duration: 3000,
        curve: 1.5,
        essential: true,
      });
    },
    zoomIn() {
      mapRef.current?.zoomTo((mapRef.current.getZoom() ?? 2) + 1, { duration: 450 });
    },
    zoomOut() {
      mapRef.current?.zoomTo((mapRef.current.getZoom() ?? 2) - 1, { duration: 450 });
    },
    reset() {
      const map = mapRef.current;
      const el = containerRef.current;
      if (!map || !el) return;
      map.flyTo({
        center: HOME_CENTER,
        zoom: baseZoom(el),
        bearing: 0,
        pitch: 0,
        duration: 2200,
        essential: true,
      });
    },
    showMe(lng, lat, accuracy, fly = true) {
      const map = mapRef.current;
      if (!map) return;

      if (meMarkerRef.current) {
        meMarkerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement("div");
        el.className = "atl-me";
        meMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      }

      // Doğruluk yarıçapı çemberi
      const draw = () => {
        const data = circlePolygon(lng, lat, Math.max(accuracy ?? 0, 12));
        const src = map.getSource("me-accuracy") as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(data);
          return;
        }
        map.addSource("me-accuracy", { type: "geojson", data });
        map.addLayer({
          id: "me-accuracy-fill",
          type: "fill",
          source: "me-accuracy",
          paint: { "fill-color": "#5be0a6", "fill-opacity": 0.13 },
        });
        map.addLayer({
          id: "me-accuracy-line",
          type: "line",
          source: "me-accuracy",
          paint: { "line-color": "#5be0a6", "line-width": 1.2, "line-opacity": 0.55 },
        });
      };
      if (map.isStyleLoaded()) draw();
      else map.once("style.load", draw);

      if (!fly) return;
      const zoom = zoomForAccuracy(accuracy);
      map.flyTo({
        center: [lng, lat],
        zoom,
        pitch: terrainEnabled && zoom >= 10 ? 40 : 0,
        duration: 3000,
        curve: 1.5,
        essential: true,
      });
    },
    clearMe() {
      const map = mapRef.current;
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      if (!map) return;
      if (map.getLayer("me-accuracy-fill")) map.removeLayer("me-accuracy-fill");
      if (map.getLayer("me-accuracy-line")) map.removeLayer("me-accuracy-line");
      if (map.getSource("me-accuracy")) map.removeSource("me-accuracy");
    },
    drawRoute(coords, preview = false) {
      const map = mapRef.current;
      if (!map || coords.length < 2) return;
      const data = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      };
      const paint = () => {
        const src = map.getSource("atlas-route") as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData(data);
        else {
          map.addSource("atlas-route", { type: "geojson", data });
          map.addLayer({
            id: "atlas-route-line",
            type: "line",
            source: "atlas-route",
            paint: {
              "line-color": "#F2D77C",
              "line-width": 3.2,
              "line-opacity": preview ? 0.38 : 0.92,
            },
          });
        }
        map.setPaintProperty("atlas-route-line", "line-opacity", preview ? 0.38 : 0.92);
        map.setPaintProperty("atlas-route-line", "line-width", preview ? 2.2 : 3.4);
      };
      if (map.isStyleLoaded()) paint();
      else map.once("style.load", paint);
    },
    drawRouteLegs(legs, preview = false) {
      const map = mapRef.current;
      if (!map || legs.length === 0) return;
      // önce tek çizgiyi temizle ki bacaklar görünsün
      if (map.getLayer("atlas-route-line")) map.removeLayer("atlas-route-line");
      if (map.getSource("atlas-route")) map.removeSource("atlas-route");

      const paint = () => {
        legs.forEach((leg, idx) => {
          const sourceId = `atlas-leg-${idx}`;
          const layerId = `atlas-leg-line-${idx}`;
          const style = LEG_STYLE[leg.mode] ?? LEG_STYLE.walking;
          const data = {
            type: "Feature" as const,
            properties: { mode: leg.mode },
            geometry: { type: "LineString" as const, coordinates: leg.coords },
          };
          const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
          if (existing) {
            existing.setData(data);
            map.setPaintProperty(layerId, "line-opacity", preview ? 0.42 : 0.9);
            return;
          }
          map.addSource(sourceId, { type: "geojson", data });
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": style.color,
              "line-width": preview ? style.width - 0.8 : style.width,
              "line-opacity": preview ? 0.42 : 0.9,
              ...(style.dash ? { "line-dasharray": style.dash } : {}),
            },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        });
      };
      if (map.isStyleLoaded()) paint();
      else map.once("style.load", paint);
    },
    clearRoute() {
      const map = mapRef.current;
      if (!map) return;
      if (map.getLayer("atlas-route-line")) map.removeLayer("atlas-route-line");
      if (map.getSource("atlas-route")) map.removeSource("atlas-route");
      // bacak katmanlarını da temizle
      for (let i = 0; i < 20; i++) {
        const layerId = `atlas-leg-line-${i}`;
        const sourceId = `atlas-leg-${i}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
      pulseRef.current?.remove();
      pulseRef.current = null;
    },
    pulseAt(lng, lat) {
      const map = mapRef.current;
      if (!map) return;
      pulseRef.current?.remove();
      const el = document.createElement("div");
      el.className = "atl-pulse-stop";
      pulseRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 9), duration: 900, essential: true });
    },
    fitCoords(coords) {
      const map = mapRef.current;
      if (!map || !coords.length) return;
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      this.fitBox([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
    },
  }));

  // Haritayı başlat
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const initialStyle = initialStyleOptions.current;
    const markers = markersRef.current;
    const map = new maplibregl.Map({
      container: el,
      style: buildStyle(
        initialStyle.showLabels,
        initialStyle.terrainEnabled,
        initialStyle.baseMap,
        initialStyle.theme,
      ),
      center: HOME_CENTER,
      zoom: baseZoom(el),
      minZoom: 1,
      maxZoom: 19,
      maxPitch: 70,
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: true,
      doubleClickZoom: true,
      fadeDuration: 200,
    });
    mapRef.current = map;

    // Hava katmanı ayrı parçada; yalnız ilk açılışta yüklenir (mapView bütçesi).
    let weatherWanted = false;
    let weatherDisposed = false;
    let weatherLayer: WeatherLayerHandle | null = null;
    const onWeatherToggle = (event: Event) => {
      weatherWanted = (event as CustomEvent<boolean>).detail === true;
      if (weatherLayer) { weatherLayer.setEnabled(weatherWanted); return; }
      if (!weatherWanted) return;
      void import("../utils/mapWeather").then(({ createWeatherLayer }) => {
        if (weatherDisposed) return;
        weatherLayer ??= createWeatherLayer(map, maplibregl.Marker);
        weatherLayer.setEnabled(weatherWanted);
      }, () => window.dispatchEvent(new CustomEvent("atlasia:weather-unavailable")));
    };
    window.addEventListener("atlasia:weather-toggle", onWeatherToggle);
    map.once("style.load", () => setReady(true));
    if (map.isStyleLoaded()) setReady(true);

    const report = () => {
      const c = map.getCenter();
      const zoom = map.getZoom();
      live.current.onViewChange({ zoom, lng: c.lng, lat: c.lat });
      const bounds = map.getBounds();
      live.current.onViewportChange?.({
        zoom,
        bounds: {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        },
      });
    };
    map.on("moveend", () => {
      if (internalMove.current) return;
      report();
    });
    map.on("zoom", () => {
      if (internalMove.current) return;
      report();
    });

    // Kullanıcı etkileşimi → otomatik dönüşü durdur
    const stop = () => live.current.onUserInteract();
    map.on("mousedown", stop);
    map.on("touchstart", stop);
    map.on("wheel", stop);

    map.on("click", (e) => {
      const target = e.originalEvent.target as HTMLElement | null;
      if (target?.closest(".atl-pin")) return;
      if (live.current.addMode) live.current.onMapClick(e.lngLat.lng, e.lngLat.lat);
    });

    // Otomatik dönüş
    let raf = 0;
    let lastFrameAt = 0;
    let lastSpinAt = performance.now();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (t: number) => {
      if (shouldAdvanceSpin(t, lastFrameAt, live.current.spin, document.hidden, motionPreference.matches, map.getZoom(), SPIN_MAX_ZOOM, map.isMoving())) {
        const dt = Math.min(t - lastSpinAt, 1000 / 15);
        lastFrameAt = t;
        lastSpinAt = t;
        const c = map.getCenter();
        let lng = c.lng - (SPIN_DEG_PER_SEC * dt) / 1000;
        if (lng < -180) lng += 360;
        internalMove.current = true;
        map.setCenter([lng, c.lat]);
        internalMove.current = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Mobil/arka plandan dönüşte haritayı yeniden ölç ve çiz.
    // Bu dalda daha önce hiçbir dönüş dinleyicisi yoktu (visibilitychange,
    // pageshow, focus, orientationchange, webglcontextrestored); kanıt ve
    // davranış ayrıntısı src/lib/mapResume.ts ve mapResume.test.ts içindedir.
    // Harita stiline/görünümüne dokunulmaz: bu yalnız ölçüm + yeniden çizimdir.
    const resume = attachMapResume({ map, canvas: map.getCanvas() });

    report();

    return () => {
      // Dinleyiciler map.remove()'dan ÖNCE kaldırılmalı; aksi hâlde geç gelen
      // bir pageshow/focus olayı kaldırılmış harita üzerinde resize dener.
      resume.dispose();
      cancelAnimationFrame(raf);
      window.removeEventListener("atlasia:weather-toggle", onWeatherToggle);
      weatherDisposed = true;
      weatherLayer?.destroy();
      markers.forEach((value) => value.marker.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Altlık ve etiketleri kaynakları yeniden yüklemeden değiştir; pin ve rota
  // katmanları korunur. Uydu üstündeki etiketler de anahtarsız OpenFreeMap
  // vektörlerinden gelir; böylece raster servis filigranı oluşmaz.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const layer of ["satellite", "street", "topographic"] as const) {
      map.setLayoutProperty(layer, "visibility", layer === baseMap ? "visible" : "none");
    }
    for (const layerId of openFreeMapLayerIds) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        openFreeMapLayerVisible(layerId, showLabels, baseMap) ? "visible" : "none",
      );
    }
    for (const rawLayer of openFreeMapDarkStyle.layers) {
      if (rawLayer.type !== "symbol") continue;
      const paint = mapLabelPaint(rawLayer.id, { theme, baseMap });
      if (!paint) continue;
      const layerId = `${OPEN_FREE_MAP_LAYER_PREFIX}${rawLayer.id}`;
      map.setPaintProperty(layerId, "text-color", paint["text-color"]);
      map.setPaintProperty(layerId, "text-halo-color", paint["text-halo-color"]);
      map.setPaintProperty(layerId, "text-halo-width", paint["text-halo-width"]);
      map.setPaintProperty(layerId, "text-halo-blur", paint["text-halo-blur"]);
    }
    map.setLayoutProperty("kktc-outline", "visibility", showLabels ? "visible" : "none");
    map.setLayoutProperty(
      "kktc-label",
      "visibility",
      kktcLabelVisible(showLabels, baseMap) ? "visible" : "none",
    );
  }, [baseMap, showLabels, ready, theme]);

  // Yakınlaşınca gerçek yükseklik verisini ister; düşük güçlü cihazlarda kapatılabilir.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setTerrain(terrainEnabled ? { source: "terrain", exaggeration: 1.08 } : null);
    map.setLayoutProperty("terrain-relief", "visibility", terrainEnabled ? "visible" : "none");
    if (!terrainEnabled && map.getPitch() > 0) map.easeTo({ pitch: 0, duration: 450 });
  }, [terrainEnabled, ready]);

  // Ekleme modu imleci
  useEffect(() => {
    containerRef.current?.classList.toggle("map-add-mode", addMode);
  }, [addMode]);

  // Pinleri senkronla
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const existing = markersRef.current;
    const ids = new Set(places.map((p) => p.id));

    existing.forEach((v, id) => {
      if (!ids.has(id)) {
        v.marker.remove();
        existing.delete(id);
      }
    });

    places.forEach((p) => {
      if (existing.has(p.id)) return;
      const el = createPinElement(p);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        live.current.onSelect(p.id);
      });
      el.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        live.current.onSelect(p.id);
      });
      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
        opacity: "1",
        opacityWhenCovered: "0",
      })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      existing.set(p.id, { marker, el });
    });
  }, [places, ready]);

  // Aktif pin vurgusu
  useEffect(() => {
    markersRef.current.forEach((v, id) => v.el.classList.toggle("is-active", id === activeId));
  }, [activeId, places, ready]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

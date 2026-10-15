#!/usr/bin/env node
/**
 * Atlasia — TopoJSON (world-atlas / Natural Earth) → GeoJSON dönüştürücü.
 * Bağımlılık yoktur; yalnızca Node yerleşik modülleri kullanır.
 *
 * Kullanım:
 *   node scripts/build-countries-geojson.mjs <girdi.topojson.json> <çıktı.geojson>
 *
 * Her özellik şu alanları taşır:
 *   key    — kararlı tanımlayıcı: ISO 3166-1 numerik kodu varsa o, yoksa isimden türetilmiş slug.
 *   name   — kaynaktaki ad (İngilizce, Natural Earth).
 */
import { readFileSync, writeFileSync } from "node:fs";

const PRECISION = 4; // ondalık basamak (~11 m); 110m ölçek için yeterli

export function decodeArcs(topo) {
  const { scale, translate } = topo.transform ?? { scale: [1, 1], translate: [0, 0] };
  const hasTransform = !!topo.transform;
  return topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([qx, qy]) => {
      if (hasTransform) {
        x += qx;
        y += qy;
        return [round(x * scale[0] + translate[0]), round(y * scale[1] + translate[1])];
      }
      return [round(qx), round(qy)];
    });
  });
}

function round(v) {
  const f = 10 ** PRECISION;
  return Math.round(v * f) / f;
}

function ringFromArcs(indices, arcs) {
  const ring = [];
  for (const idx of indices) {
    const arc = idx >= 0 ? arcs[idx] : [...arcs[~idx]].reverse();
    // Bitişik yayların ortak uç noktasını bir kez yaz.
    ring.push(...(ring.length ? arc.slice(1) : arc));
  }
  return ring;
}

function polygonFromArcs(polyArcs, arcs) {
  return polyArcs.map((ring) => ringFromArcs(ring, arcs));
}

function geometryFromTopo(geom, arcs) {
  if (!geom || !geom.type) return null;
  switch (geom.type) {
    case "Polygon":
      return { type: "Polygon", coordinates: polygonFromArcs(geom.arcs, arcs) };
    case "MultiPolygon":
      return { type: "MultiPolygon", coordinates: geom.arcs.map((p) => polygonFromArcs(p, arcs)) };
    default:
      return null; // bu veri setinde beklenmiyor; sessizce atlanır ve sayısı raporlanır
  }
}

export function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function countriesToGeoJSON(topo) {
  const arcs = decodeArcs(topo);
  const collection = topo.objects.countries;
  const features = [];
  let skipped = 0;
  for (const g of collection.geometries) {
    const geometry = geometryFromTopo(g, arcs);
    const name = g.properties?.name ?? "";
    if (!geometry || !name) {
      skipped++;
      continue;
    }
    const key = g.id != null && String(g.id) !== "" ? String(g.id) : `x-${slugify(name)}`;
    features.push({ type: "Feature", id: key, properties: { key, name }, geometry });
  }
  return { geojson: { type: "FeatureCollection", features }, skipped };
}

function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Kullanım: node scripts/build-countries-geojson.mjs <girdi> <çıktı>");
    process.exit(1);
  }
  const topo = JSON.parse(readFileSync(input, "utf8"));
  const { geojson, skipped } = countriesToGeoJSON(topo);
  writeFileSync(output, JSON.stringify(geojson));
  console.log(`Yazıldı: ${output} · özellik: ${geojson.features.length} · atlanan: ${skipped}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

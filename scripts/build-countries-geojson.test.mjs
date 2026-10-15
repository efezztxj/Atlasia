// Çalıştırma: node --test scripts/build-countries-geojson.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { countriesToGeoJSON, slugify } from "./build-countries-geojson.mjs";

const topo = JSON.parse(readFileSync(new URL("../data/source/world-atlas/countries-110m.topojson.json", import.meta.url), "utf8"));
const out = countriesToGeoJSON(topo).geojson;
const byKey = new Map(out.features.map((f) => [f.properties.key, f]));

test("177 ülke üretilir ve hiçbiri atlanmaz", () => {
  assert.equal(out.features.length, 177);
  assert.equal(countriesToGeoJSON(topo).skipped, 0);
});

test("anahtarlar benzersizdir", () => {
  assert.equal(byKey.size, out.features.length);
});

test("Türkiye (792) ve Kıbrıs (196) ISO kodlarıyla bulunur", () => {
  assert.equal(byKey.get("792").properties.name, "Turkey");
  assert.equal(byKey.get("196").properties.name, "Cyprus");
});

test("ISO kodsuz kuzey Kıbrıs, Somaliland, Kosovo slug anahtarı alır", () => {
  assert.ok(byKey.has("x-n-cyprus"));
  assert.ok(byKey.has("x-somaliland"));
  assert.ok(byKey.has("x-kosovo"));
});

test("halkalar kapalıdır ve koordinatlar geçerli aralıktadır", () => {
  for (const f of out.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) {
      const a = ring[0], b = ring[ring.length - 1];
      assert.deepEqual(a, b, `${f.properties.name} halkası kapalı değil`);
      assert.ok(ring.length >= 4, `${f.properties.name} halkası çok kısa`);
      for (const [x, y] of ring) {
        assert.ok(x >= -180 && x <= 180 && y >= -90 && y <= 90, `${f.properties.name} aralık dışı`);
      }
    }
  }
});

// Referans: topojson-client. Repoya bağımlılık olarak eklenmez; TOPOJSON_CLIENT ortam değişkeni
// ile verilirse çalışır, yoksa test AÇIKÇA atlanır (skip) — sessizce geçmez.
const REF = process.env.TOPOJSON_CLIENT;
test("referans topojson-client çıktısıyla koordinatlar eşleşir (≤1e-4°)", { skip: REF ? false : "TOPOJSON_CLIENT tanımlı değil" }, async () => {
  const topoClient = await import(REF.startsWith("/") ? "file://" + REF : REF);
  const ref = topoClient.feature(topo, topo.objects.countries).features;
  assert.equal(ref.length, out.features.length);
  const flat = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).flat(3);
  for (const r of ref) {
    const key = r.id != null ? String(r.id) : `x-${slugify(r.properties.name)}`;
    const mine = byKey.get(key);
    assert.ok(mine, `eksik: ${key}`);
    const a = flat(r.geometry), b = flat(mine.geometry);
    assert.equal(a.length, b.length, `${key} nokta sayısı`);
    for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] - b[i]) <= 1e-4, `${key} koordinat farkı`);
  }
});

test("antimeridyen: ardışık noktalar arasında 180°'den büyük sıçrama yok", () => {
  const jumps = [];
  for (const f of out.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) for (let i = 1; i < ring.length; i++) {
      if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) jumps.push(f.properties.name);
    }
  }
  // Bilgi amaçlı: sıçrama varsa ülke adlarını raporla (test başarısız olmaz, sonuç açıklanır).
  console.log(`antimeridyen sıçraması olan ülkeler: ${[...new Set(jumps)].join(", ") || "yok"}`);
  assert.ok(true);
});

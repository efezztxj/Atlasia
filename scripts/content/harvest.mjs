import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const WIKIDATA = "https://query.wikidata.org/sparql";
// Wikimedia kullanım politikası tanımlayıcı bir User-Agent ister; yoksa istekler reddedilebilir.
export const USER_AGENT = "AtlasiaContentHarvest/1.0 (https://atlasia.pages.dev; https://github.com/efezztxj/Atlasia)";
const HEADERS = { "User-Agent": USER_AGENT, Accept: "application/json" };
const WIKIPEDIA_LANGS = ["tr", "en"];
// Yalnız tarihî/kültürel yerler: koruma statüsü olanlar, arkeolojik alanlar ve anıtlar.
const HISTORIC_FILTER = "{ ?item wdt:P1435 ?heritage . } UNION { ?item wdt:P31/wdt:P279* wd:Q839954 . } UNION { ?item wdt:P31/wdt:P279* wd:Q4989906 . }";

function validBbox(bbox) {
  return Array.isArray(bbox) && bbox.length === 4 && bbox.every(Number.isFinite) &&
    bbox[0] >= -180 && bbox[2] <= 180 && bbox[1] >= -90 && bbox[3] <= 90 && bbox[0] < bbox[2] && bbox[1] < bbox[3];
}

export async function harvestCandidates({ bbox, fetcher = fetch, capturedAt = new Date().toISOString() }) {
  if (!validBbox(bbox)) throw new TypeError("bbox [west,south,east,north] geçersiz.");
  const [west, south, east, north] = bbox;
  const overpassQuery = `[out:json][timeout:25];(node[historic]( ${south},${west},${north},${east});way[historic]( ${south},${west},${north},${east});relation[historic]( ${south},${west},${north},${east}););out center tags;`;
  const overpassUrl = `${OVERPASS}?data=${encodeURIComponent(overpassQuery)}`;
  const sparql = `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?lat ?lon ?trArticle ?enArticle WHERE { SERVICE wikibase:box { ?item wdt:P625 ?coord . bd:serviceParam wikibase:cornerSouthWest "Point(${west} ${south})"^^geo:wktLiteral . bd:serviceParam wikibase:cornerNorthEast "Point(${east} ${north})"^^geo:wktLiteral . } ${HISTORIC_FILTER} BIND(geof:latitude(?coord) AS ?lat) BIND(geof:longitude(?coord) AS ?lon) FILTER(?lat >= ${south} && ?lat <= ${north} && ?lon >= ${west} && ?lon <= ${east}) OPTIONAL { ?trArticle schema:about ?item ; schema:isPartOf <https://tr.wikipedia.org/> . } OPTIONAL { ?enArticle schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . } SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". } } LIMIT 200`;
  const wikidataUrl = new URL(WIKIDATA);
  wikidataUrl.searchParams.set("query", sparql);
  wikidataUrl.searchParams.set("format", "json");
  const [osmResponse, wikidataResponse] = await Promise.all([fetcher(overpassUrl, { headers: HEADERS }), fetcher(wikidataUrl, { headers: HEADERS })]);
  if (!osmResponse.ok || !wikidataResponse.ok) throw new Error(`İçerik kaynağı yanıt vermedi (Overpass ${osmResponse.status}, Wikidata ${wikidataResponse.status}).`);
  const [osm, wikidata] = await Promise.all([osmResponse.json(), wikidataResponse.json()]);
  const wikidataRows = wikidata.results?.bindings ?? [];
  // Türkçe madde varsa o, yoksa İngilizce madde kullanılır (eski: yalnız İngilizce).
  const articleOf = (row) => row.trArticle?.value ?? row.enArticle?.value ?? row.article?.value;
  const articleRows = wikidataRows.filter((row) => typeof articleOf(row) === "string").slice(0, 20);
  const wikipedia = new Map();
  for (const row of articleRows) {
    const articleUrl = new URL(articleOf(row));
    const lang = articleUrl.hostname.split(".")[0];
    if (!WIKIPEDIA_LANGS.includes(lang)) continue;
    const wikiUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    wikiUrl.searchParams.set("action", "query");
    wikiUrl.searchParams.set("prop", "extracts");
    wikiUrl.searchParams.set("exintro", "1");
    wikiUrl.searchParams.set("explaintext", "1");
    wikiUrl.searchParams.set("titles", decodeURIComponent(articleUrl.pathname.split("/").at(-1) ?? ""));
    wikiUrl.searchParams.set("format", "json");
    const response = await fetcher(wikiUrl, { headers: HEADERS });
    if (!response.ok) throw new Error(`Wikipedia yanıt vermedi (${response.status}).`);
    const data = await response.json();
    const page = Object.values(data.query?.pages ?? {})[0];
    if (page?.extract) wikipedia.set(row.item?.value, { text: page.extract, url: articleUrl.href, lang });
  }
  const candidates = [];
  for (const element of osm.elements ?? []) {
    const tags = element.tags ?? {};
    const point = element.center ?? element;
    const name = tags["name:tr"] ?? tags.name ?? tags["name:en"];
    if (!name || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    candidates.push({
      id: `osm-${element.type}-${element.id}`, title: name, lat: point.lat, lng: point.lon,
      history: tags.description ?? tags.wikipedia ?? "", userNote: "", status: "unverified",
      source: { name: "OpenStreetMap / Overpass", url: `https://www.openstreetmap.org/${element.type}/${element.id}`, license: "ODbL 1.0", attribution: "© OpenStreetMap contributors" }, capturedAt,
    });
  }
  for (const row of wikidataRows) {
    const id = row.item?.value?.split("/").at(-1);
    if (typeof id !== "string") continue;
    candidates.push({
      id, title: row.itemLabel?.value ?? id, description: row.itemDescription?.value ?? "",
      lat: Number(row.lat?.value), lng: Number(row.lon?.value),
      history: "", userNote: "", status: "unverified",
      source: { name: "Wikidata search", url: `https://www.wikidata.org/wiki/${id}`, license: "CC0", attribution: "Wikidata contributors" }, capturedAt,
      wikipediaExcerpt: wikipedia.get(row.item.value)?.text ?? "",
      wikipediaLang: wikipedia.get(row.item.value)?.lang ?? null,
      wikipediaSource: wikipedia.has(row.item.value) ? {
        name: "Wikipedia", url: wikipedia.get(row.item.value).url,
        license: "CC BY-SA 4.0", attribution: "Wikipedia contributors; CC BY-SA 4.0",
      } : null,
    });
  }
  return { schemaVersion: 1, bbox: { west, south, east, north }, generatedAt: capturedAt, appliedToApp: false, candidates };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const values = process.argv.slice(2).map(Number);
  const result = await harvestCandidates({ bbox: values });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

# Teslimat P14 — Overpass + Wikidata/Wikipedia içerik hattı (atıf dahil)

**Tarih:** 2026-10-22 · **Durum:** ✅ boru hattı + atıf tamam; UI bağlantısı ve CSP ayrı karar.

## Politika (`src/utils/historicSites.ts`)
- Dil: yalnız `tr` > `en` (`HISTORY_SUMMARY_LANGS`). Özet 600 karakter, cümle sınırında (`clampSummary`).
- **Tahmin yok:** OSM `wikidata`/`wikipedia` etiketi olmayan yere tarihçe eklenmez. Konuma göre "en yakın madde" (geosearch) fallback'i **kaldırıldı**.
- `wikipedia=de:…` gibi politika dışı etiket doğrudan kullanılmaz; QID `^Q\d+$` doğrulanır; anlam ayrımı sayfası reddedilir.
- Her zenginleştirilmiş yer: `story`, `dataSources` (OSM ODbL + madde/lisans), `historySource {name,title,url,license:"CC BY-SA 4.0",lang}`.
- PlaceDetails hikâyenin altında madde bağlantısı + lisans + OSM atfı gösterir.

## Düzeltilen buglar
- Süresi geçmiş önbellek kaydı ağ hatasında hiç dönmüyordu → `stale` + mesaj.
- Ağ hatası sessiz `[]` dönüyordu → `fetchHistoricSitesDetailed` `status: fresh|cache|fixture|stale|error` + Türkçe mesaj.

## Testler (canlı ağ yok, `vi.stubGlobal("fetch")`)
`historicSites.pipeline.test.ts` (9): yarıçap sıkıştırma, cümle sınırı, tr tercihi + atıf, etiketsiz → hiç wiki isteği yok, `de:` reddi, disambiguation reddi, önbellek isabeti, stale, error. Mevcut 4 Efes fixture testi geçiyor.

## Açık (kullanıcı kararı)
- `historicSites.ts` henüz hiçbir bileşene bağlı değil (yalnız testte).
- `public/_headers` CSP `connect-src` overpass-api.de / wikipedia.org / wikidata.org içermiyor; canlıda bağlanınca istekler engellenir. CSP genişletme güvenlik kararı olduğu için yapılmadı.

## Akış (metin diyagramı) — denetim 2026-10-22'de eklendi
```
fetchHistoricSitesDetailed(center, radius)
 ├─ Efes fixture alanı mı? → fixture (status: fixture)
 ├─ bellek (30 dk) / localStorage (7 g) isabeti → cache
 └─ ıskalama → buildOverpassQuery (200–2000 m, timeout 25) → Overpass
      ├─ ok → ≤60 yer → enrichPlaces:
      │     wikipedia=tr:/en: etiketi → doğrudan madde
      │     yoksa wikidata=Q… → sitelink trwiki > enwiki
      │     yoksa → hiçbir wiki isteği yok (tahmin yok)
      │     özet: disambiguation reddi → clampSummary(600)
      │   → önbelleğe yaz → fresh
      └─ hata → süresi geçmiş kayıt varsa stale + mesaj, yoksa error + mesaj
```

## Lisans uyum listesi
| Veri | Lisans | Nerede görünür |
|---|---|---|
| OSM yer/konum (Overpass) | ODbL | `dataSources` "© OpenStreetMap contributors (ODbL)" + PlaceDetails OSM bağlantısı |
| Wikipedia özeti | CC BY-SA 4.0 | `historySource` → PlaceDetails "Metin: Wikipedia · <madde>" bağlantısı + lisans + "özetlendi" |
| Efes fixture | ODbL + CC BY-SA | fixture `dataSources` → PlaceDetails "Kaynak: …" satırı |

## Canlı doğrulanamayanlar
Canlı Overpass/Wikipedia'ya hiç istek atılmadı (yasak). Gerçek yanıt biçimi fixture'lardan varsayıldı; modül UI'a bağlanınca CSP ile birlikte canlıda denenmeli.

`git diff --check`: temiz (CI #48).

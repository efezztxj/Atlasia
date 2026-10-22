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

# Ülke katmanı — veri kaynağı, uygulama ve doğrulama

Tarih: 2026-10-15. Kapsam: ayrı GeoJSON ülke sınırı katmanı + ülke seçimi + vurgu (prototip). Keşif paneli yalnızca plan.

## 1. Veri kaynağı seçimi

| Aday | Lisans | Durum | Karar |
|---|---|---|---|
| Natural Earth 1:110m Admin-0 | Kamu malı (naturalearthdata.com Terms of Use, doğrulandı) | Güncel sürüm 4.1.0 (world-atlas 2.0.2 üzerinden) | **Seçildi** (110m) |
| Natural Earth 1:50m Admin-0 | Aynı | Aynı kaynak; GeoJSON ~3.9 MB ham boyut | Yedek: görünüm gerekirse ve sadeleştirme ile |
| Natural Earth 1:10m | Aynı | ~3.6 MB TopoJSON, büyük | Kullanılmadı |
| `world-atlas` npm paketi | ISC (LICENSE dosyası doğrulandı) | Natural Earth'ten türetilmiş TopoJSON; referans kaynak | Kaynak TopoJSON olarak kullanıldı |

Seçimin gerekçesi: kamu malı lisans (atıf zorunlu değil), küçük boyut (217 KB GeoJSON, gzip ~76 KB), 177 ülke, prototip ihtiyacına yeterli çözünürlük. Kaynak dosya `data/source/world-atlas/` altında ISC lisansıyla birlikte repoya alındı; yeni çalışma zamanı bağımlılığı eklenmedi.

Bilinen veri özellikleri (doğrulandı):
- ISO numerik kodu olmayan poligonlar: `N. Cyprus`, `Somaliland`, `Kosovo` → anahtar `x-...` slug'ı.
- Kıbrıs (196) ve Kuzey Kıbrıs poligonları **çakışmıyor** (örnekleme: 0 ortak nokta).
- Kuzey Kıbrıs poligonu ile mevcut elle çizilmiş KKTC poligonu (`src/data/regions.ts`) **birebir değil**: elle çizilmiş poligonun ~%96'sı NE poligonunun içinde; NE poligonunun ~%8'i elle çizilmiş alanın dışında.
- Antimeridyen (±180°) geçen ülkeler: Fiji, Russia, Antarctica (artefakt riski, bkz. KNOWN_ISSUES).
- Türkçe ülke adı yok; veri İngilizce adlarla gelir (KKTC hariç, bkz. `countryDisplayName`).

## 2. Mimari yaklaşım

- Veri: `public/data/countries-110m.geojson` (üretim: `scripts/build-countries-geojson.mjs`, bağımlılıksız).
- Yükleme: `src/utils/countries.ts` → `loadCountries()` bir kez `fetch`, hata durumunda önbellek temizlenir.
- MapLibre: `MapView.tsx` içinde `countries` GeoJSON kaynağı, 4 katman (`countries-fill`, `countries-line`, `countries-selected-fill`, `countries-selected-line`). Katmanlar `kktc-outline`'ın altına eklenir; Esri overlay'ine **bağımlı değildir**.
- Seçim: haritada tıklama → `queryRenderedFeatures` yalnızca `countries-fill` üzerinde → `onCountrySelect`. Pin tıklamaları ve ekleme modu önce işlenir ve değişmez.
- Vurgu: yalnızca `setFilter` (`key` eşleşmesi); kaynak yeniden yüklenmez.

## 3. Sınır durumları ve mevcut davranışlar

- KKTC: mevcut `kktc-outline`/`kktc-label` ve `KKTC_GEOMETRY` **değiştirilmedi**. Ülke katmanı ayrı çizilir; iki çizgi biraz farklı şekilde görünebilir (bkz. KNOWN_ISSUES). KKTC seçilince toast "Kuzey Kıbrıs Türk Cumhuriyeti" gösterir.
- Ekleme modu: ülke seçimi tetiklenmez.
- Deniz/boş alan tıklaması: seçimi temizler (`null`).
- Pin tıklaması: `closest(".atl-pin")` ile erken çıkış; ülke seçimi tetiklenmez.

## 4. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `node --test scripts/build-countries-geojson.test.mjs` (dönüştürücü: 177 ülke, anahtar benzersizliği, Türkiye/Kıbrıs kodları, slug'lar, kapalı halkalar, koordinat aralığı) | 6 geçti; referans testi `TOPOJSON_CLIENT` tanımlı değilse **SKIP** |
| Referans `topojson-client` ile koordinat karşılaştırması (`TOPOJSON_CLIENT=... node --test`) | 7/7 geçti (≤1e-4°) |
| `npx tsc --noEmit` | Geçti |
| `npx vite build` | Geçti; `dist/data/countries-110m.geojson` üretildi |
| Tarayıcı: KKTC arama → merkeze tıklama | **Geçti** — toast "Ülke seçildi: Kuzey Kıbrıs Türk Cumhuriyeti"; ekran görüntüsünde amber vurgu görüldü |
| Tarayıcı: Türkiye (Efes sonrası) çoklu tıklama | Seçim **çalıştı** (4 karadaki nokta "Turkey"; denizde seçim temizlendi); ancak **Türkiye vurgusu piksel örneklemesinde görülmedi** — açık sorun |
| Tarayıcı: pin/rota/altlık regresyonu | **Yapılmadı** (kısmen: Efes pininin detay paneli açıldı, mevcut davranış) |

Tarayıcı testi: `@sparticuz/chromium` (npm, test amaçlı, yalnızca /tmp; repoya eklenmedi), `playwright-core` (/tmp). Uygulama `vite preview` ile sunuldu. Sandbox'ta ESRI/CARTO karoları yüklenemediği için (ERR_CONNECTION_CLOSED / AJAXError) harita arka planı koyu; bu yüzden görsel yorumlar sınırlı.

## 5. Keşif paneli planı (uygulanmadı)

Kapsam: ülke seçildiğinde açılacak panel. Şehir → ilçe → konum hiyerarşisi **ayrı bir veri ve gezinme modeli** olarak ele alınacak; ülke sınırlarıyla aynı şey değildir.

1. Veri: ülke → şehir/ilçe için ayrı kaynak gerekir (Natural Earth 10m admin-1 veya ayrı idari veri). Lisans ve boyut ayrıca doğrulanmadan eklenmeyecek.
2. Durum: `selectedCountry` (zaten App.tsx'te). Panel `BottomPanel`/`Drawer` tasarım dilinde, mevcut `Explorer` akışına eklenir.
3. İçerik (ilk sürüm): ülke adı, o ülkedeki kayıtlı yerler (`places` içinde ülke eşleşmesi — kayıtlarda ülke alanı yok, bu ayrıca çözülmeli), "Haritada göster" (fitBox).
4. Hiyerarşi: sonraki aşama; veri kaynağı netleşince.
5. Test: panel açılış/kapanış ve harita regresyonu tarayıcıda doğrulanacak.

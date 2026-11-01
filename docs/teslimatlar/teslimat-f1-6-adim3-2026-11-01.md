# Teslimat — F1-6 adım 3 (harita sahnesi) 

**Tarih:** 2026-11-01 · **Dal:** `arena/1446722f-atlasia` · **Commit:** `46ffc88`
**Plan:** `docs/gorevler/10-10-yol-plani-2026-11-01.md` §F1-6

## Ne değişti

| Öğe | Önce | Sonra |
|---|---|---|
| `Explorer.tsx` | 969 satır | **783 satır** |
| Harita sahnesi | Explorer içinde 177 satır | `src/components/explorer/MapScene.tsx` (61 prop) |
| Toplam (başlangıç 1.796) | — | **-1.013 satır (%56)** |

Taşınanlar: `MapView` + `MapLoadingSkeleton`, `Header`, `Hero` + masaüstü `SearchBox`,
`MapControls`, `WalkFab`, `MapLayersSheet`, `TrackRecorderPanel`, `NearbyAudioGuide`,
`MapSurfaceHints` ve mobil arama sayfası. Bileşen **durum sahibi değil**; 32 prop kancalardan
`Pick<>` ile, 30 prop `MapSceneExtras` arayüzünden gelir.

**Tembel yükleme korundu:** `MapView`, `MapLayersSheet`, `TrackRecorderPanel`, `NearbyAudioGuide`
`lazy()` bildirimleri bileşenle birlikte taşındı; ilk boya JS 99.101 B gzip (bütçe 102.200).

## Kapılar (yerel)

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ 0 hata, 0 uyarı |
| `npx vitest run` | ✅ **187 dosya / 1.438 test** |
| `npm run test:cov` | ✅ %64,63 / %55,47 / %59,92 / %69,59 (eşik 63/54/59/68) |
| `npm run test:scripts` | ✅ 12/12 |
| `npm run build` | ✅ JS **1.000.678 B gzip** (bütçe 1.003.000 · pay **2.322 B**) · CSS 35.629/35.700 · SW 63/63 |
| `node scripts/state-doc.mjs --check` | ✅ |

## Kaynak metin kapıları (gevşetilmedi, taşındı)

`lazyLoading` (MapView + Suspense iskeleti, yer detayı + iz kaydedici), `uiSurface` (harita rayı
bağlantıları: `trackRecorderOpen`, `atlasOpen`), `mapLabelCalibration` (`theme={theme}` bağı),
`guestMode` (yürüyüş kaydı kapısı) — dördü de artık `MapScene.tsx`'i okuyor. Ek olarak
`lazyLoading` "Explorer `MapView` bileşenini lazy olarak kurmaz" iddiasını koruyor.

## Kalan (ölçülü)

`Explorer.tsx` 783 satır · hedef ≤ 400 · **fark 383 satır**. Kalanın ölçülen dağılımı:

| Parça | Yaklaşık satır | Not |
|---|---|---|
| Alt yığın JSX: `BottomPanel` + `AtlasAssistant` + `SocialPanel` | ~100 | `SocialPanel` ~18 cloud geri çağrısı istiyor; tip sözleşmesi en maliyetli parça |
| `settingsContentProps` nesnesi | ~55 | Kendi kancasına alınabilir (35 girdi) |
| Efektler: kısayol (`?tab=`), T5 niyeti, dock görünürlüğü, paylaşım bağlantısı | ~90 | Davranışsal; testle kilitlenmeli |
| Türetilmiş değerler (`nearby`, `heroHidden`, `activePlace`, `current`, `visiblePlaces`) | ~40 | Saf; `useMemo` kümesi olarak taşınabilir |
| Kabuk JSX (banner'lar, toast, ConfirmDialogHost, sarmalayıcı) | ~35 | Küçük |

Sıradaki dilim önerisi: **alt yığın JSX** (en büyük tek parça) → ~683; ardından
**`settingsContentProps` + türetilmiş değerler** → ~590; sonra **efektler** → ~500; kalan kabuk
ve küçük yardımcılarla ≤ 400.

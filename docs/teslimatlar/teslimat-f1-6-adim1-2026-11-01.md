# Teslimat — F1-6 adım 1 (JSX bölmesi: harita kromu, geçici katmanlar, alt çubuk)

**Tarih:** 2026-11-01 · **Dal:** `arena/1446722f-atlasia`
**Plan:** `docs/gorevler/10-10-yol-plani-2026-11-01.md` §F1-6 · **Önceki:** `teslimat-f1-2-f1-5-2026-11-01.md`

## Ne değişti

`Explorer.tsx` içinde mantık taşımayan, yalnız "göster/gizle + geri çağrı" sözleşmesiyle
çalışan JSX parçaları `src/components/explorer/` altına taşındı. **Davranış değişmedi**;
sınıf adları, `aria-*` nitelikleri ve metinler birebir korundu.

| Yeni dosya | Bileşen | Prop sayısı |
|---|---|---|
| `MapCanvas.tsx` | `MapSurfaceHints` (ipucu, atıf, konumu temizle) | 2 |
| `OverlayPanels.tsx` | `DataErrorBanner`, `AddModeBanner`, `MobileSearchSheet`, `ToastBanner` | 2–4 |
| `DockChrome.tsx` | `MobileTabBar`, `WalkFab` | 2–7 |

**`Explorer.tsx`: 1.568 → 1.469 satır** (defter 1.469'a kısıldı).

Yöntem notu: prop adları `Explorer` içindeki adlarla **aynı** tutuldu; taşınan JSX gövdesi
tek karakter değişmeden yerleşti. Böylece "elle yeniden yazarken sessiz davranış kayması"
riski ortadan kalktı.

## Testler

`src/components/explorer/chrome.test.ts` — **11 test**:
- sekme sırası sabit: `Keşfet · Topluluk · (+) · Profil · İzlerim` (ürün kararı),
- etkin sekmede `aria-current="page"`, ekleme modunda `aria-pressed="true"`,
- hata şeridinin "Yeniden dene" ve "kapat" düğmeleri **ayrı** geri çağrılara gider,
- atıf satırı Esri · OpenFreeMap · OpenMapTiles · OpenStreetMap · AWS Terrain Tiles adlarını anar,
- konum yokken "konum işaretini kaldır" düğmesi çizilmez.

## Kaynak metin kapıları (gevşetilmedi, taşındı)

- `src/config/uiSurface.test.ts`: sekme etiketleri ve `mobile-walk-fab` işareti artık
  `DockChrome.tsx` içinde aranıyor.
- `src/config/darkMapSource.test.ts`: atıf metni artık `MapCanvas.tsx` içinde aranıyor **ve**
  `Explorer.tsx`'te ikinci kopya olmadığı ayrıca ölçülüyor.

## Çalıştırılan komutlar (yerel)

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ 0 hata, 0 uyarı |
| `npm run test:cov` | ✅ **184 dosya**; kapsam **%62,98 / %54,61 / %58,74 / %67,79** (eşik 62/54/58/67) |
| `npm run test:scripts` | ✅ 4/4 |
| `npm run build` | ✅ JS 3.341.493 B ham / **998.547 B gzip** (bütçe 1.003.000) · CSS 35.629/35.700 · ilk boya JS 99.099/102.200 · SW 63/63 |
| `node scripts/state-doc.mjs --check` | ✅ |

## Riskler / geri alma

- **Risk:** JSX taşınırken bir `aria-label` veya sınıf adı düşerse erişilebilirlik sessizce bozulur.
  **Karşılık:** 11 test tam olarak bu nitelikleri ölçüyor; iki kaynak metin kapısı da dosya
  adresini takip ediyor. **Geri alma:** tek commit geri alınır; kancalar ve Explorer bağımsız.
- **Ölçülen sınır:** `Explorer.tsx` 1.469 satır; plan hedefi ≤ 400. Aradaki fark **mantık**
  (904 → bugün ~840 satır işleyici/türetilmiş değer). JSX'in kalanı (~350 satır) panel
  orkestrasyonudur ve taşınması ~65 prop'luk bir sözleşme gerektirir.

## Sıradaki iş

1. **F1-6 adım 2:** panel orkestrasyonu (~266 satır) → `src/components/explorer/OverlayPanels.tsx`
   içine ikinci bileşen; ~65 prop'luk arayüz tek seferde yazılmalı ve `typecheck` ile kapanmalı.
2. **F1-6 adım 3 / F2-1:** işleyici kümeleri (yer/rota CRUD, rapor/ban akışları) kancalara →
   `Explorer.tsx` ≤ 400 satır, modül boyutu allowlist'inden çıkarma.

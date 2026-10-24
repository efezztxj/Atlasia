# Teslimat — Harita kapsülü sağ kenarda dikey ortaya taşındı

**Tarih:** 2026-10-24 · **Dal:** `arena/77308ee1-atlasia`
**Kaynak:** Kullanıcının ekran görüntüsü üzerine çizdiği sağ kenar düzeni önerisi + "KANKA DÜZELT" onayı.

## Yapılan

- `src/components/MapControls.tsx`: Masaüstünde (`md+`) kapsül sağ alttan (`md:bottom-24`) alındı; artık **sağdan 20 px içeride, dikeyde tam ortada** (`md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2`).
- Tam boy kenar şeridi yapılmadı: mevcut cam/altın kapsül korundu, yalnız konumu değişti. Böylece kaydırma çubuğu hissi vermeden sağ alt köşe rahatladı; Atlas AI sağ altta tek başına kaldı.
- Mobil düzen değişmedi: kapsül ölçülen alt yığın kuralıyla keşif kartının 10 px üstünde durmaya devam ediyor; açık panelde gizlenme (`hiddenOnMobile`) aynen korundu.
- `src/config/uiSurface.test.ts`: Masaüstü kapsülünün sağ-orta konumunu kilitleyen regresyon testi eklendi.

## Ölçümler (gerçek uygulama; PC 1366×900, mobil 390×844)

- PC kapsül: 58×369; merkezi ekran merkeziyle aynı (sapma **0 px**); sağ kenar boşluğu **20 px**.
- Kapsül altı ↔ Atlas AI üstü: **189 px** (çakışma yok).
- Mobil kapsül ↔ keşif kartı: **10 px** (değişmedi); sayfa hatası 0.
- Görseller (çalışma alanı): `design-vizyon/kenar-pc.png`, `kenar-mobil.png`.

## Kapılar

- `typecheck` ✅ · `lint` ✅ · `test:run` **126 dosya / 949 test** ✅ · `test:scripts` ✅
- `build` ✅ (bundle bütçesi içinde; entry **155.236 B** gzip) · `verify:social-metadata` ✅ · `audit:check` ✅
- `test:rules:emulator`: ortamda Java yok → CI koşar.

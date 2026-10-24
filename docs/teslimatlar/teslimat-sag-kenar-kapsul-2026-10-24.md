# Teslimat — Harita kontrollerine sağ kenar dikey rayı eklendi

**Tarih:** 2026-10-24 · **Dal:** `arena/77308ee1-atlasia`
**Kaynak:** Kullanıcının ekran görüntüsü üzerine çizdiği sağ kenar düzeni önerisi + "KANKA DÜZELT" onayı. İlk sürüm kapsülü yalnız taşımıştı; kullanıcının "eklemeyi yapmamışsın" düzeltmesiyle çizilen uzun kenar eki de eklendi.

## Yapılan

- `src/components/MapControls.tsx`: Masaüstünde (`md+`) kontrole, sağ kenara yaslı **dikey cam ray** eklendi: üstte arama alanının altında başlıyor (`top: 196px`), altta Atlas AI'ın üstünde bitiyor (`bottom: 96px`), sağ kenara sıfır yaslı ve yalnız sol köşeleri yuvarlak (`rounded-l-[30px] / rounded-r-none`).
- Butonlar rayın içinde ortalı duruyor; 850 px'den uzun ekranlarda araları açılarak ray boyunca dengeli dağılıyor. Ray `z-[5]` ile arama katmanının altında; arama sonuçları rayın üstüne sorunsuz açılıyor. Atlas AI sağ altta tek başına kaldı.
- Mobil düzen değişmedi: kapsül ölçülen alt yığın kuralıyla keşif kartının 10 px üstünde durmaya devam ediyor; açık panelde gizlenme (`hiddenOnMobile`) aynen korundu.
- `src/config/uiSurface.test.ts`: Masaüstü ray geometrisini kilitleyen regresyon testi eklendi.

## Ölçümler (gerçek uygulama; PC 1366×900, mobil 390×844)

- PC ray: **58×608**, sağ kenara sıfır yaslı; üst 196, alt 804 (Atlas AI üstüyle arada **20 px**).
- Mobil kapsül ↔ keşif kartı: **10 px** (değişmedi); sayfa hatası 0.
- Görseller (çalışma alanı): `design-vizyon/kenar-pc.png`, `kenar-mobil.png`.

## Kapılar

- `typecheck` ✅ · `lint` ✅ · `test:run` **126 dosya / 949 test** ✅ · `test:scripts` ✅
- `build` ✅ (bundle bütçesi içinde; entry **155.331 B** gzip) · `verify:social-metadata` ✅ · `audit:check` ✅
- `test:rules:emulator`: ortamda Java yok → CI koşar.

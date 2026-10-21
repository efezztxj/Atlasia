# Teslimat P13 — Harita etiket çakışması (ROADMAP §2.4 kusur #9): doğrulama + kilit + B düzeltmesi

**Tarih:** 2026-10-21 (Europe/Istanbul)
**Branch:** doğrulama `arena/1ec59f65-atlasia`; düzeltme `arena/4c96a101-atlasia` (`d037194`)
**Durum:** ✅ Tamamlandı. Kullanıcı önerilen **B seçeneğini** onayladı; düzeltme uygulandı ve kilit düzeltilmiş sözleşmeye güncellendi. İlk doğrulama aşamasında MapView.tsx'e dokunulmamıştı; düzeltme onayı sonrasında yalnız görünürlük koşulu değiştirildi.

---

## 1. Kusur çoğaltıldı mı? Evet — statik kanıtla

Görünürlük matrisi (stil kurulumu `openFreeMapLayers` + güncelleme efekti
aynı kuralları uyguluyor; ikisi de kaynak kilidiyle doğrulandı):

| Katman ailesi | dark | satellite | street (Esri) | topographic (Esri) |
|---|---|---|---|---|
| OpenFreeMap symbol (şehir/yol/su etiketleri) | labels | labels | gizli | gizli |
| OpenFreeMap symbol olmayan (çizgi/dolgu) | görünür | gizli | gizli | gizli |
| `kktc-outline` (çizgi) | labels | labels | **labels** | **labels** |
| `kktc-label` ("KUZEY KIBRIS TÜRK CUMHURİYETİ") | labels | labels | **labels** | **labels** |

- OFM etiketleri kasıtlı olarak street/topo'da gizleniyor çünkü Esri raster
  altlıkları **kendi etiketleriyle geliyor**; çifte etiket istenmiyor.
- `kktc-label` bu kurala tabi değil: görünürlüğü yalnızca etiket anahtarına
  bağlı, `text-allow-overlap: true` ile çiziliyor ve zoom 5.2–11 aralığında
  Esri'nin Kıbrıs etiketinin üstüne basabiliyor. **Kusur #9 kod düzeyinde
  mevcut ve kesindir**; tarayıcıda gözle görmeye gerek kalmadan kanıtlanıyor.

## 2. Yapılan (kilit)

- `src/config/mapLabelVisibility.test.ts` (yeni, 4 test): yukarıdaki
  matrisin tüm hücrelerini + KKTC etiketinin zoom aralığı (5.2–11),
  konumu ve `text-allow-overlap` değerini değişmez olarak kilitler.
  Kusur testi özellikle "KUSUR #9 ... karar bekliyor" adıyla işaretli;
  davranış farkında olmadan değişirse test kırılır ve karar zorunlu olur.
- Mevcut `mapLabelCalibration.test.ts` ve `darkMapSource.test.ts`
  desenleriyle aynı statik-kilit yaklaşımı kullanıldı.

## 3. Neden düzeltme bu teslimatta yok?

Düzeltme tek satırlık görünürlük koşulu bile olsa `MapView.tsx` içindeki
**katman mantığına** dokunur — ROADMAP §4 dokunma listesinde ayrı onay
gerektirir. Ayrıca KKTC etiketinin her altlıkta gösterilmesi ürün kararı da
olabilir (Esri etiketinin öncelenmesi istenmiyor olabilir). Bu yüzden
karar kullanıcıda:

| Seçenek | Etki | Maliyet |
|---|---|---|
| A) kktc katmanlarına da altlık koşulu (yalnız dark/satellite) | Street/topo'da Esri etiketi tek başına kalır; çakışma biter, KKTC adı o altlıklarda Esri yazımıyla görünür | 2 satır + test güncelleme |
| B) kktc-outline her altlıkta, kktc-label yalnız dark/satellite | Sınır çizgisi her yerde kalır, yazı çakışması biter | 2 satır + test güncelleme |
| C) Mevcut davranış kasıtlı kabul edilir | ROADMAP #9 "kasıtlı" diye kapatılır; bu kilit testi sözleşme olur | 0 kod |

## 4. Doğrulama

- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run test:run` 53 dosya / **268 test** ✅ · `npm run build` ✅ · `git diff --check` ✅
- Değişen: `src/config/mapLabelVisibility.test.ts` (yeni), bu teslimat, plan tablosu güncellemesi.
- Kilitli dosyalar: `MapView.tsx`, `firestore.rules` değişmedi.


## 5. Düzeltme tamamlandı — B seçeneği (2026-10-21)

- `MapView.tsx` içine `kktcLabelVisible(labels, baseMap)` yardımcısı eklendi:
  etiket yalnız `labels && (dark || satellite)` iken görünür.
- Aynı koşul hem ilk stil kurulumunda hem güncelleme efektinde kullanılır.
- `kktc-outline` davranışı değişmedi: her altlıkta yalnız `labels` bayrağına
  bağlıdır. Böylece sınır vurgusu korunurken street/topographic altlıklarında
  Esri'nin gömülü etiketiyle metin çakışması biter.
- `mapLabelVisibility.test.ts`, kusurun varlığını kilitleyen testten
  düzeltilmiş matrisi kilitleyen sözleşmeye çevrildi.

Güncel matris:

| Katman ailesi | dark | satellite | street (Esri) | topographic (Esri) |
|---|---|---|---|---|
| OpenFreeMap symbol | labels | labels | gizli | gizli |
| OpenFreeMap symbol olmayan | görünür | gizli | gizli | gizli |
| `kktc-outline` | labels | labels | labels | labels |
| `kktc-label` | labels | labels | **gizli** | **gizli** |

Hedefli doğrulama: `mapLabelVisibility + mapLabelCalibration +
darkMapSource` = 3 dosya / 13 test ✅; ayrıca dalın tam kapısı
`typecheck`, `lint`, 73 dosya / 399 test ve `build` ile yeşildir
(dal toplamı P16 testlerini de içerir).

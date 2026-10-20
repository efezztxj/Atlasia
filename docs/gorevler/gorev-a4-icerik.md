# GÖREV A4 — Rehber içerik doldurma (Agent-1)

## Amaç
Atlasia rehberindeki yerleri "gerçek içerik"le doldur: her yere `story` (özgün hikâye) + `advice()` özel
kaydı (erişim/uyarı/zamanlama/ücret). Şu an: 28 rehber yerinin HİÇBİRİNDE `story` yok;
`src/utils/placeAdvice.ts` içinde özel kayıtlı yalnız 5 yer var (kyoto, petra, kapadokya, banff, navagio).

## Bağlam (kod gerçeği)
- `src/data/places.ts` → `BASE_PLACES: Place[]` (28 kayıt, `kind: "guide"`).
- `src/types.ts` → `Place` tipi: `note` (kısa ipucu, dolu), `story?` ("Yerin özgün hikâyesi", BOŞ),
  `gallery?`, `dataSources?` (atıf alanı).
- `src/utils/placeAdvice.ts` → `advice(place)`: access/caution/timing/cost — 5 yerde özel, kalanı jenerik.
- `src/utils/placePhotos.ts`, `src/data/galleries.ts`: fotoğraf altyapısı hazır.
- Ürün kararı (f): içerik kaynağı = Overpass + Wikidata/Wikipedia (LLM API çalışma zamanı YOK).

## Kapsam (sana ait)
1. `Place.story` alanını 28 rehber yerinin TAMAMI için doldur — yer başına 2-4 cümle, TÜRKÇE,
   yere özgü, uydurma tarih YOK. Wikipedia/Wikidata özeti kullanıyorsan:
   - metni kendi cümlelerinle sarf et (kopyala-yapıştır uzun pasaj yok),
   - `dataSources: ["OSM (ODbL)", "Wikipedia (CC BY-SA)"]` gibi atıfı ekle.
2. `advice()` özel kayıtlarını en az 19 yere çıkar (öncelik: Türkiye + en bilinenler); kalanlarda
   jenerik fallback kalabilir ama jenerik metinleri de netleştir.
3. `note` alanlarına DOKUNMA (onlar editörün kısa ipuçları).
4. Testler: her guide yerde `story` var mı, uzunluk sınırları (ör. 80-600 karakter),
   `advice()` dönüşümünün 4 alanı dolu mu, `dataSources` atıfı var mı.

## ORTAK DOSYA KURALI (zorunlu)
- Dokunduğun HER ortak dosyanın (`places.ts`, `placeAdvice.ts`, `types.ts` vb.) **TAMAMINI** teslim et;
  parça diff gönderme. Teslimat dosyasında dokunduğun ortak dosyaları listele.
- Mümkünse yalnız kendi eklediğin alanları değiştir; `types.ts`'e YENİ alan ekleme (gerekirse teslimatta
  iste, denetmen karar verir).

## Kısıtlar
- Ücretsiz katman: çalışma zamanında ücretli/limitli API ÇAĞRISI yok (Wikidata/Overpass yalnız
  geliştirme sırasında; üretilen metin koda gömülü).
- Kod içi Türkçe yorumlar ASCII-Türkçe (repo stili). Metin içerikleri normal Türkçe olabilir.
- `check:local` kapıları yeşil olmalı: `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build`.

## Teslim
- `teslimat-a4.md`: ne yaptın, hangi yerlere içerik girdi, kaynaklar/atıflar, kanıt (komut çıktıları).
- Commit'ler: `conventional commit`. Kendi branch'inde çalış, push et; denetim sonra.

## Kabul kriterleri
- 28/28 guide yerde `story` dolu ve benzersiz (kopyalanmış metin yok).
- `advice()` özel kaydı ≥ 19 yerde; 4 alan dolu.
- Atıflar eksiksiz. Tüm kapılar yeşil. Yasaklı desen yok (bkz. AGENTS.md).

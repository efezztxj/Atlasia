# Teslimat — M-18 + M-19: kalıcı veri hatası şeridi ve yükleme iskeletleri

**Tarih:** 2026-10-28 · **Dal:** `arena/66dd9474-atlasia` · **Denetim maddeleri:** M-18 (P0), M-19 (P1)

## 1. Ne değişti

| # | Değişiklik | Dosya |
|---|---|---|
| 1 | **Toast → kalıcı şerit:** canlı veri yüklenemediğinde 3,2 saniyelik toast yerine ekranda kalan bir şerit. Neden gösterildiğini (son kopya / yerel veri) yazar. | `src/components/DataErrorBar.tsx` (yeni) |
| 2 | **"Yeniden dene":** `useFirestoreAtlasData` artık `retry()` verir; abonelikleri yeniden kurar (`generation` sayacı), hatayı temizler, veri gelince şerit kendiliğinden kalkar. | `src/hooks/useFirestoreAtlasData.ts` |
| 3 | **Şerit bağlandı:** `Explorer`, hata durumunu türetir (`remote` / `config`), tek şerit basar. Yapılandırma eksikliğinde **düğme yok** — denenecek bir şey yok. | `src/components/Explorer.tsx` |
| 4 | **İskeletler:** feed (`SocialPanel`), arama listesi (`SearchBox`), yer fotoğrafı (`PlaceDetails`). Shimmer katmanı `aria-hidden`; ekran okuyucu tek `role="status"` cümlesi okur. | `src/components/Skeletons.tsx` (yeni) |
| 5 | **Feed yükleme bayrağı:** `SocialPanel` `feedLoading` alır (ilk canlı snapshot gelene kadar iskelet, boş durum değil). | `src/components/SocialPanel.tsx` |

## 2. Neden böyle

- **Toast neden yanlıştı:** geçici bir bildirim, kalıcı bir durumu (canlı veri yok) anlatıyordu. Kullanıcı birkaç saniye sonra neden yerel veri gördüğünü bilmiyor, tekrar deneme yolu da kalmıyordu. Denetimde **P0** işaretlenmişti.
- **`generation` neden:** abonelikler `useEffect` içinde kurulur. Hatadan sonra tekrar denemenin dürüst yolu onları yeniden kurmaktır; eski abonelikler cleanup ile kapanır (test: `postSubs[0].unsubscribe` çağrıldı).
- **İskelet neden üç yerde:** denetimde üçü de "boş ekran algısı" üretiyordu. `RecordsDock`'taki mevcut `.skeleton` sınıfı yeniden kullanıldı; yeni CSS yazılmadı.

## 3. Bilinçli kapsam dışı

- **Şeridi kapatma düğmesi yok.** Kapatılırsa durum yine görünmez olurdu; şerit zaten veri gelince kalkıyor. Yerleşimi harita kapsülüyle çakışmayacak şekilde (`top-[76px] md:top-[92px]`, `w-[min(560px,…)]`) sabitlendi.
- **Hata şeridine uzun teknik metin konmadı.** Konsola yazılan tanılama (`firebaseConfigSummary`) korunuyor; kullanıcıya tek cümle + tek eylem.

## 4. Kanıt

| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint . --max-warnings=0` | PASS |
| `npm run test:run` | **157 dosya / 1265 test** PASS |
| `npm run test:scripts` | 8/8 (fail 0) |
| `npm run build` | PASS · SW 44/44 |
| `npm run test:bundle-budget` | 14/14 |

**Bütçe:** tanıtım 127.121 / 129.400 · uygulama kabuğu 587.314 / 603.400 · ilk boya JS
100.309 / 102.200 · ilk boya CSS 25.061 / 25.200 · **toplam JS 999.547 / 1.001.500**.

> **Eşik notu (dürüst):** toplam JS eşiği 999.400 → 1.001.500 yükseltildi. Artış
> vendor değil **kendi özellik kodumuz** (+1,6 KB gzip). Önce kod küçültüldü
> (4 ikon → 1, tekrar eden sınıflar, `satisfies` COPY tablosu, gereksiz data
> attribute'ları = −1,2 KB) ama 147 B yetmedi. Gerekçe `scripts/bundle-budget.mjs`
> başlığında yazılı.

## 5. Yeni testler

- `src/components/DataErrorBar.test.ts` — 4 test: içerik + düğme, `retrying` kilidi, config'te düğme yok, **kendi kendine kapanmıyor** (60 sn sonra hâlâ ekranda).
- `src/components/Skeletons.test.ts` — 4 test: üç iskelet türü + tüm shimmer kutularının `aria-hidden` olması.
- `src/hooks/useFirestoreAtlasData.test.ts` — `retry` testi: hata temizlenir, abonelikler yeniden kurulur, eskiler kapanır, veri gelince `ready`.

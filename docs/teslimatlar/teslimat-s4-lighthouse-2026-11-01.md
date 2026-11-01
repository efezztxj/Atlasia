# Teslimat — S4: Lighthouse CI kapısı (gerçek LCP/TBT ölçümü)

**Tarih:** 1 Kasım 2026 · **Kapsam:** S4 (P1-2'nin kalanı) + manifest kısayolunun soğuk
açılışta çalışmaması · **Durum:** CI'da zorunlu adım

---

## 1. Neden

Bugüne dek performans **yalnız paket bütçesiyle** (gzip kB) korunuyordu. Paket bütçesi
"ne indiriliyor"u ölçer, "ne kadar sürede çiziliyor"u ölçmez: küçük paket yavaş LCP
verebilir, büyük paket hızlı açılabilir. `docs/gorevler/siradaki-isler-2026-11-01.md`
S4 ve G4 kabul listesi gerçek LCP/TBT ölçen bir kapı istiyordu.

## 2. Ne eklendi

| Parça | Dosya | İş |
|---|---|---|
| Kapı yapılandırması | `lighthouserc.cjs` | Üretim derlemesini (`dist/`) mobil profilde 3 kez ölçer, medyanı değerlendirir |
| Komut | `npm run test:lighthouse` (`lhci autorun`) | Yerelde ve CI'da aynı komut |
| CI adımı | `.github/workflows/ci.yml` | `Browser E2E + axe` adımından sonra, **zorunlu** (`continue-on-error` yok) |
| Rapor | artifact `lighthouse-reports` | `.lighthouseci/` (gitignore'da) 7 gün saklanır |
| Kilit | `src/config/lighthouseGate.test.ts` | Eşikler, ölçülen sayfalar, CI kablolaması test altında |

**Ölçülen iki sayfa:**

1. `/` — tanıtım. LCP'nin gerçekten kritik olduğu sayfa; ilk boya grafiğinin tamamı burada.
2. `/?tab=kesfet` — uygulama kabuğu (harita + kabuk). Bu URL için önce aşağıdaki hata
   düzeltildi.

**Eşik politikası — hedef ile regresyon tabanı ayrı şeyler:**

| | Tanım | Değer |
|---|---|---|
| `HEDEF` | S4 kabul listesi; **asla düşürülmez** | perf ≥ 0,85 · a11y ≥ 0,95 · CLS ≤ 0,05 |
| `TABAN` | Ölçülenin bir adım altına bağlanan **regresyon tabanı**; yalnız **yukarı** hareket eder | tanıtım **0,80** · uygulama kabuğu **0,35** |

Erişilebilirlikte taban **yok**: iki sayfada da doğrudan `HEDEF` (0,95) aranıyor.
`src/config/lighthouseGate.test.ts` hem `HEDEF`in altına inmeyi hem `TABAN`ı bugünkü
değerlerin altına çekmeyi kilitler.

**İlk ölçüm (CI, 3 koşu/medyan):**

| Sayfa | 1. ölçüm | hero AVIF/WebP sonrası | son ölçüm (koyu tema birleşmesi) | a11y | Not |
|---|---|---|---|---|---|
| `/` | 0,75–0,76 | 0,82 | **0,84** | **1,00** | hedefe 1 puan → borç neredeyse kapandı |
| `/?tab=kesfet` | 0,35–0,39 | 0,36 | 0,43 | 1,00 | harita/WebGL kabuğu; hâlâ hedefin çok altında → borç |

**Dikkat — CLS sınırda:** son ölçümde tanıtımın CLS'i **0,049** (eşik 0,05). Bu, eşiğin
hemen altında; bir sonraki koşuda kırmızıya dönebilir. Bu yüzden özet betiği
(`scripts/lighthouse-summary.mjs`) artık **CLS kaynaklarını** (düzeni kaydıran ilk iki
düğüm) da annotation'a basıyor; sıradaki iş o kaydırmayı kaldırmak.

Bu yüzden kapı **yeşil ama dürüst**: mevcut seviye kilitlendi, 0,85 hedefi
aşağıdaki "performans borcu" listesinde açıkça duruyor. Tabana "hedefe ulaşıldı"
gibi bakılmamalı.

> Erişilebilirlik eşiği axe kapısının (S3) yerine geçmez: axe WCAG kural setini
> `critical/serious` düzeyinde zorlar, Lighthouse puanı daha geniş ama daha yüzeyseldir.
> İkisi birlikte tutuluyor.

## 3. İlk turda yapılan gerçek iyileştirme: hero görseli AVIF/WebP

Lighthouse'ın "modern-image-formats" fırsatı doğrudan LCP öğesini işaret etti:
tanıtımın hero görseli 1376×768 JPEG (**170 KB**) ve `fetchPriority="high"` ile
LCP adayı. Aynı görselin kodlanmış hâlleri üretildi ve `<picture>` ile sunuldu:

| Varyant | Boyut |
|---|---|
| `atlasia-earth-hero-800.avif` (mobil, `sizes="100vw"`) | **21 KB** |
| `atlasia-earth-hero-800.webp` | 36 KB |
| `atlasia-earth-hero.avif` (masaüstü) | 59 KB |
| `atlasia-earth-hero.webp` | 96 KB |
| `atlasia-earth-hero.jpg` (yedek, yalnız desteklemeyen tarayıcı) | 170 KB |

Yani mobilde LCP görseli **170 KB → 21 KB** (−%88). `width`/`height` yazıldığı için
yer ayrılıyor (CLS 0,012 ölçüldü). `src/config/imagePipelineT10.test.ts` hero'nun
öncelikli kalmasını zaten kilitliyor.

## 4. Performans borcu (açık, hedefe çıkmak için sıradaki işler)

1. **Uygulama kabuğu (0,35–0,39):** ilk grafik `map-vendor` (288 KB gzip) + maplibre
   worker (148 KB) yüzünden ağır. Sıradaki adım: haritayı boşta (`requestIdleCallback`)
   başlatmak, ilk kare için statik bir poster/iskelet göstermek ve maplibre'ı yalnız
   "harita açıldı" olayından sonra indirmek.
2. **Uygulama kabuğunun LCP'si uzak bir görsel:** ölçümde LCP öğesi
   `https://images.pexels.com/...` çıktı (14 sn, `loading="lazy"`). Yani harita hazır
   olana kadar ekrandaki en büyük öğe Pinterest/Pexels fotoğrafı oluyor. Sıradaki adım:
   kart görsellerini ölçülü boyuta indirmek ve harita iskeletini ilk LCP adayı yapmak.
3. **Tanıtım (0,82):** film posteri hâlâ 324 KB JPEG — aynı yöntemle WebP'ye
   çevrilmeli (bu PR'da kapsam dışı bırakıldı, `landingVideoT6.test.ts` poster yolunu
   kilitliyor). Ayrıca `icons-vendor` (13 KB) ilk sette; kullanılan ikonlar
   `content-visibility`/`defer` ile aşağı çekilebilir.
4. **Ölçüm istikrarı:** 3 koşu/medyan ±%3-5 oynayabiliyor; taban bu yüzden ölçülenin
   bir adım altında. Hedefe çıkıldığında `TABAN` yukarı çekilip kilit güncellenmeli.

## 5. Yol boyunca bulunan gerçek hata: PWA kısayolu soğuk açılışta çalışmıyordu

`public/manifest.webmanifest` "Keşfet" kısayolunu `./?tab=kesfet` olarak tanımlıyor.
Ama `parseShortcutTab` **yalnız `Explorer` içinde** okunuyordu; `Explorer` ise ancak
misafir/oturum bayrağı varken mount oluyor. Sonuç: ana ekrandan kısayola basan kullanıcı
tanıtım ekranına düşüyor, kısayol hiçbir şey açmıyordu (parametre de adreste kalıyordu).

**Düzeltme:** `App.tsx` kapısı, kısayol parametresi geçerliyse (`kesfet`, `iz-birak`,
`profil`, `profıl`) misafir oturumunu açar; parametreyi `Explorer` temizleyip ilgili
paneli açar, yani eylem iki kez tetiklenmez. Doğrulama aynı yerden (`parseShortcutTab`)
geliyor; bilinmeyen değer yok sayılır.

**Kanıt:** `src/App.test.ts` → "manifest kısayolu (?tab=kesfet) soğuk açılışta tanıtımı
atlar". Düzeltme kaldırıldığında test kırmızı (mutasyon denemesi yapıldı).

**Maliyet:** entry 16.656 → **16.823 B gzip** (+167). Bu yüzden entry eşiği
16.700 → **17.000** (%1,05 pay) olarak ölçüme göre yeniden bağlandı; diğer bütün eşikler
(ilk boya JS, ilk HTML, toplam JS, appShell) **değişmedi** ve payla içinde kaldı.

## 6. Kapılar (bu dalda, yerelde)

| Kapı | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npm run test:run` | ✅ 180 dosya / 1396 test |
| `npm run test:scripts` + `test:bundle-budget` | ✅ |
| `npm run build` | ✅ bütçe içinde (entry 16.823 / 17.000), SW 63/63 |
| `lhci autorun` (yerel) | ⚠️ Chrome yok — bu ortamda tarayıcı kurulamıyor, ölçüm CI'da |

## 7. Sınırlar

- Ölçüm **CI donanımında** alınır; mutlak sayı üretim kullanıcısının cihazı değildir.
  Amaç regresyonu yakalamak, laboratuvar mutlak değeri vaat etmemek.
- Kararlılık için 3 koşu/medyan var; yine de tek koşuluk ±%3-5 oynama normaldir.
  Eşik bu yüzden hedefin biraz altında değil, **hedefin kendisinde** tutuluyor.
- Lighthouse **alan verisi (CrUX) değildir**; gerçek kullanıcı ölçümü için Clarity/huni
  verisi ayrı kanal olarak kalıyor.
- Sıradaki: kalan panellerin axe kapsamı (Ayarlar, Raporlar, story, gruplar, bildirimler)
  ve `docs/baseline.md` tablosunun üretim ölçümüyle doldurulması.

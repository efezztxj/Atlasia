# Teslimat — 28 Ekim 2026 canlı denetim listesi

Durum: **kod ve kapılar tamam · yayına alma YAPILMADI (açık onay bekliyor)**
Kapsam: `docs/denetim/` listesi, 8 bölüm + önerilen sıra
Doğrulama: `typecheck` · `eslint --max-warnings=0` · **1373/1373 test (172 dosya)** · `test:scripts` · `npm run build` (bütçeler içinde, SW 62/62)

---

## Özet tablo

| ID | Konu | Durum | Kanıt |
| --- | --- | --- | --- |
| A1–A7 | Güvenlik/CSP | ✅ (A4 canlı ağ kanıtı bekliyor) | `public/_headers`, `cloudflareHeaders.test.ts` 7/7 |
| B1 | Hero AVIF/srcset/preload | ✅ (2400 px master yok — bkz. not) | `hero-{480,768,1376}.{avif,jpg}`, `imagePipelineT10.test.ts` 7/7 |
| B2 | Google Fonts self-host | ✅ | `public/fonts/` 4 woff2 / 124 KB + `src/styles/fonts.css` (paket içi), `npm run fonts:sync` |
| B3 | Landing prerender (JS'siz metin) | ✅ | `dist/index.html` içinde H1 + 3 adım + SSS (`<noscript>`) |
| B4 | CSS bütçesi | ✅ | 36.090 / 36.600 B gzip |
| B5 | Lighthouse bütçe kapısı CI'da | ✅ | `lighthouse-budgets.json` + `lighthouseConfig.test.ts` 7/7 |
| C1 | Kontrast | ✅ | `config/accessibility.test.ts` 16/16 |
| C2 | 768 px altı nav linkleri | ✅ | `LandingPage` mobil menü; `landingA11y.test.ts` |
| C3 | axe: 3 tema × kritik ekranlar | ✅ **yeni** | `config/a11yThemes.test.ts` 23/23 |
| C4 | (önceki tur) | ✅ | — |
| C5 | Klavye turu + skip-link | ✅ | `#harita` + `skip-link`; `landingA11y.test.ts` |
| D1 | Misafir modu | ✅ | `AuthGate` → `startGuest()`, yazma anında hesap isteği |
| D2 | Kademeli giriş ekranı | ✅ | `AccountAccess` ekranları (credentials → doğrulama → kurtarma) |
| D3 | Landing 3 ekran + 8 sn video | ✅ (T6) | `#film` bölümü, `preload="none"` |
| D4 | Çerez bandı CTA'yı örtmesin | ✅ **yeni** | `--consent-space` + `html[data-consent="open"]` |
| D5 | Ölü Apple vaadi | ✅ **yeni** | `AccountAccess.t9.test.ts` 9/9 |
| D6 | Örnek rota kartları | ✅ **yeni** | `#ornek-rotalar`, `denetimT28.test.ts` |
| D7 | Kayıtta Google önce | ✅ | `AccountAccess` sosyal düğme e-posta formundan önce |
| D8 | Ölçüm olayları | ✅ | `lib/analytics.ts`: `cta_click`, `signup_start/complete`, `first_route_created`, `consent_choice` |
| E1 | Mobil keşif paneli tam ekran | ✅ **yeni** | CSS kuralı: panel alt sekme çubuğunun üstünde biter |
| E2 | Atlas AI referansı bayatlıyor | ✅ **yeni** | `activeReference` + rozet eşitlemesi |
| E3 | Yer detayı başlık/madde yapısı | ✅ (mevcut) | `PlaceDetails` başlık hiyerarşisi + `SettingsPanel.test.ts` |
| E4 | Mobilde kesilen metin | ✅ **yeni** | `line-clamp-2` (md'de tek satır) |
| E5 | Arama listesi ↔ harita rayı çakışması | ✅ **yeni** | `md:right-[64px]` |
| E6 | (önceki tur) | ✅ | — |
| E7 | Pexels hotlink → kendi köprüsü | ✅ **yeni** | `functions/gorsel.js` + `gorsel.node-test.mjs` 5/5 |
| E8 | Sesli rehber izin sırası | ✅ **yeni** | `onstart` ölçümü + görünür hata bildirimi |
| F1 | Meta / 3B harita hizası | ✅ **yeni** | 4 dosyada tek metin |
| F2 | H1 vaat, tek H1 | ✅ | `dist/index.html`: 1 adet H1 |
| F3 | Rota bazlı meta | ✅ **yeni** | `lib/routeMeta.ts` + `appSurfaceMeta.ts`, `routeMeta.test.ts` 8/8 |
| F4 | OG kartı güncel | ✅ | `og:image` 1200×630 `atlasia-share-card.jpg` |
| G1 | #133 birleşti | ✅ | `gh pr view 133` → MERGED |
| G2 | Yerel geliştirme rehberi | ✅ **yeni** | `docs/gelistirme-rehberi.md` |
| G3 | CI'da mobil Lighthouse | ✅ kapı kuruldu · **perf hedefi (90) açık** | `.github/workflows/lighthouse.yml`; ölçüm 81/81/88, a11y-BP-SEO 100 |
| G4 | `npm audit` matrisi | ✅ **yeni** | `docs/dependency-security-matrix.md` (tam ağaç 0 açık) |

---

## Bu turda kapatılan gerçek kusurlar

1. **E2 — asistan yanlış yeri gösteriyordu.** Rozet "Referans: {seçili yer}" yazarken
   asistan mesajdaki yer adını kullanıyordu; sonraki "göster" gibi kısa komutlar
   bağlamı kaybediyordu. Artık çözümlenen referans durumda tutuluyor
   (`activeReference`), haritada yeni yer seçilince tazeleniyor.
2. **C3 — `<aside role="dialog">` geçersizdi.** ARIA in HTML'e göre `aside`
   `dialog` rolü alamaz; ekran okuyucu yer detayı, grup paneli ve gizlilik
   penceresini diyalog olarak duyurmuyordu. Üç dosyada kök öğe `div`'e çevrildi,
   `usePanelAccess` jenerik oldu (`usePanelAccess<HTMLDivElement>`).
3. **E7 — gizlilik ve bağımlılık.** Rehber fotoğrafları doğrudan
   `images.pexels.com`'dan geliyordu (ziyaretçi IP'si üçüncü tarafa gidiyordu).
   Artık `/gorsel?u=…` köprüsü var: sunucu tarafında **allowlist** (yalnız
   `images.pexels.com/photos/<sayı>/…`, yalnız GET/HEAD, `image/*` yanıt şartı),
   kenar önbelleği; CSP `img-src`'den Pexels çıktı. Yerelde aynı kuralı
   `vite.config.ts` eklentisi uygular — önizleme bozulmaz.
4. **E8 — sessiz başarısızlık.** Tarayıcı sesi engellediğinde kullanıcı hiçbir
   şey görmüyordu; ölçüm de istek anında sayılıyordu (gerçekleşmeyen dinlemeler).
   Ölçüm `utterance.onstart`'a taşındı, hata durumunda görünür açıklama var.
5. **E1 — ulaşılamayan gezinme.** Mobil keşif paneli `inset-0` ile alt sekme
   çubuğunu ve başlık şeridini örtüyordu. Panel artık `58 px + güvenli alan`
   üstünde bitiyor.
6. **D4 — çerez bandı birincil eylemi örtüyordu.** Bant gerçek yüksekliğini
   `--consent-space` olarak köke yazıyor; sabit eylem çifti/FAB'lar o kadar
   yukarı kayıyor, bant kapanınca değişken siliniyor. Mobil bant yüksekliği
   `70dvh → 52dvh`.

---

## Bütçe kararı (gerekçeli gevşetme)

| Kategori | Önce | Sonra | Eşik | Not |
| --- | --- | --- | --- | --- |
| entry (ilk boya JS parçası) | 16.574 | **17.321** | 16.700 → **17.400** | B1 `picture`/`srcset`, E7 köprü URL'leri, F3 rota meta, D6 örnek kartlar |
| toplam CSS | 35.913 | **36.090** | 36.600 | E1 + D4 kuralları |
| ilk boya CSS | 25.550 | 25.585 | 26.100 | — |
| ilk boya JS | 99.922 | 99.922 | 102.200 | — |
| tanıtım yolculuğu | 127.482 | 128.285 | 129.400 | — |
| uygulama kabuğu | 579.968 | 580.771 | 603.400 | — |

Entry eşiği **yalnız bu tur** ve yalnız yazılı gerekçeyle yükseltildi
(`scripts/bundle-budget.mjs` başlığı). Küçültme denendi: F3 metinleri ikiye
bölündü (tanıtım açıklaması artık `index.html`'den okunuyor, pakette ikinci
kopya yok), uygulama yüzeyi metinleri tembel `Explorer` chunk'ına taşındı
(ilk deneme 17.299 → 16.983).

---

## G3 — kapı kuruldu, performans hedefi henüz karşılanmadı (açık)

CI'da mobil Lighthouse 3 koşuyla ölçüyor (simüle 4G + 4x CPU):

| Koşu | Perf | A11y | BP | SEO |
| --- | --- | --- | --- | --- |
| 1 | **81** | 100 | 100 | 100 |
| 2 | **81** | 100 | 100 | 100 |
| 3 | **88** | 100 | 100 | 100 |

- Denetim listesinin istediği **perf ≥ 90** bugün karşılanmıyor. Sert kapı
  **perf ≥ 80** (regresyon tabanı); a11y/BP/SEO ≥ 95 hata seviyesinde ve geçiyor.
- 90'ı "hata" yapmak CI'yi sürekli kırmızıda bırakırdı, eşiği sessizce silmek
  denetim maddesini gizlerdi. Bu yüzden hedef açık iş olarak kayıtlı.
- **Darboğaz ve plan:** kritik JS (react-vendor 69,5 KB + entry 17,3 KB gzip) ve
  SPA'nın yapısal render-blocking CSS'i. Sıradaki adımlar (risk/etki sırasıyla):
  1. Tanıtım için ayrı CSS girişi (app-shell stillerini lazy chunk'a almak),
  2. `LandingPage` alt bölümlerini (video, örnek rotalar, footer) `lazy()` ile bölmek,
  3. `icons-vendor` (13,7 KB) ikonlarını yol bazlı import etmek,
  4. Gerekirse hero dışı görselleri `loading="lazy"` + düşük öncelik.
- Bu turda yapılan iki iyileştirme skoru değiştirmedi ama doğru yönde:
  `@font-face` paket içine alındı (kritik yoldan bir istek çıktı) ve service
  worker'ın ilk ziyarette yaptığı gereksiz sayfa yenilemesi kaldırıldı.

## Bilinçli olarak yapılmayanlar (karar gerekiyor)

- **B1 · 2400 px hero master.** Depodaki master `1376×768`. Ondan büyük türev
  üretmek yükseltme (upscale) olur: dosya şişer, keskinlik gelmez.
  **Gerçek 2400 px (veya daha büyük) kaynak görsel gerekli.** Şimdilik en büyük
  aday 1376 px; mobilde 480 px AVIF **9,1 KB**.
- **A4 · canlı ağ kanıtı.** `atlasia.pages.dev` bu sandbox'tan erişilemedi
  (`SSL_ERROR_SYSCALL`). Ağ kanıtı (CSP raporu/HSTS başlıkları) açık onaydan
  sonraki yayın turunda alınmalı.
- **Bölüm 8 (henüz denetlenmeyen alanlar).** Atlas AI yanıt kalitesi, sesli
  rehber uçtan uca, iz kaydı + çevrimdışı paket, gruplar/bildirimler, Firestore
  kural seti, Cloudflare WAF/cache/log, maliyet-kota, gerçek cihaz matrisi ve
  i18n **ölçülmedi**. Kural: önce ölçüm, sonra iş açma — bu turda yalnız
  erişilebilirlik/performans/güvenlik kapıları ele alındı.

## Notlar

- **Service worker düzeltmesi.** Lighthouse'u ilk kurcalarken çıkan
  "Execution context was destroyed" hatasının kökü ürün kodundaydı: `sw.js`
  `clients.claim()` çağırdığı için ilk ziyarette de `controllerchange` oluyor,
  kanca da koşulsuz `location.reload()` yapıyordu — yani **her yeni ziyaretçi
  sayfayı iki kez yüklüyordu** (LCP'yi boşa harcayan gerçek kusur). Artık
  yalnız denetleyici zaten varken (gerçek güncelleme) yenileniyor; test eklendi.
- **Lighthouse sandbox'ta koşmaz** (Chrome/libnss yok). Kapı CI'da:
  `.github/workflows/lighthouse.yml`, mobil profil, perf ≥90 · a11y ≥95 · BP ≥95
  · SEO ≥95 + `lighthouse-budgets.json` (420 KB / 14 istek / 0 üçüncü taraf).
- **`@lhci/cli` bilinçli olarak dependency değil**: devDependency olarak
  eklenince `chromium-bidi → zod` zincirinden 13 yüksek açık geliyordu. CI'da
  sürüm sabit `npx` ile çalışır; `npm audit` tam ağaç **0**.
- Yeni test dosyaları: `config/a11yThemes.test.ts` (23),
  `config/lighthouseConfig.test.ts` (7), `lib/routeMeta.test.ts` (8),
  `config/denetimT28.test.ts` (12), `functions/gorsel.node-test.mjs` (5,
  `npm run test:image-bridge`).

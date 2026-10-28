# Teslimat — T17: JavaScript'siz içerik (prerender yerine dürüst `<noscript>`)

**Tarih:** 2026-10-28 · **Dal:** `arena/c0403c7e-atlasia` · **Sıra:** T18 → T19 → **T17**

## 1. Sorun

`index.html` gövdesi tek satırdı: `<div id="root"></div>`. JS engelli bir
tarayıcıda (ve JS render etmeyen bazı botlarda) sayfa **tamamen boş**
görünüyordu; arama motoruna "içeriksiz sayfa" sinyali gidiyordu.

## 2. Seçilen çözüm ve neden diğerleri değil

| Seçenek | Değerlendirme |
|---|---|
| **Tam prerender + hidrasyon** (react-dom/server + `hydrateRoot`) | En güçlü SEO sinyali ama bu ortamda **doğrulanamaz**: tarayıcı yok, `useId`/rastgele değer uyuşmazlığı riski var, hidrasyon hatası tüm sayfayı yeniden render eder. Ayrıca `entry` marjı 12 B. Ölçülemez bir CLS/LCP riski almak, ölçülebilir bir kazançtan daha pahalı. |
| **Statik HTML'i `#root` içine gömmek** | JS açık kullanıcıda React kökü temizleyene kadar gerçek metin görünür → düzen sıçraması (CLS) ve tipografi flaşı. Riskli. |
| **`<noscript>` bloğu** ✅ | JS açıkken **hiç render edilmez** (CLS/LCP etkisi sıfır, hidrasyon yok); JS kapalıyken ve metin çıkaran botlarda sayfa okunur. Metin tek kaynaktan derlemede gömülür. |

## 3. Uygulama

| Dosya | İş |
|---|---|
| `src/content/landingStatic.ts` | Metnin **tek kaynağı**: başlık, giriş, üç adım, iki SSS, dürüst "JavaScript gerekir" notu + `escapeHtml` + `renderLandingStaticHtml()`. |
| `vite.config.ts` | `atlasia-noscript-landing` eklentisi `transformIndexHtml` ile bloğu `<div id="root"></div>` hemen ardına gömer. Uygulama paketine **girmez** (`entry` değişmedi). |
| `src/config/prerenderT17.test.ts` | 6 test: metin gömülü mü, güvenli mi (script/`on*`/`style`/`javascript:` yok), kaçırma doğru mu, metin uydurma mı (her dize `LandingPage.tsx`'te de var mı), enjeksiyon bağlı mı, `index.html`'de kopya metin yok mu. |

**Sürüklenme koruması:** tanıtım metni değişip `landingStatic.ts`
güncellenmezse test kırılır — iki yerde farklı metin yayınlanamaz.

## 4. Doğrulama (bu ortamda yapılabilen)

```text
$ npm run build
İlk HTML seti: 466.331 B ham / 127.763 B gzip (bütçe 129.400 B)
Toplam JS: 3.302.659 B ham / 998.004 B gzip (bütçe 998.500 B)
assets/index-CCl2T_ba.js | entry | 62.665 B | 20.889 B | evet
Bundle bütçesi içinde.
SW üretim kabuğu doğrulandı: 44/44 varlık kapsanıyor.
```

`dist/index.html` içinde blok doğrulandı (`<body>` → `<div id="root"></div>` →
`<noscript><section aria-labelledby="static-heading" lang="tr"> …`).

| Kapı | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npx vitest run` | ✅ **1271/1271** (157 dosya; +9) |
| `npm run test:scripts` | ✅ 8 paket, `# fail 0` |
| `npm run build` | ✅ bütçe içinde, SW 44/44 |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⚠️ bu ortamda çalışmıyor (Java/emülatör yok); CI'da yeşil, `firestore.rules` değişmedi |

## 5. Bütçe — eşik yükseltilmedi

| Ölçüm | Değer | Eşik | Marj |
|---|---|---|---|
| İlk HTML seti | **127.763** B gzip | 129.400 | 1.637 B |
| `entry` (bizim kod) | 20.889 B gzip | 20.900 | **12 B** |
| Toplam JS | 998.004 B gzip | 998.500 | 519 B |
| İlk boya JS | 100.287 B gzip | 102.200 | 1.913 B |
| Uygulama kabuğu | 587.262 B gzip | 603.400 | 16.138 B |

`<noscript>` bloğu yalnız HTML'i büyüttü (+694 B gzip); JS paketlerine ve
`entry`'ye dokunmadı.

## 6. Bilinçli sınırlar / riskler

1. **Bu tam SSG değil.** Amaç "JS'siz HTML'de metin olsun" kriteriydi; o
   karşılandı. React'in render ettiği DOM ile birebir aynı belge gerekmiyor,
   çünkü hidrasyon yok.
2. **`<noscript>` içindeki metin tarayıcı varsayılan tipografisiyle görünür**
   (stil, CSP nedeniyle bilinçli olarak eklenmedi). Çirkin ama okunur; JS'li
   kullanıcı bunu hiç görmez.
3. **`entry` marjı 12 B.** Landing'e dokunan sıradaki iş önce ölçüm almalı;
   sığmıyorsa doğru çözüm eşiği yükseltmek değil, footer/SSS'yi tembel parçaya
   taşımak (ayrı iş, plan defteri §3.4).
4. Gerçek bir tarayıcıda "JS kapalı" görünümü ve Lighthouse SEO skoru bu
   ortamda ölçülemedi (tarayıcı yok) — CI/lokal tarayıcı doğrulaması bekliyor.

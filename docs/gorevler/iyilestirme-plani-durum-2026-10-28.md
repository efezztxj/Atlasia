# İyileştirme planı — durum defteri (T1–T21)

Bu defter, "Atlasia — İyileştirme Planı" maddelerinin **sırasını ve durumunu**
tutar. Sıra bağımlılığa göredir: Faz 1 (dönüşüm) ölçüm olmadan başlamaz —
"iyileşti mi?" sorusu hisle değil sayıyla yanıtlanır.

**Son güncelleme:** 2026-10-28 · **Referans sürüm:** bu dal (T1–T3, T9, T13–T19, T10 kod tarafı + **T4/T5/T6/T7/T8** teslimatı)
**Ölçüm tablosu:** `docs/baseline.md` · **Olay sözleşmesi:** `docs/olcum-ve-hata-izleme.md` §2b/§4b

Plan sırası: `T1 → T2 → T3 → T12 → T11 → T7 → T4 → T5 → T8 → T9 → T6 → T10 → T13 → T14 → T15 → T16 → T18 → T19 → T20 → T21 → T17`

## 1. Durum

| # | Madde | Durum | Kanıt |
|---|---|---|---|
| T1 | Ölçüm altyapısı (toplayıcı + panel) | 🟡 **kısmi — kod + kurulum rehberi hazır** | `src/lib/telemetry.ts`, `telemetryBootstrap.ts`; Worker kodu + Pages env adımları `docs/gorevler/t1-toplayici-kurulum.md`. Kalan: operatör deploy + `VITE_TELEMETRY_ENDPOINT` |
| T2 | Huni olayları (landing→harita→kayıt) | ✅ | 16 olay: `analytics.ts`; katalog testi `src/config/telemetryCatalog.test.ts`; bağlama testi `src/config/siteSurface.test.ts` |
| T3 | Baseline tablosu + cihaz ölçümü | 🟡 **kısmi** — paket ölçüldü, CWV/Search Console ölçülmedi | `docs/baseline.md`; ölçüm protokolü `docs/gorevler/t3-olcum-protokolu.md` (komutlar, tuzaklar, sonuç tablosu) |
| T4 | Misafir modu (kayıt duvarını kaldırma) | ✅ | CTA → misafir haritası; **kural değişmedi** (`request.auth` boş → yazma sunucuda reddedilir); `src/config/guestMode.test.ts` (10 test) |
| T5 | Kayıt duvarı sonrası ilk değer | 🟡 **kısmi** | Engellenen eylem hatırlanır (`atlasia.pendingIntent.v1`, 30 dk) ve hesap açılınca aynı yüzey açılır; misafir cihaz kayıtlarının hesaba taşınması ayrı iş (T5b) |
| T6 | Tanıtım videosu | ✅ | `#film` bölümü: repodaki Göreme klibi, `preload="none"` + poster, otomatik oynatma yok, `width`/`height` ile CLS yok — `landingVideoT6.test.ts` (7) |
| T7 | Landing CTA/çerez yerleşimi (1440×900 tıklanabilirlik, mobil sheet) | ✅ | `LandingPage.tsx`, `CookieConsent.tsx` (`bottom-[calc(66px+safe-area)]`, `md:right-6 md:bottom-6`), z-index: menü 95 > çerez 90 |
| T8 | Onboarding / ilk rota akışı | ✅ | `Onboarding.tsx` misafir notu + `askAccount(..., "route")`; panel `FIRST_ROUTE_KEY`'e bağlı; `onboarding_choice` olayı — `onboardingT8.test.ts` (8) |
| T9 | Giriş ekranı sürtünmesi (önce Google) | ✅ | `AccountAccess.tsx` + `AccountAccess.t9.test.ts` (7 test) |
| T10 | Görsel boru hattı (foto optimize) | 🟡 **kısmi — kod tarafı bitti** | 25 MB decode öncesi kapı, HEIC yönlendirmesi, `imageOrientation: "from-image"`, `decoding="async"`/`loading="lazy"` — `imagePipelineT10.test.ts` (7). Kalan: WebP/AVIF + sunucu tarvleri + gerçek cihaz süre ölçümü (onay/ölçüm ister) |
| T11 | Firebase'i ilk setten çıkarma | ✅ | İlk boya JS **100.288 B** gzip; `firebase-vendor` ilk sette değil (`npm run build` tablosu) |
| T12 | Kontrast düzeltmeleri (eyebrow/başlık) | ✅ | `#a37c35 → #8f6224` (4,66:1), `#ba8f45 → #9c7029` (3,86:1); `src/config/landingContrast.test.ts` |
| T13 | Mobil menü (768 px altı) | ✅ | Hamburger + `role="dialog"` panel, Escape/Tab tuzağı/odak iadesi — `src/config/landingA11y.test.ts` |
| T14 | Klavye: skip-link + `:focus-visible` | ✅ | "İçeriğe geç" → `#kesfet` (`tabIndex={-1}`); tek `:focus-visible` bloğu |
| T15 | Hareket azaltma | ✅ | `prefers-reduced-motion` bloğunda `scroll-behavior: auto !important` |
| T16 | Semantik (tek H1) | ✅ | Tek `h1` = "Dünyayı merakınla keşfet."; marka yazısı `aria-hidden` |
| T17 | Prerender/SSG (SEO) | 🟡 **kısmi — bilinçli** | JS'siz HTML'de gerçek metin var (`<noscript>`, `landingStatic.ts` + vite `transformIndexHtml`); tam SSG/hidrasyon yapılmadı (tarayıcısız ortamda doğrulanamaz). `prerenderT17.test.ts` (6) |
| T18 | Footer'da dil + yasal bağlantılar | ✅ | 3 yasal metin + "Çerez tercihleri" (rıza geri alma) + "Site dili: Türkçe (tr)" — `footerT18.test.ts` (3) |
| T19 | İçerik/SEO meta seti | ✅ | `canonical`, `robots`, `hreflang` + `x-default`, taze `lastmod` — `seoMetaT19.test.ts` (6) |
| T20 | Güven sinyalleri (sosyal kanıt) | ⛔ **insan girdisi gerekli** | Sahte sayaç yazılmaz. Bugünkü dürüst güven sinyalleri zaten var ("reklam ve takip pikseli yok", "konum onayla") ve `footerT18`/`siteSurface` ile kilitli. Gerçek kullanıcı/rota sayısı için toplayıcı (T1) gerekli |
| T21 | Basın/iletişim yüzeyi | ⛔ **hukuk onayı bekliyor** | Gerçek e-posta/künye olmadan yayınlanmaz (`docs/mvp-cikis-plani-2026-10-27.md` P0-1). Footer yüzeyi T18'de hazır |

## 2. Bütçe ve eşikler (bugünkü ölçüm)

| Ölçüm | Değer | Eşik | Marj |
|---|---|---|---|
| İlk HTML seti (gzip) | 126.334 B | 129.400 B | 3.066 B |
| Toplam JS (gzip) | 1.002.430 B | 1.003.000 B | **570 B** |
| Toplam CSS (gzip) | 35.247 B | 35.700 B | 453 B |
| Tanıtım yolculuğu (gzip) | 126.334 B | 129.400 B | 3.066 B |
| Uygulama kabuğu (gzip) | 586.528 B | 603.400 B | 16.872 B |
| `entry` (bizim kod) | 19.251 B | 20.900 B | **1.649 B** |

Eşik kuralı: `scripts/bundle-budget.mjs` içindeki sayı **yalnız** yeni bir ölçüm
ve yazılı gerekçeyle değişir; testi yeşile çevirmek için asla değişmez. #127'den
beri **bayatlama kapısı** var: sahibi olduğumuz eşikler ölçümün %20'sinden fazla
üstünde olamaz. `entry` payı **2.012 B** — 2026-10-28'de SSS/footer ve rıza paneli tembel
parçaya taşındı (`teslimat-t7-kritik-yol-2026-10-28.md`); pay 12 B'den 2,5 KB'ye
çıktı ve toplam JS eşiği ölçüme bağlı olarak 1.001.000'e çekildi. Girişe yeni
kod eklemeden önce yine `npm run build` ile ölçüm alın.


## 3. Dış kontrol durumu (2026-10-28, son tur)

| Kontrol | Durum | Not |
|---|---|---|
| GitHub Actions CI | ✅ yeşil | Son commit `67475d7`: rules testleri, typecheck, lint, `npm test`, script testleri, build + bütçe |
| Cloudflare Pages | ⚠️ aralıklı kırmızı | "Build failed", loglar yalnız dashboard oturumunda. Aynı içerikle `33f07cd` ve `a0346e8` geçti; `dcd7a7c` (T8/T18/T19'dan **önce**) de kırmızıydı → kod değişikliğinden bağımsız görünüyor. Yerel `npm run build` ve CI build adımı yeşil |
| Firestore emülatör testleri | ✅ CI'da | Bu ortamda Java/emülatör yok; `firestore.rules` değişmedi |

## 4. Açık kararlar (insan onayı ister)

1. **Misafir cihaz kayıtları:** misafirken cihazda kaydedilen iz/rotalar hesap
   açılınca **taşınmıyor** (bilinçli). Taşıma istenirse T5b olarak ayrı iş.
2. **T1 paneli:** kurulum artık yazılı — `docs/gorevler/t1-toplayici-kurulum.md`
   (40 satırlık Worker + Pages env + doğrulama + huni SQL'i). Kalan tek şey
   operatörün `wrangler deploy` çalıştırıp `VITE_TELEMETRY_ENDPOINT` yazması.
3. ~~T6 video barındırma~~ **kapandı:** repodaki klip kullanıldı (`#film`), harici servis yok. Açık kalan: poster gerçek video karesi değil (ffmpeg tek komut) ve 720p türevi isteğe bağlı.
4. ~~`entry` payı~~ **kapandı (2026-10-28):** iki yol da uygulandı — SSS/footer
   ve `CookieConsent` tembel parçada; `CookieConsentBoundary` ile tembel rıza
   parçası indirilemezse uygulama düşmez ve "Tekrar dene" / footer "Çerez
   tercihleri" tetiklemesi taze `lazy()` fabrikasıyla parçayı yeniden yükler.
5. **T20 güven sinyalleri:** gerçek kullanıcı/rota sayısı olmadan sosyal kanıt
   yazılmayacak; sayı üretilmesi gerekiyorsa kaynağı da yazılmalı.
6. **T21 basın/iletişim:** gerçek e-posta ve künye hukuk onayı bekliyor
   (`docs/mvp-cikis-plani-2026-10-27.md` P0-1).

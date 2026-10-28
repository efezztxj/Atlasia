# Teslimat — T18: Footer yüzeyi · T19: SEO meta seti

**Tarih:** 2026-10-28 · **Dal:** `arena/c0403c7e-atlasia` · **Sıra:** T8 → **T18 → T19** → T6/T10

## 1. T18 — footer: dil, yasal erişim, çerez tercihini geri alma

| Ne | Neden | Dosya |
|---|---|---|
| **"Çerez tercihleri" düğmesi** footer'ın "Yasal" nav'ına eklendi; `openCookiePreferences()` olayı yayar ve mevcut rıza panelini açar. | Rıza **geri alma** yolu yalnız uygulama içi ayarlarda kalıyordu. KVKK'da geri alma, verme kadar erişilebilir olmalı; landing'de bu yol yoktu. Yeni panel yazılmadı — var olan `CookieConsent` yeniden kullanıldı (0 yeni bağımlılık). | `src/components/LandingPage.tsx` |
| **"Site dili: Türkçe (tr)"** satırı marka kolonunda, `lang="tr"` ile. | Plan "footer'da dil" istiyor; ikinci bir yerel ayar (locale) yok. **Sahte dil seçici yazılmadı** — çalışmayan bir düğme güven kaybıdır. Bugün doğru olan: tek dil, açıkça yazılı, `<html lang>` ile tutarlı. İkinci dil geldiğinde hreflang + seçici birlikte eklenir (`index.html` yorumu). | `src/components/LandingPage.tsx`, `index.html` |
| Yasal metinler (Gizlilik, KVKK aydınlatma, Kullanım koşulları) değişmedi. | Metinler hukuk onayı bekliyor (mvp-çıkış planı P0-1); bu teslimat yüzeyi düzeltir, metni değiştirmez. | — |

## 2. T19 — içerik/SEO meta seti

`index.html` head'ine eklenenler (yapısal veri `Organization/WebSite/WebApplication` zaten vardı ve korunuyor):

| Etiket | Değer | Neden |
|---|---|---|
| `<link rel="canonical">` | `https://atlasia.pages.dev/` | Sayfa `?utm=…` gibi parametrelerle paylaşıldığında arama motoruna iki ayrı adres gibi görünüyordu. |
| `<meta name="robots">` | `index, follow, max-image-preview:large` | Varsayılan davranışı açıkça yazmak + büyük görsel önizlemesi (keşif ürünü için önemli). |
| `hreflang="tr"` + `hreflang="x-default"` | `https://atlasia.pages.dev/` | Tek dil gerçeğini makineye söyler; `x-default` yanlış dilde sonuç göstermeyi engeller. |
| `sitemap.xml` `lastmod` | `2026-10-27 → 2026-10-28` | Bayat `lastmod` arama motoruna "değişmedi" der; test 90 günden eskisini kırar. |
| `robots.txt` | değişmedi (sitemap + profil ekranı istisnası doğru) | — |

**Yapılmayan:** sahte `aggregateRating`/puan, uydurma `FAQPage` soruları, ikinci dil için boş `alternate`. Yapısal veriye yalnız doğrulanabilir alan girer.

## 3. Kabul kriterleri

| Kriter | Durum | Kanıt |
|---|---|---|
| Çerez rızası landing'den geri alınabiliyor | ✅ | `footerT18.test.ts` — düğme `atlasia:cookie-preferences` olayını **bir kez** yayar |
| Yasal bağlantıların tamamı tek nav'da, klavye ile erişilebilir | ✅ | aynı dosya, `getByRole("navigation", { name: "Yasal" })` + `min-h-8` |
| Dil iddiası `<html lang>` ile çelişmiyor | ✅ | `footerT18` (`lang="tr"`), `seoMetaT19` (`<html lang="tr">` + `hreflang`) |
| Tek kanonik adres, robots ve sitemap tutarlı | ✅ | `seoMetaT19.test.ts` (6 test) |
| Yapısal veri ayrıştırılabilir, adresler kanonikle aynı | ✅ | `seoMetaT19` — `JSON.parse` + `url.startsWith(ORIGIN)` |
| Doğrulanamayan sosyal kanıt yok | ✅ | `seoMetaT19` — `aggregateRating`/`ratingValue` yasak |

## 4. Kapılar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npx vitest run` | ✅ **1262/1262** (155 dosya; +9 test: T8 8'i önceki commit'te, T18 3 + T19 6 bu commit'te) |
| `npm run test:scripts` | ✅ 8 paket, `# fail 0` |
| `npm run build` | ✅ bütçe içinde, SW 44/44 |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⚠️ bu ortamda çalışmıyor (Java/emülatör yok); CI'da yeşil, `firestore.rules` değişmedi |

## 5. Bütçe (ölçüm) — eşik yükseltilmedi

| Ölçüm | Değer | Eşik | Marj |
|---|---|---|---|
| Toplam JS | 998.004 B gzip | 998.500 | **519 B** |
| `entry` (bizim kod) | 20.889 B gzip | 20.900 | **12 B** |
| İlk boya JS | 100.287 B gzip | 102.200 | 1.913 B |
| İlk HTML seti | 127.069 B gzip | 129.400 | 2.331 B |
| Uygulama kabuğu | 587.262 B gzip | 603.400 | 16.138 B |

**Uyarı (bilinçli kayıt):** `entry` marjı 12 B'ye indi. Landing'e dokunan bir
sonraki değişiklik bütçeyi büyük olasılıkla aşacak. Doğru çözüm eşiği
yükseltmek değil, **footer'ı (veya SSS bloğunu) tembel parçaya taşımak**;
bu, T11'in ("ilk sette yalnız gerekli olan") devamıdır ve ayrı bir iş olarak
açık bırakıldı (plan defteri §3.4).

## 6. Sıradaki iş

- **T6 (video):** `public/social/*.mp4` (3,4–5,1 MB) hazır ama landing'de
  kullanılacak klip + poster seçimi ürün kararı; barındırma ve poster üretimi
  insan onayı istiyor (plan defteri §3.3).
- **T10 (görsel boru hattı):** gerçek tarayıcı/cihaz ölçümü gerektiriyor.
- **T20 (güven sinyalleri):** gerçek veri yok; sahte sayaç yazılmayacak.
- **T21 (basın/iletişim):** gerçek e-posta adresi ve künye hukuk onayı bekliyor.
- **T17 (prerender/SSG):** JS'siz HTML'de metin yok; build hattına prerender
  adımı eklemek bu ortamda doğrulanabilir (tarayıcı gerektirmez) — bu yüzden
  sıradaki uygulanabilir madde **T17**.

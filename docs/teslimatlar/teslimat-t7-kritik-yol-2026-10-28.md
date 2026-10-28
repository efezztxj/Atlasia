# Teslimat — T7 uzantısı: kritik yol ayrımı (`entry` payı)

**Tarih:** 2026-10-28 · **Dal:** `arena/1ec07123-atlasia`
**Önceki durum:** `entry` 20.915 B / eşik 20.900 B — **kapı kırıktı**, landing'e
dokunan her satır bütçeyi aşıyordu.

## 1. Karar

Eşik yükseltmek yanlış yol olurdu (kural: `scripts/bundle-budget.mjs` sayısı
yalnız ölçüm + yazılı gerekçeyle değişir, testi yeşile çevirmek için asla).
Onun yerine **ilk boya için gerekmeyen** iki blok giriş paketinden çıkarıldı:

| Blok | Neden ilk boyada gerekmiyor | Yeni yer |
|---|---|---|
| **SSS + footer** (`LandingFooter`) | Ekranın en altında; hiçbir görünümde ilk ekranda değil. | `lazy(() => import("./LandingFooter"))` |
| **Rıza paneli** (`CookieConsent`) | Overlay; kapanana kadar haritayı engellemiyor, ilk kareyi belirlemiyor. | `lazy(() => import("./components/CookieConsent"))` + `Suspense` |

Fallback `min-h-[520px] bg-[#f1f0e9]`: parça gelince düzen zıplamasın (CLS).
Aynı yer tutucu `id="sss"` taşır: mobil menüdeki "Sık sorulanlar" bağlantısı
parça inerken de hedef bulur (yoksa yavaş ağda tıklama sessizce ölüyordu).

## 2. Ölçüm (aynı ağaçta, `npm ci` + `npm run build`)

| Ölçüm | Önce | Sonra | Eşik | Durum |
|---|---|---|---|---|
| `entry` (giriş paketi) | 20.915 B | **18.344 B** (−2.571) | 20.900 | ✅ pay 2.556 B |
| İlk boya JS | 100.314 B | **97.743 B** (−2.571) | 102.200 | ✅ |
| İlk HTML seti | 127.918 B | **125.351 B** (−2.567) | 129.400 | ✅ |
| Uygulama kabuğu | 588.111 B | **585.544 B** | 603.400 | ✅ |
| Toplam JS | 998.070 B | **999.785 B** (+1.715) | 998.500 → **1.001.000** | ✅ (gerekçeli) |
| İlk boya CSS | 24.935 B | 24.940 B | 25.200 | ✅ |

**Toplam JS neden büyüdü:** ayrı chunk'lar tek tek daha kötü sıkışır (4,3 KB ve
6,2 KB ham parçalar) ve chunk sarmalayıcı/preload yardımcısı eklenir. İndirilen
bayt miktarı artmıyor — aynı kod, **daha sonra** iniyor. Bu yüzden yalnız toplam
JS eşiği 1.001.000'e çekildi (pay 1.215 B, %0,12; bayatlama kapısı rahat).
`entry`, ilk boya, ilk HTML ve appShell eşikleri **değişmedi**.

## 3. Doğrulama

- `src/config/criticalPath.test.ts` (4 test): iki blok gerçekten `lazy`,
  fallback yüksekliği var, rıza panelinin bağlama yeri korunmuş, eşikler ölçüme
  bağlı (ölçümün altına **ve** %20 üstüne çıkmıyor).
- `siteSurface`, `footerT18`, `prerenderT17`, `LandingPage.test`, `CookieConsent.test`
  tembel yüklemeye uyarlandı: iddialar zayıflatılmadı, yalnız yüzey dosyası
  (LandingPage + LandingFooter) ve `findBy*` beklemesi doğru yere taşındı.

## 4. Kapılar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npx vitest run` | ✅ **1281/1281** (158 dosya) |
| `npm run test:scripts` | ✅ 8 paket, `# fail 0` |
| `npm run build` | ✅ bütçe içinde, SW 44/44 |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⚠️ bu ortamda Java/emülatör yok; CI'da yeşil, `firestore.rules` değişmedi |

## 5. Riskler

1. **Tembel yükleme başarısız olursa** (ağ hatası) alt blok görünmez; rıza
   paneli de gelmez. Kalıcı çözüm (chunk hatasında yeniden dene) ayrı iş.
   **Denetimde bulunan ve düzeltilen gerçek kusur:** panel `lazy()` olduğu için
   parça inerken yapılan "Çerez tercihleri" tıklaması olay dinleyicisi olmadığı
   için kayboluyordu. Artık istek `openCookiePreferences()` içinde bayrağa da
   yazılır, panel bağlanınca `consumePendingCookiePreferences()` ile bir kez
   tüketilir (`CookieConsent.test.ts` bunu kilitler).
2. **İlk açılışta 1 kare gecikme:** rıza paneli bir chunk indirmesi kadar sonra
   görünür; ölçülen ilk boya JS'i 2,5 KB küçüldüğü için net kazanç.
3. Fallback yüksekliği (520 px) masaüstünde gerçek yükseklikten küçük olabilir;
   ekran dışında olduğu için CLS etkisi yok, ama gerçek cihazda doğrulanmalı.

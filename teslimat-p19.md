# Teslimat P19 — Bundle bütçesi + lazy-loading derin taraması

**Tarih:** 2026-10-21 (Europe/Istanbul)
**Branch:** `arena/29ca9ab0-atlasia`
**Taban commit:** `7074315` (PR #28 merge)
**Kod commit'leri:** `a8f8a45`, `e928eaa` (bu teslimatın doküman commit'i hariç)
**Durum:** Tamamlandı. Ölçüm yalnız üretim dosyalarının ham/gzip baytlarına dayanır; tarayıcı zamanlaması veya milisaniye iyileşmesi iddia edilmez.

---

## 1. Sonuç özeti

- Başlangıç grafiğinde somut bir lazy sınırı ihlali bulundu: `src/lib/moderation.ts`, `firebase/auth` içindeki `deleteUser` fonksiyonunu statik import ediyordu. Moderasyon modülü uygulama grafiğinde kullanıldığı için Vite, ayrıca bölünmüş `firebase-auth` chunk'ını `dist/index.html` içine `modulepreload` olarak koyuyordu.
- `deleteUser`, yalnız seyrek hesap silme akışındaki `deleteAccount` fonksiyonu içinde dinamik import edilecek şekilde taşındı. `src/config/lazyLoading.test.ts`, `moderation.ts` için de statik Auth import yasağını kilitliyor.
- HTML'in referans verdiği ilk JS/CSS seti + HTML'in gzip toplamı:
  - **Önce:** 435.160 B
  - **Sonra:** 398.556 B
  - **Fark:** −36.604 B (**−%8,4**)
- **Toplam JS gzip boyutu değişmedi:** 804.652 B → 804.652 B. Bu iş toplam bundle'ı küçültmedi; Firebase Auth'un ilk HTML ile zorla preload edilmesini kaldırdı. Auth gereken akışta chunk yine yüklenecektir.
- `scripts/bundle-budget.mjs` ile toplamlar, kritik chunk kategorileri ve ertelenmesi gereken chunk'ların ilk HTML setine geri dönmesi kilitlendi. `npm run build`, `postbuild` üzerinden bütçeyi otomatik çalıştırır.

## 2. Ölçüm yöntemi ve öncesi/sonrası tablo

Ölçüm aynı çalışma ağacında `npm ci` sonrası production build ile alındı. “İlk HTML seti”, `dist/index.html` + HTML'deki yerel `<script>`/`<link>` JS-CSS referanslarıdır. Bu tanım gerçek ağ zaman çizelgesinin tamamı değildir: `MapView` ve Firebase Auth gibi dinamik import'lar, kod çalışmaya başladıktan hemen sonra da istenebilir. Dolayısıyla aşağıdaki sonuç bir **preload/başlangıç grafiği ölçümüdür**, LCP/INP veya milisaniye iddiası değildir.

| Asset / kategori | Önce ham | Önce gzip | Sonra ham | Sonra gzip | Sonra ilk HTML seti |
|---|---:|---:|---:|---:|---|
| `map-vendor-*.js` | 946.562 | 248.691 | 946.562 | 248.691 | Hayır |
| `maplibre-gl-worker-*.js` | 468.843 | 131.810 | 468.843 | 131.810 | Hayır |
| `index-*.js` (entry) | 477.659 | 158.264 | 477.747 | 158.270 | Evet |
| `firebase-vendor-*.js` | 497.505 | 149.179 | 497.505 | 149.180 | Evet |
| `react-vendor-*.js` | 192.456 | 60.325 | 192.456 | 60.325 | Evet |
| `firebase-auth-*.js` | 128.943 | 36.599 | 128.943 | 36.602 | **Hayır** |
| `icons-vendor-*.js` | 27.148 | 9.322 | 27.148 | 9.322 | Evet |
| `MapView-*.js` | 36.321 | 8.159 | 36.285 | 8.149 | Hayır |
| `index-*.css` | 116.882 | 20.443 | 116.882 | 20.443 | Evet |
| `map-vendor-*.css` | 83.017 | 10.517 | 83.017 | 10.517 | Hayır |
| `sw.js` | 6.252 | 2.303 | 6.252 | 2.303 | Hayır |
| **Toplam JS** | **2.781.689** | **804.652** | **2.781.741** | **804.652** | — |
| **Toplam CSS** | **199.899** | **30.960** | **199.899** | **30.960** | — |
| **İlk HTML seti (HTML dahil)** | — | **435.160** | **1.315.233** | **398.556** | — |

İlk set farkı:

- Önce: `index` + `react-vendor` + `icons-vendor` + `firebase-vendor` + `firebase-auth` + `index.css`
- Sonra: `index` + `react-vendor` + `icons-vendor` + `firebase-vendor` + `index.css`

Entry/MapView/Auth dosyalarındaki birkaç baytlık fark, dynamic import sınırının taşınmasıyla oluşan chunk grafiği dalgalanmasıdır; toplam gzip etkisi sıfırdır.

## 3. Giriş grafiği gerekçesi

`src/main.tsx`, uygulama CSS'i, `App`, hata sınırı ve ağ durumu bileşenini statik yükler. Bunlar kabuk ve ilk boyama için gereklidir.

- **İlk sette kalanlar**
  - `index`: karşılama/auth kapısı, uygulama kabuğu, veri hook'ları ve ilk ekran bileşenleri.
  - `react-vendor`, `icons-vendor`, `index.css`: tüm kabuğun çalışması için gerekli.
  - `firebase-vendor`: `firebase.ts` ve Firestore veri katmanı senkron `db` sözleşmesine dayanır; App'in bulut veri yolu bu modülü başlangıç grafiğinde kullanır. Firestore'u geciktirmek küçük bir import değişikliği değil, veri katmanı mimarisi değişikliğidir; P19'da güvenli ve ölçülü bir küçük adım olarak yapılmadı.
- **HTML ile preload edilmeyenler**
  - `firebase-auth`: `auth.ts`, `AuthContext`, `AccountAccess` ve artık `moderation.ts` tarafından ihtiyaç anında dinamik yüklenir.
  - `MapView`, `map-vendor` JS/CSS ve MapLibre worker: `React.lazy` sınırı korunur; Explorer açıldığında hemen istenebilir ve mevcut iskelet gösterilir. Bu, haritanın hiç indirilmediği anlamına gelmez; yalnız HTML preload zincirinin dışındadır.
- `vite.config.ts` içindeki elle ayrılmış `map-vendor`, `firebase-auth`, `firebase-vendor`, `react-vendor`, `icons-vendor` düzeni değiştirilmedi.

## 4. Bundle bütçe kilidi

Yeni dosyalar:

- `scripts/bundle-budget.mjs`
  - `dist` içindeki JS/CSS dosyalarını ham + gzip ölçer.
  - HTML'deki yerel ilk asset referanslarını ayrıştırır.
  - Vite hash'lerinden bağımsız kategori eşlemesi yapar.
  - Toplam JS/CSS, ilk HTML seti ve kategori eşikleri aşılırsa `exit 1` verir.
  - `firebase-auth`, `map-vendor`, `MapView` veya MapLibre worker ilk HTML setine girerse lazy sınırı ihlali sayar.
  - Zorunlu entry/React/Firebase/map kategorileri yoksa da kırılır.
- `scripts/bundle-budget.node-test.mjs`
  - Kategori sınıflandırması, HTML ayrıştırma, geçerli fixture, Auth preload regresyonu, kasıtlı şişirme ve eksik `dist` durumlarını test eder.

Komutlar:

- `npm run bundle:budget`
- `npm run test:bundle-budget`
- `npm run test:scripts` (owner-index + bundle budget testleri)
- `npm run build` ayrıca `postbuild` ile bütçeyi çalıştırır.

### Eşikler

Eşikler, Auth düzeltmesi sonrası ölçülen bazın yaklaşık %10 toleransla yuvarlanmış hâlidir. Küçük chunk'larda yuvarlama payı oransal olarak daha yüksektir. Bilinçli büyümede eşik, yeni ölçüm ve gerekçe yazılmadan yükseltilmemelidir.

| Ölçüm | Baz gzip | Bütçe |
|---|---:|---:|
| İlk HTML seti | 398.556 | 439.000 |
| Toplam JS | 804.652 | 886.000 |
| Toplam CSS | 30.960 | 34.500 |
| `entry` | 158.270 | 174.000 |
| `reactVendor` | 60.325 | 66.500 |
| `iconsVendor` | 9.322 | 10.500 |
| `firebaseVendor` | 149.180 | 164.500 |
| `firebaseAuth` | 36.602 | 40.500 |
| `mapVendor` (JS+CSS) | 259.208 | 286.000 |
| `mapWorker` | 131.810 | 145.500 |
| `mapView` | 8.149 | 9.500 |

### Kasıtlı aşım kanıtı

1. Node testindeki sıkıştırılması zor temsili içerikle şişirilmiş giriş fixture'ı, hem `entry` hem toplam JS bütçesini kırar.
2. Ayrıca gerçek `dist` kopyası `/tmp` altında geçici olarak şişirildi ve şu sonuç görüldü:

```text
exit=1
- Toplam JS gzip bütçesi aşıldı: 1.505.705 B > 886.000 B
- İlk HTML asset seti bütçesi aşıldı: 1.099.609 B > 439.000 B
- entry gzip bütçesi aşıldı: 859.323 B > 174.000 B
```

Geçici kopya silindi; repo ağacı bu deneyle kirletilmedi.

## 5. Panel/modal lazy değerlendirmesi

Ek panel taşıması yapılmadı. Karar yalnız “koşullu render ediliyor” ölçütüne göre verilmedi; saha/çevrimdışı davranış da dikkate alındı.

`public/sw.js`, kurulumda HTML'de referanslanan hash'li asset'leri precache eder. Lazy chunk'lar ancak çevrimiçiyken ilk kez istendiklerinde runtime cache'e girer. Bu nedenle hiç açılmamış bir paneli ayrı chunk yapmak, kullanıcının o paneli ilk kez çevrimdışıyken açması durumunda dynamic import hatasına yol açabilir. Bu, P19'un “kullanıcıya görünen yüklenme davranışını kötüleştirme” yasağıyla çelişir.

| Yüzey | Karar | Gerekçe |
|---|---|---|
| `TrackRecorderPanel` | Statik | GPS/saha akışı; ilk çevrimdışı açılış riski kabul edilmez. |
| `RecordsDock` | Statik | Kayıtlı yer/rotalara çevrimdışı erişim beklentisi var. |
| `RouteEditor` | Statik | Kayıtlı rota düzenleme yerel akışın parçası; yayınlama bulut olsa da düzenleme yüzeyi saha kullanımına açık. |
| `ProfilePanel` | Statik | Cihaz/bulut hesap işlemleri ve hesap silme gibi kritik işlemler içerir. |
| `MyPlacesPanel` | Statik | Kullanıcının kendi yerleri; yerel/önbellekli kullanımın parçası. |
| `NotificationsPanel` | Statik | Bulut verisi kullanır ancak bileşen küçüktür; beklenen kazanç ek yükleme/odak riskine değmez. |
| `AddDiscoveryModal` | Statik | Sahada taslak bırakma akışının çekirdeği. |
| `SettingsPanel` | Statik | Konum izni, çevrimdışı paket ve kurulum kontrollerini içerir. |
| `Onboarding` | Statik | İlk çalışmada hemen görünür; lazy yapmak ilk deneyimi geciktirir. |
| `PlaceDetails` | Statik | Haritada yer seçiminin çekirdek devamı; çevrimdışı yer ayrıntısı da önemlidir. |
| `StreetPeek` | Statik | Küçük ve yer ayrıntısı akışına bağlı; anlamlı ayrık kazanç yok. |
| `Drawer`, `BottomPanel`, `Header`, `SearchBox`, `MapControls` | Statik | Kabuk/ilk etkileşim yüzeyleri. |
| `AtlasAssistant` | Statik | Launcher her zaman monte; mesaj/rota durumu kapalıyken de korunuyor. Bütün bileşeni lazy yapmak launcher gecikmesi veya durum kaybı riski yaratır. |
| `SocialPanel` | Statik | Launcher ve görülmemiş hikâye durumu kapalıyken de çalışıyor; içindeki grup akışı ayrıca hassas. |
| `AccountAccess`, `LandingPage` | Statik | Auth kapısıdır; cihaz hesabı çevrimdışı giriş için kritik olabilir. Karşılıklı dışlayıcı olmaları tek başına güvenli lazy gerekçesi değildir. |
| `MapView` | Zaten lazy | Mevcut `Suspense` + iskelet sözleşmesi ve ağır MapLibre sınırı korunur. |

Gelecekte panel lazy-load yapılacaksa önce service-worker/prefetch stratejisi tasarlanmalı: ilk boyamadan sonra boşta önceden indirme, chunk'ların SW cache'e girmesi, çevrimdışı ilk açılış ve odak/animasyon davranışının tarayıcıda kanıtlanması gerekir. Bu P19'da ölçülmeden varsayılmadı.

## 6. Tree-shaking ve yan etki taraması

- `src` içinde barrel amaçlı `export *` bulunmadı; bileşen/modül import'ları doğrudan dosyalara gidiyor.
- Yan etkili import'lar yalnız uygulama CSS'i (`src/main.tsx`) ve lazy `MapView` içindeki MapLibre CSS'idir. MapLibre CSS'i doğru sınırdadır.
- Lucide import'ları isimli import desenini kullanır; üretilen `icons-vendor` 9.322 B gzip'tır. Tam ikon kütüphanesinin başlangıca girdiği görülmemiştir.
- Tek namespace import, lazy `MapView` içindeki `maplibre-gl` import'udur ve manuel `map-vendor` chunk'ındadır.
- Firebase import'ları modüler isimli import'lardır. Auth tarafında çalışma kodu gerektirmeyen yerlerde `import type` kullanılır; statik sızıntı tek somut bulgu olarak `moderation.ts` içinde düzeltildi.
- Vite'ın `deviceAccounts` uyarısı sürüyor: modül `moderation.ts` içinde dinamik, `AuthContext` ve `AccountAccess` içinde statik import ediliyor. Oturum geri yükleme/cihaz hesabı başlangıç için gerekli olduğundan dinamik import chunk ayıramaz. Uyarıyı susturmak için yapılacak import biçim değişikliği boyut kazancı sağlamayacağından P19'da dokunulmadı.
- `notifications.ts` içindeki dinamik `writeBatch` import'u da aynı Firestore vendor grafiğinin parçasıdır; ölçülebilir ayrık kazanç üretmez.
- `firebase.ts` modül yüklenirken App Check/Firestore başlatır. Bu yan etki ve senkron `db` sözleşmesi, Firestore vendor'ının başlangıçta kalmasının mimari nedenidir; P19 kapsamında veri katmanı yeniden yazılmadı.
- `AtlasAssistant` içinden gelen `SunCalc`/`tz-lookup` yalnız altın-saat dalında kullanılır; ancak asistanın saha/çevrimdışı kullanımı ve her zaman monte launcher/durum tasarımı nedeniyle, SW/prefetch güvencesi olmadan dinamik import'a çevrilmedi. Bu, gelecekte tarayıcı ölçümüyle ele alınabilecek açık noktadır.
- Yeni prod veya dev bağımlılık eklenmedi; bundle visualizer kurulmadı.

## 7. Değişen dosyalar

| Commit | Dosyalar | İçerik |
|---|---|---|
| `a8f8a45` | `src/lib/moderation.ts`, `src/config/lazyLoading.test.ts` | `deleteUser` dinamik import; Auth lazy sınırı kilidi |
| `e928eaa` | `scripts/bundle-budget.mjs`, `scripts/bundle-budget.node-test.mjs`, `package.json`, `.github/workflows/ci.yml` | Bundle bütçesi, node testleri, `postbuild`, `test:scripts`, CI görünürlüğü |
| Doküman commit'i | `teslimat-p19.md`, `docs/gorevler/p-serisi-uzun-vadeli.md` | Bu teslimat ve plan durumu |

Dokunulmayan hassas yüzeyler:

- `firestore.rules`: değişmedi.
- `src/components/MapView.tsx`: değişmedi.
- `vite.config.ts` manual chunk düzeni: değişmedi.
- `package-lock.json`: değişmedi; bağımlılık eklenmedi.

## 8. Doğrulama (gerçek çıktılar)

| Komut | Sonuç |
|---|---|
| `npm ci` | ✅ Görev başında temiz kurulum tamamlandı |
| Hedefli Vitest: `lazyLoading`, `moderation`, `moderation.io` | ✅ 3 dosya / 12 test |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (`--max-warnings=0`) |
| `npm run test:run` | ✅ **73 dosya / 399 test** |
| `npm run test:scripts` | ✅ owner-index 7/7 + bundle-budget 6/6 |
| `npm run build` | ✅ Vite build + `postbuild` bundle bütçesi içinde |
| `npm run bundle:budget` | ✅ İlk set 398.556 B gzip; toplam JS 804.652 B; CSS 30.960 B |
| Kasıtlı şişirme deneyi | ✅ Beklendiği gibi `exit 1`; geçici kopya silindi |
| `npm run verify:social-metadata` | ✅ 18 değer, 1200×630 JPEG |
| `npm run audit:check` | ✅ Üretim bağımlılıklarında bilinen açık yok |
| `npm run test:rules:emulator` | ⚠️ Yerelde çalıştırıldı ancak `java: command not found`; runner Java 21 ön koşulunda durdu. **Geçti sayılmadı.** Nihai kanıt PR CI'ında izlenmelidir |

Build sırasında mevcut iki uyarı sürüyor:

1. `deviceAccounts` hem dinamik hem statik import edildiği için ayrı chunk'a taşınamıyor.
2. Bazı chunk'lar Vite'ın 500 kB ham uyarı sınırının üzerinde. Yeni bütçe bu durumu görünmez yapmaz; ham/gzip kategori sınırlarıyla açıkça kilitler.

## 9. Kalan riskler ve açık noktalar

- Tarayıcıda tekrarlanmış zamanlama, Lighthouse veya gerçek cihaz ölçümü yapılmadı. Bu teslimat “uygulama hızlandı” demez; yalnız HTML preload setindeki bayt azalmasını kanıtlar.
- Bulut yapılandırması açıkken AuthContext oturumu geri yüklemek için Auth chunk'ını başlangıçtan kısa süre sonra isteyebilir. Kazanç, tarayıcının HTML preload kuyruğundan çıkmasıdır; her akışta toplam ağ trafiği azalması değildir.
- `firebase-vendor` hâlâ ilk settedir (149.180 B gzip). Explorer/Firestore veri katmanını geciktirmek ayrı mimari karar ve davranış testi gerektirir.
- Panel lazy-load'un güvenli hâli, SW precache/prefetch ve çevrimdışı ilk açılış kanıtı olmadan uygulanmamalıdır.
- Bütçe eşikleri bayt regresyonunu yakalar; çalışma zamanı performansı, bellek veya etkileşim gecikmesi için ayrı profil gerekir.
- `npm run build` artık bütçe aşımında başarısız olur. Bu bilinçli kilittir; meşru bir büyüme gerekiyorsa önce ölçüm ve gerekçe yazılıp eşik ayrıca güncellenmelidir.

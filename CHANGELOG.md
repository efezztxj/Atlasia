# Atlasia Update

## 2026-10-28 — Denetim A grubu güvenlik yamaları (CSP tema/Google popup, HSTS, gizli source map, CRLF), T7/T10 kurtarma ve temsilî tur etiketi (M-25)

- **Üretim CSP düzeltmeleri + çevrimdışı kabuk (A1, A2, A5):**
  - **A1 (`/theme-boot.js`):** `index.html` içindeki satır içi tema betiği üretimde `script-src 'self'` tarafından engelleniyordu; betik `/theme-boot.js` dosyasına taşındı (`'unsafe-inline'` açılmadı) ve PWA çevrimdışı açılışta temanın kaybolmaması için `public/sw.js` ön önbellek kabuğuna (`SHELL` + `isAllowedStaticPath`) eklendi.
  - **A2 (`apis.google.com`):** Firebase Google `signInWithPopup` akışının kullandığı `https://apis.google.com` kökeni `public/_headers` içinde `script-src`, `connect-src` ve `frame-src` listelerine eklendi.
  - **A5 (`HSTS includeSubDomains`):** `Strict-Transport-Security` başlığı `max-age=31536000; includeSubDomains` olarak sıkılaştırıldı (`preload` bilinçli olarak `pages.dev` paylaşımlı kök alanı nedeniyle hariç tutuldu).
- **Gizli source map + CI artifact ve CRLF koruması (A3, A4, A6, A7):**
  - **A6 (`sourcemap: "hidden"`):** `vite.config.ts` gizli kaynak haritası üretiyor, `scripts/collect-sourcemaps.mjs` postbuild adımında `.map` dosyalarını `dist/` dışına (`sourcemaps/`) taşıyor ve `.github/workflows/ci.yml` SHA-pinli `actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9` ile 7 günlük CI artifact olarak saklıyor.
  - **A3/A4/A7:** `Explorer` ve `TrackRecorderPanel` SDK başlatmayan `lib/firebaseConfig` modülünü okuyor; `legal.ts` `_GRECAPTCHA` açıklaması gerçeğe uyarlandı; `.gitattributes` ve `split(/\r?\n/)` ile Windows CRLF kural ayrıştırıcı kayması kapatıldı (`securityPosture.test.ts` — 10 test).
- **T7 tembel yükleme yarış düzeltmeleri + T10 görsel boru hattı kapıları:**
  - `CookieConsent` henüz inmeden tıklanan **Çerez tercihleri** isteği `consumePendingCookiePreferences()` bayrağıyla yakalanıyor; `LandingPage` alt `Suspense` yer tutucusu `id="sss"` çapasını koruyor.
  - `src/utils/image.ts` 25 MB decode öncesi bellek kapısı, HEIC/HEIF için iOS **En Uyumlu** yönlendirmesi ve EXIF `imageOrientation: "from-image"` desteği kazandı; `PlaceDetails`, `PlaceImage`, `RecordsDock` ve `SocialPanel` görsellerine `decoding="async"` / `loading="lazy"` eklendi (`imagePipelineT10.test.ts` — 7 test).
- **Temsilî site turu etiketi (M-25 · P1 / G6):** `NearbyAudioGuide` artık `isRealPath(tourRoute) === false` olan antik kent turlarında kart içinde açık **`Temsilî tur — saha patikası doğrulanmadı; duraklar editör sırasıyla sunulur.`** uyarısı gösteriyor (`NearbyAudioGuide.test.ts` — 3 test).
- **T1 Worker paketi (`PR #146`):** `workers/telemetry/` Cloudflare Worker paketi ve 8 sözleşme testi (`npm run test:telemetry-worker`) `main` dalına alındı.

## 2026-10-28 — Vite 8 + plugin-react 6 (bekletilen majör alındı)

- `vite` ^7.3.7 → **^8.3.5**, `@vitejs/plugin-react` 5.1.1 → **6.1.2** (plugin-react 6, Vite 8 istiyordu; ikisi birlikte alındı). TypeScript 7 hâlâ bekliyor: `typescript-eslint` peer aralığı `<6.1.0`.
- **Ölçüm (Rolldown):** toplam JS 988.185 bayt gzip (bütçe 1.003.000) — derleyici değişimi toplamı düşürdü; ilk boya ve yolculuklar bütçe içinde. Kategori dağılımı kaydığı için entry/iconsVendor/firebaseAuth/ilk-boya-CSS eşikleri ölçüme ~%3 payla yeniden bağlandı (ayrıntı `scripts/bundle-budget.mjs` içinde).
- **SW düzeltmesi:** Rolldown varlık yollarını şablon dizgisiyle (backtick) yazıyor; `sw.js` keşif regex'i üç tırnak türünü de tanıyacak şekilde genişletildi — yoksa harita işçisi SW kabuğuna giremiyor ve `verify:sw-shell` kapısı düşüyordu (CI'da bu yüzden build adımı kırılıyordu).
- Ayrıca bütçe ihlalleri CI'da check-run annotation'ı olarak basılıyor.
- Typecheck, lint, 1284 test ve build (SW kabuğu 62/62) yeşil.

## 2026-10-28 — Dayanıklılık paketi: canlı veri yeniden deneme (M-18), yükleme iskeletleri (M-19), yürüyüş Wake Lock (M-26), rıza parçası kurtarma ve profil testleri (M-35)

- **Kalıcı canlı veri hata şeridi + `Yeniden dene` (M-18 · P0):** `useFirestoreAtlasData` artık `retry()` eylemi sunarak başarısız abonelikleri (`ownerPlaces`, `viewportPlaces`, `posts`, `stories`) kapatıp yeniden kuruyor. `Explorer` geçici toast yerine kapatılabilir kalıcı `role="alert"` şeridi + **Yeniden dene** düğmesi gösteriyor; `SocialPanel` içinde de akış hatası kartından yeniden deneme yapılabiliyor.
- **Yükleme iskeletleri (M-19 · P1):** `SocialPanel` (story halkaları + gönderi kartları), `SearchBox` (uzak dünya araması) ve `PlaceDetails` (galeri yüklemesi, `NearbyHistory` ve tembel panel açılışı) tema duyarlı `.skeleton` bileşenleriyle sahte "boş ekran" algısını ortadan kaldırıyor.
- **Yürüyüş kaydında Screen Wake Lock (M-26 · P1):** `useTrackRecorder` kayıt başladığında `navigator.wakeLock.request("screen")` alıyor, sekme arka plandan görünür duruma döndüğünde (`visibilitychange`) kilidi yeniliyor, bitiş/vazgeçiş/unmount anında serbest bırakıyor ve düşük güç modunda reddedilse bile GPS kaydını kesintisiz sürdürüyor. `TrackRecorderPanel` kilit durumunu kullanıcıya açıkça bildiriyor.
- **Tembel rıza parçası kurtarma (T7/T18 açık nokta):** `CookieConsentBoundary` tembel `CookieConsent` parçasının kesintili ağda indirilememesi hâlinde hatanın `AppErrorBoundary`'ye tırmanıp uygulamayı düşürmesini engelliyor; **Tekrar dene** veya footer **Çerez tercihleri** tetiklemesinde taze `lazy()` fabrikasıyla parçayı yeniden yüklüyor.
- **Test ve doküman kilidi (M-35 · P1):** `ProfilePanel.test.ts` (çift onaylı hesap silme, KVKK veri indirme, çıkış onayı), `CookieConsentBoundary.test.ts`, `LoadingAndRetrySurface.test.ts`, `useFirestoreAtlasData.test.ts` ve `useTrackRecorder.test.ts` eklendi/genişletildi; `docs/moderasyon-akisi.md` PR #140 `İncelenenler` mimarisiyle güncellendi. Mevcut tüm bundle bütçesi eşikleri aşılmadan korundu (`1.002.430 / 1.003.000 B` JS gzip, `25.068 / 25.200 B` ilk boya CSS gzip).

## 2026-10-28 — Tanıtım filmi (`preload="none"` + poster, T6)

Ayrıntı: `docs/teslimatlar/teslimat-t6-video-2026-10-28.md`.

- **Yeni bölüm `#film`:** repodaki mevcut klip (`public/social/goreme-yuruyus.mp4`, Kapadokya, 1080×1920, 4,0 MB) dikey kart olarak tanıtımda. Harici barındırma/CDN yok.
- **Mobil veri korunur:** `preload="none"` — kullanıcı oynatmadan tek bayt inmez; `autoPlay`/`loop`/`muted` yok, ses kendiliğinden başlamaz, `controls` + `playsInline`.
- **Poster:** hero'da zaten yüklenen `images/atlasia-earth-hero.jpg` (ek ağ maliyeti sıfır). Videodan alınmış kare değildir — afiş görseli; ffmpeg ile tek komutta gerçek kareyle değiştirilebilir.
- **CLS:** `width`/`height` (1080×1920) + `aspect-[9/16]` ile yer önceden ayrıldı. Video oynatılamazsa okunabilir bağlantı var; SW kabuğu videoyu önbelleğe **almıyor** (4 MB tuzağı yok).
- **Bütçe:** `entry` 18.888 / 20.900, ilk boya JS 98.287 / 102.200, ilk HTML 125.991 / 129.400. Toplam JS 1.000.364 → eşik 1.002.000 (ölçümlü gerekçe kod içinde). SW 46/46.
- Testler **1292/1292** (160 dosya); `landingVideoT6.test.ts` (7) yeni kilidi.

## 2026-10-28 — Kritik yol: SSS/footer ve rıza paneli giriş paketinden çıktı (T7)

Ayrıntı: `docs/teslimatlar/teslimat-t7-kritik-yol-2026-10-28.md`.

- **Kapı kırıktı:** `entry` 20.915 / 20.900. Eşik yükseltilmedi; onun yerine ilk boyada gerekmeyen iki blok `lazy()` yapıldı: tanıtımın alt bloğu (`LandingFooter`: SSS + footer) ve rıza paneli (`CookieConsent`).
- **Sonuç:** `entry` **18.344** (−2.571), ilk boya JS **97.743** (−2.571), ilk HTML seti **125.351** (−2.567). Fallback yüksekliği (520 px) düzen zıplamasını sınırlar.
- **Toplam JS +1.715 B** (999.785): ayrı chunk'lar daha kötü sıkışır. İndirilen bayt artmıyor, aynı kod daha sonra iniyor. Yalnız toplam JS eşiği 998.500 → **1.001.000** (pay 1.215 B, %0,12); `entry`/ilk boya/ilk HTML/appShell eşikleri değişmedi.
- **Kilit:** `src/config/criticalPath.test.ts` (4) — iki blok gerçekten tembel, fallback var, eşikler ölçüme bağlı. `siteSurface`, `footerT18`, `prerenderT17`, `LandingPage.test` ve `CookieConsent.test` yeni yüzeye uyarlandı (iddialar zayıflatılmadı).
- Testler **1281/1281** (158 dosya); typecheck, lint, build, SW 44/44, `test:scripts`, `audit:check` yeşil.

## 2026-10-28 — JavaScript'siz içerik (T17)

Ayrıntı: `docs/teslimatlar/teslimat-t17-noscript-2026-10-28.md`.

- **Boş sayfa bitti:** `index.html` gövdesinde yalnız `<div id="root"></div>` vardı; JS engelli tarayıcıda sayfa tamamen boştu. Tanıtım metni (başlık, üç adım, iki SSS, "harita JavaScript gerektirir" notu) derleme sırasında `<noscript>` olarak gömülüyor.
- **Neden prerender değil:** tam prerender + hidrasyon bu ortamda doğrulanamıyor (tarayıcı yok) ve `entry` marjı 12 B; `<noscript>` JS açıkken render edilmediği için CLS/LCP riski sıfır, hidrasyon gerektirmiyor.
- **Tek kaynak + sürüklenme kilidi:** metin `src/content/landingStatic.ts`'te; `prerenderT17.test.ts` her dizenin `LandingPage.tsx`'te de geçtiğini doğrular, `index.html`'de kopya metin yasak.
- **Bütçe:** eşik yükseltilmedi. İlk HTML seti 127.763 / 129.400 (+694 B gzip), JS paketleri ve `entry` (20.888 / 20.900) değişmedi. Testler **1271/1271** (157 dosya).

## 2026-10-28 — Footer yüzeyi (T18) ve SEO meta seti (T19)

Ayrıntı: `docs/teslimatlar/teslimat-t18-t19-footer-seo-2026-10-28.md`.

- **Çerez tercihleri landing'den geri alınabiliyor:** footer'ın "Yasal" nav'ına eklendi; var olan rıza panelini (`atlasia:cookie-preferences`) açar. Yeni bağımlılık yok.
- **Dil açıkça yazılı:** footer'da "Site dili: Türkçe (tr)" (`lang="tr"`). İkinci yerel ayar olmadığı için **sahte dil seçici yazılmadı**; `<html lang>`, `hreflang="tr"` ve `x-default` aynı şeyi söyler.
- **SEO:** `canonical`, `robots: index, follow, max-image-preview:large`, `hreflang` + `x-default` eklendi; `sitemap.xml` `lastmod` 2026-10-28'e çekildi. Yapısal veri (Organization/WebSite/WebApplication) korundu, doğrulanamayan puan/oylama yok.
- **Bütçe:** eşik **yükseltilmedi**. Toplam JS 997.981 / 998.500, ilk boya JS 100.287 / 102.200, ilk HTML seti 127.069 / 129.400, `entry` 20.888 / 20.900 → **marj 12 B**; landing'e dokunacak sıradaki işin önce ölçüm alması ve gerekirse footer'ı tembel parçaya taşıması gerekiyor.
- Testler **1262/1262** (155 dosya; T18 3 + T19 6 yeni), typecheck/lint/build/`test:scripts`/`audit:check` yeşil.

## 2026-10-28 — Karşılama paneli (T8): misafir ayrımı, ilk rota kapısı, ölçüm

Ayrıntı: `docs/teslimatlar/teslimat-t8-onboarding-2026-10-28.md`.

- **Misafir notu:** karşılama paneli misafire hesabın nerede isteneceğini baştan söyler ("harita okuma serbest, iz bırakmak/rota yayımlamak için hesap istenecek, seçtiğin yol kaybolmaz"). Üyeye gösterilmez.
- **Sürpriz duvar kalktı:** misafir "Rota oluştur"a bastığında Atlas AI açılıp sonra kayıt istemek yerine anında hesap kapısına (`route` niyetiyle) gider; hesap açılınca T5 aynı yere döndürür.
- **Aktivasyona bağlı panel:** cihazda rota oluşturulmuşsa karşılama bir daha açılmaz (yalnız "görüldü" bayrağına bağlı değil).
- **Ölçüm:** `onboarding_choice{choice, guest}` (dört çıkış) — kod + tetikleyici + belge aynı teslimatta (katalog testi).
- **Bütçe:** eşik yükseltilmedi; toplam JS **997.923 / 998.500**, `entry` **20.839 / 20.900** (marj 61 B), ilk boya JS 100.238 / 102.200.
- Testler **1256/1256** (154 dosya), typecheck/lint/build/`test:scripts`/`audit:check` yeşil.

## 2026-10-28 — Misafir modu (T4) ve kayıt sonrası ilk değer (T5)

Ayrıntı: `docs/teslimatlar/teslimat-t4-t5-misafir-2026-10-28.md`.
**`firestore.rules` değişmedi** — misafirin `request.auth` değeri boştur, yazma sunucuda zaten reddedilir.

- **T4 — Kayıt duvarı kalktı:** Landing'deki her CTA artık giriş ekranını değil **misafir haritasını** açar; `cta_click` sonrası `map_open{guest:true}` düşer. Misafir, herkese açık `places`/`posts`/`stories` kayıtlarını okur (mevcut public okuma kuralı), sahip sorgusu hiç kurulmaz.
- **Yazma kapısı:** İz ekleme, gönderi/hikâye/yanıt/beğeni, rota oluşturma, yürüyüş kaydı, profil ve bildirimler misafirde tek tek hesap kapısına yönlenir; veri katmanı da yazmayı istemcide reddeder (çift katman). Giriş ekranı kapatılabilir: "Misafir olarak devam et".
- **T5 — kayıt sonrası ilk değer:** Engellenen eylem niyet olarak hatırlanır (`atlasia.pendingIntent.v1`, 30 dk TTL). Hesap açılınca "iz ekle" isteyen kullanıcı haritayı **ekleme modunda**, "paylaş" isteyen topluluk akışı açık bulur.
- **Bütçe (ölçümlü):** kodun büyük kısmı tembel `Explorer` parçasında kaldı; girişteki `entry` yalnız 20.530 → **20.814 B** gzip (+284) büyüdü ve kullanıcıya görünen eşikler **değişmedi** (ilk set 126.774/129.400, ilk boya JS 100.213/102.200, uygulama kabuğu 586.968/603.400). Yalnız **toplam JS** eşiği 997.500 → **998.500** (ölçüm 997.761, +933 B); yeni bağımlılık yok, gerekçe `scripts/bundle-budget.mjs` içinde yazılı.
- Yeni testler: `src/config/guestMode.test.ts` (10) + "Misafir olarak devam et" (2) + veri katmanında misafir okuma/yazma testleri (2) + `App.test.ts` güncellemesi. Toplam **1248/1248** (153 dosya); typecheck, lint, build, `test:scripts`, SW kabuğu (44/44), `audit:check` yeşil.

## 2026-10-28 — Bütçe eşikleri ölçüme bağlandı (#127, çözülmüş hali)

#127'nin son hali güncel main'e taşındı ve son büyümelere kalibre edildi:

- Bütçe eşikleri artık ölçüme yakın; şişkin/bayat eşik kapıyı fiilen öldüremiyor (bayatlama kapısı testlerde).
- Son kalibrasyon: toplam JS 998.500, entry 20.900 (Firebase 13 + hikâye silme sonrası ölçüm: 996.828 / 20.530).
- Yerel `.env.local` bağımlılığı iki testten kaldırıldı.

Typecheck, lint, 1233 test, script testleri ve build yeşil.


## 2026-10-28 — Hikâye izleri 24 saatte otomatik ve kalıcı silinir (#131, çözülmüş hali)

#131 paralel Explorer ayrımına dayandığı için olduğu gibi birleşemedi; tek özellik commit'i mevcut yapıya taşındı:

- Üst şeritteki (stories) izler 24 saati doldurunca **otomatik ve kalıcı** silinir; moderatörde kapsam genişler, silme işlemi kayıt altına alınır.
- Bağlantı değişikliği mevcut `Explorer` bileşenine taşındı (`moderator` bilgisi veri katmanına ve SocialPanel'e geçer).
- **Bütçe:** yeni silme mantığı toplam JS'i 996.828 bayta çıkardı; toplam bütçe 996.500 → **998.500**.

Typecheck, lint, 1233 test ve build yeşil.


## 2026-10-28 — Firebase 13.1.0 + rules-unit-testing 6 (#82, çözülmüş hali)

- `firebase` ^12.19.0 → **^13.1.0**; `@firebase/rules-unit-testing` 5 → **6** (firebase 13 istiyordu; birlikte alındılar).
- **Uyumluluk:** 13.0 kırıcı değişiklikleri yalnız `@firebase/ai`'da (Atlasia kullanmıyor); auth/firestore kırıcı değil. `dependencySecurity` kapısındaki sürüm sabiti güncellendi; `@grpc/grpc-js` 1.13.6 override'ı 13'te de aynen geçerli (iç içe kopya yok).
- **Bütçe kararı (maintainer):** toplam JS 984.686 → 994.802 bayt gzip (firestore/auth parçaları büyüdü; firebaseVendor aksine 159.467'ye küçüldü). Toplam JS bütçesi 986.500 → **996.500**; ilk-boya/yolculuk bütçeleri değişmedi.
- Typecheck, lint, test ve build yeşil. Kurallar emülatör süiti CI'da koşar.


## 2026-10-28 — Dev-tooling kısmi güncelleme (#79, çözülebildiği kadarıyla)

#79'un güncel main'de uygulanabilir kısmı alındı; üç paket gerekçeli olarak bekletildi:

- **Alınan:** `tailwindcss` + `@tailwindcss/vite` 4.1.17 → 4.3.3, `eslint` 10.13.0, `globals` 17.13.0.
- **Bekletilen — `@types/node` 26:** mevcut tsconfig (`lib: ES2020`) altında kurallar testi tiplerini kırıyor; 22'de kaldı.
- **Bekletilen — `@vitejs/plugin-react` 6:** Vite 8 istiyor (bizde 7); Vite 8 yükseltmesiyle birlikte alınacak.
- **Bekletilen — `typescript` 7:** `typescript-eslint` henüz TS 7 desteklemiyor (lint tamamen kırılıyor); destek gelince `baseUrl` → göreli `paths` geçişiyle birlikte alınacak (denendi, çalışıyor).
- `@firebase/rules-unit-testing` 6, firebase 13 istediği için Firebase grubuyla birlikte ele alınır.

Typecheck, lint, 1202 test ve build yeşil.


## 2026-10-28 — MapLibre GL 6.15.0 (#81, çözülmüş hali)

- `maplibre-gl` 6.4.1 → **6.15.0** (tam sürüm sabitli; güvenlik tabanı 6.4.1'in üstünde, `dependencySecurity` kapısı yeşil).
- **Bütçe kararı (maintainer, şeffaflık notu):** 11 minor sürümde kütüphane büyüdü — mapVendor 248.691 → 290.724, mapWorker 131.810 → 150.448 bayt gzip (toplam +60,7 KB). Bu parçalar ilk boyada DEĞİL, harita açılışında tembel yüklenir ve önbelleklenir; ilk-boya/yolculuk bütçeleri etkilenmedi. Bütçeler: mapVendor 286.000 → 302.500, mapWorker 145.500 → 152.000, toplam JS 925.000 → 986.500.
- Typecheck, lint, test ve build yeşil.


## 2026-10-28 — React 19.3.1 (#80 + #83, çözülmüş hali)

Dependabot dalları eski main'e dayandığı için CI'ları kırık geliyordu; yükseltme güncel main üzerinde taze uygulandı:

- `react` / `react-dom` 19.2.6 → **19.3.1**, `@types/react` / `@types/react-dom` → **19.3.0**.
- **Bütçe kararı (maintainer):** React 19.3'ün vendor paketi 66.500 → 69.004 bayt gzip büyüdü (kütüphanenin kendi büyümesi); `reactVendor` bütçesi 69.500, toplam JS bütçesi 916.500 → **925.000** yapıldı. İlk-boya ve yolculuk bütçeleri değişmedi.
- Typecheck, lint, 1202 test ve build yeşil.


## 2026-10-28 — İsteğe bağlı 6 panel tembel yükleme (#123'ün kazancı, çözülmüş hali)

#123 paralel bir App bölünmesi içerdiği için olduğu gibi birleşemedi; kazancı mevcut `Explorer` yapısına uygulandı, #123'ün yerini bu kayıt alır:

- **Tembel paneller:** SocialPanel, Drawer, AtlasAssistant, MyPlacesPanel, StreetPeek, AddDiscoveryModal artık ilk yükte indirilmiyor; her biri kendi `Suspense` sınırında, açıldığında yükleniyor.
- **Ölçüm:** uygulama kabuğu yolculuğu 813 KB → **516.547 bayt gzip**; tanıtım yolculuğu 116.685 bayt (bütçe 425.000).
- **Bütçe kararı (maintainer):** parça bölünmesi toplam JS'e ~6,5 KB tekrar yükü ekledi (915.334); toplam JS bütçesi 909.500 → **916.500**. Kullanıcının gördüğü ilk-boya/yolculuk bütçeleri değişmedi ve bol payla içinde.


## 2026-10-28 — Landing performansı (T11/T12/T7) + bütçe notu

#120'nin main ile çakışması çözülerek yayına alındı (yerini bu kayıt alır):

- **Firebase ilk setten çıktı:** açılışta yalnız tanıtım sayfası yüklenir; Firebase/keşif kodu giriş sonrası tembel yüklenir. İlk boya JS: **387.281 → 90.426 bayt gzip**.
- Kontrast düzeltmeleri ve çerez onayının yerleşimi iyileştirildi; App ince kapıya + `Explorer` bileşenine bölündü.
- **Bütçe kararı (maintainer):** kod bölünmesinin chunk başına küçük tekrar yükü toplam JS'i 906.447 → 908.855 bayta çıkardı; ilk boyadaki −297 KB kazanca karşılık toplam JS bütçesi 908.000 → **909.500** olarak güncellendi. İlk boya ve yolculuk bütçeleri değişmedi.
- Çakışma çözümleri: bütçe testlerinde iki tarafın testleri de korundu; `uiSurface`/`siteSurface` testleri `Explorer.tsx`'i de kaynak sayar.

## 2026-10-28 — Landing erişilebilirlik turu: mobil menü, tek H1, hareket azaltma (T13–T16)

Ayrıntı: `docs/teslimatlar/teslimat-t13-t16-2026-10-28.md`.

- **T13 — Mobil menü:** 768 px altında hamburger → tam ekran panel (Keşfet · Nasıl çalışır? · Gizlilik · Keşfe başla). `aria-expanded`/`aria-controls`, Escape ile kapanma, Tab tuzağı, kapanınca odağın düğmeye dönmesi.
- **T14 — Klavye:** "İçeriğe geç" skip-link'i (ilk odak) + `#kesfet` hedefi `tabIndex={-1}`. Global `:focus-visible` halkası zaten vardı; kopya eklenmedi (denetim bulgusu).
- **T15 — Hareket azaltma:** mevcut `prefers-reduced-motion` bloğuna eksik olan `scroll-behavior: auto !important` eklendi (landing'deki `scroll-smooth` artık yok sayılmıyor).
- **T16 — Semantik:** sayfanın tek H1'i "Dünyayı merakınla keşfet."; marka yazısı `aria-hidden` dekoratif öğe. Bölüm başlıkları H2, kartlar H3 — hiyerarşi atlaması yok.
- Ölçüm (main'e taşındıktan sonra, `7079387`): ilk set **117.585 B** gzip (bütçe 439.000); toplam JS **916.296 B** (bütçe 916.500); toplam CSS **35.092 B** (bütçe 35.700). Typecheck, lint, **1228 test** (151 dosya), build ve SW kabuğu (44/44) yeşil. Tablo: `docs/baseline.md`.

## 2026-10-28 — Denetim düzeltmeleri + giriş ekranı sürtünmesi (T9)

Ayrıntı: `docs/teslimatlar/teslimat-denetim-t9-2026-10-28.md`.

- **T9 — Giriş/kayıt ekranı:** Google (ve etkinse Apple) artık her iki modda da e-posta formunun **üstünde** birincil boyutta; e-posta "veya e-posta ile" altında. Devre dışı "Apple ile giriş yakında" düğmesi kaldırıldı; yerine e-posta formunda mikro metin. Firebase yapılandırılmamışsa hiç sosyal düğme gösterilmiyor. Şifre göster/gizle, `autocomplete` değerleri ve satır içi hatalar korundu (7 yeni test).
- **Denetim:** `cta_click` kablolaması için 3 davranışsal test eklendi (hero/header/footer ayrımı, landing'de huni sırası); ölü `auth-secondary-providers` CSS'i silindi (CSS 35.117 → 34.964 B gzip, eşik yeniden 35.100'e çekildi; #125 sonrası güncel eşik 35.700); `consent_choice{analytics:false}` sınırı kodda ve belgede açıklandı.
- Erişilebilirlik testi `Explorer.tsx`i de tarıyor (dizin taraması) — kapsam kaybı yok. Typecheck, lint, 1139 test, build ve SW kabuğu yeşil.

## 2026-10-28 — Ölçüm tabanı: huni olayları ve baseline (T1–T3)

Ayrıntı: `docs/teslimatlar/teslimat-t1-t2-t3-olcum-2026-10-28.md`.

- **T2 — Huni olayları:** `cta_click{placement}`, `map_open{guest}`, `signup_start`, `signup_complete{method}`, `first_route_created`, `audio_guide_start`, `consent_choice` eklendi (10 → 16 olay). Landing'in dört CTA'sı yerleşim adıyla sayılıyor; `sign_up` adı `signup_complete` oldu. Tüm olaylar sabit enum/boolean taşır, rıza kapısı aynen geçerli.
- **T3 — Baseline:** `docs/baseline.md` eklendi (paket ölçümleri dolu; Lighthouse/CWV/Search Console satırları "ölçülmedi" olarak işaretli, ölçüm komutlarıyla).
- **T1 — Durum:** panel/hesap açılmadı (dış servis kimliği yok); toplayıcı seçenekleri ve tek zorunlu adım (`VITE_TELEMETRY_ENDPOINT`) `docs/olcum-ve-hata-izleme.md` §5b'de.
- Toplam JS 908.149 B gzip; eşik 908.000 → 909.000 (gerekçe aynı dosyada). Typecheck, lint, 1129 test, build ve SW kabuğu yeşil. *(Eski dal ölçümü; #125 sonrası güncel eşik 916.500.)*

## 2026-10-28 — Landing hızlı kazançları: Firebase ilk setten çıktı, kontrast ve çerez yerleşimi

Plan maddeleri T11, T12, T7. Ayrıntı: `docs/teslimatlar/teslimat-t7-t11-t12-2026-10-28.md`.

- **T11 — Firebase landing'den çıktı:** yapılandırma kapısı SDK'sız `lib/firebaseConfig.ts`e ayrıldı; `lib/auth.ts` SDK'yı yalnız `getAtlasAuth()` içinde dinamik yükler. `App.tsx` ince kapıya indi, keşif kabuğu `components/Explorer.tsx` oldu ve `lazy()` ile gelir. İlk HTML seti **411.987 → 115.087 B gzip (−%72)**; `firebase-vendor` (149.338 B) artık ertelenen parça ve bütçe testi bunu kilitliyor.
- **T12 — Kontrast:** krem zeminde eyebrow `#a37c35 → #8f6224` (3,35 → 4,66:1), büyük başlık vurgusu `#ba8f45 → #9c7029` (2,59 → 3,86:1). Yeni kilit: `src/config/landingContrast.test.ts`.
- **T7 — Çerez bandı:** masaüstünde sağ alt kart, mobilde güvenli alanlı alt sayfa; "Dünyayı keşfet" CTA'sı artık örtülmüyor.
- Toplam CSS 35.117 B olduğu için eşik 35.300'e çekildi (yeni ağırlık yok, ~%0,5 pay). Typecheck, lint, 1126 test, build ve SW kabuğu yeşil.

## 2026-10-27 — Çekmece yalnız "Raporlarım"; moderasyon yalnız Yönetim Paneli'nde

Maintainer isteği: ekran görüntüsündeki çekmece moderatör hesabında moderasyon sekmelerini de gösteriyordu; ayrım netleştirildi.

- **Çekmece (Raporlar):** moderatör hesabında bile yalnız kullanıcının kendi raporları görünür; başlık herkeste "Raporlar". Kuyruk · İtirazlar · Kayıtlar · Duyurular sekmeleri çekmeceden kaldırıldı.
- **Yönetim Paneli:** moderasyon görünümleri yalnız tam ekran `admin` düzeninde ve yalnız moderatörde açılır (Ayarlar → Moderasyon → Yönetim Paneli, fail-closed kapı aynı).
- Kuyruk verisi artık çekmece açılınca değil, yalnız Yönetim Paneli açıkken dinlenir.
- Testler: ReportsPanel 24/24 (çekmece kilidi testi eklendi; moderasyon akış testleri Yönetim Paneli düzenine taşındı).


## 2026-10-26 — Düzeltme: CSS paket bütçesi taşması (main CI)

Yönetim Paneli (#112) birleşmesi toplam CSS'i bütçenin 53 bayt üzerine çıkardı; ana dal CI'ı bu yüzden kırmızıya döndü.

- Paneldeki tek seferlik yarım piksel yazı boyutları ve özel opaklık/renk sınıfları, uygulama genelinde zaten kullanılan karşılıklarıyla değiştirildi (görünüm farkı fark edilmez düzeyde).
- CSS: 35.153 → 35.042 bayt gzip (bütçe 35.100). Typecheck, lint, 1102 test ve build yeşil.

## 2026-10-26 — Yönetim Paneli: tam ekran moderasyon düzeni

Sandbox prototipinde onaylanan klasik admin düzeni gerçek panele taşındı.

- **Ayarlar → Moderasyon → Yönetim Paneli:** yalnız moderatörde görünür; moderatör durumu artık panel açılmadan da öğreniliyor (fail-closed aynı).
- **Sol menü:** Kontrol Paneli · Kuyruk · İtirazlar · Kullanıcılar · Kayıtlar · Duyurular · Raporlarım; dar ekranda ikonlara daralır.
- **Kontrol Paneli:** bekleyen rapor / aktif ban / bekleyen itiraz gibi tıklanabilir gösterge kartları + son işlemler listesi.
- **Kullanıcılar görünümü:** rapor sahipleri ve ban kayıtlarından toplanan özet (rapor sayısı, ban rozeti, geçmiş). Raporsuz ceza ilkesi değişmedi.
- Çekmece (Raporlarım) düzeni aynen; iki düzen aynı bileşeni ve aynı kuralları paylaşır. Firestore kural değişikliği yok.
- Testler: 1054 (admin düzeni +4). Bütçe içinde (JS 900.911/908.000).

## 2026-10-25 — Kapsamlı moderasyon: kademeli yaptırım, itiraz, duyuru

Akış: `docs/moderasyon-akisi.md` §7. Maintainer kararı: kapsam tam, içerik kaldırma kalıcı.

- **Uyarı:** incelenmiş rapor üzerinden resmî uyarı; kullanıcı "Anladım" demeden geçemez, kayıt silinmez.
- **İçerik kaldırma (kalıcı):** moderatör gönderi/hikâye/iz/yanıt silebilir; iki aşamalı onay; rapor otomatik kapanır, raporlayana bildirim gider.
- **İtiraz:** askı ekranından itiraz; panelde "İtirazlar" sekmesi; kabul ile ban kaldırma ayrı işlemler.
- **Kayıtlar:** bütün moderatör işlemleri `modActions` günlüğünde (değiştirilemez).
- **Duyurular:** moderatör duyurusu bütün kullanıcılara şerit olarak görünür (cihazda kapatılır).
- **Kuyruk araçları:** durum süzgeci, arama, hedef geçmişi (rapor/uyarı/ban özeti).
- **Kurallar:** 31 → 35 blok. `/warnings`, `/appeals`, `/modActions`, `/announcements`; moderatör silme yetkisi; `report_actioned` bildirimi inceleyen moderatöre kanıtla bağlandı.
- **İndeksler:** `reports` ve `blocks` bileşik indeksleri `firestore.indexes.json`'a eklendi (kaynak senkronu).
- **Testler:** 999 → 1016. **Bütçe:** JS 903.778 B ölçüldü, eşik gerekçeyle 908.000 B (CSS 34.713/34.800).

## 2026-10-25 — Moderasyon: rapor kuyruğu, askıya alma (ban)

Akış ve kurallar: `docs/moderasyon-akisi.md`.

- **Rapor kuyruğu:** Ayarlar → Moderasyon → "Raporlarım ve inceleme durumu". Herkes kendi raporlarının durumunu görür; `moderators/{uid}` belgesi olan hesapta "Kuyruk" sekmesi açılır. Durumlar: İnceleniyor / İncelendi / İşlem yapıldı + ≤500 karakter moderatör notu.
- **Askıya alma (yeni):** "İşlem yapıldı" işaretli raporun sahibi 7/30/90 gün veya kalıcı askıya alınabilir; gerekçe zorunlu (10–500) ve kullanıcıya gösterilir. Askı ekranı gerekçe + bitiş + çıkış sunar; süre dolunca kendiliğinden kalkar.
- **Yaptırım sunucuda:** `firestore.rules` — `/bans/{uid}` yalnız moderatöre açık ve ban **yalnız aynı moderatörün** "işlem yapıldı" dediği rapora dayanabilir; kendini askıya alma kapalı; belge silinemez (kaldırma `expiresAt`'i geçmişe çeker, iz kalır). Askıdaki hesap yeni gönderi/hikâye/yanıt/yer yazamaz; okumaya devam eder.
- **Fail-closed:** kurallar dağıtılmadıysa kuyruk ve ban hiç görünmez.
- **Testler:** 985 → 999 (ban sözleşmesi +6, rapor paneli +5, askı ekranı +3, kurallar +2).
- **Bütçe:** K-10 kararı gereği JS eşiği ölçümle 902.000 B'ye çekildi (ölçüm 897.644 B, CSS 34.602/34.800).

## 2026-10-25 — Tam kod denetimi sonrası düzeltme turu

Denetim kaydı: `docs/denetim/tam-kod-denetimi-2026-10-24.md`. Firestore kuralları, indeksler, CSP ve service worker değişmedi.

- **Harita:** iz kaydı önizlemesi atılınca/panel kapanınca `clearRoute()` çağrılıyor; haritada "hayalet rota" kalmıyor (`App.tsx`).
- **Hikâye görüntüleyici:** basılı tutup duraklatınca ilerleme çubuğu sıfırlanmıyor; süre ref'te tutuluyor ve kaldığı yerden devam ediyor.
- **Silme güvenliği:** gönderi ve hikâye silmede onay istendi (yer silme/engelleme ile aynı desen).
- **Paylaşım:** Atlas rota paylaşımı başarısız olunca sessiz kalmıyor; `role="alert"` ile bildiriliyor, kullanıcı iptali hatadan ayrılıyor.
- **Bildirimler:** panelde ham şema anahtarı yerine Türkçe etiket; cihaz hesabında bulut dinleyicisi açılmıyor ve hata loglanıyor.
- **Dayanıklılık:** rapor penceresinin kapanış zamanlayıcısı unmount'ta iptal ediliyor; iz kaydırıcıya 30 sn GPS `timeout`; üst bilgi logosu artık `href="#"` değil; ad çözümlemesinde `.catch`.
- **Ağ durumu:** `navigator.onLine` yanında aynı kaynaklı tek yoklama; captive portal/yanıtsız arka uçta "Bağlantı doğrulanamadı".
- **Testler:** 954 → 959 (`StoryViewer`, `NotificationsPanel`, `ReportDialog` eklendi; `useTrackRecorder` seçenek beklentisi güncellendi).

## 2026-10-21/22 — Üretim izin düzeltmesi, P17 çekirdeği, T1-AUTH

- **#31 (d393b4c):** Rota yayınlama/kaydetme ve yer kaydında `permission-denied` ve `undefined` alan hataları istemci tarafında düzeltildi (`withoutUndefined`, `readRouteIfVisible`); grup katılımı tam kimlikle yapılıyor. Firestore Rules değişmedi.
- **#32 (38dfa3a):** P17 çekirdeği (GPS sıçrama filtresi, 7 m sadeleştirme, `buildTrackDraft`, DEM yoksa "yükseklik bilinmiyor"). Bacaklı rotalar `toFirestoreRoute`/`fromFirestoreRoute` ile yazılıyor (Firestore iç içe dizi desteklemez). Onaylı kaydet akışı açık. Rules değişmedi.
- **#33 (447fbaa) T1-AUTH:** `VITE_PHONE_AUTH_ENABLED` (varsayılan kapalı; telefon düğmesi render edilmez). `scripts/verify-env.mjs` prebuild: yalnız Cloudflare Pages main build'inde eksik `VITE_FIREBASE_*` adlarını yazıp build'i durdurur (değer yazmaz). `docs/firebase-uretim-kontrol-listesi.md` eklendi; `.env.example` VITE_ satırı 7→8.
- **P1 hijyen:** PR triyajı (`teslimat-p1-hijyen.md`), `docs/gorevler/calisma-kurallari.md`.

## Giriş ve Kayıt Düzeltmesi

- Firebase bilgileri verilmediğinden tek giriş yolu kullanılamıyordu. E-posta/şifre formu eklendi; eksik yapılandırmada açıkça bu cihaza özel hesap modu çalışır.
- Giriş ekranı kompakt ve merkezde; kayıt ekranı Atlasia tanıtımı + üyelik formu olarak ayrılır. Görsel kimlik korunur.
- Cihaz hesabı şifreyi salt + PBKDF2 özetiyle IndexedDB'de saklar. Misafir geçişi, sahte sosyal giriş ve sahte SMS yoktur.
- Şifre göster/gizle, görünür etiketler, satır içi doğrulama, yüklenme ve hatalı kimlik bilgisi durumları eklendi.
- Cihaz hesaplarında kurtarma anahtarı; Firebase hesaplarında gerçek şifre yenileme e-postası kullanılır.
- Firebase e-posta/şifre hesabı artık desteklenir. Doğrulama bekleyen hesap çıkışa zorlanmaz; ayrı doğrulama ekranından devam eder.
- Google/Apple/SMS yapılandırılmadan etkin gösterilmez. Canlı sağlayıcılar için AUTH_SETUP.md içindeki Firebase kurulum adımları gereklidir.
- Harita, rota ve keşif katmanları değiştirilmedi.

- İlk ekran uygulama tanıtımı (%65) ve doğrulanmış giriş (%35) olarak ayrıldı. Mobilde dikey, kaydırılabilir yerleşim var.
- Google ve Apple OAuth, reCAPTCHA korumalı telefon/SMS doğrulaması eklendi. Misafir oturumu veya sahte doğrulama yok.
- Kimlik bilgileri verilmediğinde giriş hata durumunu gösterir. Sağlayıcı kurulum adımları AUTH_SETUP.md ve .env.example içinde.
- Profil adı, profil düzenleme ve çıkış eklendi. Yer/rota koleksiyonları bu cihazda kullanıcı kimliğine göre ayrılır; cihazlar arası senkronizasyon iddiası yok.
- Bir sonraki güzel tesadüfün alt çubuğu geri geldi. Kayıtlar, sağ drawer yerine altta yatay bir şerit olarak açılır.
- Eksik rehber fotoğrafları gerçek Pexels ve Wikimedia Commons kaynaklarıyla tamamlandı. Yanlış konumla eşleşen stok sonuçları kullanılmadı.
- Küçük çevre görünümü resmi OpenStreetMap embed kullanır. Street View, anahtarsız modda resmi panorama bağlantısını açar; embed için geçerli Maps Embed API anahtarı gerekir.
- OSM araması Photon + şehir araması yedeği ile çalışır; istekler zaman aşımı, iptal ve önbellek içerir.
- Atlas AI seçili yer/adı, mesafe, süre ve ulaşımı dikkate alır. Uzak şehirleri yürüyüş rotasına katmaz; yeterli veri yoksa söyler.
- Rota sırası değişince saatler, mesafe ve polyline yeniden hesaplanır. Önizleme ve kullanıcı onayı ayrı kalır.
- Altın saat hedef yerin saat dilimi ve SunCalc ile hesaplanır. Canlı ücret, erişim ve hava verisi yoksa belirsizlik açıkça belirtilir.
- Ana src/components/MapView.tsx kaynağı, katmanları, marker render'i, tile ve event mantığı değiştirilmedi.

## Doğrulama Sınırları

Üretim derlemesi kontrol edilir. Bu ortamda canlı Google/Apple oturumu, gerçek SMS, telefon tarayıcısı veya iframe içeriği uçtan uca test edilemez.
Yayın için Firebase projesi, yetkili alan adı ve sağlayıcı ayarları gereklidir.
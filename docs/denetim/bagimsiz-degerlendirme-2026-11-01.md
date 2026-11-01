# Atlasia — bağımsız, eksenli değerlendirme (1 Kasım 2026)

**Kesit:** `main` @ `c19eff7` (PR #164 birleşmesi), değerlendirme dalı `arena/1446722f-atlasia`
**Yöntem:** Kod okuma + **komutların bu ortamda yeniden çalıştırılması**. Aşağıdaki her sayı
bu makinede `npm ci` sonrası ölçüldü; repo raporlarından **alıntılanmadı**, bağımsız üretildi.
Hiçbir dosya, kural veya davranış değiştirilmedi — bu belge yalnız kayıt.

> Not: Bu, depoda var olan denetimlerin (`docs/denetim/*`, `docs/mvp-denetimi-*`) tekrarı değil;
> onlardan bağımsız bir kesit. Çelişki varsa ölçüm tarihi ve komut çıktısı esastır.

---

## 1. Bu ortamda ölçülen kapılar

| Kapı | Komut | Sonuç | Süre |
|---|---|---|---|
| Bağımlılık kurulumu | `npm ci` | **PASS** — 364 paket, 8+ `EBADENGINE` uyarısı (bkz. B-07) | 14 sn |
| Tip denetimi | `npm run typecheck` | **PASS** — 0 hata | 18 sn |
| Lint | `npm run lint` (`--max-warnings=0`) | **PASS** — 0 uyarı | 26 sn |
| Birim/IO/UI testleri | `npx vitest run` | **PASS** — **176 dosya / 1.346 test** | 95 sn |
| Betik testleri (12 paket) | `npm run test:scripts` | **PASS** | 3 sn |
| Üretim derlemesi + bütçe | `npm run build` | **PASS** — "Bundle bütçesi içinde", SW kabuğu **63/63** | 3 sn |
| Bağımlılık denetimi | `npm run audit:check` / `npm audit --omit=dev` | **PASS** — üretimde 0 açık | 1 sn |
| Tam `npm audit` (dev dahil) | `npm audit` | **12 moderate** (hepsi dev, `minimatch`) | 4 sn |
| Geliştirme sunucusu | `npx vite` + `curl` | **PASS** — HTTP 200, landing SSR metni HTML'de | — |
| Firestore Rules emülatörü | `npm run test:rules:emulator` | **ÇALIŞTIRILAMADI** — bu makinede Java yok (CI'da koşuyor) | — |

**CI durumu (gh ile okundu):** `main` üzerindeki son koşular `success`; tipik süre **~3 dakika**.
Dört workflow var (`ci`, `canli-dogrula`, `insta-publish`, `rules-windows`), tüm `uses:` satırları
**commit SHA'sına sabitlenmiş**. Playwright Chromium E2E gerçekten CI adımı.

---

## 2. Ölçülen büyüklükler

| Metrik | Değer | Yorum |
|---|---|---|
| Uygulama kodu (test hariç) | **30.886 satır** / 153 dosya | Orta-büyük ölçekli ürün |
| Test kodu | **25.209 satır** | Test/kod oranı **≈0,82** (sektör ortalamasının çok üstü) |
| Test dosyası | 176 dosya / 1.346 test | Unit + IO (sahte Firestore) + jsdom + axe |
| Testi olan kaynak dosya | **120 / 153 (%78)** | Kapsam *yüzdesi* (satır) ölçülmüyor |
| Firestore kuralları | **1.326 satır**, 130 kural testi (2.250 satır) | Deny-all varsayılan |
| Bileşen / hook / lib modülü | 48 `.tsx` / 20 hook / 50+ `lib` modülü | Katmanlar ayrılmış |
| İlk boya (gzip, ölçüldü) | **≈124 KB** (JS 98,7 + CSS 25,4) | Landing bütçesi 129,4 KB |
| Toplam JS (gzip, ölçüldü) | **985,2 KB** / bütçe 1.003,0 KB (**%98,2 dolu**) | Marj 17,8 KB |
| Toplam CSS (gzip) | **35,2 KB** / bütçe 35,7 KB (**%98,6 dolu**) | Marj **500 B** — çok ince |
| En büyük parçalar | `map-vendor` 1.044 KB ham / **286 KB gzip**, `firebase-vendor` 146 KB gzip | İkisi de lazy |
| Dokümantasyon | **115 markdown / 13.301 satır** | Ürün koduyla yarışır hacimde |

---

## 3. Eksen bazlı değerlendirme

### 3.1 Ürün kapsamı ve değer önerisi — **7,5 / 10**

**Güçlü:** Kapsam gerçekten geniş ve birbirine bağlı: keşif haritası, iz kaydı → rota taslağı,
yayınlanan rota paylaşımı, sosyal akış + 24 saatlik hikâye, grup/sohbet, arkadaşlık, moderasyon
(rapor/ban/uyarı/temyiz), çevrimdışı saha paketi, sesli rehber + site turları, yükseklik profili,
hava durumu, tarihî envanter (Overpass + Wikidata/Wikipedia), PWA kurulumu, misafir modu.
Landing'de "reklam ve takip pikseli yok", "konum yalnız onayınla" gibi **abartısız** güven
maddeleri var; sosyal kanıt olarak uydurma sayaç değil **doğrulanmış katalog sayısı** (28 nokta,
4 tur) gösteriliyor. Bu, erken aşama ürünlerde nadir görülen bir dürüstlük.

**Zayıf:** Özellik yüzeyi, tek bir "çekirdek döngü"nün etrafında sıkışmıyor — harita, sosyal,
grup sohbeti, rota, rehber ve asistan aynı anda birinci sınıf. Retansiyonun hangi döngüye
yaslandığı (keşif mi, sosyal mi, rota mı) ürün metninde net değil; bu, sınırlı bir ekiple
bakım maliyetini dağıtır. Tek dil (Türkçe) olması "dünyayı keşfet" konumlandırmasıyla gerilim
yaratıyor (B-06).

### 3.2 Mimari ve kod kalitesi — **7,0 / 10**

**Güçlü:** Katmanlama disiplinli — `firebase/firestore` yalnız **12 `lib/` modülünde** import
ediliyor, bileşenler SDK'yı doğrudan görmüyor. `App.tsx` **88 satırlık bir kapı** (depo belgeleri hâlâ "58 satır" diyor — B-12'ye taze bir örnek);
Firebase SDK'sı ve harita `import()` ile erteleniyor (`config/lazyLoading.test.ts` bunu kilitliyor).
`strict`, `noUnusedLocals`, `noUnusedParameters` açık; `as any` / `@ts-ignore` / `@ts-expect-error`
/ `eslint-disable` **policyGate testiyle yasak** — bu, "insan dikkatine bırakılmayan" bir kural
olarak kodlanmış ve gerçekten ihlal taraması yapıyor. Yaygın kullanılan bir "NEDEN BÖYLE"
başlık yorumu var; bu, agent/insan devir tesliminde ölçülebilir bir kazanç.

**Zayıf — en büyük tek teknik borç:** `src/components/Explorer.tsx` **1.796 satır**, tek
bileşende **29 `useState` + 28 `useEffect` + 34 `useCallback`/`useMemo`** ve 1.691 dolu satır.
Bu dosya aynı anda harita yerleşimi, panel orkestrasyonu, moderasyon abonelikleri, bildirimler,
misafir niyeti, rota önizleme, paylaşım linki ve toast yönetimini taşıyor. Yeni bir özellik
eklemek fiilen bu dosyaya dokunmak demek; regresyon yüzeyi ve merge çakışması maliyeti yüksek.
Durum yönetimi için kütüphane yok, prop-drilling ile idare ediliyor; bu ölçekte bu tercih
sürdürülebilir değil.

### 3.3 Test ve kalite güvencesi — **9,0 / 10**

**Güçlü:** Bu deponun en güçlü ekseni. 1.346 test 95 saniyede koşuyor ve **hepsi bu makinede
yeşil**. Test türleri ayrışmış: saf birim, "IO" testleri (sahte Firestore ile gerçekçi hata
kodları), jsdom + `axe-core` erişilebilirlik testleri, dosya okuyup **politikayı denetleyen kapı
testleri** (`policyGate`, `lintConfig`, `githubActions` pin testi, `repositoryHygiene`,
`socialProofT20` gibi içerik↔kod eşleşmesi testleri), son olarak gerçek Chromium E2E.
Ayrıca kurallar için 130 emülatör testi var (CI'da Java 21 ile). Sunucu tarafı güvenlik
davranışının test edilmesi, bu ölçekteki projelerde nadirdir.

**Zayıf:** (i) Satır kapsamı ölçülmüyor — `@vitest/coverage-*` yok, "neyi test etmiyoruz"
sorusunun sayısal yanıtı yok. (ii) Dosya düzeyinde kapsam %78; `Explorer` gibi en riskli dosya
yalnız dolaylı kapsanıyor. (iii) E2E **1 spec / 5 senaryo** ve harita/Firestore taklit edilmiş;
kayıt → gönderi → moderasyon gibi kritik yollar tarayıcıda uçtan uca yok. (iv) Kapı testlerinin
bir kısmı *davranışı* değil *metni* kilitliyor (ör. dosyada yasak dize aramak); bunlar değerli
ama yeşil test sayısını şişiriyor, kapsamı olduğundan geniş gösterebilir.

### 3.4 Güvenlik — **8,5 / 10**

**Güçlü:** Politika seviyesi olarak referans kalitesinde:
- **CSP** sert: `script-src 'self'` + açık allowlist, `script-src-attr 'none'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`. Satır içi betik yasağı yüzünden tema bile
  `/theme-boot.js` dosyasına taşınmış — kuralın gerçekten uygulandığının kanıtı.
- HSTS (`includeSubDomains`, `preload` gerekçeli olarak yok), COOP, CORP, `Permissions-Policy`,
  `X-Content-Type-Options`, `X-Frame-Options: DENY`, önizleme dağıtımlarına `noindex`.
- Firestore kuralları: **deny-all varsayılan**, `boundedList(n)` ile **sorgu limiti kuralda
  zorlanıyor** (kota koruması), şekil doğrulama fonksiyonları, beğenide tek-eleman ekleme/çıkarma
  kilidi, ban yaptırımı **sunucuda** (askıdaki hesap yazamaz), `moderators/{uid}` istemciden
  yazılamaz, ban yalnız "işlem yapıldı" işaretli rapor kanıtıyla doğar.
- Storage kuralları **tamamen kapalı**; para harcatan servis yok (Spark $0 hedefi kod ve testle korunuyor).
- App Check yalnız harita/Firestore gerektiğinde başlatılıyor; debug token üretim build'inde
  kapı tarafından reddediliyor. Üretimde 0 bilinen açık.

**Zayıf:** (i) **Sunucu yok** — kötüye kullanım hızı (spam create) yalnız kural şekliyle
sınırlanıyor, **frekans sınırı yok**; kural sayaç tutamaz, Cloud Functions/Worker cron da yok.
(ii) Moderasyon operasyonel olarak **tek kişilik**: moderatör belgesi Firebase Console'dan elle
açılıyor. Bu, üretimde tek nokta arızası. (iii) CSP allowlist'i 20+ dış alan adı içeriyor;
güvenlik yüzeyi genişledikçe bakımı zorlaşıyor. (iv) `storage.rules` kapalı olduğu için fotoğraf
**base64 olarak Firestore dokümanında** — bu güvenlik değil ama veri modeli borcu (B-02).

### 3.5 Performans — **7,5 / 10**

**Güçlü:** Kabuk bölünmesi gerçekten çalışıyor: landing'de Firebase ve MapLibre **yok**;
ilk boya ölçümüm **≈124 KB gzip** (JS 98,7 + CSS 25,4), yani bütçenin altında. Toplam JS
985 KB gzip ve bu 1.003 KB'lik bütçenin %98'i — yani bütçe **ölçüme göre** bağlanmış, keyfî değil.
`verify:sw-shell` 63/63 varlığı doğruluyor, SW'de karo önbelleği 500 öğe / 100 MB / 7 gün
tavanlarıyla sınırlı, LRU kırpması var. Görsel hattı 25 MB'ı **decode etmeden** reddediyor,
kademeli küçültme planı var.

**Zayıf:** (i) Uygulama kabuğu **~580 KB gzip**; içinde 286 KB'lik MapLibre var. Harita
kaçınılmaz, ama orta seviye mobil cihazda ilk etkileşim maliyeti hissedilir. (ii) **Gerçek CWV
ölçümü yok** — Lighthouse/alan verisi (CrUX) yok, "hızlı mı" sorusu yalnız bayt bütçesiyle
yanıtlanıyor. (iii) Yazı tipleri Google Fonts'tan geliyor: ek DNS/TLS turu + gizlilik yükü. (iv)
CSS bütçesinde **500 bayt** marj kaldı — bir sonraki bileşen işi bütçeyi kıracak; eşiğin yine
gerekçeli güncellenmesi gerekecek.

### 3.6 Erişilebilirlik — **8,0 / 10**

**Güçlü:** 236 `aria-*` özniteliği, 98 `role`, 29 yerde `axe-core`; jsdom'da otomatik `axe`
denetimi kritik bileşenlerde (ConfirmDialog, PlaceDetails, formlar) var. Semantik: tek `H1`,
skip-link (`İçeriğe geç`), `:focus-visible` tek merkezden, `role="alertdialog"` + LIFO odak/`Escape`
yığını (`usePanelAccess`), `prefers-reduced-motion` hem CSS hem JS'te, kullanıcıya açık
**erişilebilirlik tercih paneli** (hareket azaltma, yüksek kontrast, büyük metin). Kontrast
eşikleri testle kilitlenmiş (`landingContrast.test.ts`). `confirm()` çağrıları erişilebilir
diyaloğa çevrilmiş.

**Zayıf:** Doğrulamanın tamamı **jsdom + statik analiz** düzeyinde; gerçek ekran okuyucu
(NVDA/VoiceOver), gerçek klavye turu ve gerçek cihaz testi **yapılmamış** (depo da bunu açıkça
"doğrulanamadı" olarak işaretliyor). Harita etkileşimi doğası gereği karmaşık; pin'lerde
`tabIndex` + `aria-label` var ama "haritayı klavyeyle keşfetme" akışının bütünlüğü ölçülmemiş.

### 3.7 Ölçeklenebilirlik ve veri modeli — **5,5 / 10** — *en zayıf eksen*

**Güçlü:** Sayfalama gerçek: cursor + `startAfter` + viewport sorguları, sabit "toplam içerik
tavanı" yok; kurallarda `boundedList(n)` ile kota koruması; sahip-pin bileşik indeksi betikle
yönetiliyor; yedek/geri yükleme/temizlik CLI'ları **test edilmiş** (dry-run varsayılan,
`--max-writes` Spark kotası tavanı, SHA-256 manifest doğrulaması). Bu, çoğu ücretsiz-katman
projesinde olmayan bir operasyonel olgunluk.

**Zayıf — üç yapısal duvar:**
1. **Fotoğraflar doküman içinde base64** (kural tavanı 180.000 karakter, hedef ~100.000
   ≈ 73 KB). 1 MiB doküman sınırına yakın, CDN/ölçeklendirme yok, her akış okuması bant
   genişliği yakıyor. Spark'ın aylık bant genişliği sınırı, büyümeyle birlikte **ilk duvar**.
   `ROADMAP §8 (b)` bu kararı hâlâ "açık" tutuyor.
2. **Beğeni `likedBy` dizisi dokümanda, tavan 500.** Tek doküman üzerinde eşzamanlı yazma
   çakışması (hot post) ve 500'de **işlevsel tavan** (beğeni sessizce duracak).
3. **Sunucu tarafı yok**: zamanlanmış temizlik **istemci tetiklemeli** (story purge uygulama
   açıkken), moderasyon otomasyonu, oran sınırı, arama indeksi, e-posta/bildirim yok.
   Ölçek büyüdüğünde ilk eklenecek şey Cloud Functions/Worker olacak ve bu, mimariye
   sonradan girecek bir katman.

### 3.8 Dokümantasyon ve bilgi yönetimi — **8,0 / 10**

**Güçlü:** 115 markdown / 13,3 bin satır; `AGENTS.md` (agent sözleşmesi), `ROADMAP` (karar
bekleyenler + antipattern listesi!), `CHANGELOG` (her sürümde ölçüm ve kök neden), `docs/denetim/`
altında **iddia envanteri** (her "bitti/yeşil" iddiası için commit/test/CI kanıtı aranmış,
kanıtsızlar "kanıtsız" yazılmış). Bu, bir deponun kendine karşı dürüstlüğünün en somut örneği.
Kararların **neden**'i yazılı (ör. `preload`'un neden olmadığı, HSTS'in neden `includeSubDomains`
olduğu).

**Zayıf:** Hacim kendi başına bir bakım yükü; bazı raporlardaki sayılar bayat
(`docs/mvp-denetimi-2026-10-27.md` "152 dosya / 1.233 test" diyor; bugünkü ölçüm **176 / 1.346**).
Dokümanın koda bağlanması kısmen otomatik (bazı testler sayıları kilitliyor) ama **tam değil**;
tarihli raporların "güncel durum" gibi okunma riski var.

### 3.9 CI/CD ve geliştirici deneyimi — **8,5 / 10**

**Güçlü:** Tek komut (`npm run check`) tip, lint, test, betik testleri, kural emülatörü, build,
sosyal meta veri ve denetim kapılarını sırayla koşuyor — ve **hızlı** (toplam ~3 dk CI).
Action'lar SHA'ya sabit ve **pin testiyle** korunuyor. Emülatör JAR'ı SHA-256 ile doğrulanıyor.
Kural testi düştüğünde logu check-run annotation'ına taşıyan özel adım var (API'den okunabilir
kırmızı). Kaynak haritalar `dist` dışına taşınıp artifact olarak saklanıyor — üretimde
sızdırılmıyor. Bütçe ihlalleri CI annotation'ı olarak basılıyor.

**Zayıf:** Dağıtım hattı (Cloudflare Pages) repo dışında; deploy'un geri alınması/rollback
prosedürü kodda değil, dokümanda. Canlı doğrulama haftalık cron'a bağlı — anlık regresyonu değil,
gecikmeli sapmayı yakalıyor. Node sürüm uyumsuzluğu (B-07) CI'yı **bugün** kırmıyor ama
kırılgan.

### 3.10 UX, arayüz ve PWA — **8,0 / 10**

**Güçlü:** Tasarım sistemi token'lı (`index.css` `@theme`), koyu tema siyah / açık tema gerçek
beyaz; `safe-area-inset` `index.css`'te 17, bileşenlerde 13 yerde, `dvh` kullanımı yaygın — çentikli mobilde doğru davranış.
PWA: `manifest` + maskable ikon + kısayollar, SW güncelleme bildirimi (`UpdateNotice`),
çevrimdışı paket indirme, `NetworkStatus` ile captive-portal farkındalığı, "İlk ziyarette
habersiz yenileme" hatası E2E ile yakalanıp düzeltilmiş — bu, gerçek kullanıcı acısının
teste dönüşmüş hâli. Çerez bandı rıza katmanlı (zorunlu / anonim ölçüm / Clarity ayrı),
KVKK aydınlatma modalı var, taslak künye uyarısı dürüstçe gösteriliyor.

**Zayıf:** (i) **"Atlas AI" adı ile yetenek arasındaki mesafe** (B-05): arka planda model yok,
yerel sezgisel planlayıcı var; arayüzde "Haritadaki bağlamı okuyorum…" gibi adımlar gösteriliyor.
Ürün metni başka yerlerde çok dürüstken burada beklenti yönetimi riskli. (ii) Tek dil.
(iii) Tek ekranda panel üstüne panel açılabiliyor; mobilde geri tuzağı `useMobileBackClose` ile
çözülmüş ama bilgi mimarisi kalabalık (48 bileşen, 8+ panel türü).

---

## 4. Bulgu listesi (öncelik sırasıyla)

Öncelik: **Y** yüksek · **O** orta · **D** düşük · **B** bilgi.

| # | Bulgu | Ön. | Kanıt (bu kesitte ölçüldü) | Etki | Öneri |
|---|---|---|---|---|---|
| B-01 | `Explorer.tsx` tanrı-bileşen | **Y** | 1.796 satır, 29 `useState`, 28 `useEffect` | Her özellik aynı dosyaya dokunuyor; regresyon + çakışma | Panel orkestrasyonunu `useExplorer*` hook'larına, moderasyon/bildirim aboneliklerini kendi context'ine ayır |
| B-02 | Fotoğraf = dokümanda base64 | **Y** | `image.ts` 180k/100k char, `firestore.rules:136` | 1 MiB sınırı, bant genişliği, CDN yok, ölçek duvarı | Obje depolamaya geç (URL tut), göç planı + okuma uyumluluğu |
| B-03 | `likedBy` dizi tavanı 500 | **Y** | `firestore.rules:211-238` | Hot-post yazma çakışması, 500'de beğeni durur | Alt koleksiyon veya dağıtık sayaç; tavanı ürün kararı olarak belgele |
| B-04 | Sunucusuz mimari: frekans sınırı/otomasyon yok | **O** | Cloud Functions yok; kuralda sayaç yok; story temizliği istemcide | Spam ve kota kötüye kullanımı; operasyonel işler istemciye bağlı | Worker cron (Cloudflare zaten var) + şüpheli yazma için kural penceresi |
| B-05 | "Atlas AI" adı, LLM yok | **O** | `AtlasAssistant.tsx` yalnız `routePlanner/placeAdvice`; LLM çağrısı yok | Beklenti uyuşmazlığı, güven erozyonu riski | Adı "Atlas Asistan (yerel öneri)" yap **veya** gerçek model ekle; adım metinlerini "hesaplıyorum" yap |
| B-06 | i18n yok, tek dil | **O** | `i18n/react-intl/useTranslation` araması 0 sonuç; tüm metin JSX içinde | Ürün konumlandırması dünya ölçeği, gerçekleşen tek pazar TR | Metinleri sözlüğe taşı (ilk adım), `lang`/hreflang altyapısı zaten var |
| B-07 | Node sürüm uyumsuzluğu | **O** | `@firebase/app@0.16.4` `engines: >=24.12.0`; repo `^22.13 || >=24`; `npm ci` 8+ `EBADENGINE` | Sessiz kırılganlık: bir sonraki firebase sürümünde gerçek hata | `engines` ve CI'ı 24'e çek **veya** firebase'i sabitle |
| B-08 | Üretimde görünürlük yok | **O** | `VITE_TELEMETRY_ENDPOINT` boş → ağ isteği yok; Clarity rıza ile | Hata/CWV/regresyon körlüğü; tek sinyal kullanıcı şikâyeti | Worker'ı deploy et, hata + CWV olaylarını aç (rıza metni hazır) |
| B-09 | Dev bağımlılıklarında 12 moderate | **D** | `npm audit` → 12 moderate (`minimatch`) | Geliştirici makinesi/CI tedarik zinciri (üretim paketi temiz) | `minimatch` override veya üst sürüme geçiş |
| B-10 | E2E kapsamı ince | **D** | 1 spec / 5 senaryo, harita+Firestore taklit | Kritik akışlar (kayıt→gönderi→moderasyon) tarayıcıda doğrulanmıyor | 3 kritik akışı emülatörle E2E'ye ekle |
| B-11 | Satır kapsamı ölçülmüyor | **D** | coverage paketi yok, `%78` yalnız dosya düzeyi | "Neyi test etmiyoruz" görünmez | `@vitest/coverage-v8` + eşik (ör. %70) |
| B-12 | Doküman sayılarında kayma | **D** | mvp-denetimi 152/1.233 ↔ bugün 176/1.346 | Güvenilirlik erozyonu | Tarihli raporlara "dondurulmuş kesit" etiketi; canlı sayıyı tek dosyada tut |
| B-13 | Dış servis bağımlılığı (8+ host) | **D** | CSP `connect-src` allowlist; Overpass/Photon/Wikipedia/Open-Meteo/OpenFreeMap | Dış kesinti = özellik kaybı; CSP bakım yükü | Her servis için zarif bozulma testi + tek "kapalı" yol |
| B-14 | Google Fonts harici | **B** | `index.html`/CSP `fonts.googleapis.com` | Ek RTT + gizlilik | Fontları self-host et (CSP de daralır) |

---

## 5. Puanlama

| Eksen | Ağırlık | Puan | Katkı |
|---|---|---|---|
| Ürün kapsamı ve değer önerisi | %10 | 7,5 | 0,75 |
| Mimari ve kod kalitesi | %15 | 7,0 | 1,05 |
| Test ve kalite güvencesi | %15 | 9,0 | 1,35 |
| Güvenlik | %15 | 8,5 | 1,28 |
| Performans | %10 | 7,5 | 0,75 |
| Erişilebilirlik | %8 | 8,0 | 0,64 |
| Ölçeklenebilirlik ve veri modeli | %12 | 5,5 | 0,66 |
| Dokümantasyon | %5 | 8,0 | 0,40 |
| CI/CD ve DX | %5 | 8,5 | 0,43 |
| UX / PWA | %5 | 8,0 | 0,40 |
| **TOPLAM** | **%100** | — | **7,71 → 7,7 / 10** |

**Tek cümlelik hüküm:** *Mühendislik disiplini ve dürüstlük açısından Türkiye'deki bağımsız
web ürünlerinin çok üstünde (test, CI, CSP, kurallar, dokümantasyon); tavanını belirleyen şey
kod kalitesi değil, **tek-dosyalık orkestrasyon** ve **sunucusuz/ücretsiz-katman veri modeli**
— yani ürünün ölçek ve altyapı kararları.*

---

## 6. Ne yapılırsa 8,5+ olur (etki/efor sırasına göre)

1. **Explorer'ı böl** (B-01) — 2-3 gün. En yüksek getirili tek iş: sonraki her özelliğin
   maliyetini düşürür. Kabul kriteri: dosya < 400 satır, davranış değişmeden 1.346 test yeşil.
2. **Fotoğraf depolamayı ayır** (B-02/B-03) — 3-5 gün + göç. Ücretsiz katman kararı verilecekse
   en azından "URL + harici obje depolama" iskeletini kur, okuma uyumluluğunu koru.
3. **Üretim görünürlüğü** (B-08) — 1 gün. Var olan Worker'ı deploy et, hata + CWV olaylarını aç.
   Ölçülemeyen iyileştirme, iyileştirme değildir.
4. **Atlas AI konumlandırması** (B-05) — 2 saat. Adı veya vaadi düzelt; ürünün geri kalanındaki
   dürüstlük çizgisiyle hizala.
5. **Node sürüm hizalaması** (B-07) — 1 saat. `engines` + CI matrisi.
6. **Kapsam ölçümü + 3 kritik E2E** (B-11/B-10) — 1-2 gün.
7. **Dil hazırlığı** (B-06) — 2-3 gün (metinleri sözlüğe taşı, dil değiştirme UI'ı olmadan).

Bu yedi madde tamamlandığında beklenen skor: **8,6 – 8,8**.

---

## 7. Bu turda doğrulayamadıklarım (dürüst sınırlar)

- **Firestore Rules emülatör testleri**: bu makinede Java yok → 130 kural testi **koşmadı**.
  CI'da koştuğu görülüyor (`rules-windows` + `ci` işleri `success`), ama bu kesitte bağımsız
  çalıştıramadım.
- **Gerçek tarayıcı ölçümü**: Lighthouse/CWV, gerçek mobil cihaz, gerçek ekran okuyucu,
  iki cihaz senkronu, uçak modu — bu ortamda tarayıcı yok.
- **Canlı ortam**: Firebase Console (kuralların dağıtılmış sürümü, App Check durumu), Cloudflare
  Pages paneli (ortam değişkenleri), alan adı/DNS, gerçek kullanıcı verisi.
- **Playwright E2E**: Chromium bu makinede kurulu değil; CI'daki yeşil sonuca bakıldı.
- **Git derinliği**: klon sığ (`depth 1`) → commit geçmişi/PR istatistikleri analiz edilmedi.

---

## 8. Kısa özet (yönetim için)

- Kapıların hepsi bu makinede **yeşil**; 1.346 test 95 saniyede geçiyor; üretimde bilinen açık yok.
- Ürün **gerçek**: 48 bileşen, 30,9 bin satır uygulama kodu, PWA + çevrimdışı + moderasyon +
  sosyal + rota motoru; landing'de Firebase yüklemeden 124 KB gzip ile açılıyor.
- En büyük iki risk **kod kalitesi değil**: (1) tek dosyada toplanmış orkestrasyon,
  (2) fotoğraf/beğeni/sunucu tarafındaki ücretsiz-katman kararları.
- Puan: **7,7 / 10**. Ağırlıklı en güçlü eksen test+güvenlik, en zayıf eksen ölçeklenebilirlik.

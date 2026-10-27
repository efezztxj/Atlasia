# Atlasia — MVP'den Çıkış Planı

**Tarih:** 27 Ekim 2026 · **Kesit:** `main` = `5283efe` (PR #111) · **Kapsam:** kod, altyapı, içerik, hukuk, operasyon
**Yöntem:** Bu belgedeki her sayı bu turda depoda **ölçüldü**; tahmin olanlar "≈" ile işaretli, ölçülemeyenler (Firebase Console, gerçek cihaz) ayrıca "kanıt bekliyor" olarak yazıldı.

---

## 0. Yönetici özeti — tek paragraf

Atlasia'nın **mühendislik kalitesi MVP'nin çok üstünde** (46.442 satır, 142 kaynak dosya, 136 test dosyası / 1.033 test, 1.326 satır Firestore kuralı, CI'da tip+lint+test+build+bütçe+rules emülatörü). Buna karşılık ürünü **"profesyonel bir site"** yapan şey kod değil; **hukuk, ölçülebilirlik, veri mimarisi ve saha kanıtı**. Bugün üçü de eksik: yasal metinlerde `[TARİH] [AD SOYAD] [E-POSTA] [ŞEHİR]` duruyor, üretimde **hiç hata izleme ve hiç analitik yok**, fotoğraflar Firestore belgesinin içinde base64 olarak duruyor (180.000 karakter sınırı). Bu üçü kapanmadan site "çalışan bir demo"; kapandığında "işletilebilir bir ürün" olur.

**İlerleme (2026-10-27):** P0-2 ve P0-3 **kodda tamam** — `src/lib/telemetry.ts`, `src/lib/analytics.ts`, `src/lib/telemetryBootstrap.ts` + çerez bandında anonim ölçüm opt-in'i (`saveCookieConsent`). Aktif olması için tek adım: Cloudflare'de `VITE_TELEMETRY_ENDPOINT`. Ayrıntı: `docs/olcum-ve-hata-izleme.md`.

**Karar:** MVP'den çıkış ≈ **4 hafta** (P0: 9-12 iş günü, P1: 11-14 iş günü) + **4 haftalık davetli pilot**. Aşağıdaki **G1–G6 kapıları** yeşil olmadan genel açılış yok.

---

## 1. Bugünkü durum — ölçülen gerçekler

### 1.1 Depo ve kapılar

| Ölçüm | Değer | Komut |
|---|---|---|
| Kaynak dosya (`src`, test hariç) | 142 | — |
| Toplam kaynak satırı | 46.442 | `find src -name "*.ts*" \| xargs wc -l` |
| Test dosyası | 136 (vitest) · **1.033 test** | `npm run test:run` |
| Kardeş testi olmayan kaynak dosya | **42** (27'si bileşen) | bkz. §3 P1-3 |
| Firestore kuralı | 1.326 satır · 35 `match` bloğu | `wc -l firestore.rules` |
| Tip / lint | 0 hata, 0 uyarı | `npx tsc --noEmit` · `npx eslint . --max-warnings=0` |
| Üretim JS (tüm parçalar, gzip) | **894.967 B** (bütçe 908.000 → pay **%1,4**) | `npm run build` |
| Üretim CSS (gzip) | 24.437 + 10.518 B | — |
| **Açılış sayfası ilk yük** | **375 kB gzip JS** + 35 kB CSS + 170 kB görsel | §1.2 |
| Public varlık | 22 MB depo, 300 KB görsel, 408 KB ikon | `du -sh public/*` |

### 1.2 Performans — gerçek sayılar

`dist/index.html` yalnız `index-*.js` yüklüyor; o da şunları **zorunlu** çekiyor:

| Parça | gzip |
|---|---|
| `index-*.js` (uygulama + açılış sayfası) | 159,9 kB |
| `firebase-vendor` | 145,8 kB |
| `react-vendor` | 58,9 kB |
| `icons-vendor` | 10,2 kB |
| CSS (`index` + `map-vendor`) | 35,0 kB |
| `images/atlasia-earth-hero.jpg` (LCP adayı) | 170,6 kB |

→ **Açılış sayfası bile Firebase'i indiriyor** (App.tsx statik zinciri). Uygulama ekranına girince `maplibre` (242,9 kB) + worker (128,7 kB) ekleniyor. Mobil 4G'de ilk anlamlı boyama için ≈ 600 kB indirme; yavaş 3G'de 4-6 sn. **Profesyonel eşik: açılış sayfası < 200 kB gzip, LCP < 2,5 sn.**

### 1.3 Veri mimarisi — en kritik teknik bulgu

Fotoğraflar **Firestore belgesinin içinde base64 data URL** olarak duruyor:

- `src/utils/image.ts:1` → `MAX_CLOUD_PHOTO_CHARS = 180_000`
- `firestore.rules:136` → `data.photo.size() <= 180000` (gönderi, iz, rota, hikâye)
- `storage.rules` → Storage **tamamen kapalı** (`allow read, write: if false`)

Sonuçları:

| Etki | Ölçü |
|---|---|
| Akış yüklemesi | 50 gönderi (`postsPage: 50`) dolarsa **≈ 9 MB** indirme (10'unda foto olsa bile ≈ 1,8 MB) |
| Firestore belge sınırı | 1 MiB; 180 KB'lık 5 foto bir belgeye sığmaz, çoklu foto **teknik olarak imkânsız** |
| Görsel kalite | Yeniden boyutlandırma/CDN yok; her cihaz kendi ürettiği JPEG'i görüyor |
| Maliyet eğrisi | Okuma sayısı belge başına; gigabayt **bant genişliği** doğrudan kullanıcıya yansıyor (Spark: 10 GiB/ay) |
| Çoklu foto (AY-07) | Karar bekliyor; mevcut modelle açılamaz |

**Bu, MVP için kabul edilebilir bir "hızlı çözüm"dü; profesyonel ürün için değil.**

### 1.4 Ürün yüzeyi (kodda gerçekten var)

Harita (MapLibre + 3 altlık), arama, iz bırakma, rota editörü + yükseklik profili, hava katmanı, sesli rehber (yakınlık tetiklemeli), gönderi/hikâye/yanıt, arkadaşlık + grup sohbeti + davet linkleri, bildirim paneli, moderasyon (rapor → inceleme kuyruğu → yaptırım **sunucu tarafında**), hesap dışa aktarma/silme, çevrimdışı paket indirme, PWA kurulumu, KVKK çerez onayı, iki tema.

### 1.5 İçerik hacmi — asıl darboğaz

| Varlık | Sayı |
|---|---|
| Rehber yer (elle seçilmiş, çoğu Türkiye stock fotoğraflı) | **28** |
| Site turu (Efes, Priene, Pompeii, Ostia) | **4** |
| `isRealPath` | Her turda **`false`** (doğrulanmış yürüme geometrisi yok) |
| Pilot bölge kararı | **Verilmedi** |

Bir **topluluk** uygulaması için 28 nokta = boş dünya. Topluluk yoğunlukla yaşar: 500 kişi tek bölgede işe yarar, dünyada işe yaramaz.

### 1.6 Operasyon ve güvenlik — kanıt durumu

| Kalem | Durum |
|---|---|
| CSP + HSTS + `X-Frame-Options: DENY` + `Permissions-Policy` | ✅ Var (`public/_headers`) |
| App Check entegrasyonu | ✅ Kodda · **`Enforce` açık mı? kanıt yok** |
| Firestore kuralları canlı sürümü | ❓ Emülatörde test ediliyor, Console'daki yayın **doğrulanmadı** |
| Moderatör ataması | Console'dan `moderators/{uid}` — **yazılı prosedür var** (`docs/moderasyon-akisi.md`) |
| Hata izleme (Sentry vb.) | ❌ **Yok** — `AppErrorBoundary` yalnız `console.error` |
| Ürün analitiği | ❌ **Yok** — çerez onayı "analytics" alanı hazır ama toplayıcı yok |
| Site hızı/Lighthouse kapısı | ❌ Yok (yalnız paket bütçesi) |
| E2E / tarayıcı testi | ❌ Yok (Playwright kurulu değil) |
| Yedekleme | ✅ Betik var (`scripts/firestore-backup.mjs`) · **otomatik zamanlanmış değil** |
| Özel alan adı | ❌ `atlasia.pages.dev` |
| `sitemap.xml` / JSON-LD | ❌ Yok (OG/Twitter kartları ✅) |
| Çok dilli | ❌ Yalnız `lang="tr"` (profesyonel lansman için **şart değil**, pilot için doğru karar) |
| Açık bağımlılık PR'ı | **6** (firebase 13, maplibre 6.15, react, tooling) — CI kırmızıysa borç büyüyor |

---

## 2. Olgunluk karnesi

| Boyut | Puan (5) | Gerekçe |
|---|---|---|
| Kod kalitesi & test | **4,5** | Tip/lint/test/bütçe kapıları yeşil, `lib/` katmanı örnek düzeyde test edilmiş |
| Güvenlik | **4,0** | CSP, App Check, 1.326 satır kural, engelleme/askı; eksi: `Enforce` kanıtı, dağıtım kanıtı |
| Erişilebilirlik | **3,5** | 161 `aria-label`, odak tuzağı, kontrast testleri; eksi: otomatik `axe` kapısı yok, ekran okuyucu turu yok |
| Performans | **2,5** | 375 kB açılış, harici font, tek JPEG hero, Firebase açılışta yükleniyor |
| Veri mimarisi / ölçek | **2,0** | Fotoğraf = belge içi base64; Storage kapalı; Spark kotası |
| Güven & hukuk | **1,5** | Yasal metinler **taslak**, künye boş, moderasyon SLA'sı tanımsız |
| Ölçülebilirlik / operasyon | **1,0** | Hata izleme yok, analitik yok, otomatik yedek yok, olay prosedürü yalnız dokümanda |
| İçerik derinliği | **1,5** | 28 nokta, stock fotoğraf, pilot bölge seçilmemiş |

**Ortalama ≈ 2,6/5 → "iyi bir beta", "profesyonel ürün" değil.**

---

## 3. P0 — Genel açılıştan önce kapatılması zorunlu (blokaj)

> Bunlardan biri açıkken site yayına alınabilir ama **profesyonel sayılmaz**; hukuki risk veya itibar riski taşır.

| ID | Sorun (kanıt) | Yapılacak | Kabul kriteri | Emek |
|---|---|---|---|---|
| **P0-1** | `src/content/legal.ts:20-21` → `"Taslak · Künye ve avukat onayı bekliyor"`, `[TARİH] [AD SOYAD / UNVAN] [E-POSTA] [ŞEHİR]` **17 yerde** | Gerçek veri sorumlusu, iletişim, şehir, sürüm tarihi; KVKK aydınlatma + açık rıza + kullanım koşulları avukat onayı | Canlıda `[` karakteri içeren yasal metin **yok**; `LEGAL_PLACEHOLDERS` boş dizi; test bunu kilitler | 2-3 iş günü (avukat dahil) |
| **P0-2** ✅ *kod tamam* | Üretimde hata görünürlüğü yok: `AppErrorBoundary.componentDidCatch` yalnız `console.error` | Hata izleme (Sentry/GlitchTip benzeri, KVKK uyumlu: PII kapalı) + kaynak haritası yükleme | Bilerek atılan hata panele **30 sn içinde** düşüyor; kullanıcı kimliği/konum gönderilmiyor | 1 iş günü |
| **P0-3** ✅ *kod tamam* | Analitik yok → pilot KPI'ları (AY-18) ölçülemez | Çerezsiz/izinli hafif analitik (sayfa görüntüleme, kayıt, iz→yayın, çökme) | 6 temel olay panelde görünüyor; çerez onayı "hayır" diyende **hiçbir istek gitmiyor** | 1-1,5 iş günü |
| **P0-4** | Fotoğraf mimarisi: belge içi base64, 180 KB sınır, Storage kapalı | **Karar:** (a) Storage'ı aç (Blaze gerekir) veya (b) sıkılaştır: 60-80 KB hedef, sunucu tarafı yeniden sıkıştırma yok, ileride CDN | (a) seçilirse: yükleme → URL → `<img srcset>`; (b) seçilirse: akış sayfası indirmesi **< 800 kB** | 3-5 iş günü |
| **P0-5** | Canlı yapılandırma kanıtı yok: Rules sürümü, indeksler, App Check `Enforce`, `atlasia-dev` projesi üretim olarak kullanılıyor | Console teyidi + `ATLASIA_URETIM_PROJESI` + `ATLASIA_PROD_ENV_POLICY=enforce` + `npm run dogrula:canli` haftalık | `dogrula:canli` yeşil; Rules yayın zaman damgası kayda geçti; App Check Enforce açık | 0,5 iş günü (senin panel işin) |
| **P0-6** | Cihaz kanıtı yok: iOS Safari + Android Chrome matrisi boş (TASK-016) | Gerçek cihazda 8 senaryo: giriş, konum, iz→yayın, çevrimdışı, harita, tema, hesap silme, PWA kurulumu | Her satırda SHA + tarih + tarayıcı + sonuç | 1-2 iş günü |
| **P0-7** | Moderasyon operasyonu tanımsız: kuyruk var, **SLA ve nöbetçi yok** | Yanıt süresi (örn. 24 saat), itiraz yolu, aylık denetim; rapor bildirimi uygulama içi olduğu için **e-posta yok** (sunucu yok) | 3 raporluk deneme turu uçtan uca tamamlandı; süreler kayıtlı | 0,5 iş günü + süreklilik |

**P0 toplamı ≈ 9-12 iş günü.** (P0-4 kararı vermezsen bu süre 5 gün artar.)

---

## 4. P1 — "Profesyonel" eşiği (2 hafta içinde)

| ID | Sorun | Yapılacak | Kabul kriteri | Emek |
|---|---|---|---|---|
| **P1-1** | Açılış sayfası 375 kB gzip JS (Firebase dahil), LCP adayı 170 kB tek JPEG, Google Fonts harici | (a) Landing'i ayrı entry yap (Firebase'i yalnız uygulama rotasında yükle), (b) fontları **self-host** + `font-display: swap`, (c) hero → AVIF/WebP + `srcset`, (d) kritik CSS inline | Açılışta **< 200 kB gzip**; Lighthouse mobil performans **≥ 85**, LCP **< 2,5 sn** | 3-4 iş günü |
| **P1-2** | Bütçe payı %1,4; görsel/Lighthouse kapısı yok | Bütçeyi *düşür* (hedef JS 820 kB) + CI'a Lighthouse CI (mobil, 3G) | Bütçe + Lighthouse PR'da zorunlu; regresyonda kırmızı | 1 iş günü |
| **P1-3** | 42 kaynak dosyanın kardeş testi yok; **hiç E2E yok** (K-11'in kökü) | Playwright ile 5 smoke: açılış → giriş → harita → iz bırak → çıkış; ayrıca en riskli 6 bileşene davranış testi | PR'da E2E zorunlu; 5 senaryo 3 tarayıcıda yeşil | 3 iş günü |
| **P1-4** | Erişilebilirlik otomatik kapı yok (`axe` yok) | `@axe-core/playwright` + jsdom `vitest-axe`; iki tema ve 390×844 | Kritik/önemli ihlal **0**; manuel NVDA/VoiceOver turu kayıtlı | 1,5 iş günü |
| **P1-5** | Bağımlılık borcu: 6 açık PR (firebase 13, maplibre 6.15, react, tooling) | Sırayla: tooling → react → firebase → maplibre; her biri ayrı PR + tam kapı | Açık bağımlılık PR'ı 0; `npm audit` temiz | 2 iş günü |
| **P1-6** | `sitemap.xml` yok, JSON-LD yok, özel alan adı yok | `atlasia.app` benzeri domain + Cloudflare; `sitemap.xml`, `robots.txt` güncel, `TravelApp`/`Organization` JSON-LD | `https://<domain>/` canlı; sitemap erişilebilir; zengin sonuç testi geçti | 1 iş günü + domain maliyeti |
| **P1-7** | Yedek yalnız elle; geri yükleme denenmemiş | Haftalık yedek + **geri yükleme tatbikatı** (ikinci projeye restore) | Tatbikat raporu: RTO < 1 saat, RPO < 7 gün | 1 iş günü |
| **P1-8** | Bildirimler uygulama içi; telefonda kullanıcı geri çağrılmıyor | **Karar:** Web Push (iOS 16.4+ yalnız kurulu PWA'da çalışır) veya pilot boyunca bilinçli erteleme | Karar yazılı; ertelendiyse doküman/arayüz metni buna uygun | 0,5 gün (karar) / 3-4 gün (uygulama) |

**P1 toplamı ≈ 11-14 iş günü.**

---

## 5. P2 — Pilot sonrası (şimdi başlamayın)

| ID | Kalem | Neden şimdi değil |
|---|---|---|
| P2-1 | Gerçek yaya rota motoru (turn-by-turn) | Lisans + veri maliyeti; düz çizgi navigasyon değildir, öyle sunulmamalı |
| P2-2 | Çoklu dil (EN) | Pilot tek bölge, tek dil; içerik çevirisi maliyeti yüksek |
| P2-3 | Native sarmalayıcı (Capacitor) + arka plan konum | Web-first kararı geçerli; mağaza maliyeti/güncelleme yükü |
| P2-4 | Sunuculu üretken LLM asistanı | Maliyet + güvenlik; mevcut asistan kural tabanlı ve dürüst |
| P2-5 | Çoklu foto, GPX, PMTiles, gelir modeli | P0-4 kararına bağlı |

---

## 6. Dört haftalık uygulama planı

| Hafta | Odak | Çıktı (kanıtla) |
|---|---|---|
| **1** | **Güven + görünürlük** — P0-1, P0-2, P0-3, P0-5 | Yasal metin onaylı ve canlıda; hata paneli çalışıyor; analitik 6 olay; `dogrula:canli` + Enforce + beyan |
| **2** | **Performans + veri** — P0-4 kararı, P1-1, P1-2 | Açılış < 200 kB; Lighthouse ≥ 85; foto mimarisi kararı uygulanmış |
| **3** | **Kalite ağı** — P1-3, P1-4, P1-5 | E2E 5 senaryo yeşil; axe 0 kritik; bağımlılık borcu kapalı |
| **4** | **Saha + içerik** — P0-6, P0-7, P1-6, P1-7, P1-8 | Cihaz matrisi dolu; moderasyon tatbikatı; domain + sitemap; yedek geri yükleme tatbikatı |
| **5-8** | **Davetli pilot** — 20-50 kişi, tek bölge, 4 hafta | Haftalık 6 metrik; çökme < %0,5 oturum; geri alma planı hazır |

---

## 7. "Profesyonel" tanımı — kabul kontrol listesi

Genel açılış için **hepsi** işaretli olmalı:

**G1 · Hukuk ve güven**
- [ ] Canlı yasal metinlerde yer tutucu yok, künye dolu, sürüm tarihli
- [ ] KVKK aydınlatma + açık rıza + çerez tercihleri ayrı ve çalışıyor
- [ ] Hesap silme gerçekten tüm alt koleksiyonları siliyor (deneme hesabında kanıtlı)
- [ ] İletişim adresi çalışıyor (gelen kutusu izleniyor)

**G2 · Ölçülebilirlik**
- [ ] Hata izleme: istemci hatası 30 sn içinde panelde, PII yok
- [ ] Analitik: kayıt, iz→yayın, rota, paylaşım, çökme, oturum süresi
- [ ] Haftalık pano: DAU, yeni kayıt, oluşturulan içerik, çökme oranı, Firestore okuma/yazma, bant genişliği

**G3 · Güvenilirlik**
- [ ] Rules + indekslerin canlı sürümü kayıtlı; App Check `Enforce` açık
- [ ] Haftalık otomatik yedek + **test edilmiş** geri yükleme
- [ ] Olay müdahale: geri alma komutu tek satır, sorumlusu belli
- [ ] Cloudflare deploy'u her zaman yeşil (kapı uyarı modunda değil, **enforce**)

**G4 · Performans**
- [ ] Açılış < 200 kB gzip, LCP < 2,5 sn (mobil 4G)
- [ ] Uygulama ekranı TTI < 4 sn
- [ ] Lighthouse mobil ≥ 85 (perf) / ≥ 95 (a11y)
- [ ] Lighthouse CI PR'da zorunlu

**G5 · Erişilebilirlik ve cihaz**
- [ ] axe kritik ihlal 0 (iki tema, 390×844)
- [ ] iOS Safari + Android Chrome'da 8 senaryo kanıtlı
- [ ] Klavye ile harita dışı tüm akışlar tamamlanabiliyor
- [ ] Ekran okuyucu turu (NVDA/VoiceOver) kayıtlı

**G6 · Ürün ve içerik**
- [ ] Tek pilot bölgede **≥ 30 saha-doğrulanmış** nokta, kaynak/atıf güncel
- [ ] En az 1 site turunda gerçek (izinli) yürüme geometrisi ya da "temsilî" etiketi görünür
- [ ] Boş durumlar (yeni kullanıcı, boş bölge, çevrimdışı, hata) profesyonel metinlerle
- [ ] Moderasyon SLA'sı tanımlı ve 3 raporluk tatbikat yapıldı
- [ ] Özel alan adı + sitemap + JSON-LD

---

## 8. Yapılmaması gerekenler (kapsam disiplini)

1. **Yeniden tasarım yapma.** Arayüz zaten tutarlı; bu turdaki kazanç tasarımda değil, ölçüm ve güvende.
2. **Yeni özellik ekleme.** P0/P1 kapanmadan eklenen her özellik bütçe payını (%1,4) ve test ağını daha da daraltır.
3. **Blaze/faturalı planı kontrolsüz açma.** Storage ve Cloud Functions maliyet üretir; önce P0-4 kararı, sonra bütçe tavanı.
4. **"LLM var" demek.** Asistan kural tabanlı; iletişimde bu doğru anlatılmalı.
5. **Navigasyon iddiası.** Rota çizgisi durakları bağlar; gerçek yürüme yolu değildir.
6. **Kapıyı tekrar "uyarı" moduna alma.** `ATLASIA_PROD_ENV_POLICY=enforce` açılmalı; sessiz uyarı üç günlük kesintiye yol açtı.

---

## 9. Ölçüm panosu — pilotun 6 metriği

| Metrik | Hedef | Kaynak |
|---|---|---|
| Haftalık aktif kullanıcı (WAU) | 20-50 → %60 geri dönüş | analitik |
| Kayıt → ilk içerik (iz/gönderi) dönüşümü | ≥ %40 | analitik |
| İz → yayınlanmış rota dönüşümü | ≥ %25 | analitik |
| Çökme oranı | < %0,5 oturum | hata izleme |
| Firestore okuma/yazma (günlük) | Spark kotasının **< %60'ı** | Console |
| Bant genişliği (aylık) | < 5 GiB | Console |

Bu altı metrik ölçülmeden "pilot başarılı" denemez.

---

## 10. Riskler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Spark kotası dolar (sohbet + akış okumaları) | Orta | Yüksek | Kota paneli + günlük alarm; sohbet için yazma sınırı |
| Fotoğraflar belge içinde kalır, akış şişer | **Yüksek** | Yüksek | P0-4: Storage kararı veya 60-80 KB hedefi |
| Tek kişilik operasyon (moderasyon + destek) | Yüksek | Orta | SLA + hazır yanıt şablonları + nöbet takvimi |
| iOS PWA sınırları (push, arka plan konum) | Yüksek | Orta | Beklentiyi arayüzde doğru kur; vaat etme |
| Hukuk onayı gecikir | Orta | **Blokaj** | Metinler Hafta 1'de avukata; onay gelmezse lansman ertelenir |
| Bağımlılık PR'ları birikir, güvenlik açığı | Orta | Orta | Hafta 3'te sıfırla, aylık bakım penceresi |

---

## 11. Tek cümlelik özet

**Kod hazır; ürün hazır değil.** Sıradaki 4 haftada yazılacak yeni özellik yok — yapılacak iş; yasal metni gerçek yapmak, hatayı ve kullanıcıyı **ölçmek**, fotoğraf mimarisini ölçeklenebilir hâle getirmek, performansı 375 kB'den 200 kB'nin altına indirmek ve gerçek telefonlarda kanıt toplamak.

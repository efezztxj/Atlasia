# Ölçüm ve hata izleme

**Durum:** 2026-11-01 · Birinci taraf huni katmanı kod olarak tamam (P0-2 + P0-3 + T2), **aktif olması için tek adım** toplayıcı adresini tanımlamak. Üçüncü taraf oturum/ısı haritası katmanı (Microsoft Clarity) rıza kapılı olarak devrede — ayrıntı ve açık karar: §5c.
İlgili kod: `src/lib/telemetry.ts`, `src/lib/telemetryBootstrap.ts`, `src/lib/analytics.ts`.

## 1. Ne toplanır, ne toplanmaz

| Toplanır | Toplanmaz |
|---|---|
| Hata türü (`TypeError`, `Error` …) ve PII'den arındırılmış mesaj | E-posta, telefon, ad, kullanıcı kimliği (uid) |
| Sayfa yolu (**sorgu dizesi ve hash atılmış**) | Konum (lat/lng), IP, cihaz parmak izi |
| Oturum başına rastgele kimlik (`a1b2c3d4-e5f6a7b8`, kişiyi tanımlamaz) | Gönderi/iz/hikâye metni, fotoğraf, arama sorgusu |
| Sayaç olayları: `app_open`, `session_start`, `cta_click`, `map_open`, `signup_start`, `signup_complete`, `sign_in`, `place_created`, `route_published`, `first_route_created`, `audio_guide_start`, `post_created`, `share`, `offline_pack`, `report_created`, `consent_choice` | Çerez, reklam kimliği, üçüncü taraf pikseli |
| Sabit/sayısal özellikler (`placement`, `method`, `guest`, `category`, `visibility`, `stops`, `hasPhoto`, `ok`) | Serbest metin alanları (bilinçli olarak atılır) |

Cevap: **anonim ölçüm**. Kimseyi tanımlamaz, profilleme yapmaz.

## 2. Rıza kapısı (KVKK)

- Varsayılan: **kapalı**. Çerez bandı ilk açılışta iki yol sunar:
  - `Yalnız zorunlularla devam et` → analitik kapalı, ağa hiçbir istek gitmez.
  - `Anonim ölçümü açarak devam et` → `atlasia_consent` çerezine `analytics: true` yazılır.
- Rıza yokken kayıtlar yalnız **bellekte** (en fazla 50 kayıt) tutulur; hiçbir ağ çağrısı yapılmaz.
- Rıza **sonradan** verilirse geçmiş kayıtlar gönderilmez; yalnız sonraki olaylar akar (geriye dönük toplama yok).
- Rıza geri alınırsa (`Gizlilik açıklaması` → tercihler) gönderim anında durur.

## 2b. Dönüşüm hunisi hedefleri (T2)

Plan hedefi: **landing → harita açılışı %15 → %40+**, **harita açılışı → kayıt
%10 → %25+**, **landing → kayıt %2 → %8+**. Huniyi üreten olayların tek kaynağı
aşağıdaki **§4b kataloğu**dur (alan adları koddaki tiplerle birebir aynı).

Sınırlar:

- `consent_choice{analytics:false}` ret seçildiğinde **gönderilemez**: rıza
  kapısı kapalıyken telemetry kaydı düşürür. Ret oranı bu olaydan okunamaz;
  istenirse rıza öncesi çalışan ayrı bir sunucu sayacı gerekir.
- `map_open{guest}`: T4 ile misafir modu var; kayıtsız açılan harita `true`, oturumlu açılan `false` gelir. Oran = `guest:true` / tüm `map_open`.
- Yönlendirmeli (popup engelli) sosyal girişte `sign_in` bu sayfada sayılmaz.

## 3. Aktifleştirme

Uç nokta tanımlı değilse modül **tamamen sessizdir** (ağ kapalı, yalnız geliştirme konsolunda `[telemetry:…]` satırı).

```bash
# Cloudflare Pages → Settings → Variables and secrets → Production (ve istersen Preview)
VITE_TELEMETRY_ENDPOINT=https://ornek.example/api/telemetry
```

Yerelde denemek için `.env.local` içine aynı satır yazılabilir; uç nokta yoksa da olaylar konsolda görünür.

## 4. Gönderim biçimi

`POST` · `content-type: application/json` · `credentials: omit` · `keepalive: true`
Sayfa gizlenirken `navigator.sendBeacon` kullanılır (mobilde sekme kapanması sık).

```json
[
  {
    "name": "place_created",
    "level": "event",
    "at": 1793107200000,
    "sessionId": "a1b2c3d4-e5f6a7b8",
    "path": "/uygulama/",
    "props": { "account": "cloud", "category": "history", "hasPhoto": true },
    "v": 1
  },
  {
    "name": "error",
    "level": "error",
    "at": 1793107205000,
    "sessionId": "a1b2c3d4-e5f6a7b8",
    "path": "/uygulama/",
    "props": { "source": "window.error", "errorType": "TypeError", "errorDetail": "cannot read…" },
    "v": 1
  }
]
```

Sınırlar (kodda sabit): tek gönderimde en fazla **20** kayıt, gönderimler arası en az **5 s**,
oturumda en fazla **200** olay, tek değerde en fazla **300** karakter.

> **Not:** Sentry/GlitchTip SDK'ları kendi zarf (envelope) biçimini ister; bu modül bilinçli olarak
> bağımlılıksız ve JSON tabanlı. Sentry'ye bağlanmak istenirse araya küçük bir aktarıcı (Cloudflare
> Worker) yazılır: gelen JSON → Sentry `store` API'si. Bu, paket bütçesine 0 kB ekler.

## 4b. Olay kataloğu (hangi olay, hangi alan, nerede tetiklenir)

Alan adları `src/lib/analytics.ts` içindeki tiplerin **birebir** karşılığıdır; `src/config/telemetryCatalog.test.ts` bunu kaynak dosyalara karşı doğrular (alan adı değişirse test kırılır).

| Olay | Alanlar | Tetiklendiği yer | Ne ölçülür |
|---|---|---|---|
| `app_open` | `standalone` (türetilen `screen`) | `telemetryBootstrap.ts` (ilk görünür kare sonrası) | Kurulu uygulamadan mı, tarayıcıdan mı gelindi |
| `session_start` | `account` (`cloud`/`device`/`anonymous`) | `telemetryBootstrap.ts` (oturum başı) | Oturum sayısı, hesap türü dağılımı |
| `cta_click` | `placement` (`hero`/`header`/`how_it_works`/`footer`), `signedIn` | `LandingPage.tsx` → `App.tsx` | Hangi CTA'nın dönüştürdüğü (huni kırılımı) |
| `map_open` | `guest` | `Explorer.tsx` (hem oturumlu hem misafir) | Landing'den haritaya geçiş oranı; kayıt duvarının kalkıp kalkmadığı |
| `onboarding_choice` | `choice` (`nearby`/`route`/`leave`/`skip`), `guest` | `Explorer.tsx` (karşılama panelinin her çıkışı) | T8: ilk oturumda ne seçiliyor; "harita açıldı ama hiçbir şey seçilmedi" oranı |
| `signup_start` | — | `AccountAccess.tsx` (kayıt moduna geçiş) | Kayıt formunun açılma oranı |
| `signup_complete` | `method` (`email`/`google`/`apple`/`phone`/`device`), `account` | `AuthContext.tsx` (kayıt tamamlanınca) | Kayıt dönüşümü + yöntem dağılımı |
| `sign_in` | `method`, `account` | `AuthContext.tsx`, `AccountAccess.tsx` (sosyal popup) | Geri dönen kullanıcı |
| `place_created` | `account`, `category`, `hasPhoto` | `useFirestoreAtlasData.ts` | Hangi kategori içerik üretiyor |
| `route_published` | `account`, `visibility`, `stops` | `useFirestoreAtlasData.ts` | Yayınlanan rota uzunluğu/görünürlüğü |
| `first_route_created` | `account`, `stops` | `Explorer.tsx` (cihazda ilk rota) | Aktivasyon: ilk değer anı |
| `audio_guide_start` | `source` (`manual`) | `NearbyAudioGuide.tsx` | Sesli rehberin gerçekten dinlenmesi |
| `post_created` | `hasPhoto`, `kind` (`post`/`story`) | `useFirestoreAtlasData.ts` | Sosyal katman canlılığı |
| `share` | `channel` (`native`/`clipboard`/`link`), `target`, `ok` | `AtlasAssistant.tsx` | Paylaşım yolunun tutup tutmadığı (native sheet vs panoya kopyalama) |
| `offline_pack` | `action` (`download`/`delete`), `ok` | `OfflinePackage.tsx` | Çevrimdışı paketin gerçekten indirilebildiği |
| `report_created` | `targetType` | `ReportDialog.tsx` | Moderasyon yükünün nerede oluştuğu |
| `consent_choice` | `analytics` (boolean) | `CookieConsent.tsx` | Kaç kişinin anonim ölçümü açtığı (ret rıza kapısı yüzünden ağa çıkmaz) |

**Kural:** yeni bir olay eklenirse (1) `analytics.ts` tipi, (2) tetiklendiği gerçek bir kullanıcı akışı, (3) bu tablodaki satır — üçü **aynı teslimatta** yazılır. Çağrılmayan olay tanımlamak yasak: 2026-10-27'de `share`, `offline_pack`, `report_created` tam olarak bu yüzden ölü duruyordu.

## 5. Toplayıcı seçenekleri

| Seçenek | Kurulum | Not |
|---|---|---|
| **Cloudflare Worker** (önerilen) | 30-40 satır: gövdeyi doğrula, Analytics Engine'e yaz veya D1'e ekle | Aynı platform, ek servis yok, ücretsiz katman yeterli |
| Mevcut bir log servisi | Uç noktayı ona çevir, JSON kabul ettiğini doğrula | Sağlayıcının veri işleme sözleşmesi KVKK'ya uygun olmalı |
| Sentry | Araya aktarıcı Worker | SDK eklenmez |
| Plausible / Umami (plan T1'de geçen seçenekler) | Doğrudan çalışmaz: bu modülün gövdesi kendi JSON şemasında (`TelemetryRecord[]`). Araya Cloudflare Worker koyup alanları Plausible/Umami `/api/event` biçimine çevirmek gerekir | Panel hazır gelir (huni grafiği, hedef tanımı); KVKK dostudur (çerezsiz). Üçüncü taraf betiği **sayfaya eklenmez**, istek sunucudan gider |
| GA4 | `gtag` betiği + Consent Mode v2; olay adları eşlenir | Üçüncü taraf betiği ilk yükleme bütçesini ve KVKK yüzeyini büyütür; bu depo için önerilmez |

## 5b. T1 durumu — panel kuruldu mu?

**Hayır.** Panel/hesap henüz açılmadı; Worker kaynak kodu ve şema testleri
[`workers/telemetry/`](../workers/telemetry/) içinde hazır, ancak Cloudflare
hesabına deploy edilmedi ve Pages uç noktası tanımlı değil. Kod tarafı: olaylar
tipli, rıza kapılı ve Worker allowlist'iyle doğrulanır. Panel için iki yol var:

1. **Kendi toplayıcın + panel** (önerilen): Cloudflare Worker → Analytics Engine
   (veya D1) → küçük bir okuma sayfası. Huni tanımları `docs/baseline.md` §4'te.
2. **Plausible/Umami'ye köprü**: Worker'da isim eşlemesi (`app_open` → `pageview`,
   `cta_click` → özel olay). Panel ve huni görünümü hazır gelir.

Her iki yolda da tek zorunlu adım: `VITE_TELEMETRY_ENDPOINT` değerini Cloudflare
Pages ortamına yazmak. Ondan önce hiçbir olay ağa çıkmaz (bilinçli).

## 5c. Microsoft Clarity — üçüncü taraf, ayrı rıza (2026-11-01)

Yukarıdaki huni katmanı **birinci taraf** ve anonim. Ona ek olarak, oturum/ısı haritası
katmanı için **Microsoft Clarity** rıza kapılı biçimde eklidir. İkisi ayrı rıza anahtarı
kullanır ve **biri diğerini kapsamaz**.

| Konu | Birinci taraf telemetri (§1–§5) | Microsoft Clarity (§5c) |
|---|---|---|
| Kod | `src/lib/telemetry.ts`, `telemetryBootstrap.ts`, `analytics.ts` | `src/lib/clarity.ts`, `CookieConsent.tsx` |
| Rıza anahtarı | `atlasia_consent` çerezi → `analytics: true` | `atlasia.clarity-consent.v1` (localStorage) + çerez bandındaki ayrı onay kutusu |
| Ne toplar | Sayaç olayları + PII'siz hata mesajı | Oturum kaydı, ısı haritası, tıklama/kaydırma, ölü tıklama |
| Varsayılan | Kapalı | Kapalı (ayrı onay gerekir) |
| Ağ isteği | `VITE_TELEMETRY_ENDPOINT` boşken **hiç yok** | Rıza yokken **hiç yok**; rıza verilince `https://www.clarity.ms/tag/<proje>` + `scripts.clarity.ms` |
| Maskeleme | Yalnız sayısal/sabit alanlar gönderilir | `data-clarity-mask="true"` kök elemana eklenir; metin alanları maskelenir |
| Geri alma | Tercihler → gönderim anında durur | Tercihler → `consent(false)` + sayfa yeniden yüklenir, betik kaldırılır |
| KVKK notu | Yurt dışına aktarım yok | Veri Microsoft'a (ABD) gider; aydınlatma metninde §2.5, §3 ve §4.1'de adı geçer |

**CSP bağımlılığı:** Clarity'nin yükleyicisi `https://www.clarity.ms`, çalışma zamanı ise
`https://scripts.clarity.ms` adresinden gelir. İkisi de `public/_headers` içindeki
`script-src` listesinde **açıkça** yazılı olmak zorundadır; `*.clarity.ms` joker'i bilinçli
olarak kullanılmaz. 1 Kasım 2026'da `scripts.clarity.ms` eksikti ve rıza veren kullanıcıda
bile çalışma zamanı CSP tarafından engelleniyordu (PR #163 ile kapandı,
`src/config/cloudflareHeaders.test.ts` bunu kilitler).

**1 Kasım 2026 ölçümü — "panelde veri yok" vakasının kanıtı:**

| Ölçüm | Sonuç |
|---|---|
| Yayındaki CSP (`script-src`) | ✅ `https://www.clarity.ms` ve `https://scripts.clarity.ms` izinli |
| Yayındaki CSP (`connect-src`) | ✅ `https://*.clarity.ms` izinli |
| Rıza akışı → `<script>` eklenmesi | ✅ gerçek Chromium'da eklendi (E2E) |
| `https://www.clarity.ms/tag/z6hdmwcwe6` | ⚠️ **HTTP 204 (No Content)** — Node isteğinde, masaüstü Chrome kimliğiyle ve referer'lı gerçek tarayıcıda |
| Kontrol: var olmayan kimlik (`zzzzzzz1`), aynı koşullar | ⚠️ **HTTP 204** — yani 204 tek başına "kimlik geçersiz" kanıtı **değil** |

**Yorum:** 204 dönerse tarayıcı bunu başarılı sayar ama hiç JavaScript gelmez, dolayısıyla
hiçbir kayıt oluşmaz. Ancak kontrol ölçümü de 204 aldığı için **CI ağında Clarity tag'i
hiç sunulmuyor**; bu ölçüm proje kimliğinin doğruluğunu kanıtlamaz. Belirleyici test
kullanıcının kendi tarayıcısıdır: (a) çerez panelindeki durum satırı `ready` mi `empty` mi,
(b) `https://www.clarity.ms/tag/z6hdmwcwe6` adresi tarayıcıda JavaScript gösteriyor mu.

Kod, kayıt gelmediğinde sessiz kalmaz: betik yüklendiği hâlde çalışma zamanı gelmezse
durum **`empty`** olur ve panelde "Microsoft bu proje kimliği için betiği göndermedi;
Project ID ve alan adı doğrulanmalı" yazar.

**Panelde veri görünmüyorsa sıra (1 Kasım 2026):**

1. **İzin verildi mi?** Çerez panelindeki ayrı kutu işaretlenmeden betik hiç yüklenmez.
   Panelde durum satırı yazar: `off` / `loading` / `ready` / `empty` / `blocked`.
2. **`blocked` yazıyorsa** reklam engelleyici, izleme koruması veya "Do Not Track"
   betiği düşürmüştür; o oturumda Microsoft'a **hiçbir veri gitmez**. Beyaz listeye
   `clarity.ms` ve `scripts.clarity.ms` eklenince çalışır.
3. **`empty` yazıyorsa** Microsoft 204 döndürüyor: Clarity panelinde Project ID'yi
   ve projeye bağlı alan adını doğrula (kod tarafı hazır).
4. **`ready` yazıp panelde kayıt yoksa** ilk oturumun düşmesi 1-2 dakika sürer;
   ayrıca Clarity panelinde doğru proje (`z6hdmwcwe6`) açık olmalı.
5. **Sunucu tarafı teyidi:** `npm run dogrula:canli` yayındaki CSP'yi ve tag adresini
   ölçer; `npm run test:e2e:canli` gerçek Chromium'la rıza akışını çalıştırıp tag'in
   200 döndüğünü ve CSP ihlali olmadığını doğrular (haftalık workflow:
   `Canlı Clarity doğrulaması`).

**Destek komutu:** rızalı oturumda tarayıcı konsolunda `window.atlasiaClarityStatus()`
rıza, durum, betik varlığı ve proje kimliğini tek satırda döndürür.

**Doğrulama (rızalı oturum):** DevTools → Network'te `clarity.ms` istekleri görünür;
kayıt panelde ~1-2 dk içinde düşer. Rıza kapalıyken bu adreslere **tek istek** çıkmaz.

**Açık karar:** iki katman birlikte mi kalacak, biri mi emekli olacak —
`docs/gorevler/olcum-yigini-karari-2026-11-01.md`. Karar yazılmadan yeni üçüncü taraf
araç eklenmez ve `VITE_TELEMETRY_ENDPOINT` operatör tarafından doldurulmaz.

## 6. Doğrulama

```bash
# 1) Yerel: olaylar konsolda
npm run dev   # konsolda "[telemetry:event] app_open {…}"

# 2) Testler
npx vitest run src/lib/telemetry.test.ts src/lib/analytics.test.ts src/lib/telemetryBootstrap.test.ts

# 3) Rıza akışı (tarayıcı)
#    - Bandı "Yalnız zorunlularla" ile kapat → DevTools Network'te telemetri isteği YOK
#    - Çerezleri temizle, "Anonim ölçümü açarak devam et" → istek VAR, gövdede e-posta/uid YOK
```

## 7. Bilinen sınırlar

- **Kaynak haritası (source map) yükleme yok.** Hata mesajları üretimde küçültülmüş adlar taşır;
  satır/kolon çözümü için ileride harita yükleme (özel, kimlik doğrulamalı) gerekir.
- **Çevrimdışı kuyruk yok.** Ağ yoksa kayıt kaybolur (kullanıcı akışını bloke etmemek için bilinçli).
- **Kayıt düzeyi kullanıcıya ait değil:** oturum kimliği sekmeye bağlıdır, hesapla eşlenmez.
- **İki ölçüm katmanı var** (birinci taraf huni + Clarity). Hangisinin kalıcı olduğu
  `docs/gorevler/olcum-yigini-karari-2026-11-01.md` kararına bağlı; Clarity panelinde
  maskelemenin gerçekten çalıştığı (metin ve konum görünmüyor) henüz doğrulanmadı.
- **Toplayıcı henüz deploy edilmedi.** Kaynak [`workers/telemetry/`](../workers/telemetry/) içinde; uç nokta operatör hesabında deploy edilip Pages `VITE_TELEMETRY_ENDPOINT` tanımlanana kadar ağ kapalıdır.

## 7a. Uç nokta yokken ne olur, nasıl teşhis edilir

Uç nokta tanımlı değilse modül **sessizdir**: ne hata kaydı ne huni olayı cihazdan
çıkar. Bu, "kullanıcı çöktü ama elimizde hiçbir şey yok" durumunun en olası nedeni
olduğu için görünür hâle getirildi:

1. **Tarayıcıda tek satır teşhis:**
   `window.atlasiaErrorLog()` → `{ status, hint, endpointConfigured, consent, sessionId, records }`
   - `status: "endpoint-missing"` → toplayıcı adresi yok, hiçbir şey gönderilmiyor.
   - `status: "consent-off"` → adres var, kullanıcı analitik izni vermedi.
   - `status: "ready"` → kayıtlar gönderiliyor.
   `records` son 20 kaydı (PII temizliğinden geçmiş) gösterir; kullanıcıya
   "konsolu aç, bunu yaz, çıkanı bana gönder" denebilir.
2. **Deploy günlüğünde uyarı:** Cloudflare Pages üretim derlemesinde uç nokta yoksa
   `scripts/verify-env.mjs` şu satırı yazar (deploy'u **durdurmaz**):
   `ADVISORY (measurement): Error monitoring is OFF: VITE_TELEMETRY_ENDPOINT is not set…`
3. **CSP tuzağı — `workers.dev` engellenir.** `public/_headers` içindeki
   `connect-src` listesinde `workers.dev` yok. Uç nokta
   `https://<hesap>.workers.dev/...` olarak verilirse tarayıcı isteği bloklar ve
   telemetri yine sessizce kaybolur. Build kapısı bunu da uyarı olarak yazar
   (`telemetry_endpoint_blocked_by_csp`). İki temiz çözüm:
   - **Aynı origin (önerilen):** `public/_redirects` içine
     `/api/telemetry  https://<hesap>.workers.dev/api/telemetry  200` ekle ve
     `VITE_TELEMETRY_ENDPOINT=/api/telemetry` ver. Tarayıcı kendi origin'ine
     konuşur (`'self'` yeterli), CORS/çerez sorunu çıkmaz, kullanıcının IP'si
     doğrudan üçüncü tarafa gitmez.
   - **Host'u CSP'ye ekle:** `connect-src` listesine ilgili host yazılır.
4. **Doğrulama:** uç nokta tanımlandıktan sonra tarayıcıda yukarıdaki komut
   `status: "ready"` dönmeli; toplayıcıda oturum görünmelidir. Bu adım
   `docs/gorevler/siradaki-isler-2026-11-01.md` içinde açık iş olarak duruyor.

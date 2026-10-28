# Ölçüm ve hata izleme

**Durum:** 2026-10-28 · Kod tamam (P0-2 + P0-3 + T2 huni olayları). **Aktif olması için tek adım:** toplayıcı adresini tanımlamak.
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
- `map_open{guest}` misafir modu açılana kadar hep `false` gelir.
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
| `map_open` | `guest` | `Explorer.tsx` (oturumlu) · misafirde `App.tsx` | Landing'den haritaya geçiş oranı |
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

**Hayır.** Bu depoda panel/hesap açılmadı; dış servis kimlik bilgisi yok. Kod
tarafı hazır: olaylar tipli, rıza kapılı ve gövde şeması sabit. Panel için iki
yol var, ikisi de kod değişikliği gerektirmez:

1. **Kendi toplayıcın + panel** (önerilen): Cloudflare Worker → Analytics Engine
   (veya D1) → küçük bir okuma sayfası. Huni tanımları `docs/baseline.md` §4'te.
2. **Plausible/Umami'ye köprü**: Worker'da isim eşlemesi (`app_open` → `pageview`,
   `cta_click` → özel olay). Panel ve huni görünümü hazır gelir.

Her iki yolda da tek zorunlu adım: `VITE_TELEMETRY_ENDPOINT` değerini Cloudflare
Pages ortamına yazmak. Ondan önce hiçbir olay ağa çıkmaz (bilinçli).

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
- **Toplayıcı tarafı bu depoda yok.** Uç nokta senin kontrolünde olmalı; varsayılan olarak kapalıdır.

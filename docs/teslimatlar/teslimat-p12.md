# Teslimat P12 + B2 — Rules test kapsamı, koşucu sağlamlaştırma, cache allowlist portu

**Tarih:** 2026-10-21 (Europe/Istanbul)
**Branch:** `arena/c064e040-atlasia` (taban `fb2927a`, main)
**Durum:** Kod tamam; Rules emulator doğrulaması bu ortamda koşulamadı (aşağıda). Commit/push/PR kullanıcı onayı olmadan yapılmadı.
**Kapsam:** P12 (rules test + runner) ve denetim bulgusu B2 (offline cache allowlist'in tam host/path'e daraltılması) birlikte teslim edilir.

---

## B2 — Cache allowlist portu (kapatıldı)

### Ne yapıldı

- `src/utils/offlineCache.ts` — `isCacheableTile` artık substring bakmıyor:
  - URL `new URL()` ile ayrıştırılır; yalnız `https:`, user-info (kullanıcı:parola) taşıyan URL reddedilir.
  - Host tam eşleşme + path öneki whitelist'i (`CACHEABLE_TILE_SOURCES`): `tiles.openfreemap.org` → `/planet`, `/natural_earth/`, `/fonts/`, `/sprites/`, `/styles/`; `s3.amazonaws.com` → `/elevation-tiles-prod/terrarium/`.
  - `isEsriTile` parse edilmiş hostname'e bakar (`arcgisonline.com` ve alt alan adları); `arcgisonline.com.evil.example` gibi sahte son ekler Esri sayılmaz, `evil.example/…arcgisonline.com…` Esri sayılmaz.
- `public/sw.js` — aynı allowlist ve parse mantığı kopyalandı (SW modül içe aktaramaz).
- `src/utils/offlineCache.test.ts` — 3 yeni test:
  - Lookalike sahneleri: host adı path/query'de geçen, alt alan gibi gösteren, `@userinfo` hilesi, HTTP, liste dışı path, parse edilemeyen — hepsi `isCacheableTile=false`.
  - Esri host doğruluğu (üst alan/alt alan gerçek, sahte son ek sahte).
  - **Senkron kilidi:** `sw.js` ile `offlineCache.ts`'nin allowlist sabitlerini aynı tutar; gevşek `url.includes("openfreemap")` kalıplarının iki dosyada da bulunmamasını şart koşar.
- Mevcut testteki "OpenFreeMap/terrain önbelleklenebilir" beklentisi TileJSON/fonts/sprites/styles yüzeylerini de kapsayacak şekilde genişletildi.

### Görev sırasında bulunan üretim hatası (düzeltildi)

`public/sw.js` **main'de syntax hatalıydı**: `activate` içindeki `Promise.all(...)` satırında fazladan bir kapanış parantezi vardı (`node --check` ile kanıtlandı; eslint `public/**`'i yok saydığı için kapıdan kaçmış). Tarayıcıda SW parse edilemediğinden kayıt sessizce başarısız oluyordu (`main.tsx` hatayı yutuyor). Bu teslimatta fazladan parantez kaldırıldı; `node --check public/sw.js` artık temiz. Davranış değişikliği yalnız "SW'nin gerçekten kaydedilebilmesi" — deploy'da kullanıcıların bozuk SW'den kurtulması tarayıcı güncelleme döngüsüne bağlıdır.

### Kanıt

- `npx vitest run src/utils/offlineCache.test.ts` → 8/8 geçti.
- `node --check public/sw.js` → temiz.

---

## P12 — Rules test kapsamı + koşucu

### Koşucu (`scripts/run-firestore-rules-tests.mjs`)

- Emulator JVM argümanlarına `-Duser.language=en` ve `-Duser.country=US` eklendi (her platformda aynı; Türkçe sistem locale'i özellikle Windows'ta emulator davranışını bozmasın diye). Kullanıcının ortam değişkenleri değişmez; yalnız child process argümanları etkilenir.
- `src/config/firestoreRulesRunner.test.ts` — 2 yeni statik kilit: Java 21 kapısı + SHA-256 pin + port kontrolü + demo proje id; locale bayraklarının `-jar` öncesinde spawn argümanlarında olduğu.
- Koşucunun var olan sağlamlığı korundu: SHA-256 ile JAR doğrulama, Java sürümünde tek satırlık anlaşılır hata, port çakışmasında erken hata, Windows `npm_execpath`/ComSpec yolu.

### Rules testleri (`tests/firestore.rules.test.ts`) — 5 yeni senaryo (19→24 `it`)

1. **Beğeni bütünlüğü:** başkasının adına `arrayUnion`, `likes` sayacına doğrudan yazma, tam liste ezmesi ve metin güncelleme reddi; kendi adına tek ekleme serbest.
2. **Yanıt varlığı + silme matrisi:** olmayan post altına yanıt yazma/okuma reddi; post sahibi yanıt silebilir, üçüncü kişi silemez.
3. **`users/{uid}/blocks`:** docId==blockedUid zorunluluğu, çapraz UID okuma/yazma reddi, limit 51 reddi, update kapalı.
4. **`savedPlaces` çapraz erişim:** başka UID altına yazma reddi, `place.id` ≠ docId reddi, limit 101 reddi.
5. **Grup ayrılma sınırı + default deny:** üye yalnız kendini çıkarabilir (ekleme/başkasını çıkarma reddi); tanımsız `admin/config` ve bilinmeyen koleksiyon okuma/yazma reddi.

### Davranış tablosu (match bloğu → kapsama)

| Match | Test durumu |
|---|---|
| `places` | ✅ kamu get/limit, viewport, sahiplik |
| `posts` + `replies` | ✅ oluşturma beyaz listesi, beğeni transformu/bütünlüğü, yanıt alt koleksiyonu, tavanlar, silme matrisi |
| `stories` | ✅ immutable, `seen` reddi, limit |
| `routes` / `tracks` | ✅ görünürlük, foto sözleşmesi, sahiplik |
| `users/{uid}/savedPlaces|savedRoutes` | ✅ sayaç batch'i, çapraz UID, id eşleşmesi |
| `verifications` | ✅ kendi adına yazma, limit |
| `reports` / `blocks` | ✅ alan/sahiplik doğrulamaları |
| `groups` + `messages` + `users/{uid}/groups` | ✅ üye getir/liste, lastMessage, ayrılma, mesaj sahipliği |
| `users/{uid}/notifications` / `users/{uid}/blocks` | ✅ alıcı/aktör ayrımı, blocks kimlik eşleşmesi |
| `/{document=**}` | ✅ default deny |

### Koşulamayan doğrulama (dürüst not)

`npm run test:rules:emulator` bu sandbox'ta **çalıştırılamadı**: ortamda Java yok; koşucu beklenen mesajla durdu ("Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir."). Yeni senaryolar emulator'da **henüz koşulmadı** — Java 21'li ortamda (GitHub Actions CI veya kullanıcının Windows makinesi) koşulması gerekir. Tür/sözdizimi düzeyinde `esbuild` parse kontrolü temiz; tam tip denetimi ham `tsc` ile repo tsconfig'i dışında tutulamıyor (dosya bilinçli olarak ayrı `vitest.rules.config.ts` ile koşuluyor).

`firestore.rules` içeriğinde **hiçbir değişiklik yapılmadı** (görev yalnızca test + koşucu).

---

## Global kalite kapısı (bu ağaçta koşuldu)

| Komut | Sonuç |
|---|---|
| `npm ci` | ✅ |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (`--max-warnings=0`) |
| `npm run test:run` | ✅ 44 dosya / **230 test** (önce 225; +3 offlineCache, +2 runner kilidi) |
| `npm run test:owner-index` | ✅ 7/7 |
| `node --check public/sw.js` / `scripts/run-firestore-rules-tests.mjs` | ✅ |
| `npm run build` | ✅ (büyük chunk uyarısı sürüyor — P19) |
| `npm run audit:check` | ✅ bilinen açık yok |
| `npm run verify:social-metadata` | ✅ |
| `npm run test:rules:emulator` | ❌ Java 21 yokluğu — yukarıdaki dürüst nota bakınız |

Kilitli dosyalar: `MapView.tsx` ve `firestore.rules` değişmedi.

## Değişen dosyalar

- `src/utils/offlineCache.ts` (B2 çekirdek)
- `src/utils/offlineCache.test.ts` (+3 test, 1 genişletme)
- `public/sw.js` (allowlist kopyası + syntax düzeltmesi)
- `scripts/run-firestore-rules-tests.mjs` (JVM locale)
- `src/config/firestoreRulesRunner.test.ts` (+2 kilit testi)
- `tests/firestore.rules.test.ts` (+5 senaryo, `arrayUnion` import)
- `docs/gorevler/…` (plan güncellemesi), `teslimat-p12.md`

> **Güncelleme (2026-10-21):** Emulator doğrulaması eksikliği kapandı —
> PR #20 CI koşumu (run 39548094085, "Firestore security rules tests" adımı,
> setup-java 21) 24 senaryonun tamamını gerçek emulator'da çalıştırıp
> **başarıyla** tamamladı. PR, kullanıcının açık onayı ile merge edildi;
> bu andan itibaren P12 tamamen kapalıdır.

## Bilinen riskler / sonraki adım

- Yeni rules testleri emulator'da kanıtlanana kadar P12 planda 🚧 durumda kalır; Java 21'li ilk CI koşumu bunu kapatır.
- SW syntax düzeltmesi deploy sonrası kullanıcı tarayıcılarında ilk ziyarette devreye girer; `atlasia-shell-v4` cache adı değişmediğinden eski shell cache'leri activation temizliğiyle ele alınır.
- C1 (arkadaşlık rıza bağlaması) hâlâ fd127f10 teslimatındaki haliyle açıktır; bu görev kapsamına girmedi.

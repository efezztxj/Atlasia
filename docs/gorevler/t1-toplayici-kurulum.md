# T1 — Toplayıcı ve panel kurulumu (operatör adımları)

> Bu belge **kod değişikliği gerektirmeyen** tek insan adımını tarif eder:
> Cloudflare Pages ortamına `VITE_TELEMETRY_ENDPOINT` yazmak. Ondan önce hiçbir
> olay ağa çıkmaz (bilinçli; `src/lib/telemetry.ts` rıza kapısı).
> Olay sözleşmesi: `docs/olcum-ve-hata-izleme.md` §4b · Huni hedefleri: `docs/baseline.md`.

## 0. Ön koşullar

- Cloudflare hesabı (mevcut Pages projesi: `atlasia`).
- **Yeni ücretli servis açılmaz:** Analytics Engine ücretsiz katmanı bu hacim
  için yeterli (günlük 100 B satır / 1M yazma). Kota aşılırsa toplayıcı 204
  döner, istemci hiçbir şey kaybetmez (olaylar zaten "best effort").

## 1. Toplayıcı Worker

Çalışan, testli kaynak ve Analytics Engine şema sözleşmesi
[`workers/telemetry/`](../../workers/telemetry/) içindedir. Eski kopyala-yapıştır
örneği yerine bu klasördeki Worker'ı kullan: istemcinin `at` zaman damgasını
okur, olay özelliklerini allowlist ile doğrular, PII/serbest metni ve hata
ayrıntılarını saklamaz.

1. Cloudflare hesabında doğru proje/hesapla oturum açıldığını doğrula:
   `npx --yes wrangler@4.154.0 whoami`.
2. `workers/telemetry/wrangler.toml` içindeki `ALLOWED_ORIGINS` değerini gerçek
   Pages üretim kökeniyle (gerekirse açıkça izin verilen preview kökenleriyle)
   güncelle. CORS bir anti-abuse kontrolü değildir; Worker URL'si herkese açıktır.
3. Repo kökünden dağıt:

   ```bash
   npx --yes wrangler@4.154.0 deploy --config workers/telemetry/wrangler.toml
   ```

4. Çıktıdaki `workers.dev` adresini Pages değişkenine koy. Token'ı repo veya
   sohbete koyma; Wrangler'ı operatör kendi Cloudflare oturumuyla çalıştırır.

Worker'ın sözleşme testleri çevrimdışı çalışır:

```bash
npm run test:telemetry-worker
```

> Bu ajan oturumunda Cloudflare API kimliği bulunmadığı için Worker burada
> deploy edilmedi. `wrangler deploy` yalnız operatörün yetkili Cloudflare
> oturumunda çalıştırılmalıdır.

## 2. Pages ortam değişkeni

Cloudflare → Pages → `atlasia` → Settings → Environment variables (Production
**ve** Preview) → ekle:

```
VITE_TELEMETRY_ENDPOINT = https://atlasia-telemetry.<hesap>.workers.dev
```

Yerelde `.env.local` (commit edilmez):

```
VITE_TELEMETRY_ENDPOINT=http://localhost:8787
```

Sonra **yeniden deploy** gerekir: Vite değişkeni derleme zamanında gömer.

## 3. Doğrulama (5 dakika)

```bash
npm run dev
# 1) Konsolda "[telemetry:event] app_open {…}" görünmeli (uç nokta tanımlıysa
#    ağa da gider; DevTools → Network → atlasia-telemetry isteği)
# 2) Çerez bandında "Yalnız zorunlularla" → derinlemesine yenile → istek YOK
# 3) "Anonim ölçümü açarak devam et" → istek VAR; gövdede e-posta/uid/konum YOK
npm run build && curl -s https://<deploy>/assets/*.js | grep -c atlasia-telemetry
#    → >0: uç nokta pakete gömülmüş
```

KVKK kontrolü (elle, 1 dakika): istemci gövdesinde `name`, `path`, `at`,
`sessionId` (sekmeye bağlı, hesapla eşlenmez), sürüm ve olay özellikleri bulunur.
Worker yalnız README'deki sabit kolonlara allowlist alanlarını yazar; hata ayrıntısı,
serbest metin ve bilinmeyen alanlar atılır — `docs/olcum-ve-hata-izleme.md` §1.

## 4. Huni sorguları (Analytics Engine → SQL)

```sql
-- Landing → harita açılışı (hedef %40)
SELECT blob1 AS event, count() AS n
FROM atlasia_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
  AND blob1 IN ('cta_click', 'map_open', 'onboarding_choice', 'signup_start', 'signup_complete')
GROUP BY event ORDER BY n DESC;

-- Landing CTA yerleşimlerine göre kırılım
SELECT blob4 AS placement, count() AS n
FROM atlasia_events
WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'cta_click'
GROUP BY placement ORDER BY n DESC;

-- Misafir / oturumlu harita açılışı (double3: 1=true, 0=false)
SELECT double3 AS guest, count() AS n
FROM atlasia_events
WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'map_open'
GROUP BY guest;
```

Analytics Engine alan sırası ve boolean `-1` sentineli için
[`workers/telemetry/README.md`](../../workers/telemetry/README.md)'e bak.

## 5. Durum

| Adım | Durum |
|---|---|
| İstemci kodu (tipli olaylar, rıza kapısı, gövde şeması) | ✅ bu depoda |
| Toplayıcı Worker kodu/testi | ✅ `workers/telemetry/` |
| Worker deploy'u ve Analytics Engine binding | ⛔ operatör Cloudflare hesabında |
| Pages `VITE_TELEMETRY_ENDPOINT` | ⛔ operatörde |
| Panel/huni görünümü | ⛔ operatörde (§4 SQL veya Plausible köprüsü) |

Bu üç adım tamamlanana kadar **huni oranları ölçülemez**; T2/T4/T5/T8
teslimatlarındaki oran iddiaları bu yüzden "hedef" olarak yazılıyor, "sonuç"
olarak değil.

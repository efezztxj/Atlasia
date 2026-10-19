# Atlasia — Ücretsiz DDoS ve kötüye kullanım sertleştirme runbook'u

> **Amaç:** $0 maliyetle (yalnızca opsiyonel alan adı hariç) DDoS, bot ve kota/fatura
> saldırılarına karşı savunmayı katmanlamak. Bu belge konsol + dashboard adımlarını
> adım adım anlatır; uygulama kodu değişikliği **gerektirmez**.
>
> **Kural:** Blaze (ücretli) plana geçmeden hiçbir adım para harcatmaz. Spark planı
> $0 tavanıdır; saldırıda en kötü sonuç "geçici kota kesintisi", fatura değildir.

## 0. Savunma mimarisi (bedava katmanlar)

```
Saldırgan
  → [1] Cloudflare platform DDoS emilimi (Pages ile gelir, metering'siz)     ← bedava
  → [2] Cloudflare zone koruması: Bot Fight Mode + 1 rate-limit kuralı       ← bedava*
  → [3] Firebase App Check enforce (uygulama dışından API çağrısını keser)   ← bedava
  → [4] Firestore Rules: auth + şekil doğrulama + limit(50) fail-closed      ← bedava
  → [5] Spark kotası: 50K okuma / 20K yazma / 20K silme / gün = $0 tavanı    ← bedava
```

\* Zone koruması (2. katman) **Cloudflare'a bağlı özel alan adı (zone)** gerektirir.
`*.pages.dev` adresi zone olmadığı için WAF/Bot Fight/rate-limit **custom domain
olmadan çalışmaz**. 1. katman (platform DDoS emilimi) pages.dev'de de geçerlidir.

**Öneri:** `atlasia.com` gibi bir alan adı alıp Cloudflare DNS'e (turuncu bulut)
bağlamak — tek maliyet budur (~$10/yıl). Alan adı yoksa 1. katman + 3/4/5. katmanlarla
devam edilir; savunma yine de ciddi seviyededir.

---

## 1. Cloudflare tarafı (dashboard, kod yok)

### 1.1 Bot Fight Mode → ON (bedava)

1. Cloudflare dashboard → alan adı (zone) seç → **Security → Bots**.
2. **Bot Fight Mode** anahtarını **ON** yap.
3. Bitti. Yapılandırma yok; bilinen bot imzalarına pahalı challenge atar.

**Uyarılar:**
- Atlasia'da webhook yoktur → yan etki riski yoktur.
- IP Access Rule (izin/blok listesi) oluşturursan Bot Fight Mode **kendiliğinden kapanır**
  (Cloudflare davranışı). Gerekmedikçe IP Access Rule kullanma.
- Yanlış pozitif görürsen (ör. arama motoru botu) kural atlanamaz; Free planda
  Bot Fight Mode ya açıktır ya kapalıdır.

### 1.2 Rate-limit kuralı — Free planın tek ücretsiz kuralı (bedava)

Free planda **1 rate-limit kuralı** hakkın var. Alan sınırlıdır (Free: Path ve
Verified Bot); sayım IP bazlıdır.

1. **Security → WAF → Rate limiting rules → Create rule**.
2. Önerilen ayarlar:

| Alan | Değer |
|---|---|
| Rule name | `atlasia-ip-flood` |
| Rule expression | `http.request.uri.path matches "^/"` *(tüm yollar)* |
| Counting characteristics | Client IP (Free'de tek seçenek) |
| Period | **10 seconds** (Free'de sabit) |
| Requests | **200** |
| Action | **Block** |
| Duration | **1 hour** |

3. **Deploy**.

**Neden 200/10 sn?** İlk PWA açılışı ~40 asset isteği yapar (JS/CSS/ikon/görsel);
200 eşik insan kullanımına bol, flood'a dardır. Gerekirse 100'a indir veya
500'e çıkar; 24 saat analytics'ten izle.

**Sınır:** Free kuralda sayaç sadece IP'dir. Saldırgan botnet/dağıtık IP ile gelirse
bu kural yetmez — o yüzden App Check (3. katman) asıl bariyerdir.

### 1.3 Under Attack Mode (saldırı anında, bedava)

1. **Security → Settings → Security Level**.
2. Saldırı sırasında **Under Attack** seç; geçince **Medium/High**'a geri al.
3. Tüm ziyaretçilere JS challenge gösterir; geçici kalkandır, kalıcı ayar değildir.

### 1.4 İzleme (bedava)

- **Security → Analytics**: son 24 saat trafik, engellenen istek, bot oranı.
- Alarm senaryosu: dakikalık istek 5-10 katına çıkarsa 1.2'deki eşiği sıkılaştır,
  1.3'ü aç.

### 1.5 (Opsiyonel) WAF custom rules — Free'de 5 kural bedava

SPA'da sunucu tarafı API olmadığı için öncelik düşüktür. Örnek kullanım:
`http.request.uri.path contains "."` (statik olmayan, uzantısız path'ler SPA
fallback'idir) gibi filtrelerle şüpheli trafikte **Managed Challenge**.

---

## 2. Firebase tarafı (konsol, kod yok)

### 2.1 App Check → ENFORCE (en kritik ücretsiz adım)

Uygulama kodunda App Check **zaten bağlı** (`src/lib/firebase.ts`,
`ReCaptchaEnterpriseProvider` + otomatik token yenileme). Konsolda iki iş kaldı:

**A) Token TTL'yi 7 güne çıkar (kota matematiği için şart):**

1. Firebase console → **Security → App Check → Apps** sekmesi.
2. Web uygulamasının satırı → **üç nokta (⋯) → Edit / Advanced settings**.
3. **Token TTL = 7 days** (izin: 30 dk – 7 gün; varsayılan **1 saat**).
4. Kaydet.

**Neden?** Her token yenilemesi 1 reCAPTCHA assessment'ıdır ve SDK token'ı TTL'nin
**yarısı** kadar sürede yeniler. Hesap:

| TTL | Aktif kullanıcı saatte assessment | 500 kullanıcı, günde 30 dk kullanım | Aylık |
|---|---|---|---|
| 1 saat (varsayılan) | ~2 | ~1.000/gün | **~15.000/ay** ❌ 10K bedava kotanın üstü |
| 1 gün | ~1/gün | 500/gün | ~15.000/ay ❌ |
| **7 gün** | ~2/hafta | ~71/gün | **~2.150/ay** ✅ rahat |

> 2026 itibarıyla reCAPTCHA ücretsiz kotası **10.000 assessment/ay/organizasyon**'dur
> (Nisan 2026'da 1M'den düşürüldü). Kota aşılırsa faturasız (Essentials) projede
> istekler **429** ile reddedilir ve token yenilenemez; enforce açıkken bu, kullanıcı
> kaybı demektir. TTL=7 gün + aylık kota takibi bunu uzak tutar.

**B) Enforce:**

1. **Security → App Check** → Products/Firestore metrik kartını genişlet.
2. **Enforce** → onayla. Yayılım **15 dakika** sürebilir.
3. Önce 1-2 gün "monitor" modunda izleyip sonra enforce etmek de geçerli yoldur.

**Yerel geliştirme notu:** Emülatör/localhost App Check atlamalıdır; gerçek tarayıcıda
üretim dışından giren geliştirici için **Manage debug tokens** ile debug token kaydı
yapılır (konsol → App Check → Apps → ⋯ → Manage debug tokens).

### 2.2 Spark planında kal — $0 tavanının kendisi

1. Firebase console → **Usage and billing** (veya Project settings → Details).
2. Plan **Spark (No-cost)** olmalı. Blaze'e geçiş **tek tık**, geri dönüşü yok gibi
   düşünülmeli; sadece gerektiğinde geç.

Spark günlük tavanları (aşılırsa sistem durur, fatura gelmez):

| Kaynak | Günlük/ay tavan |
|---|---|
| Firestore okuma | 50.000/gün |
| Firestore yazma | 20.000/gün |
| Firestore silme | 20.000/gün |
| Firestore depolama | 1 GiB |
| Firestore çıkış | 10 GiB/ay |
| Auth aktif kullanıcı | 50.000 MAU |

**Saldırı senaryosu:** Anonim list(50) sorgusuyla kota 1-2 dakikada bitirilebilir →
uygulama geçici olarak veri gösteremez → **gece yarısı Pasifik saatiyle kota sıfırlanır**.
Fatura: $0. Bu, bedava planın bilinçli kabul edilen sınırıdır.

### 2.3 SMS/telefon auth'u KAPALI tut — tek gerçek para sızıntısı

- SMS doğrulama **Eylül 2024'ten beri Blaze zorunlu** ve SMS başına $0.01–0.46
  (bölgeye göre; her gönderim —girilmemiş OTP dahil— faturalanır).
- Bedava strateji: **E-posta/şifre + Google/Apple OAuth** (50K MAU'ya kadar bedava)
  + **cihaz hesapları** (IndexedDB + PBKDF2, sıfır maliyet — kodda zaten var).
- Firebase console → **Authentication → Sign-in method → Phone → Disabled**.
  Geliştirme için yalnızca konsolda tanımlı **test numaraları** kullanılır
  (günde 10 ücretsiz test SMS'i).

### 2.4 Kota takibi (bedava gözlem)

- Firebase console → **Usage and billing → Usage tab**: Firestore okuma/yazma grafikleri.
- Google Cloud console → **APIs & Services → reCAPTCHA Enterprise** (veya App Check
  metrik kartı): aylık assessment sayısı. 10.000'in **%50'si** (5.000) geçilince
  gözlem sıklığını artır.
- Bütçe alarmı **billing hesabı ister**; Spark'ta gerek yoktur ($0 tavan). Blaze'e
  geçilirse **ilk iş** bütçe alarmı kurulmalıdır.

---

## 3. Maliyet tablosu (yıllık)

| Kalem | Maliyet | Not |
|---|---|---|
| Cloudflare Pages + DDoS + Bot Fight + 1 rate-limit | $0 | Sınırsız trafik |
| Firebase Spark (Auth + Firestore + App Check) | $0 | Kota tavanı |
| Photon, Open-Meteo, Wikimedia, Pexels, openfreemap, HIBP | $0 | Zaten ücretsiz |
| Google Maps Embed (Street Peek) | $0* | $200/ay ücretsiz kredi; referrer+kısıtlı anahtar |
| Özel alan adı (opsiyonel ama önerilir) | ~$10/yıl | Zone koruması için tek kalem |
| SMS auth | **KAPALI** | Tek para tuzak; bedava stratejide yok |

---

## 4. Saldırı anı — triage sırası (5 dakikalık plan)

1. **Cloudflare → Security → Settings → Security Level → Under Attack** (anında aç).
2. **Security → Analytics**: trafik kaynağı, bot oranı; gerekirse rate-limit eşiğini sıkılaştır.
3. **Firebase → Usage**: Firestore okuma patlaması var mı? Kota durumu?
4. **App Check metrikleri**: assessment sayısı normun üstünde mi? (429 hatası =
   kota doldu demektir; TTL'yi gözden geçir.)
5. Firebase/Google Cloud **status** sayfaları: altyapı kaynaklı olup olmadığını ayıkla.
6. Saldırı bitince: Under Attack'ı kapat, günlük özet çıkar, eşiği ve kuralları güncelle.

**Kota dolduysa:** Spark'ta yapacak bir şey yok, sıfırlanmasını bekle (00:00 PT).
Kullanıcılara durum bildirimi yap. **Fatura beklentisi olmasın.**

---

## 5. Kontrol listesi (tamamlanınca işaretle)

- [ ] Bot Fight Mode ON
- [ ] Rate-limit kuralı: 200 istek / 10 sn / IP → Block 1 saat
- [ ] Under Attack Mode yolu test edildi (hangi menüden açılıyor biliniyor)
- [ ] App Check Token TTL = 7 gün
- [ ] App Check enforce edildi (Firestore) — 15 dk yayılım sonrası üretim testi
- [ ] Debug token yerel geliştirme için kayıtlı
- [ ] Firebase planı Spark görünüyor
- [ ] Phone/SMS sign-in kapalı
- [ ] reCAPTCHA assessment takvimi: aylık 10K kontrolü hatırlatıcıya alındı
- [ ] (Opsiyonel) Özel alan adı Cloudflare DNS'e bağlandı, zone koruması aktif

---

## 6. Bu belge ne yapmaz?

- Uygulama kodunu değiştirmez; `firestore.rules`, App Check init ve chunk mimarisi
  zaten doğrulanmıştır (bkz. `DENETMEN_RAPORU.md`).
- Ücretli katman (Blaze, Cloudflare Pro, WAF Pro) önermez; gerekirse karar insana aittir.
- pages.dev üzerinde zone koruması **kuramaz** — bu bir Cloudflare sınırıdır, özeldomain
  olmadan 2. katman devre dışı kalır.

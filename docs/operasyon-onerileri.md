# Atlasia — Operasyon Önerileri

> **Kapsam:** Üretim operasyonu (Firebase + Cloudflare) için **karar önerileri**.
> Her başlık tek bir `KARAR:` satırı taşır. Buradaki hiçbir adım bu repo
> tarafından otomatik yapılmaz; konsol işleri **kullanıcı** tarafından yürütülür
> (`docs/firebase-uretim-kontrol-listesi.md`, `docs/deploy-runbook.md`,
> `docs/ddos-playbook.md` ile birlikte okunur).
>
> Bütün öneriler **$0 tavanı** (Spark + Cloudflare Free) gözetilerek yazılmıştır;
> paralı kalem açan her öneri ayrıca işaretlidir.

## 1. App Check Enforce zamanlaması ve izlenecek metrik

**Mevcut durum:** Uygulama `ReCaptchaEnterpriseProvider` ile token üretir
(`src/lib/firebase.ts`, `src/lib/appCheckConfig.ts`); konsolda **Enforce kapalı**,
kurallar tek yetkilendirme katmanıdır (`docs/firebase-uretim-kontrol-listesi.md` §3).

**Önerilen sıra:**

1. **Şimdi (günü gelmeden):** Token TTL'yi 7 güne çıkar (App Check → Apps →
   ⋯ → Advanced). Sebebi: SDK token'ı TTL'nin yarısında yeniler; varsayılan
   1 saatlik TTL aylık assessment kotasını patlatır (`docs/ddos-playbook.md` §2.1
   tablosu: 1 saat ≈ 15.000/ay ❌, 7 gün ≈ 2.150/ay ✅).
2. **Gözlem penceresi:** TTL ayarından itibaren **en az 1–2 hafta** boyunca
   Firestore/Storage istekleri App Check *izleme* modunda kalsın.
3. **Ölçülecek metrik (birincil):** Google Cloud Console → APIs & Services →
   **reCAPTCHA Enterprise → istek/assessment sayısı** (veya Firebase Console →
   App Check metrik kartı). Aylık **10.000 assessment** ücretsiz kotadır.
   Kotanın **%50'si (5.000/ay)** geçilince gözlem sıklığı haftalıkya iner;
   **%80'inde** enforce kararı bir kez daha gözden geçirilir.
4. **İkincil metrikler:** App Check token yenileme hataları (`429`,
   `app-check/fetch-status-error`), gerçek kullanıcı oturumlarında
   `app-check/invalid-token` sayısı. Bu hatalar kota/tarayıcı uyumu sorununun
   ilk sinyalidir.
5. **Enforce tetiği:** Gözlem penceresinde token hatası ≈ 0 ve assessment
   tüketimi öngörülebilir (aylık ≤ 3.000) ise **Enforce** açılır; yayılım
   ~15 dakikadır. Açtıktan sonra 24 saat eski önbellekli istemciler
   `app-check/invalid-token` alabilir — bu beklenen geçiştir.
6. **Geri alma:** Enforce kapatmak tek tıktır (aynı sekme). Kapatma nedeni ve
   saat not edilir; kural katmanları (rules) etkilenmez.

**KARAR: Enforce'u 7 günlük TTL + en az 1–2 hafta izleme penceresinden sonra,
birincil metrik aylık reCAPTCHA assessment sayısı (kota 10.000, eşiği 5.000)
olmak üzere aç | GEREKÇE: enforce kota bitiminde kullanıcı kaybına dönüşür
(429); TTL=7 gün tüketimi ~2.150/ay'a indirir ve ölçerek açmak riski düşürür |
ALTERNATİF: (a) hemen enforce — saldırı penceresini kapatır ama kota riski
bilinmeden açılır; (b) hiç enforce — rules tek katman kalır, anonim API
flood'u kota yakar | GERİ ALMA: App Check sekmesinde Enforce kapatılır;
uygulama kodu değişikliği istemez.**

## 2. Firebase bütçe uyarısı ve kota takibi

**Mevcut durum:** Plan **Spark** ($0 tavanı). Bütçe alarmı bir **billing
hesabı** ister; Spark'ta fatura olmayacağından asıl güvence **kota**
grafikleridir. Blaze'e geçiş (ör. SMS, Storage, Functions, scheduled export)
tek tıkla olur ve geri dönüşü pratikte yoktur — açık kullanıcı onayı ister
(`AGENTS.md`).

**Haftalık rutin (5 dk):**

| Kotalar (Spark günlük/aylık) | Nereden | Alarm eşiği (öneri) |
| --- | --- | --- |
| Firestore okuma 50.000/gün | Firebase Console → Usage | Günlük 25.000'i 2 gün üst üste aşarsa sorgu desenini gözden geçir |
| Firestore yazma 20.000/gün | Usage | 10.000/gün |
| Firestore silme 20.000/gün | Usage | 10.000/gün |
| Firestore depolama 1 GiB | Usage | 700 MiB |
| Firestore ağ çıkışı 10 GiB/ay | Usage | 7 GiB/ay |
| Auth MAU 50.000 | Authentication → Usage | 35.000 |
| reCAPTCHA assessment 10.000/ay | GCP → reCAPTCHA Enterprise | 5.000/ay (bkz. §1) |

- **Bütçe uyarısı:** Blaze'e geçildiği **gün** Google Cloud Billing → Budgets
  ile aylık bütçe alarmı kurulur (%50 / %90 / %100 e-postası). Spark'ta kurulmaz
  (billing hesabı zorunlu).
- Kota gece yarısı Pasifik saatiyle sıfırlanır; taşma anında "saldırı" değil
  "kota dolumu" da olabilir — Usage grafiğinde patlama deseni ayrıştırılır
  (`docs/ddos-playbook.md` §4 triage).
- Deploy/feature başına: yeni sorgu deseni ekleyen PR'larda sayfa başı okuma
  sayısı (`limit()` değerleri) teslimata yazılır; `firestoreValue`/cursor
  sayfaları büyütülmez.

**KARAR: Spark planında kal; haftalık kota takibini rutin yap; bütçe alarmını
yalnız Blaze'e geçiş günü kur | GEREKÇE: Spark'ta kota = fatura tavanıdır,
$0 garantisi budur; alarm billing hesabı istediğinden Spark'ta anlamsız |
ALTERNATİF: (a) şimdiden Blaze + bütçe alarmı — kota esnekliği + export imkânı
ama açık uçlu fatura riski; (b) bildirimle otomatik kota izleme (üçüncü taraf)
— ek karmaşıklık | GERİ ALMA: Blaze'te "Downgrade to Spark" (veri kalır ama
ücretli özellikler kapanır); alarm kurulumu geri alınabilir.**

## 3. Authorized domains listesi

**Konum:** Firebase Console → Authentication → Settings → **Authorized domains**.
Yetkisiz alan adından gelen popup/redirect `auth/unauthorized-domain` verir.

| Alan adı | Durum | Not |
| --- | --- | --- |
| `atlasia.pages.dev` | **Zorunlu** | Üretim |
| `<proje>.firebaseapp.com` | İsteğe bağlı | Varsayılan; e-posta linki/şablonlerinde geçebilir |
| Özel üretim alanı (ör. `atlasia.com`) | Alınırsa **eklenir** | Ayrıca Cloudflare zone'a bağlanır (`docs/ddos-playbook.md` §1) |
| Cloudflare Pages preview alt alanları (`<branch>.<proje>.pages.dev`) | İhtiyaç halinde | Preview'da OAuth/redirect testi gerekiyorsa eklenir; üretim güvenliği için listede kalmaları sakıncasızdır ama gereksizse eklenmez |
| Yerel geliştirme (`localhost`) | Eklenmez | Yerelde `http://localhost` Auth tarafından ayrı işle alınır; ek alan listeye yazılmaz |

- Liste **salt ekleme** ile büyütülür; kaldırma eski oturumları anında kesmez
  ama yeni token'ları reddeder — kaldırma gerektiğinde önce 30 gün trafikte
  kullanılmadığı doğrulanır.
- Bu repo Console erişimi olmadığından listenin **gerçek durumunu doğrulamaz**;
  kontrol kullanıcıya aittir (`docs/firebase-uretim-kontrol-listesi.md` §2).

**KARAR: Listeyi `atlasia.pages.dev` (zorunlu) + özel alan alınırsa o alan +
gerekli preview alt alanlarıyla sınırlı tut; `localhost` ekleme | GEREKÇE:
liste en az yetki ile en küçük tutulur; her ek alan kimlik doğrulama yüzeyini
genişletir | ALTERNATİF: wildcard ekleme — Firebase wildcard desteklemez,
gerçekten de mümkün değil | GERİ ALMA: Console'dan alan adı satırı silinir;
etkisi yeni oturumlar için anlıktır.**

## 4. Firestore yedeği (zamanlanmış export)

**Gerçek kısıt:** Ücretsiz (Spark) planda **scheduled (zamanlanmış) export
yoktur**; `gcloud firestore export` ve Cloud Scheduler **Blaze** ister.

| Seçenek | Maliyet | Kapsam | Risk |
| --- | --- | --- | --- |
| **A. Elle export (gcloud, kullanıcı makinesi)** | $0 (komut yerelde) | Anlık tam yedek, GCS'e (gerekirse +30 gün lifecycle) | Rutin unutulabilir |
| **B. Blaze + günlük Cloud Scheduler export** | Blaze geçiş + GCS depolama (~$0.026/GiB/ay) + okuma | Otomatik, denetimli | Açık uçlu fatura; aylık 1–2 $ ölçeği |
| **C. Yedek almak yerine geri alma disiplini** | $0 | Kurallar/veri değil yalnız kod (git) | Firestore içeriği kurtarılamaz |

**Öneri (sıra):** Veri hacmi küçükken **A** ile 2–4 haftada bir elle export
(alışkanlık + GCS bucket lifecycle 30 gün). Tazelik/kullanıcı verisi büyürse
(≈10 bin belge) **B**'ye geçiş kararı ayrıca verilir — o karar Blaze'e açık
onay demektir. Export **kuralları** yedeklemez (`firestore.rules` zaten git'te).

Elle export komutu (kullanıcı çalıştırır, proje açık yazılır):

```bash
gcloud firestore export gs://<yedek-bucket>/<tarih> --project=<onayli-proje-id>
```

**KARAR: Şu evrede elle periyodik export (A); otomatik zamanlanmış export için
Blaze'e geçişi ve bütçe alarmını içeren ayrı karar | GEREKÇE: Spark $0 tavanını
bozmadan yedeklenebilir; scheduled export Blaze zorunlu olduğu için bugünden
fatura kapısı açılmaz | ALTERNATİF: (B) günlük otomatik export — en güvenli
ama Blaze + GCS maliyeti ve açık onay şartı; (C) yalnızca git — veri
kurtarmayı imkânsız kılar | GERİ ALMA: (A)'da geri alınacak bir şey yok;
(B)'ye geçildiyse scheduler job silinir + Blaze downgrade (dikkat: ücretli
özellikler kapanır).**

## 5. `docs/ddos-playbook.md` ↔ Cloudflare ayarları karşılaştırma kontrol listesi

Playbook'taki her adımın konsolda **gerçekleştiğini** doğrulamak için. "Durum"
sütunu kullanıcı tarafından doldurulur; repo bunu doğrulayamaz.

| # | Playbook adımı | Cloudflare/Firebase konumu | Beklenen | Durum (kullanıcı doldurur) |
| --- | --- | --- | --- | --- |
| 1 | Platform DDoS emilimi | Pages ile gelir | Ek ayar yok; varsayılan açık | ☐ |
| 2 | Bot Fight Mode | Security → Bots | ON (yalnız zone'lu alan adında çalışır) | ☐ |
| 3 | Rate-limit kuralı `atlasia-ip-flood` | Security → WAF → Rate limiting | 200 istek / 10 sn → Block 1 saat; **Deploy edildi** | ☐ |
| 4 | Under Attack Mode | Security → Settings → Security Level | Kapalı (yalnız saldırı anında açılır) | ☐ |
| 5 | Security → Analytics izleme | Security → Analytics | Son 24 s trafik/bot oranı inceleniyor | ☐ |
| 6 | App Check Token TTL = 7 gün | Firebase → App Check → Apps → ⋯ | 7 gün (bkz. §1) | ☐ |
| 7 | App Check Enforce | Firebase → App Check | Şu an kapalı; §1 planına bağlı | ☐ |
| 8 | Plan Spark | Project settings → Details | Spark ($0 tavanı) | ☐ |
| 9 | Phone auth kapalı | Authentication → Sign-in method → Phone | **Disabled** (kalıcı karar, bkz. §6) | ☐ |
| 10 | Kota takibi rutini | Usage + GCP reCAPTCHA | §2 tablosu haftalık bakılıyor | ☐ |
| 11 | Authorized domains | Authentication → Settings | §3 listesiyle aynı | ☐ |
| 12 | IP Access Rules **kullanılmıyor** | Security → WAF → Tools | Liste boş (Bot Fight Mode kapanmasın) | ☐ |

**KARAR: Karşılaştırma listesini her ay (ve her güvenlik olayından sonra)
kullanıcıyla birlikte tazele; 12 maddenin durum sütunu konsoldan işaretlenir |
GEREKÇE: playbook yazmak ayarı yapmak değildir; drift'i yalnız rutin yakalar
(TTL sıfırlanması, rate-limit silinmesi vb.) | ALTERNATİF: ayarı yap-audit et
scripti — Cloudflare/Firebase API anahtarı ve servis hesabı gerektirir, bu
repoya sırrı sokmak yasaktır | GERİ ALMA: liste yalnız dokümandır; silinmesi
risksizdir ama önerilmez.**

## 6. Telefon/SMS girişi kalıcı kapalı

**Bağlantılı karar (teslimat maddesi):** Telefon girişi **kalıcı kapalı**
kalsın. Uygulama bayrağı `VITE_PHONE_AUTH_ENABLED` varsayılan kapalı; düğme
render edilmez; Console'da Phone sağlayıcısı kapalı tutulur. SMS, Blaze
zorunlu + SMS pumping ($$) riski taşıyan tek para sızıntısıdır
(`docs/ddos-playbook.md` §2.3). **Kod değişikliği gerekmiyor** (bayrak zaten
var, `.env.example` ve üretim kontrol listesi belgeli).

**KARAR: Telefon/SMS girişi kalıcı kapalı kalsın; VITE_PHONE_AUTH_ENABLED
açılmaz, Console'da Phone disabled kalır | GEREKÇE: SMS Blaze zorunlu ve
pumping'a açık tek doğrudan maliyet kalemi; e-posta + OAuth + cihaz hesabı
aynı işi $0 yapar | ALTERNATİF: yalnız test numaralarıyla geçici açma —
geliştirme ihtiyacı olursa Console'dan test numarası tanımlanır, kod/bayrak
değiştirilmez | GERİ ALMA: karar değişirse Console'da Phone açılır +
bayrak true yapılır; ek maliyet bütçe alarmını zorunlu kılar (§2).**

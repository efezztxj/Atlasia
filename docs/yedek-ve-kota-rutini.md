# Atlasia — Spark ($0) Yedek ve Haftalık Kota Rutini

Bu kılavuz, **Spark planını ($0 tavanı) bozmadan** canlı Firestore verisini yedeklemek, yedek bütünlüğünü doğrulamak ve haftalık kota/App Check metriklerini 5 dakikada takip etmek için hazırlanmıştır.

> **Neden `gcloud firestore export` değil?**
> Google Cloud yönetimli dışa aktarma (`gcloud firestore export gs://...`) hem **Blaze (faturalı)** plan hem de **Cloud Storage bucket** gerektirir. Spark planında kalındığı sürece `scripts/firestore-backup.mjs` Firestore REST v1 okuma uçlarıyla veriyi doğrudan kendi bilgisayarındaki git-dışı `backups/` klasörüne indirir.

---

## 1. Tek Komutla Yerel Firestore Yedeği (`$0`)

### Önkoşul (tek seferlik)
Bilgisayarında Google Cloud CLI (`gcloud`) ile Firebase proje sahibi hesabına giriş yapmış olman yeterlidir (`gcloud auth login`). Repoya veya `.env` dosyasına **hiçbir anahtar/servis hesabı yazılmaz**.

### Adım 1 — Kota ön kontrolü (`--dry-run`, diske yazmaz)
```bash
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
  node scripts/firestore-backup.mjs --project <uretim-proje-id> --dry-run
```
- `<uretim-proje-id>` yerine Cloudflare Pages Production’daki `VITE_FIREBASE_PROJECT_ID` değerini yaz (`atlasia-dev` yazarsan güvenlik kilidi reddeder).

### Adım 2 — Tam yedek alma (`backups/` altına yazar)
```bash
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
  node scripts/firestore-backup.mjs --project <uretim-proje-id>
```
- Varsayılan güvenlik tavanı `--max-reads 5000`’dir (Spark günlük `50.000` okuma kotasının `%10`’u). Belge sayısı büyürse `--max-reads 15000` gibi açık tavan verilebilir.
- Hayalet ebeveyn belgeler (`users/{uid}`) altında duran `savedPlaces`, `savedRoutes`, `groups`, `groupInvites`, `notifications`, `blocks`, `friendRequests`, `friends`, `following` ile `posts/*/replies` ve `groups/*/{messages,joinAttempts,invites}` alt koleksiyonları otomatik taranır.
- Çıktı `backups/<proje>-<zaman>/` içine yazılır (`.gitignore` tarafından korunur, Git’e girmez).

### Adım 3 — Yedek bütünlüğünü doğrulama (`0` okuma, çevrimdışı)
```bash
node scripts/firestore-backup.mjs --verify backups/<proje>-<zaman>/manifest.json
```
- Her `.ndjson` dosyasının SHA-256 özetini, JSON geçerliliğini ve toplam belge sayısını ağa çıkmadan doğrular.

### Saklama politikası
- En son **3 tam yedeği** şifreli yerel diskte (veya kişisel şifreli bulut sürücünde) tut; daha eski kopyaları sil.
- Her `firestore.rules` değişikliği veya veri temizliği öncesinde mutlaka taze bir yedek al.

### Adım 4 — Geri Yükleme (Restore) ve `$0` Tatbikat Rutini (`P1-7 / M-58`)
Yedek geri yüklenemiyorsa yedek değildir. `scripts/firestore-restore.mjs` yazmadan önce her `.ndjson` dosyasının SHA-256 özetini doğrular ve varsayılan olarak yalnız `--dry-run` planı üretir:

```bash
# 1) Ağa yazmadan geri yükleme planını ve Spark yazma kotası payını gör (--dry-run varsayılan)
npm run restore:firestore -- --manifest backups/<proje>-<zaman>/manifest.json --target-project atlasia-restore-drill

# 2) Yerel Firestore Emülatörüne $0 maliyetle geri yükleme tatbikatı
npm run restore:firestore -- \
  --manifest backups/<proje>-<zaman>/manifest.json \
  --target-project atlasia-restore-drill \
  --confirm-project atlasia-restore-drill \
  --emulator 127.0.0.1:8080 \
  --apply

# 3) Canlı kurtarma (önce ayrı kurtarma projesine; aynı kaynak projeye yazmak için --allow-overwrite-source da zorunludur)
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
  npm run restore:firestore -- \
  --manifest backups/<proje>-<zaman>/manifest.json \
  --target-project <kurtarma-proje-id> \
  --confirm-project <kurtarma-proje-id> \
  --apply
```
- Varsayılan yazma tavanı `--max-writes 2000`’dir (Spark günlük `20.000` yazma sınırının `%10`’u); aşılırsa tek bir belge bile yazılmadan durur.
- Yalnız belirli koleksiyonları kurtarmak için `--collections places,routes` filtresi verilebilir.

---

## 2. Haftalık 5 Dakikalık Kota ve Güvenlik Rutini

Her hafta aynı gün (ör. Pazartesi) aşağıdaki tabloyu kontrol et:

| Kontrol Kalemi | Nereden Bakılır | Spark Ücretsiz Sınır | İnceleme Eşiği |
| --- | --- | --- | --- |
| Firestore Okuma | Firebase Console → Firestore → **Usage** | `50.000 / gün` | Üst üste 2 gün `> 25.000 / gün` |
| Firestore Yazma | Firebase Console → Firestore → **Usage** | `20.000 / gün` | `> 10.000 / gün` |
| Firestore Silme | Firebase Console → Firestore → **Usage** | `20.000 / gün` | `> 10.000 / gün` |
| Firestore Depolama | Firebase Console → Firestore → **Usage** | `1 GiB` toplam | `> 700 MiB` (`%70` dolulukta temizlik rutini çalıştırılır) |
| Firestore Ağ Çıkışı | Firebase Console → Firestore → **Usage** | `10 GiB / ay` | `> 7 GiB / ay` |
| Auth Aylık Aktif (MAU) | Firebase Console → Authentication → **Usage** | `50.000 / ay` | `> 35.000 / ay` |
| reCAPTCHA Assessment | Google Cloud → Security → **reCAPTCHA Enterprise** | `10.000 / ay` | `> 5.000 / ay` (App Check TTL=7 gün kontrolü) |
| App Check Token Hataları | Firebase Console → **App Check → APIs** | İzleme modu | `invalid-token` / `429` artışı varsa Enforce **açılmaz** |

### App Check Enforce Karar Kapısı (1–2 Hafta İzleme Sonrası)
1. `Token TTL = 7 days` ayarlandıktan sonra **1–2 hafta** boyunca Unenforced (izleme) metriklerini gözle.
2. Aylık reCAPTCHA assessment tüketimi `<= 3.000` bandındaysa ve doğrulanmış istemci dışı (`unverified`) istek oranı gerçek kullanıcılardan kaynaklanmıyorsa **Cloud Firestore** için **Enforce** açılabilir.
3. Herhangi bir erişim sorununda aynı sekmeden tek tıkla **Unenforce** yapılarak anında geri alınır (`firestore.rules` zaten tekil yetkilendirme katmanı olarak kalır).

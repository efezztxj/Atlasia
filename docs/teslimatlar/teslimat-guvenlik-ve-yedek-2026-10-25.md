# Teslimat: Üretim Güvenlik Kilidi + Spark Yedek ve Kota Takibi (2026-10-25)

## 1. Görev ve Dal Özeti
- **Görev:** Sunucu yol haritası Madde 1 (*Üretim güvenlik ayarlarını kilitle*) depo kapıları + Madde 2 (*Spark planında yedek ve kota takibi*).
- **Dal (branch):** `arena/58c4badc-atlasia`
- **Taban commit (`main`):** `25e1d35106ec3024065977abd8474240c0291839` (PR #102 birleşimi sonrası güncel `main`)

## 2. Canlı Durum ile Depo Kanıtı Ayrımı (Dürüstlük Kaydı)
- **Canlıda kanıtlananlar (GitHub API / Actions üzerinden):**
  - PR #102 (`25e1d35`) `main` dalına birleşti; `Atlasia CI` (`40229171608`) ve `Cloudflare Pages` üretim dağıtımı (`8bc929ec-6498-4d67-9a3d-9bccf245e126`) **SUCCESS**.
  - Güncel `firestore.rules` boyutu PR #98 birleşimiyle birlikte **`1.215` satır, `31` `match` bloğu** (`SHA-256: a97def5c38fa00e41ddee5096e2ad96c602047b82658c3319f30bc3aa395a2d5`); `firestore.indexes.json` **`56` satır** (`SHA-256: 6c588cc861c018618537c97beb589099e2617def46c1b604a9bee86802152f59`).
- **Canlı Console tarafı (ekran görüntüsü kanıtı olmadan “aktif” sayılmayanlar):**
  - Kullanıcı Console adımlarını kontrol ettiğini beyan etti (`"yaptım"`), ancak bu oturuma ekran görüntüsü veya CLI çıktısı eklenmediği için Cloudflare/Firebase Console içi anahtarlar (Phone Disabled, Authorized Domains, App Check 7 gün TTL, canlı Rules son yayın zaman damgası) repoda “otomasyonla kanıtlanmış” olarak **işaretlenmedi**.

## 3. Değişen ve Eklenen Dosyalar
- `scripts/verify-env.mjs` — Cloudflare Pages (`CF_PAGES=1`) üzerinde `VITE_APPCHECK_DEBUG_TOKEN` sızıntısını hem `main` hem `preview` dallarında engelleyen; üretim (`CF_PAGES_BRANCH=main`) dalında ise `VITE_FIREBASE_PROJECT_ID=atlasia-dev` ve `VITE_PHONE_AUTH_ENABLED=true` yanlış yapılandırmalarını anında kıran build kapısı.
- `scripts/verify-env.node-test.mjs` — Yeni üretim güvenlik kilitleri ve sır sızdırmama garantisi için birim testleri.
- `scripts/firestore-backup.mjs` — Blaze veya Cloud Storage gerektirmeyen, Spark ($0) uyumlu Firestore REST v1 yerel NDJSON yedekleme, `--max-reads` kota tavanı, hayalet `users/{uid}` alt koleksiyon taraması ve `--verify` SHA-256 bütünlük doğrulama aracı.
- `scripts/firestore-backup.node-test.mjs` — Proje kilidi (`atlasia-dev` reddi), kota tavanı, hayalet ebeveyn + alt koleksiyon yedeği, token sızdırmama ve bozuk dosya yakalama testleri.
- `.gitignore` — Yerel yedeklerin yanlışlıkla Git’e girmesini önlemek için `backups/` kuralı.
- `docs/yedek-ve-kota-rutini.md` — Operatör için tek komutluk Spark yedekleme, doğrulama ve 5 dakikalık haftalık kota/App Check izleme prosedürü.
- `docs/firebase-uretim-kontrol-listesi.md`, `docs/moderasyon-akisi.md`, `docs/operasyon-onerileri.md` — Eksik `--project <onayli-proje-id>` bayraklarının tamamlanması ve Spark yerel yedek prosedürünün bağlanması.

## 4. Kilitli Dosya ve Çakışma Kontrolü
- `src/` altındaki hiçbir uygulama/UI dosyasına, `MapView.tsx`’e, `firestore.rules`’a, `package.json`’a ve açık PR #103’ün dokunduğu hiçbir dosyaya **dokunulmadı** (`0` çakışma, `0 B` istemci bundle etkisi).

## 5. Bilinen Riskler ve Sonraki Görev
- Büyük veri hacimlerinde (>25.000 belge) REST tabanlı okuma yedeği Spark günlük okuma kotasının önemli kısmını tüketir; o ölçeğe gelindiğinde Blaze + yönetimli GCS export kararı ayrıca değerlendirilmelidir.
- **Sıradaki adım (Madde 3):** Moderasyon arka ucu / yetkili inceleme akışı için mevcut PR #98 altyapısının (`moderators/{uid}`, `bans/{uid}`, içerik gizleme/bildirim eksikleri) tasarım ve seçenek analizi.

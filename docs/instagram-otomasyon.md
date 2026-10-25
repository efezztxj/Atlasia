# Atlasia · Instagram tam otomatik yayın

Kuyruğa bir JSON bırakıyorsun, GitHub Actions zamanı gelince Reels'i kendisi
yayınlıyor. Elle hiçbir şey yapmıyorsun.

```
social/queue/2026-10-27-kyoto.json   →   Actions (15 dk'da bir)   →   Instagram Reels
                                              ↓
                         social-archive dalı → social/published/…json
```

**Arşiv neden `social-archive` dalında?** `main` korumalı (inceleme zorunlu), bu
yüzden `GITHUB_TOKEN` oraya doğrudan push edemez. Arşiv ayrı bir dalda tutulur;
iş her çalıştığında o dalı `main` ile birleştirir, yayın kaydını üstüne ekler ve
geri gönderir. Senin bir şey yapman gerekmiyor.

---

## 1. Instagram tarafı (bir kez yapılır)

1. Instagram hesabını **Business** veya **Creator** yap (Ayarlar → Hesap türü).
   Kişisel hesap API ile paylaşım yapamaz.
2. Meta for Developers'ta uygulama aç → **Instagram** ürününü ekle.
3. İzin: `instagram_basic`, `instagram_content_publish`, `pages_show_list`.
   *App Review* istiyor; genelde 1–3 hafta sürer.
4. Uzun ömürlü erişim jetonu al (~60 gün) ve **IG User ID**'yi not et.

> **Instagram Login** kullanırsan Facebook Sayfası gerekmez — daha hızlı onay.
> O durumda `IG_LOGIN_TYPE` değişkenini `instagram` yap.

---

## 2. GitHub tarafı (bir kez yapılır)

**Settings → Secrets and variables → Actions**

| Tür | Ad | Değer |
|---|---|---|
| Secret | `IG_ACCESS_TOKEN` | Uzun ömürlü jeton |
| Secret | `IG_USER_ID` | Instagram kullanıcı kimliği |
| Variable *(opsiyonel)* | `IG_LOGIN_TYPE` | `facebook` (varsayılan) veya `instagram` |
| Variable *(opsiyonel)* | `IG_API_VERSION` | `v26.0` (varsayılan) |

**Settings → Actions → General → Workflow permissions** → *Read and write permissions*
(arşiv dalına commit gönderileceği için gerekli).

Jetonları **asla** repoya, koda ya da sohbete yazma. 60 günde bir yenile;
yenilemezsen yayın `hata kodu 190` ile durur ve iş akışı bunu Türkçe söyler.

---

## 3. Video nereye konur?

Instagram API medyayı **herkese açık bir HTTPS adresinden** indirir. Google Drive
linki çalışmaz (yönlendirme + giriş duvarı).

Bu repoda en kolay yol:

```bash
cp reklam/yuruyus-serisi/kyoto-yuruyus.mp4 public/social/
```

`main` dalına merge edilince Cloudflare Pages yayınlar ve dosya şurada yaşar:

```
https://atlasia.pages.dev/social/kyoto-yuruyus.mp4
```

Tarayıcıda **gizli sekmede** açıp test et — açılıyorsa Instagram de indirebilir.
İstersen başka bir CDN/S3 adresi de kullanabilirsin; `mediaUrl` sadece HTTPS olmalı.

---

## 4. Bir gönderiyi kuyruğa ekle

`social/queue/<id>.json`:

```json
{
  "id": "2026-10-27-kyoto",
  "scheduledFor": "2026-10-27T18:00:00+03:00",
  "mediaType": "REELS",
  "mediaUrl": "https://atlasia.pages.dev/social/kyoto-yuruyus.mp4",
  "caption": "10.000 kapı var, hangisinden geçeceğini kimse söylemiyor.\n\nYotsutsuji 30 dakika.\n\n#gezi #kyoto #atlasia",
  "shareToFeed": true,
  "coverUrl": null
}
```

| Alan | Zorunlu | Not |
|---|---|---|
| `id` | ✅ | Dosya adıyla aynı olsun; arşivde kimlik olarak kullanılır |
| `mediaUrl` | ✅ | Herkese açık HTTPS |
| `caption` | ✅ | En fazla 2.200 karakter, en fazla 30 hashtag |
| `scheduledFor` | — | ISO-8601. Yoksa ilk çalıştırmada yayınlanır |
| `mediaType` | — | `REELS` (varsayılan), `IMAGE`, `STORIES` |
| `shareToFeed` | — | `false` ise Reels akışta görünmez |
| `coverUrl` | — | Kapak görseli (HTTPS) |

`*.example.json` dosyaları **hiç yayınlanmaz** — şablon olarak durabilir.

---

## 5. Elle deneme

**Actions → Atlasia Instagram yayını → Run workflow**

- `dry_run` varsayılan **açık**: hiçbir şey yayınlamaz, sadece doğrular.
  Önce bununla dene.
- Gerçek yayın için `dry_run` kutusunu kaldır.
- Tek bir kaydı zorla yayınlamak için `post_id` alanına kimliği yaz
  (zamanı gelmemiş olsa bile gider).

Yerelde:

```bash
npm run test:social                                  # 19 test, kimlik gerekmez
node scripts/publish-instagram.mjs --due --dry-run    # doğrula
IG_ACCESS_TOKEN=... IG_USER_ID=... npm run social:publish -- --due
```

---

## Sınırlar (Meta tarafı)

- **24 saatte en fazla 100 API gönderisi.**
- Container **24 saat** içinde yayınlanmazsa `EXPIRED` olur.
- Video: **9:16**, **5–90 saniye**, MP4/H.264 + AAC. Bu repodaki Yürüyüş Serisi
  videoları 1080×1920, 10–12,7 sn, H.264/AAC — hepsi uyumlu.
- Video işleme asenkron: betik `status_code` `FINISHED` olana kadar bekler
  (varsayılan en fazla 10 dakika).

---

## `schedule` neden çalışmıyor?

GitHub, zamanlanmış iş akışlarını **yalnızca varsayılan dalda** çalıştırır.
Yani otomatik yayının başlaması için bu iş akışının `main`'e merge edilmiş olması
gerekir. `workflow_dispatch` (elle tetikleme) her dalda çalışır.

Ayrıca GitHub cron'u yoğun saatlerde birkaç dakika geciktirebilir; bu yüzden
aralık 15 dakika seçildi.

**Kuyruk boşken iş hemen çıkar.** İlk adım `social/queue/` içinde gerçek kayıt
arıyor (`*.example.json` sayılmaz). Yoksa geri kalan adımlar atlanır; boş koşu
~10 saniye sürer, sırlar eksikken de hata üretmez.

---

## Sorun giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| `Jetona erişim geçersiz` | Jeton süresi doldu (60 gün) | Yenile, `IG_ACCESS_TOKEN` güncelle |
| `Medya indirilemedi` | `mediaUrl` herkese açık değil / Drive linki | Gizli sekmede test et |
| `Desteklenmeyen video formatı` | Kodek / oran / süre | 9:16, H.264, 5–90 sn |
| `24 saatte 100 API yayın sınırı` | Kota | Ertesi gün devam |
| Arşiv commit'i reddedildi | İzin yok | Settings → Actions → Read and write |
| `arşiv dalı main ile birleştirilemedi` | `social/` altında elle yapılmış bir değişiklik çakışıyor | `git diff main social-archive -- social` ile bak |

Çift yayın koruması: aynı `id` arşivde (`social-archive` → `social/published/`)
varsa betik onu atlar. Yayın başarılı olup arşiv push'u düşerse, aynı gönderi
tekrar gidebilir — bu yüzden "Yayınlananları arşivle" adımı `if: always()` ile
çalışır.

Arşivi görmek için:

```bash
git fetch origin social-archive
git log --oneline origin/social-archive
git show origin/social-archive:social/published
```

---

## İlgili dosyalar

| Dosya | İş |
|---|---|
| `.github/workflows/insta-publish.yml` | Zamanlanmış + elle tetiklenen iş akışı |
| `scripts/publish-instagram.mjs` | Graph API container akışı, kuyruk, arşiv |
| `scripts/publish-instagram.node-test.mjs` | 19 test, kimlik bilgisi gerektirmez |
| `social/queue/` | Yayın bekleyen kayıtlar |
| `social/published/` | Yayınlanmış kayıtların arşivi (workflow `social-archive` dalında tutar) |

# Atlasia · Resend e-posta hattı

Doğrulama ve şifre yenileme e-postalarını **kendi alan adımızdan**, Atlasia'nın
kendi Türkçe şablonuyla göndermek için kurulan hat.

```
Kullanıcı (tarayıcı)                    Cloudflare Worker            Resend
─────────────────────                   ──────────────────           ──────
Firebase ID token  ──── POST /  ────▶   kimliği Firebase'e sorar
                                        işlem bağlantısını üretir  ──▶  api.resend.com
                                        Türkçe HTML şablonu                │
                                                                           ▼
                                                                     Kullanıcının gelen kutusu
```

**Neden Firebase'in kendi e-postası değil?** Firebase bu projede şablon
güncellemesini `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED` ile engelliyor ve gönderen
adresi `*.firebaseapp.com` olarak kalıyor (`AUTH_SETUP.md` §Doğrulama
e-postaları). Resend hattı, göndereni ve tasarımı tamamen bize veriyor.

---

## 0. Ne değişti, ne değişmedi

| Konu | Durum |
| --- | --- |
| Doğrulama e-postası | `VITE_MAIL_ENDPOINT` doluysa **Resend hattı**, değilse Firebase (eski davranış) |
| Şifre sıfırlama | Aynı bayrak: **yalnız oturum açık ve kendi adresi** için hat; diğer durumda Firebase |
| Hesap kimliği / giriş | Değişmedi — Firebase Auth aynı kalıyor |
| Firestore kuralları | Değişmedi |
| Ücret | Resend Free (3.000/ay, **100/gün**) + alan adı; Worker ücretsiz kotada |

Bayrak kapalıyken hiçbir istek yapılmaz; kod yolu eskisiyle aynıdır.

---

## 1. Ön koşul: kendi alan adı (zorunlu)

Resend, **doğrulanmış** bir alan adı olmadan yalnızca kendi hesabına
(`onboarding@resend.dev`) mail atar. Kullanıcıya mail için alan adı şart.
`atlasia.pages.dev` bizim DNS'imizde olmadığı için gönderen olamaz.

1. Alan adı al (`atlasia.app` benzeri) ve **Cloudflare DNS**'e ekle
   (`docs/ddos-playbook.md` §1 ile aynı zone).
2. Resend hesabı aç → **Domains → Add domain** → `mail.atlasia.app` gibi bir
   **alt alan adı** yaz. Kök alan yerine alt alan kullan: işlem e-postasının
   itibarı pazarlama/duyuru postasından ayrı kalır.
3. Panelin verdiği kayıtları DNS'e gir. Biçim (değerler hesaba özeldir):

   | Tür | Ad | Değer | Not |
   | --- | --- | --- | --- |
   | TXT | `send.mail.atlasia.app` | `v=spf1 include:amazonses.com ~all` | Resend Amazon SES üzerinden gönderir |
   | MX | `send.mail.atlasia.app` | `feedback-smtp.<region>.amazonses.com` (10) | Bounce/şikâyet dönüşü |
   | CNAME ×3 | `<token>._domainkey.mail.atlasia.app` | `<token>.dkim.amazonses.com` | SES Easy DKIM; eski hesaplarda tek `resend._domainkey` TXT olabilir |
   | TXT | `_dmarc.mail.atlasia.app` | `v=DMARC1; p=none; rua=mailto:dmarc@atlasia.app` | Gözlem modu; sonra `quarantine` |

4. Doğrulamayı panelden önce **yerelden** kontrol et:

   ```bash
   npm run resend:dns -- --domain mail.atlasia.app
   # DKIM seçicisi panelde farklıysa:
   npm run resend:dns -- --domain mail.atlasia.app --dkim-selector resend
   ```

   Çıkış kodu `0` → zorunlu kayıtlar tamam, `1` → eksik kayıt, `2` → alan adı
   hiç çözülmüyor. Yalnız genel DNS okunur; anahtar/jeton kullanılmaz.

5. Panelde **Verify** → durum `Verified` olmalı. Sonra **API Keys → Create**
   (`re_...`, yalnız *Sending access*).

> Resend limitleri: Free 3.000/ay ve **100/gün**; limit dolunca gönderim durur
> (sürpriz fatura yok). Saniyede 2 istek sınırı vardır; Auth akışı için yeterli.

---

## 2. Worker'ı yayına al (operatör, bir kez)

```bash
npx --yes wrangler@4.154.0 login
npx --yes wrangler@4.154.0 kv namespace create atlasia_eposta_sinir \
  --config workers/eposta/wrangler.toml
```

Çıktıdaki `id` değerini `workers/eposta/wrangler.toml` içindeki
`[[kv_namespaces]]` bloğuna yaz (blok yorumlu duruyor; aç ve doldur).
**Sayaç deposu yoksa Worker e-posta göndermez** (`503 hat/sinir-yok`): anonim
sınırsız gönderim bilinçli olarak imkânsız.

```bash
npx --yes wrangler@4.154.0 secret put RESEND_API_KEY --config workers/eposta/wrangler.toml
npx --yes wrangler@4.154.0 secret put FIREBASE_API_KEY --config workers/eposta/wrangler.toml
npx --yes wrangler@4.154.0 secret put MAIL_FROM        --config workers/eposta/wrangler.toml
npx --yes wrangler@4.154.0 secret put FEEDBACK_TO      --config workers/eposta/wrangler.toml
npx --yes wrangler@4.154.0 secret put REPLY_TO         --config workers/eposta/wrangler.toml
```

| Secret | Değer | Not |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_...` | Yalnız Worker'da; `VITE_` değil |
| `MAIL_FROM` | `Atlasia <no-reply@mail.atlasia.app>` | Alan adı Resend'de doğrulanmış olmalı |
| `FIREBASE_API_KEY` | Firebase web API anahtarı | Yalnız `accounts:sendOobCode`/`lookup` için |
| `FEEDBACK_TO` | `ekip@atlasia.app` | Geri bildirim alıcısı (yoksa o uç 503 döner) |
| `REPLY_TO` | opsiyonel | Yanıtların gideceği adres |

Sonra:

```bash
npx --yes wrangler@4.154.0 deploy --config workers/eposta/wrangler.toml
curl -s https://atlasia-eposta.<hesap>.workers.dev/saglik
# {"ok":true,"resend":true,"firebaseKey":true,"rateLimit":true,"kinds":[...]}
```

`resend`, `firebaseKey`, `rateLimit` üçü de `true` olmalı. Sağlık ucu sır
döndürmez; yalnız "var/yok" der.

---

## 3. İstemciyi bağla (2 dakika)

Cloudflare Pages → *atlasia* → **Settings → Environment variables → Production**:

```text
VITE_MAIL_ENDPOINT = https://atlasia-eposta.<hesap>.workers.dev/
VITE_APP_ORIGIN    = https://atlasia.app/        # kendi alan adın; yoksa boş bırak
```

- Pages değerleri **build sırasında** gömülür → yeniden deploy et.
- `VITE_APP_ORIGIN` değişirse Firebase Console → **Authentication → Settings →
  Authorized domains** listesine yeni alanı ekle, yoksa bağlantı dönüşü
  `auth/unauthorized-domain` verir.
- Preview ortamına ayrı değer girme; hat yalnız üretim origin'ine CORS açar
  (`ALLOWED_ORIGINS`).

---

## 4. Doğrulama (canlı, 10 dakika)

1. Yeni bir e-posta/şifre hesabı aç → doğrulama e-postası **`Atlasia
   <no-reply@mail.atlasia.app>`** göndereninden gelmeli.
2. Başlık: `Atlasia · E-posta adresini doğrula`; gövde Türkçe, koyu tema, tek
   düğme + yedek bağlantı.
3. Bağlantı doğru adrese dönmeli (`VITE_APP_ORIGIN`).
4. Resend paneli → **Emails**: kayıt `Delivered` olmalı. `Bounced`/`Complained`
   görürsen alan adı veya DMARC ayarını kontrol et.
5. Profil panelinde **"Doğrulama e-postasını yeniden gönder"** → yeni mail gelir;
   aynı hesap için 6. istek `429` almalı (saatlik 5 sınırı).
6. Gmail'de "Spam"e düşüyorsa: DKIM `pass`, SPF `pass`, DMARC `pass` mı?
   (`show original`). Üçü de geçiyorsa birkaç gün gönderim hacmini artırma.

---

## 5. Bilinen sınırlar (dürüst liste)

- **Oturumsuz "şifremi unuttum"** hâlâ Firebase'den gider. Worker yalnız ID
  token sahibinin **kendi** adresine mail atar; token'sız bir akış, adresin
  kayıtlı olup olmadığını dışarı sızdırır (enumeration). Bu bilinçli bir
  güvenlik tercihi. Markalı şifre sıfırlama şartsa: Worker'a **App Check**
  doğrulamalı ayrı bir uç nokta eklenmeli ve Firebase'in
  `PASSWORD_RESET` bağlantısı üretilirken e-posta var/yok ayrımı loglanmamalı.
- **Firebase `sendOobCode` + `returnOobLink`** bazı projelerde kapalıdır
  (`OPERATION_NOT_ALLOWED`). O durumda Worker `hat/link-desteklenmiyor` döner,
  istemci Firebase gönderimine düşer — kullanıcı e-postasız kalmaz ama şablon
  markalı olmaz. Bu durumda kod yolu B (kendi `oobCode` üretimi) gerekir.
- **Geri bildirim formu** (`FeedbackDialog`) hâlâ Firestore'a yazıyor; hattın
  `feedback` türü hazır ama istemciye bağlanmadı (ayrı görev, ayrı onay).
- Resend Free günlük 100 sınırı: toplu duyuru planlanırsa Pro ($20/ay) gerekir.
- Hız sınırı `KV` sayacıyla saatlik 5'tir; Firebase'in kendi 5/saat sınırından
  bağımsızdır ve Worker tarafında uygulanır.

---

## 6. Geri alma

1. Cloudflare Pages → `VITE_MAIL_ENDPOINT` değişkenini **sil** → yeniden deploy.
   İstemci anında Firebase gönderimine döner; Worker'ı silmek gerekmez.
2. Tamamen kaldırmak için: `wrangler delete --config workers/eposta/wrangler.toml`
   ve Resend panelinde alan adını kaldır. `AUTH_SETUP.md` yeniden tek kaynak olur.

---

## 7. Maliyet

| Kalem | Tutar |
| --- | --- |
| Alan adı | ~$10–15/yıl |
| Resend Free | $0 — 3.000/ay, 100/gün |
| Cloudflare Worker | $0 (günlük 100 bin istek kotası) |
| **Toplam** | **~$1/ay** |

---

## 8. Kaynaklar

- Resend — Send with SMTP / API: <https://resend.com/docs/send-with-smtp>
- Resend — Verified domains: <https://resend.com/docs/dashboard/domains/introduction>
- Firebase — Email action links: <https://firebase.google.com/docs/auth/admin/email-action-links>
- Firebase — Custom email handler: <https://firebase.google.com/docs/auth/custom-email-handler>
- İlgili depo belgeleri: `AUTH_SETUP.md`, `docs/firebase-uretim-kontrol-listesi.md`,
  `workers/eposta/README.md`

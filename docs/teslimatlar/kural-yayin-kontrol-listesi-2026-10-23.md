# Firestore Rules — yayın kontrol listesi (2026-10-23)

**Hüküm:** ⏳ **Yayın gerekiyor, yapılmadı.** Depodaki `firestore.rules` main'deki son sürüm; canlı Firestore kurallarının bu sürümle aynı olduğu **doğrulanmadı**. Bu belge yayını tek adıma indirir ve yayın sonrası doğrulamayı verir.

Neden: Son doğrulanmış canlı yayın `docs/denetim/canli-rules-farki-2026-10-22.md` içinde **2026-10-22, main `2b03f2f`** olarak kayıtlı. O tarihten sonra main'e kural değişiklikleri girdi (doğrulama belge kimliği, `users/{uid}/following`, `userProfiles` güncelleme yolu, `notificationProof` + `friendDeclineProof`). Fark varsa sosyal özellikler canlıda **"Missing or insufficient permissions"** verir.

---

## 1) Yayın sırası — önce istemci, sonra kural

| Sıra | Ne | Neden bu sıra |
|---|---|---|
| 1 | İstemci yayında (Cloudflare Pages, `main`) | Yeni istemci eski kuralla da çalışır: kimlik denetimi olmayan eski kural, yeni `{placeId}_{uid}` yazımını reddetmez. |
| 2 | `firestore.rules` yayınla | Ters sıra, eski istemcide `permission-denied` üretir. |

## 2) Konsol adımları (tek sefer)

1. `firebase firestore:databases:list` ya da Console → Firestore → **Rules** sekmesini aç.
2. **Publish öncesi sigorta:** mevcut kural metnini panoya/tam bir dosyaya kopyala (Console'da sürüm geçmişi yok; geri dönüş için tek kopya bu).
3. Depodaki dosyayı aç: `firestore.rules` (repo kökü).
4. Console'daki editörün **tamamını** seç ve depodaki içerikle değiştir (parça yapıştırma yapma).
5. Sağ üstteki **Publish** düğmesine bas; derleme hatası varsa yayın gerçekleşmez — hata metnini sakla.
6. Yayından sonra **Rules Playground**'da 3. bölümdeki kontrolleri yap.
7. Sonucu `docs/denetim/canli-rules-farki-2026-10-22.md` sonuna tarih + "yayınlandı" notu olarak yaz.

CLI tercih edilirse: `firebase deploy --only firestore:rules` (Firebase CLI oturumu ve `firebase.json` hazır).

> İndeksler ayrı adımdır ve **zorunlu değil**: `firestore.indexes.json` main'de değişmedi (2 bileşik indeks + `replies.authorUid` muafiyeti zaten canlıda). için rahat olsun diyorsan `firebase deploy --only firestore:indexes` zararsızdır, yeni indeks oluşturmaz.

---

## 3) Yayın sonrası doğrulama (Rules Playground ya da uygulamada)

| # | Senaryo | Beklenen |
|---|---|---|
| 1 | Girişsiz kullanıcı `places`/`posts` okur | ✅ okur (bilinçli: herkese açık) |
| 2 | Girişsiz kullanıcı `verifications` okur | ❌ `permission-denied` (`signedIn()` şartı) |
| 3 | Üye `verifications/{placeId}_{uid}` yazar | ✅ geçer; rastgele kimlikle yazarsa ❌ |
| 4 | Üye `users/{kendiUid}/following/{hedef}` yazar | ✅ geçer; başkasının listesine yazarsa ❌ |
| 5 | Üye başkasının `userProfiles` belgesini günceller | ❌ `permission-denied` |
| 6 | Üye olmayan `friendRequests` yazar | ❌ `permission-denied` |
| 7 | Herhangi bir yolda tanımsız koleksiyon | ❌ `permission-denied` (fail-closed yakalayıcı) |

Kalıcı kanıt: `npm run test:rules:emulator` (CI'da koşuyor) aynı senaryoları emülatörde doğrular; yayın sonrası canlı davranış yalnız Playground ile örneklenir.

---

## 4) Envanter — yayınlanacak dosyanın tamamı

`npm run rules:inventory` çıktısı (aynı komut her zaman güncel listeyi üretir):

Toplam **29** match bloğu (4 iç içe).

| Blok | Satır | get | list | create | update | delete |
| --- | --- | --- | --- | --- | --- | --- |
| `/databases/{database}/documents` | 5 | — | — | — | — | — |
| `/places/{placeId}` | 548 | herkes | ≤50 | giriş sahip | giriş sahip | giriş sahip |
| `/posts/{postId}` | 567 | herkes | ≤50 | giriş sahip | giriş | giriş sahip |
| `/posts/{postId} → /replies/{replyId}` | 581 | koşullu | ≤100 | giriş | kapalı | giriş sahip |
| `/stories/{storyId}` | 599 | giriş sahip | ≤50 | giriş sahip | kapalı | giriş sahip |
| `/routes/{routeId}` | 620 | giriş sahip | giriş ≤40 sahip | giriş sahip | giriş sahip | giriş sahip |
| `/tracks/{trackId}` | 649 | giriş sahip | giriş ≤100 sahip | giriş sahip | giriş sahip | giriş sahip |
| `/users/{uid}/savedPlaces/{placeId}` | 666 | giriş sahip | giriş ≤100 sahip | giriş sahip | giriş sahip | giriş sahip |
| `/users/{uid}/savedRoutes/{routeId}` | 679 | giriş sahip | giriş ≤100 sahip | giriş sahip | kapalı | giriş sahip |
| `/{path=**}/replies/{replyId}` | 697 | — | giriş ≤50 sahip | — | — | — |
| `/feedback/{feedbackId}` | 707 | kapalı | giriş ≤50 sahip | giriş sahip | kapalı | giriş sahip |
| `/verifications/{verificationId}` | 728 | giriş | giriş ≤50 | giriş | giriş sahip | giriş sahip |
| `/reports/{reportId}` | 750 | giriş | giriş ≤50 | giriş | kapalı | giriş |
| `/blocks/{blockId}` | 759 | giriş | giriş ≤50 | giriş | kapalı | giriş |
| `/groups/{groupId}` | 771 | giriş | kapalı | giriş | giriş | giriş |
| `/groups/{groupId} → /messages/{messageId}` | 862 | giriş | giriş ≤50 | giriş | kapalı | giriş |
| `/groups/{groupId} → /joinAttempts/{joinId}` | 888 | giriş | kapalı | giriş | giriş | giriş |
| `/groups/{groupId} → /invites/{invitedUid}` | 928 | giriş | giriş ≤50 | giriş | kapalı | giriş |
| `/users/{uid}/groups/{groupId}` | 957 | giriş sahip | giriş ≤20 sahip | giriş sahip | kapalı | giriş sahip |
| `/users/{uid}/groupInvites/{groupId}` | 974 | giriş sahip | giriş ≤50 sahip | giriş | kapalı | giriş sahip |
| `/users/{uid}/notifications/{notificationId}` | 996 | giriş sahip | giriş ≤50 sahip | giriş | giriş sahip | giriş sahip |
| `/users/{uid}/blocks/{blockedId}` | 1009 | giriş sahip | giriş ≤50 sahip | giriş sahip | kapalı | giriş sahip |
| `/userProfiles/{uid}` | 1017 | giriş | giriş ≤20 | giriş | giriş sahip | giriş sahip |
| `/users/{uid}/friendRequests/{requesterUid}` | 1027 | giriş sahip | giriş ≤50 sahip | giriş | kapalı | giriş sahip |
| `/users/{uid}/friends/{friendUid}` | 1040 | giriş sahip | giriş ≤100 sahip | giriş sahip | kapalı | giriş sahip |
| `/users/{uid}/following/{targetUid}` | 1055 | giriş sahip | giriş ≤100 sahip | giriş sahip | kapalı | giriş sahip |
| `/friendships/{fid}` | 1069 | giriş | kapalı | giriş | kapalı | giriş |
| `/friendDeclines/{fid}` | 1086 | giriş | kapalı | giriş | kapalı | giriş |
| `/{document=**}` | 1107 | — | — | — | — | — |

- `if true` (girişsiz erişim) blokları: `/places/{placeId}`, `/posts/{postId}`
- Collection-group / joker bloklar: `/{path=**}/replies/{replyId}`, `/{document=**}`
- Hiç `allow` içermeyen blok: yok

**Okuma:** `herkes` yalnız `places` ve `posts` okumasında (bilinçli, 2 adet). Sosyal koleksiyonların hepsi giriş şartlı; `{document=**}` yakalayıcısı hâlâ `read, write: false`.

---

## 5) Geri alma

1. Console → Rules → editöre 2. adımda aldığın kopyayı yapıştır → **Publish**.
2. Depo tarafı: `git show <önceki-main>:firestore.rules` ile önceki sürüm alınır (bu klonda geçmiş tek commit'e indirgenmiş olabilir; Console kopyası birincil kaynaktır).
3. Geri alma sonrası 3. bölümdeki 2 ve 3 numaralı kontrolleri tekrar et: eski kural kimlik bağı istemediği için 3 numara "geçer" olur — bu beklenen farktır.

## 6) Doğrulanmayanlar (dürüstlük notu)

- **Canlı kural metni okunmadı.** Bu ortamdan Firestore Console'a erişim yok; "canlı = depo" iddiası bu belgede **yok**.
- Son yayın tarihi/kimliği yalnız kullanıcı notundan (2026-10-22) biliniyor; o tarihten sonraki kural commit'leri canlıya yansımış olabilir de olmayabilir.
- Kural davranışı bu ortamda emülatörle koşulamadı (Java yok); kanıt CI işinden.

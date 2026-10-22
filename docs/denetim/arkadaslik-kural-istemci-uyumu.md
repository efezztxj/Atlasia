# Arkadaşlık / profil — kural ↔ istemci uyum denetimi

Tarih: 2026-10-22 · Dal: `arena/cef43516-atlasia` · Kapsam: p4–p9, p15–p17

> **Bu belge emülatör testinin yerine geçmez.** Burada yapılan, her yazma yolunun
> *kuralın istediği alanlar* ile *istemcinin gerçekten yazdığı alanlar* açısından
> satır satır karşılaştırılmasıdır. Davranış kanıtı hâlâ CI'daki
> `Firestore security tests` adımıdır (48 test) — o koşmadan "kurallar doğru" denemez.
> Amaç: `validUserProfile` çelişkisi gibi **hiçbir testin yakalamadığı** yapısal
> uyumsuzlukları yazma yolunda aramak.

## 1. Yazma yolları

| # | Yol | Kuralın istediği | İstemcinin yazdığı (kaynak) | Uyum |
|---|---|---|---|---|
| 1 | `users/{alıcı}/friendRequests/{gönderen}` create | `fromUid/fromName/toUid/createdAt` (`hasOnly`), `fromUid == auth`, `toUid == alıcı`, `fromName` 2–100, `createdAt == request.time`, friendship yok, karşı istek yok | `fromUid`, `fromName` (max 40, boşsa "Gezgin"), `toUid`, `createdAt: serverTimestamp()` — `src/lib/friendships.ts` `sendFriendRequest` | ✅ |
| 2 | `friendships/{fid}` create (kabul batch'i) | `users` (2, tekil), `requesterUid`, `recipientUid`, `status == 'accepted'`, `createdAt/updatedAt == request.time`, `recipientUid == auth`, `fid == friendshipId(...)`, **bekleyen istek var**, **batch sonrası istek yok** (`existsAfter`) | Aynı alanlar; batch'te istek siliniyor → `existsAfter` false — `acceptFriendRequest` | ✅ |
| 3 | `users/{kabul eden}/friends/{diğer}` create | `uid == auth`, `friendUid` eşleşmesi, `since == request.time`, **kabul edilmiş friendship** (`exists` **veya** `existsAfter`) | Aynı batch'te friendship yazıldığı için `existsAfter` devreye girer — `isAcceptedFriendship` | ✅ |
| 4 | `users/{sahip}/groups/{grup}` create (indeks) | grup var, kullanıcı `memberUids` içinde, `role` sahip/üye ile tutarlı, `joinedAt == request.time` | Grup batch'i **commit edildikten sonra** ayrı yazılır (`writeGroupIndex`) → `exists()` yeterli | ✅ |
| 5 | `groups/{id}/invites/{uid}` + `users/{uid}/groupInvites/{id}` | `inviterUid == auth`, `invitedUid == uid`, grup sahibi, davetli üye değil, **kabul edilmiş arkadaşlık** | Tek batch, sahip oturumunda; arkadaş olmayan davet `catch` ile atlanır | ✅ |
| 6 | `users/{alıcı}/notifications/{id}` create | 7 zorunlu alan + `targetId` opsiyonel, `actorUid == auth`, tip listesi, `title` 1–200, `body` 0–500, `read == false`, `createdAt == request.time`, **tip başına kanıt** | `createNotification`: alanlar aynı, `title/body` kırpılıyor, `read: false` | ✅ |
| 7 | `userProfiles/{uid}` create | şekil + `createdAt/updatedAt == request.time` | `syncUserProfile` (ilk yazma) | ✅ |
| 8 | `userProfiles/{uid}` update | şekil + **`createdAt == resource.data.createdAt`** + `updatedAt == request.time` | `syncUserProfile` mevcut `createdAt`'i koruyup `merge` yazıyor | ✅ (p9 çelişkiyi kapattı) |
| 9 | `users/{uid}/friends/{arkadaş}` delete | `uid == auth` (yalnız kendi listesi) | `removeFriend` önce kendi indeksini siler | ✅ |

## 2. Okuma yolları

| Sorgu | Kural sınırı | İstemci | Uyum |
|---|---|---|---|
| Gelen istekler (`orderBy createdAt desc`) | `uid == auth` + `boundedList(50)` | `limit(50)` | ✅ |
| Arkadaş listesi (`orderBy since desc`) | `uid == auth` + `boundedList(100)` | `limit(100)` | ✅ |
| Profil araması (`displayName` aralığı) | `signedIn()` + `boundedList(20)` | `limit(20)`, 2 önek (büyük/küçük harf) | ✅ |
| Bildirimler (`orderBy createdAt desc`) | `uid == auth` + `boundedList(50)` | `limit(50)` | ✅ |
| Arkadaşlık belgesi tekil okuma | yalnız `users` içindeki taraf | `removeFriend`, `ensureFriendIndex` | ✅ |

## 3. Denetimde çıkan üç not

1. **Yarış (aynı anda karşılıklı istek).** Kural, karşı tarafta bekleyen istek varken ikinci isteği
   reddeder. İki kişi aynı anda gönderirse biri başarısız olur ve p16'nın kendi onarımı da
   reddedilir. Bu durum artık **ayrı kodla** raporlanıyor: `friend-request/opposite-exists`
   ("Karşı taraf zaten sana istek göndermiş, İstekler sekmesinden kabul et").
   Kaynak: `src/lib/friendships.ts`, test: `src/lib/friendships.send.test.ts`.
2. **Sunucu tarafı uzlaştırma yok (bilinen sınır).** Arkadaşlıktan çıkaran kişi karşı tarafın
   indeksini silemez (kural `uid == auth` ister). Karşı tarafın listesinde kayıt **bayat** kalır;
   kendisi çıkarınca temizlenir. Sunucu fonksiyonu olmadan çözülemez — `docs/denetim/gorunurluk-matrisi.md`
   §Satır 47'de kayıtlı.
3. **`deleteDoc` no-op belirsizliği.** p16'nın kendi onarımı, belge yokken silme denemesine dayanır.
   Firestore'da var olmayan belgeyi silmek pratikte başarılı döner; dönmezse kod "onaramadım"
   yoluna girer ve `friend-request/rules-mismatch` üretir — sessizce yutmaz. Emülatörde bu davranış
   `arkadaşlık isteği: gönderen alıcının kuyruğunu okuyamaz…` testinin yanında **ek test** olarak
   doğrulanmalıdır (Aşama 1 patch'i bu testi ekliyor).

## 4. Emülatörde doğrulanması gerekenler (CI)

Aşağıdakiler yalnız `npm run test:rules:emulator` ile kanıtlanır; bu ortamda Java olmadığı için
koşmadı:

- [ ] `users/{uid}/friendRequests` create: kendi kuyruğuna yazma reddi, karşı istek varken reddi
- [ ] kabul batch'i: `friendships` + kendi indeksi birlikte SUCCEED, beşinci kişi FAIL
- [ ] `friendships` create: bekleyen istek yoksa FAIL (`existsAfter` kanıtı)
- [ ] `users/{uid}/groups` indeksi: üye olmadığı grup için FAIL, sahip rolü tutarsızsa FAIL
- [ ] `userProfiles` update: `createdAt` değiştirme FAIL, ad değiştirme SUCCEED
- [ ] `notificationProof`: kanıtsız `friend_declined` / `system` / `blocked` FAIL

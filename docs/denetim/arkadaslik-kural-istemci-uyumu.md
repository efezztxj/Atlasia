# Arkadaşlık / profil — kural ↔ istemci uyum denetimi

Tarih: 2026-10-23 · Dal: `arena/b8594a8f-atlasia` · Kaynak: #61 denetimi, güncel
`main` (`3038344`) üzerine taşındı.

> **Bu belge emülatör testinin yerine geçmez.** Burada yapılan, her yazma yolunun
> *kuralın istediği alanlar* ile *istemcinin gerçekten yazdığı alanlar* açısından
> satır satır karşılaştırılmasıdır. Davranış kanıtı hâlâ CI'daki
> `Firestore security rules tests` adımıdır (**58 test**, bkz. §4) — o koşmadan
> "kurallar doğru" denemez.
>
> Taşıma sırasında satırlar kural metnine karşı yeniden okundu. #61'in
> varsaydığı `friend-request/rules-mismatch` kodu bu kod tabanında **yok**;
> §3'teki 3. not buna göre yeniden yazıldı.

## 1. Yazma yolları

| # | Yol | Kuralın istediği | İstemcinin yazdığı (kaynak) | Uyum |
|---|---|---|---|---|
| 1 | `users/{alıcı}/friendRequests/{gönderen}` create | `fromUid/fromName/toUid/createdAt` (`hasOnly`), `fromUid == auth`, `toUid == alıcı`, `fromName` **2–100**, `createdAt == request.time`, arkadaşlık yok, **karşı istek yok** | `fromUid`, `fromName` (max 40, <2 ise "Gezgin"), `toUid`, `createdAt: serverTimestamp()` — `sendFriendRequest` | ✅ (min-2 sözleşmesi `requestDisplayName` ile zorlanıyor) |
| 2 | `friendships/{fid}` create (kabul batch'i) | `users` (2, tekil), `requesterUid`, `recipientUid`, `status == 'accepted'`, `createdAt/updatedAt == request.time`, `recipientUid == auth`, `fid == friendshipId(...)`, **bekleyen istek var**, **batch sonrası istek yok** (`existsAfter`) | Aynı alanlar; batch'te istek siliniyor → `existsAfter` false — `acceptFriendRequest` | ✅ |
| 3 | `users/{kabul eden}/friends/{diğer}` create | `uid == auth`, `friendUid` eşleşmesi, `friendName` **2–100**, `since == request.time`, **kabul edilmiş friendship** (`exists` **veya** `existsAfter`) | Aynı batch'te friendship yazıldığı için `existsAfter` devreye girer — `isAcceptedFriendship` | ✅ (ad `writeFriendIndex` içinde "Gezgin"e düşer) |
| 4 | `users/{sahip}/groups/{grup}` create (indeks) | grup var, kullanıcı `memberUids` içinde, `role` sahip/üye ile tutarlı, `joinedAt == request.time` | Grup batch'i **commit edildikten sonra** ayrı yazılır (`writeGroupIndex`) → `exists()` yeterli | ✅ |
| 5 | `groups/{id}/invites/{uid}` + `users/{uid}/groupInvites/{id}` | `inviterUid == auth`, `invitedUid == uid`, grup sahibi, davetli üye değil, **kabul edilmiş arkadaşlık** | Tek batch, sahip oturumunda; arkadaş olmayan davet `catch` ile atlanır | ✅ |
| 6 | `users/{alıcı}/notifications/{id}` create | zorunlu alanlar + `targetId` opsiyonel, `actorUid == auth`, tip listesi, `title` 1–200, `body` 0–500, `read == false`, `createdAt == request.time`, **tip başına kanıt** (`notificationProof`) | `createNotification`: alanlar aynı, `title/body` kırpılıyor, `read: false` | ✅ |
| 7 | `userProfiles/{uid}` create | şekil + `displayName` 2–40 + `displayNameLower` 2–40 + `createdAt/updatedAt == request.time` | `syncUserProfile` ilk yazma; ad `validateDisplayName` ile 2–40 doğrulanıyor | ✅ |
| 8 | `userProfiles/{uid}` update | şekil + **`createdAt == resource.data.createdAt`** + `updatedAt == request.time` | `syncUserProfile` mevcut `createdAt`'i koruyup `updateDoc` ile yazıyor | ✅ (p9 çelişkiyi kapattı) |
| 9 | `users/{uid}/friends/{arkadaş}` delete | `uid == auth` (yalnız kendi listesi) | `removeFriend` önce kendi indeksini siler | ✅ |

## 2. Okuma yolları

| Sorgu | Kural sınırı | İstemci | Uyum |
|---|---|---|---|
| Gelen istekler (`orderBy createdAt desc`) | `uid == auth` + `boundedList(50)` | `limit(50)` | ✅ |
| Arkadaş listesi (`orderBy since desc`) | `uid == auth` + `boundedList(100)` | `limit(100)` | ✅ |
| Profil araması (`displayName` aralığı) | `signedIn()` + `boundedList(20)` | `limit(20)`, 2 önek (büyük/küçük harf) | ✅ |
| Bildirimler (`orderBy createdAt desc`) | `uid == auth` + `boundedList(50)` | `limit(50)` | ✅ |
| Arkadaşlık belgesi tekil okuma | yalnız `users` içindeki taraf | `removeFriend`, `ensureFriendIndex` | ✅ |

Sınır değerlerinin istemci tarafındaki ikinci bekçisi:
`src/config/firestoreLimits.test.ts` (15 test) `limit()` ile `boundedList(n)`
değerlerini statik olarak karşılaştırır.

## 3. Denetimde çıkan dört not

1. **Yarış (aynı anda karşılıklı istek).** Kural, karşı tarafta bekleyen istek
   varken ikinci isteği reddeder. İki kişi aynı anda gönderirse biri başarısız
   olur. Bu durum **ayrı kodla** raporlanıyor: `friend-request/opposite-exists`
   ("Karşı taraf zaten sana istek göndermiş; aşağıdan kabul et"). Kaynak:
   `src/lib/friendships.ts`; test: `src/lib/friendships.send.test.ts`.
2. **Sunucu tarafı uzlaştırma yok (bilinen sınır).** Arkadaşlıktan çıkaran kişi
   karşı tarafın indeksini silemez (kural `uid == auth` ister). Karşı tarafın
   listesinde kayıt **bayat** kalır; kendisi çıkarınca temizlenir. Sunucu
   fonksiyonu olmadan çözülemez — `docs/denetim/gorunurluk-matrisi.md`
   §Satır 47'de kayıtlı.
3. **Tek karakterli ad → yanıltıcı hata (bu taşımada giderildi).** Kural
   `fromName` için 2–100 ister. Firebase Auth `displayName` 1 karakter
   olabildiği hâlde istemci yalnız boş adı "Gezgin"e çeviriyordu; 1 karakterli
   ad gönderildiğinde istek `permission-denied` alıyor ve istemci bunu
   `friend-request/exists` ("zaten istek göndermiş olabilirsin") diye
   yorumluyordu. Artık ad `requestDisplayName` ile kuralın kabul ettiği en küçük
   biçime çekiliyor; test: `sendFriendRequest — bildirim › 1 karakterli ad…`.
4. **Gerçek kural/istemci uyuşmazlığı hâlâ "zaten istek" gibi görünüyor.**
   `create` reddi tek bir koda (`friend-request/exists`) eşlendiği için, kurallar
   dağıtılmamışsa veya istemci eskiyse kullanıcı aynı mesajı görür. Ayırt etmek
   için önce `users/{alıcı}/friendRequests/{gönderen}` belgesinin varlığına
   bakılması gerekir; bu ek okuma kural tarafından reddedilir (alıcının kutusu
   istemciye kapalı). Bu yüzden ayrım sunucu tarafı olmadan yapılamaz — bilinçli
   sınır, PR şablonundaki "dağıtım sırası" maddesi bu riski azaltır.

## 4. Emülatör kapsamı (CI)

Emülatör yerelde koşmuyor (Java 21 yok); kanıt CI'daki
`Firestore security rules tests` adımıdır. `tests/firestore.rules.test.ts`
**58 test** içeriyor; bu belgedeki yolların karşılığı:

| Denetim maddesi | Test (satır) |
|---|---|
| İstek: kendi kuyruğuna yazma reddi, karşılıklı istek reddi, kendine istek reddi | `arkadaşlık isteği istemci akışı…` (1360) |
| Kabul: istek yoksa FAIL, meşru kabul SUCCEED, başkasının listesine yazma FAIL | `C1 arkadaslik istek olmadan…` (1321) |
| `friendships` create: bekleyen istek kanıtı (`existsAfter`) | aynı test (1321) |
| Grup indeksi: üye olmadığı grup FAIL, rol tutarsızsa FAIL | `grup indeksini yalnız sahibi yazar…` (789) |
| `userProfiles` update: `createdAt` değiştirme FAIL, ad değiştirme SUCCEED | `C4 userProfiles displayName…` (1781), `displayNameLower zorunlu…` (1845), `geçiş: displayNameLower'sız…` (1866) |
| Bildirim kanıtı: kanıtsız `friend_declined` FAIL, batch kanıtıyla SUCCEED | `friend_declined kanıtsız reddedilir…` (970) |
| Arkadaşlık/grup/rapor bildirim tipleri kanıta bağlı | `bildirim tipleri ilişki kanıtına bağlı…` (1083) |

Satır numaraları bu taşımanın yapıldığı `main` (`3038344`) içindir; dosya
büyüdükçe kayarlar, test **adı** kalıcıdır.

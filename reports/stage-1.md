# Aşama 1 — `friend_declined` bildirimini sunucusuz geri getirmek

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · Kod commit'i: `40c687b`

## Ne yapıldı

- `src/lib/friendships.ts:207` — `declineFriendRequest` artık tek `writeBatch`:
  - `friendDeclines/{friendshipIdFor(recipient, requester)}` set:
    `declinerUid`, `requesterUid`, `users: [..].sort()`, `createdAt: serverTimestamp()`
  - `users/{recipient}/friendRequests/{requester}` delete
  - Commit sonrası `createNotification({ type: "friend_declined", targetId: friendshipId })`;
    hata `try/catch` + `console.warn` ile yutulur (mevcut desen).
- `firestore.rules:469` — `friendDeclineProof(data)` eklendi; yalnız
  `type == 'friend_declined'` için `friendDeclines/{targetId}` kanıtı ister
  (`declinerUid == actorUid`, `requesterUid == recipientUid`).
- `firestore.rules:887` — notifications `allow create` bu kanıt fonksiyonunu çağırır.
- `firestore.rules:955` — yeni `match /friendDeclines/{fid}`:
  get yalnız taraflara, list kapalı, create yalnız reddeden + bekleyen istek
  (`exists`) + aynı batch'te silinmiş (`!existsAfter`), update kapalı,
  delete yalnız `declinerUid`.
- `src/lib/notifications.ts:10` — `friend_declined` artık kanıtlı ve açık.
- `tests/firestore.rules.test.ts:909` — +4 emülatör vakası.
- `src/lib/friendships.flow.test.ts:1` — +4 birim testi (yeni dosya).

## Neden

Ret işlemi isteği siliyordu; geride kanıt kalmadığı için bildirim yazımı
reddediliyordu. Çözüm Cloud Functions/Blaze gerektirmeden kanıtı istemcinin
kendi batch'inde üretmesi. Kural gevşetilmedi: aksine `friend_declined` için
yeni bir zorunluluk eklendi.

> **Uyarlama notu (kullanıcı kararı):** Patch 4–9 ve `notificationProof`
> altyapısı repoda yok (bkz. `reports/stage-0.md`). Bu aşamada proof katmanı
> **yalnız `friend_declined`** için kuruldu; diğer bildirim tiplerinin
> davranışı değişmedi. `system`, `report_actioned`, `blocked` bu depoda zaten
> istemciye açık; patch 6'nın kapatma işi uygulanmadı.

## Değişen dosyalar

```text
$ git diff --stat d527a3f 40c687b
 firestore.rules                  |  34 ++++++++++++-
 src/lib/friendships.flow.test.ts | 126 +++++++++++++++++++++++++++++++++++++++
 src/lib/friendships.ts           |  22 ++++++-
 src/lib/notifications.ts         |   6 ++
 tests/firestore.rules.test.ts    | 113 +++++++++++++++++++++++++++++++++++++
 5 files changed, 298 insertions(+), 3 deletions(-)
```

## Kapılar

### `npm ci`

```text
added 365 packages, and audited 366 packages in 11s
found 0 vulnerabilities
```

### `npx tsc --noEmit`

```text
TSC_EXIT=0
```

### `npx eslint . --max-warnings=0`

```text
ESLINT_EXIT=0
```

### `npx vitest run`

```text
 Test Files  104 passed (104)
      Tests  721 passed (721)
```

### `npm run build`

```text
assets/userProfiles-W64lLltG.js | lazyChunk | 2.703 B | 1.269 B | hayır
Bundle bütçesi içinde.
```

### `npm run test:rules:emulator` — yerelde KOŞMADI

```text
$ npm run test:rules:emulator
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
$ java -version
/bin/bash: line 1: java: command not found
$ curl -I https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.22.0.jar
curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL
```

### CI — rules testleri (HAM)

```text
$ gh run view 39807806589 --json jobs --jq '...'
Security, typecheck, lint, test and build: success |
  ... Firestore security rules tests=success ... Production build and bundle budget=success

$ gh run view 39807811510 --json jobs --jq '...'
Firestore rules tests on Windows (tr-TR): success |
  ... Assert the JVM default locale is Turkish=success,
      Firestore security rules tests=success ...
```

49 vakanın tamamı iki işte de geçti. Ham test logu indirilemiyor
(`results-receiver.actions.githubusercontent.com` → EOF); adım sonucu API'den.

## Kurallarda değişiklik

| Yer | Eskiden | Şimdi |
|---|---|---|
| `notifications` create | `signedIn && validNotification && recipientUid == uid` | `... && friendDeclineProof(request.resource.data)` |
| `friendDeclines` | **koleksiyon yok** (catch-all: `if false`) | get: taraflar · list: `false` · create: kanıt batch'i · update: `false` · delete: decliner |
| `friendDeclineProof` | yok | yalnız `friend_declined` için zorunlu kanıt |

### Gevşeme olmadığının kanıtı

```text
$ awk 'NR>=895 && NR<=900' <önce>   # yalnız create satırı değişti
- allow create: if signedIn() && validNotification(request.resource.data) && request.resource.data.recipientUid == uid;
+ allow create: if signedIn() && validNotification(request.resource.data) && request.resource.data.recipientUid == uid && friendDeclineProof(request.resource.data);

$ grep -n "allow .*: if true" firestore.rules
478:      allow get: if true;      (places — değişmedi)
497:      allow get: if true;      (posts — değişmedi)
529:      allow get: if true;      (stories — değişmedi)
649:      allow get: if true;      (verifications — değişmedi)

$ tail -5 firestore.rules
    match /{document=**} {
      allow read, write: if false;
    }
```

`git diff` yalnız **ekleme** ve tek satırda **daha katı** bir koşul içeriyor;
silinen hiçbir `allow` yok. `{document=**}` fail-closed kapısı yerinde
(bu aşamada bir düzenleme kazası fark edilip düzeltildi; son hâli yukarıdaki
gibi doğrulandı).

## Testler

| | Önce | Sonra |
|---|---|---|
| Rules `it(` | 45 | **49** |
| Vitest dosya | 103 | **104** |
| Vitest test | 717 | **721** |

Eklenen rules vakaları:

- `friend_declined kanıtsız reddedilir; ret batch'i kanıt yazınca bildirim geçer`
- `üçüncü kişi başkasının ret kanıtıyla friend_declined yazamaz; friendDeclines yalnız taraflara açıktır`
- `friendDeclines güncellenemez; yalnız reddeden siler`
- `friendDeclines create yalnız reddeden adına ve istek silinen batch'te yazılır`

Eklenen birim testleri (`friendships.flow.test.ts`):

- `ret belgesini ve istek silmesini aynı batch'te yazar, sonra kanıtlı bildirim gönderir`
- `bildirim yazılamazsa ret yine tamamlanır ve uyarı loglanır`
- `batch düşerse bildirim gönderilmez; hata çağırana döner`
- `kendine ret yazılamaz; hiçbir yazma denenmez`

## Bilinen sınırlar

- Proof zorunluluğu yalnız `friend_declined` için; patch 6'nın diğer tipleri
  kapatması bu depoda yok.
- `friendDeclines` belgeleri süresiz birikir (TTL yok; ücretsiz kota).
  Silme yalnız reddedene açık; otomatik temizlik kapsam dışı.
- `allow list: if false` nedeniyle ret geçmişi liste olarak okunamaz; yalnız
  bilinen `friendshipId` ile `get`.

## Patch

```text
$ sha256sum patches/main/main-patch10-friend-declined.patch
b3ac724dd6aec6b57442038ea7ad118944947d8f25c6b797285e10f4884cd42b
```

Kaynak: `git diff --binary --full-index d527a3f 40c687b`

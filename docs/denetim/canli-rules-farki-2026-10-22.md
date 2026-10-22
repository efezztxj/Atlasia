# Canlı Firestore Rules ↔ depo farkı (2026-10-22)

**Hüküm:** ❌ Canlıdaki kurallar eski. Kullanıcının Console'dan yapıştırdığı sürüm (`match` blok sayısı 15) depodaki `firestore.rules` (25 blok) ile aynı değil. Sosyal özelliklerin canlıda "Missing or insufficient permissions" vermesinin nedeni bu.

## Canlıda olmayan bloklar (depoda var)

| Yol | Ne bozuluyor |
|---|---|
| `/userProfiles/{uid}` | Profil adı senkronu, kullanıcı arama |
| `/users/{uid}/friendRequests/{requesterUid}` | Arkadaşlık isteği gönder/kabul/ret |
| `/users/{uid}/friends/{friendUid}` | Arkadaş listesi |
| `/friendships/{fid}` | Arkadaşlık kaydı |
| `/groups/{groupId}/joinAttempts/{joinId}` | Kodla gruba katılma |
| `/groups/{groupId}/invites/{invitedUid}` | Grup daveti |
| `/users/{uid}/groupInvites/{groupId}` | Gelen davetler |
| `/feedback/{feedbackId}` | Geri bildirim formu |
| `/{path=**}/replies/{replyId}` (collection group) | Hesap silme / "Verilerimi indir" yanıt taraması |

## Canlıda farklı olanlar
- `validGroupShape`: canlıda `joinCode` alanı izinli değil → kodlu grup **oluşturma** da reddedilir.
- Grup `update`: canlıda joinCode koruması yok.

## Ne yapılmalı
Depodaki `firestore.rules` olduğu gibi Console → Firestore → Rules'a yapıştırılıp **Publish**. İndeksler (`firestore.indexes.json`: places×2 + replies fieldOverride) ayrıca yüklenmeli. Kurallar gevşetilmez; yalnız depo sürümü yayınlanır.

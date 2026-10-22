# Olay kaydı — "İstek gönderilemedi / bu işlem için yetkin yok"

> D2 kabul kriteri: aşağıdaki **beş satır** doldurulmadan bu olay kapanmış sayılmaz.
> Doldurulmamış alan `?` olarak kalır; tahmin yazılmaz.

| Alan | Değer |
|---|---|
| **Tarih / saat (yerel)** | ? |
| **Derleme** (hangi sürüm, hangi URL) | ? |
| **Konsoldaki hata kodu** (`permission-denied` / `unauthenticated` / `unavailable`) | ? |
| **Dağıtık kurallarda `friendRequests` var mıydı?** (Console → Firestore → Rules) | ? |
| **Kök neden** (tek cümle) | ? |

## Teşhis adımları (sırayla)

1. DevTools → Console açıkken isteği tekrarla; hata nesnesindeki `code` alanını yaz.
2. Firebase Console → Firestore → **Rules**: `match /users/{uid}/friendRequests` satırı var mı?
3. Firestore → Veri: `users/{alıcı}/friendRequests/{gönderen}` belgesi var mı?
4. Firestore → Veri: `friendships/{küçük_uid_büyük_uid}` belgesi var mı?
5. Profil panelinde oturum türü: Firebase üyesi mi, "cihaz hesabı" mı?

## Bulguya göre düzeltme

| Bulgu | Düzeltme | Doğrulama |
|---|---|---|
| Kuralda `friendRequests` yok | `firebase deploy --only firestore:rules` (runbook §3.1) | Console'da satır görünür + tek istek başarılı |
| Bekleyen istek vardı | p16 kendi onarır; kullanıcıya "zaten istek gönderdin" | İkinci tıklama hata vermez |
| Zaten arkadaş | "Bu kişi zaten arkadaşın" mesajı | Arkadaşlar sekmesinde görünür |
| Oturum yok / cihaz hesabı | Giriş akışı; arkadaşlık yalnız bulut hesabında | Giriş sonrası tekrar dene |
| Hâlâ eski mesaj | Derleme p16'yı içermiyor | Yeni build + hard refresh |

## Önlem (tekrar etmemesi için)

- [ ] Kural değişikliği PR'ında `.github/pull_request_template.md` dolduruldu
- [ ] Dağıtım sırası runbook §3.1'e göre uygulandı (önce rules)
- [ ] `src/config/firestoreRulesGuards.test.ts` yeşil (yol silinmedi mi?)
- [ ] CI'da `Firestore security rules tests` yeşil (48/48)

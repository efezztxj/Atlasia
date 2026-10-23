# Olay kaydı — "İstek gönderilemedi / bu işlem için yetkin yok"

> Durum: **kök neden sınıfı kapatıldı**, olayın kendisi hâlâ saha verisi bekliyor.
> Aşağıdaki beş alan doldurulmadan olay kapanmış sayılmaz; tahmin yazılmaz.
> Kaynak: #61 denetimi, güncel `main` (`3038344`) üzerine taşındı.

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
| Kuralda `friendRequests` yok | `firebase deploy --only firestore:rules` (runbook §4) | Console'da satır görünür + tek istek başarılı |
| Bekleyen istek vardı | İstemci kendi onarır; kullanıcıya "zaten istek gönderdin" | İkinci tıklama hata vermez |
| Karşı taraf zaten istek göndermiş | `friend-request/opposite-exists` → "İstekler sekmesinden kabul et" | Karşılıklı istek denemesi anlaşılır mesaj verir |
| Zaten arkadaş | "Bu kişi zaten arkadaşın" mesajı | Arkadaşlar sekmesinde görünür |
| Oturum yok / cihaz hesabı | Giriş akışı; arkadaşlık yalnız bulut hesabında | Giriş sonrası tekrar dene |
| Ad 1 karakter (kural 2–100 ister) | `requestDisplayName` adı kural sözleşmesine çeker | `src/lib/friendships.send.test.ts` |
| Hâlâ eski mesaj | Derleme düzeltmeyi içermiyor | Yeni build + hard refresh |

## Kod tarafında bugünkü durum (2026-10-23)

- Hata kodları ayrıştırıldı: `uid-invalid`, `self`, `already-friends`,
  `opposite-exists`, `exists`. Genel "yetkin yok" metni bu yolların dışında kaldı.
- Tek karakterli ad, kuralın `stringBetween(fromName, 2, 100)` sözleşmesine çekildi
  (`requestDisplayName`); önceden `permission-denied` alıp **yanlış** mesaja
  dönüşüyordu.
- Davranış kilidi: `src/lib/friendships.send.test.ts` (10 test).
- **Bilinçli sınır:** gerçek kural/istemci uyuşmazlığı ile "istek zaten var"
  durumu istemcide ayırt edilemez (alıcının kutusu okunamaz, bkz.
  `docs/denetim/arkadaslik-kural-istemci-uyumu.md` §3.4).

## Önlem (tekrar etmemesi için)

- [ ] Kural değişikliği PR'ında `.github/pull_request_template.md` dolduruldu
- [ ] Dağıtım sırası runbook §3'e göre uygulandı (varsayılan: önce istemci)
- [ ] `src/config/firestoreRulesGuards.test.ts` yeşil (15 test)
- [ ] CI'da `Firestore security rules tests` yeşil (58/58)

> Son iki madde ancak CI'da kanıtlanır; yerelde Java 21 yok.

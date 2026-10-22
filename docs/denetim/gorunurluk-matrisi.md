# Görünürlük matrisi (P4 Tur 4)

Kaynak: `firestore.rules` (taban: P4 dalı, Tur 4). Her satır, `tests/firestore.rules.test.ts`
içindeki "görünürlük matrisi" testiyle ya da ilgili blokla sınanır. Sınama CI'daki
"Firestore security rules tests" adımında yapılır (yerel emulator yok).

Sütunlar: **Sahip** (uid eşleşen kullanıcı) · **Arkadaş** · **Grup üyesi** · **Giriş yapmış herkes** · **Anonim**.
`✓` okur/yazar, `—` erişim yok, `✓ (sınırlı)` sayfa sınırı ile.

| Veri | Sahip | Arkadaş | Grup üyesi | Giriş yapmış herkes | Anonim | Kural / not |
|---|---|---|---|---|---|---|
| Profil (`userProfiles/{uid}`) | okur, yazar, siler | okur | — | okur (liste ≤20) | — | `get: signedIn()`; yazma yalnız `uid == auth` |
| İz (`tracks/{id}`, konum polyline) | okur, yazar, siler | — | — | — | — | yalnız `authorUid == auth` (get/list/write) |
| Rota taslak/özel (`routes`, `visibility: private`) | okur, yazar, siler | — | — | — | — | `get`: sahip |
| Rota bağlantıyla (`unlisted`) | okur | okur (bağlantı) | okur (bağlantı) | okur (bağlantı) | okur (bağlantı) | liste yok; yalnız tek belge |
| Rota yayın (`public`) | okur, yazar, siler | okur | okur | okur | okur | liste ≤40, yalnız `public` |
| Hikâye (`stories`) | okur, siler (yazar) | okur | okur | okur | okur | `get: storyLive()` (24 saat) veya sahibi; liste ≤50; güncelleme yok |
| Konum/yer (`places`) | okur, yazar, siler | okur | okur | okur | okur | yer kaydı kamusal; liste ≤50 |
| Kayıtlı yer/rota (`users/{uid}/savedPlaces|savedRoutes`) | okur, yazar, siler | — | — | — | — | yalnız `uid == auth` |
| Grup (`groups/{id}`) | okur, güncelle (kurallı) | — | okur (tek belge) | — | — | liste yok; üyelik `memberUids`; kod katılımı kurallı |
| Grup mesajı (`groups/{id}/messages`) | yazar, kendi mesajını siler | — | okur (≤50), yazar | — | — | liste sınırlı; `senderUid == auth` |
| Bildirim (`users/{uid}/notifications`) | okur, günceller (`read`), siler | — | — | — | — | yalnız `uid == auth` |
| Arkadaş indeksi (`users/{uid}/friends`) | okur, siler | — | — | — | — | yazma: kabul akışı (C1 kuralı) |
| Arkadaşlık (`friendships/{fid}`) | okur, siler | okur (iki taraf) | — | — | — | yalnız `users` alanındaki iki taraf |
| Arkadaş isteği (`users/{uid}/friendRequests`) | okur, siler | — | — | — | — | yalnız alıcı; gönderen istek belgesini `fromUid` ile silebilir |
| Engelleme (`blocks`, `users/{uid}/blocks`) | okur, yazar, siler | — | — | — | — | yalnız `blockerUid == auth` |
| Rapor (`reports`) | okur, siler (raporlayan) | — | — | — | — | raporlayan dışında kimse okuyamaz |
| Doğrulama (`verifications`) | okur, siler (yazar) | okur | okur | okur | — | `get: signedIn()`; liste ≤50 ve giriş şartı (Aşama 3-A); yazar siler |
| Geri bildirim (`feedback`) | liste, sil | — | — | — | — | `get: false`; güncelleme yok; yalnız sahibi listeler/siler |

## Karar satırları

- KARAR: `feedback` için `get` kapalı, `list` yalnız sahibine açık (sınır 50).
  GEREKÇE: Hesap silme, kullanıcının kendi geri bildirimlerini silebilmek için listelemeye
  ihtiyaç duyar; tekil okuma gerekmez. ALTERNATİF: list da kapalı, silme yalnız
  Cloud Function ile (deploy gerektirir, kapsam dışı). GERİ ALMA: `allow list` satırını kaldır
  ve hesap silmede feedback adımını çıkar.
- KARAR: Hikâye `get: storyLive()` (24 saat, anonim dahil); süresi dolanı yalnız sahibi okur.
  GEREKÇE: Keşif kamusal; süre sınırı kuralda (PR #51 kusur #5). ALTERNATİF: yalnız giriş
  yapmışlara açmak (keşfi kırar). GERİ ALMA: `allow get: if true;`.
- KARAR: Doğrulama (`verifications`) okuması giriş şartına bağlı (`signedIn()`); anonime kapalı.
  GEREKÇE: `note` 280 karaktere kadar serbest metin taşıyor; anonim okuma veri minimizasyonuna
  aykırı (#55, Aşama 3-A). ALTERNATİF (uygulanmadı): notu ayrı `verificationNotes` koleksiyonuna
  taşıyıp anonim okumayı `note`suz açmak. GERİ ALMA: `allow get: if true;` — `note` yeniden
  anonime açılır; bu bilinçli bir geri alma sayılır.
- KARAR: Konum/yer kaydı kamusal; konum geçmişi (`tracks`) yalnız sahibinde.
  GEREKÇE: Yerler harita içeriği; iz (polyline) kişisel konum geçmişi. ALTERNATİF: yerleri de
  gizlemek (harita işlevini bozar). GERİ ALMA: —.

## Açık noktalar

- Arkadaş kaldırıldığında karşı tarafın `users/{arkadaş}/friends/{uid}` indeksi kuralla
  silinemez; UI indeksi `friendships` belgesiyle doğrulamalı (hesap silme açık noktası ile aynı).
- Giden arkadaş istekleri alıcı kutusunda kalır; gönderen tarafından liste yok.
- Anonim okuma yüzeyi (hikâye, yayın rota, yer) bilinçli; kişisel alan içermez
  (profil, iz, kayıt, bildirim, arkadaş listesi ve doğrulama anonim için kapalı).

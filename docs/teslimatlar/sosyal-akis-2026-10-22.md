# Sosyal akış sadeleştirme: Instagram tarzı (2026-10-22)

**Kullanıcı isteği:** Gruba kişi eklemek için ya arkadaş ekleyip listeden "Ekle"ye basılsın ya da davet bağlantısı gönderilsin. Grup kimliği ya da hesap kimliği yazdırılmasın.

## Ne değişti
| Yer | Önce | Şimdi |
|---|---|---|
| Panel | Yalnız "Gruplar" | **Gruplar / Arkadaşlar** sekmeleri; bekleyen davet ve istek sayısı rozette |
| Arkadaş ekleme | Arayüz yoktu (lib vardı) | İsimle ara → **Ekle**; ayrıca **Arkadaş davet bağlantımı paylaş** (`#arkadas=<uid>`) |
| Gelen istekler | Arayüz yoktu | **Kabul et / ✕** |
| Yeni grup | Hesap kimliklerini virgülle yaz | Arkadaş listesi, her satırda **Ekle / Eklendi** |
| Kurulmuş gruba kişi | Yoktu | Kurucu için **Kişi ekle** (arkadaş listesi → Ekle; "Davet edildi" / "Grupta" durumu) |
| Kodla katılma | Grup kimliği + kod iki kutu | **Davet bağlantısı** (`#grup=<id>.<kod>`), tek dokunuşla katılım; elle yapıştırma kutusu da var |
| Grup daveti | Grup kimliğini yazıp "Davetle katıl" | **Grup davetlerin** listesi: **Katıl / ✕** |
| Bildirim | "Grubu aç" davetliyi üye sanıyordu (hata) | "Daveti gör" daveti öne çıkarır; arkadaşlık bildirimlerinde "İsteği gör" |

## Bulunan ve düzeltilen hatalar
- `acceptFriendRequest` istek sahibinin listesine yazmaya çalışıyordu. Kural buna izin vermiyor (`tests/firestore.rules.test.ts:1074`), bu yüzden kabul her seferinde hata veriyordu. Artık yalnız kendi listesine yazıyor. İstek sahibi `friend_accepted` bildirimini görünce `ensureFriendIndex` ile kendi listesini tamamlıyor.
- `syncUserProfile` hiç çağrılmıyordu, bu yüzden isimle arama boş dönerdi. Artık girişte çağrılıyor. Kural güncellemeye izin vermediği için (`createdAt == request.time`) ad değişince belge silinip yeniden yazılıyor; ad aynıysa hiç yazılmıyor.
- Bildirimden grup açma: SocialPanel hedefi aynı render'da temizlediği için GroupsPanel hedefi hiç almıyordu. Hedef artık yerel kopyada tutuluyor.

## Değişmeyenler
- `firestore.rules` ve `firestore.indexes.json` değişmedi, yeniden deploy gerekmiyor.
- Davet yalnız kabul edilmiş arkadaşa gidiyor. Kodla katılmada 5 deneme / 15 dk kilidi aynen geçerli.
- Yalnız kurucu davet edebilir ve bağlantı paylaşabilir (kural).
- Davet bağlantısı fragment'ta taşınıyor, sunucu günlüğüne gitmiyor. Girişten önce sessionStorage'a alınıp adres çubuğundan siliniyor.

## Bütçe
- GroupsPanel artık tembel chunk: 6,9 KB gzip.
- Entry 169.966 / 174.000 B gzip.

## Bilinen sınırlar
- İsimle arama önek aramasıdır: "efe" ile "Efe Yılmaz" bulunur, "yılmaz" ile bulunmaz. Profiller kullanıcı bu sürümle giriş yaptıkça dizine girer.
- Arkadaşlıktan çıkarılan kişinin listesinde eski kayıt kalabilir (kural karşı listeyi silmeye izin vermiyor). Ona davet gönderilirse kural reddeder ve "davet edilemedi" görünür.

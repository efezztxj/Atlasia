# Atlasia — Canlı Test Listesi

> **Kapsam:** Yalnızca **kullanıcı** tarafından canlı ortamda (`atlasia.pages.dev`
> production, gerekirse gizli pencere) elle doğrulanır. Ajanlar bu listeyi
> sürdürür; canlıya yazmaz. Testler **gerçek kullanıcı verisiyle** yapılır;
> başkasının verisi silinmez/değiştirilmez.
>
> **Her madde öncesi:** Yayınlanan build'in commit SHA'sı (Cloudflare Pages →
> deployment) ve saat not edilir. Aşağıdaki "Beklenen sonuç" sütunu geçerse
> madde ✅; **uyuşmazlık varsa "Kanıt" sütunundaki malzeme toplanır** ve
> madde ❌ olarak PR/teslimata yazılır.

## 0. Genel kurallar

- Test **production** ortamında yapılır; preview'a ayrı değer tanımı olabilir.
- İkinci bir hesap gereken maddelerde **ikinci e-posta hesabı** veya **gizli
  pencere** kullanılır (aynı oturum iki kullanıcıyı temsil edemez).
- Kimlik doğrulaması olmayan akışlar için **cihaz hesabı** (bu cihaza özel)
  ayrıca kullanılır; cihaz hesabı ile Firebase hesabı **karıştırılmaz**.
- Hata toplanırken: tam saat (UTC), hesap türü (Firebase / cihaz), tarayıcı +
  sürüm, commit SHA, ekran görüntüsü, DevTools **Console** ve **Network**
  sekmelerindeki ilgili istek/hata, Firestore Console'da ilgili belgenin
  hâli (var/yok/alanlar) — hassas veriler (token, e-posta, koordinat geçmişi)
  maskelemeden paylaşılmaz.

## 1. Giriş (Firebase e-posta/şifre)

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 1.1 | Daha önce kaydedilmiş e-posta + şifre ile giriş yap | Panel kapanır, harita açılır; profil adı Header'da görünür | Console'da `auth/*` kodu; Network'te kimlik doğrulama isteğinin durumu; ekran görüntüsü |
| 1.2 | Yanlış şifre ile giriş dene | "Hatalı kimlik bilgisi" benzeri Türkçe hata; form yerinde kalır; ham Firebase hatası ekrana basılmaz | Hata metninin ekran görüntüsü; Console |
| 1.3 | Google ile giriş (yapılandırıldıysa) | Popup/redirect tamamlanır; oturum açılır | `auth/unauthorized-domain` veya `auth/operation-not-allowed` kodu; Console |
| 1.4 | Çıkış yap | Giriş ekranına dönülür; harita verisi oturuma özel kalır | — |

## 2. Yer kaydı

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 2.1 | Haritada bir yere uzun bas / keşif ekle → başlık, kategori, not, fotoğraf → **Kaydet** | Modal kapanır; pin haritada görünür; `places/{id}` belgesi oluşur (`kind: "user"`) | Console `permission-denied`; Network'te yazma isteği; Firestore'da belgenin olmaması |
| 2.2 | Yer ayrıntısında **Kaydet** (kütüphaneye) | "Kaydedildi" durumu; `users/{uid}/savedPlaces/{placeId}` oluşur; Kaydettiklerim'de listelenir | Aynı yukarıdaki |
| 2.3 | Sayfayı yeniden yükle | Kayıtlı yerler geri gelir (Firestore aboneliği) | — |

## 3. Rota yayını ve gizli pencerede açma

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 3.1 | Rota oluştur → **Yayınla** → görünürlük "Bağlantısı olanlar" (unlisted) | `routes/{id}` oluşur; paylaşım linki üretilir; keşif akışında **listelenmez** | `permission-denied`; iç içe dizi hatası (`Nested arrays`) — bu durumda `toFirestoreRoute` serileştirme kaydı |
| 3.2 | Linki **gizli pencerede** (ikinci oturum) aç | Rota okunur; haritada çizilir; **Kaydet** ile ikinci hesabın kütüphanesine girer | İkinci oturumda `permission-denied` → `readRouteIfVisible` / rules `visibility` kuralı; Console + Network |
| 3.3 | "Herkese açık" rota | Keşif akışında listelenir; `saveCount` artar | — |
| 3.4 | "Yalnız ben" (private) rota | Gizli pencerede **açılamaz** (yetkisiz: boş/bilgi sayfası; hata patlaması yok) | İkinci oturumda erişilebildiyse bu **güvenlik bulgusudur**; rules + istemci kaydı acil iletilir |

## 4. Grup: kur / kodla katıl / kodu yenile

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 4.1 | Grup kur | Grup oluşur; katılma kodu (6–8 hane) görünür | Console; `groups.ts` hata mesajı |
| 4.2 | İkinci hesap kodla katıl | Katılım başarılı; üye listesinde görünür; mesaj akışı açılır | "Kod geçersiz" / `permission-denied` ayrımı; kodun gerçekten üretildiği an |
| 4.3 | Sahip katılma kodunu **yeniler** | Eski kodla katılım reddedilir, yeni kodla kabul edilir; mevcut üyeler etkilenmez | Eski kodla katılmaya çalışan üçüncü hesabın hata metni |
| 4.4 | Üye olmayan hesabı grupta okumaya çalış | Okuma reddedilir (`permission-denied`) | Kural delinirse **güvenlik bulgusu**; rules testleri + Console |

## 5. Arkadaşlık

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 5.1 | İkinci hesabı UID/profil ile ekle | İstek/arkadaşlık oluşur; iki tarafta da görünür | Console; Firestore'da arkadaşlık belgesi |
| 5.2 | Engelle (varsa) | Engellenen kullanıcı içerik/mesajlarında görünmez | — |

## 6. Yürüyüş kaydı → bitir → kaydet → yayınla

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 6.1 | "Yürüyüş kaydı" panelini aç, **Kaydı başlat** (Firebase hesabı) | Kayıt başlar; süre/mesafe/ölçüm sayacı işler; canlı önizleme çizgisi görünür | Konum izni reddi ayrı; Console'da `watchPosition` hatası |
| 6.2 | ~10–15 dk yürü (2–3 durak), **Bitir ve kaydet** | İzin yoksa kayıt **kaydedilmez** (otomatik yazılmaz); taslak rota açılır; iz **gizli** kalır; ham iz paylaşılır sayılmaz | `Nested arrays` hatası → `toFirestoreRoute` kaydı; `permission-denied` → rules; `trackRuleViolation` mesajı |
| 6.3 | Taslağı adlandır → **Yayınla** | `routes` dokümanı oluşur; ikinci hesap linkten açabilir (bkz. 3.2) | — |
| 6.4 | Kaydı **Sil** | İzin taslakla birlikte kaybolur; bulutta iz kalmaz | Firestore'da `tracks` belgesinin kalması |

## 7. Cihaz hesabında "kaydet" düğmesinin yokluğu

**Kod kanıtı:** `src/components/TrackRecorderPanel.tsx` — `canRecord =
firebaseConfigured && cloudAccount`; cihaz hesabında (`backend === "device"`)
kayıt başlatma kapalıdır, kayıt başlamayınca **"Bitir ve kaydet" düğmesi hiç
sunulmaz**. Firebase yapılandırması yoksa panelde "Bulut hesabı bağlı değil.
Bu cihazda kayıt alınamaz." bilgisi görünür.

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 7.1 | Cihaz hesabıyla oturum aç → "Yürüyüş kaydı" paneli | "Kaydı başlat" **devre dışı/düğme sunulmuyor**; "Bitir ve kaydet" **yok**; kullanıcı yürüyüşün sonuna kadar gidip `permission-denied` ile karşılaşmaz | Ekran görüntüsü (düğmenin göründüğü hâli); hesap tipi; Console |
| 7.2 | Cihaz hesabında bulut yayını denemesi mümkünse | Yayın/kaydet eylemi sunulmaz ya da açıklayıcı Türkçe uyarıyla durur; ham Firestore hatası basılmaz | Hata metni; hangi yüzeyde sunulduğu |

## 8. Telefon düğmesinin yokluğu

**Kod kanıtı:** `src/components/AccountAccess.tsx` — `PHONE_AUTH_ENABLED =
import.meta.env.VITE_PHONE_AUTH_ENABLED === "true"`; düğme yalnız bu bayrak
`true` iken render edilir. Üretimde bayrak **açık değildir** (kalıcı kapalı
kararı: teslimat 2026-10-21).

| # | Adım | Beklenen sonuç | Hata olursa kanıt |
| --- | --- | --- | --- |
| 8.1 | Çıkış yap → giriş ekranı | "Telefon numarasıyla giriş yap" düğmesi **yoktur**; telefon/OTP formu açılmaz | Ekran görüntüsü; `.env`/Pages değişkeni değeri **değer yazılmadan** yalnız açık/kapalı durumu |
| 8.2 | (İstisna) `VITE_PHONE_AUTH_ENABLED=true` ise | Console'da Phone sağlayıcısı kapalıysa `auth/operation-not-allowed`; ikisi birlikte açık değilse düğme hiç görünmemeli | Kombinasyon tablosu not edilir |

## 9. Sonuç bildirimi

Her tur sonunda:

1. Geçen/eksik kalan maddeler ✅/❌ tablosu (madde numaralarıyla).
2. ❌ maddeler için kanıt paketi (madde 0'daki liste).
3. Deployment commit SHA'sı + saat + ortam (production/preview).
4. Güvenlik bulgusu şüphesinde (3.4, 4.4) **önce kullanıcıya acil bildirim**;
   detaylı yazışma gizli kanaldan.

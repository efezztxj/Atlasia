# Atlasia — reklam / tanıtım planı (Ekim 2026)

> **Bu belge ne?** Ürünü "ilgi çekici" biçimde anlatmak için tek bir büyük fikir,
> ondan türeyen 6 video formatı, 30 günlük yayın takvimi, düşük bütçeli saha
> dağıtımı ve ölçüm planı. Kodu değiştirmez; üretim tarafı hazır olduğunda
> `social/queue/` dosyalarıyla yayına bağlanır.
>
> **Durum:** öneri (kullanıcı onayı bekliyor). Tarih: 2026-10-26.
>
> **Kısıtlar (repodan):** yayın hattı GitHub → Cloudflare, native mağaza yayını
> hedef değil (PWA), lansman tek pilot bölge mantığına dayanıyor
> ([ROADMAP](../../ROADMAP.md) §1), kanıtsız üstünlük iddiası yazılmaz
> ([iddia envanteri](../denetim/iddia-envanteri.md)).

---

## 0. Tek cümlelik ürün gerçeği

Atlasia, **bir yeri merak edip haritaya dokunduğunda** o yerin hikâyesini,
oraya nasıl ve hangi sırayla gidileceğini ve başka gezginlerin bıraktığı küçük
ipuçlarını aynı ekranda veren bir keşif haritasıdır. Tarayıcıda çalışır,
cihaza eklenebilir.

Reklamın anlatacağı şey "bir gezi uygulaması daha" değil; **"gitmeden önce
orayı zihninde gezme"** hissi. Çünkü bizi ayıran şey rota motoru değil,
merakın kendisi.

---

## 1. Büyük fikir: **"Bir yere dokun."**

### Mekanik

Her video aynı 0,8 saniyeyle açılır:

> Karanlıkta dönen gerçek uydu görüntüsü. Bir parmak ekranda **tek bir noktaya**
> dokunur. Kamera o noktaya dalar, harita yakınlaşır ve o yerin **sesi**
> başlar (rüzgâr, çarşı uğultusu, dalga, ayak sesi).

Sonra 2–3 saniyelik gerçek içerik, sonra marka: **atlasia.**

### Neden bu fikir

| Sorun | Bu fikrin çözümü |
|---|---|
| Gezi içeriği birbirine benziyor (drone + müzik + "gitmen gereken 10 yer") | 0,8 saniyelik **imza hareketi**: 3 videodan sonra kullanıcı markayı sesi açmadan tanıyor |
| Ürünün en güçlü yanı ekran görüntüsünde kayboluyor | Dokunma → dalma hareketi, ürünün kendi metaforu (harita = kapı) |
| Tek pilot bölgeyle büyük kampanya yapılamaz | Marka serisi bölgeden bağımsız; **yerel** içerik ayrı katman olarak ekleniyor |
| Ücretsiz üretim gerekiyor | Tek bir hareket, ücretsiz araçlarla bile tutarlı seri üretilebilir: aynı giriş + farklı gövde |

### Slogan adayları

1. **"Dünyayı merakınla keşfet."** — mevcut açılış ekranıyla aynı, marka dili korunur (önerilen ana slogan).
2. **"Haritaya dokun, dünyaya düş."** — kampanya cümlesi, video açılışlarına birebir oturur.
3. **"Her yer bir hikâye."** — sesli rehber/ses katmanını öne çıkaran ikincil cümle.

Karar: **1 ana slogan**, **2 kampanya cümlesi**, **3 alt başlık**. Üçünü aynı
videoda kullanma; her video tek cümle söyler.

---

## 2. Kime konuşuyoruz

| Kitle | Ne yapar | Bizden ne ister | Hangi format ona gider |
|---|---|---|---|
| **Kararsız gezgin** (25–40, İzmir/İstanbul) | Hafta sonu için 3 sekme açık: harita, blog, Instagram | "3 saatim var, ne yapayım" sorusuna **karar** | F2, F3 |
| **Kulaklıkla gezen** (20–32) | Sesli rehber/ASMR içeriği tüketir | Yerinde hissetmek | F4, F1 |
| **Yerel meraklı** (İzmir, Selçuk) | "Bu şehirde bilmediğim ne var" | Kendi şehrinde turist olmak | F5, F6 |
| **Gezgin izi bırakan** | İçerik üretir, arkadaşına mekân önerir | Görünürlük, davet | F6 |

**Pilot bölge önerisi:** İzmir + Selçuk/Efes hattı. Gerekçe: repodaki rehber
noktaları zaten Türkiye ağırlıklı (`src/data/places.ts`), saha etkinliği tek
günde ulaşılabilir, "Efes'in önünden geçip içine girmeyen" güçlü bir
anlatı var. Bölge kararı açık; bu bir **öneri**.

---

## 3. Altı format (hepsi dikey, 1080×1920, altyazı zorunlu)

Her formatın bir işi var. Aynı hafta iki "reach" videosu + bir "kaydetme"
videosu yayınlanır; hepsi aynı işi yapmaz.

### F1 · Dokunma (marka serisi, 6–8 sn)
- **İş:** hatırlanırlık, profili ziyaret.
- **Akış:** gece Dünyası → dokunma → dalış → 2 sn yer sesi → `atlasia.` + "bunu haritada aç".
- **Ses:** gerçek ortam sesi, müzik yok.
- **Ne zaman:** her hafta 1 tane, sabit gün (perşembe). Seri numarası kullan: `#BirYereDokun 07`.

### F2 · "30 saniye, 3 karar" (motoru göster, 20–30 sn)
- **İş:** "bunu ben de yapabilirim" hissi, kaydetme.
- **Akış:** ekran kaydı → "İzmir, 3 saatim var, yürüyerek" yazısı → tempo seçimi → rota çizilir → AI tek tek **neden** o durağı seçtiğini söyler → "7 durak, 3,4 km, 3 sa 10 dk".
- **Kritik:** süre/mesafe **gerçek** olsun; abartma yok. Açıklanabilirlik bu ürünün güveni.
- **Altyazı örneği:** "Rota sihir değil: her durak için bir gerekçe yazıyor."

### F3 · "Aynı yer, iki kişi" (split screen, 15 sn)
- **İş:** farkı göstermek.
- **Akış:** sol: herkesin gittiği, herkesin aynı fotoğrafı çektiği nokta. Sağ: 400 m ötede bir gezginin bıraktığı iz + tek satır not.
- **Son kare:** "İkisi de aynı haritada. Biri kalabalık, biri senin."
- **Not:** gerçek kullanıcı fotoğrafı kullanılıyorsa **izin** alınır; yoksa kendi çekimini kullan.

### F4 · "Kulaklığı tak" (duyusal, 15–20 sn)
- **İş:** en çok **kaydedilen** tür; sesli rehberi tek başına anlatır.
- **Akış:** sessiz sokak → kulaklık takılır → şehir sesi kısılır → anlatıcı başlar → ekranda "konum izni sende, ses sen isteyince".
- **Kural:** ürünün gerçeğini koru — ses kendiliğinden açılmaz (bkz. [LandingPage](../../src/components/LandingPage.tsx) "Kontrol sende").
- **Ses:** müzik değil, **anlatıcı sesi** + ortam. Bu, ilk 1 saniyede ayırt edici.

### F5 · "Turist tuzağı #3" (tartışma, 20 sn)
- **İş:** yorum → erişim. En hızlı büyüme buradan gelir ama marka güvenini de en çok riske atan format.
- **Akış:** "Efes'te herkes aynı kapıdan giriyor. İkinci kapı 12 dakika yürüyüş, kalabalığın yarısı." → tek cümle kanıt → haritada nokta.
- **Kural:** **yer adı vererek küçümseme yok**, "şu mekân çöp" demek yasak. Sadece "şu saatte şurada kalabalık" gibi doğrulanabilir bilgi. Yanlış bilgi çıkarsa düzeltme videosu zorunlu.
- **Numaralandır:** `#3` merak yaratır, seri takibi getirir.

### F6 · "İzimi bıraktım" (davet döngüsü, 12 sn)
- **İş:** kullanıcı getirme (viral katsayı).
- **Akış:** biri haritaya pin bırakır, not yazar → arkadaşı davet linkini açar → aynı noktayı haritada görür → "ben de bir tane bırakıyorum".
- **CTA:** "Sen de bir iz bırak, arkadaşına gönder." (uygulama indirme değil, **davet**).
- **Yerel saha etkinliğinde** çekilen gerçek görüntülerle beslenirse en yüksek dönüşüm burada.

**Format karışım oranı (haftada 3 yayın):** F1 (1) + F2/F4 (1) + F3/F5/F6 (1).
Hiçbir hafta 2 tartışma videosu yok; üst üste F5 marka güvenini yakar.

---

## 4. 30 günlük takvim

Mevcut kuyrukta 4 hazır Reels var (`social/queue/`: Kyoto, Göreme, Venedik,
Pamukkale — Ekim 28–31). Onlar **ilham katmanı** olarak kalır; kampanya
onların üstüne biner. Tarihler örnek, kaydırılabilir.

| Hafta | Gün | Video | Format | Ana cümle | Amaç |
|---|---|---|---|---|---|
| 1 | Sal | "İzmir, 3 saatim var" | F2 | "Karar senin, hesabı biz yaparız." | kaydetme |
| 1 | Per | `#BirYereDokun 01` — Efes | F1 | "Haritaya dokun, dünyaya düş." | hatırlanırlık |
| 1 | Cmt | "Efes'te ikinci kapı" | F5 | "12 dakika yürü, kalabalığın yarısı." | erişim |
| 2 | Sal | "Kulaklığı tak: Selçuk" | F4 | "Ses, sen isteyince başlar." | kaydetme |
| 2 | Per | `#BirYereDokun 02` — Kapadokya | F1 | — | hatırlanırlık |
| 2 | Cmt | "Aynı yer, iki kişi" | F3 | "İkisi de aynı haritada." | profil tıklaması |
| 3 | Sal | "Atlas AI rotayı neden böyle çizdi" | F2 | "Sihir değil, gerekçe." | güven |
| 3 | Per | `#BirYereDokun 03` — Pamukkale | F1 | — | hatırlanırlık |
| 3 | Cmt | **Saha günü** çekimi: gerçek kişiler | F6 | "Sen de bir iz bırak." | davet |
| 4 | Sal | "Bu hafta haritaya bırakılan 3 iz" | F6 | — | topluluk kanıtı |
| 4 | Per | `#BirYereDokun 04` — İzmir | F1 | — | hatırlanırlık |
| 4 | Cmt | "Turist tuzağı #4" + düzeltme/cevap videosu | F5 | — | erişim + güven |

**Kural:** her videoda **tek CTA**. Ya "kaydet", ya "profilden haritayı aç", ya
"arkadaşına gönder". Üçünü birden istemek hiçbirini yaptırmıyor.

**CTA dili (mağaza yok):**
- ✅ "Cihazına ekle" · "Haritada aç" · "Kaydet, hafta sonu lazım olacak"
- ❌ "App Store'dan indir" · "Play Store" · "ücretsiz uygulamamızı indir"

---

## 5. 30 günlük çekim listesi (en güçlü iki video, saniye saniye)

### F2 — "İzmir, 3 saatim var" (28 sn)

| sn | Görüntü | Ses / altyazı |
|---|---|---|
| 0–2 | Boş harita, imleç sahilde | "İzmir. 3 saat. Arabam yok." |
| 2–5 | Tempo seçimi: yürüyerek | "Sadece yürüyorum." |
| 5–12 | Duraklar haritada sırayla belirir | "5 durak. Neden bu sırayla?" |
| 12–20 | Her durakta 1 sn kart: kategori + süre | "Kemeraltı 60 dk · Kordon 25 dk · ..." |
| 20–25 | Özet: mesafe, süre, tempo | "3,4 km · 3 sa 10 dk · 7 durak tavanı" |
| 25–28 | Marka + "cihazına ekle" | "Karar senin, hesabı biz yaparız." |

**Çekim notu:** tamamı ekran kaydı; telefonu sabitle, fare hareketini yavaşlat
(0,5× hızda oynat, kayıtta 1,5× hızlandır). İlk kare **kapak** olarak da
kullanılır — üzerine 5 kelimeyi geçmeyen metin.

### F4 — "Kulaklığı tak: Selçuk" (18 sn)

| sn | Görüntü | Ses |
|---|---|---|
| 0–3 | Mermer taşlar, ayak sesi, kalabalık | ortam (müzik yok) |
| 3–5 | Kulaklık takılır, ortam **kısılır** | "Mermerin üstünde 2.000 yıllık bir gölge var." |
| 5–13 | Yürüyüş, detay çekimleri (oyma, sütun) | anlatıcı 2 cümle, sonra susar |
| 13–16 | Telefon ekranı: konum izni kutusu | "İzin sende. Ses sen isteyince." |
| 16–18 | Marka | — |

**Çekim notu:** tek lokasyon, 40 dakika, telefon yeterli. Anlatıcı sesi
**stüdyoda** kaydedilir (rüzgâr sesi bozar); sahada sadece ortam toplanır.

---

## 6. Ücretsiz / düşük bütçeli dağıtım

Öncelik sırası: **saha → davet → iş birliği → influencer → (en son) ücretli reklam.**

### 6.1 Saha aktivasyonu (İzmir / Selçuk) — en yüksek getiri
- **"İlk ışık turu"**: Efes açılışında 20 kişilik yürüyüş; katılımcıya tek sayfalık
  kart + QR (haritada aç). Kartfiye değil **içerik**: 3 gizli nokta, 1 uyarı.
- **Kafe masa kartı**: Karşıyaka/Alsancak'ta 10 kafe, masada "bu kafeden 8 dakika
  yürüyüşte 3 nokta var" kartı. Kafe sahibine maliyeti sıfır, ona da müşteri kalma süresi.
- **Hostel/pansiyon panosu**: A4 QR, "bugünkü 3 saatlik rotan".
- Ölçüm: QR okutma sayısı (UTM'li link), hesap açma, ilk iz bırakma.

### 6.2 Davet döngüsü (ürünün kendi motoru)
- Her saha katılımcısına **tek kullanımlık davet** hissi veren cümle:
  "Bu rotayı arkadaşına gönder, o da kendi izini bıraksın."
- Mevcut davet akışı kullanılır (`buildFriendInviteLink`), yeni özellik gerekmez.

### 6.3 Topluluk / üniversite
- Ege ve Dokuz Eylül gezgin–outdoor kulüpleriyle **"kampüs çevresi 1 saat"** rotası
  yarışması; kazanan rota uygulamada yayınlanır (ödül para değil, görünürlük).
- Kulüp WhatsApp/Telegram gruplarına girilen tek mesaj: 4 satır + 1 video. Uzun tanıtım yazısı gönderilmez.

### 6.4 Mikro-influencer (5–30 bin izleyici, 3 kişi, barter)
- "Gizli yer" anlatan, yüzü görünen, yorumlarına cevap veren hesaplar.
- Brif: "uygulamayı övme, **bir rotayı kullan ve sonucu göster**." Okunmamış reklam
  metni yerine gerçek kullanım.
- Karşılık: ücretsiz erken erişim + ismiyle rota ("Ayşe'nin Karşıyaka 2 saati") —
  ileride kalıcı bir ürün yüzeyi olabilir.

### 6.5 Ücretli reklam — **şimdi değil**
Neden erteleniyor: pilot bölge yoğunluğu ve ilk hafta elde tutma bilinmeden
harcanan para, indirme/ziyaret getirir ama 7. gün dönüşü olmadan boşa gider.
Kural: **organikte 3 video üst üste "kaydetme oranı > %2" yakaladıktan sonra**
küçük bütçe (günlük sembolik tutar) ile sadece kazanan videoyu ölçekle.

---

## 7. Ölçüm

Her videonun tek birincil metriği var; panik yapıp hepsine bakma.

| Format | Birincil metrik | İyi sayılan | Yorum |
|---|---|---|---|
| F1 Dokunma | 3 sn izlenme oranı | > %70 | Hareket tutuyor mu |
| F2 motor | **kaydetme / erişim** | > %2 | "İşe yarar" sinyali |
| F3 iki kişi | profil tıklaması | > %1 | Merak → kim bu |
| F4 kulaklık | kaydetme + paylaşım | > %3 | Duyusal içerik en çok kaydedilir |
| F5 tuzak | yorum + takipçi | yorum/erişim > %1 | Tartışma çalıştı mı |
| F6 iz | **davet linki açılması** | > %0,5 | Döngü kapanıyor mu |

Ürün tarafı (30 gün, **hedef** — vaat değil):

- 12 video, 40+ kısa klip/tekrar kullanım
- 150 yeni hesap, 60 ilk iz bırakma
- Saha gününden 20 katılımcı, en az 12'si hesap açmış
- "Cihaza ekle" olayı: ilk 30 günde ölçülür, hedef **belirsizken sabitlenmez**

> Not: analitik altyapı repoda yok; bu tabloyu doldurmak için ya manuel
> haftalık sayım ya da ayrı bir görevle hafif, çerezsiz ölçüm eklenmesi gerekir
> (KVKK metinleri ve "reklam/analitik çerezi yok" ifadesi buna göre güncellenmeli).

---

## 8. Yapma listesi (marka güvenini koruyan sınırlar)

1. **"Türkiye'nin en iyi gezi uygulaması"** gibi kanıtsız üstünlük iddiası yok.
2. **Mağaza CTA'sı yok** — ürün web/PWA.
3. **Mekân gömme yok** — "şu yer çöp" demek yerine "şu saatte kalabalık" de.
4. **İzinsiz kullanıcı içeriği yok** — ekran görüntüsünde başka kullanıcının adı/fotoğrafı görünmesin.
5. **Lisanssız müzik yok** — Instagram'ın kütüphanesi dışına çıkma; sesli rehber serisinde müzik zaten yok.
6. **Abartılı rota iddiası yok** — "patika navigasyonu" değil; çizgi durakları bağlar ([ROADMAP](../../ROADMAP.md) §2.3).
7. **Tek pilot bölge disiplini** — aynı hafta 5 farklı ülke videosu yayınlarsa topluluk yoğunluğu mesajı kaybolur.
8. **Otomatik yayına dikkat** — `social/queue/` dosyaları birleşince GitHub Actions gerçekten yayınlar; taslak metinler kuyruğa değil bu belgeye yazılır.

---

## 9. Hazır metinler

**5 caption (kopyala–yapıştır):**

1. `İzmir'de 3 saatin var ve araban yok. 5 durak, 3,4 km. Hangisini atlayacağını söylemek de işin parçası. Kaydet, hafta sonu lazım olacak.`
2. `Efes'te herkes aynı kapıdan giriyor. İkinci kapı 12 dakika yürüyüş, kalabalığın yarısı. Aynı taşlar, daha az omuz.`
3. `Kulaklığı tak. Mermerin üstünde 2.000 yıllık bir gölge var. Ses sen isteyince başlar — konum izni sende kalır.`
4. `Aynı haritada iki yer: biri herkesin fotoğrafı, biri bir gezginin notu. İkincisini bulmak 40 saniye sürdü.`
5. `Haritaya bir iz bıraktım, arkadaşım aynı noktayı gördü ve kendi izini bıraktı. Bu hafta haritaya 3 iz düştü.`

**Aynı video için 3 hook varyantı (A/B):**
- A: `3 saatim var, arabam yok.` (kısıt)
- B: `Bu rotayı bir gezgin değil, harita çizdi.` (merak)
- C: `Efes'te 7 durak var ama sadece 3'üne vaktin var.` (kayıp korkusu)

**Profil biyografisi (tek satır):**
`Haritaya dokun, dünyaya düş. · Dünyayı merakınla keşfet. · Cihazına ekle, ücretsiz.`

---

## 10. Sonraki adımlar (karar gerektirenler)

| # | Karar | Kim | Sonuç |
|---|---|---|---|
| 1 | Pilot bölge İzmir/Selçuk mu? | kullanıcı | Saha planı buna göre kilitlenir |
| 2 | Slogan: 1 mi 2 mi ana cümle | kullanıcı | Tüm kreatifler tek cümleye hizalanır |
| 3 | 4 mevcut Reels "ilham" mı, pilot mu | kullanıcı | Takvim sırası değişir |
| 4 | Hafif ölçüm eklenecek mi | kullanıcı + ayrı görev | Ölçüm tablosu dolar |
| 5 | Saha günü tarihi ve 20 kişilik liste | kullanıcı | F6 çekimi ve davet döngüsü başlar |

Hazır olduğunda yapabileceklerim: yukarıdaki 5 caption'ı `social/queue/`
JSON'larına dönüştürmek (yayın tarihi sende), video senaryolarını storyboard
görsellerine çevirmek, saha kartının tek sayfa tasarımını hazırlamak.

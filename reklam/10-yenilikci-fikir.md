# 10 yenilikçi fikir

> Klasik "reklam ver, bekle" listesi değil. Her fikirde şu var: **ne**, **neden kimse
> yapmıyor**, **hangi kodun üstüne oturuyor**, **maliyet**, **ilk 3 adım**, **ölçüm**, **risk**.
>
> Hepsi [`200 Metre`](README.md) şemsiyesinin altında ama birbirinden bağımsız çalışır.
> Numara sıralama değil; sonda "hangisiyle başla" var.

| # | Fikir | Tür | Maliyet | Etki süresi |
|---|---|---|---|---|
| 1 | Kayıp 200 Metre Haritası | Ürün + pazarlama hibriti | ₺0 | 3–6 ay |
| 2 | Şehir Radyosu | Sesli UGC | ₺0–500 | 2–4 ay |
| 3 | Rota Takası | Büyüme döngüsü | ₺0 | Hemen |
| 4 | 200 Metre Raporu | Veri gazeteciliği | ₺0 | Tek seferlik, uzun kuyruk |
| 5 | Hava Widget'ı | SEO / backlink | ₺0 | 6–12 ay (birikimli) |
| 6 | Sessiz Saat | Gerçek dünya etkinliği | ₺0–2.000 | Tek gece, aylarca içerik |
| 7 | Esnaf Kartı | Fiziksel dağıtım | ₺1.500 | Kalıcı |
| 8 | Ters Rota | Karşıt içerik | ₺0 | Haftalık |
| 9 | Rota Kliniği | Canlı yayın | ₺0 | Haftalık, yüksek dönüşüm |
| 10 | İz Yarışı | Şehir rekabeti | ₺0 | Sezonluk |

---

## 1 · Kayıp 200 Metre Haritası

**Fikir:** Herkesin bildiği noktaların etrafındaki 200 metrelik halka haritada
**kapalı** başlıyor. Oraya yürüyen biri geri bildirim bıraktığında (ya da iz kaydettiğinde)
halka **açılıyor.** Harita toplulukla birlikte doluyor.

**Neden yeni:** Türkiye'de kimse haritayı "eksik" göstermiyor. Herkes dolu, kusursuz
bir harita vaat ediyor. Sen tam tersini yapıyorsun: **eksiği ürün yapıyorsun.** Ayrıca
bu, reklamdan çok daha iyi bir şey — *reklamın kendisi ürün oluyor.* Kişi reklamı
izlemiyor, **katılıyor**.

**Nasıl çalışır (kod):** `places` koleksiyonunda `kind: "user"` pinleri zaten var.
200 m halka = `haversineKm` (mevcut `src/utils/geo.ts`) ile merkez noktadan mesafe
filtresi. Halka "açık" mı? O bbox'ta en az 1 kullanıcı pini veya izi var mı → var.
Halka açılınca `stories` gibi geçici bir "az önce açıldı" etiketi göster.

**İlk 3 adım:**
1. 12 pilot nokta seç (Efes, Göreme, Pamukkale, İzmir merkez…), hepsinin 200 m halkasını kapalı işaretle.
2. Ayrı, tek sayfalık teaser: `atlasia.pages.dev/200metre` → "12 nokta kapalı. 12 halka açılacak. Katıl."
3. Açılan halkayı **günlük story** olarak paylaş: *"Efes'in 3. halkası açıldı. Açan: @kullanıcı."*

**Ölçüm:** Halka açma sayısı (hedef: 30 günde 12), katılan yeni kullanıcı.

**Risk:** Veri azken harita "boş ve üzgün" görünür. **Çözüm:** 12 halkadan 3'ünü
kurucu + ilk 10 kişiyle baştan aç, gerisi gerçekten topluluktan gelsin.

---

## 2 · Şehir Radyosu

**Fikir:** Kullanıcılar bir noktaya **15 saniyelik sesli not** bırakıyor. Her hafta
bunlardan 3 dakikalık bir bölüm kurgulanıyor: **"Radyo Atlasia — 04. bölüm: Efes."**
Instagram'da hem tek tek sesli kartlar hem haftalık bölüm.

**Neden yeni:** Herkes video dolduruyor; kimse **ses** doldurmuyor. Ses, izlerken
farklı bir dikkat istiyor ve kulaklıkla dinleniyor — yani insan **yürürken** tüketiyor.
Ürünle aynı ritim. Bir de: sesli not bırakan kişi, videosunu çeken kişiden 10 kat
daha az çekingen; katılım oranı yüksek olur.

**Nasıl çalışır (kod):** `NearbyAudioGuide` zaten `speechSynthesis` ile anlatıyor —
yani "ses" dili üründe var. Kayıt tarafı `MediaRecorder` (tarayıcıda var, ek paket yok).

> ⚠️ **Gerçek kısıt:** Ses dosyası yüklemek depolama ister → Firebase Storage = **Blaze**.
> `AGENTS.md` bunu açık onay olmadan yasaklıyor. İki yol var:
> **(a) ₺0 yol:** ses yüklenmez, cihazda kalır; kullanıcı bölüme katılmak için sesi
> **DM/e-posta ile gönderir**, kurguyu sen yaparsın. 20 kişilik başlangıç için fazlasıyla yeter.
> **(b) Ölçek yolu:** Blaze kararı (aylık birkaç dolar) + 15 sn × ~30 sınırı.
> **Başlangıç (a) ile yapılır**, (b) yalnız talep kanıtlanınca açılır.

**İlk 3 adım:**
1. Tek bir nokta seç (Efes, Magnesia Kapısı). "Buradan geçen bir ses bıraksın" çağrısı.
2. İlk 5 notu kendin topla, 3 dakikalık pilot bölümü kurgula (CapCut, ₺0).
3. Yayınla + duyuru: *"Bu bölümdeki seslerin hepsi oraya yürümüş insanlardan."*

**Ölçüm:** Bölüm başına dinlenme, not gönderen kişi sayısı.

**Risk:** Ses moderasyonu zor (hakaret, reklam). `report`/`ban` altyapısı var ama
ses için dinleme emeği gerekir. **Çözüm:** İlk 3 ay her notu **sen dinle**; ölçek
gerekirse "yalnız davetli kayıt" modeline geç.

---

## 3 · Rota Takası

**Fikir:** İki şehirden iki kişi eşleşiyor. **Herkes karşısındakinin şehri için rota
çiziyor.** "Sen benim İzmir'imi gezeceksin, ben senin İstanbul'unu." Sonuç: 2 rota,
2 gönderi, 1 hikâye, karşılıklı takipçi.

**Neden yeni:** Normal davet "arkadaşını getir" der ve getirmez. Rota takası ise
**karşılıklı bir borç** yaratıyor: "ona rota çizdim, o da çizecek" → geri dönme baskısı
sosyal, mekanik değil. Ayrıca ürünün en güçlü özelliğini (rota paylaşımı) reklam
yapmadan gösteriyor.

**Nasıl çalışır (kod):** Zaten hazır. `buildRouteShareUrl` → `#r=<token>`
([`shareLinkUrl.ts`](../src/utils/shareLinkUrl.ts)), yayınlanmış rota →
`?route=<id>` ([`publishedRouteOpen.ts`](../src/lib/publishedRouteOpen.ts)), davet →
`#arkadas=<uid>` ([`inviteLink.ts`](../src/utils/inviteLink.ts)). **Sıfır yeni kod.**
Yalnız bir eşleştirme sayfası (statik form + Sheets/Airtable) yeter.

**İlk 3 adım:**
1. "Sezon 1: 15 İzmirli & 15 başka şehirli" duyurusu, form (2 dakika).
2. Elle eşleştir, her çifte 2 hafta süre ver.
3. Ortaya çıkan rotaları haftalık story'de yayınla, çiftleri etiketle.

**Ölçüm:** Çift başına tamamlanan rota, rotaların açılma sayısı, çiftlerin paylaşımı.

**Risk:** Eşleşenler işi yapmaz. **Çözüm:** 30 kişiyle başla, %50 tamamlama
bekle — bu *normaldir*, başarı değil başarısızlık göstergesi sayma.

---

## 4 · 200 Metre Raporu

**Fikir:** Büyük iddiayı **ölç**. 12 turistik noktada, noktanın kendisinde ve 200 metre
gerisinde birer saatlik insan sayımı yap. Sonuç: **"12 noktada ölçtük: 200 metre
sonrasında kalabalık ortalama %X azalıyor."** Grafik + kısa rapor + basın notu.

**Neden yeni:** Türkiye'de turizm içeriği ya gezi yazısı ya sponsorlu liste. **Veriyle
konuşan kimse yok.** Sayı, tartışmayı başlatıyor: "yok canım o kadar değildir" diyen
de paylaşıyor. Ayrıca rapor **senin 200 Metre fikrinin kanıtı** oluyor — reklamın
kendine inanması, reklamdan daha etkili.

**Nasıl çalışır:** Sayım için teknoloji gerekmez. Telefon + 5 dakikalık video + elle
sayım, ya da basit bir "geçen insan sayısı" not defteri. 12 nokta × 2 saat × 2 kişi =
bir hafta sonu. Raporu **statik sayfa + PDF** olarak `atlasia.pages.dev/rapor` altına koy.

**İlk 3 adım:**
1. 12 nokta listesi + sayım protokolü (aynı gün, aynı saat dilimi — yoksa veri çöp).
2. Bir hafta sonu say, fotoğrafla belgele.
3. Grafik + 300 kelime + basın notu; 15 gezi/teknoloji bültenine gönder.

**Ölçüm:** Basında çıkma, rapor sayfası görüntüleme, gelen backlink.

**Risk:** Örneklem küçük → "bilimsel değil" eleştirisi. **Çözüm:** Başlıkta
"ölçtük" de, "kanıtladık" deme; metodu **açıkça** yaz (nokta, saat, kişi sayısı).
Dürüst metodoloji, eleştiriyi tartışmaya çevirir.

---

## 5 · Hava Widget'ı — "Bu hafta sonu nereye?"

**Fikir:** Herkese açık, ücretsiz, gömülebilir bir kutu: **"Bu hafta sonu [şehir]'de
hava nasıl, hangi gün gitmeli, hangi rota?"** Blog sahipleri, hostel siteleri, yerel
haber siteleri kendi sayfalarına gömer. Altında küçük bir "Atlasia ile rotanı çiz".

**Neden yeni:** Reklam vermeden **dağıtım** kuruyorsun. Widget başkasının sitesinde
duruyor, senin sunucun çalışıyor (open-meteo keyless → **₺0**). Her gömme bir backlink
+ bir marka gösterimi + SEO. Türkiye'de kimse "hava durumuna göre rota" widget'ı
dağıtmıyor; veri zaten sende (`optimizeForRain`, `fetchWeatherSeries`).

**Nasıl çalışır (kod):** `src/utils/weather.ts` içinde `fetchWeatherSeries`,
`optimizeForRain`, `dailyRainNote` **hazır ve keyless**. Widget = küçük bir
iframe sayfası (`public/widget.html` + Vite'ın ayrı girişi), parametreyle şehir.
Sunucu yok, cron yok, kota yok.

**İlk 3 adım:**
1. Tek şehir (İzmir) için widget sayfasını yap — 1 gün.
2. 20 siteye **elle** teklif et: "sayfana koyalım, ₺0, sadece güzel dursun" (hostel, gezi blogu, yerel haber).
3. Her ay en çok görüntülenen 3 siteye rapor gönder ("widget'ın 12.000 kez görüldü") — sadakat.

**Ölçüm:** Gömme sayısı, widget'tan gelen tıklama, kazanılan backlink.

**Risk:** Kimse kendi sitesine yabancı kutu koymak istemez. **Çözüm:** Marka
görünürlüğünü **küçült**, değeri büyüt (widget kendi başına işe yarasın).

---

## 6 · Sessiz Saat

**Fikir:** Bir ören yeri / müze / tarihî mahalleyle anlaşıp, **kapanıştan sonra**
30 kişilik bir yürüyüş. Herkes kulaklıkta, uygulamanın sesli anlatımıyla, sessizlik içinde.
Sonda 10 dakika sohbet. Bilet yok, davet var.

**Neden yeni:** Uygulama reklamı yapmıyorsun, **uygulamanın vaadini bir gece boyunca
gerçek yapıyorsun.** Katılan 30 kişi 30 içerik üreticisi oluyor. Ayrıca "sessizlik"
teması 200 Metre'nin tam zıt kutbu (kalabalığın olmadığı yer) — kampanya kendi kendini
besliyor.

**Nasıl çalışır:** Davet = `#grup=<id>.<kod>` bağlantısı ([`inviteLink.ts`](../src/utils/inviteLink.ts)).
Katılımcılar uygulamada gruba giriyor, rota orada duruyor. **Ürün, etkinliğin bileti oluyor.**

**İlk 3 adım:**
1. Küçük bir yer seç (özel müze, küçük ören yeri, belediye izniyle bir sokak) — büyük kurumla başlama, 6 hafta sürer.
2. 30 kişilik davet listesi: 20 gerçek kullanıcı + 10 mikro-influencer.
3. Geceyi **tek bir fotoğrafçıya** çektir; 3 reels + 1 carousel çıkar.

**Ölçüm:** Katılım oranı, o gece bırakılan iz sayısı, sonraki 7 günde yeni kayıt.

**Risk:** İzin süreci. **Çözüm:** "Etkinlik" değil **"test yürüyüşü"** olarak tanımla;
kuruma yük olmadığını (bilet yok, kalabalık yok, gürültü yok) net söyle.

---

## 7 · Esnaf Kartı

**Fikir:** Turistik noktaya 200 m mesafedeki kafeler, kitapçılar, hostellerin tezgâhına
A5 kart: bir tarafta **"200 metre gerisi: şu rota"** + QR (`#r=<token>`), diğer tarafta
mekânın kendi adı. Mekân, kartı dağıtmanın sahibi oluyor.

**Neden yeni:** Tabela kiralama değil, **karşılıklı fayda**. Esnaf, "turist bende 20
dakika otursun" istiyor; sen "turist 200 metre yürüsün" istiyorsun. İkisi de oluyor.
Ayrıca kart **fiziksel** — telefonunda 400 uygulama olan birinin bile cebine giriyor.

**Nasıl çalışır (kod):** QR hedefi `https://atlasia.pages.dev/#r=<token>` — rota
paylaşım tokeni ([`shareLinkUrl.ts`](../src/utils/shareLinkUrl.ts)). Token'ı her mekân
için ayrı üret → **hangi kartın işe yaradığını görürsün.**

**İlk 3 adım:**
1. 10 mekân seç (Efes/Selçuk çevresi ya da İzmir merkez), tek tek git, kartı göster.
2. Kart tasarımı: 2 renk, kredi kartı boyu, arka yüzde mekân adı — baskı 100 adet ≈ ₺1.500.
3. Her karta farklı `utm_content=<mekan>` koy → hangi tezgâhın çalıştığını ölç.

**Ölçüm:** Kart başına QR okutma (10 kart arasında sıralama), mekân başına rota açılma.

**Risk:** Kart çöpe gider. **Çözüm:** Kartı "reklam" gibi değil **"şehrin küçük
haritası"** gibi tasarla — insanlar harita atmaz.

---

## 8 · Ters Rota

**Fikir:** Haftalık seri: **"Bu hafta: [şehir]'in en çirkin rotası."** Turistik olmayan,
hatta iddialı biçimde **kötü** bir güzergâh: sanayi mahallesi, en işlek kavşak, en
sıradan simitçi. Ama gerçek. Sonunda tek cümle: *"Burası da bir yer. Kimse yazmıyor."*

**Neden yeni:** Herkes "gizli cennet" satıyor. **Kimse "sıradan olan da değerli"
demiyor.** Karşıt içerik, gezi nişinde en hızlı kimlik kurma yolu — ayrıca
"gizli cennet" içeriğinden çok daha dürüst, bu yüzden daha çok güven üretiyor.

**Nasıl çalışır:** Mevcut rota motoru + `stories`. Rota **elle** yazılır (site turu
mantığı: tur yazılır, hesaplanmaz). Seri kimliği: siyah-beyaz kolaj + aynı font.

**İlk 3 adım:**
1. 4 ters rota yaz (İzmir, Efes çevresi, Denizli, Kapadokya).
2. İlkini yayınla, yorumlarda "senin şehrinin en çirkin rotası neresi?" diye sor.
3. Gelen cevapları **sonraki bölümün** malzemesi yap (içerik döngüsü).

**Ölçüm:** Yorum + kaydetme oranı (bu seri tıklamadan çok **etkileşim** getirir).

**Risk:** "Kötü yerleri niye gösteriyorsun" tepkisi. **Çözüm:** Hiçbir mekânı
aşağılama — **"sıradan"** de, "kötü" deme. İnsanları değil, *bakışı* eleştir.

---

## 9 · Rota Kliniği

**Fikir:** Haftada bir, 25 dakika, canlı yayın. Takipçi bir kısıt yazıyor:
*"3 saatim var, 2 çocuk, yağmur ihtimali yüksek."* Sen **canlı canlı** rotayı
kuruyorsun, ekranı paylaşıyorsun, neden o sırayı seçtiğini anlatıyorsun.

**Neden yeni:** Tanıtım değil, **iş yaparken izlenmek**. İnsanlar ürünü görmek değil,
**birinin işini yaparken düşünmesini** izlemek istiyor. Ve her bölüm 4–5 kısa
kırpılmış video üretiyor → bir canlı yayın, bir haftalık içerik.

**Nasıl çalışır:** `AtlasAssistant` + rota sihirbazı ekranda. "Neden bu sıra?"
açıklaması ürünün gerçek özelliği — yani canlıda **hiçbir şey uydurmuyorsun.**

**İlk 3 adım:**
1. 4 hafta için 4 kısıt topla (form veya yorum).
2. Instagram Live + YouTube (biri yedek). Tek seferde 25 dakika, senaryo yok.
3. Yayın sonrası 3 klip: "3 saatlik rota", "çocuklu rota", "yağmur planı".

**Ölçüm:** Canlı izleyici, yayın sonrası 24 saatte kayıt, klip başına erişim.

**Risk:** İlk 2 yayın boş geçer (10–15 kişi). **Çözüm:** Bu normaldir; boş yayını
**klip üretim tesisi** olarak gör, izleyici sayısına değil kliplere bak.

---

## 10 · İz Yarışı

**Fikir:** Şehirler yarışıyor: **"İzmir vs İstanbul — bu ay kim daha çok iz bıraktı?"**
Canlı (ya da günlük güncellenen) bir sayfa: şehir başına iz sayısı, toplam km,
en çok gezilen mahalle. Kazanan şehre "Ayın Şehri" etiketi.

**Neden yeni:** Rekabet, davetten daha güçlü bir yakıt. Ve burada rekabet **kişisel
değil**, şehirsel — yani kaybetmek kimseyi utandırmıyor. İnsanlar kendi şehirlerini
savunmak için içerik üretiyor. Ayrıca "toplam km" gibi bir sayı, ürünün **kayıt izi**
özelliğini (GPS ile yürüyüş kaydı) doğal olarak gösteriyor.

**Nasıl çalışır (kod):** `useTrackRecorder` + `places` zaten var. Sıralama için
**her okumada toplama yapma** — Spark'ta 50.000 okuma/gün. Günlük bir özet belgesi
(`stats/cities`) yaz, sayfa **yalnız onu** okusun. Bu detay olmadan kota dolar.

**İlk 3 adım:**
1. 3 şehirle başla (İzmir, İstanbul, Ankara). Sıralama sayfası statik + günlük özet.
2. Her hafta story: "İzmir öne geçti", kazanan mahalleyi göster.
3. Ay sonunda kazanan şehirden 3 kullanıcının izini "ayın rotası" ilan et.

**Ölçüm:** Yarışa katılan benzersiz kullanıcı, iz sayısı, şehir sayfası trafiği.

**Risk:** Kota + boş tablo. **Çözüm:** Önce **tek şehir içi mahalle yarışı** yap
(Karşıyaka vs Alsancak) — küçük ölçekte dolu görünür, sonra şehirlere çıkar.

---

## Hangisiyle başla? (30 gün)

Üçünü birlikte çalıştır, çünkü üçü **farklı** iş yapıyor:

| Sıra | Fikir | Neden şimdi | Süre |
|---|---|---|---|
| 1 | **#9 Rota Kliniği** | En hızlı geri bildirim. Haftada 1 yayın, 0 lira, 4 klip. | 1 hafta |
| 2 | **#5 Hava Widget'ı** | Birikimli. Bugün kur, 6 ay sonra trafik getirir. | 3 gün + yayma |
| 3 | **#1 Kayıp 200 Metre** | Kimlik. Ürünle pazarlamayı aynı şeye çeviriyor. | 3 hafta |

**Sonra:** #4 (Rapor) → basın. #3 (Takas) → topluluk. #2 (Radyo) → marka.
**En son:** #10 (İz Yarışı) — çünkü yeterli kullanıcı olmadan tablo boş görünür.

---

## Ortak kurallar (hepsi için)

1. **Ölçmeden başlama.** Önce [`README.md` §7](README.md) üç işi (UTM, pixel, tek dönüşüm).
2. **Kota.** Spark: günde 50.000 okuma. Toplama/sıralama işleri **özet belgesiyle** yapılır, ham sorguyla değil.
3. **Blaze/Storage yok.** Ses, foto, video yükleme gerektiren her fikir önce **₺0 varyantıyla** başlar.
4. **İzin.** Fiziksel iş (kart, gece yürüyüşü, rapor) için mekân/belediye izni önce alınır.
5. **Dürüstlük.** "En iyi", "devrimsel", "tüm Türkiye" yok. Ölçtüğünü söyle, ölçmediğini söyleme.
6. **Tek seferlik değil, seri.** Bir kez yapılan iyi fikir, 4 kez tekrarlanan ortalama fikirden zayıftır.

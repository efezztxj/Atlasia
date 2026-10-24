# Fikir üretimi — 12 yeni özel konsept (tur 2)

**Tarih:** 2026-10-24 · **Kesit:** `main` = `06c0e0a` · **Önceki turlar:** `reklam-plani-2026-10-24.md` (12 konsept),
`fikir-bankasi-2026-10-24.md` (52 fikir), `ozel-fikir-kor-rota.md` (Kör Rota)

> Bu dosya **tekrar değil.** Aşağıdaki 12 fikrin her biri, ürünün *kullanılmayan* bir gerçeğine dayanır ve
> her biri **bir ürün moduna** dönüşebilir — yani reklamı yapılacak şey, aynı zamanda yol haritası adayı.
> Her fikirde: kanca cümlesi, ilk 1,5 saniye, dayandığı kod, emek, risk ve "neden bizde var, rakipte yok".

**Seçim ölçütü (bu turda uyguladım):** (1) taklit edilmesi zor, (2) mevcut kodla 1 hafta içinde demo olur,
(3) reklamı ürünün *dürüstlük* çizgisini bozmuyor, (4) tek başına bir seriye açılır.

---

## 1. Ters Rehber — "Bugün oraya gitme"

**Kanca:** *"Sana nereye gideceğini söyleyen uygulamalar var. Bu, nereye gitmeyeceğini de söylüyor."*
**İlk 1,5 sn:** Sisli patikada, yolu kesen ince koyu kırmızı kurdele. Ses yok. Yazı: **"Bugün buraya gitme."**
**Dayanak:** `optimizeForRain` + `dailyRainNote` (yağışa göre yeniden sıralama), `nearbyPlaces` mesafe filtresi,
`issues` kategorisi (yerel sorun pinleri: "çamurlu", "yol kapalı").
**Neden bizde var:** Rakipler pozitif öneri motoru kurar; negatif gerekçe üretmek için **veri + cesaret** gerekir.
Bizde zaten iki kaynak var: hava modeli ve topluluk sorun pinleri.
**Emek:** S · **Risk:** "Gitme" demek sorumluluk → gerekçe her zaman yazılı, "yine de git" düğmesi var, kapanış saati iddiası **yok** (doğrulanmadı).

## 2. İlk İz — "Burada henüz kimse yok"

**Kanca:** *"Haritada bir yer var: kimse gitmemiş. İlk iz senin olabilir."*
**İlk 1,5 sn:** Boş harita; tek bir gri nokta, sonra altın rengine dönüyor.
**Dayanak:** `places.kind: "guide" | "user"` — rehber noktaları ile kullanıcı izleri ayrı; `useCollections` + `addPlace`.
**Neden bizde var:** Çoğu uygulama "popüler olanı" gösterir. Bizim ayrımımız **rehber vs topluluk**: "burada hiç iz yok" bilgisi
kendi başına bir davettir (ve topluluk yoğunluğu problemini — ROADMAP §1 — doğrudan besler).
**Emek:** M (bir "ilk iz" rozet/etiket mantığı + boş durum metni) · **Risk:** boş bölgede "değmez" hissi → yalnız doğrulanmış yerlerde aç.

## 3. Mühür Yarışı — pilot bölgede 10 kör rota

**Kanca:** *"Şehirde 10 mühürlü rota var. İlk açan sen olursan haritada adın kalır."*
**İlk 1,5 sn:** Haritada yavaş yavaş yanan 10 zarf ikonu.
**Dayanak:** Kör Rota mekaniği (40 m mührü) + paylaşım linki + `stories`/pin yazma.
**Neden bizde var:** Kör Rota'nın büyüme motoru hâli. Etkinlik, tek şehirde, 2 hafta, sıfır reklam bütçesiyle.
**Emek:** L (etkinlik operasyonu + moderasyon) · **Risk:** ödül vaadi verme; "adın kalır" yeterli, maddi ödül hukuki yük.

## 4. Gölge Rotası — yaz sıcağında "şimdi gölgede olan yol"

**Kanca:** *"Öğlen 2'de Efes'te güneşte yürümek istemiyorsan rota değişir."*
**İlk 1,5 sn:** Aynı patika, iki farklı saat: biri kavurucu, biri gölgeli (kesme).
**Dayanak:** `sun.ts` (güneş açısı, altın saat), `elevation.ts` (DEM profili), rota motorunda tempo/varış saati.
**Neden bizde var:** Güneş geometrisi elimizde. **Ama dikkat:** bina/ağaç gölgesi verisi yok → "gölge" iddiası
**yalnız güneşe göre yön ve eğim** üzerinden kurulabilir ("kuzey yamaca bakan, öğleden sonra gölgede kalan yön" gibi temkinli dil).
**Emek:** S (reklam) / M (ürün) · **Risk:** abartılı gölge iddiası = yanıltıcı reklam → kesinlikle "tahmini" dili.

## 5. Rota DNA — "bu rota neden böyle çıktı"

**Kanca:** *"Her uygulama rota verir. Bu, rotanın nasıl çıktığını gösteriyor."*
**İlk 1,5 sn:** Ekranda bir karar ağacı büyüyor: süre → tempo → hava → mesafe → durak.
**Dayanak:** `routePlanner` (maxStops, SPEED/STAY tabloları, haversine × 1,25), her durağın `aiReason` alanı.
**Neden bizde var:** Açıklanabilirlik ürün tezinin merkezinde; rakipler kara kutu. Bu, **marka kimliğinin görselleşmesi**.
**Emek:** S (reklam: ekran kaydı) · **Risk:** teknik detay izleyiciyi boğar → 3 adımda anlat, gerisini "kaydır"a bırak.

## 6. Sesli Kartpostal — varışta 10 saniye kaydet

**Kanca:** *"Oraya vardığında 10 saniye kaydet. Arkadaşın aynı yere vardığında seni dinlesin."*
**İlk 1,5 sn:** Telefon, mavi saat, tek cümle: *"Buradan bakınca..."*
**Dayanak:** `NearbyAudioGuide` (konum tetikleme) + `shareLink` (link içinde taşıma) + `stories` (24 saat).
**Neden bizde var:** Konum tetiklemesi + link içi taşıma bir arada var; "kartpostal" bunun duygusal ambalajı.
**Emek:** M-L (ses kaydı + moderasyon) · **Risk:** UGC ses moderasyonu → pilotta yalnız davetli, 24 saat ömür, şikâyet akışı (mevcut `moderation`).

## 7. Boş Alan — "kayıt yok, öneri yok"

**Kanca:** *"Bazı yerlerde uygulama susuyor. Çünkü uydurmuyor."*
**İlk 1,5 sn:** Harita; bir bölgeye zoom; ekranda: **"Burada yeterli iz yok."**
**Dayanak:** `planRoute`'un gerçek reddetme cümlesi (Ay'a rota posterinde kullandık) — ürünün en özgün davranışı.
**Neden bizde var:** Sektörde "her yere rota" iddiası norm; **susmak** bir özellik.
**Emek:** S · **Risk:** "boş uygulama" algısı → hemen ardından "ama şurada 6 iz var" göster.

## 8. İki Kişilik Rota — link iki kişiye

**Kanca:** *"Rotayı paylaş. O da yürüsün. Sonra ikinizin izini yan yana gör."*
**İlk 1,5 sn:** Bölünmüş ekran: aynı rota, iki farklı yürüyüş çizgisi.
**Dayanak:** `shareLink` (rota linkte) + `useTrackRecorder` + `trackPrivacy` (ham iz gizliliği).
**Neden bizde var:** Link kurulum istemiyor; iz kaydı var; ikisini birleştiren ürün yok.
**Emek:** M · **Risk:** gizlilik — ham iz paylaşımı açık onay ister (mevcut kapı korunur).

## 9. Kalabalık Kaçkını — bayram sabahı

**Kanca:** *"Bayramın ilk günü Efes'e gitmeyi düşünüyorsan: 09:00."*
**İlk 1,5 sn:** Kalabalık kapı görüntüsü + üstüne yazı: **"09:00."**
**Dayanak:** `STAY`/`maxStops` ile saat planı, `optimizeForRain` (yeniden sıralama), site turu saatleri.
**Neden bizde var:** Saat bazlı plan zaten çıktı; "kalabalık" tahmini **veri değil**, öneri olarak sunulur.
**Emek:** S · **Risk:** "kalabalık olmaz" garantisi yasak → "kalabalıktan önce" dili.

## 10. Pusula Kartı — fiziksel QR'lı mühür

**Kanca:** *(Video değil, ürün.)* Pilot bölgedeki 200 kart: ön yüz pusula, arka yüz tek QR → kör rota.
**Dayanak:** `shareLink` (linkte rota), `?tab=` kısayolları (mevcut), mühür mekaniği.
**Neden bizde var:** Dijital link + fiziksel obje; kafe/otel işbirliğiyle dağıtılır, basım maliyeti düşük.
**Emek:** M (tasarım + basım + dağıtım) · **Risk:** kişisel veri yok, kart üzerinde yalnız link → KVKK yükü minimal.

## 11. Doğrulama Turu — "bunu ben de gitmedim"

**Kanca:** *"Bu rehberdeki 28 yerin hepsine gittim mi? Hayır. Hangilerine gitmediğimi söyleyeyim."*
**İlk 1,5 sn:** Kurucu, haritada bir noktayı işaretliyor; ekranda "gitmedim" etiketi.
**Dayanak:** `placeAdvice.ts` içindeki "Doğrulanmadı" alanları; `docs/icerik/yer-kaynaklari.md` (kaynak + erişim tarihi).
**Neden bizde var:** İçerik borcu **açıkça** belgelenmiş; bu, reklamı yapılabilecek bir dürüstlük hikâyesi.
**Emek:** S · **Risk:** "eksik ürün" algısı → her "gitmedim"in ardından "ama kaynağı ve tarihi var" göster.

## 12. Yürüyüş Sayacı — "42 dakika, 3 durak, 1 hikâye"

**Kanca:** *"Bir yürüyüşün özeti: 42 dakika, 3 durak, 1 hikâye. Hepsi tek karede."*
**İlk 1,5 sn:** Bitmiş bir izin kuşbakışı görüntüsü + tempo/süre sayacı.
**Dayanak:** `useTrackRecorder` (GPS filtre, 7 m sadeleştirme), `TrackRibbonPreview`, `summarizeDraft`.
**Neden bizde var:** Strava estetiği ama **hikâye** ile: iz + anlatım aynı karede.
**Emek:** S (ekran kaydı) · **Risk:** yok; en güvenli format.

---

## Sıralama (etki ÷ emek)

| Sıra | Fikir | Neden bu sırada |
| --- | --- | --- |
| 1 | **Ters Rehber** | Tek cümlede anlaşılıyor, rakipte yok, mevcut veriyle çalışır |
| 2 | **Rota DNA** | Marka kimliğini görselleştiriyor, ekran kaydıyla sıfır maliyet |
| 3 | **Boş Alan** | Ürünün en özgün davranışı (susmak), 8 saniyede anlatılır |
| 4 | **İlk İz** | Topluluk yoğunluğu problemini doğrudan besler |
| 5 | **Mühür Yarışı** | Kör Rota'nın büyüme motoru; etkinlik formatı |
| 6 | **İki Kişilik Rota** | Paylaşım mekaniğini ikiye katlar |
| 7 | **Sesli Kartpostal** | Duygusal tepe, ama moderasyon işi var |
| 8 | **Yürüyüş Sayacı** | En güvenli, en ucuz |
| 9 | **Kalabalık Kaçkını** | Mevsimsel; zamanlama değeri yüksek |
| 10 | **Gölge Rotası** | Güçlü ama "gölge" iddiası veriyle sınırlı |
| 11 | **Pusula Kartı** | Fiziksel dağıtım operasyonu gerektirir |
| 12 | **Doğrulama Turu** | Kurucu yüzü gerektirir; güven getirisi yüksek |

---

## Çekim kâğıdı — #1 Ters Rehber (12,7 sn, sesli)

**Kreatif:** `docs/pazarlama/kreatifler/ters-rehber/` · video: `sesli-ters-rehber.mp4`
(ana kareler AI ile üretildi; video `scripts/pazarlama/kedi-video.py --bolum ters-rehber --ses` ile yeniden üretilir)

| Sn | Görsel | Yazı |
| --- | --- | --- |
| 0-2,6 | sisli patika, yolu kesen koyu kırmızı kurdele | **Bugün buraya gitme.** / *Sebebini söyleyeyim.* |
| 2,6-5,2 | kurdele makro, ötede altın nokta | **Hava, mesafe, zemin.** / *Üçü birden olmuyorsa o durak listeye girmiyor.* |
| 5,2-7,8 | boş yön levhası (üç ok, biri buğulu) | **Yerine bunu koydu.** / *Aynı manzara, 900 metre yakın, kurusu.* |
| 7,8-10,2 | marka zemini | **Bazen "gitme" der.** / *Sebebi her zaman yazılı.* |
| 10,2-12,7 | patika, geri çekilme | **Ters rehber.** / *atlasia.pages.dev · link var, mağaza yok* |

**Yayın metni (TR):**
```
Sana nereye gideceğini söyleyen uygulamalar var. Bu, nereye gitmeyeceğini de söylüyor.
Yağış, mesafe ve zemin aynı anda kötüyse o durak listeye girmiyor. Yerine aynı manzarayı veren,
kuruda kalan bir durak koyuyor. Sebebi her zaman yazılı — "çünkü öyle" değil.

Ne yapmıyor: navigasyon değil, açılış saati garantisi değil, ekran kapalıyken rehberlik değil.
Görseller yapay zekâ ile üretildi. #atlasia #efes #izmir #seyahat #doğa
```

**Risk kontrolü:** "bugün gitme" demek sorumluluk → reklamda **kesin saat/ücret** iddiası yok, "yine de git" özgürlüğü var,
gerekçe her zaman görünür. Topluluk sorun pinleri yalnız "bir gezgin bildirdi" dilinde sunulur.

---

## Tek cümle

Bu turda fikirleri "reklam fikri" olarak değil, **reklamı yapılabilir ürün modu** olarak ürettim:
Ters Rehber, Rota DNA, Boş Alan ve İlk İz — dördü de mevcut kodla demo olur, dördü de taklit edilmesi zor.

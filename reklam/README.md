# Atlasia — Reklam Kiti: **200 Metre**

> Bu klasör bir fikir listesi değil, **çekime hazır** bir kampanya kiti.
> Amiral gemisi reklam fikri, 7 konsept, 3 çekilmiş sayılabilecek senaryo,
> 3 haftalık lansman planı, bütçe ve ölçüm planı burada.
>
> Kardeş dosyalar: [`metin-bankasi.md`](metin-bankasi.md) · [`reels/`](reels/) · [`pano.html`](pano.html)

---

## 0. 60 saniyede özet

| | |
|---|---|
| **Kampanya adı** | 200 Metre |
| **Tek cümle** | Herkesin durduğu yerden 200 metre daha yürü — Atlasia o 200 metrede ne olduğunu söylüyor. |
| **Neden bu** | "Başka bir harita" kategorisinde rekabet edilmez. "Kaçırdığın yer" duygusu paylaşılır. |
| **Format** | Dikey video (9:16), telefonla çekim, 10–20 saniye. Stüdyo yok. |
| **İlk 3 adım** | 1) 3 reels'i çek (`reels/`) · 2) ölçümü kur (§7) · 3) 14 gün × ₺300 Meta testi |
| **Başarı tanımı** | Kayıt başına maliyet ₺30'un altında **ve** kayıt olanların en az %30'u ilk hafta bir iz/rota bırakıyor. |
| **Bütçe** | ₺8.650 – ₺16.150 (organik çekim dahil, §6) |

**Tek sayı hedefi:** 3 haftada **2.000 tıklama → 250 kayıt → 60 ilk iz**. Gerisi gürültü.

---

## 1. Neyi satmıyoruz (bu bölüm reklamın yarısı)

Atlasia'yı "harita uygulaması" ya da "gezi rehberi" diye tanıtırsan, Google Maps ve
binlerce blog'la aynı rafta yarışırsın ve kaybedersin. Kategorisi şu değil:

| ❌ Bu değil | Neden olmaz |
|---|---|
| "Daha iyi bir harita" | MapLibre + açık harita verisi kullanıyorsun. Harita kalitesinde iddia yarışı kaybedilir. |
| "Gezi rehberi" | Rehber kitapları 40 yıldır aynı 8 yeri yazıyor; bu bir **karşıt** olarak işine yarar, kimlik olarak değil. |
| "Sosyal ağ" | Yoğunluk yok. Boş bir akış gösteren reklam, indirip silen kullanıcı üretir. |
| "Yapay zekâ her şeyi biliyor" | Abartı, güveni düşürür. "Neden bu sıra?" diye açıklayabilen motor gerçek ve yeterince etkileyici. |

**Atlasia şu:** *Bulunduğun yerde, zamanına göre, yürüyerek gidebileceğin sıralı bir
rota + o noktanın hikâyesi + oradan geçmiş birinin bıraktığı küçük ipucu.*

**Kanıtlı olan (reklamda rahatça söylenebilir):**

- "3 saatin var, yürüyorsun, tarih ilgileniyor → sıralı rota + durak süreleri" ([`routePlanner`](../src/utils/routePlanner.ts), `maxStops = min(7, saat / 0.85)`)
- "Her durağa **varış saatinde** hava durumu" (`attachStopWeather`, `routeStopArrivalWeather`)
- "Konum izni vermezsen ses başlamaz" ([`NearbyAudioGuide`](../src/components/NearbyAudioGuide.tsx) — ses `speechSynthesis` ile, cihaz sesi)
- "Gezginlerin bıraktığı notlar ve kendi izini haritaya bırakma" (`places`, `kind: guide | user`)
- "Rotayı bağlantıyla paylaş: `?route=<id>` veya `#r=<token>`" ([`shareLinkUrl.ts`](../src/utils/shareLinkUrl.ts))
- "Çevrimdışı paket" (bölge indirme)

**Kanıtsız / söylenmeyecek:**

- ❌ "Adım adım navigasyon" — rota çizgisi durakları bağlayan düz bir çizgi, yol tarifi değil.
- ❌ "Profesyonel seslendirme" — ses cihazın kendi TTS motoru.
- ❌ "Dünyanın her yeri" — içerik yoğunluğu birkaç bölgede. Reklamda **tek yer** göster.
- ❌ "Türkiye'nin en kapsamlı / en iyi" — kanıtı yok, güveni yakar.
- ❌ "Google Maps'ten iyi" — rakip ilan etmek, rakibin aklında kalmak demek.

---

## 2. Konumlandırma

**Kategori:** Keşif haritası (discovery map) — rehber değil, iz.
**Karşıt:** "Herkesin gittiği ilk 5 yer" ve "yıldızı en yüksek mekân".
**Tek cümle (reklamda kullanılacak hâli):**

> **Harita sana nereye gideceğini söyler. Atlasia neyi kaçırdığını söyler.**

Üç destek sütunu:

1. **Mesafe** — O 200 metre nerede, ne kadar sürer, sıradaki durak neresi.
2. **Hikâye** — Vardığında ne olduğunu anlatan biri var (sesli anlatım).
3. **İz** — Oradan geçmiş birinin bıraktığı not; sen de bırakabiliyorsun.

---

## 3. Büyük fikir: **200 METRE**

### İçgörü
Her ünlü yerin bir "ön sırası" vardır: aynı fotoğrafı çeken, aynı noktada duran kalabalık.
O noktadan 200 metre sonrası genelde **boş, daha güzel ve daha gerçek**tir. Kimse
oraya gitmez çünkü kimse "orada bir şey var" dememiştir. Uygulamanın işi tam olarak bu:
**200 metre sonrasını bilmek.**

### Neden bu fikir reklam olarak güçlü
- **Ölçülebilir bir iddia.** "Daha iyi" değil, "200 metre". Tek sayı, akılda kalır, tartışılır.
- **Aynı format her şehirde çalışır.** Kyoto, Efes, Göreme, Venedik, Pamukkale… Aynı iki çekim.
- **Üretimi bedava.** Telefon, iki açı, 14 saniye. Mevcut Yürüyüş Serisi'nin doğal devamı.
- **Yorum üretir.** Herkes kendi "200 metresini" yazar. Algoritma bunu sever.
- **Yoğunluk sorununu çözer.** "Dünyanın her yeri" demez; "şu 200 metre" der. İnandırıcı.
- **Bedava kreatif.** Üçüncü hafta kullanıcıların çektiği 200 metreler reklam olur.

### Kampanya mimarisi
```
200 METRE  (şemsiye fikir, hashtag: #200metre)
│
├── Kalabalığın bittiği yer      → farkındalık, seri içerik (haftada 2)
├── 3 saatim var                 → dönüşüm, ürün demosu (performans reklamı)
├── Taş konuşuyor                → duygu, sesli anlatım
├── Sıra kısa                    → topluluk, UGC döngüsü
├── Yağmur planı                 → farklılaşma (statik rehberlere karşı)
└── Sinyal yok                   → niş, yüksek niyet (yürüyüş/karavan)
```

---

## 4. Yedi reklam konsepti

Her konsept: **ilk 1,5 saniye** (kaydırmayı durduran şey) + çekim listesi + yazı.
Detaylı çekim senaryoları `reels/` içinde.

---

### K1 · "200 Metre" — amiral gemisi
**Hedef:** farkındalık + paylaşım · **Süre:** 16 sn · **Kanal:** Reels, TikTok, Shorts

**Hook (0–1,5 sn):**
> Kalabalığın ortasından çekim. Ekran yazısı: **"Herkes burada."**

**Akış:** Aynı açı, aynı ışık → 200 metre sonrası boş sokak. Yazı: **"200 metre sonra: kimse yok."**
Telefon ekranında rota, tek durak, "4 dk yürüyüş". Son kare: pin + bir gezginin notu.

**Kapanış yazısı:** **Aynı şehir. Aynı gün. 200 metre.**
**CTA:** "Kaç metre yürüyeceğini Atlasia söylüyor."

**Neden tutar:** Reklamın kendisi bir gözlem; ürün sadece o gözlemin aracı. İnsanlar
hemfikir olmak için yorum yazar, hemfikir olmak için paylaşır.

---

### K2 · "Kalabalığın bittiği yer" — seri
**Hedef:** süreklilik, haftalık görünürlük · **Süre:** 10–12 sn · **Kanal:** Reels (haftada 2)

**Hook:**
> "10.000 kapı var, herkes aynı 200 metrede kalıyor." *(Kyoto — hazır)*
> "Efes'te en çok fotoğraf çekilen yer, en sıkıcı yer." *(Efes — çekilecek)*
> "Venedik'te tek araba yok. Peki her şey nasıl geliyor?" *(Venedik — hazır)*

**Akış:** Yürüyüş + ekranda azalan kalabalık çubuğu (100 → 12). Son karede süre: "30 dk".
**CTA:** "Nerede biteceğini gör."

**Neden tutar:** Bu senin mevcut otomasyonunun ([`social/queue`](../social/queue/)) tam
olarak yaptığı iş — cümleleri zaten doğru kurulmuş. Eksik olan tek şey **seri adı**:
her videoya aynı köşe yazısını koy (`200 METRE · 04`), izleyici seriyi takip etsin.

---

### K3 · "Taş konuşuyor" — sesli anlatım
**Hedef:** duygusal farklılaşma · **Süre:** 15 sn · **Kanal:** Reels, TikTok

**Hook (0–2 sn):** Taşa yakın plan, sadece rüzgâr/ayak sesi. Yazı:
> **"Bu taş 1.900 yaşında. Ve sen ona bakıp geçiyorsun."**

**Akış:** Telefon kulağa gider, ses başlar (gerçek TTS çıktısı, temizlenmiş).
Ekran yazısı: **"Duymak için durman gerekiyor."**
**CTA:** "Kulaklığını tak. Geçme."

**Neden tutar:** Özellik listesi değil, bir **davranış değişikliği** satıyor: durmak.
Çekim tek bir taş, tek bir kulaklık — en düşük maliyetli, en yüksek hisli reklam.

> ⚠️ Ses cihaz TTS'i. Reklamda "stüdyo seslendirme" deme; **"kendi sesinle gibi"** de deme.
> Gerçek kayıt kullan, üstüne müzik koyma. Cızırtı olursa reklam olur, sorun değil.

---

### K4 · "3 saatim var" — ürün demosu (performans)
**Hedef:** kayıt/dönüşüm · **Süre:** 20 sn · **Kanal:** Meta feed + Reels, Google (YouTube)

**Hook (0–2 sn):** "Efes'te 3 saatim var. Nereden başlamalıyım?"
**Akış (ekran kaydı, hızlandırılmış):**
`3 saat` → `yürüyorum` → `tarih` → **Rota** (7 durak, saatleriyle) → bir durağa dokun →
"Varışta 27°, yağış %10" → "Neden bu sıra?" açıklaması.

**Kapanış:** "Aynı soruyu 40 kişiye sordum. 40 farklı cevap aldım."
**CTA:** "Rotanı çiz." → `atlasia.pages.dev/?tab=kesfet`

**Neden tutar:** Tek gerçek ürün kanıtı. Beğeni toplamaz ama **en çok kayıt getiren**
reklam bu olur. Bunu farkındalık reklamıyla karıştırma; ayrı kampanya, ayrı bütçe.

---

### K5 · "Yağmur planı"
**Hedef:** farklılaşma · **Süre:** 15 sn · **Kanal:** Reels, Meta

**Hook:** "Yarın Kapadokya'da yağmur var. Planın hâlâ geçerli mi?"
**Akış:** Rota yeniden sıralanıyor; her durağın altında varış havası beliriyor.
**CTA:** "Hava değişince plan da değişsin."

**Neden tutar:** Rehber kitaplarının yapamadığı tek şey. "Bu adam hava durumunu
düşünmüş" hissi, güveni bedavaya getirir.

---

### K6 · "Sıra kısa" — topluluk / UGC
**Hedef:** içerik üretimi, organik büyüme · **Süre:** 12 sn · **Kanal:** Reels, Story

**Hook:** "Bu notu bir gezgin bıraktı. Rehber kitabında yok."
**Akış:** Haritada pin → el yazısı not: *"Kapıdan girme, sağdan dolan. 10 dk."*
**CTA:** "Sen de bir iz bırak." → `atlasia.pages.dev/?tab=iz-birak`

**Neden tutar:** Büyüme döngüsünün reklamı. İzleyici reklamı izlerken **ürünün içeriğini
üretmeye** davet ediliyor; her gelen kişi bir sonraki reklamın malzemesi oluyor.

---

### K7 · "Sinyal yok" — niş, yüksek niyet
**Hedef:** yürüyüş/karavan kitlesi · **Süre:** 12 sn · **Kanal:** Reels, kamp grupları

**Hook:** Uçak modu ekranı + "Sinyal yok. Harita hâlâ burada."
**Akış:** Harita kaydırılıyor, pinler duruyor.
**CTA:** "İndir, çık."

**Neden tutar:** Bu kitlenin CPM'i düşük, niyeti yüksek. Ama kapsamı küçük — **bütçenin
%10'undan fazlasını verme.**

---

### K8 · "Kurucu notu" — ücretsiz, ama en çok güven getiren
**Format:** 8 slaytlık carousel veya 45 sn konuşma başı kamera. **Bütçe:** ₺0.

1. "Bunu neden yaptım" 2. "Bir yeri gezerken en çok neyi kaçırıyoruz" 3. "İlk sürümde
ne yanlıştı" 4. "Şu an ne yapamıyor (dürüst liste)" 5. "Kimi arıyorum" 6. "Nasıl
katılırsın" 7. "İlk 100 kişiye ne söz veriyorum" 8. "Link".

> Dürüst "yapamadıkları" slaytı, tüm reklam bütçesinden daha fazla güven üretir.
> Türkiye'de bu format hâlâ az kullanılıyor; fark yaratıyor.

---

## 5. Üç haftalık lansman planı

### Hafta 0 — reklamdan önce (5 gün, ₺0)
- [ ] §7'deki üç ölçüm işini bitir (**pixel + UTM olmadan tek kuruş harcama**)
- [ ] `reels/01`, `reels/02`, `reels/03` çek ve kurgula (tek günde biter)
- [ ] Mevcut 4 hazır video için köşe etiketi: `200 METRE · 01…04`
- [ ] Landing sayfasına 20 kelimelik şerit: *"Herkesin durduğu yerden 200 metre sonrası."*
- [ ] 10 mikro-influencer'a DM (§ `metin-bankasi.md` → Influencer mesajı)

### Hafta 1 — test (₺2.800)
| Gün | Organik | Ücretli |
|---|---|---|
| Pzt | reels/01 yayın | Meta: K1, geniş kitle, ₺150/gün |
| Çar | Kyto (hazır) | Meta: K4 (dönüşüm), ₺150/gün |
| Cum | reels/02 | TikTok Spark: K2, ₺100/gün |
| Paz | reels/03 | — |

**Kural:** İlk 72 saatte hiçbir şeyi optimize etme. Veri topla.

### Hafta 2 — ölçekle (₺3.500)
- En düşük **kayıt maliyeti** olan kreatifi %60 bütçeye çıkar, diğer ikisini kapat.
- Aynı gövde, **3 farklı hook** dene (hook = ilk 1,5 saniye). En iyi hook'u bul.
- Retargeting: videoyu %50 izleyenlere K4 + "İlk rotanı 3 dakikada çiz."
- Influencer reels'lerini **Spark Ads** ile öne çıkar (kendi hesabından yayınlanan, reklama dönen).

### Hafta 3 — UGC motoru (₺2.000 + tabela)
- Çağrı: **"Kendi 200 metreni çek."** En iyi 5 videoyu reklama çevir (yazılı izin al).
- 20 adet masa kartı / tabela: turistik noktanın 200 m gerisinde, QR → `atlasia.pages.dev/?tab=kesfet`
- **Kampanya:** *"İzmir'de 24 saatte 200 iz"* — harita canlı dolsun, ekran görüntüsü içerik olur.
- 14. gün karar toplantısı: devam / düzelt / dur (§7).

---

## 6. Bütçe (başlangıç hipotezi — ilk 3 günden sonra gerçek CPM ile güncelle)

| Kalem | Tutar | Not |
|---|---|---|
| Çekim + kurgu | ₺0 | Telefon, mevcut ışık, CapCut |
| Meta testi (14 gün × ₺300) | ₺4.200 | 2 kreatif × 2 kitle |
| Meta ölçekleme (7 gün × ₺500) | ₺3.500 | Kazanan kreatif |
| TikTok Spark (10 gün × ₺150) | ₺1.500 | 18–30, seyahat |
| Google Arama (14 gün × ₺100) | ₺1.400 | Yüksek niyet, marka + rota aramaları |
| Influencer (5 kişi, barter) | ₺0–₺3.000 | Nakit değil, erken erişim + rotada öne çıkarma |
| Tabela / masa kartı (20 adet) | ₺1.500 | **İzin şart** (belediye / işletme) |
| **Toplam** | **₺12.100** | ₺8.650 minimum (sadece Meta) |

**Hedefleme (2026 gerçeği: detaylı ilgi alanları zayıf, kreatif belirleyici):**

| Kampanya | Kitle | Amaç |
|---|---|---|
| Yerinde | Pilot bölge çevresi 50 km + İzmir | "Şu an buradayım" → yüksek dönüşüm |
| Planlayan | İstanbul, Ankara, İzmir, 22–40, geniş | Seyahat planlama dönemi, içerik/paylaşım |
| Arayan | Google: `efes gezi rotası`, `kapadokya 1 gün plan`, `yürüyüş rotası oluştur` | En yüksek niyet, en düşük hacim |

> Coğrafyayı **pilot bölgeye kilitlemek** cazip ama yanlış: uygulamanın içeriği Efes,
> Kapadokya, Kyoto, Venedik. Reklamı "İzmir" ile sınırlarsan, ürünün en iyi olduğu
> yerlere hiç ulaşmazsın. Yerinde kampanyayı **ek** tut, ana bütçeyi "planlayan"a ver.

---

## 7. Ölçüm — reklamdan önce yapılacak 3 iş

Bu üçü yapılmadan reklam vermek, karanlıkta para yakmak. Üçü de küçük iş.

**1. UTM ilk-dokunuş yakalama**
`?utm_source=instagram&utm_medium=reels&utm_campaign=200metre&utm_content=kyoto`
adresi şu an sadece `tab` ve `route` parametrelerini okuyor ([`appShortcut.ts`](../src/utils/appShortcut.ts)).
Yapılacak: ilk gelişte `utm_*` değerlerini `localStorage`'a yaz, kayıt tamamlanınca
`users/{uid}.acquisition` alanına kopyala. **20 satırlık iş**, tüm kampanyanın karnesi buna bağlı.

**2. Onay kapılı pixel**
[`cookieConsent.ts`](../src/lib/cookieConsent.ts) içinde `marketing` kategorisi zaten var ama
hiçbir şey yüklemiyor. Meta Pixel yalnız `hasCookieConsent(..., "marketing") === true` ise
yüklensin. KVKK tarafında bu **zorunlu**, teknik tarafta zar zor 1 saat.

**3. Tek dönüşüm olayı**
Üç olay yeter, fazlası gürültü:
- `signup_completed`
- `first_pin_created` (ilk iz)
- `route_planned` (ilk rota)

Reklamı **`first_pin_created`**'a optimize et, `signup`'a değil. Kayıt olup hiçbir şey
yapmayan kullanıcı, reklamın başarısız olduğu anlamına gelir.

**Panel (haftalık, 10 dk):**
```
harcama → tıklama → kayıt → ilk iz → 7. gün geri dönüş
```

**Karar kuralları (14. gün):**

| Durum | Karar |
|---|---|
| Kayıt maliyeti < ₺30 **ve** ilk iz oranı > %30 | Bütçeyi 2× yap, yeni şehir ekle |
| Kayıt maliyeti ₺30–60 | Kreatifi değiştir (gövde aynı, hook yeni), 7 gün daha |
| Kayıt maliyeti > ₺60 **veya** ilk iz < %15 | Ücretli reklamı durdur. Sorun reklamda değil, ilk 60 saniyede. |

> **Kritik uyarı — kota:** Firebase **Spark** planı günde 50.000 okuma. Reklam
> çalışınca bu tavan *reklamın başarısı yüzünden* dolar ve uygulama **herkese** kapanır.
> Harcamaya başlamadan önce tavanı yükselt (Blaze + bütçe alarmı, bkz.
> [`docs/operasyon-onerileri.md`](../docs/operasyon-onerileri.md) §2) ya da kampanyayı
> kontrollü başlat. **Reklamın başarısı ürünü öldürmesin.**

---

## 8. Reklamdan sonra ilk 60 saniye (dönüşümün gerçek yeri)

Reklamla gelen kişi linke bastığında ne görüyor? Bugün: landing → "Keşfe başla" → harita.
Bu akış **izleyiciyi ziyaretçi, ziyaretçiyi kullanıcı** yapmıyor. Minimum üç dokunuş:

1. **Reklama özel açılış.** `?utm_campaign=200metre` geldiyse landing'de tek cümle:
   *"Reklamda gördüğün 200 metre burada. Nerede olduğunu görmek için haritayı aç."*
2. **Konum izni kapısı.** İzin verilirse yakındaki 3 nokta hazır gelsin; verilmezse
   "İzmir'i keşfet" gibi elle seçilebilir bir başlangıç.
3. **İlk izi kolaylaştır.** Kayıt sonrası tek hedef: bir noktaya tek dokunuşla not bırakmak.
   İlk izi bırakan kullanıcı 7. gün geri dönme olasılığı en yüksek kullanıcı tipi.

---

## 9. Yapma listesi

- ❌ Reklamda **kalabalık bir ürün ekranı** gösterme. Tek özellik, tek kare.
- ❌ Aynı videoyu 5 farklı kitlede 5 kez yayınlama; kreatif yorulur, CPM artar.
- ❌ "Ücretsiz" kelimesini kalıcı söz gibi kullanma; "şu an ücretsiz" de.
- ❌ Yorumlara savunmaya geçerek cevap verme. En iyi cevap: *"Haklısın, burada kötü.
  Hangi şehirde denedin? Düzeltelim."*
- ❌ Yorum satın alma, takipçi satın alma, "gezi sayfalarına" toplu DM.
- ❌ Reklamı **ölçmeden** ölçekleme. Hissiyat bütçe değildir.
- ❌ Başkasının videosunu izinsiz kullanma (UGC reklama dönünce yazılı izin al).

---

## 10. Dosyalar

| Dosya | Ne var |
|---|---|
| [`metin-bankasi.md`](metin-bankasi.md) | 24 hook, 10 caption, 6 reklam metni, influencer DM'leri |
| [`kanca-kurgu.md`](kanca-kurgu.md) | **Kanca -> Konu -> Etki** yapisi, 12 hazir senaryo, 30 kanca, eslestirme tablosu |
| [`10-yenilikci-fikir.md`](10-yenilikci-fikir.md) | Klasik reklam dışı 10 fikir: karanlık harita, şehir radyosu, rota takası, veri raporu, widget… |
| [`reels/01-ayni-sehir-200-metre.md`](reels/01-ayni-sehir-200-metre.md) | Amiral gemisi, saniye saniye |
| [`reels/02-kalabaligin-bittigi-yer.md`](reels/02-kalabaligin-bittigi-yer.md) | Seri formatı, 10 sn |
| [`reels/03-tas-konusuyor.md`](reels/03-tas-konusuyor.md) | Sesli anlatım, 15 sn |
| [`pano.html`](pano.html) | Görsel pano — telefonda/ekranda bakılacak hâli |

Üç senaryonun sonunda **kuyruğa hazır JSON** var; video `public/social/` içine
girince [`social/queue`](../social/queue/) mantığıyla otomatik yayınlanabilir.

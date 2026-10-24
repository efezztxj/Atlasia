# Kampanya 01 — "Bu reklamı AI yaptı" (Instagram + TikTok)

**Tarih:** 2026-10-24 · **Durum:** kreatif hazır, yayın kullanıcı kararı
**Kreatif dosyaları:** `docs/pazarlama/kreatifler/ai-yapti/`
· `ig-4x5/01…10.jpg` (1080×1350, carousel)
· `tt-9x16/01…10.jpg` (1080×1920, Reels/TikTok)
**Üretici betik:** `scripts/pazarlama/ai-yapti-kreatif.py` (metni düzelt → tekrar çalıştır → kareler yenilenir)

## Neden bu açı işe yarıyor

Ürünün kendi gerçeği bir reklam kancası: **Atlasia'da sunucuda dil modeli yok.** "Atlas AI" adı var ama
altında kural motoru, hava, mesafe ve güneş hesabı var (AY-23). Reklamın ilk karesi bunu itiraf ediyor,
sonra "ama şunları uydurmadı" diyerek ürünün **gerçek** yeteneklerini sayıyor. İzleyici hem gülüyor
hem güveniyor; marka da "abartmayan uygulama" konumuna oturuyor.

Bu, ürünün en zor taklit edilebilir tarafı: çoğu uygulama reklamında AI iddiasını şişirir. Tersini yapan
ilk Türkçe seyahat uygulaması olmak, kendi başına içerik değeri taşıyor.

## Kare akışı (10 kare)

| # | Başlık | İşlev |
| --- | --- | --- |
| 01 | **Bu reklamı AI yaptı.** | Dur, gülümset, kaydettir |
| 02 | Uygulamada da "AI" var. Sunucuda dil modeli yok. | İtiraf — güvenin kurulduğu kare |
| 03 | Üç soru soruyor. | Mekaniği göster (süre / merak / ulaşım) |
| 04 | Sonra sırayı yazıyor. Sebebiyle. | **Asıl farklılaştırıcı** (`aiReason`) |
| 05 | Efes'te 3 saatin varsa sıra şu: | Somut değer, kaydetme karesi |
| 06 | Bir taşa 40 metre kalınca konuşuyor. | Duygusal tepe; sınırı da söylüyor |
| 07 | İzini çiz. Linke çevir. | Büyüme mekaniği (kurulum yok) |
| 08 | Bilmediğini yazıyor. | "Doğrulanmadı" dürüstlüğü — ters köşe |
| 09 | Ve evet, çevrimdışı da çalışıyor. | Kamp/yayla kitlesi; sınırıyla |
| 10 | Uygulama yok. Mağaza yok. Link var. | Tek CTA |

## Kare metinleri (birebir, düzeltmek için)

01 — **Bu reklamı AI yaptı.** / Ciddiyim. Ama anlatacağı hiçbir şeyi uydurmadı: hepsi uygulamada gerçekten var.
02 — **Uygulamada da "AI" var. Sunucuda dil modeli yok.** / "Atlas AI" ürünün adı. Elindeki yerlere, senin sürene, havaya ve mesafeye bakıp hesap yapıyor. Sana bir filozof gibi cevap yazmıyor; sıra çıkarıyor.
03 — **Üç soru soruyor.** / 1 · Kaç saatin var? 2 · Neye merakın var? (tarih, doğa, fotoğraf, yemek…) 3 · Nasıl gideceksin? (yürüyüş, bisiklet, araç)
04 — **Sonra sırayı yazıyor. Sebebiyle.** / "Celsus Kütüphanesi'ni 17:10'a koydum. Kalabalık azalıyor, ışık batıdan geliyor. Bir sonraki durak 6 dakika yürüme mesafesinde."
05 — **Efes'te 3 saatin varsa sıra şu:** / Magnesia Kapısı → Kuretler Caddesi → Yamaç Evler → Celsus Kütüphanesi → Büyük Tiyatro. 11 duraklık tur, site içinde. Kaydır, sebebini gör.
06 — **Bir taşa 40 metre kalınca konuşuyor.** / Yürürken telefon kendi açıklıyor: "Kuretler Caddesi'ndesin…" İzin vermezsen susuyor. Ekran kapalıyken çalışmıyor. Bunu reklamda söylemem, çünkü doğru değil.
07 — **İzini çiz. Linke çevir.** / Yürüdüğün yol haritada kalıyor: mesafe, süre, tempo. Paylaştığında arkadaşın hiçbir şey indirmiyor; tarayıcıda açıyor.
08 — **Bilmediğini yazıyor.** / Bilet ücreti: doğrulanmadı. Açılış saati: doğrulanmadı. Sezon: doğrulanmadı. "Gitmeden doğrula" diyor. Çoğu uygulama bu satırı silmeyi tercih eder.
09 — **Ve evet, çevrimdışı da çalışıyor.** / İndirdiğin bölgenin haritası telefonda kalıyor. Sinyal yokken aç, rota duruyor. Yalnız izin verilen harita katmanı iniyor: uydudan görüntü vaadi yok.
10 — **Uygulama yok. Mağaza yok. Link var.** / atlasia.pages.dev · Bu reklamı beğendiysen AI'ya teşekkür et. Uygulamayı beğendiysen linke dokun.

> Kural: bu metinler **ekran görüntüsüyle kanıtlanabilir** olmak zorunda. "Celsus'u 17:10'a koydum" cümlesi
> örnek gerekçedir; yayına almadan önce uygulamada benzer bir `aiReason` metninin gerçekten üretildiğini gör
> (`src/utils/routePlanner.ts`). Görülmüyorsa cümleyi gerçek çıktıyla değiştir — uydurma gerekçe yazma.

## Instagram carousel açıklaması (kopyala-yapıştır)

```
Bu reklamı AI yaptı. Ama anlattığı hiçbir şeyi uydurmadı.

Atlasia'da sunucuda dil modeli yok. "Atlas AI" bir ürün adı:
elindeki yerlere, sürene, havaya ve mesafeye bakıp sıra çıkarıyor —
her durağın gerekçesi yazılı.

Karelerde sırayla:
· 3 soruda rota
· Efes'te 3 saatlik site turu (11 durak)
· Bir taşa 40 metre kalınca başlayan sesli anlatım
· İzi çizip linke çevirme (arkadaşın indirme yapmıyor)
· "Bilet ücreti: doğrulanmadı" diyebilen bir yer kartı

Ne yapmıyor, onu da yazdım: navigasyon değil, ücret/saat garantisi değil,
ekran kapalıyken rehberlik değil.

Uygulama yok. Mağaza yok. Link var → profilde.

Not: görseller yapay zekâ ile üretildi; içindeki ekranlar uygulamanın kendi akışından.
Doğrulanmamış bilgi "doğrulanmadı" olarak kalır — seyahat öncesi resmî kaynağa bak.

#atlasia #efes #selçuk #izmir #seyahat #gezirotası #antikkent #kamp #doğa #yapayzeka
```

## TikTok / Reels açıklaması

```
Reklamı AI'ya yaptırdım ama uygulamaya yalan söyletmedim.
Sunucuda dil modeli yok; o yüzden sadece gerçekten yaptığı şeyleri yazdırdım.
Efes'te 3 saat, 11 durak, gerekçeli sıra. Bilmediğini "doğrulanmadı" diye yazıyor.

#atlasia #efes #izmir #antikkent #seyahat
```

## İlk 3 saniye alternatifleri (A/B için)

| Varyant | Hook | Kime |
| --- | --- | --- |
| A (mevcut) | "Bu reklamı AI yaptı." | Genel, merak |
| B | "Reklamı AI'ya yaptırdım, bana yalan söyletmedim." | AI yorgunu kitle |
| C | "Bu 10 karede tek bir uydurma bilgi yok. İddia ediyorum." | İddialı, tartışma açar |
| D | "Türkiye'de bir uygulama reklamına 'doğrulanmadı' yazdırdı." | Haber değeri, basın/DM |

Her varyant ilk karede test edilir; kalan 9 kare aynı kalır. 3 gün sonra 3 sn izlenme + kaydetme karşılaştır.

## Video kurgusu (TikTok/Reels, 20-24 sn)

1. **0-2 s:** 01 karesi, ekran yazısı aynı (ses yok, müzik var).
2. **2-9 s:** 02 → 03 → 04 kareleri, 2,3 s aralıkla, hafif zoom-in (Ken Burns). Her karede "tık" sesi.
3. **9-13 s:** **ekran kaydı** — rota sihirbazı 3 dokunuşla doluyor (gerçek uygulama, gerçek veri). Karelerin arasına gir.
4. **13-17 s:** 05 → 06 kareleri + 1 s gerçek Efes görüntüsü (kendi çekimin).
5. **17-20 s:** 07 → 08 kareleri hızlı geçiş (0,9 s).
6. **20-24 s:** 09 → 10 kareleri; sonda 1 s boş harita + logo.

Müzik: platformun ticari katalogundan sakin, tempolu bir parça; trend ses **kullanma** (reklamda hak sorunu).
Altyazı: her kare metni videoya gömülü olduğu için ek altyazı gerekmez; seslendirme yaparsan ayrıca altyazı ekle.

## Carousel yayın notları

- Sıra **bozulmaz**; 01 kapak, 10 CTA. Instagram'da 10 karenin hepsi yüklenmeli (eksik yükleme CTA'yı keser).
- Kapak ayrıca **tek görsel** olarak Story'ye konur + "kaydır" etiketi.
- TikTok'a carousel (fotoğraf modu) olarak da yüklenebilir: aynı 10 kare, 3 s otomatik geçiş; Türkiye'de bu format
  videoya göre daha az rekabet alıyor.
- Pinterest: 02, 05 ve 08 kareleri tek tek "3 saatte Efes", "gerekçeli rota", "doğrulanmadı" başlıklarıyla yüklenir.

## Uyum ve dürüstlük (yayından önce kontrol)

- [ ] Karelerde **"indir"**, **"navigasyon"**, **"en iyi"**, fiyat/saat iddiası yok — metinlerde yok, kalsın.
- [ ] Açıklamada "görseller yapay zekâ ile üretildi" satırı **duruyor** (yanıltıcı reklam riskini kapatır).
- [ ] Ekran kaydı gerçek uygulamadan; mockup/hızlandırılmış sahte akış yok.
- [ ] Harita görünen karede `© OpenStreetMap contributors` okunur (ekran kaydında otomatik gelir; kırpma).
- [ ] Yasal metinlerdeki `[TARİH] / [AD SOYAD / UNVAN]` placeholder'ları dolmadan **ücretli** reklam açılmaz (AY-13).
  Organik yayın bu kapıya takılmaz ama siteye gelen kişi taslak metin görürse güven kaybı olur — önce künye.
- [ ] Bağlantı `atlasia.pages.dev` üzerinden UTM'li: `?utm_source=instagram&utm_medium=organic&utm_campaign=ai-yapti&utm_content=hook-a`

## Sıradaki kampanya fikirleri (aynı "komik + gerçek" çizgisi)

1. **"AI'ya sordum, 'bilmiyorum' dedi."** — uygulamanın "doğrulanmadı" alanlarını gösteren tek ekran.
2. **"Reklamı yapay zekâya verdim, bütçeyi de o harcadı"** — bütçe/kampanya şeffaflığı serisi (pilot sonrası).
3. **"Bu kareyi 40 metre yürüyerek çektim"** — sesli anlatımın tetiklendiği anın ekran kaydı + gerçek adım sayısı.
4. **"Efes'i 3 saatte bitiren tek kişi"** — mikro-influencer challenge, aynı kare dili.

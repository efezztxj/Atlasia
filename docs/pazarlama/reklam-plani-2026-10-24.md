# Atlasia — Instagram / TikTok reklam ve içerik planı

**Tarih:** 2026-10-24 · **Kesit:** `main` = `06c0e0a` · **Kapsam:** organik içerik + ücretli reklam kararı
**Durum:** öneri belgesi. Buradaki hiçbir madde otomatik yayın/taahhüt değildir; ücretli reklam, pilot kapısı (AY-18) ve hukuk metni (AY-13) kapalıyken **başlatılmaz**.

> Kısa cevap: Atlasia'nın reklamı "harita uygulaması tanıtımı" olmamalı. Ürünün satılabilir üç anı var —
> **(1) sırayı gerekçesiyle söyleyen plan**, **(2) yüz metre ölçeğinde site turu + konumda başlayan sesli anlatım**,
> **(3) telefonda kurulum istemeyen, linkle açılan rota/iz paylaşımı.** Reklam dili bu üçünün etrafında kurulmalı;
> "AI", "sosyal ağ" ve "navigasyon" iddiaları reklamda **kullanılmamalı** (aşağıda §2).

---

## 1. Üründe gerçekten ne var (reklamı yapılabilecek kanıtlı liste)

Her satır depodaki koda dayanıyor; reklamda söylenecek cümlenin arkasında bu karşılık olmalı.

| # | Yetenek | Kod karşılığı | Reklamda nasıl görünür |
| --- | --- | --- | --- |
| 1 | 28 elle seçilmiş yer, 7 kategori (şehir, plaj, tarih, doğa, kamp, yeme-içme, fotoğraf) | `src/data/places.ts`, `src/data/categories.ts` | Haritada parlayan noktalar; "kaç tanesine gittin?" |
| 2 | 3 soruda rota: süre → ilgi/tempo → ulaşım | `AtlasAssistant.tsx` (`RouteWizard`), `routePlanner.ts` | Ekran kaydı: 3 dokunuş, rota çıkıyor |
| 3 | **Her durağın gerekçesi yazılı** (`aiReason`) — kara kutu değil | `routePlanner.ts`, rota kartı | Durak kartında açılan "neden burada" satırı |
| 4 | Durağa **varış saatinde** hava + yağış olasılığı; yağmura göre yeniden sıralama | `utils/weather.ts` (`dailyRainNote`, `optimizeForRain`) | "15:40 varış · %65 yağış · sırayı değiştir" |
| 5 | **Altın saat** hedef yerin saat dilimine göre (suncalc + tz-lookup) | `utils/sun.ts`, `utils/weatherLayer.ts` | Aynı yerin 3 saatte 3 hâli |
| 6 | **Site turu**: Efes 3 saat / 11 durak, Priene 1 saat (yol geometrisi doğrulanmadı) | `data/siteTours.ts`, `utils/tourGuide.ts` | "Kapıdan gir, sola dön, Celsus'a kadar" |
| 7 | **Konum tetikli sesli anlatım**, 40 m giriş / histerezis, izinle ve ekran açıkken | `NearbyAudioGuide.tsx`, `utils/tourGuide.ts` | Yürürken telefonun konuşmaya başlaması |
| 8 | Yürüyüş izi kaydı: GPS sıçrama filtresi, 7 m sadeleştirme, tempo, **taslak önizleme + onaylı kaydet** | `useTrackRecorder.ts`, `utils/trackDraft.ts`, `TrackRecorderPanel.tsx` | Haritada çizilen iz + tempo |
| 9 | **Rota linki**: karşı taraf uygulama kurmadan tarayıcıda açar (`#r=` / `?route=`), 12.000 karakter, ham iz girmez | `utils/shareLink.ts`, `App.tsx` | WhatsApp'tan gelen link, 2 saniyede açılan rota |
| 10 | **Çevrimdışı harita paketi**: OpenFreeMap karanlık, 3.000 karo / 50 MiB / 4 eşzamanlı | `OfflinePackage.tsx`, `utils/offlinePacks.ts` | Uçak modunda çalışan harita |
| 11 | PWA: kurulum yok, mağaza yok; TR arayüz, koyu/açık tema, erişilebilirlik geçişleri | `index.html`, `manifest.webmanifest`, `useTheme.ts` | "Linke tıkla, haritadasın" |
| 12 | "Görünümdeki saklılar" — zoom'a göre gizli noktalar | `routePlanner.ts` (`hiddenInView`) | Uzaklaştır: boş. Yaklaştır: 6 nokta |

**Dürüstlük notu (kritik):** reklam metni yazarken şu üç ayrımı koru — *çizgi navigasyon değil* (durakları bağlar),
*AI üretken LLM değil* (yerel veri + kural motoru; AY-23), *fotoğraf eşleştirme tanıma değil* (renk/ışık tonu; `photoMatch` metni bunu kendisi söylüyor).

---

## 2. Reklamda SÖYLENMEYECEKLER (yasal + itibar kapısı)

Bu liste pazarlama ekibine "yaratıcılık" gerekçesiyle deldirilmez.

| Söylenmeyecek | Neden |
| --- | --- |
| "Navigasyon", "seni oraya götürür", "adım adım yol tarifi" | Rota çizgisi durakları bağlayan düz çizgi; yaya yolu motoru yok (AY-04) |
| "Yapay zekâ senin için her şeyi planlıyor" / "ChatGPT gibi" | Üretken LLM entegrasyonu yok (AY-23). "Atlas AI" adı ürün adıdır, model iddiası değildir |
| "Fotoğraftan mekânı tanır" | Renk tonu eşleştirmesi yapıyor, tanıma değil |
| "Cebinde, ekran kapalıyken rehberlik eder" | Tarayıcı arka planda konum izlemez; ekran açık şartı var (AY-22) |
| "Açılış saati / bilet ücreti / sezon bilgisi verir" | Bu alanlar bilinçli olarak "Doğrulanmadı" (`placeAdvice.ts`) |
| "Türkiye'nin en büyük gezgin topluluğu" vb. | Topluluk yeni; ölçek iddiası kanıtsız |
| "App Store / Google Play'den indir" | Mağaza yayını yok, PWA |
| "Ücretsiz kalacak", "%100 gizli" gibi süresiz taahhüt | Reklamda taahhüt = ispat yükü (6502 + Ticari Reklam Yönetmeliği) |

**Kullanılabilir güvenli iddia kalıpları:** "sırayı gerekçesiyle önerir", "site içinde 3 saatlik tur", "yaklaşınca anlatır (izin verirsen)",
"linkle paylaşılır, kurulum istemez", "sinyalsizken harita yanında", "bilet/saat bilgisini **doğrula** der".

---

## 3. Kime konuşuyoruz

| Persona | Acı | Hangi içerik | Kanal |
| --- | --- | --- | --- |
| **Planlayıcı gezgin (25-40, şehirli)** | "Gideceğim yerde 6 saatim var, neyi hangi sırayla?" | Rota kurma, gerekçeli sıra, hava | Reels + TikTok, sonra Meta reklam |
| **Ören yeri meraklısı (30-55)** | "Rehber kitabı okumak istemiyorum, yerinde dinlemek istiyorum" | Efes/Priene site turu, sesli anlatım | Reels (uzun izlenme), YouTube Shorts |
| **Hafta sonu kaçkını (20-35)** | "Sinyal yok, plan yok, kalabalık" | Çevrimdışı paket, iz kaydı, "görünümdeki saklılar" | TikTok (POV, ham görüntü) |
| **Yakın çevre / davetli pilot** | "Ne işe yarıyor, güvenli mi?" | Kurucu günlüğü, şeffaflık, "doğrulanmadı" etiği | Reels + Story + DM |

**Lansman kaması hatırlatması:** topluluk uygulamaları yoğunlukla yaşar (ROADMAP §1). Reklam parası **tek bir bölgeye**
(ör. İzmir–Efes–Selçuk hattı) harcanmalı; "dünyayı keşfet" mesajı organik marka işi olarak kalmalı.

---

## 4. Kanal mimarisi

- **@atlasia (marka):** harita-estetik, bilgi kartları, site turları. Kaydetme/hedef kitle büyütme.
- **Kurucu hesabı (build-in-public):** tek kişi, ne yaptım, neyi bilerek yapmadım. İlk 500 kullanıcı buradan gelir; ücretli reklamdan daha ucuz ve daha ikna edici.
- **TikTok:** aynı videolar ayrı kurguyla (daha ham, altyazı daha büyük, ilk kare daha agresif). TikTok'ta arama trafiği güçlü: "efes gezilecek yerler", "kapadokya 1 gün rota" başlıkları SEO'dur.
- **Reels:** paylaşım/DM odaklı. "Arkadaşına at" mekaniği ürünün kendi paylaşım linkiyle uyumlu → aynı şeyi reklamda da iste.
- **Story:** her yeni bölge/site turu eklendiğinde anket ("buraya gitmek ister misin?"), bekleme listesi.
- **Bonus (ucuz ve kalıcı):** Pinterest — seyahat planlama aramaları uzun ömürlü; statik "3 saatte Efes" kartları yıllarca trafik getirir.

---

## 5. 12 reklam konsepti (çekime hazır)

Format notu: hepsi dikey **9:16 · 1080×1920**; ilk 1,5 saniyede ekran yazısı + hareket; üst 250 px / alt 320 px boş (platform UI).
Süre hedefi organik 15-30 s, reklam 6-15 s (aynı çekimden iki kurgu çıkar).

### A. "Sıra" serisi — en ucuz, en çok kaydedilen
| | |
| --- | --- |
| **A1 — Efes'te 3 saatin var** | Hook: *"Efes'i 3 saatte gezmenin bir sırası var."* 5 kart × 1,5 s: Magnesia Kapısı → Kuretler → Yamaç Evler → Celsus → Büyük Tiyatro. Son kart: "Sebebi her durakta yazılı." |
| Çekim | Ekran kaydı (site turu) + 2 s gerçek ayak görüntüsü. Yüz gerekmez, seslendirme gerekmez |
| CTA | "Profilden aç, kendi rotanı kur" / bio linki |
| Neden | Kaydetme ve arama trafiği yüksek; içerik tekrar üretilebilir (her ören yeri için klonlanır) |
| Risk | Açılış saati/bilet söyleme; "sıra" iddiası editör yazımı olduğu için "önerilen sıra" de |

### B. "Neden bu sıra?" — asıl farklılaştırıcı
| | |
| --- | --- |
| **B1 — Kara kutu değil** | 20 s. Ekran kaydı: 3 soru (yarım gün / tarih+fotoğraf / yürüyüş) → rota. Durak kartı açılır, `aiReason` satırı büyütülür: *"Celsus'u 17:10'a koydum: kalabalık azalıyor, ışık batıdan geliyor."* |
| Hook | *"Her uygulama rota verir. Kaçı nedenini söyler?"* |
| Neden | Rakiplerin (harita uygulamaları, LLM sohbetleri) vermediği şey; marka sesiyle uyumlu (açıklanabilirlik ürün tezi) |
| Risk | Gerekçe metinleri gerçekten dolu olmalı; ekran kaydında boş gerekçe görünürse reklam yalan olur |

### C. "Yaklaşınca konuşuyor" — duygusal tepe noktası
| | |
| --- | --- |
| **C1 — 40 metre** | 25 s. POV yürüyüş (gimbal/el), kulaklık; telefon ekranında sesli rehber kartı belirir; anlatım altyazıya düşer: *"Kuretler Caddesi'ndesin. Bu cadde…"* Son kare: elinde telefon, gülümseme, gün batımı |
| Çekim listesi | (1) taş zemin ayak planı 2 s, (2) telefon elde yürüyüş 4 s, (3) ekran yakın plan tetiklenme 3 s, (4) anlatımı dinleyen yüz 3 s, (5) geniş plan 3 s |
| CTA | "İzin ver, yürü, dinle." |
| Neden | Taklit edilmesi en zor an; sesli içerik TikTok/Reels'te izlenme süresini uzatır |
| Risk | Ekran açık şartı; "cebinde" iması yasak. Gerçek cihazda, gerçek konumla çekilmeli |

### D. "İz bırak" — veri estetiği, yüzsüz, döngüsel
| | |
| --- | --- |
| **D1 — 42 dakika** | 15 s. Harita üzerinde izin gerçek zamanlı çizilmesi (ekran kaydı hızlandırılmış), alt köşede mesafe/tempo sayacı; son kare: "izini linke çevir" |
| Neden | Strava/AllTrails estetiği; ses gerektirmez, her dilde çalışır, döngüde tekrar izlenir |
| Risk | Ham iz gizliliği: paylaşımda fotoğraf düşüyor, ham iz girmiyor — reklamda da bunu söyle ("paylaşırken ne gittiğini görürsün") |

### E. "Sinyal yok" — mevsimsel, yüksek dönüşüm
| | |
| --- | --- |
| **E1 — Uçak modu** | 15 s. Kaçkar/Likya/Karpaz. Telefonda "servis yok" → uçak modu açılır → harita hâlâ orada, rota duruyor. Ekran yazısı: *"İndirdiğin bölge, sinyalsizken yanında."* |
| Neden | Net, anlaşılır fayda; kamp/yayla kitlesinde karar anı |
| Risk | Yalnız OpenFreeMap karanlık altlık iniyor; uydu görüntüsü vaadi verilmez (P15). Reklamda görünen harita gerçekten paketlenen katman olmalı |

### F. "Link at, kurmasın" — viral mekanik
| | |
| --- | --- |
| **F1 — Karşı taraf** | 12 s. İkiye bölünmüş ekran: solda gönderen "bunu izle" der, sağda arkadaşı WhatsApp'tan gelen linki açar, **2 saniyede** tarayıcıda rota görünür. Ekran yazısı: *"Uygulama yok. İndirme yok. Link var."* |
| CTA | "Rotanı paylaş" |
| Neden | Ürünün en güçlü büyüme kancası: alıcı taraf kurulum yapmıyor. Reklamın kendisi mekaniği öğretiyor |
| Risk | Linkin gerçekten o hızda açılması; yavaş açılıyorsa önce performans işi, sonra reklam |

### G. "Saat kaçta?" — astronomi, uydurma yok
| | |
| --- | --- |
| **G1 — Aynı taş, üç saat** | 18 s. Aynı noktada sabah/öğle/altın saat üç kare; altta gerçek hesap: *"Gün batımı 19:42 · seni 19:10'da oraya koyar"* |
| Neden | Fotoğraf kitlesinde yüksek kaydetme; veri gerçek (suncalc) |
| Risk | Bulutluluk vaadi verilmez; "kesin boş olur" denmez |

### H. "Yaklaştır" — merak döngüsü
| | |
| --- | --- |
| **H1 — Boş harita** | 8 s. Uzaklaşmış harita: bomboş görünüyor. Parmaklar zoom yapar, 6 nokta belirir: *"Yakınında 6 kayıt vardı."* Döngü başa |
| Neden | 8 saniyelik loop algoritmada izlenme/tekrar oranını yükseltir; çekim maliyeti sıfır (ekran kaydı) |

### I. "Ne yapmadım" — kurucu günlüğü
| | |
| --- | --- |
| **I1 — 3 ay, 1 kişi** | 30-45 s. Anlatı: "Navigasyon yapmadım, çünkü yaya yolu verim yok. Açılış saati yazmadım, doğrulayamadım. Uygulama yapmadım, link yeter." |
| Neden | Türkçe teknoloji/pazarlama kitlesinde organik erişim; ilk 500 sadık kullanıcı ve basın için en iyi kapı |
| Risk | "Eksik ürün" algısı — her cümlenin ardından ne **yaptığını** söyle |

### J. Mikro-influencer brief (barter / küçük ücret)
**Format:** "3 saatte Efes" challenge. Yaratıcı uygulamayı kendisi keşfetmiş gibi anlatır, övmek zorunda değil.
**Zorunlu 5 çekim:** (1) giriş kapısı, (2) rotayı gösteren telefon, (3) sesli anlatımı dinlediği an, (4) bir hatasını söyleme ("kalabalıkta sıra kaydı"), (5) linki paylaşma.
**Yasak:** "AI harika", "navigasyon", fiyat/saat iddiası, mağaza çağrısı.
**Etiketleme:** `#reklam` veya `#işbirliği` ilk karede görünür yazıyla (Sosyal Medya Etkileyicileri Kılavuzu).
**Seçim kriteri:** 5-40 bin takipçi, TR seyahat nişi, izlenme/takipçi oranı > %20, yorumlarında gerçek soru var.

### K. "Doğrula" — güven reklamı
| | |
| --- | --- |
| **K1 — Yazmayan uygulama** | 15 s. Yer kartı açılır: ücret "Doğrulanmadı", saat "Doğrulanmadı". Ekran yazısı: *"Bilmediğimizi yazıyoruz. Gitmeden doğrula."* |
| Neden | Türkiye'de seyahat içeriğinde en büyük şikâyet "yanlış bilgi". Ters köşe bir güven mesajı, marka karakterine tam oturuyor |
| Risk | Fazla "eksiğim" tonuna kaymamalı; hemen ardından planın gücü gösterilmeli |

### L. Mevsimsel / haber anı
| | |
| --- | --- |
| **L1 — Tatil sabahı** | Bayram/uzun tatil öncesi 3 gün: *"Efes'te 09:00 ile 11:00 arası ne yapılır?"* 15 s, gerçek kalabalık görüntüsü + rota |
| Neden | Zamanlama reklamın yarısı; aynı içerik yılın 6 haftasında tekrar kullanılır |
| Risk | "Kalabalık yok" garantisi verilmez; "kalabalıktan önce" denir |

**Öncelik (emek/etki):** 1) **C**, 2) **F**, 3) **D**, 4) **A1**, 5) **B1**. İlk üçü bir günde, tek telefonla çekilebilir ve üçü de ürünün taklit edilemez taraflarını gösteriyor.

---

## 6. Hazır senaryolar (çekim kâğıdı)

### Senaryo 1 — "40 metre" (C1), 25 s, sesli
| Sn | Görüntü | Ses / yazı |
| --- | --- | --- |
| 0,0-1,5 | Taş zeminde ayak planı, hızlı yürüyüş | Ekran yazısı: **"Efes'te rehberini yanına almayanlardan mısın?"** |
| 1,5-5,0 | Telefon elde, haritada beyaz nokta Kuretler'e yaklaşıyor | Ortam sesi; hafif tık sesi (marka imzası) |
| 5,0-9,0 | Ekran yakın: sesli rehber kartı açılır, "Dinle" | Anlatım başlar: *"Kuretler Caddesi'ndesin…"* |
| 9,0-16,0 | Yüz planı, kulaklık, gülümseme; arkada sütunlar | Anlatım devam + altyazı; ortam sesi kısılır |
| 16,0-21,0 | Geniş plan, gün batımı, kalabalık bulanık | Anlatım: *"…Celsus'a kadar yürü, ışık arkanda olacak."* |
| 21,0-25,0 | Ekran: "Atlasia · atlasia.pages.dev" + "izin verirsen başlar" | Yazı: **"Yaklaşınca anlatır. İzin verirsen."** |

Çekim notu: gerçek tetikleme için konum doğruluğu iyi olmalı (≤25 m ideal, 60 m üstünde tetiklenmez). Tetiklenmezse
**çekimi kurgulama** — o zaman ekran kaydında "Dinle" düğmesiyle manuel başlat, yazıya "elle de başlatabilirsin" ekle.

### Senaryo 2 — "Link at, kurmasın" (F1), 12 s, sessiz izlenebilir
| Sn | Görüntü | Yazı |
| --- | --- | --- |
| 0-2 | El, WhatsApp'ta link gönderiyor | **"Bu linki arkadaşına at."** |
| 2-5 | Karşı telefon: linke dokunma, tarayıcı açılıyor | **"O hiçbir şey indirmiyor."** |
| 5-9 | Rota haritada; durak kartları kaydırılıyor | **"Rota linkin içinde geliyor."** |
| 9-12 | "Kaydet" düğmesi + Atlasia logosu | **"İsterse kaydeder. İstemezse kapatır."** |

### Senaryo 3 — "3 saat" (A1), 18 s, carousel + Reels
| Sn | Görüntü | Yazı |
| --- | --- | --- |
| 0-2 | Efes genel plan + rota çizgisi | **"3 saatin var. Sıra şu:"** |
| 2-5 | Durak 1-2 zoom | "1 · Magnesia Kapısı — kalabalıktan önce" |
| 5-8 | Durak 3-4 | "2 · Kuretler — ışık sağdan" |
| 8-12 | Durak 5-6 | "3 · Yamaç Evler — en uzun kuyruk, erken git" |
| 12-15 | Durak 7-8 | "4 · Celsus — gün batımına 40 dk" |
| 15-18 | Site turu ekranı | **"Sebebi her durakta yazılı. atlasia.pages.dev"** |

---

## 7. Üretim standardı (marka tutarlılığı)

- **Palet:** zemin `#021512`, metin `#e4f5ea`, vurgu `#eab54f` / `#f3c870`, ikincil `#5be0a6`. Açık tema kareleri `#f4f1e7` + `#a86d20`.
- **Tipografi:** başlıkta `Bricolage Grotesque` (ürünle aynı), gövdede sistem sans. Ekran yazısı **en az 64 px** (9:16'da), 2 satırı geçmez.
- **İlk kare kuralı:** ses kapalıyken anlaşılır olmalı; logo ilk karede değil, 3. saniyeden sonra.
- **Ekran kaydı:** gerçek uygulama, gerçek veri, abartılı hızlandırma yok (platform "yanıltıcı" işaretleyebilir).
- **Ses:** telifsiz kütüphane (platform ticari müzik kataloğu) + marka tık/ping imzası. Trend sesler yalnız organikte, reklamda değil.
- **Altyazı:** her videoda gömülü, Türkçe, noktalı harfler doğru (ı/İ, ş, ğ). Otomatik altyazıyı mutlaka düzelt.
- **Atıf:** karede harita varsa okunur şekilde `© OpenStreetMap contributors`; uydu/Esri/CARTO görüntüsü kullanılacaksa önce lisans kontrolü (P15 tablosu).
- **Ton:** abartılı hype yok, "kanka" değil ama resmî de değil. Cümleler kısa, iddialar ölçülü, bilinmeyen açıkça söylenir.

---

## 8. Yayın ritmi (30 gün, 0 TL, organik)

Haftada **3 dikey video + 1 carousel + 4 story**. Ayda 2 çekim günü yeter (8-10 video stoğu).

| Gün | İçerik | Amaç |
| --- | --- | --- |
| Pzt | Sıra serisi (A1) — yeni bölge | Kaydetme, arama trafiği |
| Çar | Ekran kaydı (B1/D1/H1 dönüşümlü) | Ucuz üretim, izlenme |
| Cum | Sahadan (C1/E1/J) | Duygusal bağ, paylaşım |
| Cmt | Carousel: "3 saatte X" | Kaydetme + Pinterest'e çapraz |
| Her gün story | Anket + "hangi bölge?" | Bölge seçimi + bekleme listesi |

**Saat:** TR için 12:00-13:30 ve 20:00-22:30 dene; 2 hafta sonra kendi verinle sabitle (varsayım, doğrulanmadı).
**Hashtag:** 3-5, karışık ölçek: `#efes #selçuk #izmirgezi #antikkent #atlasia`. Hashtag'e para/emek harcama; arama başlığı daha değerli.
**Başlık yazımı:** arama niyetiyle — "Efes'te 3 saatte ne gezilir", "Kapadokya 1 gün rota", "Likya'da sinyalsiz yürüyüş".

---

## 9. Ölçüm: önce ölç, sonra para

**Bugünkü durum (kanıt):** depoda analitik yok (`src/`, `public/` içinde gtag/plausible/umami/posthog yok). Bu hâliyle ücretli reklam
"kör harcama" olur: hangi videonun hangi eylemi getirdiği görülemez.

| Katman | Araç | Maliyet | Not |
| --- | --- | --- | --- |
| Sayfa trafiği + UTM | **Cloudflare Web Analytics** | 0 TL | Cookieless; KVKK yükü düşük; Pages'e tek tık |
| Video tarafı | Platform kendi metrikleri | 0 TL | 3 sn izlenme, tamamlanma, kaydetme, paylaşım |
| Link tıklaması | UTM şeması | 0 TL | `?utm_source=tiktok&utm_medium=organic&utm_campaign=efes-3saat&utm_content=hook-a` |
| Ürün olayı (rota oluştu, link paylaşıldı) | karar bekliyor | — | Olay bazlı ölçüm ayrı iş; reklam öncesi "hangi olayı sayacağız" yazılı olmalı |

**UTM kuralı:** uygulama `utm_*` parametrelerini silmiyor (yalnız `tab` siliniyor) → reklam linkleri bugün de çalışır.
**Karar eşikleri (varsayım — kendi verinle güncelle):** 3 sn izlenme < %25 veya CTR < %0,8 → kurguyu değiştir; aynı yaratıcı 3 gün CPA getirmiyorsa kapat; "link tıklaması + rota oluşturma" başına maliyet ₺15-25 bandına inince ölçekle.

---

## 10. Ücretli reklam fazları

### Faz 0 — Şimdi (0 TL) · ön koşul: pilot + hukuk kapısı
Organik içerik, kurucu hesabı, mikro-influencer barter, bekleme listesi. Ücretli reklam **yok**.
Gerekçe: hukuk metinlerinde hâlâ `[TARİH]`, `[AD SOYAD / UNVAN]` doldurulmamış (AY-13); pilot 20-50 davetliyle açılmamış (AY-18);
analitik yok. Bu üçü kapalıyken reklam, ilk izlenimi parayla harcamak olur.

### Faz 1 — Pilot sonrası test (₺5.000-15.000 / ay, varsayım)
- **Spark Ads / mevcut organik gönderiyi öne çıkar:** en iyi 3 organik video. Sıfırdan reklam kurgusu üretme — organikte tutmayan reklamda da tutmaz.
- Hedef: **trafik** (link tıklaması), "kurulum" değil. Bölge: İzmir + 80 km, 24-45 yaş, ilgi: seyahat, doğa yürüyüşü, fotoğraf, kamp.
- 3 yaratıcı × 1 hedef kitle × 3 gün = 9 hücre; sonra tek kazananı büyüt.
- **TikTok** daha ucuz deneme, **Reels** daha yüksek niyet. İkisini aynı anda açma; 2 hafta TikTok, sonra Reels.

### Faz 2 — Ölçek (aylık ₺40.000+, karar)
Ön koşullar: ≥ %30 geri dönen kullanıcı, bölgede ≥ 30 saha doğrulanmış yer, paylaşım linki ile gelenlerde ≥ %20 rota kaydetme,
destek yükü karşılanabilir. Bu eşikler yoksa reklam bütçesi **içerik üretimine** kaydırılır — daha yüksek getiri.

> Not: bütçe ve CPM aralıkları planlama varsayımıdır; Türkiye'de 2026 sonu gerçek CPM'ler kampanya, mevsim ve hedefleme kalitesine göre
> büyük sapma gösterir. İlk 500 TL'lik test gerçek sayıyı verir; bu belgedeki aralıkları teyit edilmiş veri gibi kullanma.

---

## 11. Reklamı mümkün kılacak küçük ürün işleri (öncelik sırası)

Bunlar "reklam" değil, reklamın **çalışması** için gereken altyapı. Her biri ayrı PR.

| # | İş | Neden reklam için kritik | Dosya / not | Emek |
| --- | --- | --- | --- | --- |
| 1 | **Yer derin bağlantısı** (`/?yer=efes`) + o yerin OG kartı | Her reklam tek bir yere inebilmeli; bugün yalnız `?route=`, `#r=` ve `?tab=` var | `App.tsx` (URL okuma), `index.html` statik OG, `socialMetadata.test.ts` güncellenir | Orta |
| 2 | Cloudflare Web Analytics + UTM raporu | Ölçümsüz reklam yok | Pages paneli (kod değişikliği gerekmez) | Küçük |
| 3 | Yer/rota paylaşımında **dinamik OG görseli** | WhatsApp/IG DM'de kart görünümü tıklamayı belirgin artırır | Cloudflare Pages Function veya statik şablon seti | Orta |
| 4 | "Ana ekrana ekle" 2 adımlı yönlendirme (iOS Safari) | Mağaza yok; kurulum sürtünmesi burada | Küçük rehber bileşeni | Küçük |
| 5 | Yasal metinlerin tamamlanması (AY-13) | Ücretli reklamın **hukuki ön koşulu** | `src/content/legal.ts` | İnsan kararı |
| 6 | Landing hızı kontrolü (mobil 4G) | Reklam tıklaması 3 s'de içeriğe varmalı | hero görseli 167 KB, JS bütçesi ölçülü | Küçük |
| 7 | Bekleme listesi / bölge oylaması | Pilot kapalıyken talep toplama (kod gerekmez: form) | Google Form + bio linki | Küçük |

---

## 12. Yasal ve platform uyumu (kontrol listesi)

- [ ] **İspat yükü:** her sayısal/karşılaştırmalı iddianın arkasında veri var mı? ("en iyi", "en hızlı" kullanma.)
- [ ] **Reklam tanımlanabilirliği:** işbirliklerinde `#reklam` / `#işbirliği` ilk karede okunur; sadece açıklamada gizli etiket yetmez.
- [ ] **KVKK:** Meta/TikTok pikseli ve özel hedef kitle kullanılıyorsa aydınlatma + çerez tercihi; veri işleyen sözleşmeleri.
- [ ] **Görsel telif:** Pexels görselleri ticari kullanıma açık (atıf gerekmez, "Pexels onaylıyor" iması yasak). **Wikimedia Commons CC BY-SA görselleri reklamda kullanma** (atıf + aynı lisans yükü); kendi çekimin veya Pexels/Unsplash kullan.
- [ ] **Harita atfı:** karede harita varsa `© OpenStreetMap contributors`; Esri/CARTO/uydu kullanımı P15 tablosuna göre.
- [ ] **Marka kullanımı:** Google/Apple/Instagram logolarını reklamda "entegre" imasıyla kullanma; ekran görüntüsünde üçüncü taraf arayüzü kırp.
- [ ] **Yaş:** 18+ hedefleme; 13-17 yaş kitlesine konum/iz toplayan ürün reklamı yapma.
- [ ] **Yanıltıcılık:** "ücretsiz" diyorsan süre/koşul belirt; "AI" adını model iddiası gibi kullanma.

---

## 13. 30 günlük icra listesi

**1. hafta — hazırlık (0 TL)**
1. Kurucu hesabı aç, bio'ya tek link (bekleme listesi formu). 2. Cloudflare Web Analytics'i aç, UTM tablosunu yaz.
3. Telefonla 6 video çek (C1, F1, D1, H1, A1, K1). 4. İlk 3 videoyu yayınla, 3 sn izlenmesini not et.

**2. hafta — seri**
5. "Sıra" serisini 3 bölgeye çıkar (Efes, Kapadokya, Likya). 6. Carousel: "3 saatte Efes" + Pinterest'e yükle.
7. 3 mikro-influencer'a brief gönder (barter). 8. Hafta sonu: en iyi videonun 3 farklı ilk 3 saniyesini test et.

**3. hafta — topluluk**
9. Story anketi: "sıradaki bölge hangisi?" 10. Kurucu günlüğü (I1) yayınla; ilk 100 kişiye DM ile teşekkür/link.
11. Gerçek kullanıcıdan 1 izinli video al (C1'in UGC versiyonu). 12. Paylaşım linki akışını kendi telefonlarınla test et.

**4. hafta — karar**
13. Tablo: video → tıklama → rota oluşturma. 14. Kazanan 2 formatı belirle. 15. Faz 1 bütçe kararını (₺5-15 bin) **pilot ve hukuk kapısı açıldıysa** ver; açılmadıysa 4 hafta daha organik.

---

## 14. Tek cümlelik özet

Atlasia'yı "yeni harita uygulaması" diye değil, **"gittiğin yerde sırayı ve hikâyeyi bilen, linkle paylaşılan cep rehberi"** diye anlat;
reklamın üç kahramanı **gerekçeli sıra, yaklaşınca başlayan anlatım, kurulum istemeyen link**; iddiaların sınırını ürünün kendi "doğrulanmadı" dürüstlüğü çizer.
Para harcamadan önce ölçüm, pilot ve hukuk kapısı açılmalı.

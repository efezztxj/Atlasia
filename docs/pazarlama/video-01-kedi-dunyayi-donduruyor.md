# Video 01 — "Dünyayı bir kedi döndürüyor"

**Tarih:** 2026-10-24 · **Süre:** 13 sn · **Format:** 9:16 · **Ses:** sessiz animatik (müzik sonra)
**Klasör:** `docs/pazarlama/kreatifler/ai-video-keyframe/`
· `01-kedi-kure.jpg`, `02-pati-kure.jpg`, `03-kedi-harita.jpg` — AI ile üretilmiş ana kareler
· `animatik-bolum-01.mp4` — 720×1280, 12,9 sn, sessiz akış (çekim planı)
· `sesli-bolum-01.mp4` — aynı akış + sentetik ses tasarımı (marka imzası, whoosh, küre vınlaması)
· Üretici: `scripts/pazarlama/kedi-video.py --bolum 01 --ses` (ses tamamen sentetik, telif yok)

> **Ne yaptım:** Konsepti sadece yazmadım; ana kareleri ürettim ve onlardan **oynayan bir animatik** çıkardım.
> Yani elimizde artık "şöyle olabilir" değil, **zamanlaması kilitlenmiş bir akış** var: hangi kare, kaç saniye, hangi yazı, nerede kesme.
> Gerçek AI video (Veo / Runway / Kling / Sora) üretimi dış araç ve bütçe işi — o adım senin onayına bağlı.

---

## 1. Fikir: neden kedi ve neden küre

Atlasia'nın adı **atlas**tan geliyor; logosu pusula, ilk ekranı gece Dünya görünümü. Reklamın ilk saniyesinde
"merak" duygusunu taşıyacak bir görüntü gerekiyordu. Bir kedi **dünyayı patisiyle döndürüyor**:

- **Durdurur:** hayvan + tanıdık obje (masa küresi) kombinasyonu ilk karede iş görür, ses kapalıyken bile.
- **İroni taşır:** "AI reklam yaptı" esprisi mizahla devam ediyor ama bu sefer ürünün kendi adını (atlas/küre) görselleştiriyor.
- **Seriye açılır:** aynı kedi, farklı bölgeler, farklı pati hareketleri → 6-8 bölümlük seri.
- **Marka paleti:** kehribar altın + koyu petrol yeşili ürünün kendi renkleri; kedi kürkü ve pirinç küre paletle çakışıyor.

**Kritik sınır:** kedi, uygulamanın arayüzünü **kullanıyor gibi gösterilmez.** Reklamda sahte ekran/UI yok;
kedi dünyayı çevirir, gerisini gerçek uygulama ekran kaydı anlatır. Aksi hâlde izleyici "bu ürün böyle çalışmıyor" der.

---

## 2. Animatikte kilitlenen akış

| # | Süre | Ana kare | Yazı | Hareket |
| --- | --- | --- | --- | --- |
| 1 | 0,0-2,6 | `01` kedi + küre | **Dünyayı bir kedi döndürüyor.** / *Ciddiyim. Reklamı da yapay zekâ yaptı.* | Küreye doğru hafif yaklaşma (zoom 1,00→1,10) |
| 2 | 2,6-5,2 | `02` pati + küre makro | **Sen haritaya bakıyorsun.** / *O küreyi çeviriyor.* | Makro kare, geri çekilme (1,14→1,02) |
| 3 | 5,2-8,2 | `03` kedi + harita | **3 saat. 11 durak. Sıra belli.** / *Her durağın gerekçesi yazılı. Uydurma yok.* | Yukarıdan aşağı kayma |
| 4 | 8,2-10,6 | marka zemini (harita ızgarası + yaylar) | **Gerisini Atlasia yapıyor.** / *Yaklaşınca anlatır. İzin verirsen.* | Yavaş yaklaşma |
| 5 | 10,6-13,0 | `01` tekrar | **Uygulama yok. Mağaza yok. Link var.** / *atlasia.pages.dev* | Hızlı yaklaşma (loop hissi) |

Geçişler 0,28 sn karartma; yazılar aynı sürede belirip kayboluyor. Kare 5'in başı 1'e bağlandığı için
video **döngüde kesintisiz** izlenir (TikTok/Reels tekrar oranı için).

---

## 3. Dış AI video aracı için hazır istemler (image-to-video)

Yöntem: aşağıdaki ana kareyi araca **referans görüntü** olarak ver, hareket istemini yaz, 4-5 sn üret.
Her klip ayrı üretilir, kurguda yukarıdaki sürelere kırpılır. Aynı kedi karakteri için `01` karesini
her klipte referans olarak tekrar kullan (character reference / "same cat" özelliği).

**Klip A — `01-kedi-kure.jpg`**
> Subtle cinematic motion: the cat's paw gently spins the brass globe, continents rotate slowly, golden dust motes drift upward. The cat blinks once and looks directly into the lens. Camera slowly pushes in. Locked tripod feel, 35mm, shallow depth of field, warm gold rim light, teal-black room. No text, no UI, no morphing.

**Klip B — `02-pati-kure.jpg`**
> Extreme macro: the cat's paw rests on the spinning globe, map pins of light rising and floating away as sparks. Camera drifts back slowly. Embers fade in and out. No text, no letters, no extra objects.

**Klip C — `03-kedi-harita.jpg`**
> Top-down slow tilt: the cat presses a glowing point on the antique map; a thin line of light travels and connects the other glowing points one by one, then fades. The cat's tail flicks once. Dust in the air, warm lamplight, deep teal shadows. No text, no UI.

**Ortak negatif istem:** `text, letters, watermark, logo, extra paws, distorted cat face, human hands, phone, fake UI, glitch, fast camera shake`

**Teknik:** 9:16, 24-30 fps, 4-5 sn/klip, 1080×1920'e ölçekle; kurguda 1,0 sn'lik baş/son kırpma payı bırak.
Araç ücretli olabilir — **onay almadan abonelik/kredi açılmaz.**

---

## 4. Ses

`sesli-bolum-01.mp4` içinde hazır: sentetik ambiyans pedi, iki notalı marka imzası (0,2 sn ve 10,7 sn),
geçiş whoosh'ları (2,6 / 5,2 / 8,2 / 10,6 sn), küre dönme vınlaması ve kapanışta tek tık. Loudness −14 LUFS.
Aşağıdaki tablo yayın sürümü için hedef; üretilen ses bu hedefin karşılığıdır:

| Katman | Öneri |
| --- | --- |
| Müzik | Platform ticari kataloğundan sakin, hafif perküsyonlu; **trend ses kullanma** (reklamda hak riski) |
| Efekt | Küre dönme "vınlama" (kısa), pati dokunuşu "tık", haritada nokta yanma "ping", geçişlerde yumuşak whoosh |
| Marka imzası | Her videoda aynı **iki notalı ping** (Atlasia imzası) — 0,5 sn, kare 1 ve 5 başında |
| Seslendirme | Opsiyonel. Erkeksi/kadınsı fark etmez, **alaycı değil sakin** ton: "Dünyayı bir kedi döndürüyor. Gerisini Atlasia yapıyor." |

---

## 5. Yayın metinleri

**Instagram Reels / TikTok:**
```
Dünyayı bir kedi döndürüyor. Ciddiyim, reklamı da yapay zekâ yaptı.

Küre dönüyor, sıra çıkıyor: 3 saat, 11 durak, her durağın gerekçesi yazılı.
Yaklaşınca anlatır — izin verirsen. Ekran kapalıyken çalışmaz, onu da söylüyoruz.

Uygulama yok, mağaza yok, link var → profilde.

Görseller yapay zekâ ile üretildi. Ekranlar uygulamanın kendi akışından.
#atlasia #efes #izmir #seyahat #antikkent #kedi
```

**Hook alternatifleri (ilk 1,5 sn testi):**
- A: "Dünyayı bir kedi döndürüyor." (mevcut)
- B: "Reklamı kedime yaptırdım." (daha absürt, mizah)
- C: "Bu küreyi bir kedi çeviriyor. Uygulama onunla ne yapıyor?"
- D: "AI'ya 'dünyayı kedi döndürsün' dedim. Fazla iyi yaptı."

---

## 6. Seri planı (aynı kedi, 6 bölüm)

| Bölüm | Pati hareketi | Anlatılan gerçek |
| --- | --- | --- |
| 01 (bu) | Küre döner | Genel tanıtım + link |
| 02 | Pati Efes'te bir noktaya basar | Site turu, 11 durak |
| 03 | Pati haritada iz bırakır (parmağıyla çizgi) | İz kaydı + paylaşım linki |
| 04 | Pati uçak modundaki telefona dokunur | Çevrimdışı paket |
| 05 | Pati "doğrulanmadı" kartına dokunur | Dürüstlük (en çok konuşulan bölüm olur) |
| 06 | Kedi küreyi kapatır, ışıklar söner | "Mağaza yok. Link var." kapanış |

Aynı kare dili, aynı müzik, aynı imza sesi → 6 video tek çekim/üretim gününde çıkar.

---

## 7. Uyum ve dürüstlük (yayın öncesi)

- [ ] Açıklamada **"görseller yapay zekâ ile üretildi"** satırı duruyor (yanıltıcı reklam riskini kapatır).
- [ ] Reklamda **sahte uygulama arayüzü yok**; ekran görüntüsü gerekiyorsa gerçek uygulamadan alınır.
- [ ] "Navigasyon", "her yerde çalışır", "ücretsiz kalacak" gibi iddialar yok.
- [ ] Kediye zarar veren/rahatsız eden hiçbir görüntü yok (AI üretimi olsa da platform politikaları).
- [ ] Harita görünen karede okunur `© OpenStreetMap contributors` (gerçek harita kullanılırsa).
- [ ] Müzik ticari katalogdan; trend ses yok.
- [ ] Yayın hesabı marka hesabı; işbirliği varsa `#reklam` ilk karede.

---

## 8. Tek cümle

Kedi dünyayı çeviriyor, ürün sırayı çıkarıyor: 13 saniyelik, döngüde izlenen, ilk karesi ses kapalıyken anlaşılan bir tanıtım —
ve elimizde bu akışın oynayan provası var, gerçek video üretimi tek onaya bakıyor.

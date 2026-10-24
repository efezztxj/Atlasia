# Atlasia — ekran galerisi v1 (fotoğraflı)

> Bu belge [`tasarim-sistemi-v1`](./atlasia-tasarim-sistemi-v1.md) içindeki kuralların **hangi
> ekranda nasıl göründüğünü** gösterir. Görseller: `mockups/atlasia-*.png`, hepsi 704×1520
> (9:19.5), aynı palet ve aynı boşluk ritmiyle üretildi.
>
> **Galeri sayfası:** `mockups/atlasia-ekranlar-kontak.png` (8 ekran tek bakışta)
> **Canlı prototip:** `mockups/tasarim-sistemi.html` (sürüklenebilir sheet + gün şeridi)

---

## 0. Ekran haritası

| # | Ekran | Katman | Süre | Tek altın eylem |
|---|---|---|---|---|
| 01 | Karşılama | kabuk dışı | ilk açılış | **Başla** |
| 02 | Keşfet | 1–2 | 3–30 sn | **Gör** |
| 03 | Planım (gün şeridi) | 3 | 30 sn–5 dk | **Yola çık** |
| 04 | Saha modu | 4 | saatler | **Sıradaki durak** |
| 05 | Yer sayfası | 3 | 30 sn | **Yol tarifi** |
| 06 | Arama | 1 | 5–20 sn | — (liste) |
| 07 | Çevrem | 1 | 1–5 dk | — (içerik) |
| 08 | Çevrimdışı | 1–2 | — | **Güncelle** (ikincil) |

Her ekranda **tek** dolu altın buton var; 06 ve 07'de bilinçli olarak dolu altın yok, çünkü
orada karar kullanıcının içerik seçimi — altın bir yön dayatmıyor.

---

## 01 · Karşılama — `mockups/atlasia-karsilama.png`

**Amaç:** 2 saniyede "bu uygulama ne yapıyor" + 1 dokunuşla içeri gir.

| Öğe | Ölçü / kural |
|---|---|
| Fotoğraf | ekranın %62'si, Kapadokya; alt kenarda 96px yumuşak degrade → zemin `--surface-base` |
| Wordmark | `Atlasia.` 20px, altın, nokta harften sonra |
| Başlık | `display` 30px, 2 satır: "Dünyayı merakınla" beyaz + "keşfet." altın |
| Açıklama | `body` 15px, `--text-secondary`, 2 satır — 3. satıra taşmıyor |
| İlerleme | 3 nokta; aktif olan 32px uzun pill |
| Eylem | **Başla** tam genişlik 56px altın pill; altında `ghost` "Zaten hesabım var" |
| Dokunma | 56px (bu ekranda ayakta değil, ama ilk izlenim için büyük) |

**Kural:** karşılamada üçten fazla nokta yok, atlama yok — 3 adımda bitmeli. Fotoğrafın
üstüne **hiçbir metin binmiyor**; metin her zaman zeminde.

**Yapılmadı:** "İzin ver" isteme ekranı yok. İzin, ihtiyaç anında (harita açılırken) istenir.

---

## 02 · Keşfet — `mockups/atlasia-kesif-mobil-v3.png`

**Amaç:** "burada ne var" sorusunu 3 saniyede cevaplamak.

| Öğe | Ölçü / kural |
|---|---|
| Başlık bloğu | eyebrow 11px + `display` 30px, haritanın **üstünde** (çakışma yok) |
| Küre/harita | orta alan, tek odak |
| Pin | **6** (12 değil), etiket çipi yalnız önemli 6'sında; ≤8 kuralı |
| Harita kontrolleri | sağda tek cam panel, 3 buton (+, −, sıfırla), dikeyde ortalanmış |
| Yürüyüş kaydı | ayrı pill, kartın üstüne yapışmıyor |
| Kart | peek durumu: foto 56×56, başlık 1 satır **kesilmeden**, meta 1 satır, **Gör →** |
| Alt menü | 3 öğe + avatar (5 değil) — gerekçe: `atlasia-urun-tasarim-yaklasimi.md` §2 |

**Ölçülen düzeltme:** önceki ekranda kart başlığı "Efes Antik Kenti · A…" olarak
kırpılıyordu; bu sürümde birincil bilgi **tam** ve tek satır.

---

## 03 · Planım — `mockups/atlasia-planim-gun-seridi.png`

**Amaç:** uygulamanın imzası. "Bugün ne yapayım, hangi sırayla?"

| Öğe | Ölçü / kural |
|---|---|
| Başlık | eyebrow "CUMARTESİ · 4 DURAK · 26 KM" + `display` "Efes günü" + meta saat aralığı |
| Harita | rota çizgisi + **4** numaralı durak + konum noktası; başka pin yok |
| Gün şeridi | 72–96px; eksen 09/12/15/18; boncuk 20px (dokunma 44px), etiket üstte, saat altta |
| Şerit davranışı | boncuk sürükle → sıra değişir, saatler **yeniden hesaplanır** (20 dk yol + durak süresi) |
| Liste | 2 satır, 56×56 foto, 2 satır metin, chevron; `truncate` yok |
| Eylem | **Yola çık** tam genişlik altın pill, kartların örtmediği kendi alanında |

**Klavye eşdeğeri:** boncuğa `Tab` → `←/→` sırayı değiştirir, `Enter` seçer. Sürüklemenin
tek alternatifi bu; erişilebilirlik için pazarlık dışı.

---

## 04 · Saha modu — `mockups/atlasia-saha-modu.png`

**Amaç:** güneş altında, tek elle, çevrimdışı çalışan rehber.

| Öğe | Ölçü / kural |
|---|---|
| Kabuk | arama yok, sekme yok, pin yok — tam ekran mod |
| Üst | geri + "Çevrimdışı · hazır" mikro etiketi; başka hiçbir şey |
| Harita | tek yön oku + hedef; sade, uv'de okunur |
| Adım | "2 / 7" altın + **"140 m ileri"** 34px + 2 satır talimat |
| Buton | 2 adet, 56px: `secondary` sesli anlatım + `primary` sıradaki durak |
| Alt | `ghost` "Atla" / "Buradan çık" — 56px yüksek görünmez alan |

**Tipografi neden büyük:** güneş altında kontrast ve punto artırılır (sistemin `%115` ölçeği
otomatik uygulanır). `prefers-reduced-motion` açıksa hiç animasyon yok.

---

## 05 · Yer sayfası — `mockups/atlasia-yer-sayfasi.png`

**Amaç:** "değer mi?" → "nasıl gezerim?" geçişi.

| Öğe | Ölçü / kural |
|---|---|
| Hero | ekranın %38'i, gerçek fotoğraf; altında 96px degrade |
| Üst kontroller | 44px cam daire: geri, kaydet; foto sayacı `1 / 6` |
| Başlık | eyebrow + `display` "Celsus Kütüphanesi" + meta "Efes · İzmir · 4.8 (212)" |
| Çipler | 3 eşit çip: `45 dk` · `140 m` · `Sesli anlatım` (ikon + metin) |
| Hikâye | 3 satır `body`, sonra altın "Devamını oku" (metin kesilmiyor, kısaltılıyor) |
| Galeri | 3 küçük foto, yatay kaydırma; ilk foto `loading="lazy"` değil |
| Alt bar | yapışkan cam panel: **Yol tarifi** (altın, geniş) + kaydet (kare `secondary`) |

**Kural:** hero fotoğrafın üstünde metin yok — yalnız iki buton ve sayaç. Başlık her zaman
fotoğrafın bittiği yerde başlar.

---

## 06 · Arama — `mockups/atlasia-arama.png`

**Amaç:** 5 saniyede doğru yeri bulmak.

| Öğe | Ölçü / kural |
|---|---|
| Girdi | 48px yüksek cam alan, otomatik odak, sağda altın "İptal" |
| Geçmiş | son 5 arama, cihazda tutulur, tek satır + "Temizle" |
| Kategoriler | 4 çip; **hepsi ekrana sığıyor**, kaydırma yok (ekran genişliği 360px'te 3+1) |
| Sonuç | 3 satır: 56×56 foto + başlık + meta + `›`; meta'da puan ve süre var |
| Boş durum | "Burada henüz kimse iz bırakmamış. İlk sen olur musun?" |

**Yapılmadı:** arama sonucu sayfasına filtre paneli koymadım; filtreler haritada kategori
çipinde. Arama ekranı tek iş yapar: bulmak.

---

## 07 · Çevrem — `mockups/atlasia-cevrem.png`

**Amaç:** "başkaları nerede ne yaşamış" — akış değil, **yer üstünden** hikâye.

| Öğe | Ölçü / kural |
|---|---|
| Başlık | `display` "Çevrem" + meta "12 gezgin · 3 grup" + profil avatarı (altın halka) |
| Hikâyeler | 5 daire, 56px, altın degrade halka; son daire "＋" kesikli |
| Segment | 3 eşit: Hikâyeler · Gruplar · Arkadaşlar (aktif: altın pill + koyu metin) |
| Kart | 16:9 foto + sol üstte konum/zaman çipi + yazar satırı + 2 ikon (kalp, kaydet) |
| Ton | saat/dinlenme sayısı yok; yer ve zaman var — bu fark ürünün kimliği |

**Kural:** fotoğraf kartın %60'ından azını kaplayamaz; metin bloğu kartın içinde 2 satırı
geçmez. Sonsuz feed yok — liste sonunda "Bu haftanın tümü" bağlantısı.

---

## 08 · Çevrimdışı — `mockups/atlasia-cevrimdisi.png`

**Amaç:** ağ yokken hiçbir şeyin "bozuk" görünmemesi.

| Öğe | Ölçü / kural |
|---|---|
| Band | 40px, amber tonlu, "Çevrimdışı · son paket 4 saat önce" + "Güncelle" |
| Harita | önbellek dokusu (nokta ızgara), düşük doygunluk — **açıkça** önbellek |
| Pin/rota | çalışır durumda, soluk değil |
| Bilgi | "Çevrimdışı düzenleme açık" çipi: kullanıcı ne yapabileceğini bilir |
| Kart | peek: "Planında · 4 durak · 26 km" |
| Kural | **hiçbir buton devre dışı görünmez**; yalnız senkron bekleyen öğe "eşitlenmeyi bekliyor" der |

---

## 09 · Ekranlar arası geçiş (fotoğrafların anlatmadığı kısım)

| Geçiş | Süre | Kural |
|---|---|---|
| Karşılama → Keşfet | 260ms | hero fotoğraf yukarı kayar, harita alttan gelir; aynı anda tek hareket |
| Keşfet kartı → Yer sayfası | 260ms | kart büyüyerek hero fotoğrafa dönüşür (paylaşılan öğe) |
| Yer sayfası → Saha modu | 520ms | harita zoom-in, çipler kaybolur, kabuk değişir |
| Planım → saha | 520ms | şerit 72 → 44px kompakt; kamera durak 1'e uçar (kamera koreografisi §8) |
| Çevrimdışına düşme | 120ms | band kaymadan belirir (yerleşim kaymaz) |
| Geri tuşu | — | her zaman **bir katman iner**; iki katman birden kapanmaz |

---

## 10 · Galeri ile kanıtlanan kurallar

| Kural | Nerede görülüyor |
|---|---|
| Altın = eylem, ekran başına 1 | 01 Başla · 02 Gör · 03 Yola çık · 04 Sıradaki durak · 05 Yol tarifi |
| Başlık haritanın/kürenin üstüne binmez | 02, 03, 08 |
| Birincil bilgi kesilmez (`truncate` yok) | 02 kart, 03 liste, 05 başlık, 06 sonuçlar |
| 44px dokunma (saha 56px) | 04, 05 üst kontroller, 06 çipler |
| Aynı anda tek hareket | §9 geçiş tablosu |
| Renk anlam taşır (amber = bekliyor) | 08 band |
| Türkçe uzunlukla çalışır (2 satır kuralı) | 01 açıklama, 05 hikâye, 07 meta |

---

## 11. Üretim notu (dürüstlük)

Bu görseller **tasarım referansıdır**, üretim ekran görüntüsü değil. Görsel üretimde
metinlerin bir kısmı bozulabildiği için:
- `05 · Yer sayfası` gövde metni düzeltildi (piksel üzerine yeniden yazıldı),
- `06 · Arama` ekranı cihaz çerçevesinden kırpılıp kenar boşluğu temizlendi,
- `01 · Karşılama` wordmark noktası düzeltildi.

Kodda karşılığı olmayan hiçbir öğe galeriye eklenmedi; her ekranın hangi bileşene denk
geldiği `atlasia-tasarim-sistemi-v1.md` §6'da yazılı.

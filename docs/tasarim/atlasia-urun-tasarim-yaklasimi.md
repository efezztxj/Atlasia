# Atlasia'yı ben tasarlasaydım — ürün ve arayüz yaklaşımı

> Kapsam: bu bir **öneri** belgesidir, ürün kararı değildir. AGENTS.md'deki korunan
> kararlar (web/PWA hattı, masaüstü başlık solda, Atlas AI sağ altta, mevcut koyu tema,
> ücretli servis yok) varsayılan kabul edilmiştir. Navigasyon ve renk hiyerarşisi gibi
> başlıklar kullanıcı onayı ister; belgede bunlar "öneri" olarak işaretlidir.

---

## 0. Tek cümlelik tez

**Atlasia bir harita uygulaması değil, bir "gün kurma" uygulamasıdır.**
Harita cevabı gösteren yüzeydir, soru değil. Kullanıcının aklındaki soru "burada ne var?"
değil, **"bugün ne yapayım ve hangi sırayla?"**

Bu tez her kararı belirliyor: pin sayısı, sekme sayısı, tipografi, hatta hangi özelliğin
önce yapılacağı.

---

## 1. Mevcut ekranda beni rahatsız eden şey (somut)

Ekran görüntüsündeki sorunlar zevk meselesi değil, ölçülebilir:

| Sorun | Neden | Sonuç |
|---|---|---|
| 12+ pin, üst üste, etiketsiz | her yeri göstermeye çalışmak | hiçbiri tıklanmıyor |
| Başlık kürenin üstüne biniyor | kahraman alanı ile harita aynı yerde | metin okunmuyor |
| "Efes Antik Kenti · A…" | kart 2 satıra sıkışmış | karar için gereken bilgi kesilmiş |
| Altın: başlık + 6 pin + 4 buton + logo noktası | vurgu rengi vurgu olmaktan çıkıyor | göz nereye bakacağını bilmiyor |
| 5 sekme | 2'si aynı soruya cevap (Kaydet / İzlerim) | navigasyon maliyeti boşa gidiyor |
| Arama + bildirim + hamburger üstte | üçü de "başka yere git" | harita ekranı hep yarım |

**Kural:** bir ekranda kullanıcı aynı anda en fazla **bir** karar verebilmeli.

---

## 2. Omurga: 1 yüzey, 4 katman, 3 soru

### 4 katman (her katman bir üsttekinin sorusunu bitirir)

| Katman | Süre | Soru | Bileşen |
|---|---|---|---|
| **Pin** | 0,5 sn | burada ne var? | harita işareti + tek etiket |
| **Kart** | 3 sn | değer mi? | alt sheet peek (88px) |
| **Yer sayfası** | 30 sn | nasıl gezerim? | alt sheet full (%92) |
| **Saha modu** | saatler | şimdi ne yapayım? | tam ekran, ayrı kabuk |

Geri tuşu/sheet sürükleme **her zaman bir katman iner**, iki katman birden kapanmaz.
Bugünkü `closePanels()` yaklaşımı doğru fikir; korunmalı.

### 3 soru = 3 hedef (öneri)

5 sekme yerine:

```
[ Keşfet ]        [ Planım ]        [ Çevrem ]        (avatar)
  harita            gün şeridi       topluluk+izler
```

- **Keşfet** — nerede ne var (harita + arama + kategori).
- **Planım** — kaydettiklerim, gün planım, çevrimdışı paketlerim, izlerim. `Kaydet` ve
  `İzlerim` burada iki sekme; ikisi de "benim olan" sorusunun cevabı.
- **Çevrem** — gezgin hikâyeleri, gruplar, arkadaşlar.

Gerekçe: 5 sekmede her sekme ortalama 1,2 işlev taşıyor; 3 sekmede her sekme 2 işlev
taşıyor ama kullanıcı hangi sekmede olduğunu kaybetmiyor. Profil avatar olarak sağ üste
taşınır — profil bir "yer" değil, bir "durum".

---

## 3. İmza etkileşim: **Gün Şeridi**

Uygulamanın tek akılda kalıcı şeyi bu olmalı. Google Maps'in yapmadığı şey: **sıra ve zaman.**

Ekranın altında 72px'lik yatay bir şerit:

```
 09:00   10:30      13:00          16:00      19:30
  ●───────●──────────●──────────────●──────────●
  Efes    Celsus     Meryem Ana     Şirince    Akşam yemeği
```

- Haritada bir pini şeride sürükle → durak olur.
- Şeritte bir durağı sağa sürükle → **sıra ve saat** değişir, harita kamerası duraklar
  arasında yumuşak animasyonla gezer (kamera koreografisi).
- Yürüyüş başlarken şerit 72px → 44px'e küçülür ve "sıradaki durak" göstergesine dönüşür.
- Boş şerit asla boş görünmez: "Bugün 3 saat var. Yakında 4 durak var, kuralım mı?"

Bu, mevcut `routes` + `tracks` + `TrackRecorderPanel` altyapısının üstüne oturur; yeni
veri modeli gerektirmez, sadece yeni bir **sunum** katmanıdır.

Neden bu: kullanıcı **planlama** (evde, otururken) ve **saha** (ayakta, güneş altında)
diye iki farklı modda kullanıyor. Şerit ikisini de taşıyor — planlarken liste, gezerken
pusula.

---

## 4. En büyük fark: **Saha Modu**

ROADMAP'teki "site ölçeği (yüz metre)" içgörüsü arayüzde karşılığı olmayan tek şey.
Saha modu bunun cevabı.

**Tetik:** kullanıcı bir sitenin 300 m yakınına girdiğinde ya da elle açtığında.

**Kabuk tamamen değişir** — arama yok, pin yok, sekme yok:

```
┌──────────────────────────────┐
│  ◀  Efes · Celsus          2/7 │
│                              │
│      ↑ 140 m ileri            │
│   Sağdaki kapıdan gir,        │
│   soldaki kalabalığı atla.    │
│                              │
│  [ 🔊 Sesli anlatım ]         │
│  [ Atla ]        [ Buradan çık ]│
└──────────────────────────────┘
```

Tasarım kısıtları (üçü de zorunlu):
1. **Tek elle** — tüm etkileşim ekranın alt %60'ında.
2. **Güneş altında** — kontrast AA'nın üstüne çıkar, tipografi %30 büyür, ince çizgi ikon
   yerine dolu ikon.
3. **Çevrimdışı** — paket önceden iner, harita vektör olarak cihazda; ağ yoksa hiçbir şey
   bozulmaz, sadece "çevrimdışı" mikro etiketi görünür.

Mevcut `NearbyAudioGuide`, `OfflinePackage`, `NearbyHistory` bileşenleri zaten bu modun
parçaları; eksik olan **onları tek bir kabuk altında birleştiren mod**.

---

## 5. Görsel dil — kurallar, tercihler değil

### 5.1 Renk: her renk bir iş

| Token | Anlam | Kural |
|---|---|---|
| `#f2c666` altın | **eylem** | ekran başına en fazla **1** dolu altın buton |
| `#e4f5ea` mint | bilgi/metin | gövde metni |
| `#5be0a6` leaf | canlı durum | açık, doğrulandı, çevrimiçi |
| `#021512` ink | zemin | — |
| kırmızı | yıkıcı | yalnız silme/çıkış |

Bugün altın aynı anda başlık, 6 pin, "Gör", "Yürüyüş kaydı", logo noktası. **Kural: altın
sadece tıklanabilir olanı işaretler.** Başlıkta altın kelime = vurgu değil, yanlış vaat.

### 5.2 Tipografi: 3 boyut yeter

```
display  28–34px / 1.02 / -0.03em   başlık, kart başlığı
body     15–17px / 1.45             paragraf, açıklama
meta     11–12px / 1.3 / 0.08em     etiket, kategori, süre
```

Bugün ~7 farklı punto ve 4 farklı harf aralığı var. 3 boyut + 1 ağırlık farkı hem daha
okunur hem daha hızlı.

### 5.3 Boşluk: 4 tabanlı, iki kural

`4 · 8 · 12 · 16 · 24 · 32 · 48`
- aynı blok içi: 8/12
- bloklar arası: ≥16
- bölümler arası: 32

### 5.4 Yükseklik ve cam

Sadece 3 seviye: harita (0), sheet (1), modal (2). Gölge yerine **1px altın saç teli
çizgi + %4 beyaz dolgu**. Cam efekti (`backdrop-blur`) yalnız sheet ve yüzen kontrol
gruplarında; haritanın üstünde ikiden fazla cam katman olmaz.

### 5.5 İkon

Tek set (Lucide), tek kalınlık (1.75). Aktif durum = dolu, pasif = çizgi. Karışık
kalınlık, arayüzün "elle yapılmış" hissini veren en büyük sebep.

---

## 6. Mobil ergonomi — üç bölge kuralı

```
┌───────────────┐
│  ÜST (%20)    │  sadece OKUNUR: başlık, durum. Buton yok.
├───────────────┤
│  ORTA (%45)   │  harita / içerik. Dokunma hedefi yok.
├───────────────┤
│  ALT (%35)    │  TÜM eylemler. Başparmak bölgesi.
└───────────────┘
```

- Dokunma hedefi en az **44×44**; saha modunda **56×56**.
- Sheet kademeleri: **peek 88 / half %55 / full %92**, üçüne de snap. Sürükleme tutamacı
  32×4, ama tutamağın dokunma alanı 44px yüksekliğinde görünmez.
- Safe area: `env(safe-area-inset-bottom)` her sabit katmanda; tab bar + sheet aynı anda
  açıkken çakışma yok — sheet, tab bar'ın üstünde durur ve tab bar'ı örtmez.
- Yatay kaydırma yalnız gerçekten yatay olan içerikte (foto galerisi, gün şeridi).

---

## 7. Durum matrisi — her ekran için 5 durum

Tasarım "mutlu yol" değil, bu beşi için çizilir:

| Durum | Kural |
|---|---|
| **Boş** | boş ekran yok; her boşluk bir sonraki adımı önerir ("Yakında 12 yer var") |
| **Yükleniyor** | harita üstünde spinner yok; iskelet + kamera sabit |
| **Hata** | ne oldu + ne yapabilirim, tek cümle, tek buton |
| **Çevrimdışı** | harita grid dokusu + "son paket 4 saat önce" bandı; hiçbir buton devre dışı görünmez |
| **İzin yok** | suçlayıcı dil yok: "Nerede olduğunu bilmiyorum. Yakınındaki 12 yeri görmek için izin ver." |

---

## 8. Hareket — üç süre, tek kural

- 120 ms: dokunma geri bildirimi
- 260 ms: sheet / kart geçişi
- 520 ms: harita kamera hareketi

**Tek kural: aynı anda iki şey hareket etmez.** Harita uçarken sheet açılmaz; sheet
kapanırken pin zıplamaz. `prefers-reduced-motion` açıksa kamera kesme (cut) yapar, sıfır
animasyon.

---

## 9. Erişilebilirlik (pazarlık dışı)

- Metin kontrastı ≥ 4.5:1; altın üstüne **siyah** metin (beyaz değil — altında 1.61:1 kalıyor, okunamaz).
- Haritanın **liste alternatifi**: "Haritadaki 12 yer" düğmesi her zaman erişilebilir.
- Pin'ler `aria-label` ile "Efes Antik Kenti, İzmir, 4.8 puan".
- 200% metin büyütmede hiçbir kart kırpılmaz (bu yüzden `truncate` yerine 2 satır + "…"
  yerine tam metin sheet'te).
- Klavye: sheet içinde odak tuzağı, `Esc` bir katman iner.

---

## 10. Mikro metin — ses tonu

Atlasia bilgiç değil, **yol arkadaşı**. Kural: 1. tekil/2. tekil, emir kipi yok.

| Yerine | Şöyle |
|---|---|
| "Konum izni gerekli" | "Nerede olduğunu bilmiyorum. İzin ver, yakınını göstereyim." |
| "Sonuç bulunamadı" | "Burada henüz kimse iz bırakmamış. İlk sen olur musun?" |
| "Kaydedildi" | "Planına ekledim. Yola çıkarken hatırlatırım." |
| "Hata oluştu" | "Bağlantı düştü. Tekrar dener misin?" |

---

## 11. Neyi **yapmazdım**

Bunlar da tasarım kararı:

1. **Ana ekranda 12 pin.** Kartın söyleyeceğini pin söyleyemez; 6 pin + "hepsini gör".
2. **Açılışta sallanan küre.** İlk 2 saniyeyi animasyona vermek, kullanıcıya "burası oyun"
   demek. Küre yalnız "Dünya görünümü"ne geçildiğinde.
3. **Beş sekme.** Bkz. §2.
4. **Arama + bildirim + menü aynı satırda.** Arama haritanın içinde (üstte yüzen tek
   alan), bildirimler Çevrem'in içinde, menü yok — ayarlar profile taşınır.
5. **Sonsuz feed.** Topluluk bir akış değil, **harita üstünde hikâye**: kim nerede ne
   yaşamış. Bu ürünün farkı; feed'e dönüşürse Google Maps'in kötü kopyası olur.
6. **Yeni özellik.** Tasarım turunda kod büyümez; ekran sayısı azalır.

---

## 12. Ölçüm — tasarımın başarısı nasıl anlaşılır

Arayüz tartışması ancak sayıyla kapanır:

| Metrik | Hedef |
|---|---|
| İlk rotaya ulaşma süresi (yeni kullanıcı) | < 90 sn |
| Kart → yer sayfası açılma oranı | > 40% |
| Saha modu açan / o bölgeye varan | > 60% |
| Çevrimdışı paket indiren | > 25% |
| Gün şeridi olan plan tamamlama | > 50% |
| D1 geri dönüş | > 30% |

---

## 13. Uygulama sırası (kod dosyalarıyla, 3 hafta)

| # | İş | Dosyalar | Kanıt |
|---|---|---|---|
| 1 | Token sadeleştirme: 3 tipografi boyu, altın kuralı | `src/index.css` | `npm run build`, ekran görüntüsü |
| 2 | Sheet kademeleri (88 / 55 / 92) | `src/components/BottomPanel.tsx` | mobil denetim notu |
| 3 | Başlık–harita çakışmasını bitir (hero'yu kartın içine al) | `src/components/Hero.tsx`, `App.tsx` | 360px genişlikte görsel |
| 4 | Pin seyreltme: zoom'a göre 6 → tümü | `src/components/MapView.tsx` | harita testi |
| 5 | Gün şeridi (salt sunum, yeni veri yok) | yeni `DayStrip.tsx`, `routes` | birim testi |
| 6 | Saha modu kabuğu | `NearbyAudioGuide`, `OfflinePackage` sarmalayıcı | çevrimdışı senaryo |
| 7 | Durum matrisi: boş/hata/offline/izin | ortak `StateBlock.tsx` | 5 ekran görüntüsü |

Sıra önemli: **1–4 olmadan 5–7 anlamsız** (şerit kalabalık bir haritanın üstünde
kaybolur).

---

## 14. Bir cümlede özet

Ekran sayısını **azalt**, haritanın üstündeki gürültüyü **kes**, altını **tek eyleme**
ayır, ve uygulamanın imzasını "gün kuran şerit + sahada çalışan mod" yap.
Geri kalan her şey bu üçünün hizmetine girer ya da listeden düşer.

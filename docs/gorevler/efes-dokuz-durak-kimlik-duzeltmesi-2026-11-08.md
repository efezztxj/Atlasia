# Efes turu 49–57: kimlik, konum ve fotoğraf düzeltmesi

> **Kapanış notu (8 Kasım 2026).** Bu belge tarihsel kayıttır. Turun 57 durağının
> tamamı hem Türkçe hem İngilizce seslidir (`/audio/efes-*.mp3`,
> `/audio/en-efes-*.mp3`); aşağıdaki "bekleyen / kalan" listeleri artık geçerli
> değildir. Yakın pinlerin ayrılması ve `sharedWith` temizliği de yapıldı.
> Güncel durum: [`efes.md`](../icerik/sesli-anlatim-rehberi/efes.md) §3–§4.


8 Kasım 2026 · Tur: 57 durak · Kaynak dosya: `public/assets/sesli-turlar.json`

## Neden bu düzeltme gerekti

Kullanıcının bildirdiği belirti iki katmanlıydı: (1) dokuz yapı haritada ayrı
sarı rehber pini olarak görünüyordu ve sesli turda yoktu; (2) tura alındıktan
sonra da pinlerin bir bölümü yanlış yerde duruyor, kartlardaki fotoğraflar başka
yapıları gösteriyordu.

Birinci katman #196 ve #197 ile çözüldü: dokuz durak tek tur dosyasına taşındı,
ana katalogdaki kopyaları kaldırıldı, numaralar veriden okunmaya başladı.
İkinci katman bu belgede ele alınan iştir.

Kök neden, taşımanın **tek tek doğrulanmadan** yapılmasıydı:

- Konum kaynağı olarak birkaç durakta aynı `gtp.gr` noktası kullanıldı; Hydreion,
  Heksagon ve Bizans Hamamları bu yüzden Pollio/Bazilika/Liman Hamamları
  noktalarına düştü.
- Fotoğraflar Commons'ta **ada göre** aranıp ilk sonuç alındı; "Hexagon",
  "Vedius", "Baptistery" aramaları sırasıyla Bazilika Stoası, Tiyatro
  Gymnasionu ve Meryem Ana Evi fotoğraflarını döndürdü.
- Vedius Gymnasionu, Stadyum ve Kent Surları durakları **aynı koordinatı**
  paylaşıyordu; bu, üç ayrı yapıyı tek noktaya yığdı.

## Yapılan düzeltmeler

| # | Durak | Önceki pin | Sorun | Yeni pin | Gerekçe |
|---|---|---|---|---|---|
| 49 | Hydreion | 37.936724, 27.3434367 · Pollio fotoğrafı | Yapı Memmius Anıtı yanındaki çeşmedir, Pollio Anıtı değil | **37.9372961, 27.3432253** · Dosseman 1992 genel görünüm | OSM yolu 1411590456 "Hydreion"; TAN noktasıyla ~10 m |
| 50 | Triodos Meydanı | 37.939088, 27.341161 · Mazaeus-Mithridates Kapısı fotoğrafı | Konum doğru, fotoğraf başka kapıyı gösteriyordu | konum aynı · Sailko, Hadrian Kapısı + Kuretler Caddesi | TAN Triodos; Antichthon makalesi |
| 51 | Heksagon | 37.936739, 27.344431 · Bazilika Stoası fotoğrafı | Yapı Oktagon'un doğusundadır; Bazilika'nın altında değil | **37.93862, 27.34162** (yaklaşık) · Holländer, cadde fotoğrafı | TAN Heroon + Oktagon + Alytarkhos Stoası sıralaması |
| 52 | Verulanus Salonu | 37.943473, 27.338602 · Liman Hamamları fotoğrafı | TAN noktası Liman Hamamları'yla çakışıyor | **37.9444, 27.33885** (temsilî) · Dosseman, Meryem Kilisesi'ne bakış | TAN "Meryem Kilisesi yanındaki doğu köşe" tarifi |
| 53 | Antik Liman | 37.941956, 27.34011 · Arkadiane fotoğrafı | Pin cadde üzerinde, havzada değil | **37.94408, 27.332599** · Bülbül Dağı'ndan ovaya bakış | UNESCO + Ephesus.net planı |
| 54 | Meryem Kilisesi Vaftizhanesi | 37.944983, 27.339413 · **Meryem Ana Evi** fotoğrafı | Fotoğraf Efes dışındaki hac alanını gösteriyordu | **37.94526, 27.33876** · Dosseman, vaftiz havuzu | Commons dosya GPS'i (2011/2015 fotoğrafları) |
| 55 | Bizans Hamamları | 37.9435309, 27.3385948 · Devlet Agorası Hamamları fotoğrafı | Konum Liman Hamamları'nın üzerindeydi | **37.944740, 27.342211** · Jarvis, Bizans Sarayı | Vici 24223; Wikidata 37.944889/27.342500 ~25 m |
| 56 | Vedius Gymnasionu | 37.946112, 27.345901 · Tiyatro Gymnasionu fotoğrafı | Konum stadyumun üzerindeydi | **37.947495, 27.3455233** · Raddato, Kaistros heykeli | OSM yolu 183304727 "Vedius Gymnasium" |
| 57 | Kent Surları | 37.946112, 27.345901 · Stadyum fotoğrafı | Stadyum noktası ve fotoğrafı | **37.930976, 27.339579** · Sepp, sur kesiti | Commons dosya GPS'i; yamaçta korunmuş kesit |

Ayrıntılı konum tartışmaları: [tekil doğrulama çalışması](efes-tekil-dogrulama-calismasi-2026-11-04.md).

## İşaret biçimi

`kent-surlari` artık **mor ◆**. Gerekçe: yamaçtaki sur kesiti biletli ören yeri
sınırının dışındadır. Böylece mor ◆ sayısı 9 → 10, yeşil damla 48 → 47 olur.

## Fotoğraf politikası

Her durakta **yapının kendisini** gösteren, lisansı Commons'ta açık bir dosya
kullanıldı. İki istisna var ve ikisi de `alt` metninde açıkça yazılı:

- **Heksagon:** yapının kendi fotoğrafı yok (anıt cadde basamaklarının altında).
  Caddeyi gösteren fotoğraf kullanıldı.
- **Vedius Gymnasionu:** yapı ziyarete kapalı ve Commons'ta yapı fotoğrafı yok.
  Frigidariumdan çıkan Kaistros heykeli (İzmir Müzesi) kullanıldı.

Dokuz durağın küçük görsel adresleri Commons `imageinfo` API yanıtıyla
karşılaştırıldı; hash dizinleri ve 960 px adları eşleşiyor. Vedius dosyasında
küçük görsel adı `960px-thumbnail.jpg` biçimindedir.

## Açık borçlar

1. ~~Türkçe ses kayıtları yer tutucu.~~ **Kapatıldı (8 Kasım 2026).**
   Dokuz durak yeniden kaydedildi: `public/audio/efes-hydreion.mp3`,
   `efes-triodos-meydani.mp3`, `efes-heksagon.mp3`, `efes-verulanus-salonu.mp3`,
   `efes-antik-liman.mp3`, `efes-meryem-vaftizhanesi.mp3`,
   `efes-bizans-hamamlari.mp3`, `efes-vedius-gymnasionu.mp3`,
   `efes-kent-surlari.mp3`. Eski `kalkidikum-*.mp3` dosyaları silindi, tur
   JSON'undaki ses yolları yeni adlara çevrildi.
   Süreler 38–50 sn; metin uzunluğuna oranı (≈14 karakter/sn) turdaki diğer
   kayıtlarla aynı. Teknik künye mevcut dosyalarla birebir: 24 000 Hz, mono,
   32 kbps CBR, `TSSE = Lavf59.27.100`.
   Okunan metin: `docs/icerik/sesli-anlatim-rehberi/kayit-paketi/turkce-dikte-49-57.json`.
2. **İngilizce ses kaydı yok.** Metinler tam (57/57). Kayıt paketi
   `docs/icerik/sesli-anlatim-rehberi/kayit-paketi/` altında 49–57 için
   güncellendi.
3. **Temsilî noktalar:** 51 (sıralamadan türetildi), 52 (avlu sınırları toprak
   altında), 53 (havza ortası, erişim yok), 57 (korunmuş bir kesit).
4. **Kaynak farkları sürüyor:** Vedius'ta ~90 m, Bizans Hamamları'nda ~25 m.
   Sahada ölçüm yapılmadı.

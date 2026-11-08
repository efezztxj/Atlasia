# Ses agent'ına yapıştırılacak prompt

Aşağıdaki bloğu **olduğu gibi** kopyala, agent'a ver. Tek bir şeyi
doldurman gerekiyor: `<<SES>>` yerine kullanılacak sesin adı/kimliği.

---

```
Rol: Atlasia sesli anlatım rehberi için İngilizce ses dosyası üreticisisin.

GÖREV
12 metni İngilizce sese çevirip MP3 üret. Sonuçları depoya yaz.
NOT: 12 metnin 9'u turda yayında (49-57), 2'si yeni eklendi (45 chalcidicum,
46 domitian-cesmesi), 1'i Pollio Anıtı (metni değişti, sesi yeniden üretilecek).
Hepsi turda görünür; yalnız sesi eksik.

METİNLERİ BURADAN OKU (depo köküne göre)
1. docs/icerik/sesli-anlatim-rehberi/kayit-paketi/metinler/TUMU.txt
   → dokuz metnin tamamı, "=== <id> ===" başlıklarıyla ayrılmış.
   Bu dosyayı tek seferde oku, bölümleri id'ye göre ayır.

Yedek (biri çalışmazsa):
2. docs/icerik/sesli-anlatim-rehberi/kayit-paketi/metinler/49-heksagon.txt
   gibi tek tek dosyalar (dosya adı = durak no + id)
3. public/audio/efes-en.json → "audio" alanı boş olan kayıtların
   "description" değeri. Asıl kaynak budur; 1 ve 2 bundan üretildi.

METİN KURALLARI
- Metni DEĞİŞTİRME. Kısaltma, düzeltme, ekleme, çıkarma yok.
- TTS'e verdiğin string, dosyadaki metnin birebir kopyası olacak.
- Başlıkları ("=== ... ===") okuma; onlar sadece ayırıcı.

SES
- Ses: <<SES>>
- Dil: İngilizce, nötr. Ton: sakin anlatıcı, müze rehberi. Reklam tonu değil.
- Hız: dakikada ~150 kelime.
- Cümle arası ~0,3 sn, paragraf arası ~0,8 sn duraklama.
- Dosya başında ve sonunda 0,5 sn sessizlik.
- Müzik, efekt, gürültü kapısı YOK. Yalnız konuşma.

TELAFFUZ (bağlayıcı — yanlış okunursa dosyayı yeniden üret)
Ephesus = EF-uh-sus        (Türkçe "Efes" değil)
Chalcidicum = kal-SID-i-kum ("ç" değil, "k")
Hydreion = hid-RAY-on
Diocletian = dy-oh-KLEE-shun
Tetrarchs = TET-rarks
Corinthian = ko-RIN-thee-un
Curetes = koo-REE-teez
Ortygia = or-TIJ-ee-a
Mazeus = ma-ZAY-us
Mithridates = mith-ri-DAY-teez
Hadrian = HAY-dree-un
Verulanus = ver-oo-LAH-nus
xystos = KSIS-tos          ("ks" ile başlar)
Arcadiane = ar-kad-ee-AH-nay
Koressos = ko-RES-os
Magnesia = mag-NEE-zha     (yumuşak "j")
Justinianic = jus-tin-ee-AH-nik
Vedius = VEE-dee-us
Antoninus Pius = an-to-NY-nus PY-us
Aphrodite = af-ro-DY-tee
Selçuk = SEL-chook
İzmir = IZ-meer            ("ı" harfi "i" gibi)

ÇIKTI — dosya adları AYNEN bunlar, public/audio/ altına:
en-kalkidikum-hydreion.mp3
en-kalkidikum-triodos-meydani.mp3
en-kalkidikum-heksagon.mp3
en-kalkidikum-verulanus-meydani-salonu.mp3
en-kalkidikum-antik-liman-kanali.mp3
en-kalkidikum-meryem-kilisesi-vaftizhanesi.mp3
en-kalkidikum-bizans-hamamlari.mp3
en-kalkidikum-vedius-gymnasionu.mp3
en-kalkidikum-kent-surlari.mp3
en-kalkidikum-chalcidicum.mp3
en-kalkidikum-domitian-cesmesi.mp3
en-efes-pollio-domitian-cesmesi.mp3   <- Pollio metni degisti, yeniden uret

TEKNİK KÜNYE (mevcut 46 dosyadan ÖLÇÜLDÜ — birebir uy)
Örnekleme: 24 000 Hz
Kanal: mono
Bit hızı: 112 kbps CBR
Konteyner: MP3

ffmpeg ile örnek dönüşüm:
ffmpeg -i ham.wav -ar 24000 -ac 1 -b:a 112k -c:a libmp3lame \
  public/audio/en-kalkidikum-heksagon.mp3

KABUL KONTROLÜ (her dosya için kendin koş, geçmeyen varsa yeniden üret)
1. ffprobe -v error -show_entries stream=sample_rate,channels,bit_rate \
     -of csv=p=0 <dosya>   → çıktı tam olarak: 24000,1,112000
2. Süre 20–45 sn arasında
3. Dosya boyutu 60–200 KB arasında
4. TTS'e verilen metin, JSON'daki "description" ile kelime kelime aynı
5. İlk ve son 0,5 sn sessizlik

YAPMA
- efes-en.json'u DÜZENLEME. Ses alanlarını kod tarafı bağlayacak.
- Test dosyalarını, sayıları, README'leri değiştirme.
- Metne yeni bilgi ekleme; kaynakta olmayan cümle seslendirme.
- Var olan 46 dosyanın üzerine yazma.
- Ses kimliğini değiştirme. Farklı bir ses gerekiyorsa ÖNCE SOR, uygulama.

BİTİNCE
Ürettiğin 12 dosyanın listesini + her biri için kabul kontrolü çıktısını ver.
Eksik kalan varsa hangisi ve neden.
```

---

## `<<SES>>` yerine ne yazacaksın

Mevcut 46 dosyayı üreten sesin adını bilmiyorum. Seçenekler:

| Durum | `<<SES>>` yerine |
|---|---|
| Elinde mevcut sesin adı varsa | `ElevenLabs "Adam"` gibi tam ad |
| Bilmiyorsan | `mevcut 46 dosyayla aynı ses; değiştirme` |
| Yeni ses olacaksa | adı + "tüm tura uygulanacak, onay istiyorum" |

**Uyarı:** Farklı ses seçilirse 47–55 durakları turda başka bir sesle
konuşur gibi duyulur. Aynı ses bulunamıyorsa doğru cevap "yeni ses" değil,
"46 dosyayı da yeniden üretmek" olur — o ayrı bir karar.

---

## Kopyalamak yerine dosya ver

Agent depoya erişebiliyorsa prompt'u kısaltabilirsin:

```
docs/icerik/sesli-anlatim-rehberi/kayit-paketi/metinler/TUMU.txt
dosyasındaki 9 metni oku. Kurallar, telaffuz ve kabul kontrolü için
docs/icerik/sesli-anlatim-rehberi/agent-ses-gorevi.md dosyasına bak.
Çıktı: public/audio/en-kalkidikum-*.mp3 (dosya adları o görev dosyasında).
```

Bu iki satır yeterli; agent künyeyi ve telaffuzu görev dosyasından okur.

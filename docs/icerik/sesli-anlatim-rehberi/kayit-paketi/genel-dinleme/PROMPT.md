# Genel dinleme kayıt paketi — ses agent'ına verilecek prompt

> **Ne için:** Rehberdeki **28 yerin tamamı** için, yerin bütününü anlatan tek
> parça dinleme kaydı. Efes turundaki 57 durak gibi nokta nokta gezinmez;
> "üstün körü" bir bakış verir. Türkçe 28 + İngilizce 28 = **56 dosya**.
>
> **Tek kaynak:** `public/audio/listen/place-listen.json`. Bu klasördeki CSV ve
> metin dosyaları oradan üretilir (`npm run content:listen-paket`). Metni
> burada değiştirmeyin; JSON'u değiştirip paketi yeniden üretin.

Aşağıdaki bloğu olduğu gibi kopyalayın; tek doldurulacak yer `<<SES>>`.
**`<<SES>>` Efes turuyla aynı ses olmalı** (`/audio/efes-*.mp3`,
`/audio/en-efes-*.mp3`). Farklı bir ses, aynı uygulamada iki anlatıcı demektir.

---

```
Rol: Atlasia gezi rehberi için seslendirme üreticisisin.

GÖREV
28 yerin Türkçe ve İngilizce genel dinleme metnini sese çevirip MP3 üret.
Toplam 56 dosya. Metinleri DEĞİŞTİRME, kısaltma, düzeltme, ekleme yok.

METİNLERİ BURADAN OKU (depo köküne göre)
1. docs/icerik/sesli-anlatim-rehberi/kayit-paketi/genel-dinleme/kayit-listesi-tr.csv
2. docs/icerik/sesli-anlatim-rehberi/kayit-paketi/genel-dinleme/kayit-listesi-en.csv
   → her satırda `hedef_yol` (yazılacak yol) ve `seslendirme_metni` var.
   CSV tırnaklı; alan içi virgüller metnin parçasıdır.

Yedek (biri çalışmazsa):
3. aynı klasördeki `TUMU-tr.txt` ve `TUMU-en.txt` ("=== <id> ===" başlıklarıyla)
4. `metinler/` altındaki tek tek .txt dosyaları

SES
- Ses: <<SES>>
- Bu ses, Efes turunda kullanılan sesle AYNI olmalı. Değilse dosyaları
  yayına almayın; iki farklı anlatıcı kullanıcıya yanlış gelir.
- Dil: her dosya kendi dili. Ton: sakin anlatıcı, müze rehberi. Reklam tonu yok.
- Hız: dakikada ~150 kelime. Cümle arası ~0,3 sn, paragraf arası ~0,8 sn.
- Dosya başında ve sonunda 0,5 sn sessizlik. Müzik, efekt, gürültü kapısı YOK.

TEKNİK
- MP3, 24 000 Hz, mono, 32 kbps CBR; ID3v2.4 etiketi (tur başına mevcut
  dosyalarla aynı künye).
- Süre, CSV'deki `tahmini_sure_sn` değerinin ±%25 aralığında olmalı.
- Dosya adı ve yol CSV'deki `dosya_adi` / `hedef_yol` ile birebir aynı:
  Türkçe `/audio/listen/<id>.mp3`, İngilizce `/audio/listen/en-<id>.mp3`.

TELAFFUZ (İngilizce metinler için bağlayıcı)
Ephesus = EF-uh-sus                 (Türkçe "Efes" değil)
Hierapolis = hy-uh-RAP-uh-lis
Göreme = GUR-eh-meh
Göbeklitepe = guh-BEK-lee-teh-peh
Kaçkar = KACH-kar                   ("kajkar" değil)
Kaputaş = ka-poo-TASH
Skógafoss = SKOH-ga-foss
Lofoten = LOH-foh-ten
rorbuer = ROR-boo-er
Moynaq = moy-NAHK
Chefchaouen = shef-SHAH-wen
Büyük Han = boo-YOOK hahn
Kyrenia = ky-REE-nee-uh
Salamis = SAL-uh-mis
Siq = seek
Al-Khazneh = al-KHAZ-neh
Huayna Picchu = WY-nuh PEE-choo
Pachacuti = pah-chah-KOO-tee
Fushimi Inari = foo-SHEE-mee ee-NAH-ree
Spaccanapoli = spahk-kah-NAH-poh-lee
acqua alta = AH-kwah AHL-tah
MOSE = MOH-zeh
Positano = poh-zee-TAH-noh

TÜRKÇE METİNLER
Özel adlar Türkçe okunur (Efes, Kapadokya, Göreme, Kaçkar, Kaputaş,
Skógafoss, Lofoten, Machu Picchu, Fushimi Inari, Chefchaouen, Büyük Han,
Salamis, Navagio, Petra, El-Hazine).

TESLİM
- 56 MP3, `hedef_yol` altındaki adlarla.
- Kaç dosya üretildiğini ve varsa süre/ses eşleşmesi sapmalarını yaz.
- Metne dokunduysan hangi dosyada ne değiştiğini tek tek bildir.
```

---

## Yayına alma

1. Dosyaları `public/audio/listen/` altına yukarıdaki adlarla koy.
2. `npm run test:run` — `src/data/placeListen.test.ts` klasördeki her MP3'ün
   bir kayda bağlı olduğunu doğrular.
3. Uygulamada yeri aç: kart "Ses kaydı henüz yayında değil" uyarısını bırakır,
   süre gerçek dosyadan gelir.
4. Ses kimliği denetimi: `docs/icerik/sesli-anlatim-rehberi/ses-tinisi-denetimi-2026-11-08.md`
   yöntemiyle MFCC mesafesini ölç. Eşik: aynı ses ≤ 6, farklı ses ≥ 10.
   Yeni dosyalar Efes korpusuna **6'nın altında** kalmalı.

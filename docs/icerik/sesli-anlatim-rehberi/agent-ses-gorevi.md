# Ses üretimi — agent için görev tanımı

> **Kapanış notu (8 Kasım 2026).** Bu belge tarihsel kayıttır. Turun 57 durağının
> tamamı hem Türkçe hem İngilizce seslidir (`/audio/efes-*.mp3`,
> `/audio/en-efes-*.mp3`); aşağıdaki "bekleyen / kalan" listeleri artık geçerli
> değildir. Yakın pinlerin ayrılması ve `sharedWith` temizliği de yapıldı.
> Güncel durum: [`efes.md`](./efes.md) §3–§4.


7 Kasım 2026. Bu dosya **bir agent'a verilmek üzere** yazıldı. İnsan
seslendiren için değil.

> Karar: kayıtları bir agent üretecek. Mevcut 46 İngilizce dosya da bu yolla
> üretilmiş (`ID3 TSSE = Lavf59.27.100`, ffmpeg). Aşağıdaki künye **mevcut
> dosyalardan ölçüldü**, tahmin değil — yeni dosyalar bunlarla birebir aynı
> olmalı ki turda ses seviyesi ve tını değişmesin.

---

## 1. Görev

`public/audio/efes-en.json` içinde `audio` alanı **boş** olan dokuz durak **+ turda henüz yer almayan iki yapı** için
İngilizce MP3 üret. Metinleri **değiştirme**; dosyadaki `description` alanı
ne ise o okunacak.

| # | id | metin kaynağı |
|---|---|---|
| 47 | `hydreion-kalkidikum` | `efes-en.json` → `description` |
| 48 | `triodos-meydani` | aynı |
| 49 | `heksagon` | aynı |
| 50 | `verulanus-meydani-salonu` | aynı |
| 51 | `antik-liman-kanali` | aynı |
| 52 | `meryem-kilisesi-vaftizhanesi` | aynı |
| 53 | `bizans-hamamlari` | aynı |
| 54 | `vedius-gymnasionu` | aynı |
| 55 | `kent-surlari` | aynı |
| 45 | `chalcidicum` | `efes-en.json` (turda, sesi yok) |
| 46 | `domitian-cesmesi` | `efes-en.json` (turda, sesi yok) |
| 46b | `pollio-domitian-cesmesi` | metni değişti, sesi yeniden üretilecek |

---

## 2. Teknik künye (mevcut dosyalardan ölçüldü)

> **Düzeltme (8 Kasım 2026).** Bu tabloda bit hızı **112 kbps** yazıyordu; bu
> yanlıştı. Dosyalar MPEG-2 Layer III başlığı taşıyor ve o tabloda indeks 4 =
> 32 kbps'dir — MPEG-1 tablosuyla okununca 112 çıkıyor. 114 dosyanın tamamı
> `miniaudio` ile çözülüp doğrulandı: 24 000 Hz, mono, **32 kbps CBR**
> (saniyede 4 000 bayt). Süre = dosya boyutu / 4 000.

| Alan | Değer | Nasıl ölçüldü |
|---|---|---|
| Konteyner | MP3 | dosya başlığı |
| ID3 | ID3v2.4, tek etiket `TSSE = Lavf59.27.100` | ilk 45 bayt |
| Örnekleme | **24 000 Hz** | MPEG çerçeve başlığı |
| Kanal | **mono** | çerçeve başlığı |
| Bit hızı | **32 kbps CBR** | çerçeve başlığı (MPEG-2 Layer III) |
| Saniyedeki bayt | **4 000 B/s** | 32 kbps ÷ 8 |
| Süre | ~25–37 sn | metin uzunluğundan |

Doğrulama komutu (ffmpeg varsa):

```bash
ffprobe -v error -show_entries stream=sample_rate,channels,bit_rate -of csv=p=0 <dosya>
```

Beklenen çıktı: `24000,1,32000`

**Bu künyeden sapma.** Farklı örnekleme/bit hızı, turda duraklar arasında
duyulabilir tını farkı yaratır. Yeni dosyalar mevcutlarla aynı ayarda olmalı.

---

## 3. Ses kimliği

- **Dil:** İngilizce, nötr Britanya/Amerikan karışımı — mevcut 46 dosyayla
  aynı ses.
- **Ton:** sakin anlatıcı, müze rehberi. Reklam tonu değil.
- **Hız:** dakikada ~150 kelime.
- **Duraklama:** cümle arası ~0,3 sn, paragraf arası ~0,8 sn.
- **Başlangıç/bitiş:** 0,5 sn sessizlik. Kırpma, fade yok.
- **Müzik, efekt, gürültü kapısı yok.** Yalnız konuşma.

---

## 4. Telaffuz zorunlulukları

Bunlar bağlayıcı. Yanlış okunursa durak yeniden üretilir.

| Terim | Okunuş | Not |
|---|---|---|
| Ephesus | EF-uh-sus | Türkçe "Efes" **değil** |
| Chalcidicum | kal-SID-i-kum | "ç" değil, "k" |
| Hydreion | hid-RAY-on | |
| Diocletian | dy-oh-KLEE-shun | |
| Tetrarchs | TET-rarks | |
| Corinthian | ko-RIN-thee-un | |
| Curetes | koo-REE-teez | |
| Ortygia | or-TIJ-ee-a | |
| Mazeus | ma-ZAY-us | |
| Mithridates | mith-ri-DAY-teez | |
| Hadrian | HAY-dree-un | |
| Verulanus | ver-oo-LAH-nus | |
| xystos | KSIS-tos | "ks" ile başlar |
| Arcadiane | ar-kad-ee-AH-nay | |
| Koressos | ko-RES-os | |
| Magnesia | mag-NEE-zha | yumuşak "j" |
| Justinianic | jus-tin-ee-AH-nik | |
| Vedius | VEE-dee-us | |
| Antoninus Pius | an-to-NY-nus PY-us | |
| Aphrodite | af-ro-DY-tee | |
| Selçuk | SEL-chook | |
| İzmir | IZ-meer | "ı" harfi "i" gibi |

---

## 5. Çıktı

Dosya adları **aynen** bunlar, `public/audio/` altına:

```
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
```

---

## 6. Kabul kontrolü (agent kendi koşar)

Her dosya için:

1. `ffprobe` → `24000,1,112000` ✅
2. Süre 20–45 sn arasında ✅
3. Dosya boyutu 60–200 KB arasında ✅
4. Metin `description` ile birebir kelime eşleşmesi (TTS'e verilen metin
   dosyadaki alanla **aynı** değilse reddet) ✅
5. İlk 0,5 sn ve son 0,5 sn sessizlik ✅

Sonra JSON bağlama (bu adım agent'ın işi **değil**, kod tarafı):

```jsonc
// public/audio/efes-en.json
"heksagon": {
  "title": "Hexagon",
  "imageAlt": "...",
  "audio": "/audio/en-kalkidikum-heksagon.mp3",   // ← eklenir
  "description": "..."
}
```

Sonra `KALKIDIKUM_ENGLISH_AUDIO_PENDING` listesinden çıkarılır
(`src/data/audioDiscovery.test.ts`) ve test kırılırsa liste güncel değildir.

---

## 7. Sınırlar

- **Metin değiştirilemez.** TTS'e verilecek string, JSON'daki `description`
  alanının birebir kopyasıdır. Kısaltma, düzeltme, ekleme yok.
- **Yeni bilgi eklenemez.** Kaynakta olmayan bir cümle seslendirilemez.
- **Ses kimliği mevcut 46 dosyayla aynı olmalı.** Farklı bir TTS sesi
  seçilecekse **önce sorulur**, doğrudan uygulanmaz.
- **Efes dışına çıkılmaz.** Bu görev yalnız dokuz durak.

---

## 8. Kısmi teslim

Dosyalar parça parça gelebilir. Üç dosya geldiyse üçü bağlanır; altısı Türkçe
metinle çalışmaya devam eder. Bekleme yok.

---

## Ek: insan seslendiren için yazılmış paket

`kayit-paketi/` altındaki dosyalar insan okuyucu içindir (nefes, mikrofon
mesafesi, LUFS hedefi…). Agent bu klasörü **kullanmaz**; agent için tek kaynak
bu dosyadır.

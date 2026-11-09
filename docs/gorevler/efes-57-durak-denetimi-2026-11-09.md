# Efes 57 duraklı sesli tur — bağımsız denetim (9 Kasım 2026)

Bu belge, 1–57 numaralı sesli turun tamamının **veriye karşı** yeniden
denetiminin kaydıdır. Denetim, işi yapan oturumdan bağımsız bir turda, kaynak
koda ve `public/assets/sesli-turlar.json`'a bakılarak yapıldı; amaç "yapıldı"
demekle yetinmeyip her iddiayı yeniden ölçmekti.

Denetim betiği `public/assets/sesli-turlar.json`'ı okur, hiçbir alanı
uygulamadan türetmez. Aşağıdaki her satır aynı betikle tekrar üretilebilir.

## 1. Ölçülen kriterler ve sonuç

| Kriter | Beklenen | Sonuç |
| --- | --- | --- |
| Durak sayısı | 57 | 57 |
| Numara sürekliliği | 1…57, boşluk yok | kesintisiz |
| Yeşil damla pin (çekirdek içi) | 47 | 47 |
| Mor ◆ elmas (çekirdek dışı) | 10 | 10 — 16, 17, 18, 24, 25, 26, 27, 29, 38, 57 |
| Mor işaretin hepsi gerçekten çekirdek dışı mı | evet | evet (Ayasuluk, Meryem, Artemision, surlar, Selçuk çevresi) |
| Anlatım uzunluğu | ≥ 200 karakter | en kısa metin 287 karakter (48. durak) |
| Kaynak sayısı | ≥ 2 durak başına | 174 kaynak |
| Kaynak çeşitliliği | ≥ 2 ayrı alan adı | 36 alan adı, her durak ≥ 2 |
| Görsel tekilliği | 57 farklı kare | 57/57 tekil |
| Künye bütünlüğü | yazar + lisans + kaynak | eksiksiz |
| "Lisansı doğrulanmadı" | 0 | 0 |
| Birebir aynı koordinat | 0 | 0 |
| Yaklaşık konum işaretli durak | 52, 53, 57 | 3/3 işaretli ve **notlu** |
| Yaklaşık konum rozeti | durağın kendi gerekçesi, iki dilde | 3/3 TR + 3/3 EN |
| Ses dosyası eşleşmesi (TR + EN) | 114 dosya | 114/114 mevcut, yetim/eksik 0 |

## 2. Bulunan hatalar ve düzeltmeleri

Denetimin ilk turunda **3 hata + 3 küçük bulgu** çıktı. Hepsi aynı turda
düzeltildi; hiçbiri "sonra bakarız" diye bırakılmadı.

### 2.1 `efes.md` §1 — yeşil listede numara atlaması (hata)

Belgede yeşil pin listesi `1–15, 19–23, 28, 30–37, 39–49, 51–56` yazıyordu ve
satırın sayısı **46**'ydı. Gerçek sayı 47: listede **50 (Triodos Meydanı)**
yoktu. `1–15, 19–23, 28, 30–37, 39–49, 51–56` = 46 numara, oysa veride 47 yeşil
durak var ve 50 mor değil.

Düzeltme: liste `1–15, 19–23, 28, 30–37, 39–56` oldu (47 numara).

### 2.2 `efes.md` §1 — yanlış durak adı (hata)

Aynı bölümdeki notta "Chalcidicum (45) ve **Domitian Çeşmesi (46)** eklendi"
yazıyordu. Veride 46 **Pollio Anıtı**, 47 ise Domitian Çeşmesi. Numarayı bir
yanlış okumak, sonraki her sayımı kaydırır.

Düzeltme: "Chalcidicum (45) ve Domitian Çeşmesi (47) … (46 Pollio Anıtı'dır)".

### 2.3 `efes.md` §3 — iki Kalkidikum tablosu (hata)

Bölümde başlığı aynı olan **iki tablo** vardı ve ikincisi eskiydi:

- 51 Heksagon için "TAN Oktagon (sıralama) — yaklaşık" (Heksagon, Oktagon'un
  doğusunda ayrı bir yapıdır; eşitlenmesi yanlış)
- 51 fotoğrafı için "Holländer · Copyrighted free use" (geçerli tabloda
  Thür (ÖAW) + Berns, fotoğraf Elelicht · CC BY-SA 3.0)

İkinci tablo silindi; geçerli ilk tablo kaldı. Bir belgede aynı soruya iki
farklı yanıt, yanıt olmamasından kötüdür.

### 2.4 Yaklaşık konumda gerekçe eksikliği (küçük)

`coordinateAccuracy: "approximate"` işaretli üç duraktan yalnız 52'de
`coordinateNote` vardı. 53 (Antik Liman Kanalı) ve 57 (Kent Surları) arayüzde
"≈ Yaklaşık konum" uyarısını gösteriyordu ama **nedenini yazmıyordu**; karttaki
genel cümle 53 için yanlıştı (yapı geniş alana yayılmıyor, havza ortasında ve
erişime kapalı) ve 57 için eksikti (9 km'lik hattın yalnız korunmuş bir kesiti).

Düzeltme: 53 için "havza ortası, erişime kapalı, kıyı çizgisi kaynaklarda
farklı" notu; 57 için "9 km'den fazlasının 3 km'si ayakta, tek giriş yok, nokta
fotoğrafın GPS'i (37.9309764, 27.3395792)" notu.

**Aynı hatanın ikinci katı (aynı gün bulundu).** Not eklemek yetmedi: kartın
üstündeki rozet üç durakta da **sabit** cümleyi yazıyordu — "yapı geniş bir
alana yayılıyor; pin merkezini gösterir". 53'te ortada yapı yok (alüvyonla
dolmuş, erişime kapalı bir havza), 57'de ise yapı değil 9 km'lik bir hat var.
Yani not eklense bile ekranın en görünür yerinde yanlış cümle duruyordu.
Rozet artık **durağın kendi gerekçesini** yazıyor (`coordinateShort`): 52
"avlu 200 × 240 m; pin avlunun bir köşesini gösterir", 53 "havza ortası;
yürüyüş güzergâhı değil", 57 "9 km'lik hattın korunmuş tek kesiti". Jenerik
cümle yalnız notsuz durak için yedek olarak kaldı.

Ayrıca not **yalnız Türkçeydi**: İngilizce arayüze geçen kullanıcı Türkçe bir
paragraf görüyordu. Üç durağın kısa ve uzun gerekçesi `public/audio/efes-en.json`
içine çevrildi; test, İngilizce metinde Türkçe karakter ararsa düşer.

### 2.5 Görsel alt metinleri başlığı tekrar ediyordu (küçük)

12 (Memmius Anıtı) alt metni yalnızca "Memmius Anıtı"ydı — ekran okuyucu için
bilgi eklemeyen alt metin, olmayan alt metne eşittir. 11 (Mazaeus ve
Mithridates Kapısı) ve 47 (Domitian Çeşmesi) de birebir başlığı tekrar
ediyordu; 22 ve 32 ise "Efes Liman Caddesi" gibi başlığın bozulmuş hâliydi.

Düzeltme: beş durağın alt metni yer/bağlam ekleyecek biçimde yazıldı
("Agora'nın güney kapısı: …", "Kuretler Caddesi'ndeki …"). Kamera açısı
iddia edilmedi; yalnız yapının kimliği ve bulunduğu yer anlatıldı.

### 2.6 Arşiv kimliklerinin eşlemesi yoktu (küçük)

`efes-hatali-rehber-kayitlari-arsiv.md` dokuz `kalkidikum-*` kaydını
saklıyordu ama bunların turdaki hangi durağa dönüştüğünü yazmıyordu; dışarıdan
bakan için "bu kayıtlar kayıp mı, taşındı mı?" sorusu yanıtsızdı.

Düzeltme: arşiv kimliği → turdaki kimlik → durak no eşleme tablosu eklendi.

## 3. Doğrulanan dış kaynaklar

Denetim sırasında iki kaynak yeniden açıldı ve iddialar yerinde görüldü:

- **Pleiades 43374417 (Magnesia Kapısı)** — temsilî nokta
  37.9345538108, 27.3504953967 (±20 m). 27. durağın koordinat iddiası doğru.
- **H. Thür, "Zur Kuretenstraße von Ephesos" (ÖAW PDF)** — erişilebilir;
  51 Heksagon'un kaynak künyesi doğru.

## 4. Denetimin kalıcı hâle getirilmesi

Bulgular yalnız düzeltilmedi, **teste bağlandı** (`src/data/audioDiscovery.test.ts`):

- mor ◆ durakların **listesi** kilitli (sayı değil — yanlış durağın mor
  boyanması da yakalanır),
- `approximate` işaretli her durağın `coordinateNote` yazması zorunlu
  (> 40 karakter),
- hiçbir durağın alt metni başlığını tekrar edemez ve ≥ 15 karakter olmalı,
- Kalkidikum eklentilerinin `envanterNo` dizisi ve kimlik biçimi.

Test sayısı 1 492 → **1 495**; 195 dosya.

## 5. Onay

Veri katmanı (`public/assets/sesli-turlar.json`) denetimden **temiz** geçti:
57 durak, 47 yeşil / 10 mor, 174 kaynak / 36 alan adı, 114 ses dosyası,
tekil koordinat ve görsel, eksiksiz künye.

Belge katmanında çıkan üç hata, iki küçük bulgu ve rozetin sabit cümlesi
düzeltildi; hepsi testle kilitlendi. Bu hâliyle iş **onaylanabilir**. Onayın kapsamı dışında kalan, bilerek açık bırakılan
maddeler §6'da.

## 6. Onaya dâhil olmayan, açık kalan maddeler

Bunlar hata değil, **ölçüm/üretim borcu**; hiçbiri yayına çıkmayı engellemez:

1. **52, 53, 57 temsilî noktalarının saha ölçümü** — arayüzde "≈ Yaklaşık
   konum" ve gerekçe notuyla işaretli.
2. **20 ve 27 için yapı fotoğrafı** — mevcut kareler yapıyı değil komşusunu
   gösteriyor ve alt metin bunu açıkça yazıyor ("kapının kendisi bu karede
   görünmüyor"). 9 Kasım'da arama **yeniden** ve daha geniş yapıldı ve yine
   sonuç çıkmadı: Commons'ta `intitle:"magnesia gate"` 0, `Magnesia…` kategori
   öneki altında ilgili kategori yok, Wikidata Q104641893'te P18 (görsel) yok,
   `Heroon Ephesos` araması yalnız Trysa (Likya) frizlerini ve genel plan
   şemasını veriyor. Uydurulmuş ya da başka şehirden bir kare eklemek
   "doğrulanmış görsel" kuralını bozar; bu yüzden **kasten boş bırakıldı**.
   Çözüm tek satırlık bir karar: resmî site görsellerinin kullanılmasına izin
   verilirse künye "Kullanım izni doğrulanmadı" olur ve doğrulama ölçütü
   bilinçli olarak gevşetilmiş sayılır.
3. **Konum doğrulamasının Google tarafı** — OSM/Pleiades/Wikidata ile
   karşılaştırıldı, Google Maps bağımsız olarak kontrol edilmedi.

## 7. Tekrar üretme

```bash
# Sayımlar (tek doğru kaynak: public/assets/sesli-turlar.json)
node -e '
const s = JSON.parse(require("fs").readFileSync("public/assets/sesli-turlar.json","utf8")).tours[0].stops;
const d = (a) => new Set(a).size;
console.log("durak", s.length,
  "| yeşil", s.filter(x => x.markerStyle !== "additional").length,
  "| mor", s.filter(x => x.markerStyle === "additional").map(x => x.no).join(","));
console.log("kaynak", s.reduce((a, b) => a + b.sources.length, 0),
  "| alan adı", d(s.flatMap(x => x.sources.map(y => new URL(y.url).hostname))));
console.log("görsel tekil", d(s.map(x => x.image.url)), "| koordinat tekil", d(s.map(x => x.lat + "," + x.lng)));
console.log("yaklaşık", s.filter(x => x.coordinateAccuracy === "approximate").map(x => x.no).join(","));
'

# Bu sayımları kilitleyen testler
npx vitest run src/data/audioDiscovery.test.ts
```

Sayımların tek doğru kaynağı `public/assets/sesli-turlar.json`'dır; belgeler
veriden türetilmeli, tersi değil.

## 8. Kapanış durumu (9 Kasım 2026, akşam)

Bu turda kapatılabilen her şey kapatıldı. Açık kalan **dört** kalem var ve
hiçbiri kodda bırakılmış bir yarım iş değil:

| Kalem | Neden açık | Kim kapatır |
| --- | --- | --- |
| 52, 53, 57 temsilî nokta | Saha ölçümü gerekir (GPS); kaynaklar arası 25–90 m fark uydurma bir noktayla kapatılmaz | Sahada ölçüm |
| 20 Heroon, 27 Magnesia Kapısı fotoğrafı | Lisanslı ve doğru kare yok; arama üç kez tükendi, alt metin bunu yazıyor | Ürün kararı (resmî site görselleri) |
| PR #195 birleştirme | Branch koruması review onayı istiyor | Bağımsız onay |
| appShell LCP/TBT | Sandbox ölçümü; CLS 0,000 ile kapandı, kalanı ortam gürültüsü | Ortam / yeniden ölçüm |

Bu turda ayrıca kapatılanlar: `efes.md` üç hata, 53/57 gerekçe notu, rozetin
sabit yanlış cümlesi, İngilizce arayüzde Türkçe not, beş görselin alt metni,
arşiv kimlik eşlemesi. Hepsi testle kilitli: **1 495 test / 195 dosya**.


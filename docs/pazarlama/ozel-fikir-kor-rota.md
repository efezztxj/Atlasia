# Özel fikir — "Kör Rota" (Mühürlü Rota)

**Tarih:** 2026-10-24 · **Format:** 9:16 video (12,7 sn) + carousel + sınırlı pilot mekaniği
**Kreatifler:** `docs/pazarlama/kreatifler/kor-rota/` · video: `sesli-bolum-kor-rota.mp4`

---

## Fikir tek cümlede

**Atlasia sana nereye gideceğini söylemez.** Sadece "şu yöne 900 metre yürü" der. Durağın adı, hikâyesi ve sesi
ancak **vardığında** (40 metre kalınca) açılır. Yani uygulamanın en güçlü anını — konumda tetiklenen anlatımı —
**içeriğin kendisi** yapıyoruz.

Bu, "gizemli rota" fikri değil, **ürünün kendi mekaniğinin ürüne çevrilmesi**:

| Ürün gerçeği | Fikrin kullanımı |
| --- | --- |
| `hiddenInView` + yakınlık motoru (`nearbyPlaces`, 25 km yarıçap) | Rota **isim vermeden** üretilir; durak adları maskelenir |
| `tourGuide`: 40 m giriş, 60 m çıkış histerezisi | "Mühür açılma" eşiği = 40 m — uydurma değil, mevcut sayı |
| `NearbyAudioGuide` (izinle, ekran açıkken) | Varışta açılan şey: ad + hikâye + sesli anlatım |
| `surpriseBrief()` (`"beni şaşırt"` → 2 saat, Gizli Yerler + Fotoğraf, yürüyüş) | Mührü üreten hazır motor; kod zaten var |
| Rota linki (`#r=`, `?route=`) | Mühürlü rota linki paylaşılabilir (aşağıdaki karar) |

**Neden "özel":** seyahat uygulamalarının tamamı *bilgi verir*. Bu fikir **bilgiyi bilerek saklıyor.** Kopyalanması zor,
çünkü rakiplerin çoğunda "varışta açılan içerik" yok; olanlarda da bunu bir ürün moduna çevirmek cesaret ister.
Reklamda anlatması 13 saniye, deneyimlemesi bir yürüyüş.

---

## Video (hazır üretildi)

`docs/pazarlama/kreatifler/ai-video-keyframe/sesli-bolum-kor-rota.mp4` — 12,7 sn, sesli, 9:16

| Sn | Kare | Yazı |
| --- | --- | --- |
| 0-2,6 | mühürlü zarf, altın çizgi | **Nereye gittiğini söylemiyorum.** / *Sana yalnız bir rota veriyorum. Mühürlü.* |
| 2,6-5,2 | sisli taş yol, ileride tek altın nokta | **Sadece yürü.** / *İlk durak açılmadan adı görünmüyor.* |
| 5,2-7,8 | zarf makro | **Vardığında açılıyor.** / *Adı, hikâyesi, sesi — hepsi orada. 40 metre kalınca.* |
| 7,8-10,2 | marka zemini | **Atlas AI'a "beni şaşırt" yaz.** / *2 saatlik yürüyüş. Gizli yerler, fotoğraf.* |
| 10,2-12,7 | sisli yol, geri çekilme | **Geri dönünce anlatırsın.** / *atlasia.pages.dev · link var, mağaza yok* |

**İlk 1,5 saniye alternatifleri (A/B):**
- A: "Nereye gittiğini söylemiyorum." (mevcut, en net)
- B: "Bu uygulama rotayı senden saklıyor." (iddialı, tartışma açar)
- C: "Rehberini kapalı zarfta veriyorum." (şiirsel)
- D: "Gözlerini kapat, 900 metre yürü." (davet)

---

## Carousel (6 kare, ana kareler hazır)

| # | Metin | Görsel |
| --- | --- | --- |
| 01 | **Kör Rota.** Nereye gittiğini söylemiyorum. | `01-kapali-zarf.jpg` · "Başla" |
| 02 | Sadece mesafe ve yön: *"1. durak · 900 m · kuzeybatı"* | `02-yol-gizem.jpg` |
| 03 | 40 metre kalınca mühür açılır: ad, hikâye, sesli anlatım. | gerçek uygulama ekran kaydı (tarayıcı) |
| 04 | Yürüdüğün yol iz olarak kalır; istersen mühürsüz paylaşırsın. | ekran kaydı: iz + paylaşım önizlemesi |
| 05 | Ne yapmadığımızı da yazalım: navigasyon değil, sadece sıra ve yön. | marka zeminli kare |
| 06 | **"beni şaşırt"** yaz. 2 saat, gizli yerler, fotoğraf. | atlasia.pages.dev |

---

## Pilot mekaniği: "Mühürlü Rota" (kod işi, ayrı PR)

Bugünkü kodla **reklamı yapılabilir** ölçüde çalışır; tam ürün modu 4 parçalık küçük bir iştir:

1. **İsim maskeleme:** `planRoute` çıktısında `stops[].name` istemciye `"1. durak · 900 m"` olarak yazılır;
   gerçek ad/hikâye yalnız `resolveGuidePlace` 40 m eşiğini geçtiğinde açılır. (Mevcut `tourGuide` kapısı yeniden kullanılır.)
2. **Gerekçe korunur:** `aiReason` **gösterilir** (mühür yalnız *kimlik* bilgisini saklar, *neden*ini değil).
   Bu, ürünün "açıklanabilir" karakterini bozmaz — aksine "neden buraya gidiyorum bilmiyorum ama neden bu sırada olduğunu biliyorum" der.
3. **Paylaşım kararı:** mühürlü rota linkinde durak adları **çıkarılır**; alan kişi kendi cihazında aynı yürüyüşü yapar.
   (Mevcut `shareLink` şeması bunu destekler; ad alanı boşaltılır, koordinat ve sıra kalır.)
4. **Güvenlik:** yalnız kullanıcının **mevcut konumundan yürüme mesafesindeki** (≤ 2,5 km) rota mühürlenir; şehirler arası
   "gizemli yolculuk" yok. Gece/ıssız alan uyarısı mühür açılınca değil, **önce** gösterilir.

**Kabul kriteri (öneri):** 40 m eşiği testli; ad alanı ağ yanıtında görünmüyor (ağ sekmesinde kanıt); paylaşılan linkte ad yok;
ekran kapalıyken açılmıyor (mevcut sınır); mühürsüz moda tek dokunuşla çıkış var.

**Riskler ve dürüstlük:**
- *Güvenlik:* insanları bilinmeyen yere yönlendirmek. → mesafe tavanı, gündüz önerisi, "mühürsüz göster" düğmesi, acil çıkış.
- *Hayal kırıklığı:* durak "değmez" çıkarsa güven kaybı. → pilotta yalnız editör onaylı, saha doğrulanmış duraklarla açılır (AY-14).
- *Tıbbi/hukuki:* "rehberlik" iddiası yok; mühür bir *içerik* oyunu, navigasyon değil (AY-04).

---

## Neden bu fikir "özel"

1. **Ürünün en iyi anını (konumda açılan anlatım) reklamın konusu yapıyor.** Çoğu uygulama özelliğini anlatır; bu, özelliği *deneyim* hâline getiriyor.
2. **Tersine bir vaat:** "sana her şeyi söyleyen uygulama" değil, "sana bir sürpriz bırakan uygulama". Seyahat kategorisinde
   bilgi bolluğu var, **merak kıtlığı** var.
3. **Paylaşılabilir bir mekanik:** mühürlü rota linki arkadaşına gider, o da aynı yürüyüşü yapar → organik büyüme.
4. **Ucuz:** yeni sunucu, LLM, API yok. Var olan üç modülün (yakınlık, rota, paylaşım) birleşimi.
5. **Seri olur:** her bölge için bir "mühür": Efes'te 3 saat, Likya'da 1 gün, Kapadokya'da gün doğumu.

---

## Sıradaki özel fikir adayları (kısa liste, aynı çizgi)

| Fikir | Tek cümle | Neden özel |
| --- | --- | --- |
| **Sessiz Rehber** | Uygulama sadece titreşir; ses yok. Yürürken telefonun ritmi anlatır. | Erişilebilirlik + "ekran bağımlılığı" eleştirisine cevap |
| **Tek Kare** | Her gün tek bir yerin tek karesi; rotası yok, sadece "oraya git" düğmesi. | Algoritmaya direnen, sakin bir format |
| **Rotanı miras bırak** | Bir rotayı "vefat" senaryosuyla değil, "ben gittim, sen de git" mührüyle bırakırsın. | Duygusal; ama etik çerçeve dikkat ister |
| **Sesli Mektup** | Varışta anlatımı sen kaydedersin, sonraki gezgin dinler. | İçerik üretimini kullanıcıya açar (moderasyon gerekir) |
| **Hava Mührü** | Rota yalnız yağmur/iyi hava koşulunda açılır ("bu durak bugün açılmıyor"). | Weather motorunu oyuna çevirir |

# Yer kaynakları

Bu dosya, `src/utils/placeAdvice.ts` içindeki "Gitmeden bil" metinlerinin
dayandığı kaynakları listeler. Kapsam, rehberdeki 28 yerin tamamıdır.

## Yöntem

- Her yer için önce Türkçe Vikipedi maddesi okundu. Türkçe madde yoksa ya da
  metinde geçen bilgiyi karşılamıyorsa İngilizce Vikipedi maddesi kullanıldı.
- Wikidata öğesi, maddenin kimliğini ve temel konum bilgisini doğrulamak için
  eşlendi.
- Metinler kaynaktan **kopyalanmadı**; okunan bilgiler kendi cümlelerimizle
  yeniden yazıldı.
- Doğrulanamayan bilgi yazılmadı. Ücret, açılış saati, sezon ve cankurtaran
  gibi değişken ya da kaynakta yer almayan alanlar koddaki `UNVERIFIED`
  işaretiyle, yani **"Doğrulanmadı."** olarak bırakıldı.
- Erişim tarihi: **22 Ekim 2026**.

## Lisans ve atıf

| Kaynak | Lisans | Bu dosyada |
| --- | --- | --- |
| Vikipedi maddeleri | CC BY-SA 4.0 | Her yer için madde adı ve tam URL |
| Wikidata öğeleri | CC0 | Her yer için Q kimliği ve tam URL; metin taşımaz, kimlik ve konum eşleştirmesi için kullanıldı |

Metinler özgün cümlelerle yazıldığı için Vikipedi'den uzun alıntı taşınmaz.
Yer detay panelindeki "Bu bir rehber özetidir" feragatnamesi korunur; kullanıcı
güncel saat, ücret ve erişim bilgisini resmî kaynaktan doğrulamaya yönlendirilir.

## Kapsam

Rehberdeki **28 yerin tamamı** aşağıdadır. `namedPlace` alias tablosunda daha
önce 19 yer vardı; eksik kalan 9 yer (`kaputas`, `gaziantep`, `kackar`,
`navagio`, `camino`, `aral`, `buyuk-han`, `salamis`, `positano`) aynı kuralla
eklendi. Yerler tek tip işlendi; hiçbir yer için ayrı bölüm ya da ayrı kural
yoktur.

| id | Yer | Vikipedi | Wikidata | Doğrulanan bilgiler |
| --- | --- | --- | --- | --- |
| `efes` | Efes Antik Kenti | [Efes](https://tr.wikipedia.org/wiki/Efes) · [Ephesus](https://en.wikipedia.org/wiki/Ephesus) | [Q47611](https://www.wikidata.org/wiki/Q47611) | Selçuk'un yaklaşık 3 km güneybatısında; MÖ 10. yüzyılda Attika ve İyonya kolonistlerince kurulmuş; 2015'te UNESCO Dünya Mirası |
| `kapadokya` | Kapadokya | [Kapadokya](https://tr.wikipedia.org/wiki/Kapadokya) · [Cappadocia](https://en.wikipedia.org/wiki/Cappadocia) | [Q217265](https://www.wikidata.org/wiki/Q217265) | Nevşehir, Kayseri, Aksaray, Kırşehir, Sivas ve Niğde illerine yayılan tarihî bölge; 1985'te UNESCO Dünya Mirası; balon uçuşlarının gün doğumunda yapılması |
| `pamukkale` | Pamukkale Travertenleri | [Pamukkale](https://tr.wikipedia.org/wiki/Pamukkale) · [Pamukkale](https://en.wikipedia.org/wiki/Pamukkale) | [Q105893254](https://www.wikidata.org/wiki/Q105893254) | Denizli'de; termal suyun bıraktığı karbonat mineralleriyle oluşan travertenler; Hierapolis ile birlikte 1988'de UNESCO Dünya Mirası |
| `kaputas` | Kaputaş Plajı | [Kaputaş Plajı](https://tr.wikipedia.org/wiki/Kaputa%C5%9F_Plaj%C4%B1) | [Q284093](https://www.wikidata.org/wiki/Q284093) | Kaş ile Kalkan arasındaki D400 karayolu üzerinde; kanyon ağzında; plaja 187 basamakla inilir |
| `galata` | Galata & Haliç | [Galata](https://tr.wikipedia.org/wiki/Galata) · [Galata Tower](https://en.wikipedia.org/wiki/Galata_Tower) | [Q501817](https://www.wikidata.org/wiki/Q501817) | Beyoğlu'nda, Haliç'in kuzey yakasında; Galata Kulesi 1348'de Cenevizlilerce inşa edilmiş |
| `gaziantep` | Gaziantep Çarşıları | [Gaziantep](https://tr.wikipedia.org/wiki/Gaziantep) · [Bakırcılar Çarşısı](https://tr.wikipedia.org/wiki/Bak%C4%B1rc%C4%B1lar_%C3%87ar%C5%9F%C4%B1s%C4%B1) | [Q93338](https://www.wikidata.org/wiki/Q93338) · [Q6007327](https://www.wikidata.org/wiki/Q6007327) | Gaziantep ilinin merkezi; Bakırcılar Çarşısı Şahinbey'de; bakır işçiliği kentte yaklaşık 400 yıllık el sanatı |
| `gobeklitepe` | Göbeklitepe | [Göbeklitepe](https://tr.wikipedia.org/wiki/G%C3%B6beklitepe) · [Göbekli Tepe](https://en.wikipedia.org/wiki/G%C3%B6bekli_Tepe) | [Q214944](https://www.wikidata.org/wiki/Q214944) | Şanlıurfa merkezinin 18 km kuzeydoğusunda, Örencik köyü yakınında; MÖ 9600-9500'e tarihlenen Neolitik alan; 2018'de UNESCO Dünya Mirası |
| `likya` | Likya Yolu · Faralya | [Likya Yolu](https://tr.wikipedia.org/wiki/Likya_Yolu) · [Lycian Way](https://en.wikipedia.org/wiki/Lycian_Way) | [Q1731039](https://www.wikidata.org/wiki/Q1731039) | Fethiye'den Antalya yönüne uzanan işaretli uzun yürüyüş rotası; antik Likya patikalarını izler; tamamı haftalar sürer |
| `kackar` | Kaçkar Dağları | [Kaçkar Dağları](https://tr.wikipedia.org/wiki/Ka%C3%A7kar_Da%C4%9Flar%C4%B1) | [Q975280](https://www.wikidata.org/wiki/Q975280) | Doğu Karadeniz'de dağ sırası; en yüksek nokta 3.932 m; millî park 1994'te kurulmuş; büyük bölümü Çamlıhemşin, küçük bölümü Yusufeli sınırlarında |
| `moda` | Moda Sahili | [Moda, Kadıköy](https://tr.wikipedia.org/wiki/Moda,_Kad%C4%B1k%C3%B6y) · [Moda, Kadıköy](https://en.wikipedia.org/wiki/Moda,_Kad%C4%B1k%C3%B6y) | [Q2700998](https://www.wikidata.org/wiki/Q2700998) | Kadıköy merkezi ile Kurbağalıdere arasındaki yarımadada; 1870'lerden sonra konaklarla gelişen yerleşim |
| `santorini` | Oia, Santorini | [Santorini](https://tr.wikipedia.org/wiki/Santorini) · [Santorini](https://en.wikipedia.org/wiki/Santorini) | [Q129296](https://www.wikidata.org/wiki/Q129296) | Ege'de volkanik adalar grubu; Santorini kalderasının oluşturduğu dairesel takımadanın en büyük adası; ana karadan yaklaşık 200 km güneydoğuda |
| `navagio` | Navagio Koyu | [Navagio Beach](https://en.wikipedia.org/wiki/Navagio_Beach) | [Q2460851](https://www.wikidata.org/wiki/Q2460851) | Zakynthos'un kuzeybatı kıyısında koy; 1980'de MV Panagiotis karaya oturmuş; 2018 ve 2022 kaya düşmelerinden sonra erişim kısıtlanmış |
| `napoli` | Napoli Sokakları | [Napoli](https://tr.wikipedia.org/wiki/Napoli) | [Q2634](https://www.wikidata.org/wiki/Q2634) | Campania bölgesinin başkenti; idari sınırlarında yaklaşık 908 bin nüfusla Güney İtalya'nın en büyük şehri |
| `venedik` | Venedik · Acqua Alta | [Venedik](https://tr.wikipedia.org/wiki/Venedik) · [Acqua alta](https://en.wikipedia.org/wiki/Acqua_alta) | [Q641](https://www.wikidata.org/wiki/Q641) | Kuzeydoğu İtalya'da lagün üzerinde 126 adaya yayılan şehir; 472 köprü; acqua alta lagünde kısmi su baskınına yol açar |
| `camino` | Camino de Santiago | [Camino de Santiago](https://tr.wikipedia.org/wiki/Camino_de_Santiago) | [Q41150](https://www.wikidata.org/wiki/Q41150) | Galiçya'daki Santiago de Compostela Katedrali'ne yönelen hac yolları ağı; 1993'te UNESCO Dünya Mirası |
| `skogafoss` | Skógafoss | [Skógafoss](https://en.wikipedia.org/wiki/Sk%C3%B3gafoss) | [Q1130718](https://www.wikidata.org/wiki/Q1130718) | Güney İzlanda'da Skógá nehri üzerinde; 60 m yüksekliğinde ve 25 m genişliğinde; eski deniz kıyısı falezinden düşer |
| `lofoten` | Lofoten Adaları | [Lofoten](https://tr.wikipedia.org/wiki/Lofoten) · [Lofoten](https://en.wikipedia.org/wiki/Lofoten) | [Q186822](https://www.wikidata.org/wiki/Q186822) | Nordland ilçesinde takımada; kasabaları Svolvær ve Leknes; kışın kutup gecesi ve kuzey ışıkları |
| `machu` | Machu Picchu | [Machu Picchu](https://tr.wikipedia.org/wiki/Machu_Picchu) | [Q676203](https://www.wikidata.org/wiki/Q676203) | Cusco bölgesinde İnka antik şehri; 2007'de Dünyanın Yeni Yedi Harikası'ndan biri seçildi |
| `kyoto` | Fushimi Inari | [Fushimi Inari-taisha](https://en.wikipedia.org/wiki/Fushimi_Inari-taisha) | [Q714828](https://www.wikidata.org/wiki/Q714828) | Inari kami'sinin baş tapınağı; dağa çıkan patika 4 km ve yaklaşık 2 saat; 24 saat açık; giriş ücretsiz |
| `aral` | Moynaq Gemi Mezarlığı | [Moynak](https://tr.wikipedia.org/wiki/Moynak) · [Moynaq](https://en.wikipedia.org/wiki/Moynaq) | [Q750989](https://www.wikidata.org/wiki/Q750989) | Karakalpakistan'ın kuzeyinde; eski Aral Gölü limanı; gölün çekilmesiyle sudan yaklaşık 150 km uzakta; Aralkum çölü |
| `girne` | Girne Limanı ve Kalesi | [Girne](https://tr.wikipedia.org/wiki/Girne) · [Girne Kalesi](https://tr.wikipedia.org/wiki/Girne_Kalesi) | [Q206760](https://www.wikidata.org/wiki/Q206760) | Kıbrıs'ın kuzey kıyısında liman kenti; kale 7. yüzyılda Bizanslılarca Arap akınlarına karşı yapılmış |
| `buyuk-han` | Büyük Han | [Büyük Han](https://tr.wikipedia.org/wiki/B%C3%BCy%C3%BCk_Han) · [Büyük Han](https://en.wikipedia.org/wiki/B%C3%BCy%C3%BCk_Han) | [Q2332172](https://www.wikidata.org/wiki/Q2332172) | Lefkoşa'nın kuzey kesiminde; 1572'de Osmanlılarca yaptırılan han; Kıbrıs'ın en büyük kervansarayı; günümüzde kültür merkezi |
| `salamis` | Salamis Antik Kenti | [Salamis, Cyprus](https://en.wikipedia.org/wiki/Salamis,_Cyprus) | [Q767089](https://www.wikidata.org/wiki/Q767089) | Gazimağusa'nın yaklaşık 6 km kuzeyinde, Pedieos nehrinin ağzında kurulmuş antik Grek kent devleti |
| `karpaz` | Karpaz Altınkum | [Karpaz Yarımadası](https://tr.wikipedia.org/wiki/Karpaz_Yar%C4%B1madas%C4%B1) · [Golden Beach, Cyprus](https://en.wikipedia.org/wiki/Golden_Beach,_Cyprus) | [Q1418724](https://www.wikidata.org/wiki/Q1418724) · [Q106241437](https://www.wikidata.org/wiki/Q106241437) | Kıbrıs'ın kuzeydoğu ucuna uzanan yarımada; Altınkum geniş kumlu plaj; deniz kaplumbağaları için yuvalama alanı; kumsalda kamp yasak |
| `petra` | Petra · El-Hazine | [Petra](https://tr.wikipedia.org/wiki/Petra) · [Petra](https://en.wikipedia.org/wiki/Petra) | [Q5788](https://www.wikidata.org/wiki/Q5788) | Ürdün'ün güneyinde kayaya oyulmuş antik şehir; Siq kanyonundan yürüyerek girilir; UNESCO Dünya Mirası |
| `chefchaouen` | Chefchaouen | [Şafşavan](https://tr.wikipedia.org/wiki/%C5%9Eaf%C5%9Favan) | [Q676778](https://www.wikidata.org/wiki/Q676778) | Fas'ın kuzeybatısında küçük şehir; mavi boyalı evleri ve sokaklarıyla tanınır |
| `banff` | Moraine Gölü | [Moraine Lake](https://en.wikipedia.org/wiki/Moraine_Lake) | [Q1072342](https://www.wikidata.org/wiki/Q1072342) | Banff Millî Parkı'nda, Lake Louise'in 14 km dışında; On Zirve Vadisi'nde; yaklaşık 1.884 m yükseltide; 50 hektar yüzey |
| `positano` | Positano | [Positano](https://tr.wikipedia.org/wiki/Positano) | [Q81345](https://www.wikidata.org/wiki/Q81345) | Amalfi Kıyısı'nda, Salerno iline bağlı komün; Sirenuse Adaları'na bakan dik yamaçlara yayılmış |

## Doğrulanmayan alanlar

Aşağıdaki başlıklar kaynaklarda güncel ve güvenilir biçimde yer almadığı için
metne yazılmadı; ilgili alanlar "Doğrulanmadı." olarak bırakıldı:

- Giriş ücretleri ve bilet türleri (Kyoto'daki ücretsiz giriş hariç; o bilgi
  İngilizce Vikipedi maddesinde açıkça yazıyor).
- Açılış/kapanış saatleri ve sezon takvimi.
- Bazı yerlerde cankurtaran, akıntı ve yüzme güvenliği bilgisi.
- Toplu taşıma sefer saatleri ve rezervasyon koşulları.

## Kilit testleri

- `src/utils/placeAdvice.test.ts`: her rehber yerinin dört alanı dolu mu, her
  alan ya doğrulanmış metin ya tam olarak "Doğrulanmadı." mı, kaynaklar
  Vikipedi + Wikidata mı ve bu dosyadaki URL'lerle birebir eşleşiyor mu?
- `src/data/places.test.ts`: rehber kartlarının kimlik listesi ve zorunlu
  alanları kilitli mi; bir kart sessizce silinmiş ya da kimliği değişmiş olabilir mi?

Bu dosyadaki bir URL değişirse testler kırılır; kaynak güncellemesi kod ve
doküman birlikte değiştirilerek yapılır.

# Genel dinleme metinleri — kaynak ve doğrulama notu

**Tarih:** 2026-11-10 · **Kapsam:** `public/audio/listen/place-listen.json`
içindeki 28 yer, Türkçe + İngilizce.

Bu metinler **tanıtım amaçlı genel bakış**tır: yeri bir bütün olarak anlatır,
durak durak gezinmez ve ölçüm/uzman teyidi iddiası taşımaz. Sayısal ayrıntı
verilmesi gerekmeyen yerlerde yuvarlak ifade seçildi; yanlış olma riski
taşıyan ayrıntılar metne alınmadı.

## Doğrulama düzeyleri

| Düzey | Anlamı | Kaç yer |
| --- | --- | --- |
| **D1 — bu turda kaynakla kontrol edildi** | Metindeki sayısal/tarihsel iddia açık kaynakla karşılaştırıldı | 4 |
| **D2 — yerleşik ansiklopedik bilgi** | UNESCO listesi, müze/koruma kurumu ve genel başvuru eserlerinde aynı biçimde geçen bilgi | 24 |
| **Saha teyidi** | **Yok.** Hiçbir yer bu metin için yerinde görülmedi | 0 |

D1 kapsamı: **Kaçkar** (en yüksek nokta ≈3 937 m), **Göbeklitepe**
(≈ MÖ 9600–8200; "on bir bin yıl" ifadesi bununla uyumlu), **Büyük Han**
(1572, Koza Han örnekliği, ~68 oda, İngiliz döneminde hapishane, 1990'larda
restorasyon), **Navagio** (MV Panagiotis, 1980'de karaya oturdu, ~200 m
kayalıklar).

## Bilerek metne alınmayan ayrıntılar

Bunlar doğru olabilecek ama kaynaktan kaynağa değişen, ya da sahada
doğrulanmadan yazılması riskli sayılan bilgiler:

| Yer | Alınmayan | Metinde tercih edilen |
| --- | --- | --- |
| Kaputaş | Merdiven sayısı | "yüzlerce basamak" |
| Skógafoss | Merdiven basamak sayısı, gökkuşağı sayısı | "merdivenler", "sürekli bir gökkuşağı" |
| Galata | Kule yüksekliği ve kat sayısı | "silueti aynı kaldı" |
| Camino | Yıllık hacı sayısı, rota uzunluğu | "bin kilometre de… son yüz kilometre de" |
| Lofoten | Gece güneşi tarihleri, enlem derecesi | "kutup dairesinin kuzeyinde" |
| Göbeklitepe | Kazı sayısı, taş ağırlığı, tapınak sayısı | "yaklaşık on bir bin yıl önce" |
| Santorini | Patlama tarihi (MÖ 1600 civarı tartışmalı) | "yaklaşık üç bin altı yüz yıl önce" |
| Machu Picchu | Günlük ziyaretçi kotası | "biletle sınırlı" |
| Pamukkale | Traverten sayısı, su debisi | "yaklaşık otuz beş derece" |
| Venedik | Acqua alta yükseklikleri, MOSE maliyeti | "2020'den beri çalışıyor" |
| Napoli | Pizzacı adı, fırın sıcaklığı | "Margherita söylencesi 1889'a uzanır" |
| Aral | Gölün eski alanı, tuzluluk | "yüz kilometreden fazla uzaklaştı" |
| Karpaz | Kaplumbağa yuva sayısı | "yuvalar işaretli ve korunuyor" |
| Petra | Hazine'nin işlevi tartışması | "bir kral mezarı" (yaygın kabul) |

## Dil ve ton

- Efes turuyla aynı anlatıcı tonu: sakin, müze rehberi; reklam dili yok.
- Uzunluk: TR 513–606 karakter (ort. 562), EN 540–655 (ort. 594) → kayıtta
  yaklaşık 35–45 saniye.
- İngilizce metinlerde özel adlar Türkçe yazımını korur (Kaputaş, Kaçkar,
  Göreme); telaffuz kuralı kayıt paketinde: `kayit-paketi/genel-dinleme/PROMPT.md`.

## Bakım

- Metin değişikliği **yalnız** JSON'da yapılır; ardından
  `npm run content:listen-paket` ile CSV ve .txt dosyaları yenilenir.
- `src/data/placeListen.test.ts` şunları kilitler: 28 yerin tamamı, başlık
  eşleşmesi, ses yolu kuralı, uzunluk aralığı, dil karışması, klasördeki her
  MP3'ün bir kayda bağlı olması.

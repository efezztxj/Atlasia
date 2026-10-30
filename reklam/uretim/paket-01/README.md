# Paket-01 — Instagram + TikTok yayın paketi (1–10 Kasım)

Fikir kaynağı: [`../../insta-tiktok-fikirler.md`](../../insta-tiktok-fikirler.md) ·
Genel bakış ve kopyala butonları: [`pano.html`](pano.html)

## Drive kopyası

Atlasia reklam ana klasörünün içinde (bağlantısı olan herkes görüntüleyebilir):

- 📁 Paket klasörü: <https://drive.google.com/drive/folders/1XZCelMRZge9fLzhn9JwJ13qTd562ZAef>
- 📦 Tek dosya (ZIP, 5,8 MB): <https://drive.google.com/file/d/1fWQewQe3QkC6T4nhQU5f-labRMX8muW8/view>
- 🎨 Görseller klasörü: <https://drive.google.com/drive/folders/1ylE6nOxwBik4JE7AAlEFEmtHPVNtNsNw>
- ✍️ Açıklamalar: <https://drive.google.com/file/d/1MNk1JLfTh6WVfKSkIyzW-iy9kTaTBn3p/view> · Senaryolar: <https://drive.google.com/file/d/1IgjE9hWXUbiIDroBCGglyXk3IYY6BbeA/view>

## İçindekiler

| Dosya | Ne |
|---|---|
| `pano.html` | Tüm görseller + açıklamalar + kopyala butonları (tarayıcıda aç) |
| `captions.md` | 10 içeriğin IG + TikTok açıklaması, hashtag, sabit yorum, story metni, UTM linkleri |
| `senaryolar.md` | 8 videonun saniye saniye çekim senaryosu + seslendirme metinleri |
| `gorseller/` | 8 kapak (1080×1920) + Pamukkale carousel (7) + Efes carousel (5) = 20 JPG |
| `kaynak/` | Arka planlar + videolardan çıkarılan kareler (not: karelerde eski videoların yazısı yanık; arka plan olarak kullanılmadı) |
| `render.py` | Görselleri basar: `python3 reklam/uretim/paket-01/render.py` (pillow) |
| `uret.py` | `captions.md` + `pano.html` üretir: `python3 reklam/uretim/paket-01/uret.py` |

## Takvim (IG 19.00 · TikTok 20.00)

| Gün | İçerik | Tür |
|---|---|---|
| 1 Kas Pazar | T1 Uydudan Düş — kyoto | Video |
| 2 Kas Pzt | I1 Gitmeden Önce Bil — Pamukkale | Carousel |
| 3 Kas Salı | D1 İndirmeden Aç | Video |
| 4 Kas Çar | D2 Göreme'de 1 Günde Ne Yapılır? | Video |
| 5 Kas Per | I2 Aynı Şehir, 3 Zaman — Efes | Carousel |
| 6 Kas Cuma | T2 Nereye Gidelim Kavgası | Video |
| 7 Kas Cmt | U1 1 İz Bırak meydan okuması | Video + UGC |
| 8 Kas Pazar | T3 Evinden 15 Dakika — Galata | Video |
| 9 Kas Pzt | I3 Altın Saate Yetiş — Pamukkale | Video |
| 10 Kas Salı | U2 24 Saat İzi — Venedik | Video + Story |

Mevcut Instagram kuyruğu (`social/queue/`) 31 Ekim'de bitiyor — çakışma yok.

## Dürüstlük notları

- Efes tur saatleri/mesafesi gerçek veridir (`src/data/siteTours.ts`). Pamukkale ipuçları rehber notlarından (`src/data/places.ts`) alındı.
- "47 dakika" (I3) temsilîdir; çekim günü gerçek kalan süreyle değiştir.
- Kapak arka planlarından Efes/Galata/kyoto/Göreme/Pamukkale/Venedik AI ile üretildi (gerçek yerlerin temsili fotoğrafı); D1'deki küre ürünün kendi görseli (`public/images/atlasia-earth-hero.jpg`). Saha çekimi yaptıkça AI arka planları gerçek karelerle değiştir.
- Sayılar (28 nokta · 4 sesli tur · ücretsiz/reklam yok) ürün gerçeği; katalog büyürse metinleri güncelle.
- Font: ortamda Bricolage yok, DejaVu Sans Bold kullanıldı (mevcut filmlerle aynı durum). Marka fontuyla yeniden basmak için `render.py` içindeki `FB/FR` yollarını değiştirip scripti tekrar çalıştır.

## Ölçüm (10 gün sonunda bakılacaklar)

1. 3 sn izlenme oranı (kanca) — hedef > %55 · 2. Kaydetme/gösterim (carousel) — hedef > %2 ·
3. Yorum/video (T1, U1) · 4. UTM'li açılışlar (`utm_campaign` kırılımı) · 5. U1 ile bırakılan yeni iz sayısı.
Kazanan format 2. paketin omurgası olur; kaybedeni değil, kancasını değiştirip tekrar dene.

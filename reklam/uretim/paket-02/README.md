# Paket-02 · Orada Değil, Burada

"Yurt dışına özlem, evini tanımıyor" içgörüsünden 4 bölümlük profesyonel video serisi.
Hepsi seslendirmeli, sessizlik-senkron kesimli, yumuşak geçişli, gömülü altyazılı ve
yayın standardında (-16 LUFS) seslendirilmiştir. Müzik bilerek yok: platforma
yüklerken uygulama kütüphanesinden kısık ekle, seslendirme baskın kalsın.

## Nasıl kullanılır

1. `pano.html`'i tarayıcıda aç, videoyu izle, açıklamayı kopyala-yapıştır.
2. `captions.md` aynısının düz metin hâli.
3. IG'de kapak seçiminde `gorseller/kapak-*.jpg` kullan.
4. IG 19.00, TikTok 20.00. Yayın sırası aşağıda.

## Seri

| Gün | Video | Eşleştirme |
|---|---|---|
| 11 Kas Çarşamba | `videolar/video-s1-bademli.mp4` | Maldivler → Bademli (Dikili, İzmir) |
| 12 Kas Perşembe | `videolar/video-s2-salda.mp4` | NASA / Mars → Salda Gölü (Burdur) |
| 13 Kas Cuma | `videolar/video-s3-termessos.mp4` | Machu Picchu → Termessos (Antalya) |
| 14 Kas Cumartesi | `videolar/video-s4-kuyucak.mp4` | Provence → Kuyucak (Isparta) |

## Google Drive (telefondan indir, paylaş)

- Paket klasörü: https://drive.google.com/drive/folders/1sL5eQvXe6Rnuej-QH2yFt8ZgBdOTbpOi
- Videolar: https://drive.google.com/drive/folders/1bKbuEaP2C0Iie2epsxnV2iiQBEDQV7cP
- Kapaklar: https://drive.google.com/drive/folders/1piZIqXcEaq4wsM0YirwWVdli_qIsQIWc

Bağlantıyla erişilebilir (yalnız görüntüleme). ZIP de paket klasöründe.

## Üretim notları

- Hat: `video_uret2.py` (ffmpeg xfade + ayrık tipografi katmanları + loudnorm) ve `uret2.py` (metinler).
- Fonda kullanılan görseller AI stoktur; ayırt edilir doğa/tarih sahneleri, saha çekimi değildir — yakında
  gerçek çekimle kolayca değiştirilebilir (dosya adını koru, script'i tekrar çalıştır).
- MP4'ler git'e girmez (bkz. kök `.gitignore`); kanonik kopya bu klasör + Drive.

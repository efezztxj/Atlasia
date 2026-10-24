# Atlasia pazarlama — Google Drive indirme bağlantıları

**Tarih:** 2026-10-24 · **Kural:** bundan sonra üretilen her kreatif/teslim, bu klasöre yüklenir ve
indirme bağlantısı paylaşılır. Depo (git) kaynak metin ve betikleri tutar; ağır medya Drive'da durur.

## Klasör

**Atlasia — Pazarlama Kreatifleri (2026-10-24)**
https://drive.google.com/drive/folders/1okD0GIfUpdS7aDfZ68srvv7j1-jw7N6q

## Videolar (9:16, sesli)

| Dosya | Süre | İndir |
| --- | --- | --- |
| `sesli-bolum-01.mp4` — Dünyayı bir kedi döndürüyor | 12,9 sn | https://drive.google.com/uc?export=download&id=1JhoxQ_slOiUa0OHEf3o2LryBeBQhhkwp |
| `sesli-bolum-02.mp4` — Pati haritaya bastı | 12,5 sn | https://drive.google.com/uc?export=download&id=1qQdW80mVOs-oJTc8wFU0_C2LcZ8sV7cA |
| `sesli-kor-rota.mp4` — **Kör Rota** (özel fikir) | 12,7 sn | https://drive.google.com/uc?export=download&id=157SnnMNvVSeThY9qIxjJt0Yso32o4UgO |

## Paketler

| Dosya | İçerik | İndir |
| --- | --- | --- |
| `atlasia-pazarlama-2026-10-24.zip` | 49 dosya: tüm kreatifler + kampanya metinleri + üretici betikler | https://drive.google.com/uc?export=download&id=18ur7Y270x-3LH7U_0CtmEdevuDC14vKg |
| `atlasia-carousel-ai-yapti.zip` | "Bu reklamı AI yaptı" 10 kare × 2 ölçü (ig 1080×1350, tt 1080×1920) | https://drive.google.com/uc?export=download&id=1j4QXR6pJskTdWbsWwcLrWtROz7SCRwbe |
| `atlasia-kor-rota.zip` | **Kör Rota**: 2 ana kare + video + ürün mekaniği dokümanı | https://drive.google.com/uc?export=download&id=1RTsHNIA-zLledX5VsBpx47nye5m3oFSv |

## Ana kareler (AI ile üretilmiş, 9:16)

| Dosya | İndir |
| --- | --- |
| `ana-kare-01-kedi-kure.jpg` | https://drive.google.com/uc?export=download&id=1UvkEpCcLxIAg-iNi768Mjb5KkRGL1BNB |
| `ana-kare-02-pati-kure.jpg` | https://drive.google.com/uc?export=download&id=1s1S_NqA4VF4Dy4Gv5AiXonTZs9jdlKuS |
| `ana-kare-03-kedi-harita.jpg` | https://drive.google.com/uc?export=download&id=1UI2SgysFAJuT5ULm5WAcQK0TncL-yI3V |
| `ana-kare-04-pati-efes.jpg` | https://drive.google.com/uc?export=download&id=1DYLbvAdFRxd9x6FjLIYDYdXYgHBWeYOm |
| `ana-kare-05-kedi-bakiyor.jpg` | https://drive.google.com/uc?export=download&id=1occHQclqgmAJJLn7q5l-CTWZ9OLdqwQS |
| `kor-rota-01-kapali-zarf.jpg` | https://drive.google.com/uc?export=download&id=13x-NMHq5UWSG3Ss1htDZiXc4KJmw4VK5 |
| `kor-rota-02-yol-gizem.jpg` | https://drive.google.com/uc?export=download&id=13Idjmaui5H7ctUH_f7-N4SuonAyxyjcX |

## Posterler (1080×1350)

| Dosya | İndir |
| --- | --- |
| `poster-02-aya-rota.jpg` | https://drive.google.com/uc?export=download&id=1umcTUTv9mfUAubGgULVpJ0OjeQyXCIJ9 |
| `poster-50-anneme-kullandirttim.jpg` | https://drive.google.com/uc?export=download&id=1X7rpVOQZwKtr0M2rYCyQY7BO9tMLbBFX |
| `poster-33-uzaklastir-yaklastir.jpg` | https://drive.google.com/uc?export=download&id=1qAOcNHJk9vBnXXWeKNdJkRKtl0Un7zZO |

## Metinler

| Dosya | İndir |
| --- | --- |
| `01-fikir-bankasi-50-fikir.md` | https://drive.google.com/uc?export=download&id=10nOMqh1ZyBpXYzuhFmk2NhtVAtC3dalH |
| `02-kampanya-ai-yapti.md` | https://drive.google.com/uc?export=download&id=1Xyge74-HBAUwxzL9R-R51LoFbkbv8BKg |
| `03-video-kedi-senaryo.md` | https://drive.google.com/uc?export=download&id=1SrrgvQufG4i_dyFdcOL0LUeW3qSU3QET |
| `04-reklam-plani.md` | https://drive.google.com/uc?export=download&id=1e4CKb8r-Ulcf6kQwWs0uM77BnOUsvcCq |

## Paylaşım durumu

Tüm dosyalar **bağlantıya sahip herkes (görüntüleme/indirme)** olarak açıldı; arama dizininde görünmüyor.
Kişisel veri yok, yalnız pazarlama materyali var.

## Yeniden üretmek için

```bash
npm ci                                              # bağımlılıklar (depo)
pip install --break-system-packages --target ~/.pylibs pillow imageio-ffmpeg
PYTHONPATH=~/.pylibs python3 scripts/pazarlama/kedi-video.py --bolum 01 --ses
PYTHONPATH=~/.pylibs python3 scripts/pazarlama/kedi-video.py --bolum 02 --ses
PYTHONPATH=~/.pylibs python3 scripts/pazarlama/kedi-video.py --bolum 02 --ses   # tekrar
python3 scripts/pazarlama/ai-yapti-kreatif.py       # carousel kareleri
python3 scripts/pazarlama/poster-set.py             # posterler
```

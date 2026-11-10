# Atlasia — kapasite modeli (F6-2)

**Durum:** model yazıldı · girdiler **kod sabitlerinden** okundu, oturum tahminleri **varsayım** (etiketli)
**Tarih:** 2026-11-01 · **Plan:** (bu depoda değil; ilgili PR #167 kapatıldı) §F6-2

Bu belge "kaç kullanıcı taşır?" sorusunu **formülle** yanıtlar. Ücretli plana geçmeden
önce hangi limitin önce dolduğunu gösterir. Ölçülmemiş her sayı **varsayım** olarak
işaretlendi; ölçüm geldikçe aynı satır güncellenir, model değişmez.

## 1. Kod sabitleri (tek kaynak: `src/config/firestoreLimits.ts`)

| Sabit | Değer | Nerede kullanılıyor |
| --- | --- | --- |
| `placeOverview` | 40 | Dünya görünümü canlı aboneliği (`subscribePlaceOverview`) |
| `placeViewportPage` | 50 | Yakınlaşınca görüntü alanı sorgusu |
| `ownedPlacesPage` | 50 | Kullanıcının kendi pinleri |
| `postsPage` | 50 | Akış (ilk sayfa) + cursor'lı sayfalama |
| `storiesPage` | 50 | Hikâyeler (24 saat TTL) |
| `postRepliesPage` | 100 | Yanıt sayfası |
| `likesPerPost` | **500** | *Bugün*: beğenenler `likedBy` **dizisi** olarak gönderi dokümanında |

## 2. Spark (ücretsiz) limitleri

| Kaynak | Günlük/aylık limit |
| --- | --- |
| Doküman okuma | 50.000 / gün |
| Doküman yazma | 20.000 / gün |
| Doküman silme | 20.000 / gün |
| Ağ çıkışı (egress) | 10 GiB / ay |
| Depolama | 1 GiB |

## 3. Bir oturumun maliyeti

**Okuma** (her `onSnapshot` ilk anlık görüntüsü = sorgudaki doküman sayısı; sonraki
değişiklikler yalnız değişen dokümanı faturalar):

| Eylem | Okuma |
| --- | --- |
| Haritayı aç | 40 (overview) + 50 (kendi pinler) = **90** |
| Haritada yakınlaş | +50 (görüntü alanı) = **50** |
| Akışı aç | 50 (gönderi) + 50 (hikâye) = **100** |
| Bildirim/grup panelleri | açılmadıkça **0** (abonelik yalnız panel açıkken) |

**Yazma:**

| Eylem | Bugün | F2-1 sonrası |
| --- | --- | --- |
| Beğeni | 1 (gönderi dokümanı `likedBy`) | 2 (beğeni belgesi + `likeCount` sayacı) |
| Gönderi paylaş | 1 | 1 |
| Yer ekle | 1 | 1 |

**Bayt (varsayım — gönderi metni ort. 180 B, üst veri ≈ 170 B ⇒ ≈ 350 B/gönderi):**

| Durum | Gönderi dokümanı | 50 gönderilik akış |
| --- | --- | --- |
| Bugün, `likedBy` **500** uid (uid ≈ 28 B ⇒ 14.000 B) | ≈ 14,4 KB | ≈ **720 KB** |
| Bugün, `likedBy` ortalama 20 uid | ≈ 0,9 KB | ≈ 45 KB |
| F2-1 sonrası (`likeCount` sayı) | ≈ 0,4 KB | ≈ **20 KB** |

## 4. Oturum modeli (varsayım)

Bir aktif kullanıcı/gün: harita 3 kez, akış 2 kez, 5 beğeni, 0,2 gönderi.

```
okuma/DAU  = 3×90 + 2×(100) + (yakınlaşma 1×50)  =  270 + 200 + 50 = 520
yazma/DAU  = 5 beğeni + 0,2 gönderi               =  5,2        (F2-1: 10,2)
egress/DAU = 2 akış açılışı × akış boyutu + harita ~250 KB
```

## 5. Kapasite tabloları

### Bugün (popüler bir gönderide `likedBy` 500'e dayanmışsa)

```
egress/DAU = 2×0,72 MB + 0,25 MB = 1,69 MB
10 GiB/ay = 10.485 MB      → 10.485 / 1,69 ≈ 6.200 oturum/ay ≈ 207/gün
                           → 3 oturum/DAU ⇒  ≈ 69 DAU
okuma      = 50.000 / 520  ≈  96 DAU
yazma      = 20.000 / 5,2  ≈ 3.846 DAU
```

**Bugünkü darboğaz: ağ çıkışı (≈ 69 DAU).** Okuma ikinci (≈ 96 DAU), yazma rahat.

### F2-1 sonrası (beğeni alt koleksiyonu)

```
egress/DAU = 2×0,02 MB + 0,25 MB = 0,29 MB
10.485 / 0,29 ≈ 36.000 oturum/ay ≈ 1.200/gün ⇒ ≈ 400 DAU
okuma      = 96 DAU        ← darboğaz buraya kayar
yazma      = 20.000 / 10,2 ≈ 1.960 DAU
```

**F2-1 sonrası darboğaz: doküman okuma (≈ 96 DAU).** Yani beğeni alt koleksiyonu
tek başına ~5,8× kapasite demek; sonrasında sıradaki iş **okuma** tarafıdır
(görüntü alanı sorgusunu seyreltmek, `ownedPlacesPage` yerine tek abonelik).

### F2-2 sonrası (fotoğraf ayrı dokümanda)

Fotoğraf bugün gönderi dokümanının içinde base64/uzun URL olarak taşınmıyorsa kazanç
**okumada** değil **egress'te** görünür; foto yalnız görünürken okunursa akış açılışı
neredeyse sabit kalır. Bu satır **ölçülmedi** — `docs/baseline.md` ölçümü ve F2-2
sonrası aynı senaryonun tekrarı ile doldurulacak.

## 6. Ne zaman ücretli plan?

| Eşik | Tetikleyici |
| --- | --- |
| **≈ 70–90 DAU** | Egress/okuma limitine yaklaşma; önce F2-1 (≈ 5,8× kazanç) |
| **≈ 100 DAU** | Blaze'e geçiş ya da okuma seyreltme (F2-1 sonrası plan) |
| **≈ 1.900 DAU** | Yazma limiti (F2-1 yazmayı 2×'ler; bu yüzden gözlenmeli) |

## 7. İzlenmesi gerekenler (operatör)

1. Firebase Console → Firestore → Usage: **okuma/gün** ve **egress/ay** serisi.
2. `docs/DURUM.md` bayat sayı taşımaz; bu belgedeki varsayımlar ölçümle değişince
   aynı PR'da güncellenir.
3. Bir gönderide `likedBy` uzunluğu 100'ü geçiyorsa F2-1 öncelik kazanır:
   her akış okuması o dokümanı olduğu gibi taşır.

## 8. Sınırlar (dürüst notlar)

- Oturum başına eylem sayısı **ölçülmedi**; `docs/baseline.md` gerçek trafiği değil,
  paket/performans ölçümünü içerir. Üretim telemetrisi (F0-3, D7) açılınca bu model
  gerçek sayılarla yeniden hesaplanmalı.
- Fiyat/limit rakamları 2026-11-01 itibarıyla Firebase Spark belgelerinden alınmış
  varsayımlardır; plana geçmeden önce Console'da doğrulanmalı.
- `onSnapshot` faturalaması değişen doküman başınadır; canlı bir haritada uzun süre
  açık kalan sekme, ilk açılıştan daha pahalı olabilir — bu etki modele **dahil değil**
  (ölçülmedi).

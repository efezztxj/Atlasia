# Atlasia — Veri Saklama Politikası ve Fiziksel Temizlik Rutini (Madde 4)

Spark ($0) planında toplam Firestore depolama tavanı **`1 GiB`**, günlük ücretsiz silme tavanı **`20.000 belge/gün`** ve günlük okuma tavanı **`50.000 belge/gün`** ile sınırlıdır.

`firestore.rules` içinde güvenlik gereği kullanıcılar başkalarının süresi dolmuş belgelerini silemez (ve kurallar bu yüzden **asla gevşetilmez**). Bunun yerine `scripts/firestore-cleanup.mjs`, yetkili operatör belirteciyle süresi dolmuş geçici belgeleri güvenli kotalar dahilinde fiziksel olarak temizler.

---

## 1. Saklama Süreleri Tablosu

| Koleksiyon | Saklama Eşiği | Neden Silinir? |
| --- | --- | --- |
| `stories/{storyId}` | **`48 saat`** *(24s canlı pencere + 24s güvenlik payı; minimum kilit `25s`)* | Hikâyeler 24 saat sonra kural gereği zaten kapanır; içindeki fotoğraf (`data:` URL) en büyük depolama tüketicisidir. |
| `friendDeclines/{fid}` | **`7 gün`** | Yalnız ret bildirimi anındaki atomik kanıt (`friendDeclineProof`) için yazılır; sonrasında ürün değeri yoktur. |
| `groups/{id}/joinAttempts/{uid}` | **`24 saat`** | Kuraldaki katılma hız sınırı penceresi 15 dakikadır; 24 saatten eski sayaçlar işlevsizdir. |
| `groups/{id}/invites/*` ve `users/{uid}/groupInvites/*` | **`30 gün`** *(+ `--include-orphans` ile silinmiş gruplar)* | Yanıtlanmamış eski grup davetleri ve silinmiş grupların davet aynaları. |
| `users/{uid}/notifications/*` | Okunmuş: **`30 gün`** · Okunmamış: **`90 gün`** | Arayüz yalnız en yeni 50 bildirimi listeler; eski bildirimler birikir. |
| `feedback/{id}` | **`180 gün`** *(yedek alındıktan sonra)* | İncelenip yedeklenmiş eski hata/öneri kayıtları. |
| Yetim kayıtlar (`--include-orphans`) | Silinmiş `posts/{id}` altındaki `replies` ve silinmiş `/groups/{id}` için kalan `users/{uid}/groups/{id}` indeksleri | Ebeveyn belge silindiğinde alt koleksiyonlarda kalan erişilemez belgeler. |

> **Korunan Koleksiyonlar (Asla Silinmez):** `places`, `posts`, `routes`, `tracks`, `userProfiles`, `friendships`, `moderators`, `bans`, `reports`, `verifications`, `blocks`.

---

## 2. Güvenli Çalıştırma Sırası (Her Zaman 3 Adım)

### Adım 1 — Önce Yedek Al ve Doğrula
```bash
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
  node scripts/firestore-backup.mjs --project <uretim-proje-id>
```

### Adım 2 — Önizleme (`--dry-run` varsayılandır, hiçbir şey silmez)
```bash
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
  node scripts/firestore-cleanup.mjs --project <uretim-proje-id> --include-orphans
```

### Adım 3 — Fiziksel Silmeyi Uygula (`--apply`)
Önizleme sayıları beklenen aralıktaysa:
```bash
FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
  node scripts/firestore-cleanup.mjs --project <uretim-proje-id> --include-orphans --apply
```
*(Varsayılan olarak tek çalışmada en fazla `--max-reads 5000` ve `--max-deletes 2000` harcar; Spark günlük kotasının `%10`’unu aşmaz.)*

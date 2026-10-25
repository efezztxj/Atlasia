# Moderasyon akışı — nasıl çalışıyor, nerede duruyor

Son güncelleme: 2026-10-25 · İlgili kod: `src/lib/moderation.ts`, `src/components/ReportsPanel.tsx`, `src/components/SuspensionNotice.tsx`, `firestore.rules`

Bu belge **yaptırımın sunucuda** olduğunu varsayar: istemci (tarayıcı) atlatılsa bile
kural aynı sonucu verir. Arayüz yalnızca kolaylık katmanıdır.

## 1. Roller

| Rol | Nasıl tanımlanır | Ne yapabilir |
| --- | --- | --- |
| Kullanıcı | e-posta/cihaz hesabı | Rapor verir, kendi raporlarının durumunu görür, kendi raporunu siler |
| Moderatör | Firebase Console'da `moderators/{uid}` belgesi | Kuyruğu okur, durum/not yazar, raporlanan içeriğin sahibini askıya alır, askıyı kaldırır |
| Geliştirici | Console erişimi | Kural dağıtımı, indeks, moderatör ekleme/çıkarma |

`moderators/{uid}` istemciden **yazılamaz** (`create/update/delete: false`), yalnız kendi
kaydını okuyabilirsin. Yani uygulamadan kimse kendini moderatör yapamaz.

## 2. Akış (uçtan uca)

```
Kullanıcı raporlar            →  reports/{id}  (status yok = "İnceleniyor")
Moderatör kuyruğu açar        →  en yeni 50 rapor
Moderatör "İncelendi" der     →  status=reviewed + reviewedAt + reviewerUid
Moderatör "İşlem yapıldı" der →  status=actioned + not (≤500)
   ↓ yalnız bu noktadan sonra
Moderatör "Hesabı askıya al"  →  bans/{uid}  (gerekçe 10–500, süre 7/30/90/kalıcı)
Askıdaki hesap                →  tam ekran "Hesap askıda" bildirimi
                                 + sunucu yeni gönderi/hikâye/yanıt/yer yazımını reddeder
Süre dolar / ban kaldırılır   →  expiresAt geçmişe çekilir (belge silinmez), hesap açılır
```

## 3. Kuralların zorladığı sınırlar

**Rapor (`/reports/{reportId}`)**

- `create`: giriş + `reporterUid == request.auth.uid`, hedef türü kapalı liste, neden kapalı liste, açıklama ≤1000, `createdAt == request.time`.
- `get`/`list`: raporlayan **veya** moderatör; liste en fazla 50 kayıt.
- `update`: **yalnız moderatör** ve yalnız `status / resolution / reviewedAt / reviewerUid` alanları; `reviewedAt == request.time`, `reviewerUid == request.auth.uid`, `status ∈ {open, reviewed, actioned}`, not 1–500 karakter.
- `delete`: yalnız raporlayan (moderatör silemez).

**Ban (`/bans/{uid}`)**

- `create`: **yalnız moderatör** + tümü:
  - `uid` hedefle aynı, `uid != request.auth.uid` (kendini askıya alamaz),
  - gerekçe 10–500, `createdAt == request.time`, `createdBy == request.auth.uid`,
  - `reportId` **var olan** bir rapora işaret eder,
  - o rapor `status == 'actioned'` **ve** `reviewerUid == request.auth.uid` (aynı moderatör incelemiş olmalı),
  - raporun hedefi ya `targetOwnerUid == uid` ya da `targetType == 'user' && targetId == uid`.
- `update`: yalnız `expiresAt` alanı ve değeri geçmiş/şimdi (kaldırma). Belge silinemez.
- `get`: kendi kaydı veya moderatör. `list`: yalnız moderatör, ≤50.

**Yaptırım**

- `posts` / `posts/{id}/replies` / `stories` / `places` **create**: `!banned()`.
- Okuma kısıtlanmaz: askıdaki hesap içeriği görebilir (ceza üretimi keser, bilgiyi değil).
- Profil/ayar güncellemesi serbest: kullanıcı çıkış yapabilir, itiraz edebilir.

## 4. Arayüz

- **Ayarlar → Moderasyon → "Raporlarım ve inceleme durumu"**: herkes kendi raporlarını ve durumunu görür.
- Moderatörde ikinci sekme **"Kuyruk · N"** (N = açık rapor sayısı) açılır; kartın altında sırasıyla
  `İncelendi`, `İşlem yapıldı`, `Not` ve (rapor "işlem yapıldı" olduktan sonra) **"Hesabı askıya al"** bulunur.
- Askı ekranı: gerekçe, bitiş tarihi, "Çıkış yap". Ekran kapanmaz; süre dolunca kendiliğinden kalkar.

## 5. Bilinen sınırlar (dürüst liste)

1. **İçerik kaldırma yok.** Yaptırım hesap düzeyinde; raporlanan gönderi silinmiyor. İçerik kaldırma
   ayrı bir karar (yumuşak `hidden` alanı veya silme yetkisi) ve kural değişikliği gerektirir.
2. **Raporlayana bildirim gitmiyor.** Durumu kendi listesine girince görür.
3. **Kuyruk 50 kayıt, sayfalama yok.** Eski raporlar panelde görünmez; `status` alanı olmayan eski
   belgeler "İnceleniyor" sayılır.
4. **Rapor hız sınırı yok.** Aynı kullanıcı seri rapor gönderebilir (kuralda sayaç yok).
5. **Eşzamanlı düzenleme kilidi yok.** İki moderatör aynı rapora yazarsa son yazan geçerlidir.
6. **Ban yalnız yazmayı keser.** Askıdaki hesap mevcut içeriğini silmez; istenirse ayrıca yapılır.
7. **Kurallar dağıtılmadıkça hiçbiri çalışmaz** (fail-closed): kuyruk sekmesi görünmez, ban yazılamaz.

## 6. Yayına alma adımları (tek seferlik)

1. `firestore.rules` dağıt: `firebase deploy --only firestore:rules` (CI hattı GitHub → Cloudflare; kural dağıtımı ayrı onay).
2. Console → Firestore → `moderators` koleksiyonu → belge kimliği = kendi uid'in, alan: `createdAt`.
3. `npm run test:rules:emulator` CI'da yeşil olmalı (bu makinede Java 21 yok).
4. Panelde "Kuyruk" sekmesini görüyorsan kurulum tamam.

---

## 7. Genişletme (2026-10-25) — kademeli yaptırım ve ayrıcalıklı panel

Maintainer kararı: kapsam **tam**; içerik kaldırma **kalıcı silme**.

### 7.1 Kademeli yaptırım

| Basamak | Koşul (kural) | Etki |
| --- | --- | --- |
| Uyarı (`/warnings`) | Rapor `reviewed` ya da `actioned`, inceleyen = yazar moderatör | Kullanıcıya tam ekran uyarı; "Anladım" ile `read=true` (kayıt silinmez) |
| İçerik kaldırma | Moderatör `delete` (posts/stories/places/replies) | Belge kalıcı silinir; gönderiyse yanıtlar da temizlenir; rapor `actioned` kapanır |
| Askıya alma (`/bans`) | Rapor `actioned` (önceki bölüm) | Yazma engeli + askı ekranı + itiraz hakkı |

### 7.2 Yeni koleksiyonlar

| Koleksiyon | Yazma | Okuma | Silme |
| --- | --- | --- | --- |
| `/warnings/{id}` | moderatör (`validWarning`: kanıtlı rapor, gerekçe 10–500) | sahibi veya moderatör | yok; sahibi yalnız `read` işaretler |
| `/appeals/{id}` | askıdaki kullanıcı (kendi adına, 10–500) | sahibi veya moderatör | yok; moderatör `seen/accepted/rejected` yazar |
| `/modActions/{id}` | moderatör (`validModAction`) | moderatör | yok (değiştirilemez günlük) |
| `/announcements/{id}` | moderatör (`validAnnouncement`) | giriş yapmış herkes | moderatör |

İtiraz kabulü banı otomatik kaldırmaz: panelde ayrıca "Banı kaldır" yazılır (iki ayrı
işlem, günlükte ayrı satır).

### 7.3 Rapor sonucu bildirimi

Rapor `actioned` olunca raporlayana `report_actioned` bildirimi gider.
Kural kanıtı: `reports/{targetId}.reviewerUid == actorUid`,
`reporterUid == recipientUid`, durum `reviewed|actioned`. Başkası adına
sonuç bildirimi yazılamaz.

### 7.4 Panel görünümleri

`Raporlarım · Kuyruk (durum süzgeci + arama + hedef geçmişi) · İtirazlar ·
Kayıtlar · Duyurular`. Hedef geçmişi: aleyhteki rapor sayısı, uyarı sayısı,
ban kaydı — karar öncesi karttan açılır.

### 7.5 Dağıtım notu (bu tur için)

1. `firestore.rules` yeniden yayınlanmalı (Console → Rules ya da CLI).
2. İndeksler: `reports (reporterUid ↑, createdAt ↓)` ve
   `blocks (blockerUid ↑, createdAt ↓)` bileşik indeksleri gerekli;
   `firestore.indexes.json` kaynağa eklendi. Console'da elle oluşturma da olur.
3. Kurallar yayınlanana kadar yeni yetkiler fail-closed: panel sekmeleri
   görünse bile yazımlar reddedilir.

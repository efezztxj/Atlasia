# Atlasia — Kapsamlı Moderasyon Planı

**Tarih:** 2026-10-25 · **Dal:** `arena/78c4c082-atlasia` · **Hedef:** Mevcut moderasyonu rakiplerden çok daha güçlü, sunucuda zorunlu, itiraz-kanıtlı bir sisteme çıkarmak.

---

## 1. Mevcut durum (şimdi)

Repo zaten sunucu tarafında (fail-closed) moderasyon barındırıyor:

| Bileşen | Durum |
|---|---|
| Raporlar (`reports/{id}`) | Oluşturma, okuma, moderatör güncelleme (durum/not/inceleme izi), silme (yalnız raporlayıcı) |
| Yasaklamalar (`bans/{uid}`) | Yalnız moderatör, `banHasProof` ile kanıtlı, 7/30/90/gün veya kalıcı, `expiresAt` ile kaldırma |
| Engellemeler (`blocks/{id}`) | Deterministik kimlik (`blocker_blocked`), yalnız sahibi yazar/siler |
| Kuyruk arayüzü | `ReportsPanel.tsx`: en yeni 50 rapor, durum güncelleme, ban/lift-ban |
| Askı ekranı | `SuspensionNotice.tsx`: tam ekran, gerekçe + bitiş + çıkış |
| Kurallar | `firestore.rules` — istemcide değil kurallarda, fail-closed catch-all |

**Bilinen boşluklar (kullanıcı istediği iyileştirmeler):**

1. **Uyarı merdiveni yok.** Şu anda doğrudan ban var; önceki aşama olarak "uyarı → onay → kalıcı silme → ban" yok.
2. **İçerik kaldırma yok.** Yaptırım hesap düzeyinde; raporlanan gönderi silinmiyor (docs/moderasyon-akisi.md §5 sınırı 1).
3. **İtiraz yok.** Askıya alınan kullanıcının itiraz edebileceği akış yok.
4. **İşlem kaydı (audit log) yok.** Moderatör eylemleri değiştirilebilir bir günlükte tutulmuyor.
5. **Duyuru yok.** Moderatörün tüm kullanıcılara şerit yayımlayamıyor.
6. **Kuyruk araçları sınırlı.** Durum süzgeci, arama, hedef geçmişi, rapor sonucu bildirimi yok.
7. **blocks bileşik indeksi eksik.** `firestore.indexes.json` içinde `blocks` (blockerUid + createdAt) indeksi yok → kuyruk/list sorgusu fail-closed veya geçersiz.

---

## 2. Hedef durum (PR #106 ile birlikte)

PR #106 ("Kapsamlı moderasyon: kademeli yaptırım, itiraz, duyuru, işlem kaydı") şunları ekler:

| Özellik | Ne olur |
|---|---|
| **Uyarı (`warnings/{id}`)** | Kanıtlı rapordan uyarı; kullanıcı "Anladım" demeden geçemez; `warnHasProof` kuralı |
| **İçerik kaldırma** | Moderatör gönderi/hikâye/iz/yanıtı kalıcı siler; iki aşamalı onay |
| **İtiraz (`appeals/{id}`)** | Askı ekranından; kabul → ban kaldırma ayrı işlem; reddedilebilir |
| **İşlem kaydı (`modActions/{id}`)** | Değiştirilemez moderatör günlüğü (eylem, hedef, zaman, yetkili) |
| **Duyurular (`announcements/{id}`)** | Moderatör duyurusu kullanıcılara şerit olarak görünür |
| **Kuyruk iyileştirmeleri** | Durum süzgeci + arama + hedef geçmişi; `report_actioned` bildirimi inceleyen moderatöre kanıtla bağlı |
| **Kurallar** | `firestore.rules` 31 → 35 blok |
| **İndeksler** | `reports` + `blocks` bileşik indeksleri `firestore.indexes.json` eklendi |
| **Testler** | 999 → 1016; bundle bütçesi 903.778 B ölçümle 908.000 B eşiği |

---

## 3. Yapılacaklar (sıra)

### Aşama 1 — PR #106'yi bu dalına çekme (kod değişikliği)

`PR #106` zaten `main` üzerine açık, CI yeşil, mergeable. Bu dalı (`arena/78c4c082-atlasia`, şu an `main` ile aynı) üzerine çek:

1. `git fetch origin pull/106/head`
2. `git merge FETCH_HEAD` (kabul edilirse fast-forward / temiz birleştirme)
3. Çakışma varsa `scripts/bundle-budget.mjs` gibi dosyada çözümle (PR #106 zaten main ile birleştirilmiş, muhtemelen temiz)

### Aşama 2 — İndeksleri onayla (kullanıcı tarafından açıkça istenen)

`firestore.indexes.json` içinde şu bileşik indekslerin var olduğundan emin ol:

- `reports`: `authorUid` / `reporterUid` + `createdAt` (kuyruk ve kendi raporlar sorguları)
- `blocks`: `blockerUid` ASC + `createdAt` DESC (engelleme listesi)

Eksikse ekle ve `npm run ensure:owner-places-index` ile yerine koy.

### Aşama 3 — Kuralları yeniden yayınla (kullanıcı tarafından açıkça istenen)

`firestore.rules` dosyasını Firebase'e dağıt:

```
firebase deploy --only firestore:rules --project <onayli-proje-id>
```

Not: `.firebaserc` varsayılanı `atlasia-dev`; `--project` her zaman açık yazılır. CI hattı GitHub → Cloudflare; kural dağıtımı ayrı onay.

### Aşama 4 — Kalite kapıları (hiçbiri atlanmaz)

```bash
npm ci
npm run typecheck      # tsc --noEmit → 0 hata
npm run lint           # eslint . --max-warnings=0 → 0
npm run test:run       # vitest run → tüm testler yeşil
npm run test:rules-inventory
npm run build          # vite build + bundle bütçesi (≤ 908.000 B)
npm run audit:check    # production dependency security baseline
```

`npm run test:rules:emulator` bu makinede Java 21 olmadan koşamaz (bilinen sınır, CI'da yeşil).

### Aşama 5 — Teslim ve push

- Ayrı bir commit: `feat: kapsamlı moderasyon (PR #106) + blocks indeksi + kural yeniden yayın`
- `git push origin arena/78c4c082-atlasia`
- PR aç (opsiyonel, kullanıcıya bırak)

---

## 4. Çiğnenemez kurallar (mevcut ve yeni)

| Kural | Açıklama |
|---|---|
| Yetki istemcide değil kurallarda | Tüm moderasyon kararı `firestore.rules` tarafından zorlanır |
| Fail-closed | Kural dağıtılmadıkça kuyruk görünmez, ban yazılamaz, içerik üretilemez |
| Kanıt zorunlulukları | `banHasProof`, `warnHasProof`, `notificationProof` — raporsuz/kanıtsız işlem yok |
| Kendini askıya alma yok | `uid != request.auth.uid` |
| Raporlı-ban zinciri | Ban → `actioned` rapor → aynı moderatör incelemesi |
| İçerik kaldırma iki aşamalı onay | Kalıcı silme onay ikili |
| İtiraz ayrı işlem | Kabul ve ban kaldırma ayrıFirestore işlemleri |
| Bütçe tavanı | JS bundle ≤ 908.000 B (903.778 B ölçüm) |
| Koyu tema = siyah | Masaüstünde başlık solda, arama sağda; Atlas AI sağ altta |
| Git yasakları | `git reset --hard`, force-push, geçmişi yeniden yazma yok |

---

## 5. Rolleri ve yetkiler (hedef)

| Rol | Tanımlanma | Yetki |
|---|---|---|
| Kullanıcı | E-posta/cihaz hesabı | Rapor verir, kendi rapor/bloğu/itirazını görür, kendi raporunu siler |
| Moderatör | `moderators/{uid}` (Console) | Kuyruğu okur, durum/not yazar, uyarı/ban/kaldırma, içerik siler, duyuru yayımlar |
| Geliştirici | Console erişimi | Kural dağıtımı, indeks, moderatör ekleme/çıkarma |

`moderators/{uid}` istemciden yazılamaz (`create/update/delete: false`).

---

## 6. Riskler ve geri alma

| Risk | Önlem |
|---|---|
| Eski PWA önbelleği yeni kurallarla çakışır | 24 saat `permission-denied` izleme; sessiz `console.warn` |
| `blocks` indeksi eksikse sorgu hata verir | Dağıtımdan önce `firestore.indexes.json` onayı |
| İçerik kalıcı silinmesi geri alınamaz | İki aşamalı onay + moderatör-only kural |
| İtiraz kabul edilirse ban kalkar | `expiresAt` geçmişe çekilir (belge silinmez, iz kalır) |

**Geri alma:** `firebase deploy --only firestore:rules` önceki sürüme döner; istemci dağıtımı geri alınmaz (talimat).

---

## 7. Güncel durum (tamamlanan adımlar)

- **PR #98:** Birleşmiş ✅
- **PR #106 entegrasyonu:** `arena/78c4c082-atlasia` dalına çekildi ve güncel `main` (`32069cc`) ile birleştirildi ✅
- **Firestore kuralları ve indeksler:** `firestore.rules` + `firestore.indexes.json` (`reports` ve `blocks` bileşik indeksleri) `atlasia-dev` projesine yayınlandı ✅
- **Test sayısı:** 137 birim test dosyası / 1052+ test + betik testleri yeşil ✅

---

## 8. Çalışma biçimi

- Sade Türkçe; kapılar yeşil olmadan "bitti" denmez.
- Emin olunmayan kararda kullanıcıdan sorulur.
- Her değişiklik ayrı commit; `main` üzerinde doğrudan geliştirme yok.

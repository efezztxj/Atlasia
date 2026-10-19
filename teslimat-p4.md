# P4 · TOPLULUK & UYUM (FAZ E) — Teslimat

- **Görev:** Adım 13 → 14 ∥ 15 → 16 (her adım tek commit)
- **Dal:** `arena/f5d256c1-atlasia`
- **Taban commit:** `ab290183921a688bb6d8c6a64e2c28395f052ef3` (`main`)
- **Kod commit'leri:**
  - `0e36583` — `feat: moderasyon temelini ekle (bildir, engelle, hesap silme)` (Adım 13)
  - `b8ed369` — `feat: tazelik dongusunu ve rota motoru tercihini ekle` (Adım 14)
  - `2d75a79` — `feat: duraklarin varis saatine gore hava ve yagmur plani ekle` (Adım 15)
  - `75d7fd1` — `feat: firestore grup ve sohbet akisini ekle` (Adım 16)
  - `dca8b31` — `refactor: moderasyon rapor dogrulamasini tipli girdiyle sadelestir` (tip temizliği; davranış değişmedi)
- **Kilit kontrolü:** `src/components/MapView.tsx` değişmedi. `storage.rules` değişmedi. `main`'e commit yok, PR açılmadı.

```
$ git diff --name-only ab29018..HEAD | rg "MapView|storage.rules" || echo "(kilitli dosyada degisiklik yok)"
(kilitli dosyada degisiklik yok)
```

> Not: Aşağıdaki test/build çıktıları bu teslimat yazılırken aynı çalışma ağacında alınmıştır. Renk kaçış kodları okunurluk için temizlenmiştir; satır içerikleri birebir korunmuştur.

---

## 1. Adım 13 — Moderasyon temeli

### Ne yapıldı

- **Bildir:** `ReportDialog` + `src/lib/moderation.ts` → `reports/{id}` (neden kapalı liste, hedef türü kapalı liste, açıklama ≤1000). Yer detayında ve gönderi menüsünde "Bildir".
- **Engelle:** `blocks/{blockerUid}_{blockedUid}` deterministik kimlik; yer detayı, gönderi menüsü ve grup sohbetinden. Engellenen kullanıcının izleri, gönderileri, hikâyeleri ve mesajları istemci görünümünden düşer (`useBlocks` + filtreler).
- **Sil:** mevcut sahip-silme akışları korunur; mesaj silme (Adım 16) eklendi.
- **Hesap silme:** Profil > Tehlikeli alan > "Hesabımı ve verilerimi sil". Sıra: önce Firestore verisi, sonra cihaz modu hesabı veya Firebase Auth hesabı. Silinenler: `places`, `posts`, `stories`, `reports`, `blocks`, `verifications`, grup üyeliği + kendi mesajları, `users/{uid}/groups`, `users/{uid}/notifications`, yerel `atlasia.*` anahtarları.
- **Bildirim ilk hali:** `users/{recipientUid}/notifications/{id}`; başlıkta zil + okunmamış sayacı, panelde liste/okundu/tek tek okundu. Rapor alan içerik sahibine `report_received` bildirimi alır (şeffaflık).
- **Metinler:** Gizlilik m.6 hesabın uygulama içinden silinebilmesini; Kullanım Koşulları m.6 bildirme/engellemeyi açıklar.

### Kural değişiklikleri (`firestore.rules`, yalnız sıkılaştırma)

- `reports/{id}`: yalnız `reporterUid == auth.uid` yazar/okur/siler; liste `limit <= 50`; güncelleme kapalı; şekil kapalı alan listesi.
- `blocks/{id}`: yalnız `blockerUid == auth.uid`; kendini engelleme reddedilir; güncelleme kapalı; liste `limit <= 50`.
- `users/{uid}/notifications`: yalnız alıcı okur, `actorUid == auth.uid` yazar; okuma `limit <= 50`; update yalnız `read` alanı.
- `users/{uid}/blocks`: uyumluluk yolu, aynı sıkılıkta.
- Mevcut kullanıcı profili koleksiyonu **kapalı kalır** (`xp/level` yazımı yok).

### Kanıt

```
$ npm run test:run -- src/lib/moderation.io.test.ts src/lib/moderation.test.ts

> atlasia-web@0.1.0 test:run
> vitest run src/lib/moderation.io.test.ts src/lib/moderation.test.ts

 RUN  v4.1.11 /home/user/Atlasia

 ✓ src/lib/moderation.io.test.ts (4 tests) 9ms
 ✓ src/lib/moderation.test.ts (5 tests) 5ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
   Start at  22:04:17
   Duration  656ms (transform 162ms, setup 0ms, import 387ms, tests 14ms, environment 0ms)
```

Testlerin kilitlediği davranış:

- `içerik bildirimi rapor dokümanına yalnız gerekli alanlarla yazılır`
- `geçersiz rapor yazılmadan reddedilir`
- `hesap silmede yalnız o kullanıcının verisi kalkar, başkasınınki kalır` (u1'in 1 iz/1 gönderi/1 story/1 rapor/1 engel'i silinir; u2'nin izi kalır; sahip olduğu grup ve kendi mesajı silinir, arkadaşının mesajı kalır)
- `grup sahibi olmayan üye silinince gruptan çıkarılır, grup yaşar` (`memberUids: ["u1","u2"] → ["u1"]`)
- `rapor nedenleri ve hedef türleri kapalı listelerdir`, `engelleme kimliği çift için deterministik`

Kural testleri (emülatör) yazıldı: `tests/firestore.rules.test.ts` içinde
`içerik bildirimini ... kabul eder`, `engellemeyi ... yazar`, `bildirimi yalnız alıcı okur ...`.

**Emülatör çalıştırma sonucu (dürüst açık nokta):**

```
$ npm run test:rules:emulator

> atlasia-web@0.1.0 test:rules:emulator
> node scripts/run-firestore-rules-tests.mjs

file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65
    throw new Error("Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.");
          ^

Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
    at file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:161:1
    at ModuleJob.run (node:internal/modules/run_main:117:24)
    at asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:24)

Node.js v22.22.3
```

Sebep: bu sandbox'ta Java yok (`java -version` → `command not found`); emülatör JAR'ı indiren
`storage.googleapis.com` bu ortamda erişilemeyen host listesinde. JAR SHA-256 pini
(`9b6498b7...5166c`) değiştirilmedi; pin eşleşmediği/indirilemediği için **çalıştırılmadı**.
Kurallar bu nedenle **deploy edilmedi**.

---

## 2. Adım 14 — Tazelik döngüsü + XP kararı (d) BAĞLI

### Ne yapıldı

- `verifications/{id}`: `placeId`, `uid`, `status ∈ {still_open, fee_changed, road_closed, free_entry, closed}`, isteğe bağlı `note ≤ 280`, `createdAt`.
- Tek canlı dinleyici, en yeni **50** doğrulama (`limit(50)`); ücretsiz kotada kalır.
- `src/utils/freshness.ts`: 30 gün **taze** (×1.35), 90 güne kadar **eskime** (×1.10), sonrası **bayat** (×0.80); doğrulanmamış nötr (×1.00). Etiket: "2 kişi son 3 ayda doğruladı · 5 gün önce · Hâlâ açık".
- **Yer detayında tazelik tarihi ve tek dokunuş doğrulama** butonları; isteğe bağlı not.
- **Rota motoru** `preference()` içine tazelik çarpanı eklendi; `aiReason` tazelik gerekçesini açıkça yazar ("Taze doğrulanmış bilgi öne alındı" / "Bilgi eski; gitmeden doğrula" / "tazelik kaydı yok").
- **XP/rozet/takip:** Bu tabanda `awardXp/addBadge/followUser` fonksiyonları **yok** (ROADMAP'teki ölü katman bu sürümde zaten kaldırılmış). Silinecek kod olmadığı için yeniden eklenmedi; **fonlanmadı**, Cloud Functions/Blaze yok. Karar `src/lib/firestoreData.ts` başlığında ve kural setinde (`users` yazımı kapalı) belgelendi. XP'nin gerçek işi lansman sonrası Blaze onayına ertelendi.

### Kural

`verifications` herkese açık tek `get`; liste `limit <= 50`; create yalnız `uid == auth.uid`, kapalı alan/şekil; update kapalı; delete yalnız kendi kaydı (hesap silme için).

### Kanıt

```
$ npm run test:run -- src/utils/freshness.test.ts src/utils/routePlanner.test.ts

> atlasia-web@0.1.0 test:run
> vitest run src/utils/freshness.test.ts src/utils/routePlanner.test.ts

 RUN  v4.1.11 /home/user/Atlasia

 ✓ src/utils/routePlanner.test.ts (8 tests) 11ms
 ✓ src/utils/freshness.test.ts (8 tests) 8ms

 Test Files  2 passed (2)
      Tests  16 passed (16)
   Start at  22:04:18
   Duration  457ms (transform 152ms, setup 0ms, import 185ms, tests 19ms, environment 0ms)
```

Kritik iki test (kanıt):

- `aynı mesafede taze durak bayat durağın önüne geçer` → rota sırası `["fresh","stale"]`.
- `tazelik gerekçesi kullanıcıya görünür ve dürüsttür` → ilk durakta "Taze doğrulanmış bilgi öne alındı", ikincide "Bilgi eski; gitmeden doğrula".
- `30 gün taze, 90 gün eskime, sonrası bayat bandına düşer`
- `son doğrulama tarihini ve son 90 gündeki kişi sayısını gösterir` → "2 kişi son 3 ayda doğruladı · 5 gün önce · Hâlâ açık"
- `aynı kullanıcının gün içinde tekrar doğrulamasını engeller`

---

## 3. Adım 15 — Hava durumunu derinleştir

### Ne yapıldı

- `src/utils/weather.ts`: anahtarsız Open-Meteo; **saatlik** sıcaklık, yağış, yağış olasılığı, hava kodu; 3 gün; 10 dk bellek önbelleği.
- **Tek HTTP isteği:** Open-Meteo virgüllü koordinatları desteklediği için 7 duraklık rota tek çağrıda alınır (7 okuma değil).
- Her durağa **varış saatine göre** hava: `Varışta: 18° · Yağmur · %70 yağış olasılığı`; saatlik dilime yuvarlama (≥30 dk bir sonraki saat).
- **Yağmur planı:** `optimizeForRain` durakları, varış saatlerindeki yağış olasılığı toplamını azaltacak şekilde takas eder (açgözlü, en fazla 3 geçiş). Sonuç `weatherNote` ile dürüstçe yazılır; iyileşme yoksa sıra korunur.
- `RouteBrief.rain === "auto"` artık gerçekten kullanılıyor; "Yağmur planı" alternatifi aynı akışı tetikler.
- Open-Meteo atfı `dataSources` ve rota altında görünür.

### Kanıt

```
$ npm run test:run -- src/utils/weather.test.ts

> atlasia-web@0.1.0 test:run
> vitest run src/utils/weather.test.ts

 RUN  v4.1.11 /home/user/Atlasia

 ✓ src/utils/weather.test.ts (7 tests) 9ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  22:04:21
   Duration  324ms (transform 159ms, setup 0ms, import 186ms, tests 9ms, environment 0ms)
```

Kritik testler:

- `her durağa varış saatindeki havayı ekler, sıralamayı değiştirmez` → A 09:00 %80 yağmur (`risk: "rainy"`), B 11:00 açık.
- `yağmur planı ıslak durakları kuru saatlere kaydırır ve maruziyeti azaltır` → maruziyet 180 → <180, sıra `["b","a"]`, tüm duraklar `clear`, not "Yağmur planı".
- `yağış riski yoksa sıralamayı korur ve dürüst not yazar` → taşınan durak 0.
- `varış saatini tahmin dilimine eşler ve dakikayı yuvarlar` → 09:45 → 10:00 dilimi.

---

## 4. Adım 16 — Grup + sohbet (karar (g) BAĞLI)

### Karar ve model

- **Yalnız Firestore.** Realtime Database yok, üçüncü taraf yok.
- `groups/{groupId}`: `name`, `ownerUid`, `memberUids[]` (en fazla **20**), `createdAt`, `updatedAt`, `lastMessage`.
- `groups/{groupId}/messages/{messageId}`: `senderUid`, `senderName`, `text` (1–1000), `createdAt`. Güncelleme kapalı; silme yalnız gönderen.
- `users/{uid}/groups/{groupId}`: kullanıcının **kendi** grup indeksi (`groupId`, `name`, `role`, `joinedAt`). Grup listesi buradan `limit(20)`; geniş `groups` taraması kurallarla **kapalı** (`allow list: if false`).
- Okuma bütçesi: grup listesi ≤20 + açılan sohbet ≤50 mesaj + dostça tek `get`. Yeni mesajlar canlı dinleyici ile gelir.
- **Davet:** kurucu, üye UID'lerini ekler; her üyeye `group_invite` bildirimi yazılır. Davetli bildirimden "Grubu aç" der veya grup kimliğiyle "Katıl" yapar (üyeliği kurallar doğrular).
- **Engelleme:** sohbette engellenen gönderenin mesajı gizlenir; engelleme düğmesi ve "engelli" göstergesi. Bildirimlerde engellenen aktörün bildirimi de gizlenir.
- **Bildirim:** her mesaj, gönderen dışındaki her üyeye `group_message` bildirimi üretir (gönderene üretmez). `group_invite` de aynı yoldan.
- **Hesap silme:** kullanıcı grup sahibiyse grup silinir, değilse `memberUids`'ten kendisi çıkarılır; kendi mesajları silinir; indeks ve bildirimler kalkar.

### Kural özeti

- Grup `get`: yalnız üye. `list`: kapalı.
- Grup `create`: geçerli şekil + `ownerUid == auth.uid` + kendisi üye + ≤20 tekil üye.
- Grup `update`: sahibi ad/üye günceller; üye yalnız `lastMessage/updatedAt`; üye yalnız kendini çıkarabilir.
- Mesaj `get/list`: üye + `limit <= 50`; `create`: üye + `senderUid == auth.uid` + `createdAt == request.time`; `update: false`; `delete`: gönderen.
- Bildirim: yalnız alıcı okur, aktör yazar, okundu dışında değişmez.

### Kanıt

```
$ npm run test:run -- src/lib/groups.test.ts src/lib/groups.io.test.ts

> atlasia-web@0.1.0 test:run
> vitest run src/lib/groups.test.ts src/lib/groups.io.test.ts

 RUN  v4.1.11 /home/user/Atlasia

 ✓ src/lib/groups.test.ts (7 tests) 8ms
 ✓ src/lib/groups.io.test.ts (3 tests) 7ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Start at  22:04:22
   Duration  569ms (transform 137ms, setup 0ms, import 307ms, tests 15ms, environment 0ms)
```

Kritik testler:

- `A kullanıcısının mesajı B'ye grup bildirimi olarak gider` → alıcı yalnız `user-b`, gönderen `user-a`, gövde `Ada: Merhaba, yarın görüşelim.`
- `A'nın mesajı grupta saklanır, B'ye bildirim gider, A'ya gitmez` → mesaj dokümanı `senderUid: user-a`, grup `lastMessage` güncel, bildirim tek ve B'ye.
- `B'nin yanıtı aynı gruba yazılır ve bildirim bu kez A'ya gider` → iki mesaj (A+B), bildirim `recipientUid: user-a`.
- `engellenen kullanıcının mesajı görünümden düşer, silinen mesaj depodan kalkar`
- `iki kullanıcının karşılıklı mesajları aynı grupta birikir` (saf yük testi)

Emülatör kural testleri yazıldı (çalıştırılamadı, bkz. açık nokta 1):
`grubu yalnız kurucu oluşturur, yalnız üyeler tek belge olarak okur`,
`grup güncellemesini sahibine bırakır, üyeye yalnız son mesajı yazdırır`,
`sohbet mesajını yalnız grup üyesi kendi adına yazar, sınırlı okur ve kendi mesajını siler`,
`grup indeksini yalnız sahibi yazar ve sınırlı listeler`.

---

## 5. Global kalite kapısı (aynı ağaç)

### `npm run typecheck`

```
> atlasia-web@0.1.0 typecheck
> tsc --noEmit
```

(çıktı yok = 0 hata)

### `npm run lint`

```
> atlasia-web@0.1.0 lint
> eslint . --max-warnings=0
```

(çıktı yok = 0 uyarı)

### `npm run test:run`

```
> atlasia-web@0.1.0 test:run
> vitest run

 Test Files  31 passed (31)
      Tests  171 passed (171)
   Duration  5.83s
```

### `npm run build`

```
> atlasia-web@0.1.0 build
> vite build

vite v7.3.7 building client environment for production...
✓ 2017 modules transformed.
dist/index.html                               3.58 kB │ gzip:   1.03 kB
dist/assets/map-vendor-Dx4V7X3z.js          946.56 kB │ gzip: 248.69 kB
dist/assets/firebase-vendor-lGnMn7XX.js     491.48 kB │ gzip: 147.64 kB
dist/assets/index-D8ODjBep.js               439.46 kB │ gzip: 146.89 kB
dist/assets/react-vendor-C9ZQbJ0Z.js        192.46 kB │ gzip:  60.33 kB
dist/assets/firebase-auth-CRx4da9f.js       128.94 kB │ gzip:  36.60 kB
dist/assets/MapView-B_DuVw-9.js              35.00 kB │ gzip:   7.77 kB
dist/assets/icons-vendor-BfbNBmXB.js         26.16 kB │ gzip:   9.03 kB
dist/assets/index-C06QBfne.css              114.49 kB │ gzip:  20.09 kB
dist/assets/map-vendor-JR8eJ17e.css          83.02 kB │ gzip:  10.52 kB
✓ built in 8.97s
```

(>500 kB chunk uyarıları build'i durdurmaz; mevcut `map-vendor`/`firebase-vendor` bölünmesi korunmuştur.)

### `npm run audit:check`

```
> atlasia-web@0.1.0 audit:check
> node scripts/audit-baseline.mjs

Üretim bağımlılıklarında bilinen açık bulunmadı.
```

### `npm run verify:social-metadata`

```
> atlasia-web@0.1.0 verify:social-metadata
> node scripts/verify-social-metadata.mjs

Sosyal metadata doğrulandı: 18 değer, 1200×630 JPEG, 132654 bayt, progressive.
```

### `grep` yasak taraması

```
$ rg -n "as any|@ts-ignore|@ts-expect-error" src tests firestore.rules
src/hooks/useFirestoreAtlasData.likes.test.ts:223:        const r = (va as any) > (vb as any) ? 1 : -1;

$ git diff ab29018..HEAD -- src/hooks/useFirestoreAtlasData.likes.test.ts | wc -l
0
```

Tek eşleşme **bu teslimattan önce var olan** test satırıdır; bu dalda o dosyaya dokunulmadı. Yeni `as any`, `@ts-ignore`, boş `catch` veya zayıflatılmış assertion eklenmedi.

---

## 6. Otonom kararlar

1. **Karar (d) — XP/rozet/takip:** BAĞLI uygulandı. Bu tabanda ilgili fonksiyonlar yok; yeniden yazılmadı, fonlanmadı, Blaze/Functions eklenmedi. Puan yerine tazelik doğrulaması "güven sinyali" olarak çalışır. XP'nin gerçek işi lansman sonrası Blaze onayına ertelendi (kod başlığında yazılı).
2. **Karar (g) — sohbet:** Firestore. Limitli okuma: kullanıcı indeksi ≤20 grup, sohbet ≤50 mesaj, grup tek `get`. Realtime Database/üçüncü taraf yok. Geniş `groups` listesi kurallarla kapalı.
3. **Grup üyeliği modeli:** Kişi başına `users/{uid}/groups` indeksi. Grup listesi için `groups` koleksiyonunu taramak yerine kendi indeksini okumak hem gizlilik hem kotalar için daha sıkı.
4. **Davet yöntemi:** UID ile davet + bildirim. Kullanıcı dizini (e-posta/UID arama) **açılmadı**; bu, başka kullanıcıları keşfetme yüzeyi yaratıp gizlilik riski doğururdu. Profilde "Hesap kimliğin" kopyalanabilir.
5. **Grup boyutu/tavanları:** 20 üye, 1000 karakter mesaj, 20 grup, 50 mesaj. Ücretsiz kotada kalmak için bilinçli tavan.
6. **Bildirim modeli:** Alıcının alt koleksiyonuna **aktör** yazar (davet/mesaj/rapor). Bu, Cloud Functions olmadan çalışan tek ücretsiz yoldur; kural, yazana yalnız kendi `actorUid`'siyle yazma izni verir.
7. **Rapor görünürlüğü:** Raporu yalnız raporlayan okuyabilir; moderasyon kuyruğu bu sürümde yok (yönetici rolü/Functions olmadan güvenli değil). Rapor sahibine "raporun alındı" bildirimi gider; raporlanan içerik sahibine şeffaflık bildirimi gider.
8. **Hesap silme sırası:** Önce Firestore verisi, sonra Auth. Tersi durumda kurallar yazmayı reddeder ve veri kalırdı. Auth `deleteUser` "son giriş" isteyebilir; bu durumda veri silinmiş olur, hesap kalır ve kullanıcıya hata gösterilir (açık nokta 6).
9. **Tazelik bantları:** 30/90 gün ve 1.35/1.10/0.80 çarpanları. Amaç "puan" değil, rota motorunda ölçülebilir güven tercihi.
10. **Hava:** Tek çoklu-koordinat isteği + 10 dk önbellek + 8 sn timeout. Yağmur planı açgözlü takas; küresel optimum iddiası yok, "iyileşme yoksa dokunma" ilkesi var.
11. **Harita katmanı:** `MapView.tsx` kilitli olduğu için hava katmanı **eklenmedi**; varış havası ve yağmur planı rota panelinde. Harita katmanı isteği teslimatın açık noktası olarak listede.

---

## 7. Dürüst açık noktalar

1. **Kural emülatörü çalıştırılamadı.** Sandbox'ta Java 21 yok; emülatör JAR'ı `storage.googleapis.com`'dan indirilemiyor (izinli host değil). JAR SHA-256 pini değiştirilmedi. Bu yüzden `tests/firestore.rules.test.ts` içindeki yeni kural testleri **yazıldı ama çalıştırılmadı**. Kurallar **deploy edilmedi**. Yayına almadan önce Java 21 olan bir ortamda `npm run test:rules:emulator` zorunlu.
2. **"İki kullanıcı mesajlaşıyor" kanıtı** veri katmanı düzeyinde (in-memory Firestore sahtesi) ve kural testi tanımlarıyla gösterildi; **iki gerçek hesap + canlı Firestore ile uçtan uca** denenmedi. Canlı deneme, gerçek Firebase projesi ve deploy edilmiş kurallar gerektirir.
3. **Sohbette eski mesajlar:** yalnız en yeni 50 mesaj okunur; daha eskiler UI'da yok (bilinçli ücretsiz kota kararı). Sayfalama eklenmedi.
4. **Grup keşfi yok:** davet UID ile. Kullanıcı adı/e-posta ile arama gizlilik nedeniyle yok.
5. **Engelleme tek yönlüdür:** engelleyen kişi engellediğinin içeriğini görmez; karşı tarafın seni görmesini engellemez. "Karşılıklı görünmezlik" için çift yönlü engel belgesi veya sunucu tarafı gerekir.
6. **Hesap silme yarım kalabilir:** `deleteUser` son giriş isterse Firestore verisi silinmiş, Auth hesabı kalmış olur; kullanıcıya hata gösterilir ve yeniden giriş sonrası tekrar denenebilir. Ayrıca sahibi olduğu grup silinince diğer üyelerin mesajları Firestore'da "öksüz" kalır (kurallar artık okutmaz; fiziksel temizlik Functions gerektirir).
7. **Başkalarının sana yazdığı engel kayıtları** hesap silmede kalkmaz: kural, başkasının `blocks` dokümanını silmeye izin vermez (doğru güvenlik tercihi). Bu kayıtlar yalnız `blockedUid` alanında UID tutar.
8. **Hava durumu harita katmanı yok** (MapView kilidi). İstenirse ayrı onayla: raster/partikül katmanı, `MapView.tsx` üzerinde yeni `paint`/`source`.
9. **Tazelik penceresi:** yalnız son 50 doğrulama yüklenir. 50'den fazla doğrulama varsa "son 90 gün" sayısı bu pencereyle sınırlıdır; eski doğrulamalar görünmez.
10. **Yağmur planı açgözlü:** 3 geçişlik takas; teorik en iyi sıralamayı garanti etmez. Hava tahmini gecikirse ilk sıra korunur ve not dürüstçe "iyileşme yok" der.
11. **Yasal metinlerde yer tutucular** (`[TARİH]`, `[E-POSTA]`, `[ŞEHİR]`) bu görevin dışında; avukat/künye onayı hâlâ bekliyor.
12. **Bildirimler yalnız uygulama içi.** Push/e-posta yok; sayfa kapalıyken bildirim gösterilmez (Cloud Functions/Blaze gerektirir).
13. **Rapor kuyruğu/otomatik moderasyon yok.** Raporlar yalnız yazılır; inceleme ve kaldırma süreci yönetici aracı gerektirir.
14. **`npm run check`** zinciri `test:rules:emulator` içerdiği için bu ortamda **tamamıyla yeşil çalıştırılamadı**; parçaları ayrı ayrı yeşil (typecheck, lint, test, build, metadata, audit). Java'lı ortamda `npm run check` çalıştırılmalı.

---

## 8. Değişen dosyalar

```
$ git diff --stat ab29018..HEAD

 firestore.rules                       | 196 +++++++++++++++++
 src/App.tsx                           |  79 +++++--
 src/components/AtlasAssistant.tsx     |  50 +++--
 src/components/GroupsPanel.tsx        | 297 +++++++++++++++++++++++++
 src/components/Header.tsx             |   6 +
 src/components/NotificationsPanel.tsx |  52 +++++
 src/components/PlaceDetails.tsx       |  82 ++++++-
 src/components/ProfilePanel.tsx       |  70 ++++++
 src/components/ReportDialog.tsx       |  91 ++++++++
 src/components/SocialPanel.tsx        |  57 ++++-
 src/content/legal.ts                  |   4 +-
 src/hooks/useBlocks.ts                |  30 +++
 src/hooks/useFreshness.ts             |  68 ++++++
 src/lib/deviceAccounts.ts             |  23 +-
 src/lib/firestoreData.ts              |   8 +
 src/lib/groups.io.test.ts             | 155 +++++++++++++
 src/lib/groups.test.ts                |  83 ++++++
 src/lib/groups.ts                     | 368 +++++++++++++++++++++++++++++++
 src/lib/moderation.io.test.ts         | 159 ++++++++++++++
 src/lib/moderation.test.ts            |  43 ++++
 src/lib/moderation.ts                 | 396 ++++++++++++++++++++++++++++++++++
 src/lib/notifications.ts              | 110 ++++++++++
 src/lib/verifications.ts              |  98 +++++++++
 src/types.ts                          |  10 +
 src/utils/freshness.test.ts           | 113 ++++++++++
 src/utils/freshness.ts                | 156 ++++++++++++++
 src/utils/routePlanner.test.ts        |  45 ++++
 src/utils/routePlanner.ts             |  16 +-
 src/utils/weather.test.ts             | 144 +++++++++++++
 src/utils/weather.ts                  | 294 ++++++++++++++++++++
 tests/firestore.rules.test.ts         | 238 ++++++++++++++++++++
 31 files changed, 3509 insertions(+), 40 deletions(-)
```

## 9. Sonraki görev

1. Java 21 olan bir CI ortamında `npm run test:rules:emulator` → yeşilse `firebase deploy --only firestore:rules`.
2. İki gerçek hesapla canlı Firestore'da grup/sohbet + bildirim + engelleme duman testi.
3. Moderasyon kuyruğu (yönetici aracı) ve itiraz akışı.
4. Hava durumu harita katmanı (MapView onayı ile).

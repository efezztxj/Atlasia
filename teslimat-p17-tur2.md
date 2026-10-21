# Teslimat P2 — P17-Tur2 + P16 #1/#2

| Alan | Değer |
|---|---|
| Görev | [P2] P17-Tur2 (onaylı kaydet akışı, gizlilik, önizleme, yayın uçtan uca) + P16 #1 (yerel publish) + P16 #2 (beğeni sayacı) |
| Dal | `arena/6a07c7ce-atlasia` (bu oturumun dalı) |
| Taban | `origin/main` = **`447fbaa`** — `Merge pull request #33 …` |
| Taban doğrulaması | `src/lib/firestoreValue.ts` **var**; `src/lib/routeData.ts` içinde `toFirestoreRoute` **var** (`:45`, `:225`) → görev başlatıldı |
| Deploy / merge / `firebase deploy` | **Yapılmadı** (kullanıcı onayına bırakıldı) |

## 1. Taban ve dal

```
$ git fetch origin && git log --oneline -3 origin/main
447fbaa Merge pull request #33 from efezztxj/arena/54093975-atlasia

$ git status --short --branch
## arena/6a07c7ce-atlasia
```

Not: sandbox klonu **shallow** (`git rev-parse --is-shallow-repository` → `true`, `origin/main` derinliği 1).
Bu yüzden PR #31/#32 merge commit'leri `git log`'da görünmüyor; etkileri dosyalarda doğrulandı:
`firestoreValue.ts` (`withoutUndefined`, `isPermissionDenied`), `routeData.ts` (`toFirestoreRoute` /
`fromFirestoreRoute` / `coordsPolyline`), `readRouteIfVisible` (permission-denied → `null`).

PR #30'daki `TrackRecorderPanel` / `useTrackRecorder` **yalnız fikir kaynağı** olarak okundu
(`git fetch origin pull/30/head` → `0a315d0`). `trackDraft`, `trackPrivacy`, `TrackRibbonPreview`
main'e göre **sıfırdan ve testli** yazıldı; PR #30'un sürümleri kopyalanmadı.

## 2. Kabul maddesi → dosya/test → durum

| # | Kabul maddesi | Dosya / test | Durum |
|---|---|---|---|
| 1 | "Bitir" ham izi buluta **yazmaz**; taslak + önizleme gösterilir; "Hesabıma kaydet" `createTrack` çağırır; "Vazgeç" taslağı atar | `hooks/useTrackRecorder.ts` (`finish` → yalnız taslak, `save` → yazma), `components/TrackRecorderPanel.tsx`; testler: `components/TrackRecorderPanel.test.ts` (5), `hooks/useTrackRecorder.test.ts` (13) | ✅ |
| 2 | `cloudAccount` koruması **korunur**: cihaz hesabında kaydet düğmesi yok, açıklama var | `TrackRecorderPanel.tsx` (`canSave = firebaseConfigured && cloudAccount`, `role="note"`); test: "cihaz hesabında kaydet düğmesi YOK; nedeni yazılı" | ✅ |
| 3 | `trackRuleViolation` kaydetmeden **önce** çalışır; hata Türkçe ve görünür | `useTrackRecorder.save` (ön denetim) + panel `role="alert"`; testler: "save yalnız açık çağrıda … kural ön denetimini uygular", "kaydetme hatası görünür kalır" | ✅ |
| 4 | Ad çözümlemesi (`reverseName`) önizleme için yapılır; ağ hatasında taslak yine açılır, adlar boş kalır | `useTrackRecorder.finish` (`try/catch` + `console.warn`); test: "ad çözümlemesi ağ hatası verse de taslak açılır" (`Durak 1`) | ✅ |
| 5 | Sayfa kapanırsa/yenilenirse kaydedilmemiş taslak: **karar** ve gerekçe | `utils/trackDraft.ts` (`DRAFT_RETENTION = "memory"`, `DRAFT_LOSS_NOTICE`); test: `utils/trackDraft.test.ts` | ✅ **Taslak atılır (yalnız bellek)** — gerekçe §6.1 |
| 6 | Yayın/paylaşımda ham iz (`tracks`) **asla** paylaşılmaz; yalnız taslak rota | `utils/trackPrivacy.ts` (`routeLeaksRawTrack`, `resolveTrackShare`), `hooks/useCollections.tsx` (tek gizlilik kapısı); testler: `utils/trackPrivacy.test.ts` (11), `useCollections.local.test.ts` (ham iz reddi) | ✅ |
| 7 | Başlangıç/bitiş gizleme seçeneği + varsayılan gerekçesi | `trimRouteEnds`, `DEFAULT_TRIM_METERS = 0`, `MAX_TRIM_METERS = 2000`; testler: "baştan ve sondan N metre kırpar", "kırpılan bölgedeki durakları düşürür" | ✅ |
| 8 | Saf fonksiyon + test | `trackPrivacy.ts` (ağ/saat/React yok); 11 test | ✅ |
| 9 | `TrackRibbonPreview`: taslak geometrinin önizlemesi, mevcut desen, "navigasyon" iddiası yok | `components/TrackRibbonPreview.tsx`; test: `TrackRibbonPreview.test.ts` (3) — `navigasyon`/`yol tarifi` metni **yok** | ✅ |
| 10 | `ElevationProfile` bağlamak **isteğe bağlı** | — | ⏭️ **Yapılmadı** — gerekçe §6.2 |
| 11 | Yayın uçtan uca: taslağı yayınla → `getPublishedRoute` → bacaklar `coordsPolyline` ile açılır (#32) | `lib/routeData.io.test.ts` → "yürüyüş taslağı yayın → geri okuma (uçtan uca)" | ✅ |
| 12 | `App.tsx` ölü `permission-denied` dalı kaldırılır; mesajlar değişmez; testle kilit | `src/App.tsx:187`, yeni `lib/publishedRouteOpen.ts`; test: `publishedRouteOpen.test.ts` (5) | ✅ |
| 13 | P16 #1: `useCollections.publishRoute` yerel modda bulut zincirini **çağırmaz**; Türkçe mesaj; regresyon testi | `useCollections.tsx` (`if (!firebaseConfigured)` → cihazda sakla + açık hata); test: `useCollections.local.test.ts` "P16 #1: …" | ✅ |
| 14 | P16 #2: `toggleLike` `likedBy` ile sayacı tutarlı tutar; sayaç başka yerde hesaplanıyorsa kanıtla + kilitle | Sayaç **UI'da hesaplanıyor**: `utils/likes.ts` `totalLikes` = `likes` (taban) + benzersiz `likedBy`; `SocialPanel.tsx:300` kullanır. `toggleLike` artık `toggleLikedBy` ile **tekilleştirir** ve `likes`'i artırmaz; testler: `useAtlasData.test.ts` "P16 #2: …", `likes.test.ts` (4) | ✅ (düzeltme: tekilleştirme; sayaç `totalLikes`'ta) |

## 3. Değişen dosyalar (20)

**Yeni üretim kodu (5):**

| Dosya | Ne yapar |
|---|---|
| `src/utils/trackPrivacy.ts` | Ham iz paylaşılmaz denetimi (`routeLeaksRawTrack`), uç kırpma (`trimRouteEnds`, varsayılan 0 m / sınır 2000 m), yayın kararı (`resolveTrackShare`: açık eylem + paylaşım onayı + sızıntı reddi) |
| `src/utils/trackDraft.ts` | Kaydedilmemiş taslak politikası (`DRAFT_RETENTION = "memory"`, `DRAFT_LOSS_NOTICE`) + panel özeti (`summarizeDraft`, `draftSummaryText`) |
| `src/components/TrackRibbonPreview.tsx` | Taslak geometrinin SVG şerit önizlemesi (navigasyon iddiası yok, boş geometride açıklama) |
| `src/lib/publishedRouteOpen.ts` | `?route=` açılışının tek kapısı; `null` → "bulunamadı", hata → ağ mesajı; ölü `permission-denied` dalı yok |
| `src/components/TrackRecorderPanel.test.ts` | Panel akış testleri (aşağıda liste) |

**Değişen üretim kodu (6):**

| Dosya | Değişiklik |
|---|---|
| `src/hooks/useTrackRecorder.ts` | `finish()` **yalnız taslak** üretir (createTrack yok), durum `finishing`; yeni `save(track)` tek yazma kapısı + kural ön denetimi; `reverseName` hatasında ad null, taslak korunur |
| `src/components/TrackRecorderPanel.tsx` | Onaylı akış: Bitir → taslak + önizleme; "Hesabıma kaydet" → `createTrack`; "Vazgeç" → at; cihaz hesabında düğme yok + açıklama; kayıp uyarısı |
| `src/App.tsx` | `getPublishedRoute` etrafındaki ölü `permission-denied` dalı kaldırıldı, `openPublishedRoute` kullanılıyor (yerleşim/tasarım değişmedi) |
| `src/hooks/useCollections.tsx` | Yerel modda bulut zinciri çağrılmıyor (cihazda sakla + Türkçe mesaj); yayın öncesi `resolveTrackShare` gizlilik kapısı |
| `src/hooks/useAtlasData.ts` | `toggleLike` → `toggleLikedBy` (tekilleştirme, `likes` tabanına dokunmaz) |
| `src/utils/likes.ts` | Yeni `toggleLikedBy` (benzersiz üyelik, boş kimlik yok) |

**Test dosyaları (9):** `trackPrivacy.test.ts` (11), `trackDraft.test.ts` (3),
`TrackRibbonPreview.test.ts` (3), `TrackRecorderPanel.test.ts` (5), `publishedRouteOpen.test.ts` (5),
`likes.test.ts` (+4), `useTrackRecorder.test.ts` (9→13), `useCollections.local.test.ts` (5→6),
`useAtlasData.test.ts` (6→7), `routeData.io.test.ts` (23→24).

**Dokunulmayanlar:** `src/utils/track.ts`, `src/utils/elevation.ts`, `src/components/ElevationProfile.tsx`,
`src/components/RouteEditor.tsx`, `src/lib/routeData.ts`, `src/types.ts`, `MapView.tsx`,
`package.json`/`package-lock.json`, `firestore.rules`, `storage.rules`, `public/sw.js`, `C1 Web Push`.
`firestore.rules` değişmedi → kural deploy'u gerekmez.

## 4. Kapı çıktıları (bu tur, gerçek)

| Komut | Sonuç |
|---|---|
| `npm ci` | ✅ |
| `npm run typecheck` | ✅ 0 hata |
| `npm run lint` | ✅ 0 hata / 0 uyarı (`--max-warnings=0`) |
| `npm run test:run` | ✅ **80 dosya / 478 test** |
| `npm run test:scripts` | ✅ 7/7 + 6/6 + 6/6 |
| `npm run build` | ✅ "Bundle bütçesi içinde." |
| `npm run audit:check` | ✅ "Üretim bağımlılıklarında bilinen açık bulunmadı." |
| `git diff --check` | ✅ temiz |
| `npm run test:rules:emulator` | ⚠️ **çalıştırılamadı** — `Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.` (kural dosyası değişmedi; kanıt PR CI'da) |
| PR CI | ⏳ Bu teslimatta PR açıldıktan sonra okunacak; CI yeşil olmadan "bitti" denmez |

## 5. Eski kodla düşen testlerin kanıtı

Yöntem: ilgili üretim dosyası geçici olarak `git show HEAD:<dosya>` ile geri kondu, test koşuldu,
sonra yeni dosya geri getirildi. Her seferinde ağaç yeniden yeşil (bkz. §4).

**a) P16 #1 — `useCollections.tsx` eski sürüm:**

```
$ git show HEAD:src/hooks/useCollections.tsx > src/hooks/useCollections.tsx
$ npx vitest run src/hooks/useCollections.local.test.ts
  × P16 #1: yerel modda publish bulut zincirini ÇAĞIRMAZ; cihazda saklar ve Türkçe neden söyler
  × ham iz alanları taşıyan rota yayına sokulmaz (yerelde de)
  AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
  Tests  2 failed | 4 passed (6)
```
Yeni kodla: **6/6 geçti** (bulut fonksiyonları hiç çağrılmıyor, rota cihazda saklanıyor).

**b) P16 #2 — `useAtlasData.ts` eski sürüm:**

```
$ git show HEAD:src/hooks/useAtlasData.ts > src/hooks/useAtlasData.ts
$ npx vitest run src/hooks/useAtlasData.test.ts
  × P16 #2: beğeni sayacı likedBy ile tutarlı kalır (seed taban + benzersiz üyelik, çift sayım yok)
  AssertionError: expected [ 'c-eski', 'c-eski', 'c-zc1h4w5ma0g' ] to deeply equal [ 'c-eski', 'c-zc1h4w5ma0g' ]
  Tests  1 failed | 6 passed (7)
```
Eski kod `likedBy`'daki tekrarları koruyordu; `totalLikes` `Set` kullandığı için sayaç ile
üyelik listesi ayrışıyordu. Yeni kodla **7/7 geçti**.

**c) Onaylı kaydet akışı — `useTrackRecorder.ts` + `TrackRecorderPanel.tsx` eski sürümleri:**

```
$ git show HEAD:src/hooks/useTrackRecorder.ts > src/hooks/useTrackRecorder.ts
$ git show HEAD:src/components/TrackRecorderPanel.tsx > src/components/TrackRecorderPanel.tsx
$ npx vitest run src/hooks/useTrackRecorder.test.ts src/components/TrackRecorderPanel.test.ts
  × Bitir createTrack ÇAĞIRMAZ; taslak ve önizleme gösterir
  × Hesabıma kaydet createTrack'i tam bir kez çağırır ve taslağı rotaya devreder
  × cihaz hesabında kaydet düğmesi YOK; nedeni yazılı
  × Vazgeç taslağı atar, önizlemeyi temizler ve yazma yapmaz
  × kaydetme hatası görünür kalır, taslak ekranda durur
  × finish … taslak rota üretir; buluta YAZMAZ
  × save bulut reddini aynen yüzeye çıkarır; …
  × save yalnız açık çağrıda createTrack yapar ve kural ön denetimini uygular
  × ad çözümlemesi ağ hatası verse de taslak açılır, adlar boş kalır
  × kayıt sırasında durum finishing olur, taslak hazır olunca idle'a döner
  Tests  10 failed
```
Yeni kodla **18/18 (13 + 5) geçti**.

**d) Ölü `permission-denied` dalı (#12):** Bu bir hata düzeltmesi değil, **ölü kod kaldırma**dır;
eski `App` bileşenini render ederek "eski kodla düşen test" üretmek mümkün değil (App; harita +
Firebase + tarayıcı API'lerine bağlı, test ortamında kurulmuyor). Bunun yerine kanıt iki katmanlı:
- `lib/routeData.ts` permission-denied'i **null**'a çeviriyor (`readRouteIfVisible`), yani eski
  `catch` dalı hiç çalışmıyordu.
- `publishedRouteOpen.test.ts` "permission-denied artık özel-rota mesajı üretmez" testi, eski
  eşlemeyi (`"Bu rota özel. Yalnız sahibi açabilir."`) **yasaklıyor**; eski mantık bu testi düşürürdü.
  Bu sınır teslimatta dürüstçe belirtildi.

## 6. Açık noktalar ve kullanıcı kararı gerekenler

1. **Kaydedilmemiş taslak atılır (bilinçli).** Ham konum geçmişi, kullanıcı "Hesabıma kaydet"
   demeden localStorage/sessionStorage gibi kalıcı bir yere **yazılmaz**. Gerekçe: tarayıcı
   depolaması yedektir, başka sekmelerce okunabilir; izin habersiz kalıcılaşması gizlilik
   sözleşmesini bozar. Karşılığında kullanıcıya kayıp uyarısı gösterilir (`DRAFT_LOSS_NOTICE`).
   Alternatif (oturum başına `sessionStorage`, açık onaylı "cihazda sakla" düğmesi) ürün kararı
   gerektirir; bu turda eklenmedi.
2. **`ElevationProfile` bağlanmadı** (görevde isteğe bağlı). Bağlamak `SiteTourPanel.tsx` /
   `MapView.tsx` (DEM örnekleyici) dosyalarına dokunmayı gerektiriyor; bu dosyalar benim sahiplik
   listemde değil. Ayrıca `ElevationProfile` main'de hâlâ hiçbir yerde render edilmiyor.
   **Dosya talebi:** `SiteTourPanel.tsx` + `MapView.tsx` (tek satır: `terrain` prop'u).
3. **`resolveTrackShare` kullanıcı arayüzünde görünmüyor.** `shareConsent` alanı API'de var ama
   `RouteEditor`'da "paylaşım onayı" kutusu yok; bugün yayın düğmesi (açık eylem) onay sayılıyor
   (`useCollections.publish` → `shareConsent: true`). Kutu eklemek tasarım değişikliği olurdu.
4. **`MAX_TRIM_METERS = 2000`** keyfi üst sınırdır; ürün isteği gelirse ayarlanır. Kırpma bugün
   yalnız API'den kullanılabilir (varsayılan 0 m).
5. **`test:rules:emulator` yerelde çalıştırılamadı** (Java 21 yok). `firestore.rules` değişmedi;
   kanıt PR CI'da.
6. Shallow klon nedeniyle PR #31/#32 merge commit'leri `git log`'da görünmüyor; etkileri dosyalarda
   doğrulandı (§1).

## 7. Canlıda elle doğrulanması gerekenler

1. Telefonla **5 dakikalık yürüyüş kaydı**: kayıt sırasında canlı çizgi ve mesafe güncelleniyor mu?
2. **Bitir**: taslak + şerit önizleme görünüyor mu; **hiçbir yazma olmuyor** mu
   (Firebase konsolunda `tracks` belgesi oluşmamalı)?
3. **Hesabıma kaydet**: `tracks/{id}` yalnız sahibinde oluşuyor mu; mesaj "İz hesabına özel olarak
   kaydedildi. Yayınlanmadı." mı?
4. **Yayınla**: `RouteEditor` → bağlantı görünürlüğü → bağlantıyı **başka tarayıcıda/cihazda** aç;
   rota haritada çiziliyor mu (bacaklar `coordsPolyline`'dan geri açılıyor mu)?
5. **Cihaz hesabıyla** giriş: "Yürüyüş kaydı" panelinde kaydet düğmesi **görünmemeli**, açıklama
   metni görünmeli.
6. **Sayfa yenileme** (taslak ekranındayken): taslak kaybolmalı, uyarı metni görünmüş olmalı.
7. Yerel mod (`VITE_FIREBASE_*` boş): `publishRoute` buluta gitmemeli, rota cihazda kalmali ve
   "Bulut hesabı bağlı değil…" mesajı görünmeli.
8. Sosyal akış: bir gönderiyi beğen/bırak; sayaç 1 artıp 1 azalmalı (çift sayım olmamalı).

## 8. PR ve CI

| Alan | Değer |
|---|---|
| PR | **#35** — başlık `[P2] P17-Tur2 + P16 #1/#2` |
| Gövde | `teslimat-p17-tur2.md` yolu yer alıyor |
| CI | ✅ **yeşil** — `Security, typecheck, lint, test and build` **pass (58 s)**; `Cloudflare Pages` **pass** (preview) · run `39679589464` |
| Değişen dosya sayısı | PR'da 21 dosya (20 kod/test + bu teslimat) |
| Merge / deploy | **Yapılmadı** (kullanıcı onayı) |

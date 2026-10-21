# Teslimat — P2 (ROTA, İZ, PAYLAŞIM, APP) — 2026-10-21

Dal: `arena/ff077c3c-atlasia` · PR: (aşağıda "PR / CI") · Deploy yapılmadı (karar kullanıcıda).

## Baz

- Başlangıç: `origin/main` @ `0ad774f` (yetim kök). Madde 0 uyarınca PR #35
  (`arena/6a07c7ce-atlasia` @ `eb6a4d4`) dala **merge** edildi (`86e5e4c`);
  ortak ata boş olduğu için `--allow-unrelated-histories` gerekti, içerik
  kesişimi ortak kök `447fbaa` üzerinden kanıtlandı: PR #35 = 21 P2 dosyası +
  teslimat, o sıradaki main ilerlemesi = 4 P1 dosyası, **kesişim boş küme**.
  13 add/add çakışması: CHANGELOG/ROADMAP `--ours`, 11 src dosyası `--theirs`.
- Teslim öncesi güncel main tekrar merge edildi (`cf93e13`, çakışmasız;
  main yalnız ROADMAP + görev dokümanlarını değiştirmişti, kesişim boş).
- Teslim anında `git log --oneline -3 origin/main`:

```
c7c30c9 Merge pull request #41 from efezztxj/arena/838cf337-atlasia
c844cfc docs(gorevler): Tur 4 P1–P4 promtları (pilot öncesi kalan işler)
b6922d1 Merge pull request #39 from efezztxj/arena/638febfd-atlasia
```

## Madde → dosya/test → durum

| # | Konu | Dosyalar / commit | Test | Durum |
|---|---|---|---|---|
| 1 | Beğeni çift sayım denetimi | `src/utils/likes.test.ts` · `089a02d` | 10 test (bulut/yerel ayrı) | **Hata yok; sözleşme kilitlendi.** `firestore.rules`: create `likes==0 && likedBy==[]`, update yalnız `likedBy` alanı. Bulut yazımı yalnızca `arrayUnion/arrayRemove` (`firestoreData.ts`), yerel `toggleLike` yalnız `likedBy` değiştirir. `likes` her iki modda da kurulum gereği 0; `totalLikes = likes + \|likedBy\|` çift saymaz. |
| 2 | P20 paylaşım bağlantısı | `src/utils/shareLink.ts` (yeni), `RouteEditor`, `App` (`?r=`) · `7cb47e3`, `e3d2b82` | `shareLink.test.ts` 15 test | **Yapıldı.** KARAR-2: link içi taşıma, var olan `?route=` yanına EKLENDİ. `v1.` + base64url(zlib(JSON)), fflate dinamik import (bütçe), 12.000 karakter bağlantı / 512 KB yük sınırı ve "çok büyük" hatası, bozuk/kurcalanmış + bilinmeyen sürüm ayrımı, beyaz-liste doğrulama, önizleme → açık "kaydet". Ham iz bağlantıya girmez (trackPrivacy kapısı), fotoğraf düşürülür ve söylenir. Türkçe + emoji durak adları round-trip testli. |
| 3 | Durak bazlı bacak bölme | `src/types.ts` (isteğe bağlı `startPointIndex/endPointIndex`), `src/utils/track.ts` · `3446719` | `track.test.ts`, `trackDraft.test.ts`, `useTrackRecorder.test.ts` | **Yapıldı.** `buildTrackDraft` durak köşe-aralıklarını yazar, duraktan durağa bacak üretir (ortak sınır köşesi, mola bacak süresine girmez). Eski izlerde tek bacak + `leg-{id}` kimliği aynen. Firestore tarafı `coordsPolyline` ile çok bacağa zaten hazırdı; **kural değişikliği gerekmedi** (`validTrackDocument` durak alanlarını kısıtlamıyor) → P4'e talep yok. |
| 4 | Paylaşım onayı (shareConsent) | `useCollections.tsx` (zorunlu parametre), `RouteEditor` (onay kutusu) · `e3d2b82` | bulut/yerel hook + `RouteEditor.test.ts` 4 test | **Yapıldı + hata düzeltildi.** Önceden onay `useCollections` içinde sessizce `true` yazılıyordu. Artık `publishRoute(route, visibility, shareConsent)` zorunlu; kutu yalnız `visibility≠private` iken, işaretsiz başlar, rota değişince sıfırlanır. Aynı kapı `?r=` bağlantısı için de geçerli (KARAR-6). |
| 5 | Kaydedilmemiş taslak + kırpma varsayılanı | — (karar maddesi) | — | **Karar verildi:** KARAR-3 (taslak bellekte kalır), KARAR-4 (kırpma 0 m kalır). |
| 6 | P17 saha protokolü | `docs/teslimatlar/saha-test-formu-p17.md`, `src/utils/trackFieldCheck.ts` · `8702544` | `trackFieldCheck.test.ts` 5 test | **Yapıldı.** 7 senaryo (yürüyüş, mola, sinyal kaybı, şehir içi), hangi değerin nasıl ölçüldüğü, sonuç tablosu. Saf yardımcı saha ölçümünü fixture tablosuyla karşılaştırır (±%15 mesafe, ≤10 m sapma, durak birebir); bilinmeyen/eksik senaryoyu yutmaz. Formun doldurulması kullanıcıda. |
| 7 | P16 #5 useGeolocation | `src/hooks/useGeolocation.ts` · `e4df2fd`, `67acb0a` | 2 regresyon testi | **Hata vardı, düzeltildi.** Geçersiz ilk ölçüm sonrası durum `ready` ama `fix===null` olabiliyordu. Artık `ready` yalnız gerçek fix ile; aralık/zaman doğrulaması `onFix` yolunda da var. |
| 8 | App.tsx temizliği | `src/App.tsx`, `src/lib/firestoreValue.ts` · `4b1ee9f` | `firestoreValue.test.ts` 6 test (metin kilidi) | **Yapıldı.** `placeDeleteErrorMessage` App içinden `firestoreValue`'ya taşındı (4 metin dalı birebir, testle kilitli), `discoveryPanelVisible` ölü takma adı kalktı. Kullanılmayan import/ölü dal: tsc+lint temizdi, başka ölü kod bulunmadı. Davranış değişmedi. |
| 9 | Yerel mod envanteri | `App.tsx`, `RecordsDock` · `f4def4f`, `f8b06d8` | `RecordsDock.test.ts`, hook testleri | **Tablo aşağıda; sessiz hatalar düzeltildi.** Kalan tek yanlış-gerekçeli metin DOSYA TALEBİ-2. |
| 10 | Rota keşfi (Adım 6) | `src/lib/routeData.ts`, `RecordsDock` · `f4def4f` | `routeData.discovery.test.ts` 7, `RecordsDock.test.ts` 3 | **Yapıldı.** Kanıt: liste `visibility=="public"`, sorgu sınırlı. `PUBLIC_ROUTE_PAGE_SIZE=40` ihraç edildi + sınır dolunca UI notu; saf `filterPublicRoutes/sortPublicRoutes` (kaydedilen/yeni/kısa/uzun) hem sunucu listesinde hem UI'da. Sunucu sayfalama = DOSYA TALEBİ-1. |
| 11 | Hava durumu (Adım 15) | `src/utils/weather.ts` · `8b1151a` | fixture'lı 8 yeni test (toplam 15) | **Yapıldı + hata düzeltildi.** Toplu önbellek aynı koordinata farklı kimlikle gelen isteğe eski kimlikli veri döndürüyordu. Artık nokta bazlı önbellek (50 sınır), yalnız eksikler çekilir, kimliğe yeniden eşlenir; hatalar Türkçe, 8 sn zaman aşımı dış iptalden ayırt edilir. |
| 12 | "Cihazlar arası senkron yok" borcu + Karar (c) | `useCollections.tsx`, `App.tsx` · `2b3e142`, `f8b06d8` | cihaz-hesabı regresyon testi + `isCloudAccount` doğruluk tablosu | **Borç kaydı bayat çıktı; gerçek hata düzeltildi.** Bulut hesabı koleksiyonları `users/{uid}/savedPlaces\|savedRoutes` + `routes/{id}` ile zaten eşitleniyor. Asıl boşluk: cihaz hesabı (yapılandırılmış derlemede) yetkisiz Firestore yoluna girip koleksiyonunu sessizce kaybediyordu — hook'ta ve App veri katmanında. `isCloudAccount = firebaseConfigured && backend==="firebase"` tek koşul; cihaz hesabı bilinçli cihazda, yayın açık mesajla reddedilip cihaza kaydedilir. **Yeni koleksiyon/kural yok** → P4'e talep yok. |
| 13 | ROADMAP/CHANGELOG önerisi | bu belge (aşağıda) | — | P1 uygular. |

## Madde 9 — yerel/cihaz modu envanteri

`firebaseConfigured=false` veya cihaz hesabı (`backend==="device"`) durumu:

| Özellik | Durum |
|---|---|
| Cihaz hesabıyla giriş, yerel akış (yer/gönderi/hikâye okuma-yazma) | **Çalışır** (App veri katmanı bu PR'da düzeltildi; önce yazmalar Firestore'a gidip kayboluyordu) |
| Koleksiyonlar (kaydedilen yer/rota) | **Çalışır** (bu PR'da düzeltildi; cihazda `atlasia.member.{uid}.*`) |
| Harita, arama, hava durumu, yükseklik profili | **Çalışır** (Firebase'e bakmaz; DEM yoksa "bilinmiyor") |
| Yürüyüş kaydı + taslak özeti | **Çalışır** (taslak bellekte — KARAR-3) |
| Link içi paylaşım (`?r=`) | **Çalışır** (bu PR; hesapsız paylaşımın yolu budur) |
| Engel listesi / güncellik doğrulaması | **Boş listeye düşer** (db yoksa no-op; sessiz ama zararsız — DOSYA TALEBİ-3, düşük öncelik) |
| Rota yayınlama, izi hesaba kaydetme | **Açık mesaj**: "Bulut hesabı bağlı değil…" |
| Keşif sekmesi, özel izler sekmesi | **Açık mesaj** (bu PR): "…bulut hesabıyla çalışır / bulut hesabına kaydedilir" |
| Paylaşılan rota (`?route=`) | **Yanlış gerekçe**: yerel modda "bulunamadı" der; sebep yapılandırma → DOSYA TALEBİ-2 |
| Genel durum | App açılışında "Firebase yapılandırması eksik, yerel veri kullanılıyor." (yalnız yapılandırmasız derlemede) |

## KARAR kayıtları

- **KARAR-1 (birleştirme tekniği):** PR #35 `--allow-unrelated-histories` ile merge edildi. | GEREKÇE: main yetim kök; rebase/force yasak; kesişim `447fbaa` üzerinden boş kanıtlandı. | ALTERNATİF: cherry-pick (reddedildi — tarih kopar, brief merge diyor). | GERİ ALMA: dal merge edilmezse etkisizdir.
- **KARAR-2 (P20 yöntemi):** Link içi taşıma (`?r=v1.…`) var olan `?route=` (unlisted) bağlantısının **yanına eklendi**, yerine geçmedi. | GEREKÇE: `?route=` bulut hesabı + Firestore ister; link içi yerel/cihaz kullanıcısına da paylaşım verir, sunucuya yazmaz. zlib, kurcalama tespiti için (ham deflate değil); fflate zaten bağımlılıktı, dinamik import ile bütçe korundu. | ALTERNATİF: yalnız `?route=` (reddedildi — yerel mod hedefi karşılanmaz). | GERİ ALMA: RouteEditor'daki düğmeyi kaldırmak yeterli; `?r=` çözümleyici geriye uyumluluk için kalabilir.
- **KARAR-3 (taslak politikası):** Kaydedilmemiş kayıt taslağı **bellekte kalır** (`DRAFT_RETENTION="memory"` değişmedi). | GEREKÇE: taslağı diske yazmak ham GPS'i onaysız kalıcılaştırmaktır (ROADMAP §5.4); mevcut akış "kaydedilmezse silinir" uyarısını açıkça gösteriyor. | ALTERNATİF: localStorage taslağı (kayıp riski azalır, gizlilik yüzeyi büyür). | GERİ ALMA: küçük iş; sabit + panel metni + kayıt senaryosu.
- **KARAR-4 (kırpma varsayılanı):** `DEFAULT_TRIM_METERS=0` kalır. | GEREKÇE: sıfırdan büyük varsayılan, kullanıcının gerçek baş/sonunu sessizce siler ve mesafeyi haber vermeden değiştirir; kırpma paylaşım anında açıkça seçilebilir durumda. | ALTERNATİF: 50–100 m varsayılan (ev konumu gizleme). | GERİ ALMA: tek sabit; UI önizlemesinde gösterilmesi önerilir.
- **KARAR-5 (keşif sınırı):** Liste 40 kayıtla sınırlı, sıralama istemcide; sınır kullanıcıya notla söylenir. | GEREKÇE: ücretsiz kota + composite index yok; dürüst sınır, sessiz kesmeden iyidir. | ALTERNATİF: sunucu imleçli sayfalama (index ister). | GERİ ALMA: DOSYA TALEBİ-1 karşılanınca.
- **KARAR-6 (onay kapsamı):** shareConsent kapısı Firestore yayını **ve** `?r=` bağlantısı için aynı kutuyla işler. | GEREKÇE: link içi paylaşım da paylaşımdır; gizlilik kapısı (`resolveTrackShare`) zaten onaysız non-private paylaşımı reddediyor. | ALTERNATİF: ayrı kutu (gereksiz ikilik). | GERİ ALMA: RouteEditor bileşeni içinde yereldir.
- **KARAR-7 (Karar-c uygulaması):** Cihaz hesabı koleksiyonu buluta zorlanmaz; cihazda kalır, yayın açıkça reddedilir. | GEREKÇE: cihaz uid'si Firestore'da yetkisiz; yeni koleksiyon/kural bu turun ve P2 alanının dışında. Bulut hesabında senkron zaten vardı. | ALTERNATİF: cihaz hesabını buluta taşıma akışı (ayrı ürün işi). | GERİ ALMA: `isCloudAccount` koşulu tek noktada.
- **KARAR-8 (hava önbelleği):** Önbellek toplu anahtardan noktaya çevrildi. | GEREKÇE: toplu anahtar kimlik çakışması üretiyordu; durak bazlı çağrılar kısmen çakışır. | ALTERNATİF: anahtara kimlik eklemek (çakışan noktaları tekrar çeker). | GERİ ALMA: `weather.ts` içinde yereldir.

## DOSYA TALEPLERİ

- **DOSYA TALEBİ-1 (P4):** `firestore.indexes.json` | Keşifte sunucu sıralaması/sayfalama için `routes`: (`visibility==`, `publishedAt↓`) ve (`visibility==`, `saveCount↓`) composite index'leri | Öneri: index tanımı + `listPublicRoutes`'a `orderBy+limit+startAfter` geçişi (istemci tarafı hazır olunca P2 yapar).
- **DOSYA TALEBİ-2 (sahibi belirsiz — `src/lib/publishedRouteOpen.ts` sahiplik listesinde yok):** dosya | `?route=` yerel modda "bulunamadı" diyor ama sebep yapılandırma yokluğu | Öneri: `openPublishedRoute` içinde `!firebaseConfigured` dalı + ayrı mesaj ("Paylaşılan rotalar bulut yapılandırılınca açılır."). App tarafı `ROUTE_OPEN_MESSAGES`'i aynen gösterir; P2 dosyası olmadığı için dokunulmadı.
- **DOSYA TALEBİ-3 (düşük öncelik — `useBlocks.ts`, `useFreshness.ts`, `lib/moderation.ts`, `lib/verifications.ts`):** cihaz hesabında yetkisiz abonelikler denenip hata_callback ile boş listeye düşüyor | Öneri: aboneliklere `isCloudAccount` benzeri kapı; davranış bozulmuyor, yalnızca gereksiz ret/konsol gürültüsü kalkar.
- Bağımlılık talebi **yok**: fflate (`^0.8.3`) zaten `package.json`'daydı; ilk src kullanımı bu PR'da (dinamik import).

## Kalite kapısı (gerçek çıktılar)

Başlangıç durumu (baz, PR #35 merge sonrası): typecheck 0 · lint 0 · **80 dosya / 478 test**.

Teslim durumu (`f8b06d8`):

- `npm ci` — bazda çalıştı; `package.json` bu PR'da değişmedi.
- `npm run typecheck` — 0 hata.
- `npm run lint` — 0 sorun (`--max-warnings=0`).
- `npm run test:run` — **85 dosya / 540 test geçti** (+5 dosya, +62 test).
- `npm run test:scripts` — 7 + 6 + 6 geçti.
- `npm run build` — başarılı, **"Bundle bütçesi içinde."** (fflate tembel parçada).
- `npm run audit:check` — "Üretim bağımlılıklarında bilinen açık bulunmadı."
- `git diff --check` — temiz.
- `test:rules:emulator` — **gerekmedi**: `firestore.rules` bu PR'da değişmedi (baz `447fbaa` ile diff boş). Kural değişikliği gerektirmeyen tasarım özellikle seçildi (Madde 3, 12).

## Regresyon kanıtları (eski kodla düşen, yeni kodla geçen)

| Düzeltme | Kanıt |
|---|---|
| useGeolocation fix'siz `ready` (Madde 7) | 2 yeni test düzeltme öncesi FAIL, sonrası PASS (14/14). |
| Cihaz hesabı koleksiyonu (Madde 12) | "cihaz hesabı…" testi eski hook ile FAIL (abonelik deneniyor, yerel kayıt yok), yeniyle PASS (14/14). |
| Hava kimlik çakışması + hatalar (Madde 11) | Eski `weather.ts` (`git show`) ile 5 test FAIL, yenisiyle 15/15. |
| Onaysız yayın (Madde 4) | Eski imza onayı içeride `true` yapıyordu; yeni test `shareConsent=false` reddini bulut+yerelde kilitler. |
| App veri katmanı cihaz hesabı (Madde 9/12) | Koşul (`isCloudAccount`) doğruluk tablosuyla kilitli; RecordsDock testleri gerçek koşulla çalışır. **Dürüst not:** App bileşeninin kendi render testi repoda yok; dal seçimi kod incelemesi + tip kapısıyla doğrulandı, duman testi kullanıcı adımında. |
| Beğeni (Madde 1) | Hata olmadığı rules+yazma yolu kanıtıyla gösterildi; testler sözleşmeyi kilitler (kod değişmedi). |

## Açık noktalar

- PR #35 hâlâ açık; bu PR merge edilirse onun commit'leri zaten bu dalla girer → #35 kapatılabilir (kullanıcı kararı; geri dönüşü olmayan işlem yapılmadı).
- Keşif sunucu sayfalama: DOSYA TALEBİ-1 (P4).
- `?route=` yerel-mod metni: DOSYA TALEBİ-2.
- Saha formu gerçek cihazda doldurulacak; sonuçlar `checkFieldMeasurements` ile denetlenecek.
- `src/data/accessExample*`, `TrackRibbonPreview`, `elevation` tarandı; bu turda değişiklik gerektiren bulgu çıkmadı (elevation DEM yoksa dürüst "bilinmiyor" davranışı Madde 9'a işlendi).

## Kullanıcının elle yapacakları

1. PR'ı inceleyip merge kararı vermek (merge = Cloudflare prod deploy tetikler; bu teslimatta deploy YOK).
2. Merge sonrası duman testleri: (a) cihaz hesabıyla giriş → iz ekle ("bu cihazdaki haritana" mesajı) → koleksiyona kaydet → sayfayı yenile, kayıt duruyor mu; (b) bir rotadan `?r=` bağlantısı üretip gizli pencerede aç → önizleme + kaydet; (c) keşif sekmesi sıralaması.
3. `docs/teslimatlar/saha-test-formu-p17.md` ile gerçek saha turu.
4. #35'i kapatmak (istersen).

## ROADMAP / CHANGELOG önerisi (Madde 13 — P1 uygulasın)

ROADMAP:
- §9 borç listesindeki "rotalar localStorage'da, cihazlar arası senkron yok" satırı **kaldırılsın**; yerine: "Bulut hesabı koleksiyonları `users/{uid}` altında eşitlenir; cihaz hesabı Karar (c) gereği cihazda kalır. Koşul: `isCloudAccount`."
- Adım 6 (keşif): "İlk 40 kayıt (`PUBLIC_ROUTE_PAGE_SIZE`) istemci sıralamasıyla listelenir; sınır UI'da gösterilir. Sunucu sayfalama composite index bekler (P4 talebi)."
- Adım 15 (hava): "Durak varış saati tahmininde nokta bazlı 10 dk önbellek; ağ hataları Türkçe ve iptal/zaman aşımı ayırt edilir."
- P20 satırı: "`?r=v1.` link içi paylaşım eklendi (zlib+base64url, 12k karakter sınırı); `?route=` unlisted bağlantıyla birlikte çalışır."

CHANGELOG (kullanıcı dili):
- "Rotanı artık hesapsız da paylaşabilirsin: bağlantının içinde taşınan yeni paylaşım türü eklendi; bağlantı önizlemeyle açılır, kaydetmek senin seçimin."
- "Paylaşım onayı artık gerçek bir seçim: rota yayınlamadan önce açıkça onay vermen istenir."
- "Cihaz hesabıyla kullananların kaydettikleri artık sessizce kaybolmuyor; kayıtların cihazında kalır."
- "Yürüyüş kayıtlarında molalar arası bacaklar ayrı gösterilir; durak sayısı ve mesafe hesabı iyileşti."
- "Hava durumu tahminlerinde aynı noktaya ait verilerin karışması düzeltildi."

## PR / CI

- PR: (açılınca numarası buraya işlenecek)
- CI: (sonucu buraya işlenecek; kırmızıysa teslim tamamlanmış sayılmaz)

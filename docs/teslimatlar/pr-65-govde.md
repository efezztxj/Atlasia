## Ne değişti

Bu PR dört işi kapsıyor (tek dal — oturum tek dalda çalışır): **İŞ 1 (sosyal + kurallar)**, İŞ 5 (PWA), İŞ 4 (site turları), İŞ 2 (arayüz inceltmesi).

---

# İŞ 1 — Sosyal ve kurallar

## 1a · #55 sonrası denetim: gevşeme YOK

| Ölçüm | Değer | Kanıt |
|---|---|---|
| `allow … if true` (#55 öncesi, `52fb9ac2`) | **4** | `git show 52fb9ac2:firestore.rules` |
| Bugün (bu PR dahil) | **2** — yalnız `places` get ve `posts` get | `src/config/socialRulesContract.test.ts` kilitliyor |
| `if true` kaybolanlar | `stories` get → `storyLive()` (24 saat); `verifications` get → `signedIn()` | #55 + #62 |
| Ek sıkılaşma | `groups` list → `false`; grup kuruluşunda yalnız kurucu; ret kanıtı | #55/#62 |

**Bulunan gerçek hata (ve düzeltmesi):** `validVerification` belge kimliğini sınırlamıyordu → aynı kişi aynı yere sınırsız doğrulama yazabiliyordu (rozet/`count()` sayaçlarını şişirme yolu). Kural artık `verificationId == placeId + "_" + uid`; emülatör testi eklendi.

## 1b · `displayNameLower` önek araması
- Zaten vardı: `toLocaleLowerCase("tr")` (İ→i, I→ı), tek aralık sorgusu, `limit(20)`, kelime içi arama yok.
- Eklenen: adsız/"Gezgin" profiller gizlenir; **alanı olmayan eski profiller için güvenli geri dönüş** (oturumda okunan profiller bellekte, önek eşleşmesiyle sonuca katılır; belgeye yazma yok).
- `searchProfilesLocal`: `includes` → `startsWith` (uzak sorguyla aynı semantik).

## 1c · #61 ayıklama — parça parça

| #61 parçası | Durum | Kanıt / gerekçe |
|---|---|---|
| Koleksiyon izolasyonu (hesap değişiminde veri karışması) | **Taşındı** | `useCollections.tsx`: uid değişiminde state o kullanıcının anahtarından yeniden kurulur; yazma "hidrasyon anahtarı" eşleşmezse çalışmaz. `useCollections.isolation.test.ts` (2 test) |
| Instagram benzeri arama (debounce, son aramalar) | **Taşındı** | `useDebouncedValue` (350 ms) + `searchHistory` (uid başına 5 kayıt, cihazda) + `FriendsTab` şeridi — 9 test |
| Adsız/"Gezgin" profilleri aramada gizleme | **Taşındı** | `isPlaceholderProfile` + `searchUserProfiles` — 2 test |
| `verifications` okuması giriş şartlı | **Zaten main'de** | `firestore.rules:662` (#55 · Aşama 3-A) — tekrar taşınmadı |
| `notificationProof` (tip başına genel kanıt) | **Reddedildi** | Her tip için ayrı kanıt belgesi yeni koleksiyon/şema ister; #55'in `friend_declined` kanıtı zaten main'de ve çalışıyor. Genişletme kural yüzeyini büyütür → sonraki dalga |
| Kural gevşetme kilidi testleri | **Kısmen zaten var** | #63 genel kilidi getiriyor; bu PR sosyal yüzeye özgü `socialRulesContract.test.ts` (5 test) ekliyor — dosya çakışması yok |

#61 ve #51 **kapatılmadı**. Öneri: #51 → işlevi #62'ye taşındı, **kapatılabilir**; #61 → bu PR merge edildikten sonra kapatılsın (kalan tek parçası reddedilen `notificationProof`).

## 1d · Rozet / takip önkoşulu

**Doğrulama kimliği**
- `verificationDocId(placeId, uid)` → `{placeId}_{uid}`. İkinci doğrulamada önceki **kendi** belgesi silinip yenisi yazılır (kuralda `update` kapalı kaldığı için tek yol).
- Kural: `allow create` kimlik eşitliği ister; `update: false` ve sahip-silme aynı.
- **Eski `vr-…` belgeler bozulmaz:** okuma kimliğe bakmaz, silme `resource.data.uid` ile çalışır. `isLegacyVerificationId()` yalnız teşhis.

**Takip**
- `users/{uid}/following/{targetUid}`: yalnız sahibi yazar, `targetUid != uid` (kendini takip yok), şema yalnız `targetUid/targetName/since`, `since == request.time`, `update: false`.
- Takipçi sayısı: collection-group kuralı — `allow list` yalnız `resource.data.targetUid == request.auth.uid` kanıtıyla. **Bilinçli olarak `boundedList` yok**: `getCountFromServer` limit göndermez; sınır yerine kanıt (yalnız kendi takipçi listesi, `where` zorunlu).
- `src/lib/follows.ts`: `followUser`, `unfollowUser`, `subscribeFollowing`, `countFollowers`, `countFollowing` (Spark'ta çalışan `count()`). **Arayüz yok** (istenen).
- Rozet sayacı `countPlaceVerifications()`: `count()` + `limit(50)`; kural gevşetilmedi.
- `firestore.indexes.json`: `following.targetUid` COLLECTION_GROUP indeksi.

---

# İŞ 5 — PWA tamamlama
- `install`'daki **sessiz `skipWaiting()` kaldırıldı**; yeni SW bekler, `UpdateNotice` "Yenile" der → `SKIP_WAITING` → tek yenileme. `main.tsx`'e bağlı (`useServiceWorkerUpdate`).
- `manifest`: `shortcuts` (Keşfet / İz bırak / Profil) — hedefler gerçekten çalışıyor (`?tab=…` → panel açılır, parametre adresten silinir).
- Firebase/Auth/Firestore hiçbir önbellek listesinde değil; open-meteo/photon önbelleklenmiyor; karo LRU 500; `sw.js` no-cache — hepsi `pwaManifest.test.ts` (11 test) ile kilitli.

# İŞ 4 — Site turları
- Efes'e sabit kod kaldırıldı: `siteTourForPoint()` → konuma en yakın tur.
- **Priene** eklendi (4 durak; koordinatlar OSM düğümlerinden birebir: 3751926827, 919567612, 919567617, 4014933868).
- **Patika geometrisi doğrulanamadı** → `polyline` boş, `isRealPath()` **false**; harita çizgi çizmez. 2026-10-22: overpass-api.de `502 at capacity`, overpass.osm.ch veri döndürmedi, Wikidata SPARQL otomatik trafiği reddetti. **Uydurma yol yok.**
- Testler tek siteye sabit değil: sıra, saat artışı, koordinat, `tourGuide` uyumu, `isRealPath` sınıflandırması. Kaynak/ölçüt: `docs/icerik/site-turlari.md`.

# İŞ 2 — Arayüz inceltmesi
- `.gold-frame`: altın kenar + `!important` + `0 22px 54px .52` → nötr hairline + hafif gölge. Altın yalnız birincil eylemde (btn-gold, +, Atlas AI) ve seçili durumda (sekme hapı, segmented). Krem `#fffdf7` dokunulmadı.
- `blur(20px)`: `.glass-panel`, `.mobile-tab-bar` ve harita-üstü 11 yüzeyden kaldırıldı; görünüm opaklıkla korundu (alt çubuk .94 → .97).
- 360×640: 4 çakışma bulundu; harita düğmeleri 122 → **196 px**, açık panelde `+`/çip/düğmeler mobilde gizli. Dokunma alanları ve düzen değişmedi.
- `teslimat-ui-yenileme-2026-10-22.md` → `docs/teslimatlar/`.

---

## Varsayımlar
1. **Varsayım:** kural yayını istemci deploy'undan **sonra**: eski kural kimliği denetlemediği için yeni istemcinin `{placeId}_{uid}` yazımı eski kuralla da geçer; ters sıra eski istemcileri kırar.
2. **Varsayım:** `following` sayımında limit yerine `targetUid == kendi uid` kanıtı yeterli (toplama sorgusu limit göndermiyor).
3. **Varsayım:** son aramalar cihazda (Firestore'a yazılmadı) — gizlilik + kota.
4. **Varsayım:** adsız profil = tam olarak "Gezgin" ya da boş ad; "Gezgin Can" gizlenmez.
5. **Varsayım:** brifing 2–3 yeni ören yeri istiyor; kanıtlanabilen tek yer (Priene) eklendi, kalanlar uydurmamak için eklenmedi.
6. **Varsayım:** `?tab=` kısayolları yeni sayfa açmaz, var olan paneli açar.

## Doğrulama (yerel)
```
npm ci                        ✅ 365 paket, 0 açık
npm run typecheck             ✅ 0 hata
npm run lint                  ✅ 0 uyarı (--max-warnings=0)
npx vitest run                ✅ 115 dosya / 813 test
npm run test:scripts          ✅
npm run build                 ✅ bütçe içinde
npm run audit:check           ✅
npm run test:rules:emulator   ⚠️ sandbox'ta Java 21 yok → yerelde koşmadı; **CI'da geçti** (aşağı)
```

## PWA'da kalan sınırlar (Capacitor fazı)
Arka plan konumu yok · iOS'ta `beforeinstallprompt` yok · push yok · çevrimdışı yalnız kabuk + karo + saha paketi · derin bağlantı yok · zorunlu (kritik) güncelleme senaryosu tanımsız.

## Rules yayını gerekir mi?
**EVET.** Merge sonrası Console'da `main`deki `firestore.rules` yayınlanmalı. Yayın pasif kalırsa uygulama çalışır ama kimlik bağı ve takip kuralları devrede olmaz.

## Emülatör kural testleri (CI)
Bu ortamda Java 21 olmadığı için yerelde koşmadı; **CI'da koştu ve geçti**: run [39855376438](https://github.com/efezztxj/Atlasia/actions/runs/39855376438), adım *Firestore security rules tests* → `success` (iş: Security, typecheck, lint, test and build → `pass`, 1m6s). Böylece verifications kimlik bağı (`{placeId}_{uid}`), `update: false`, tekrar-doğrulama (sil + yeniden yaz), `following` yazma/okuma/silme ve collection-group `count()` kuralları gerçek emülatörde doğrulandı. Kalan bilinen risk yok. Cloudflare Pages önizlemesi bu gövde yazıldığında hâlâ `pending`.

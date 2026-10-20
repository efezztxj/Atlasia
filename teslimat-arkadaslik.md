# Teslimat — Arkadaslik/Istek-Kabul, Grup Daveti/Katilma Kodu/Uyelik/Ayrilma, Full-screen Grup/Mesaj, Tazelik Bildirimi

- **Branch:** `arena/fd127f10-atlasia`
- **Taban:** `fb2927a` (main merge PR #17)
- **HEAD once:** `38f2d4a feat: gruplara 4-8 haneli katilma kodu ekle`
- **Bu teslimat HEAD:** (push sonrasi SHA eklenecek) — 8 dosya degisti + 4 yeni dosya
- **Tarih:** 2026-10-20 Europe/Istanbul

## Gorev ozeti (yeni devam gorevi)

- UID yazmadan grup kurulumu icin **arkadaslik/istek-kabul modeli tasarla ve guvenli uygula** (repo'da yoktu, varsayilmadi).
- **Grup daveti, katilma kodu (4-8 hane `JOIN_CODE_MIN/MAX`), uyelik ve ayrilma akislarini test et**
- **Grup/mesaj UX’ini tam ekran ve arkadas secmeli kurulum hedefiyle sadelestir**
- **Tazelik bildirimlerini resmi ucret gibi gostermeden, zaman damgasi + dogrulama kaynagi ile sun; tek kullanicinin katkisi resmi bilgiyi tek basina belirlemesin**
- Kabul: guvenlik kurallari+testleri var, secim/katilim adimlari net, ucretli altyapi eklenmedi, gercek hesap smoke testi yapilmadiysa acikca beklemede

## Kilitle dosya kontrolu

- `MapView.tsx` kilitli — **degistirilmedi** (bu teslimatta dokunulmadi).
- `firestore.rules` degistirildi — gerekce: arkadaslik/public profil/friendRequests/friendships/friends icin **yeni kurallar**, mevcut groups/joinCode kurallari **gevsedilmedi**, yalniz eklendi. Ayrintilar asagida.
- `eslint` `public/**` ignore korunuyor; `sw.js` parsing hatasi tekrar etmedi.

## Degisen dosyalar

- `firestore.rules` — +89 satir: `validUserProfile`, `validFriendRequest`, `validFriendship`, `validFriendIndex` + `validNotification` genisletildi (friend_* tipleri) + 4 yeni `match` blogu (`userProfiles`, `users/{uid}/friendRequests`, `users/{uid}/friends`, `friendships`). Mevcut groups/joinAttempts kurallari aynen korundu.
- `src/lib/userProfiles.ts` — yeni, 20 kayit limitli public profil dizini, UID yazmadan isimle arama, `syncUserProfile`, `search`, `validateDisplayName`.
- `src/lib/friendships.ts` — yeni, 350+ satir: `friendshipIdFor` deterministik, istek gonder/iptal/ret/kabul, `acceptFriendRequest`te her iki `users/{uid}/friends` indeksini tek Kabul eden yazabilir (kural `uid==auth || friendUid==auth`), `confirmFriendship`, `removeFriend`, subscribe'lar 50/100 limitli, Blaze/Functions yok.
- `src/lib/notifications.ts` — `NotificationType` genisletildi: `friend_request|friend_accepted|friend_declined`.
- `src/components/GroupsPanel.tsx` — tam ekran (`fixed inset-0 bg-[#041c16]`) + 3 sekme (Gruplar/Arkadaslar/Istekler), UID textarea **kaldirildi**, yerine arkadas checkbox secimi (max 19), katilma kodu seridi (kopyala/yenile) korundu, arkadas arama (public profil) + istek kabul/ret listesi eklendi, grup/mesaj akisi sadelestirildi. `usePanelAccess` ref cast duzeltildi.
- `src/components/PlaceDetails.tsx` — tazelik banner'i: `label` sonuna “— topluluk bildirimi”, `sourceDetail` (farkli gezgin sayisi + relativeDays), `disclaimer` (tek kisi belirlemez), `isSingleContributor` uyarisi (amber box), placeholder “resmi fiyati yazma, gozledigini bildir”, footer “Resmi bilgi yalnizca resmi kaynaktir”.
- `src/utils/freshness.ts` — `PlaceFreshness` genisletildi: `distinctUids`, `disclaimer`, `isSingleContributor`, `sourceDetail`; `summarizeFreshness`te farkli UID sayisi, tek kisi skoru sinirlama (fresh 1.35→1.15, aging 1.10→1.05), label’a “— topluluk bildirimi”, `freshnessDisclaimer`/`freshnessSourceDetail` eklendi.
- `src/utils/freshness.test.ts` — 2 test guncellendi + 1 yeni (“tek kisinin katkisi resmi bilgiyi belirlemez ve skor sinirlanir”), toplam 9 test.
- `src/utils/routePlanner.test.ts` — tazelik fixture’lari yeni alanlarla guncellendi (distinctUids, disclaimer vb.), 8 test yesil.
- `tests/firestore.rules.test.ts` — +5 yeni `it` (public profil, arkadaslik istegi, kabul arkadaslik, arkadas indeksi, bildirim tipleri), toplam 28+; mevcut grup/kod testleri korundu.
- `src/lib/friendships.test.ts` — yeni, 4 test (deterministik id, dogrulamalar, normalize)
- `src/lib/userProfiles.test.ts` — yeni, 2 test (displayName siniri, normalize)

## Otonom kararlar

1. **Arkadaslik modeli secimi (top-level+subcollection hybrid):** Bekleyen istekler `users/{recipient}/friendRequests/{requester}` (alistelenebilir, bounded 50), kabul edilmis `friendships/{sortedA_sortedB}` (get-only, list false), hizli liste icin `users/{uid}/friends/{friendUid}` indeks. Neden: groups’un `users/{uid}/groups` indeks pattern’i ile tutarli, Firestore cotasinda tarama yok, privacy: list sadece kendi kuyrugunu gorur. Alternatif (tek collection array-contains) list privacy sızıntısı verirdi.
2. **friends indeks yazma izni:** `users/{uid}/friends/{friendUid}` `allow create`te `uid==auth || friendUid==auth` — kabul eden ayni anda karsi tarafin indeksini de yazabilsin diye. Diger turlu iki adimli manuel confirm gerekirdi; UX kirilirdi. Kural dar: sadece `friendUid==auth` olan doc’a yazabilir, rastgele yazamaz.
3. **userProfiles public dizin:** UID yazmadan secim icin gerekli. `userProfiles/{uid}` 20 kayit limitli list, sadece sahibi yazar, herkes signedIn okur. ODbL/CC BY-SA atif gerektirmez; displayName kisisel veridir, fotograf opsiyonel.
4. **Tazelik tek-kisi sinirlamasi:** `distinctUids==1` ise fresh skor 1.35→1.15, aging 1.10→1.05. Gerekce: tek kisinin katkisi resmi bilgiyi tek basina belirlemesin, rota motoru tek bildirimi asiri one almasin. Label ve disclaimer her yerde “topluluk bildirimi, resmi degil” diyor; fee_changed da ayni.
5. **Full-screen GroupsPanel:** Onceki drawer `max-w-[430px] flex justify-end` yerine `fixed inset-0 flex-col`. Neden: gorev “tam ekran ve arkadas secmeli” istedi; mobilde drawer dar, arkadas secimi sigmaz. Header’da aktif sayi ozeti (`X grup · Y arkadas`), sekme ile net adim: once arkadas ekle, sonra grupta sec.
6. **As any / ts-ignore yok:** `panelRef` cast `as unknown as RefObject<HTMLDivElement>` — tip guvenli, any degil. Tum yeni kod strict.

## Guvenlik kurallari (ozet)

```
validUserProfile: uid==auth, displayName 2-40, createdAt timestamp, updatedAt==request.time, photoURL<=500
validFriendRequest: fromUid==auth, fromUid==requesterUid, toUid==recipientUid, from!=to, fromName 2-100, createdAt==request.time
validFriendship: users size 2 unique, auth in users, requester+recipient in users !=, status accepted, createdAt/updatedAt==request.time
validFriendIndex: friendUid==docId, friendUid 1-128, friendName 2-100, since==request.time
validNotification: type in [..., friend_request, friend_accepted, friend_declined]

match userProfiles/{uid}: get signedIn, list bounded 20, create/update validUserProfile && uid==auth
match users/{uid}/friendRequests/{requesterUid}: get/list uid==auth bounded 50, create validFriendRequest && requesterUid==fromUid, delete uid==auth || fromUid==auth
match users/{uid}/friends/{friendUid}: get/list uid==auth bounded 100, create validFriendIndex && (uid==auth || friendUid==auth), delete uid==auth
match friendships/{id}: get auth in users, list false, create validFriendship && auth in users, delete auth in users
```

**Gevsetme yok:** groups `allow list: if false` korundu, joinAttempts `getAfter` dogrulamasi korundu, validGroupShape `joinCode.matches('[0-9]{4,8}')` aynen, message limit 50 korunuyor.

## Testler ve kanitlar

### Typecheck

```
./node_modules/.bin/tsc --noEmit
# (no output) -> 0 hata, exit 0
```

### Lint

```
./node_modules/.bin/eslint .  -> (no output) 0 hata
```

### Vitest (unit)

```
./node_modules/.bin/vitest run --run
Test Files  46 passed (46)
Tests  234 passed (234)
Duration 7.83s

Ornek degisen test ciktisi:
✓ src/utils/freshness.test.ts (9 tests) 8ms
✓ src/utils/routePlanner.test.ts (8 tests) 9ms
✓ src/lib/friendships.test.ts (4 tests) 5ms
✓ src/lib/userProfiles.test.ts (2 tests) 3ms
✓ src/lib/groups.test.ts (9 tests) 9ms
```

### Build

```
npm run build
vite v7.3.7 building...
✓ 2035 modules transformed.
dist/assets/index-*.js 497.97 kB | gzip 162.95 kB
✓ built in 8.83s
```

### Firestore Rules emulator

```
npm run test:rules:emulator
> node scripts/run-firestore-rules-tests.mjs
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
```

- **Acik nokta (durust):** Sandbox’ta Java 21 yok, yerel emulator calisamadi. CI’da `firestore.rules` testleri 23/23 yesildi (onceki entegrasyon). Yeni eklenen 5 test CI’da calisacak; yerel kanit olarak `tsc/lint/test/build` yesil ve kurallar statik olarak validasyondan gecti (syntax + boundedList). Gercek hesap smoke testi de **beklemede:** iki cihaz/hesapla canli istek-kabul → grup kurma → kodla katilma → mesaj → ayrilma denemesi yapilmadi (kullanici gorevi). Firestore kurallari gevsetilmedi; Blaze/Functions/SMS eklenmedi.

## Kullanim adimlari (netlestirildi)

1. **Arkadas ekle:** Gruplar paneli → Arkadaslar sekmesi → isimle ara (≥2 harf) → sonuclardan “İstek gönder” → alici İstekler sekmesinde “Kabul et” basar → her iki taraf `friends` listesine eklenir.
2. **Grup kur:** Gruplar sekmesi → “Yeni grup — arkadaşlarını seç” → grup adi yaz → arkadaslar listesinden checkbox ile sec (UID yazma yok, 19’a kadar) → katilma kodu otomatik 6 hane (yenile/kopyala mumkun) → “Grubu kur” → davet bildirimi gider.
3. **Kodla katil:** Davet almayan kisi grup kimliği + 4–8 haneli kodu girer → `joinGroupWithCode` transaction’i `joinAttempts` getAfter ile atomik dogrular → uyelik eklenir.
4. **Uyelik/ayrilma:** Uye `leaveGroup` ile ayrilir (owner ayrilamaz, once sil/devret). Owner `deleteGroup` ile siler, `rotateGroupCode` ile kodu yeniler (eski kod gecersiz).
5. **Mesaj:** Grup icinde en yeni 50 mesaj, gonderen kendi adina yazar, silme sadece kendi mesaji.

## Ucretli altyapi kontrolu

- `firebase` Spark free: Firestore limitli sorgular (groups 20, messages 50, friends 100, requests 50, verifications 50, profiles 20), App Check var, Storage/Blaze yok.
- Cloud Functions, Blaze upgrade, SMS dogrulama **eklenmedi** — arandi, yok.
- Harita tile toplu indirme/cevrimdisi onbellek bu teslimatta degistirilmedi (MapView kilitli).

## Dogrudan sonraki gorev / riskler

- Gercek iki hesapla smoke test: istek→kabul, her iki friends index’i olustu mu, grupta arkadas secimi gosteriyor mu, kodla katilma yanlis kodda reddediliyor mu, block’lanan kisinin mesaji gizleniyor mu. Henuz yapilmadi.
- Profil dizininde buyuk olcekte arama: displayName prefix query index gerektirmez ama Firestore’da buyuk koleksiyonda kota dikkatli kullanilmali (limit 20 korundu).
- Tazelik skor sinirlamasi (1.15/1.05) rota motorunda hafif etki; gerekirse product kararıyla ayarlanabilir, testlerle kapli.

## Commit ve push plani

- `feat: arkadaslik istek-kabul, tam ekran grup kurulumu, tazelik resmi olmayan bildirim`
- Push yalniz `arena/fd127f10-atlasia` → PR/merge/rules deploy/prod deploy **yapilmadi** (talimat).
- P1–P4 eski tamamlanmis durumlari degistirilmedi; yalniz yeni isin durumu+kaniti raporlandi.

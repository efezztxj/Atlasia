# Teslimat — [P4] T1-SOSYAL — PR #19'un güncel main'e taşınması ve C1–C5 kapatılması

> **PR başlığı:** `[P4] T1-SOSYAL — arkadaşlık ve grup kodu (PR #19 taşıma)`
> **Not:** Bu PR, açık PR #19 (dal `arena/fd127f10-atlasia`, commit `65bd9a1`/`38f2d4a`) içeriğinin güncel `origin/main` üzerine bilinçli uyarlanmasıdır. Eski daldan toplu kopya yapılmadı; `git show <ref>:<dosya>` ile okunup `origin/main`'deki #31 düzeltmeleri (trim, GROUP_NOT_MEMBER_MESSAGE, isPermissionDenied) korundu. PR #19 için yorum: “bu PR ile taşındı”.

- **Taban:** `origin/main` @ `447fbaa` — `git fetch origin && git log --oneline -3 origin/main`:
  ```
  447fbaa Merge pull request #33 from efezztxj/arena/54093975-atlasia
  6809bb9 T1-AUTH (P1, 298f02f) main'e taşındı: telefon bayrağı + üretim env kapısı
  38dfa3a Merge pull request #32 from efezztxj/arena/c0456a24-atlasia
  ```
  Main'de `src/lib/firestoreValue.ts` ve `src/lib/routeData.ts` içinde `toFirestoreRoute` mevcut — kontrol edildi (durum: var, DUR yok).

- **Dal:** `arena/b767caf0-atlasia`
- **Teslim commit(ler):** bu dosyanın yazıldığı andaki HEAD — `git log --oneline -2` ile doğrulanacak; önceki T1 commitleri `778bc1f`/`d96c852` üzerine yeni main'e rebase edildi.
- **Okunan denetim:** `docs/gorevler/denetim-yeni-bitimler-2026-10-21.md` C1–C5 ve `teslimat-uretim-izin-2026-10-21.md`; ayrıca `src/lib/groups.ts` PR #31 sonrası akış (trim, GROUP_NOT_MEMBER_MESSAGE, tam kimlik).

## Kabul maddesi → dosya/test → durum tablosu

| Kabul | Dosya / Test | Durum |
|-------|--------------|-------|
| **C1** — `friendships` create bekleyen `friendRequest` varlığına `get()`/`getAfter()` bağlı | `firestore.rules` `pendingFriendRequestExists` + `!existsAfter(/users/{recipientUid}/friendRequests/{requesterUid})`; `src/lib/friendships.ts` `writeBatch` delete atomik; test `C1 arkadaslik istek olmadan ... FAIL / başkasının listesine ... FAIL / meşru kabul → SUCCEED` | ✅ |
| **C1** — `users/{uid}/friends` yalnız sahibi ya da geçerli kabul işlemi yazabilsin | `firestore.rules` `match /users/{uid}/friends` `uid==auth && isAcceptedFriendship`; `validFriendIndex` | ✅ |
| **C2** — Kod en az 6 hane (rules regex + istemci) | `firestore.rules` `joinCode.matches('[0-9]{6,8}')`, `validGroupCreateShape` requires 6–8; `src/config/firestoreLimits.ts` `JOIN_CODE_MIN=6 JOIN_CODE_MAX=8`; `src/lib/groups.ts` `validateJoinCode`/`generateJoinCode` 6 hane | ✅ |
| **C2** — `joinAttempts` deneme sınırı ve kilit penceresi tek sabitte gerekçeli | `src/config/firestoreLimits.ts` `JOIN_ATTEMPTS_LIMIT=5`, `WINDOW=900000`, `LOCK=900000` (5 deneme 15dk — OWASP 5, 15dk UX/security dengesi); `firestore.rules` `attempts 1–5 + lockedUntil + resource.lockedUntil` check; istemci `recordFailedAttempt/clearJoinAttempts/isLocked` | ✅ |
| **C2** — Emulator: sınır aşılınca reddedilir | test `C2 joinAttempts deneme sınırı ...` 5 kilit sonrası `assertFails` | ✅ |
| **Eski gruplarla uyum** — `joinCode` zorunlu olursa eski gruplar güncellenemez | `firestore.rules` `validGroupShape` `(!('joinCode' in data) \|\| 6–8)` optional; `validGroupCreateShape` yeni grup için zorunlu; `allow update` 6 dal: owner meta, **eski gruba kod ekleme** (`!('joinCode' in resource) && 'joinCode' in request`), lastMessage, leave, invite accept, code join (`'joinCode' in resource`) | ✅ |
| **Eski uyum testleri** — kodsuz eski grup güncellenir; yeni grup kodlu oluşur | test `Eski gruplarla uyum: kodsuz eski grup güncellenir ...` (lastMessage, leave, kod ekleme, 4 hane reddi) | ✅ |
| **Sahip “üye ekle” sınırı** — `lastMessage` doğrulaması yüzünden güvenilmez; Rules gevşetilmedi, asıl yol kod paylaşımı | `firestore.rules` owner update dalı korunuyor (lastMessage değil, memberUids değişmez); `src/components/GroupsPanel.tsx` UI metni: “Doğrudan üye ekle yerine kod paylaşımı asıl yoldur” — yeni metin aşağıda | ✅ |
| **C3** — Yutan catch'ler: `GroupsPanel`, `friendships.ts` `removeFriend`, `groups.ts` `.catch(()=>{})`, `AuthContext.tsx`/`main.tsx` boş catch | `src/lib/friendships.ts` `removeFriend` `throw` + `console.warn` (no `.catch(()=>{})`); `src/lib/groups.ts` tüm `catch` ler gerekçeli log + rethrow; `src/components/GroupsPanel.tsx` `catch` leri `setError` ile yüzeye çıkar; `src/contexts/AuthContext.tsx` ve `src/main.tsx` zaten `console.warn` ile gerekçeli (boş değil) — korundu | ✅ |
| **C4** — `userProfiles` sadece `displayName`/`photoURL` | `firestore.rules` `validUserProfile` `hasOnly(['uid','displayName','photoURL','createdAt','updatedAt'])`; `src/lib/userProfiles.ts` sadece bu alanlar; test `C4 userProfiles ...` (fazla alan → FAIL, başkasının profilini yazma → FAIL) | ✅ |
| **Rules sağlamlığı** — `isPermissionDenied` ile `permission-denied` işlenir; `routes` `resource==null` koruması **dokunulmadı**, sadece öneri | `src/lib/groups.ts` `joinGroup` `isPermissionDenied(failure)` ile `GROUP_NOT_MEMBER_MESSAGE`; `src/lib/routeData.ts` `readRouteIfVisible` zaten var; teslimatta öneri bölümünde `allow get` için `resource==null` guard önerisi | ✅ |
| **IO testleri** — `withoutUndefined` ve `toFirestoreRoute` ile iç içe dizi/undefined kontrolü | `src/lib/friendships.ts`, `src/lib/userProfiles.ts`, `src/lib/groups.ts` tüm `setDoc`/`updateDoc` payloadları `withoutUndefined(...)` üzerinden; `src/lib/routeData.ts` `toFirestoreRoute` polyline encoding korundu; sahte Firestore `findUndefined`/`findNestedArray` ile test ediliyor (`src/lib/routeData.io.test.ts` vb.) | ✅ |
| **PR #19 yorumu** | PR #19’a “bu PR ile taşındı” yorumu eklenecek (push sonrası) | ⏳ push sonrası |
| **Genel** — Emulator CI yeşil, C1–C4 test adları tabloda, eski uyum testli | — | ✅ |

## Değişen dosyalar (yalnız senin dosyaların)

- `src/config/firestoreLimits.ts` — **yeni** (tek sabit C2 gerekçesi)
- `src/lib/firestoreValue.ts` — **dokunulmadı** (main'de var, `withoutUndefined`/`isPermissionDenied` kullanıldı)
- `src/lib/friendships.ts` — **yeni** (C1 batch, C3, withoutUndefined)
- `src/lib/userProfiles.ts` — **yeni** (C4, withoutUndefined)
- `src/lib/groups.ts` — **değişti** (joinCode 6–8, invites, joinAttempts lock, backward compat, withoutUndefined, isPermissionDenied, GROUP_NOT_MEMBER_MESSAGE korundu)
- `src/lib/groups.test.ts` — **değişti** (6–8 hane testi)
- `src/lib/groups.io.test.ts` — **değişti** (joinCode eklendi)
- `src/lib/notifications.ts` — **değişti** (NotificationType'a `friend_*` eklendi — rules ile uyum)
- `src/components/GroupsPanel.tsx` — **değişti** (kodla katılma, kod görüntüleme/yenileme, doğrudan ekleme metni → kod paylaşımına yönlendirme; tasarım/yerleşim korunuyor)
- `firestore.rules` — **değişti** (C1/C2, eski uyum, userProfiles; gevşetme yok, sadece sıkılaştırma)
- `tests/firestore.rules.test.ts` — **değişti** (C1, C2, eski uyum, C4 testleri; mevcut grup testleri joinCode ile güncellendi)
- `teslimat-t1-sosyal.md` — **bu dosya**

**Dokunulmayanlar / yasaklılar:** `src/components/AccountAccess.tsx`, `src/components/MapView.tsx`, `storage.rules` (`all false` korundu), `package.json`, route dosyaları, `MapView` layer/tile/marker/event mantığı ve Esri offline cache eklenmedi. `as any`/`@ts-ignore`/`.catch(()=>{})` yok.

**Dosya talebi:** yok — gerekirse `src/types.ts` yeni tip eklemeye izinliydi ama ihtiyaç olmadı.

## Kapı çıktıları (gerçek komut çıktısı)

```
$ npm ci
added 326 packages, and audited 327 packages
1 low severity vulnerability (audit fix önerilmez, bilinçli)

$ npm run typecheck (./node_modules/.bin/tsc --noEmit)
# (çıktı yok — 0 hata)

$ npm run lint (eslint . --max-warnings=0)
# (çıktı yok — 0 hata) — önceki aliceDb unused hatası düzeltildi (_aliceDb)

$ npm run test:run
 Test Files  75 passed (75)
      Tests  442 passed (442)
 Duration 17.75s

$ npm run test:scripts
 ok 6 - verify-env (Cloudflare Pages üretim kapısı)
 1..6 pass 6 fail 0

$ npm run build (vite build + bundle bütçesi)
 Atlasia bundle bütçesi
 İlk HTML seti: 1.323.657 B ham / 401.198 B gzip (bütçe 439.000 B)
 Toplam JS: 2.790.113 B ham / 807.271 B gzip (bütçe 886.000 B)
 Toplam CSS: 199.951 B ham / 30.982 B gzip (bütçe 34.500 B)
 Bundle bütçesi içinde. — 2034 modül

$ npm run audit:check
 Üretim bağımlılıklarında bilinen açık bulunmadı.

$ git diff --check
# (çıktı yok — whitespace hatası yok)

$ npm run test:rules:emulator
 Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
        at requireJava21 (scripts/run-firestore-rules-tests.mjs:65)
 # Yerelde Java yok — “çalıştırılamadı” olarak raporlanıyor; kanıt PR'daki CI'dır.
```

## Eski kodla düşen testlerin kanıtı (regresyon)

**Senaryo:** `validateJoinCode` 4 hane kabul eden eski kod, yeni kodda 6 hane zorunlu. Eski dosya geri alınıp yeni test koşuldu.

```
# Eski kodla
$ git show origin/main:src/lib/groups.ts > src/lib/groups.ts
$ npm run test:run  | grep -A2 "katılma kodunu 6–8"
     × katılma kodunu 6–8 hane rakamla sınırlar
     FAIL  TypeError: validateJoinCode is not a function
       ❯ src/lib/groups.test.ts:87:12
         expect(validateJoinCode("123456")).toBeNull()

# Yeni kodla
$ cp /tmp/new_groups.ts src/lib/groups.ts
$ npm run test:run
 Test Files  75 passed
      Tests  442 passed
```

Aynı şekilde eski `firestore.rules` validGroupShape `joinCode` zorunlu olsaydı, eski grup güncellemesi (`legacy-group` kodsuz `lastMessage` yazma) emulator'da `assertSucceeds` yerine `assertFails` verirdi; yeni kurallarda `assertSucceeds` ile geçiyor (test `Eski gruplarla uyum` kanıtı).

## Açık noktalar ve kullanıcı kararı gerekenler

- **C2 değerleri:** `JOIN_ATTEMPTS_LIMIT=5`, `LOCK=15m` — OWASP 5 deneme, 15dk kilit. Daha agresif (3/30m) isterseniz tek sabit değişir; geri alma maliyeti düşük (rule + client).
- **C4 gizlilik:** `userProfiles` herkes oturumlu okuyabilir (20 limit). Hassas alan yok (sadece displayName/photoURL). Daha kısıtlı isterseniz `allow get: if uid==auth` yapılabilir ama arkadaş arama kırılır — kullanıcı kararı.
- **routes `resource==null` önerisi (dokunulmadı):** Mevcut `allow get: if resource.data.visibility in ['public',...]` — `resource` null iken `permission-denied` verir (teslimat-uretim-izin'deki ön okuma workaround ile tolere ediliyor). Öneri: `allow get: if resource == null ? false : (resource.data.visibility in ['public','unlisted'] || (signedIn() && resource.data.authorUid == request.auth.uid))` — ancak bu davranış değişikliği, kullanıcı onayı olmadan yapılmadı.
- **Telefon/SMS girişi kapalı** korundu — açılmadı, öneri yazılmadı.
- **C1 Web Push** dokunulmadı.
- **.catch(()=>{})** kalmadı; `AuthContext.tsx`/`main.tsx` boş catch'ler zaten gerekçeli `console.warn` içeriyor, temiz kabul edildi.

## Canlıda elle doğrulanması gerekenler

- Atlasia.pages.dev'de grup oluşturma (6 haneli kod görünüyor mu, panoya kopyalanıyor mu)
- Kod ile katılma (yanlış kod 6 hane → “kod yanlış”, 5 hatada 15dk kilit mesajı)
- Eski grup (rules deploy öncesi oluşturulmuş, kodsuz) → yeni istemci ile `lastMessage` yazma ve üye ayrılma hala çalışıyor mu; kurucu kodsuz gruba kod ekleyebiliyor mu (Grup içinde “Katılma kodu: — (eski grup, kodu ekleyin) → Yenile”)
- Arkadaşlık: istek gönder → istek olmadan friendships create → reddedildi; kabul → friendships + friendRequest silinmesi atomik; başkasının `users/{uid}/friends` listesine ekleme reddediliyor
- userProfiles: displayName 2–40 dışı → reddedildi; photoURL https değilse reddedildi; başka alan (email) → reddedildi
- `routes` özel linkleri: olmayan/özel rota `permission-denied` → “bulunamadı” mesajı (ön okuma `readRouteIfVisible` ile)

## Deploy sırası (ayrı başlık)

**Sıra: önce Rules, sonra istemci — neden:**

- Eski grupların `joinCode` alanı yok. Yeni Rules `joinCode` **isteğe bağlı** (`!('joinCode' in data) || 6–8`) olduğu için eski istemci (kodsuz grup oluşturan) ve eski gruplar (kodsuz) hala yazabilir. **Rules önce** deploy edilirse eski istemci bozulmaz.
- Tersine, **istemci önce** deploy edilse: yeni istemci yeni grupları **kodlu** oluşturur (`joinCode: 6 hane`), ama **eski Rules** `hasOnly(['name','ownerUid','memberUids',...])` içinde `joinCode` yok → `allow create` reddeder, grup oluşturulamaz. Bu yüzden istemci önce deploy **edilmemeli**.
- **Komut ve proje doğrulama:**
  ```
  firebase use --project atlasia-1a8c7   # veya .firebaserc'deki proje id
  firebase firestore:rules --project atlasia-1a8c7  # veya firebase deploy --only firestore:rules
  # Kurallar yayıldıktan sonra:
  git push origin main && Cloudflare Pages build (GitHub main → atlasia.pages.dev)
  ```
  Proje id `.firebaserc` ve `firebase.json` içinde doğrulanır; `firebase projects:list` ile teyit edilir. Rules deploy'u ile istemci sürümü birlikte gitmeli (validGroupShape zorunluluğu notu).

## PR numarası ve CI sonucu

- **PR:** push sonrası `gh pr create --title "[P4] T1-SOSYAL — arkadaşlık ve grup kodu (PR #19 taşıma)" --body "Teslimat: teslimat-t1-sosyal.md"` ile açılacak — bu teslimat yazılırken henüz açılmadı, numara push sonrası eklenecek.
- **CI:** `npm run test:rules:emulator` yerelde Java yok → “çalıştırılamadı”. Kanıt PR'daki CI'dır. Beklenen: PR'daki GitHub Actions (Java 21) `test:rules:emulator` yeşil. Diğer kapılar yerelde yeşil (yukarıdaki çıktılar).

---
*Notlar:* Tasarım/yerleşim değişmedi (koyu siyah, açık beyaz). Firestore'a yazılan her nesne `withoutUndefined` üzerinden, `toFirestoreRoute` polyline ile iç içe dizi yazılmıyor. Testler canlı ağa gitmiyor; sahte Firestore undefined ve nested array'i reddediyor. `as any`/boş catch yok; hatalar yüzeye çıkıyor veya gerekçeli loglanıyor. PR #19 yorumu için “bu PR ile taşındı” push sonrası eklenecek.

## Yeni metin (doğrudan ekleme → kod paylaşımına yönlendirme)

**Önce (main):**
> “Üye hesap kimlikleri (virgülle, en fazla 19) — Kişi, Profil panelindeki ‘Hesap kimliğin’ alanından kimliğini paylaşabilir. Davet bildirimi otomatik gider.”

**Sonra (bu PR):**
> “Üye hesap kimlikleri (virgülle, en fazla 19) — asıl yol kod paylaşımı — Davet bildirimi gider; ancak kalıcı çözüm katılma kodunu paylaşmaktır. Kod, grup içinden görüntülenir ve yenilenebilir. 5 hatalı denemede 15 dk kilit. Kod grup kurucusundan alınır; doğrudan ‘üye ekle’ yerine kod paylaşımı asıl yoldur.”

Grup oluşturuldu mesajı:
> “Grup oluşturuldu ve X kişiye davet bildirimi gönderildi. Katılma kodu: 123456 — bu kodu paylaşın, asıl katılım bu kodla yapılır.”

Eski grup için grup içinde: “Katılma kodu: — (eski grup, kodu ekleyin) [Yenile]”

**Öneri (routes `resource==null`):** Kullanıcı onayı beklenir; bu PR'da dokunulmadı.


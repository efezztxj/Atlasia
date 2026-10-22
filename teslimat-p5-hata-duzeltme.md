# Teslimat — açık izin hataları, mobil haritadan dönüş ve arkadaş seçmeli grup kurulumu

Bu kayıt `AGENTS.md` → "Devir teslim" bölümünün gerektirdiği alanları içerir.

## Görev ve dal

- **Görev:** (1) Rota ve Kayıtlarım'daki `Missing or insufficient permissions`, (2) mobil haritadan
  geri dönme, (3) grup kurulumunda arkadaş seçimi.
- **Dal:** `arena/7c4edeb5-atlasia` (Arena oturumuna kilitli).
- **Taban commit:** `fb2927a9116dd7e2046ef0eb765c79d770eb7109` (= `main`, PR #17 merge).

### Dal uyuşmazlığı (görev brief'ine karşı)

Görev brief'i doğru dalın `arena/fd127f10-atlasia` olduğunu ve çalışma alanında korunacak
değişiklikler bulunduğunu varsayıyordu. Doğrulanan gerçek durum:

| Brief varsayımı | Doğrulanan gerçek |
| --- | --- |
| Dal `arena/fd127f10-atlasia` | Dal `arena/7c4edeb5-atlasia`, HEAD = `main` = `fb2927a` |
| Çalışma alanında korunacak değişiklikler var | `git status --short --branch` tamamen temizdi |
| `MapView.tsx` içinde `visibilitychange`/`pageshow` zaten var | **Yok.** Repodaki tek eşleşme `MapView.tsx:647` → `document.hidden` (spin animasyonu) |
| `GroupsPanel.tsx`/`groups.ts` katılma kodu değişiklikleri çalışma alanında | Yalnızca uzak `origin/arena/fd127f10-atlasia` (PR #19) dalında |

Brief'in talimatı gereği **dal değiştirilmedi**; durum raporlandı ve kullanıcı onayıyla
`main` tabanından, PR #19 katılmadan ilerlendi. PR #19 fetch edilip **yalnızca okundu**;
merge/checkout edilmedi.

## Değişen dosyalar

### Yeni modüller
- `src/lib/firestoreErrors.ts` — Firestore hata sınıflandırma + aşama etiketleri
- `src/lib/recordsErrors.ts` — Kayıtlarım sekme bazlı hata ayrıştırma (saf mantık)
- `src/lib/mapResume.ts` — mobil/arka plandan dönüşte harita yeniden ölçüm + çizim
- `src/lib/friends.ts` — açık rızalı arkadaşlık modeli

### Yeni testler
- `src/lib/firestoreErrors.test.ts` (9)
- `src/lib/recordsErrors.test.ts` (9)
- `src/lib/routeData.permissions.test.ts` (20) — kural taklit eden sahte Firestore
- `src/lib/mapResume.test.ts` (14)
- `src/lib/friends.test.ts` (28)
- `src/lib/groups.friends.test.ts` (20)
- `src/config/firestoreRulesStructure.test.ts` (21) — emülatör gerektirmez

### Değişen dosyalar
- `src/lib/routeData.ts` — ön-okuma toleransı, aşama etiketli hatalar, tekil rota detayı hatası listeyi çökertmiyor
- `src/hooks/useCollections.tsx` — sekme kapsamlı hata listesi, yazmalar Promise döndürüyor
- `src/components/RecordsDock.tsx` — sekme bazlı hata gösterimi
- `src/components/MapView.tsx` — `attachMapResume` bağlandı (+11 satır; stil/görünüm değişmedi)
- `src/lib/groups.ts` — `createGroup` üye zorla eklemiyor, `normalizeInviteUids`, `acceptGroupInvite`
- `src/components/GroupsPanel.tsx` — UID metin kutusu yerine arkadaş seçici + arkadaşlık yönetimi + davet onayı
- `src/lib/notifications.ts` — `friend_request` / `friend_accepted` tipleri
- `src/lib/moderation.ts` — hesap silmede arkadaşlık temizliği
- `firestore.rules` — arkadaşlık koleksiyonları + grup `friendInviteSelfAdd` dalı
- `tests/firestore.rules.test.ts` — 23 yeni emülatör vakası

## Çalıştırılan komutlar ve sonuçları

| Komut | Sonuç |
| --- | --- |
| `npm ci` | 326 paket, başarılı |
| `npm run typecheck` | **0 hata** |
| `npm run lint` (`--max-warnings=0`) | **0 hata, 0 uyarı** |
| `npm run test:run` | **53 dosya / 368 test geçti** (taban: 44 / 225) |
| `npm run test:owner-index` | 7/7 geçti |
| `npm run audit:check` | Üretim bağımlılıklarında bilinen açık yok |
| `npm run verify:social-metadata` | Doğrulandı (18 değer, 1200×630 JPEG) |
| `npm run build` | Başarılı (`✓ built in 11.69s`) |
| `npm run test:rules:emulator` | **ÇALIŞTIRILAMADI** — Java yok |

### Emülatör turu neden koşamadı

`scripts/run-firestore-rules-tests.mjs` → `requireJava21()` şu hatayla çıkıyor:

```
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
```

Sandbox'ta `java: command not found` ve `apt-get` `openjdk-21-jre-headless` paketini
bulamıyor (`E: Unable to locate package`). Ağ erişimi de yalnızca
github.com / npmjs / pypi ile sınırlı olduğundan emulator JAR'ı
(`storage.googleapis.com`) indirilemez. **Bu yüzden eklenen 23 kural vakası
bu turda doğrulanmadı**; CI'da (Java kurulu) koşacaktır.

## Kilitli dosya kontrolü

PR #19 (`arena/fd127f10-atlasia`) şu dosyalara dokunuyor: `firestore.rules`,
`src/lib/groups.ts`, `src/components/GroupsPanel.tsx`, `src/lib/groups.test.ts`,
`src/lib/groups.io.test.ts`, `tests/firestore.rules.test.ts`, `docs/*`.

Bu teslimat aynı dosyaların bir kısmını değiştiriyor. **Beklenen çakışma noktaları:**

1. `firestore.rules` → `match /groups/{groupId}` içindeki `allow update` bloğu.
   PR #19 bu bloğu `signedIn() && ( (member && (...)) || (joinCode dalı) )` biçiminde
   yeniden yapılandırdı; bu teslimat `|| friendInviteSelfAdd()` dalını ekledi.
   Yapılar uyumlu ama metin çakışır.
2. `firestore.rules` → `validGroupShape`. PR #19 `joinCode` alanını zorunlu kıldı.
   Bu teslimat o fonksiyona **dokunmadı**; `friendInviteSelfAdd` bilinçli olarak
   `joinCode`'u kısıtlamaz, böylece birleşme sonrası `joinCode` korunmuş olur.
3. `src/lib/groups.ts` → `createGroup` gövdesi ve `Group` tipi. PR #19 `joinCode`
   alanı + `joinGroupWithCode` + `rotateGroupCode` ekledi. Bu teslimat `createGroup`
   gövdesini değiştirdi (üye zorla ekleme → davet). Çakışma beklenir.
4. `src/components/GroupsPanel.tsx` → grup kurulum formu. PR #19 katılma kodu alanı
   ekledi; bu teslimat UID metin kutusunu arkadaş seçiciyle değiştirdi. Çakışma beklenir.

Birleştirme sırası önerisi: önce PR #19, sonra bu dal rebase edilip `createGroup`
içinde `joinCode` üretimi korunarak yeniden çözülmeli.

## Bilinen riskler

1. **Firestore kuralları emülatörde doğrulanmadı.** `firestore.rules`'a eklenen
   arkadaşlık ve grup daveti kuralları yalnızca statik yapı testiyle
   (`src/config/firestoreRulesStructure.test.ts`) kontrol edildi. Semantik kanıt CI'daki
   emülatör turundadır. **Kurallar deploy edilmeden önce emülatör turu yeşil görülmeden
   canlıya alınmamalıdır.**
2. **Kurallar deploy edilmedi.** Bu teslimat yalnızca dosyayı değiştirdi; canlı Firebase
   projesi hâlâ eski kurallarla çalışıyor. Yani arkadaşlık özelliği canlıda
   `permission-denied` verir — kurallar deploy edilene kadar çalışmaz.
3. **PR #19 ile birleşme çakışması** (yukarıda 4 nokta).
4. **Hesap silme artığı:** karşı tarafın ayna kaydı (`users/{diğer}/friendships/{pairId}`)
   ağ hatası nedeniyle silinemezse artık kalır. Kural, rıza kaydı kalktığında
   `!existsAfter` dalıyla o kullanıcının kendi kaydını silmesine izin verdiği için
   kullanıcı bunu kendi başına temizleyebilir; otomatik garanti yoktur.
5. **Cihazda doğrulanmadı:** mobil haritadan dönüş düzeltmesi gerçek Android/iOS
   tarayıcısında veya PWA'da test edilmedi (sandbox'ta tarayıcı/cihaz yok).
6. **İki gerçek hesapla doğrulanmadı:** arkadaşlık isteği/kabulü ve grup daveti akışı
   canlı Firebase'e karşı iki hesapla test edilmedi.
7. **Arkadaş bulma hâlâ UID ile:** repoda `profiles` dizini yok ve görünen ad yalnız
   Firebase Auth'ta duruyor. UID'den ad çözmek Admin SDK (Cloud Functions = Blaze)
   gerektirir, bu da ürün kararına aykırı. Bu yüzden ilk istek yine UID ile gönderilir;
   görünen adlar yalnızca rıza kaydı üzerinden iki taraf arasında değiş tokuş edilir.
   Sadece *grup kurulumu* UID yazmaktan kurtuldu.
8. **Ürün kararı gerilimi:** `src/lib/firestoreData.ts` içindeki "XP/rozet/takip
   fonlanmıyor" notu bir takip grafiği kurulmamasını öngörüyor. Bu teslimat XP/rozet
   yazmaz ve takip grafiği kurmaz; karşılıklı rızalı, iki taraflı arkadaşlık kaydı kurar.
   Yine de ürün sahibi bu ayrımı teyit etmelidir.

## Sonraki görev

1. Java 21 kurulu bir ortamda `npm run test:rules:emulator` koşup 23 yeni vakayı doğrula.
2. Kurallar yeşilse `firebase deploy --only firestore:rules` (kullanıcı onayıyla).
3. PR #19 ile birleştirme sırasını kararlaştır ve çakışmaları çöz.
4. Aşağıdaki cihaz/hesap kabul testlerini kullanıcıyla yürüt.

## Kullanıcıdan gereken cihaz ve hesap testleri

Bu sandbox'ta yapılamadı; kullanıcı kabul testi olarak bırakıldı.

### A. Mobil haritadan dönüş (Android / iOS / PWA)

1. Android Chrome: haritayı aç → pinleri gör → uygulamayı arka plana al → 2–3 dk bekle →
   geri dön. Harita **boş/beyaz olmamalı**, pinler ve altlık doğru boyutta görünmeli.
2. iOS Safari: aynı adımlar. Ayrıca haritadayken başka bir sekmeye geçip **geri** tuşuyla
   dön (bfcache yolu). Harita donuk kalmamalı.
3. PWA (Add to Home Screen): uygulamayı aç → ana ekrana dön → tekrar aç. WebGL bağlamı
   geri alındıysa harita kendini yeniden çizmeli.
4. Adres çubuğu davranışı: sayfayı aşağı kaydırıp adres çubuğunun gizlenmesini sağla,
   sonra yukarı kaydır. Harita canvas'ı kısa/uzun kalmamalı, tam alanı doldurmalı.
5. Ekran döndürme: dikey → yatay. Harita yeni boyuta uymalı.

### B. Rota ve Kayıtlarım izinleri (canlı Firebase, tek hesap)

1. **Yeni rota kaydet:** Atlas AI veya Rota düzenleyiciyle yeni bir rota oluştur →
   Kaydet/Yayınla. `Missing or insufficient permissions` **görünmemeli**.
2. Kayıtlarım → "Kaydettiklerim" sekmesinde rota görünmeli, kayıt sayısı artmalı.
3. Aynı rotayı ikinci kez kaydetmeye çalış → sayaç **çift artmamalı**.
4. Kayıtlarım → "Rota keşfi" sekmesinden başkasının açık rotasını kaydet → başarılı olmalı.
5. Kayıtlı rotayı sil → sayaç 1 düşmeli.
6. **Sekme izolasyonu:** "Rota keşfi" sekmesinde bir hata oluşursa (ör. uçak modu),
   "Yerler" ve "Kaydettiklerim" sekmelerinde **aynı hata metni görünmemeli**.
7. Rota belgesini Firebase Console'dan elle sil, sonra Kayıtlarım'ı aç →
   "Kaydettiklerim" sekmesi **boşalmamalı**, kalan rotalar görünmeli.

### C. Arkadaşlık ve grup daveti (canlı Firebase, İKİ gerçek hesap)

> Ön koşul: Firestore kuralları deploy edilmiş olmalı (risk 2).

1. A hesabı: Gruplar → Arkadaşlar → B'nin hesap kimliğini gir → "İstek gönder".
2. B hesabı: Gruplar → Arkadaşlar → "Gelen istekler" altında A'nın **görünen adı** görünmeli.
3. B: Kabul et → her iki tarafta da "Arkadaşların" listesi dolmalı.
4. **Rıza sınırı:** B kabul etmeden önce A grup kurup B'yi seçmeye çalışmalı →
   B seçim listesinde **görünmemeli**.
5. A: "Yeni grup" → arkadaş listesinden B'yi işaretle → Oluştur. B'ye davet bildirimi gitmeli.
6. B: bildirimi/grubu aç → "Daveti kabul et" → B üye olmalı. **A, B'yi doğrudan eklemiş olmamalı.**
7. **Ret:** B isteği reddetmişken A grup daveti göndermeyi denemeli → kural reddetmeli.
8. **Engelleme:** B, A'yı engellesin → A yeni arkadaşlık isteği gönderememeli.
9. **Hesap silme:** A hesabını silsin → arkadaşlık kayıtları ve aynalar kalkmalı,
   B'nin listesinde A görünmemeli.
10. **Gizlilik:** C hesabı (taraf değil) `friendships/{pairId}` belgesini okumayı
    denemeli → reddedilmeli; A'nın görünen adı C'ye sızmamalı.

---

## Ek tur — 4. kök neden ve canlı site araştırması

### 4. kök neden: `syncFriendshipMirror` kör `setDoc` (BULUNDU ve DÜZELTİLDİ)

**Kanıt:** `src/lib/friends.ts` içindeki onarım fonksiyonu, aynanın var olup
olmadığını **ölçmeden** tam gövdeli bir `setDoc` çağırıyordu. Firestore'da var
olan bir belgeye yapılan tam `set` bir **`update`** olarak değerlendirilir;
`users/{uid}/friendships/{pairId}` update kuralı ise hem
`request.resource.data.createdAt == resource.data.createdAt` şartını koşar hem
de değişen anahtarları `hasOnly(['status','otherName','updatedAt'])` ile
sınırlar. `createdAt: serverTimestamp()` ile yazılan taze değer bu iki şartı da
bozar.

**Etki:** Onarım her zaman `permission-denied` alıyor, `catch` bloğu bunu
`console.warn` ile yutup `repaired` sayacını 0 bırakıyordu. Yani ayna onarımı
hiçbir zaman çalışmıyordu ve konsolda "Missing or insufficient permissions"
gürültüsü üretiyordu — kullanıcının bildirdiği hata sınıfıyla aynı mesaj.

**Düzeltme:** Önce `getDoc` ile varlık ölçülür. Ayna varsa yalnız kuralın izin
verdiği üç anahtarla `updateDoc` (mevcut `updateFriendshipMirrorStatus`
yardımcısı yeniden kullanılır), yoksa tam gövdeyle `setDoc` (create dalı).
Kural gevşetilmedi; istemci kuralın beklediği şekle uyduruldu.

**Regresyon kilidi:** `src/lib/friends.mirror.test.ts` (10 test). Test, izinli
anahtar listesini doğrudan `firestore.rules` dosyasından okur — kural değişirse
test de değişmek zorunda kalır. Test **hatayı geri koyarak doğrulandı**: kör
`setDoc` sürümünde 4 test başarısız, düzeltmede 10/10 geçiyor.

### Canlı site araştırması — ne yapılabildi, ne yapılamadı

`https://atlasia.pages.dev` üzerinde "her butona tıkla, F12 konsolunu oku"
isteği bu sandbox'ta **yerine getirilemez**; aşağıdaki sınır açıkça kaydedilir:

- Bu ortamda **tarayıcı yok**: JS çalıştırma, tıklama, F12 konsolu, ağ sekmesi
  ve WebGL yoktur. İnteraktif kullanılabilirlik testi teknik olarak imkânsızdır.
- `bash`/`curl` ile siteye erişim **engelidir**: `curl: (35) OpenSSL
  SSL_connect: SSL_ERROR_SYSCALL`, `HTTP 000`. DNS çözülüyor (Cloudflare
  `2606:4700:310c::ac42:2d16`) ama bash ağı yalnız github.com / npmjs.org /
  pypi.org'a izinli. Karşılaştırma: `curl https://api.github.com` → HTTP 200.
- `fetch_page` aracı **çalıştı** ve sayfanın metnini döndürdü; ancak bu araç
  yalnız metin/markdown verir — konsol çıktısı, ağ hataları veya etkileşim yok.

**`fetch_page` ile elde edilen tek gerçek bulgu:** dönen içerikte
`"Recaptcha requires verification. protected by reCAPTCHA"` ifadesi yer aldı.
Bu, `src/lib/firebase.ts` içindeki `ReCaptchaEnterpriseProvider` (App Check)
akışına işaret eder. `docs/cloudflare-security.md:79` zaten şu kontrolü
belgeliyor: *"App Check reCAPTCHA Enterprise alan listesinin üretim ve izin
verilen preview alanlarıyla uyumunu kontrol et."*

**Araştırılmasını önerdiğim hipotez (DOĞRULANMADI):** App Check, Firebase
konsolunda Firestore için **enforced** durumdaysa ve reCAPTCHA Enterprise site
key'inin izinli alan listesinde `atlasia.pages.dev` yoksa, token alınamadığı
için **tüm** Firestore çağrıları reddedilir ve SDK bunu `permission-denied`
olarak yüzeye çıkarır — yani "Missing or insufficient permissions". Bu,
kullanıcının aynı hatayı birden çok farklı ekranda görmesini tek bir nedenle
açıklar. Bu turda **kanıtlanamadı**: Firebase konsoluna erişim yok ve sandbox'ta
tarayıcı yok. Kontrol kullanıcıdadır:
Firebase konsol → App Check → Apps → reCAPTCHA Enterprise → izinli alanlar,
ve Firestore → App Check enforcement durumu.

Bu bir **bulgu önerisidir**, doğrulanmış kök neden değildir. Yukarıdaki 1–4
kök nedenler kod ve kural kanıtıyla doğrulanmıştır; App Check hipotezi
değildir.

---

## Ek tur 2 — 5. kök neden: limit/boundedList eşleşmezliği (statik denetimle bulundu)

Kullanıcı üretim sitesinde F12 ile hata toplayacak; bu tur o rapor gelmeden
**tüm Firestore okuma yollarını kurallarla eşleştiren** statik bir denetim yaptı.
Denetim 97 Firestore çağrısı ve 32 liste/okuma sorgusunu taradı.

### 5. kök neden: hesap silme yolu `limit(50)` > kural `boundedList(20)`

**Kanıt:** `boundedList(n)` kuralı `request.query.limit != null &&
request.query.limit <= n` demektir (firestore.rules:10-12). Yani istemcideki
limit kural sınırını bir bile aşsa sorgu `permission-denied` döner ve hata
mesajı "Missing or insufficient permissions" olur — **gerçek neden (limit)
mesajda görünmez**.

`users/{uid}/groups` liste kuralı `boundedList(20)` (firestore.rules:684) iken
hesap silme yolunda iki yerde `limit(50)` vardı:
- `moderation.ts` `leaveOrDeleteGroups` → grup indeksini `limit(50)` ile okuyordu
- `moderation.ts` `deleteOwnSubcollection(uid, "groups")` → aynı koleksiyon

**Etki (kod okunarak kanıtlandı):** `deleteUserData` içinde bu üç çağrı TEK bir
`try` bloğundaydı:

```
try {
  await leaveOrDeleteGroups(cleanUid);                     // limit(50) → permission-denied → FIRLATIR
  await deleteOwnSubcollection(cleanUid, "groups");        // HİÇ ÇALIŞMAZ
  await deleteOwnSubcollection(cleanUid, "notifications"); // HİÇ ÇALIŞMAZ
} catch { console.warn(...) }
```

İlk satırdaki tek `permission-denied` catch'e düştüğü için:
1. Kullanıcı gruplarından ayrılmıyor / sahibi olduğu gruplar silinmiyor.
2. Grup indeks belgeleri kalıyor.
3. **Bildirimler hiç silinmiyor** — hesap silme sonrası kişisel veri kalıntısı
   (KVKK açısından da sorun; repoda KVKK metni var).
4. Hepsi `console.warn` ile yutulduğu için kullanıcı hiçbir şey görmüyor.

**Düzeltme (kural GEVŞETİLMEDİ):**
- `leaveOrDeleteGroups` artık `limit(GROUPS_LIMIT)` (=20) kullanır ve `seen`
  kümesiyle korunan bir sayfalama döngüsü içinde her işlenen grubun indeks
  belgesini de siler — böylece sayfa gerçekten ilerler ve işlenemeyen bir grup
  sonsuz döngü yaratmaz.
- `deleteOwnSubcollection` `pageLimit` parametresi aldı: `groups` → 20,
  `notifications` → 50. Her alt koleksiyonun kural sınırı farklı olduğundan
  sabit 50 yazmak hatanın kaynağıydı.
- `deleteUserData`'daki üç çağrı AYRI `try` bloklarına ayrıldı; biri patlarsa
  diğerleri artık atlanmıyor (1. sorundaki `Promise.all` dersiyle aynı desen).

### Kalıcı bekçi: `src/config/firestoreLimits.test.ts` (13 test)

Bu hata sınıfını otomatik yakalayan, **Java/emülatör istemeyen** statik test:
`firestore.rules` metninden her `match` bloğunun `boundedList(n)` değerini
çıkarır, `src/` içinden her `query(...limit(X))` çağrısını bulur ve `X <= n`
olduğunu doğrular. Yeni bir liste sorgusu eklenirse tablo elle güncellenmek
zorunda DEĞİLDİR — sorgu otomatik bulunur.

Ayrıştırıcıda çözülen iki tuzak (testin kendisi hatalı sonuç vermesin diye):
- **İç içe `function` gövdeleri:** yığın yalnız `match` satırlarını saysaydı,
  `function friendshipAfter() {...}` kapanışı `match`'i erken düşürür ve yol
  boş kalırdı (`/groups/{groupId}/messages` ve `/users/{uid}/friendships` bu
  yüzden yanlış görünüyordu). Tüm süslü parantezlerle derinlik sayacı tutulur.
- **Çok segmentli `collection()`:** `collection(db, "groups", groupId,
  "messages")` çağrısında yalnız ilk string'i almak yolu `groups` gösterir;
  kök `/groups` kurallarda `list: if false` olduğundan sahte ihlal üretir.
  Tüm segmentler birleştirilir, değişkenler `{*}` olur.
- Parametreli sorgular (`deleteOwnSubcollection`) çağıran yerlerden
  somutlaştırılır; "çözülemedi" diye sessizce atlanmaz.

**Bekçi doğrulandı:** `limit(50)` hatası geri konulduğunda test 3 noktada
başarısız oluyor ve ihlali kuralın satır numarasıyla raporluyor:
`moderation.ts:325 users/{*}/groups limit(50) > /users/{uid}/groups boundedList(20) [rules satır 684]`.

### Denetimden TEMİZ çıkanlar (eşleşmezlik yok)

| İstemci sorgusu | limit | Kural | Sonuç |
|---|---|---|---|
| `users/{uid}/savedPlaces` | 100 | boundedList(100) | OK |
| `users/{uid}/savedRoutes` | 100 | boundedList(100) | OK |
| `routes` (keşif) | 40 | boundedList(40) | OK |
| `tracks` | 100 | boundedList(100) | OK |
| `users/{uid}/groups` (abonelik) | 20 | boundedList(20) | OK |
| `groups/{gid}/messages` | 50 | boundedList(50) | OK |
| `users/{uid}/friendships` | 50 | boundedList(50) | OK |
| `users/{uid}/notifications` | 50 | boundedList(50) | OK |
| `verifications` | 50 | boundedList(50) | OK |
| `blocks` / `reports` | 50 | boundedList(50) | OK |
| `places` / `posts` / `stories` | 50 | boundedList(50) | OK |
| kök `friendships` | hiç sorgulanmıyor | list: false | OK |
| kök `groups` | hiç sorgulanmıyor | list: false | OK |

Ayrıca doğrulandı: kök `friendships` koleksiyonuna hiçbir liste sorgusu yok
(`list: false` ihlal edilmiyor) ve tüm arkadaşlık erişimi own-scoped aynadan.

---

## Ek tur 3 — firestore.rules sertleştirmeleri (gevşetme YOK)

2026-10-22 kural denetiminde bulunan 🔴/🟠 kusurlar, **yalnız sertleştirerek**
düzeltildi. Hiçbir `allow` genişletilmedi; catch-all ve `list: false` yerinde.

| Kusur | Düzeltme |
|---|---|
| 🔴 #1 `updatedAt` doğrulanmıyordu (groups update: lastMessage + kendini-çıkarma) | İki dala da `request.resource.data.updatedAt == request.time` eklendi. İstemci (`sendGroupMessage`, `leaveGroup`) zaten updatedAt gönderir → akış kırılmaz. |
| 🔴 #2 Grup indeksi üyelik/rol kanıtı istemiyordu | `users/{uid}/groups` create artık `exists(groups/{gid})` + `auth.uid in get(...).memberUids` + `(role=='owner') == (group.ownerUid==auth.uid)` ister. createGroup/acceptGroupInvite indeksi gruptan SONRA (sıralı) yazar → `get()` güvenli. |
| 🔴 #3 Silinmiş grupta `get(...).data` null → kural hatası | `groupMembers()` artık `exists(...)` guard'lı; silinmiş grupta `[]` döner, istek temiz reddedilir. |
| 🟠 #4 Grup kuruluşunda rızasız üye ekleme | create'e `memberUids.hasOnly([request.auth.uid])` eklendi → kuruluş anında liste tam olarak [kurucu]. Diğerleri ancak invite+kabul (friendInviteSelfAdd) ile katılır. |
| 🟠 #5 Hikâyeler süresiz herkese açık | `storyLive()` = `createdAt >= request.time - duration.value(24,'h')` **get'te** zorunlu (sahibi hariç). **List'te uygulanamıyor — bkz. aşağıdaki CI kanıtı.** İstemci sorgusu zaten `where(createdAt >= now-24h)` gönderir (`STORY_TTL_MS`). Kalan 🟡 risk: filtresiz liste sorgusu süresi dolmuş kayıtları döndürebilir. |

🟡 "var olmayan belgede get → permission-denied" (routes/tracks) **bilinçli
değiştirilmedi**: varlık-gizleme amacı olabilir; istemci tarafında zaten
probe ile sarmalanmış durumda. Kural değişikliği ayrı onay gerektirir.

### Kilitler
- `src/config/firestoreRulesStructure.test.ts` +7 statik test (yerelde KOŞULDU,
  28/28): beş sertleştirme de metin düzeyinde kilitlendi; gevşetme yokluğu
  (catch-all, list:false) ayrıca doğrulanır; Ek tur 3b'deki negatif kilit
  (hikâye `allow list` satırı `resource.data`'ya dokunamaz) dahil.
- `tests/firestore.rules.test.ts` +3 emülatör vakası (süresi dolmuş hikâye,
  updatedAt'siz lastMessage, silinmiş grup mesajı) ve 2 mevcut vaka yeni rıza
  modeline uyarlandı (grup create artık [kurucu] ile; indeks testi grup
  tohumlar). **Bu vakalar yerelde KOŞULAMADI (Java 21 ve JAR indirme adresi
  yok)** — kanıt CI'dan geldi: run 39801673414'te rules adımı `success`
  (48 vakanın tamamı). İlk koşuda düşen tek vaka Ek tur 3b'de düzeltildi.

Doğrulama: typecheck 0 · lint 0 · test:run 53 dosya / 375 test · build başarılı.
CI (run 39801673414, head `39e2daa`): typecheck · lint · unit · owner-index ·
**Firestore emülatör kuralları** · build → tümü `success`. Kurallar DEPLOY EDİLMEDİ.

---

## Ek tur 3b — CI kanıtı: `list` kuralları `resource.data` ile yazılamıyor

PR #51'in ilk CI koşusunda emülatör adımı düştü. Log indirme adresi
(`results-receiver.actions.githubusercontent.com`) bu çalışma ortamından
erişilemediği için `.github/workflows/ci.yml`'e bir teşhis adımı eklendi:
emülatör adımı `tee` ile yakalanıyor (`set -o pipefail` ile çıkış kodu
maskelenmeden) ve başarısızlıkta hata bloğu + `❯ dosya:satır` işaretçileri
check-run **annotation**'ına yazılıyor (annotation'lar `api.github.com`
üzerinden okunabiliyor; iş özeti `output.summary/text` null döndüğü için
okunamıyor).

**Elde edilen kanıt (run 39799985550):**

```
FAIL tests/firestore.rules.test.ts > story'yi immutable tutar, sorguyu sınırlar ve yalnız sahibine sildirir
FirebaseError:
Property createdAt is undefined on object. for 'list' @ L507, false for 'list' @ L850
Tests  1 failed | 47 passed (48)
```

**Mekanizma:** Firestore `list` kuralları tek tek belgelere karşı değil,
sorgudan türetilen sentetik bir nesneye karşı değerlendiriliyor. Bu, depodaki
mevcut davranışla birebir uyumlu:

| Sorgu | Kural | Sonuç |
|---|---|---|
| `routes` + `where("visibility","==","public")` + `limit(40)` | `resource.data.visibility == 'public'` | ✅ allow (eşitlik filtresi kanıtlanıyor) |
| `routes` filtresiz + `limit(40)` | aynı | ❌ deny (sentetik nesnede alan yok → hata) |
| `stories` filtresiz + `limit(50)` | `createdAt >= request.time - duration.value(24,'h')` | ❌ **hata** — akış kırıldı |

Aralık filtresi (`>=`) eşitlik gibi kanıtlanamıyor; kanıtlanabilse bile istemci
saatine bağımlı olurdu (`cutoff`, `request.time - 24h`'ten milisaniyeler önce
hesaplandığı anda akış kapanırdı).

**Yapılan:** `stories` `allow list` yeniden `boundedList(50)` oldu; 24 saat
penceresi `allow get`'te kaldı (doğrudan id ile okuma — kalıcı bağlantı sızıntısı
— kapanmış durumda; süresi dolmuş hikâyeyi yalnız sahibi okuyabiliyor).
Gerekçe ve kalan risk kural dosyasına yorum olarak işlendi, ayrıca
`firestoreRulesStructure.test.ts`'e **negatif kilit** eklendi: hikâye `allow list`
satırı bir daha `resource.data`'ya dokunamaz.

**Kalan 🟡 risk (ürün kararı gerektirir):** oturumsuz ve filtresiz bir liste
sorgusu, süresi dolmuş hikâyeleri 50 kayıtlık sayfalar hâlinde döndürebilir.
Bunu kapatmanın iki yolu var: (a) `allow list: if signedIn() && boundedList(50)`
— misafir akışını kapatır, mevcut testin beklentisini değiştirir; (b) TTL/veri
modeli değişikliği (gün bazlı koleksiyon veya süre dolunca temizlik). İkisi de
ayrı onay konusu; bu PR'da uygulanmadı.

**Not:** Aynı nedenle `tracks` list kuralı (`resource.data.authorUid ==
request.auth.uid`, satır ~550) filtresiz sorguda hiç başarılı olamaz. Mevcut
(main'de de aynı) bir kural olduğu için bu PR'da dokunulmadı; istemci sorgusu
`authorUid` eşitlik filtresi gönderiyorsa çalışır.

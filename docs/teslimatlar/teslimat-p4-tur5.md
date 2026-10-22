# P4 Tur 5 teslimatı — hesap silme kapsamı, veri indirme, yetim mesajlar

Dal: `arena/b1dcae9e-atlasia` · Taban: `arena/237e8e1c-atlasia` (ve `origin/main`, ikisi de HEAD'in atası; merge gerekmedi)
Hedef PR: `main` · Açıklama: **Supersedes #44**

## 1. Commit listesi

| Sıra | Commit | Kapsam |
|---|---|---|
| 1 | `c584d90` | Görev 1–2: cihaz hesabı backend'e göre silinir; Firebase'de yeniden doğrulama veri silmeden önce |
| 2 | `facd4aa` | Görev 3: blocks, collection-group yanıtlar, grup indeksi sayfalama, joinAttempts penceresi, davetler |
| 3 | `fda71b4` | Görev 6: grup silinince yetim mesajlar (sahip dalı) |
| 4 | `52d36ac` | Görev 4: Verilerimi indir (KVKK md. 11) |
| 5 | `6cee028` | Görev 5 (P18): yorum girdisi kontrastı/odak, grup mesaj girdisi aria-label |
| 6 | (bu commit) | Teslimat dosyası |

Not: Görev 3 ve 6 sırası, kodun bağımlılığı nedeniyle (görev 3 deleteGroup'a dokunmaz; görev 6 messages kuralı ve deleteGroup'u değiştirir) önce 3 ayrı commit olarak kuruldu; sonra 6 eklendi. Görev 6 commit'i, görev 3 commit'inde kalan io testindeki eski beklentiyi (sahibin grubunda arkadaşın mesajı kalır) ve kural testini değiştirir; her commit kendi içinde test kapsamına sahiptir.

## 2. Komut çıktıları (yerel, son durum)

| Kapı | Sonuç |
|---|---|
| `npm ci` | çıkış 0 |
| `npm run typecheck` | çıkış 0 |
| `npm run lint` (`--max-warnings=0`) | çıkış 0 |
| `npm run test:run` | çıkış 0 — 79 dosya, 486 test geçti |
| `npm run test:scripts` | çıkış 0 — 7 + 6 + 6 node testi geçti, 0 başarısız |
| `npm run build` (prebuild env + postbuild bütçe) | çıkış 0 — "Bundle bütçesi içinde." |
| `npm run audit:check` | çıkış 0 — "Üretim bağımlılıklarında bilinen açık bulunmadı." |
| `npm run verify:social-metadata` | çıkış 0 |
| `npm run test:rules:emulator` | **yerelde koşturulamadı**: sandbox'ta Java yok ve emulator jar'ının host'u (storage.googleapis.com) erişilebilir değil. Kanıt CI'dan alınacak (bkz. §6). |

Yerel birim testi kapsamı (ilgili dosyalar): `src/lib/moderation.account.test.ts`, `src/lib/moderation.io.test.ts` (25 test, 3a–e ve görev 6 dahil), `src/lib/accountExport.test.ts` (11 test).

## 3. Görev bazında sonuç

**Görev 1 — cihaz hesabı silinebiliyor.** `deleteAccount({uid, backend, password?})`. `backend` kullanıcının kendi hesabından gelir (`firebaseApp` varlığından değil). Cihaz yolunda Firestore'a hiç dokunulmaz: yalnız `deleteDeviceAccount` + yerel temizlik. Firebase yolunda: yeniden doğrulama → `deleteUserData` → Auth `deleteUser`. Testler: iki yol ayrı birim testi (`moderation.account.test.ts`).

**Görev 2 — yeniden doğrulama önce.** ProfilePanel onay penceresine (yalnız Firebase hesabında) şifre alanı eklendi. `reauthenticateWithCredential` başarısızsa `deleteUserData` çağrılmaz (test: reauth başarısız → veri silme yok). Türkçe hata metinleri: "Şifre yanlış. Hiçbir veri silinmedi." vb. Google/Apple: popup ile yeniden doğrulama.

**Görev 3 — kapsam boşlukları (3a–e), her biri birim testli:**
- 3a `users/{uid}/blocks` → `OWN_SUBCOLLECTIONS`'a eklendi. Test: `3a`.
- 3b Yanıtlar: `collectionGroup("replies")` + `where authorUid == uid` + sayfalı silme. Rules: yalnız collection-group `list`, `resource.data.authorUid == request.auth.uid && boundedList(50)`. Emulator testi: kendi yanıtını listeler; başkasınınkini ve filtresizi listeleyemez; yabancı (anonim) reddedilir. Birim testi: `3b`.
- 3c Grup indeksi: `leaveOrDeleteGroups` artık sayfalı (50/sayfa, 200 sayfa sınırı); önceki tek sayfa (50) kalıntı bırakabiliyordu. Birim testi: 60 grup → hepsi çıkar (`3c`).
- 3d `joinAttempts`: delete yalnız kendi belgesi ve `request.time >= windowStart + 15dk`. Hesap silmede `cleanupOwnJoinAttempt` pencere + 2 dk saat payı dolmamışsa silmez, `kept` olarak raporlar. Emulator testi: açık pencere silinemez, başkasınınki silinemez, dolmuş kendi kaydı silinir. Birim testi: `3d` (kept=1).
- 3e Davetler: `users/{uid}/groupInvites` ve `groups/{id}/invites/{uid}` birlikte silinir; başkasının davet kaydı kalır. Birim testi: `3e`.
- Adım raporu (`steps`) yeni adımları içerir: `users/blocks`, `replies`, `groups` (kept), `users/groupInvites`.

**Görev 4 — Verilerimi indir (KVKK md. 11).** `src/lib/accountExport.ts`: kendi koleksiyonları sayfalı okunur (20/sayfa, imleç ile; mevcut `boundedList` sınırlarının altında). Çıktı: `schemaVersion` (1), `exportedAt` (ISO), `uid`, `backend`, `account` (ad/e-posta), `collections` (koleksiyon → kayıt dizisi, her kayıtta `id`). Timestamp → ISO. Başkasının verisi: grup mesajlarında yalnız kendi mesajları; arkadaşlıkta yalnız karşı uid + ad (arkadaş indeksi). Cihaz hesabı: yalnız yerel `atlasia.places.v2`, `atlasia.posts.v2`, `atlasia.stories.v2` (yalnız bu uid'nin kayıtları). Hata yutulmaz; herhangi bir okuma hatasında dosya üretilmez ve hata gösterilir. ProfilePanel'de "Verilerimi indir" düğmesi. Testler: alan seçimi, Timestamp dönüşümü, geçersiz tarih, 45 kayıtlı sayfalama, grup mesajı sahipliği, arkadaş alanı, hata yayılımı (kısmi dosya yok), boş uid, cihaz yolunda Firestore isteği yok, bozuk yerel veri.

**Görev 5 (P18) — dosya talepleri:**
- SocialPanel yorum girdisi: placeholder `mint/35` → `mint/65`. Ölçüm (WCAG, `ink` #021512 ve `ink-2` #04201b üzerinde): `mint/35` = 2,96:1 (yetersiz); `mint/50` = 4,8 / 4,67; `mint/65` = 7,39 / 7,0. Odak: `focus:ring-2 focus:ring-sun/40` eklendi (yalnız sınıf değişikliği; görsel doğrulama yapılmadı).
- GroupsPanel mesaj girdisi: `aria-label="Gruba mesaj yaz"`.

**Görev 6 — grup silinince yetim mesajlar.** `deleteAllGroupMessages` (sayfalı, 50/sayfa, 200 sayfa sınırı; sınır aşılırsa hata). `deleteGroup` önce mesajları, sonra grup + sahibin indeksini siler. Rules `messages.delete`: `senderUid == auth.uid` **veya** `get(groups/{groupId}).data.ownerUid == auth.uid`. Emulator testleri: sahip başkasının mesajını siler; üye kurucunun mesajını silemez; yabancı silemez; üye kendi mesajını silebilir. Birim testi: kurucu grubu silince başkasının mesajı da kalkar.

## 4. Firestore kuralları ve indeksler — DEPLOY NOTU

Bu PR `firestore.rules` değiştirir. **Deploy bu PR'da yapılmadı ve yapılmamalı; merge'den önce yapılması gerekir.**

- Değişen kurallar: (a) `messages.delete` sahip dalı, (b) `joinAttempts.delete` (kendi belgesi + pencere dolmuş), (c) yeni `match /{path=**}/replies/{replyId}` (yalnız collection-group `list`).
- `firestore.indexes.json`: **değiştirilmedi.** Gerekçe: yanıt sorgusu tek alan eşitliğidir (`authorUid == uid`); Firestore collection-group tek alan indeksini otomatik oluşturur. Bileşik indeks gerekmez.

**Deploy sırası (denetçi için):** 1) `firebase deploy --only firestore:rules,firestore:indexes` (indeks değişikliği yok, yalnız rules) → 2) doğrulama (hesap silme ve grup silme, joinAttempts) → 3) PR merge. Ters sırada (merge önce) yeni istemci, henüz güncellenmemiş kurallarla başarısız olabilir: sahibin grup silmesi mesaj temizliğinde `permission-denied` alır ve hesap silme adımı açık hata verir (veri yarım silinmez; adım raporu hatayı gösterir).

Deploy bu oturumda yapılmadı. Cloudflare/Firebase Console ayarına dokunulmadı.

## 5. Varsayılan kararlar

- **Görev 1–2 tek commit (`c584d90`).** Varsayılan karar: birleşik commit. Gerekçe: iki değişiklik `deleteAccount` içinde iç içe; ayrı ara commit için sahte bir ara durum (ör. reauth yok ama backend ayrımı var) yazmak gerekirdi.
- **Yeniden doğrulama sağlayıcısı.** Varsayılan karar: `password` → şifre zorunlu; `google.com`/`apple.com` → popup; diğer sağlayıcı → `auth/reauth-unsupported` (silme yok). Gerekçe: silme geri alınamaz; desteklenmeyen yolda veri silmemek daha güvenli.
- **Eski `reauth` çağrısı yalnız silmeden önce.** Varsayılan karar: yeniden doğrulama başarısızsa `deleteUserData` çağrılmaz. Gerekçe: görev 2 kabul kriteri.
- **joinAttempts saat payı.** Varsayılan karar: silme için `windowStart + 15dk + 2dk` geçmeli. Gerekçe: istemci saati sunucudan geride olabilir; pencere dolmadan silinirse sayaç atlatılabilir. Açık kalanlar `kept` ile raporlanır.
- **Yanıt collection-group okuma kapsamı.** Varsayılan karar: yalnız `list`, `authorUid == auth.uid && boundedList(50)`. Gerekçe: en dar izin; `get` izni eklenmedi (doğrudan okuma mevcut `posts/{id}/replies` kurallarıyla belirlenir, değişmedi).
- **Silmede indeks değişikliği yok.** Varsayılan karar: `firestore.indexes.json` değiştirilmedi. Gerekçe: §4.
- **Veri indirme sayfa boyutu.** Varsayılan karar: 20. Gerekçe: en küçük `boundedList` sınırı (`users/{uid}/groups`, `userProfiles`) 20; her koleksiyon bu sınırda sorgulanabilir.
- **Veri indirmede bildirimler dahil.** Varsayılan karar: `users/{uid}/notifications` dahil. Gerekçe: alıcının kendi aldığı bildirimler; içinde aktör adı olabilir, bu kullanıcının kendi aldığı veridir.
- **Cihaz yolunda dışa aktarım kapsamı.** Varsayılan karar: yalnız gönderiler (places/posts/stories). Gerekçe: cihaz yolunda kayıtlı yer/rota ve geri bildirim için yerel anahtar yapısı bu dosyanın sahipliği dışında (bkz. DOSYA TALEBİ).
- **Feedback girişi ProfilePanel'de (önceki karar).** Korundu.
- **Mesaj temizliği sınırı.** Varsayılan karar: 200 sayfa × 50 = 10 000 mesaj üst sınırı; aşılırsa hata, sessiz kesme yok. Gerekçe: sınırsız döngü yerine açık hata.
- **PR #19 ve diğer açık PR'lar.** Varsayılan karar: #44, #40, #37 ve #19 kapatılmadı. Gerekçe: standing talimatta bu PR'lar kapatılmaz; Tur 4'teki "#19 kapatma en sonda" notu bu turda kapatma yetkisi olarak uygulanmadı. Denetçi karar verir.

## 6. CI kanıtı

- PR: https://github.com/efezztxj/Atlasia/pull/45 (base `main`, "Supersedes #44")
- Kanıtlanan commit: `d44d1ad` (görev 1–6 + teslimat planı; bu commit'te CI tam koştu)
- Workflow: "Atlasia CI", run `39728027301`
- Job: "Security, typecheck, lint, test and build" — job ID `119656428700` — conclusion: **success** (`gh api repos/efezztxj/Atlasia/actions/jobs/119656428700`)
- Adım sonuçları (aynı job içinde, hepsi `success`): Check production dependency security baseline · Typecheck · Lint · Unit tests · Script tests (no credentials) · **Firestore security rules tests** · Production build and bundle budget
- `gh pr checks 45`: `Security, typecheck, lint, test and build` → pass (1m14s); `Cloudflare Pages` → pass (PR önizlemesi; deploy değil, Cloudflare Console ayarına dokunulmadı)
- Sonraki yalnız-doküman commit'i (bu dosyanın son hâli) ayrı bir CI koşusu tetikleyebilir; kanıt `d44d1ad` üzerinedir.

## 7. DOSYA TALEBİ

- **`src/lib/deviceAccounts.ts`** | `deleteDeviceAccount` sonrası sessionStorage temizliğinde boş `catch` var; hata sessizce yutuluyor (kural ihlali) | catch'i kaldır veya hatayı çağırana ilet (en az `console.warn` + fırlatma kararı).
- **`src/hooks/useCollections.tsx` / yerel kayıt katmanı (P2/P3)** | Cihaz yolunda kayıtlı yer/rota ve geri bildirim yerel anahtarlarının adı ve şekli dışa aktarımda yok | Anahtar adlarını ve kayıt şemasını dışa aktarım için sabit olarak dışa aç (ör. `EXPORTABLE_LOCAL_KEYS`).
- **`ROADMAP/CHANGELOG önerisi`** (bkz. §9).

## 8. Açık kalanlar

- **Rules emulator kanıtı CI'da alındı** (`d44d1ad`, adım success). Yerelde Java/ağ kısıtı nedeniyle koşturulamadı.
- **Deploy.** §4 sırası; bu oturumda deploy yapılmadı.
- **Sahte Firestore sınırı.** `moderation.io.test.ts` ve `accountExport.test.ts` gerçek Firestore değil; kural davranışı yalnız emulator testleriyle kanıtlanır. Emulator'da başarısız bir kural testi çıkarsa CI log'u indirilemediği için test dosyası kurallarla satır satır karşılaştırılacak.
- **Yasal metin (P1), App Check enforcement, Cloud Functions, XP/rozet**: kapsam dışı.
- **Tur 4 kabul maddelerinden** routes get, storage.rules, XP/rozet kararları Tur 4 teslimatında kalır; bu turda değiştirilmedi.
- **Görev 5 görsel doğrulama** yapılmadı (yalnız sınıf ve öznitelik değişikliği).

## 9. ROADMAP/CHANGELOG önerisi

- CHANGELOG: "Hesap silme: cihaz hesapları silinebilir; Firebase hesabında yeniden doğrulama veri silmeden önce; grup silinince mesajlar da temizlenir; Verilerimi indir (JSON)."
- ROADMAP: P4 hesap silme kapsamı tamam (blocks, yanıtlar, davetler, joinAttempts açık kalanları raporlanır); sonraki adım: cihaz yerel kayıtlarının dışa aktarımı (§7).

## 10. Son kontroller

- `git diff --check`: çıkış 0, çıktı yok (bu dosyanın son hâli commit'lenmeden önce çalıştırıldı).
- `git status --short`: bu teslimat commit'i atıldıktan sonra temiz olmalı (commit sonrası çıktı teslimat mesajında verildi).
- Deploy yapılmadı; main'e merge yapılmadı; PR #44, #40, #37, #19 kapatılmadı.

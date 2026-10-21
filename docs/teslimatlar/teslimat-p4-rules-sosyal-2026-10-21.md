# P4 Teslimat — Rules, Sosyal, Gizlilik, Erişilebilirlik (2026-10-21)

Dal: `arena/f80b0256-atlasia` · Taban: `origin/main` = `0ad774f` (Merge PR #36)

Başlangıçta `git fetch origin && git log --oneline -3 origin/main` çıktısı:

```
0ad774f Merge pull request #36 from efezztxj/arena/523be6c2-atlasia
```

PR #37 (`arena/b767caf0-atlasia`) bu dala `git merge` ile alındı (ilk merge'de yerel sığ klon nedeniyle
`unrelated histories` hatası çıktı; `git fetch --unshallow` ile çözüldü, geçmiş bozulmadı). Düzeltmeler yeni commit'lerdir.

---

## Durum özeti (dürüst)

Bu teslimat **tam P4 kapsamını kapatmıyor**. Kapsam çok geniş; bu turda kırmızı CI'ın olası kök nedeni
ve grup katılım akışının güvenlik maddeleri (RED b, c, d, e, f) ele alındı. Diğer maddelerin durumu
aşağıdaki tabloda açıkça yazıldı; "Yapılmadı" olanlar bir sonraki turdadır.

**Yerel emulator çalıştırılamadı.** Sandbox'ta Java yok (`apt` paketi yok) ve emulator indirme adresi
(`storage.googleapis.com`) dış erişim listesinde değil. Bu yüzden `npm run test:rules:emulator` yerelde
koşmadı. Rules testlerinin geçtiğinin kanıtı **PR'daki CI'dır**. Kırmızı CI'ın log'u da (`Firestore security
rules tests` adımı) API üzerinden alınamadı; kök neden kodu okuyarak bulunan aday olarak yazılmıştır.

---

## 1) Taban ve birleştirme

| Adım | Sonuç |
|---|---|
| `origin/arena/b767caf0-atlasia` (PR #37) → bu dal | birleşti (merge commit `e35d8e9`) |
| Düzeltmeler | yeni commit'ler: `c8438fb`, `df308e6`, `12cc459` |

## 2) Kırmızı CI — rules adımı (RED a)

Durum: CI job `Security, typecheck, lint, test and build` → **failure** yalnız `Firestore security rules tests` adımında
(önceki adımlar yeşil; `main` aynı adımda yeşil). Log indirilemedi.

**Aday kök neden (uygulandı ama CI'da yetmedi):** `firestore.rules` içinde `match /friendships/{friendshipId}`
wildcard değişkeni, aynı adlı `friendshipId(a, b)` fonksiyonunu gölgeliyor
(`friendshipId == friendshipId(...)`). Bu, rules değerlendirmesinde çağrının değişkene bağlanmasına yol açabilir;
C1 testinin meşru kabul batch'i (`okBatch`) bu yüzden reddedilmiş olabilir. Değişken `fid` olarak yeniden adlandırıldı.
Bu kesin neden değildir; PR'ın CI sonucu bunu doğrulayacak. Kırmızı kalırsa log'a bakılmalı.

**Kanıt:** rules değişikliği yerelde çalıştırılamadı → "çalıştırılamadı". Kanıt CI'dır.

## 3) Madde → dosya/test → durum

| # | Madde | Dosya / test | Durum |
|---|---|---|---|
| 0 | PR #37 dala alındı, "Supersedes #37" PR | merge `e35d8e9`; PR bu turda açıldı (aşağıda) | ✅ |
| 1a | CI rules hatası | `firestore.rules` (`fid`); PR #40 CI'da hâlâ kırmızı; hangi test olduğu log erişilemediği için belirsiz | ❌ çözülmedi |
| 1b | Okumasız katılma / davet | `src/lib/groups.ts` `joinGroupWithCode`, `acceptGroupInvite`; IO testleri | ✅ |
| 1c | Sunucu zorunlu deneme sayacı | `firestore.rules` `groups/{g}/joinAttempts/{uid}`; `tests/firestore.rules.test.ts` 4 yeni test | ✅ kural + test yazıldı, ⚠️ CI bekliyor |
| 1c' | `lockedUntil`, istemci `attempts`, `"000000"`, `users/{uid}/joinAttempts` kaldırıldı | `firestore.rules`, `groups.ts` | ✅ |
| 1c'' | Kullanıcı kendi deneme kaydını silemez | `allow delete: if false` + test | ✅ (test) |
| 1d | Boş/sessiz catch; işlem içi işlem dışı okuma | `groups.ts` (runTransaction kaldırıldı); `moderation.ts` (sessiz `0` kaldırıldı) | ✅ (kısmi, aşağıda) |
| 1e | Deploy uyumu | KARAR aşağıda | ✅ |
| 1f | IO testleri (okumasız, yanlış kod, bayat, davet) | `src/lib/groups.io.test.ts` (6 yeni test) | ✅ geçiyor |
| 1f' | Emulator akışı (SUCCEED/FAIL sırası) | `tests/firestore.rules.test.ts` | ⚠️ CI bekliyor |
| 1f'' | C1 karşılıklı rıza testleri | mevcut test korunmuş; `fid` ile | ⚠️ CI bekliyor |
| 2 | `routes` `allow get` `resource == null` | KARAR: değişiklik yok (aşağıda) | ✅ karar |
| 3 | Çok hesapla deneme riski | aşağıda açık risk | 📝 teslim |
| 4 | `userProfiles` okuma yüzeyi | KARAR: bilinçli, mevcut test kilitli (aşağıda) | ✅ karar |
| 5 | Bilinmeyen bildirim tipi | rules create'de reddediyor; istemci normalizasyonu yapılmadı | ❌ yapılmadı |
| 6 | Eski gömülü reply verisi | yapılmadı | ❌ yapılmadı |
| 7 | Storage | KARAR: kapalı kalır (aşağıda) | ✅ karar |
| 8 | XP/rozet | yapılmadı | ❌ yapılmadı |
| 9 | Grup/sohbet moderasyonu | yapılmadı (aşağıda: mevcut durum) | ❌ kısmi |
| 10 | Gizlilik metni | yapılmadı | ❌ yapılmadı |
| 11 | Hesap silme tam kapsam | yalnız sessiz hata düzeltildi; koleksiyonlar eksik | ⚠️ kısmi |
| 12 | Verilerimi indir | yapılmadı | ❌ yapılmadı |
| 13 | Erişilebilirlik (P18) | yapılmadı | ❌ yapılmadı |
| 14 | PR #19 kapatma | aşağıda | ⏳ yeni PR birleşince |
| 15 | ROADMAP/CHANGELOG önerisi | aşağıda | ✅ öneri |

## 4) KARAR satırları

- **KARAR (e) grup create uyumu:** `validGroupCreateShape` artık yalnız `validGroupShape` + `createdAt == request.time`.
  `memberUids` 1–20 serbest (main ile aynı), `joinCode` yoksa kabul, varsa 6–8 hane. | GEREKÇE: main'deki eski
  istemci çok üyeli/kodsuz grup yazıyordu; #37'nin `size()==1` ve zorunlu kodu bunu kırıyordu. | ALTERNATİF: "önce
  istemci, sonra rules" (reddedildi, yeni istemci kodlu grup yazar ama eski rules `joinCode` alanını reddeder) |
  GERİ ALMA: create kuralını #37 haline döndürmek (eski istemci kırılır).
- **KARAR (b/c) iki yazım, tek batch değil:** Yanlış kodda grup güncellemesi reddedilince batch'in tamamı geri alınır;
  sayaç da artmazdı. Bu yüzden deneme yazımı AYRI commit, üyelik batch'i ikinci adım. Madde (b)'deki "tek batch" bu
  nedenle uygulanmadı. | ALTERNATİF: tek batch + sayacı rules içinde değil istemcide tutmak (reddedildi: sayaç
  aşılabilir) | GERİ ALMA: istemci tarafı değişikliği.
- **KARAR (c) get vs getAfter:** Kural `get(deneme)` kullanır (deneme önceden commit edilmiş). Aynı batch'te
  yazılan deneme için `getAfter` gerekirdi; ayrı commit tasarımında `get` yeterli ve daha basit. | GERİ ALMA: n/a.
- **KARAR (c) pencere:** Sabit pencere 15 dk (`JOIN_ATTEMPTS_WINDOW_MS`), pencere içi en fazla 5 deneme,
  dolunca sayaç 1. Kod eşleşmesi için deneme `at` değeri son 2 dk içinde olmalı. | GEREKÇE: OWASP 5 deneme; 15 dk
  UX dengesi. | GERİ ALMA: `firestoreLimits.ts` sabiti + kural sabiti (iki yerde; birleşik sabit için not).
- **KARAR (d) sessiz hata:** `moderation.ts` `deleteOwnedVerifications` hata yutmuyor. Silinemeyen doğrulama varsa
  hesap Auth'tan silinmez. | GERİ ALMA: try/catch geri eklenir (önerilmez).
- **KARAR (2) routes `resource == null`:** Değişiklik YAPILMADI. Mevcut test "henüz olmayan rota belgesinin ön okuması
  reddedilir" kasıtlı davranışı kilitliyor; istemci yayını ön okumasız yapıyor. | GEREKÇE: gevşetme gerekmez.
- **KARAR (4) userProfiles:** Okuma `signedIn` + `limit ≤ 20` olarak bilinçli. Profil alanları yalnız
  `displayName`, `photoURL`, `uid`, `createdAt`, `updatedAt`; başka alan yazılamaz (mevcut test kilitli). | GERİ ALMA:
  okumayı `request.auth` ile daraltmak (arkadaş/grup kapsamı) ürün kararıdır.
- **KARAR (7) storage:** Kapalı kalır (`storage.rules` tümü `false`). Fotoğraflar Firestore'da data URL
  olarak (≤180 KB, jpeg regex) tutuluyor. | GEREKÇE: açmak için ayrı bucket, App Check ve kota kararı gerekir;
  bu turda açılmadı. | ALTERNATİF: Storage açmak (sıkı kurallarla) — ayrı teslimat.
- **KARAR (14) PR #19:** Kapatılmadı. Yeni PR birleşince kapatılacak (kullanıcı onayı ile).
- **KARAR (joinAttempts silme):** Kullanıcı kendi denemesini silemez (RED f). Hesap silmede bu belgeler
  kalır; yalnız kod+sayaç içerir. Temizlik için sunucu tarafı TTL/zamanlanmış iş önerilir (aşağıda).

## 5) Deploy uyumu (RED e)

`main`'de kod ile katılma (`joinGroupWithCode`) ve `joinAttempts` yoktur (kontrol: `git show main:src/lib/groups.ts`
ve `main:firestore.rules` → 0 eşleşme). Bu özellik henüz üretimde değil; eski istemci kod ile katılma yapmaz.
**Sıra: rules önce, istemci aynı sürümde** — güvenli çünkü eski istemcinin kırılacağı bir kod-katılma yolu yok.

## 6) Regresyon kanıtları

| Test | Eski kod (#37 / `main` benzeri) | Yeni kod | Kanıt |
|---|---|---|---|
| `groups.io`: üye olmayan kodla katılır (okumasız) | ❌ düşer | ✅ | yerel: `git show HEAD:src/lib/groups.ts` ile çalıştırıldı, 6 test × |
| `groups.io`: yanlış kod sayacı artırır | ❌ | ✅ | aynı |
| `groups.io`: 6. deneme `group/locked`, pencere dolunca başarı | ❌ | ✅ | aynı |
| `groups.io`: davet kabulü grup belgesi okumadan | ❌ | ✅ | aynı |
| `moderation.io`: doğrulama silme hatası yayılır | ❌ düşer (0 döner) | ✅ | yerel: `git show HEAD:src/lib/moderation.ts` ile × |
| `firestore.rules.test.ts` okumasız katılma / 6. deneme / bayat / silme / geri yazma | CI bekliyor | CI bekliyor | emulator yerelde yok |

Eski kod kanıtları yerelde alındı; dosyalar kanıttan sonra yeni haline geri yüklendi (`cmp` ile doğrulandı).

## 7) Kalite kapısı (gerçek çıktı, yerel)

| Kapı | Sonuç |
|---|---|
| `npm ci` | ✅ rc=0 |
| `npm run typecheck` | ✅ rc=0 |
| `npm run lint` (`--max-warnings=0`) | ✅ rc=0 |
| `npm run test:run` | ✅ 75 dosya, 449 test geçti |
| `npm run test:scripts` | ✅ 7 + 6 + 6 pass, 0 fail |
| `npm run build` (bütçe dahil) | ✅ "Bundle bütçesi içinde." |
| `npm run audit:check` | ✅ "Üretim bağımlılıklarında bilinen açık bulunmadı." |
| `git diff --check` | ✅ (fazla satır sonu düzeltildi) |
| `npm run test:rules:emulator` | ❌ **çalıştırılamadı** — Java yok, emulator indirilemiyor. Kanıt CI'dır. |

## 8) Açık riskler ve eksikler

- **Çok hesapla deneme (madde 3):** Sayaç `(grup, uid)` başınadır. Yeni hesaplarla 5 deneme/15 dk sınırı
  aşılabilir; kodla çözülemez. Öneri: (a) App Check enforce (Firebase konsolu, deploy değil — kullanıcı yapar),
  (b) hesap açma hız sınırı (sunucu tarafı, ayrı teslimat), (c) kod uzunluğunu artırma (8 hane).
- **Eski grup (kodsuz):** Kod ile katılma yolu kapalıdır; davet yolu çalışır. Kodsuz grupta yanlış kod mesajı
  yerine "katılınamıyor" mesajı gösterilir.
- **Zaten üye:** `users/{uid}/groups` indeksi varsa `group/already-member` döner (grup okunmadan). İndeks
  yoksa ama üye ise kod denemesi `group/bad-code` gibi görünebilir.
- **Kurucu kodu yenileme**, `rotateGroupCode`, hâlâ grup belgesini okur (kurucu üye olduğu için izinli); kapsam dışı bırakıldı.
- **Sayaç belgeleri temizliği:** Kullanıcı silemez; TTL/zamanlanmış temizlik önerilir (bkz. kullanıcı adımları).
- **Madde 5 (bildirim tipi):** Rules create'te tip listesini zaten zorluyor (`validNotification`). İstemci
  okuma tarafında bilinmeyen tip normalizasyonu yapılmadı.
- **Madde 9 (moderasyon, mevcut durum):** Grup mesajında bildir/engelle akışı yazılmadı. `visibleMessages` engellenen
  kullanıcıların mesajlarını gizliyor (test var). Bildirme için grup mesajı hedef tipi (`report`) `reports` kuralında
  yalnız `place|post|story|user` — **grup mesajı bildirimi kuralda desteklenmiyor**. Eksik: `targetType`'a `group_message`
  ekleme (rules) + istemci. Bu, `firestore.rules` değişikliği olduğundan sonraki turda emulator testiyle yapılmalı.
- **Madde 11 (hesap silme, eksik):** Şu an silinenler: places, posts, stories, reports, blocks, verifications,
  grup üyelikleri, `users/{uid}/groups`, `users/{uid}/notifications`. Eksik: `tracks`, `friendships` (list kapalı; `users/{uid}/friends`
  üzerinden `fid` hesaplanıp silinmeli), `users/{uid}/friends`, `users/{uid}/friendRequests` (gelen), `users/{uid}/groupInvites`,
  `users/{uid}/savedPlaces`, `users/{uid}/savedRoutes`, `userProfiles/{uid}`, `groups/*/joinAttempts/{uid}` (silinemez —
  KARAR yukarıda). Giden arkadaşlık istekleri başkasının alt koleksiyonunda; sahibi okuyamaz — açık risk.
  **Sahibi olunan grubun ne olacağı KARARI (öneri):** kurucu hesabını silince grup, en eski üyeye devredilir; üye
  yoksa grup silinir. Uygulama bu turda yapılmadı.
- **Madde 12 (verilerimi indir):** yapılmadı.
- **Madde 13 (P18 erişilebilirlik):** yapılmadı. Yalnız kendi dosyalarım için liste hazırlanmalı: Drawer, BottomPanel,
  ReportDialog, Story*, Onboarding, AddDiscoveryModal, Header, AtlasAssistant, sosyal paneller, ProfilePanel.
- **Madde 8 (XP/rozet):** yapılmadı. `ProfilePanel`'de ölü kod olup olmadığı incelenmeli; karar bu turda verilmedi.

## 9) DOSYA TALEPLERİ

| Dosya | Neden | Önerilen değişiklik |
|---|---|---|
| `src/config/firestoreLimits.ts` | (P4'te; bilgi) | `JOIN_ATTEMPTS_WINDOW_MS` ve kural'daki `15,'m'` tek kaynak olsun diye not; şimdilik iki yerde |
| `src/components/GroupsPanel.tsx` (P4'te) | yeni hata kodları `group/locked`, `group/already-member` | Mesaj eşlemesi (UI) — bu turda dokunulmadı; mevcut `error.message` gösteriliyor |
| `src/lib/routeData*` / P2 dosyaları | yok | — |

## 10) ROADMAP / CHANGELOG önerisi (P1 işleyecek)

- ROADMAP §Adım 16 (Grup ve sohbet): "Kod ile katılma okumasız; sunucu zorunlu deneme sayacı (15 dk, 5 deneme)."
- ROADMAP §Adım 16: "Açık: grup mesajı bildirimi, hesap silmede tracks/friendships/friends/profil, Verilerimi indir."
- CHANGELOG: "Grup kod ile katılma: grup belgesi okunmadan katılım; deneme sayacı sunucuda; davet kabulü okumasız."
- CHANGELOG: "Hesap silme: doğrulama kayıtları silinemezse işlem durur (sessiz başarı kaldırıldı)."

## 11) Kullanıcının elle yapacakları (deploy sırası dahil)

1. PR CI'ını kontrol et: `Firestore security rules tests` yeşil mi? Kırmızıysa log'u GitHub Actions'tan oku ve bu teslimata bildir.
2. Birleşme ve deploy kararı size ait. Deploy sırası: **Firestore rules önce**, ardından istemci (aynı sürüm). Gerekçe: bölüm 5.
3. Firebase Console (kod değişikliği değil): App Check enforce durumunu kontrol et (çok hesapla deneme riski).
4. Firebase Console: `groups/{g}/joinAttempts` için TTL politikası tanımlamak istersen alan `at`. (Kural değişikliği gerekmez; yalnız konsol.)
5. PR #19'u kapatmak için: yeni PR birleşince kapat (`gh pr close 19`). Şu an kapatılmadı.
6. Emulator'ı yerelde çalıştırmak istersen Java 21 kur; ardından `npm run test:rules:emulator`.

## 12) PR ve CI sonucu

- PR: **#40** — `[P4] Rules, okumasız grup katılımı, deneme sayacı (Supersedes #37)` (base `main`, head `arena/f80b0256-atlasia`). Birleştirilmedi.
- CI (run `39682859064`, job `119509451685`): **KIRMIZI**. Yalnız `Firestore security rules tests` adımı başarısız;
  diğer tüm adımlar (typecheck, lint, unit, script, bütçe öncesi) yeşil.
- Cloudflare Pages önizleme: geçti.
- **Log okunamadı:** GitHub log uç noktası sandbox'tan erişilemiyor (`results-receiver` EOF). Hangi rules testinin düştüğü
  bu yüzden **doğrulanamadı**.
- Uygulanan olası düzeltme (friendships `fid`) tek başına yetmedi. Bu turda CI kırmızı teslim ediliyor; kapı
  "CI kırmızıyken teslim yok" kuralını karşılamıyor. Açık iş: kırmızı rules adımının test adını bulmak.
  Doğrulama yolu: GitHub Actions sayfasında job loglarını açıp başarısız `it(...)` adını bu dosyaya eklemek; ardından
  o testi düzeltmek ve regresyon kanıtını eklemek.
- Kontrol edilen ve sorun çıkmayan kural yapıları (dokümantasyonla): string `<` karşılaştırması (lexicographic destekli),
  `split`, `duration.value`, `timestamp + duration`, `getAfter`, nested `function` (match içinde).

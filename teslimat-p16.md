# Teslimat P16 — Testsiz modül kapsama maratonu: kapanış

**Tarih:** 2026-10-21 (Europe/Istanbul)
**Branch:** `arena/4c96a101-atlasia`
**Taban commit:** `14c1040` (PR #26 merge)
**Son kod commit'i:** `a52db14` (bu teslimat/doküman commit'i hariç)
**Durum:** Tamamlandı. P16 kapsamında üretim davranışı değiştirilmedi;
bu daldaki tek üretim kodu değişikliği ayrı onaylı P13-B düzeltmesidir.

---

## 1. Sonuç özeti

- Test tabanı (PR #26 teslimat kaydı): **57 dosya / 284 test**.
- Bu dal sonrası yerel gerçek çıktı: **73 dosya / 399 test**.
- Artış: **16 yeni test dosyası / 115 yeni test**.
- Envanter sonucunda `src/lib` (15), `src/utils` (24) ve `src/hooks`
  (11) altındaki her üretim dosyasının en az bir ilişkili test dosyası var.

P16'nın önceki aşamaları:

- 1. tur utils: `teslimat-fix-ve-p16-2026-10-21.md`
- 2. tur adım 1 hesap katmanı: `teslimat-p16-tur2-adim1.md`
- Bu teslimat, kalan IO/fetch/hook adımını kapatır.

## 2. Bu dalda eklenen kilitler

| Alan | Dosyalar | Test | Kilitlenen sözleşmeler |
|---|---|---:|---|
| Bildirim IO | `src/lib/notifications.io.test.ts` | 6 | Yol, 200/500 kırpma, hedef alanı, normalizasyon, tekil/toplu okundu, silme |
| Doğrulama IO | `src/lib/verifications.io.test.ts` | 5 | Doğrulama kapıları, not kırpma/boş not, hata kodları, en yeni 50 penceresi |
| Rota/track IO | `src/lib/routeData.io.test.ts` | 18 | Koleksiyon aboneliği, publish/save sayaç transaction'ları, sahiplik yarışı, orphan temizliği, liste/track hata çevirisi |
| Photon ağ katmanı | `src/utils/openMapPlaces.network.test.ts` | 9 | Filtre/dedupe/sıralama, kısmi hata toleransı, cache, reverse hataları, dış abort ve 9 sn timeout |
| Hook altyapısı | `package.json`, `package-lock.json` | — | `jsdom`, `@testing-library/react`, `@testing-library/dom` yalnız devDependency |
| Hook'lar | 12 dosya (`useCollections` yerel+bulut ayrı) | 77 | Tema, bloklar, tazelik, panel odağı, galeri, kurulum, yerel veri, koleksiyonlar, geolocation, track recorder, Firestore veri orkestrasyonu |

Hook dosyaları:

- `useTheme.test.ts` (3), `useBlocks.test.ts` (4),
  `useFreshness.test.ts` (5), `usePanelAccess.test.ts` (5),
  `usePlaceGallery.test.ts` (5), `useInstallApp.test.ts` (8),
  `useAtlasData.test.ts` (6), `useCollections.local.test.ts` (5),
  `useCollections.cloud.test.ts` (5), `useGeolocation.test.ts` (12),
  `useTrackRecorder.test.ts` (9), `useFirestoreAtlasData.test.ts` (10).
- Önceden var olan `useFirestoreAtlasData.likes.test.ts` (13) korunmuştur;
  yeni RTL testi beğeni odağının dışındaki abonelik, sayfalama ve yazma
  orkestrasyonunu tamamlar.

## 3. Yöntem ve sınır

- IO testleri repo'nun mevcut `groups.io` / `moderation.io` desenini izler:
  Firestore istemci sınırında bellek içi sahte kullanılır; canlı ağ/Firebase
  çağrısı yapılmaz. Bu nedenle üç modül için ayrıca `createX(io)` factory
  refactor'ü yapılmadı; bu, repo'daki gerçek IO deseninin kontrolü sonrası
  bilinçli olarak seçilen daha risksiz yoldur.
- `routeData` sahtesi yalnız CRUD'u değil, transaction atomikliğini ve
  `increment` davranışını da modeller.
- Hook testleri dosya başına `// @vitest-environment jsdom` kullanır;
  global Vitest ortamı `node` olarak kaldı.
- Karakterizasyon sırasında bulunan davranışlar sessizce düzeltilmedi.

## 4. Kuşkulu / karar gerektirebilecek davranışlar

Bunlar bu teslimatta düzeltilmemiştir; P16 yalnız mevcut davranışı kanıtlar:

1. `useCollections.publishRoute`, yerel modda (`firebaseConfigured=false`)
   bile bulut `publishRoute + saveRouteReference` zincirini çağırır. Mock ile
   kilitlendi; gerçek yerel akışta ayrıca ürün kararı gerekebilir.
2. `useAtlasData.toggleLike`, `likedBy` üyeliğini değiştirir ancak sayısal
   `likes` alanını türetmez/güncellemez. UI başka yerde türetmiyorsa yerel
   modda sayaç ile üyelik ayrışabilir.
3. `fetchOpenMapPlaces`, cache isabetinde abort kontrolünden önce döner;
   önceden iptal edilmiş bir signal bile cache sonucunu alabilir (kod
   incelemesi notu; ayrıca testle kilitlenmedi).
4. `useFreshness`, uid yokken de doğrulama okuma aboneliğini açar; yazma
   kapısı ayrı çalışır. Bu kamusal okuma sözleşmesi olarak kilitlendi.
5. `useGeolocation`, geçersiz ilk ölçümde fix yazmaz ancak geçerli ölçüm
   aramak için refining/watch başlatır; testle açık sözleşme hâline getirildi.
6. Bildirim/doğrulama normalize fonksiyonları yalnız eksik (`null`/`undefined`)
   tip alanında varsayılan kullanır; bilinmeyen bir string tip/status cast
   ile korunur. Firestore Rules yazma tarafında bunu sınırlıyor olabilir.

## 5. Doğrulama (gerçek çıktılar)

| Komut | Sonuç |
|---|---|
| `npm ci` | ✅ 374 paket kuruldu, 375 paket denetlendi |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (`--max-warnings=0`) |
| `npm run test:run` | ✅ **73 dosya / 399 test** |
| `npm run test:owner-index` | ✅ 7/7 |
| `npm run build` | ✅; mevcut büyük chunk uyarısı ve `deviceAccounts` dynamic/static import uyarısı sürüyor (P19 borcu) |
| `npm run verify:social-metadata` | ✅ 18 değer, 1200×630 JPEG |
| `npm run audit:check` | ✅ üretim bağımlılıklarında bilinen açık yok |
| `npm run test:rules:emulator` | ⚠️ Yerelde çalıştırıldı ancak Java 21 bulunmadığı için ön koşulda durdu; geçti sayılmadı. PR CI'ında ayrıca doğrulanmalıdır |
| `git diff --check` | ✅ |

Hedefli koşular da dosya bazında yeşildir; ana kanıt yukarıdaki tam
`test:run` çıktısıdır.

## 6. Dosya/kilit kontrolü

- P16 üretim dosyaları değişmedi; eklenenler test dosyaları ve test
  bağımlılıklarıdır.
- `firestore.rules` değişmedi.
- `MapView.tsx` yalnız ayrı onaylı P13-B commit'inde değişti; P16 içinde
  dokunulmadı.
- Yeni bağımlılıklar yalnız `devDependencies` içindedir ve üretim bundle'ına
  girmez.

## 7. İnceleme ve kalan risk

- **İnceleme:** Yazar öz-incelemesinde tabandan üretim diff'inin yalnız
  onaylı `MapView.tsx` P13 değişikliği olduğu doğrulandı. Ayrı bir bağımsız
  kod incelemesi yapılmadı; PR CI sonucu ve kullanıcı incelemesi beklenir.
- En büyük kalan risk, sahte Firestore'un gerçek Firestore transaction/
  snapshot zamanlamasının birebir aynısı olmamasıdır. Rules tarafı emulator
  testlerinin, istemci davranışı bu IO testlerinin kapsamındadır.
- Sonraki görev için P16'dan açık kalan test borcu yoktur. Ürün sırasında
  P14/P15/P17–P20 ayrıca seçilmelidir.

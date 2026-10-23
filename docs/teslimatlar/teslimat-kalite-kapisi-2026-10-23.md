# Teslimat — politika kapısı, bundle marjı, #61 artıkları (2026-10-23)

Başlangıç: `main` @ `3038344` · Dal: `arena/b8594a8f-atlasia`

## 1. Politika kapısı (yeni)

`src/config/policyGate.test.ts` — 6 test. Daha önce `as any`, `@ts-ignore`,
`@ts-expect-error` ve `eslint-disable` yasaklarını **hiçbir otomatik adım
denetlemiyordu**: `eslint.config.js` içinde `@typescript-eslint/no-explicit-any`
bilinçli olarak `"off"`, `eslint-disable` ise lint'in kendi kaçış yolu. Bu yüzden
#72 ile bir `eslint-disable` `main`'e sessizce girmişti.

Kapsam ve kilitler:

- `src/`, `tests/`, `scripts/`, `public/` altındaki **273** kaynak dosya taranır.
- Kaçış listesi tek dosyadır (kapının kendisi) ve bu **test edilir** — liste
  büyütülemez.
- Tarama boş küme üzerinde yeşil sayılmaz (dosya sayısı + bilinen iki dosya
  varlığı doğrulanır).
- `firestore.rules` içinde koşulsuz izin (`allow …: if true`) sayısı **tam 2**
  ve yalnız `places` + `posts` `get` kuralında olabilir; catch-all fail-closed
  kalır; `.env*` ignore kuralı kilitlidir.

**Kapı gerçekten kırmızı olabiliyor mu?** Geçici ihlal enjekte edildi
(`src/utils/cn.ts`):

```text
× as any / ts-ignore / ts-expect-error / eslint-disable hiçbir kaynakta yok
AssertionError: expected [ 'src/utils/cn.ts:10 → as any', …(1) ] to deeply equal []
+   "src/utils/cn.ts:10 → as any",
+   "src/utils/cn.ts:9 → eslint-disable",
```

Dosya geri alındı (`git status` temiz), kapı yeşile döndü.

## 2. Bundle marjı

Başlangıç: `entry 171.090 B / 174.000 B` → marj **2.910 B (%1,7)**.

İki koşullu panel lazy sınıra alındı (`src/App.tsx`, `<Suspense fallback={null}>`):

| Panel | Neden | Ölçüm |
|---|---|---|
| `PlaceDetails` | Yalnız bir yer seçilince açılır; `utils/placeAdvice` bağımlılığını çeker | `entry 171.090 → 167.221` |
| `TrackRecorderPanel` | Yalnız "Yürüyüş kaydı" düğmesiyle açılır; `utils/track` (26 KB kaynak) bağımlılığı | `entry 167.221 → 160.557` |

Son durum:

```text
entry            160.557 B gzip   (bütçe 174.000)   marj %7,7
İlk HTML seti    403.845 B gzip   (bütçe 439.000)   marj %8,0
Toplam JS        882.777 B gzip   (bütçe 886.000)   marj %0,36
Toplam CSS        33.244 B gzip   (bütçe  34.500)   marj %3,6
```

**Dürüst not — toplam JS marjı daraldı.** Ham JS `2.993.008 → 2.994.327`
(**+1.319 B**) ama gzip `880.042 → 882.777` (**+2.735 B**). Yeni kod ~1,3 KB;
gzip'teki ek artış parça sayısının ikiye ayrılmasından gelen sıkıştırma
artefaktı (sözlük bölünmesi). Fark ham boyutta doğrulanabilir. Buna karşılık
**ilk yükte görülen** toplam 10.534 B gzip azaldı (`414.379 → 403.845`).
Toplam JS marjı bir sonraki özellikte sorun çıkarabilir; sıradaki aday
`AtlasAssistant` (yalnız panel açılınca görünür, `placeAdvice` + `weather`
bağımlılığı).

Kazanç `src/config/lazyLoading.test.ts` içine eklenen testle kilitlendi
(statik import yasağı + `Suspense` zorunluluğu).

## 3. #61 artıkları

| Dosya | Durum |
|---|---|
| `.github/pull_request_template.md` | Taşındı. Kural değişikliği kontrol listesi, dağıtım sırası (runbook §3), kapılar, kural testi kanıtı, geri alma |
| `docs/denetim/arkadaslik-kural-istemci-uyumu.md` | Taşındı ve **güncellendi**: test sayısı 48 → **58**, `friend-request/rules-mismatch` kodu bu kod tabanında yok (not yeniden yazıldı), §4 denetim maddeleri gerçek test adları/satırlarıyla eşlendi |
| `docs/denetim/istek-gonderilemedi-olay-kaydi.md` | Taşındı ve güncellendi: `§3.1` → runbook `§3`/`§4`, 48/48 → 58/58, kodda bugünkü durum bölümü eklendi |
| `src/lib/friendships.send.test.ts` | Yeniden yazıldı: #61'in sürümü artık var olmayan `firestoreErrorCode`'a dayanıyordu |

Yeni test dosyası `sendFriendRequest` davranışını kilitler (**10 test**): giriş
doğrulaması, artık indeksin kendi kendini onarması, `already-friends` /
`opposite-exists` / `exists` kodları, `permission-denied` dışındaki hatanın
yutulmaması, bildirim hatasının isteği düşürmemesi, ad normalizasyonu.
Mutasyon denetimi yapıldı: `permission-denied → exists` eşlemesi bozulunca
ilgili test kırmızıya döndü, geri alındı.

### Taşıma sırasında bulunan ve giderilen hata

Kural `validFriendRequest` içinde `stringBetween(fromName, 2, 100)` istiyor.
Firebase Auth `displayName` **1 karakter** olabiliyor; istemci yalnız boş adı
"Gezgin"e çeviriyordu. 1 karakterli adla istek `permission-denied` alıyor ve
istemci bunu `friend-request/exists` ("zaten istek göndermiş olabilirsin") diye
yorumluyordu — yanıltıcı ve sessiz. Artık `requestDisplayName` adı kuralın kabul
ettiği en küçük biçime çekiyor; testi ve mutasyon kanıtı var.

## 4. Yapılmayanlar (gerekçeli)

| İş | Gerekçe |
|---|---|
| `appId` düzeltmesi (`…fd0d8d09…`) | Firebase Console'a erişim yok; doğrulanamadı. Yanlış appId App Check/Installations kimliğini bozar |
| Gerçek cihaz kontrolü (360×640, iOS safe-area) | Fiziksel cihaz/tarayıcı gerektirir |
| Alfa katmanı kontrast testleri | `bg-white/[0.04]`, `bg-ink/[0.92]` gibi katmanlar token tabanlı P18 kontrast testinde ölçülmüyor; harita arka planına bağlı olduğu için ayrı tasarım kararı gerekiyor |
| **Deploy** | Kural: bu ortamda dağıtım yapılmaz |

## Kapılar (bu dalda)

| Kapı | Sonuç |
|---|---|
| `npx tsc --noEmit` | 0 hata |
| `npx eslint . --max-warnings=0` | 0 hata / 0 uyarı |
| `npx vitest run` | **124 dosya / 936 test geçti** |
| `npm run build` | bütçe içinde + SW kabuğu 25/25 |
| Politika (273 dosya) | `as any` 0 · `@ts-ignore`/`@ts-expect-error` 0 · `eslint-disable` 0 |
| `firestore.rules` | `allow …: if true` = 2 (değişmedi) |

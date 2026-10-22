# Aşama 4 — `mapResume` (yalnız resize + repaint)

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · Kod commit'i: `40b335b`
Onay: kullanıcı **"Onay veriyorum"** dedi.

## Ne yapıldı

- `src/lib/mapResume.ts:43` — `attachMapResume({ map, document, window, schedule, cancel })`:
  - dinlenen olaylar: `visibilitychange` (document), `pageshow` + `focus` (window),
    `visualViewport.resize`, `webglcontextrestored` (document, capture).
  - hepsi tek `requestAnimationFrame`'e indirgenir (`pending !== null` ise yeni
    frame açılmaz).
  - `document.hidden` iken frame açılmaz; görünür olunca `visibilitychange`
    yeniden tetikler.
  - `dispose()` tüm dinleyicileri kaldırır, bekleyen frame'i `cancel` eder;
    ikinci `dispose()` güvenli.
  - yalnız `map.resize()` + `map.triggerRepaint()` çağırır.
- `src/lib/mapResume.test.ts:1` — 7 test.
- `src/components/MapView.tsx:17` — tek import.
- `src/components/MapView.tsx:703` — tek `useEffect` (7 satır gövde).

## Neden

Mobil tarayıcı arka plandan dönünce `visualViewport`/viewport değişir; MapLibre
canvas eski ölçüde kalır. Çözüm yalnız yeniden ölçme + boyama; stil, pin, rota ve
katman koduna dokunulmadı (kural 3).

## Değişen dosyalar

```text
$ git diff --stat 40b335b^ 40b335b
 src/components/MapView.tsx |   9 ++++
 src/lib/mapResume.test.ts  | 127 ++++++++++++++++++++++++++++++++++++++++++
 src/lib/mapResume.ts       |  93 ++++++++++++++++++++++++++++++++++
 3 files changed, 229 insertions(+)

$ git diff --numstat 40b335b^ 40b335b
9       0       src/components/MapView.tsx
127     0       src/lib/mapResume.test.ts
93      0       src/lib/mapResume.ts
```

**MapView'da değişen satır: 9 ekleme, 0 silme** (1 import + 8 satırlık effect
dahil; yorum satırı ile birlikte).

### `git diff src/components/MapView.tsx` (HAM)

```diff
@@ -14,6 +14,7 @@ import type { PlaceViewport } from "../lib/firestoreData";
 import type { Place, RouteLeg, ViewState } from "../types";
 import { shouldAdvanceSpin } from "../utils/mapLifecycle";
 import type { WeatherLayerHandle } from "../utils/mapWeather";
+import { attachMapResume } from "../lib/mapResume";

 maplibregl.setWorkerUrl(maplibreWorkerUrl);

@@ -699,6 +700,14 @@ export default function MapView({
     };
   }, []);

+  // Aşama 4: arka plandan dönüşte yalnız resize + repaint (çizim mantığı değişmez).
+  useEffect(() => {
+    const map = mapRef.current;
+    if (!map) return;
+    const resume = attachMapResume({ map });
+    return resume.dispose;
+  }, []);
+
   // Altlık ve etiketleri kaynakları yeniden yüklemeden değiştir; pin ve rota
```

Başka hiçbir MapView satırı değişmedi.

## Kapılar

### `npx tsc --noEmit`

```text
TSC=0
```

### `npx eslint . --max-warnings=0`

```text
ESLINT=0
```

### `npx vitest run`

```text
 Test Files  105 passed (105)
      Tests  732 passed (732)
```

### `npm run build`

```text
assets/userProfiles-CHVjR7_7.js | lazyChunk | 2.802 B | 1.227 B | hayır
Bundle bütçesi içinde.
```

### `npm run test:rules:emulator` — yerelde KOŞMADI

```text
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
```

### CI (HAM)

```text
$ gh run view 39810236564   (push)
Security, typecheck, lint, test and build: success
  ... Typecheck=success, Lint=success, Unit tests=success,
      Firestore security rules tests=success,
      Production build and bundle budget=success

$ gh run view 39810249186   (pull_request)
Atlasia CI: completed/success

$ gh run view 39810249123   (Windows, tr-TR)
Firestore rules tests on Windows (tr-TR): success
  ... Assert the JVM default locale is Turkish=success,
      Firestore security rules tests=success
```

## Kurallarda değişiklik

**Yok.** `firestore.rules` bu commit'te değişmedi; `allow ...: if true` sayısı 3
(places, posts, stories) — Aşama 3 ile aynı.

## Testler

| | Önce | Sonra |
|---|---|---|
| Vitest dosya | 104 | **105** |
| Vitest test | 725 | **732** |
| Rules `it(` | 52 | 52 |

Eklenen testler (`src/lib/mapResume.test.ts`):

- `beş olayı tek requestAnimationFrame'e indirger`
- `gizliyken frame açmaz, görünür olunca tekrar açar`
- `dispose bekleyen frame'i iptal eder ve geç callback'i çalıştırmaz`
- `dispose tüm dinleyicileri kaldırır`
- `visualViewport yoksa çökmez ve diğer olaylar çalışır`
- `çift dispose güvenlidir; iptal bir kez yapılır`
- `frame tamamlandıktan sonra yeni olay yeni frame açar`

## Bilinen sınırlar

- Yalnız `resize` + `triggerRepaint`; kamera konumu, stil veya katman durumu
  yeniden uygulanmaz (istenen davranış).
- `schedule`/`cancel` enjekte edilebilir; üretimde `requestAnimationFrame` /
  `cancelAnimationFrame` kullanılır.
- Testler fake `document`/`window` ile; gerçek mobil tarayıcı davranışı bu
  ortamda ölçülemedi (cihaz testi yapılmadı).

## Patch

```text
$ sha256sum patches/main/main-patch13-mapresume.patch
3ef9266b8afab486eb478c1a98453b49ec04bde86d2df823add8b15814cdf49e
```

Kaynak: `git diff --binary --full-index 40b335b^ 40b335b`

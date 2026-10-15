# Atlasia — Mimari

Kaynak: kodun doğrudan okunması (2026-10-15). Doğrulanmayan noktalar "doğrulanmadı" ile işaretlidir.

## 1. Teknoloji yığını (package.json'dan doğrulandı)

| Katman | Sürüm |
|---|---|
| React / react-dom | 19.2.6 |
| Vite | 7.3.2 (`@vitejs/plugin-react` 5.1.1) |
| TypeScript | 5.9.3 (strict) |
| Tailwind CSS | 4.1.17 (`@tailwindcss/vite`) |
| Harita | maplibre-gl ^5.24.0 |
| Backend (isteğe bağlı) | firebase ^12.19.0 (Auth, Firestore, App Check) |
| Güneş/saat dilimi | suncalc ^1.9.0, tz-lookup ^6.1.25 |
| İkonlar | lucide-react ^1.50.0 |

Router kütüphanesi yok. Durum yönetimi React `useState`/`useContext`; harici state kütüphanesi yok.

## 2. Başlangıç akışı

```
index.html
 └─ src/main.tsx            (createRoot, StrictMode, service worker kaydı)
     └─ AppErrorBoundary    (src/components/AppErrorBoundary.tsx)
         ├─ App             (src/App.tsx)  → AuthProvider > ... (bkz. 3)
         └─ NetworkStatus   (src/components/NetworkStatus.tsx)
```

## 3. Yetkilendirme ve sayfa seçimi

- `src/contexts/AuthContext.tsx`: `onAuthStateChanged` (Firebase) veya cihaz hesabı (`src/lib/deviceAccounts.ts`). `useAuth()` ile `user` sağlanır.
- `src/App.tsx` sonunda:
  - `user` yoksa: `accessOpen` ise `AccountAccess`, değilse `LandingPage`.
  - `user` varsa: `Explorer` bileşeni (harita ve tüm paneller).
- "Sayfa" yönlendirmesi yoktur. Panel/ekran görünürlükleri `App.tsx` içindeki boolean state'lerle yönetilir (`drawerOpen`, `feedOpen`, `atlasOpen`, `recordsOpen`, `profileOpen`, `myPlacesOpen`, `settingsOpen`, `storyPlace`, `streetPlace`, `addMode`, `draft`). `closePanels()` ve `openSettings()` bu state'leri toplu kapatır.

## 4. Veri akışı

İki kaynak, tek arayüz (`cloud` nesnesi, `App.tsx` ~satır 58–68):

1. **Yerel kaynak** — `src/hooks/useAtlasData.ts`: `storageGet`/`storageSet` ile `window.localStorage` (`src/utils/storage.ts`) kullanır. Yapılandırma yoksa tek kaynaktır.
2. **Bulut kaynağı** — `src/hooks/useFirestoreAtlasData.ts`: `subscribePlaces/Posts/Stories` (`src/lib/firestoreData.ts`) ile canlı Firestore aboneliği. `isCloudReady` (`src/lib/firebase.ts`) yalnızca `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` dolu ve sabit sender/app ID'leri mevcutsa `true` olur.

Kurallar (yorumlardan ve koddan):
- Bulut yapılandırılmışsa yazma/silme **her zaman** Firestore'a gider; yerelde taklit edilmez.
- Canlı snapshot gelene kadar yerel liste yalnızca görünüm için kullanılır (`remote.ready` kontrolü).
- `canManagePlace` (App.tsx): yalnızca `kind === "user"` ve `authorUid` eşleşen kayıtlar silinebilir/düzenlenebilir.
- Rehber yerleri `src/data/places.ts` içindeki `GUIDE_PLACES` sabitinden gelir ve kullanıcı verisiyle `allPlaces` içinde birleşir; bunlar silinemez.

Firestore koleksiyonları (`src/lib/firestoreData.ts`): `places`, `posts`, `stories`, `users`. Fotoğraflar Storage'a değil, dokümana **JPEG data URL** (≤180 KB, `firestore.rules`) olarak yazılır. `storage.rules` tüm erişimi kapatır.

## 5. Harita sistemi (`src/components/MapView.tsx`, 624 satır)

Bileşen, React 19 `ref` prop'u ve `useImperativeHandle` ile `MapViewHandle` arayüzünü sunar (`MapView.tsx` 9–21. satırlar): `flyTo`, `fitBox`, `reset`, `showMe`, `clearMe`, `drawRoute`, `clearRoute`, `pulseAt`, `fitCoords`. App.tsx bunları `mapRef.current?.…` üzerinden çağırır.

Yaşam döngüsü:
- **Tek seferlik kurulum** (`useEffect(..., [])`, ~satır 466): `new maplibregl.Map`, `style.load` → `ready=true`, `moveend`/`zoom` ile `onViewChange`, `mousedown`/`touchstart`/`wheel` ile otomatik dönüşü durdurma, `click` ile ekleme modu. Otomatik dönüş için `requestAnimationFrame` döngüsü.
  - **Cleanup** mevcut: `cancelAnimationFrame`, marker'ların `remove()`'u, `meMarkerRef.remove()`, `map.remove()`, `mapRef = null`.
- **Altlık geçişi** (~546): dört katman (`satellite`, `dark`, `street`, `topographic`) için yalnızca `visibility` değişir; kaynaklar yeniden yüklenmez.
- **Etiket/sınır** (~556): `labels` raster overlay'i (Esri `World_Boundaries_and_Places`, yalnızca satellite/dark altlıkta) ve `kktc-outline`/`kktc-label` görünürlüğü. Dünya sınırları bu üçüncü taraf overlay'den gelir; ülke bazlı vektör sınır yoktur.
- **Terrain** (~567): `setTerrain` + `terrain-relief` katmanı.
- **Pinler** (~581): `places` değiştikçe `markersRef` (Map<id, {marker, el}>) ile farkı uygular: kaldırılanları siler, yeni olanları **bir kez** ekler. Tıklama/keydown listener'ları pin elementine eklenir; marker kaldırılınca element de gider (ayrı listener temizliği yok — düşük risk, bkz. KNOWN_ISSUES).
- **Aktif pin** (~619): `is-active` sınıfı.
- **Konum** (~359–407): `me-accuracy` kaynağı + `me-accuracy-fill/line` katmanları ve `meMarkerRef`; kaldırma `clearMe` içinde.
- **Rota** (~421–453): `atlas-route` kaynağı + `atlas-route-line` katmanı; `pulseRef` ile animasyonlu marker.

Stil: `buildStyle(labels, terrainEnabled, baseMap)` (`MapView.tsx` 52. satır). Bu fonksiyon dört altlık için raster kaynakları ve katmanları (`satellite`, `dark`, `street`, `topographic`) ile etiket/sınır/terrain kaynaklarını tanımlar; kaynak adları ve tile URL'leri kodda doğrudan yazılıdır.

## 5b. Ülke katmanı (eklendi)

`MapView.tsx` `[ready]` ile `countries` GeoJSON kaynağını ve 4 katmanı ekler (`kktc-outline` altına). Tıklama önce pin/ekleme modu kontrolünden geçer; ardından `countries-fill` üzerinde `queryRenderedFeatures`. Vurgu yalnızca `setFilter` ile. Ayrıntılar: `docs/COUNTRY_LAYER.md`.

## 6. Yardımcı ve dış servisler

Not: Harita kaynakları ESRI (`World_Imagery`, `World_Street_Map`, `World_Topo_Map`, `Reference/World_Boundaries_and_Places`), CARTO (`dark_nolabels`) ve AWS Terrarium tile'larıdır. Kullanım koşulları doğrulanmadı.

| Servis | Kullanım | Dosya |
|---|---|---|
| Photon (OSM geocoder) | Arama, ters geokodlama. Varsayılan `https://photon.komoot.io`, `VITE_GEOCODER_URL` ile değişir | `utils/geo.ts`, `utils/openMapPlaces.ts` |
| Open-Meteo | Yağış tahmini (Atlas asistanı) | `components/AtlasAssistant.tsx` |
| Wikimedia Commons API | Yer galerisi | `hooks/usePlaceGallery.ts` |
| OpenStreetMap embed | Sokak görünümü önizlemesi | `components/StreetPeek.tsx` |
| Google Maps Embed API | Yalnızca `VITE_GOOGLE_MAPS_EMBED_KEY` tanımlıysa | `components/StreetPeek.tsx` |
| Google Fonts | `index.html` | — |

Atlas asistanı rotalarını ve tavsiyelerini `utils/routePlanner.ts` ve `utils/placeAdvice.ts` içindeki **yerel kurallarla** üretir; bu kodda bir LLM/AI API çağrısı bulunmadı (grep ile doğrulandı).

## 7. Servis worker ve PWA

- `public/sw.js`: `atlasia-shell-v4` önbelleği. Kurulumda `/` ve `/assets/*` (index.html içinden regex ile) önbelleğe alınır; eski `atlasia-shell-*` önbellekleri `activate` ile temizlenir.
- `public/manifest.webmanifest` + `src/hooks/useInstallApp.ts`.
- Kayıt yalnızca `location.protocol !== "file:"` ise yapılır (`main.tsx`).

## 8. Build

- Manuel chunk'lar: `map-vendor` (~1.05 MB, minified), `firebase-vendor` (~576 KB), `react-vendor` (~192 KB), `icons-vendor` (~25 KB), uygulama (~367 KB). Vite 500 KB uyarısı veriyor (bkz. KNOWN_ISSUES).
- `npm run build` = `vite build`; TypeScript kontrolü build içinde yapılmaz; ayrı `npx tsc --noEmit` ile doğrulanır.

## 9. Ortam değişkenleri (değerleri belgelenmez)

| Değişken | Kullanım |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | Firebase bulut modunu açar (`lib/firebase.ts`) |
| `VITE_APPLE_AUTH_ENABLED` | Apple giriş düğmesi (`AccountAccess.tsx`) |
| `VITE_GEOCODER_URL` | Geocoder uç noktası (`utils/geo.ts`, `utils/openMapPlaces.ts`) |
| `VITE_GOOGLE_MAPS_EMBED_KEY` | StreetPeek embed (`StreetPeek.tsx`) |

Sabit (gizli sayılmayan) Firebase tanımlayıcıları `src/lib/firebase.ts` içinde yazılıdır: messaging sender ID, app ID ve App Check site key.

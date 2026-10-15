# Atlasia — Proje Haritası

Son inceleme: 2026-10-15, branch `arena/f3752970-atlasia` (base `a1151c7`).
Tüm yollar depo köküne göredir.

## Kök dizin

| Yol | Görev |
|---|---|
| `package.json` | Bağımlılıklar ve scriptler: `dev`, `build`, `preview`. **Lint ve test scripti yok.** |
| `package-lock.json` | npm kilit dosyası (tek lock dosyası). |
| `vite.config.ts` | Vite yapılandırması; `@` → `src` alias'ı, manuel chunk'lar (`map-vendor`, `firebase-vendor`, `react-vendor`, `icons-vendor`), dev/preview sunucusu `0.0.0.0` ve `allowedHosts: true`. |
| `tsconfig.json` | `strict`, `noUnusedLocals`, `noUnusedParameters`; `include: ["src", "vite.config.ts"]`. |
| `index.html` | Tek giriş HTML'i; `lang="tr"`, manifest, Google Fonts bağlantıları, `#root`. |
| `README.md` | Yalnızca `# Atlasia` içerir (9 bayt). Kurulum belgesi yok. |
| `AUTH_SETUP.md` | Kimlik doğrulama ve Firebase sağlayıcı kurulum adımları. |
| `CHANGELOG.md` | Sürüm notları (Türkçe). |
| `capture.mjs` | Playwright ile `http://localhost:5173/` ekran görüntüsü alan yardımcı betik. `playwright-core` bağımlılık listesinde **yok**; çalıştırmak için ayrıca kurulum gerekir (doğrulanmadı). |
| `firebase.json` | Firestore kural yolu ve Hosting ayarı (`public: dist`, SPA rewrite). |
| `.firebaserc` | Varsayılan proje: `atlasia-dev`. |
| `firestore.rules` | Firestore güvenlik kuralları (users, places, posts, stories). |
| `storage.rules` | Firebase Storage'ı tamamen kapatan kural (fotoğraflar Firestore'da base64 olarak tutulur). |
| `satellite-map-web-application.zip` | Eski proje arşivi (1.6 MB). Build tarafından kullanılmıyor. |
| `satellite-map-web-application (1)/` | **Yinelenen, ayrışmış eski kopya.** Kökteki `src/` ile çok sayıda dosyada farklı (`diff -rq` ile doğrulandı); kendi `package.json`, `vite.config.ts` ve `src/` ağacını içerir. Kök build'ine girmiyor (`tsconfig` `include` yalnızca kökteki `src`). Silinmesi veya taşınması için kullanıcı onayı gerekir. |
| `.gitignore` | `node_modules/`, `dist/`, `.env*`, Firebase debug logları. `.env.example` **depoda yok** (bkz. KNOWN_ISSUES). |

## `public/`

| Yol | Görev |
|---|---|
| `public/sw.js` | Service worker: `atlasia-shell-v4` önbelleği; app kabuğunu ve `/assets/*` dosyalarını önbelleğe alır. `main.tsx` kayıt eder. |
| `public/manifest.webmanifest` | PWA manifesti. |
| `public/icons/icon-192.png`, `icon-512.png` | PWA ikonları. |
| `public/images/atlasia-earth-hero.jpg` | Açılış ekranı hero görseli. |

## `src/` — giriş ve kabuk

| Dosya | Görev |
|---|---|
| `src/main.tsx` | `createRoot`, `StrictMode`, `AppErrorBoundary` > `App` + `NetworkStatus`; service worker kaydı. |
| `src/App.tsx` (847 satır) | **Ana kabuk ve durum yöneticisi.** Auth'a göre `LandingPage`/`AccountAccess` veya `Explorer` gösterir. Panel açık/kapalı durumları, seçili yer, kategori, konum, toast, onboarding, yer ekleme/silme akışları burada. Router yok. |
| `src/index.css` | Tailwind ve özel CSS (`atl-pin`, `auth-*`, `map-add-mode` vb.). |
| `src/types.ts` | `Place`, `FeedPost`, `Story`, `AtlasRoute`, `RouteStop`, `RouteBrief`, `ViewState`, `CategoryId`, `TransportMode` tipleri. |
| `src/vite-env.d.ts` | Vite ortam tipleri. |

## `src/components/` — arayüz

| Dosya | Görev |
|---|---|
| `MapView.tsx` (624) | **MapLibre harita motoru.** Stil oluşturma, altlıklar, etiketler, terrain, pinler, konum işareti, rota çizgisi, otomatik dönüş. Ayrıntı: ARCHITECTURE.md. |
| `MapControls.tsx` | Harita kontrol düğmeleri (zoom, sıfırla, konum vb.). |
| `SearchBox.tsx` | Yer/ülke/şehir arama (Photon + yerel liste). |
| `Header.tsx`, `Hero.tsx`, `LandingPage.tsx` | Üst çubuk ve açılış/karşılama ekranları. |
| `Onboarding.tsx` | İlk giriş karşılaması (`atlasia.onboardingSeen`). |
| `BottomPanel.tsx` | Alt panel: öne çıkan yer, detay ve eylemler. |
| `PlaceDetails.tsx`, `PlaceImage.tsx` | Yer detayı ve görsel gösterimi. |
| `StoryViewer.tsx`, `StoryComposer.tsx` | 24 saatlik hikâyeler görüntüleme/oluşturma. |
| `SocialPanel.tsx` (670) | Akış: gönderiler, beğeni, yanıtlar. |
| `AddDiscoveryModal.tsx` | Haritaya yeni "iz" (keşif) ekleme formu. |
| `AtlasAssistant.tsx` (269) | "Atlas" asistanı: sorgu, rota sihirbazı, rota sonucu, fotoğraftan atmosfer eşleştirme. |
| `RecordsDock.tsx` | Kayıtlar/koleksiyonlar alt şeridi. |
| `MyPlacesPanel.tsx` | Kullanıcının kendi yerleri. |
| `ProfilePanel.tsx`, `SettingsPanel.tsx` | Profil ve ayarlar (konum izni, harita stili, tema). |
| `Drawer.tsx` | Yan çekmece. |
| `StreetPeek.tsx` | Sokak görünümü: OSM embed + Google Maps bağlantısı; embed için `VITE_GOOGLE_MAPS_EMBED_KEY`. |
| `NearbyAudioGuide.tsx` | Yakın yerler için sesli rehber (tarayıcı API'lerine bağlı; canlı test edilmedi). |
| `NetworkStatus.tsx` | Çevrimdışı/çevrimiçi durum bildirimi. |
| `AppErrorBoundary.tsx` | Render hatalarını yakalayan sınır. |
| `AccountAccess.tsx` (319) | Giriş, kayıt, şifre kurtarma, telefon/SMS, e-posta doğrulama, profil tamamlama ekranları. |
| `Avatar.tsx` | Kullanıcı avatarı. |

## `src/contexts/`, `src/hooks/`

| Dosya | Görev |
|---|---|
| `contexts/AuthContext.tsx` | `AuthProvider` / `useAuth`. Firebase Auth veya cihaz hesabı durumunu tutar. |
| `hooks/useAtlasData.ts` | Yerel veri kaynağı (yapılandırmasız mod ve ilk yedek). |
| `hooks/useFirestoreAtlasData.ts` | Firestore `places`/`posts`/`stories` aboneliği; yazma/silme işlemlerini `lib/firestoreData` üzerinden yapar. |
| `hooks/useCollections.tsx` | Rota/yer koleksiyonları ve `CollectionsProvider`. |
| `hooks/useGeolocation.ts` | Tarayıcı konumu (izin, doğruluk, hata durumları). |
| `hooks/usePlaceGallery.ts` | Wikimedia Commons'tan yer galerisi çeker. |
| `hooks/usePanelAccess.ts` | Panel erişim kuralları. |
| `hooks/useTheme.ts` | Tema tercihi. |
| `hooks/useInstallApp.ts` | PWA kurulum akışı. |

## `src/lib/` — kimlik ve veri katmanı

| Dosya | Görev |
|---|---|
| `lib/firebase.ts` | Firebase başlatma; env yoksa `isCloudReady = false`. App Check (reCAPTCHA Enterprise) başlatılır. |
| `lib/auth.ts` | Firebase e-posta/şifre, doğrulama, şifre yenileme, telefon akışları. |
| `lib/deviceAccounts.ts` | Cihaz-içi hesap modu (IndexedDB, PBKDF2-SHA256 600.000 iterasyon). Sunucu tabanlı değildir. |
| `lib/firestoreData.ts` (478) | Firestore CRUD + abonelikler + fotoğraf yükleme (JPEG data URL). |
| `lib/accountTypes.ts` | Hesap türü tipleri. |

## `src/data/` — statik içerik

| Dosya | Görev |
|---|---|
| `data/places.ts` | Elle seçilmiş `GUIDE_PLACES` (Efes, Kapadokya vb.). Görseller Pexels URL'leri. |
| `data/galleries.ts` | Rehber galerileri. |
| `data/regions.ts` | Bölge/ülke verisi. |
| `data/categories.ts` | Kategori tanımları (`CategoryId`). |
| `data/feed.ts` | Akış verisi dosyası (içeriği ve kullanım yeri doğrulanmadı). |

## `src/utils/` — saf yardımcılar

| Dosya | Görev |
|---|---|
| `geo.ts` | Haversine, ters geokodlama, Photon arama (`VITE_GEOCODER_URL`). |
| `openMapPlaces.ts` | OSM/Photon'dan yakın yer sorgusu. |
| `routePlanner.ts` (180) | Rota planlama, yakın yerler, rota sıralama. |
| `placeAdvice.ts` | Yer tavsiyesi metinleri (yerel kurallar). |
| `placePhotos.ts`, `image.ts` | Fotoğraf sıkıştırma ve yer fotoğrafı yardımcıları. |
| `polyline.ts` | Polyline kodlama/çözme. |
| `sun.ts` | Altın saat (SunCalc). |
| `storage.ts` | `localStorage` sarmalayıcısı (`storageGet`/`storageSet`). |
| `api.ts` | 2 satırlık API yardımcısı (içerik minimal). |
| `text.ts`, `time.ts`, `cn.ts` | Metin normalizasyonu, zaman biçimlendirme, sınıf birleştirme. |

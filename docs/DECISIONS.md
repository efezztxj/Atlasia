# Atlasia — Teknik Kararlar

Her karar, kodda veya repo belgelerinde bulunan kanıtla birlikte yazıldı. Kanıt yoksa "gerekçe doğrulanmadı" denir.

## D-13 · Ülke sınırları: Natural Earth 1:110m (public domain), ayrı GeoJSON katmanı
- **Karar:** Ülke seçimi için Esri overlay yerine `public/data/countries-110m.geojson`. Kaynak `world-atlas@2.0.2` (ISC) içindeki Natural Earth 4.1.0 1:110m TopoJSON; Natural Earth kamu malı.
- **Gerekçe:** Lisans açık, küçük boyut (~217 KB), çalışma zamanı bağımlılığı yok (dönüşüm kendi scriptimizle).
- **Sonuç:** ISO kodsuz poligonlar `x-` slug anahtarı alır; mevcut KKTC elle çizilmiş poligonu değiştirilmedi.
- Kanıt: `docs/COUNTRY_LAYER.md`, `scripts/build-countries-geojson.test.mjs`.

## D-01 · Vite + React 19 + TypeScript (strict)
- **Karar:** SPA, Vite 7.3.2, React 19.2.6, TypeScript 5.9.3 `strict` + `noUnusedLocals`.
- **Kanıt:** `package.json`, `tsconfig.json`.
- **Sonuç:** Tip hataları build'de değil `tsc --noEmit` ile yakalanır; build bu adımı çalıştırmaz.

## D-02 · Router kullanılmaz; panel durumu App.tsx'te
- **Karar:** Sayfa yönlendirmesi yok; açık/kapalı panel durumları `App.tsx` içinde `useState` ile.
- **Kanıt:** `App.tsx` (`closePanels`, `openSettings`, `drawerOpen`, `feedOpen` vb.).
- **Gerekçe:** Harita tek ekran; gerçek URL rotası ihtiyacı yok. Gerekçe belgede açıkça yazılmamış (doğrulanmadı).

## D-03 · MapLibre + raster altlıklar; altlık değişimi visibility ile
- **Karar:** Dört altlık aynı stilde tutulur, değişimde yalnız `setLayoutProperty('visibility')`.
- **Kanıt:** `MapView.tsx` ~546. satır; yorum: "Altlık haritayı kaynakları yeniden yüklemeden değiştir; pin ve rota katmanları korunur."
- **Sonuç:** Pin ve rota katmanları altlık değişiminde korunur.

## D-04 · Harita pinleri farklı güncellenir (marker Map)
- **Karar:** `markersRef` ile `places` farkı uygulanır; her yer için marker bir kez oluşturulur.
- **Kanıt:** `MapView.tsx` pins effect (~581).

## D-05 · Bulut yapılandırılmışsa yazma her zaman Firestore'a gider
- **Karar:** Yerel önbellek yalnız okuma görünümü ve yapılandırmasız mod için; yazma/silme yerelde taklit edilmez.
- **Kanıt:** `App.tsx` (`cloud` nesnesi, yorum satırları), `useFirestoreAtlasData.ts` üst yorum.
- **Gerekçe:** Sahte başarı mesajlarını ve veri sapmasını önlemek (kod yorumu).

## D-06 · Firebase Storage kullanılmaz; fotoğraf JPEG data URL olarak Firestore'da
- **Karar:** Fotoğraflar ≤180 KB JPEG data URL; `storage.rules` tüm erişimi kapatır.
- **Kanıt:** `firestore.rules` (`hasValidPhoto`), `storage.rules` yorumu: "Fotoğraflar ücretli dosya depolaması gerektirmemesi için...".
- **Sonuç:** Doküman boyutu limitine (1 MB) takılma riski; ayrıca büyük Firestore yazımları.

## D-07 · Firebase web kimlikleri kodda sabit
- **Karar:** `messagingSenderId`, `appId` ve App Check site key `src/lib/firebase.ts` içinde sabit.
- **Kanıt:** `firebase.ts` üst yorum: "Firebase web kimlikleri gizli değildir..."
- **Not:** `apiKey`, `authDomain`, `projectId` ortam değişkeninden okunur. Gizli anahtar değildir ancak yine de repo politikası doğrulanmadı.

## D-08 · Cihaz-içi hesap modu (Firebase yokken)
- **Karar:** Firebase yapılandırması yoksa IndexedDB + PBKDF2-SHA256 (600.000 iterasyon) ile tarayıcı içi hesap.
- **Kanıt:** `lib/deviceAccounts.ts`, `AUTH_SETUP.md`, `CHANGELOG.md` ("Firebase bilgileri verilmediğinden...").
- **Sınır:** Sunucu doğrulaması yok; bu bir üretim güvenlik çözümü değildir.

## D-09 · Sahte sosyal giriş ve misafir modu yok
- **Karar:** Google/Apple/SMS düğmeleri yalnız yapılandırma varsa etkin; misafir ve sahte doğrulama yok.
- **Kanıt:** `AUTH_SETUP.md` ("Misafir, anonim giriş, sahte Google/Apple oturumu veya sahte SMS kodu yoktur"), `CHANGELOG.md`.

## D-10 · Atlas asistanı kural tabanlıdır
- **Karar:** Rota ve tavsiye üretimi `utils/routePlanner.ts` ve `utils/placeAdvice.ts` içinde yerel kurallarla.
- **Kanıt:** `AtlasAssistant.tsx` import'ları; kodda LLM/AI API çağrısı yok (grep).
- **Sonuç:** Ürün metinlerinde "yapay zekâ" olarak tanıtılmamalı; ayrıca doğrulanmadı.

## D-11 · Netlify yapılandırması kaldırıldı; hosting Firebase'e yönelik
- **Karar:** Netlify yapılandırması kaldırıldı; `firebase.json` hosting `dist` klasörüne bakıyor.
- **Kanıt:** commit `a1151c7` ("chore: Netlify yapilandirmasini kaldir (#2)"), `firebase.json`.

## D-12 · Harita ve kimlik ayrı yönetilir; Auth değişikliği harita koduna dokunmaz
- **Karar:** Son değişikliklerde `MapView.tsx` mantığına dokunulmadı.
- **Kanıt:** `CHANGELOG.md` ("Ana src/components/MapView.tsx kaynağı, katmanları, marker render'i, tile ve event mantığı değiştirilmedi.").

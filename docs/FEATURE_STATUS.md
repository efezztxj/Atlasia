# Atlasia — Özellik Durumu

Durum etiketleri:
- **Kodda var**: Kaynak kodda uygulanmış. Çalıştığı anlamına gelmez.
- **Derleniyor**: `tsc --noEmit` ve `vite build` ile doğrulandı (2026-10-15).
- **Tarayıcıda doğrulanmadı**: Bu incelemede canlı tarayıcı/harita/Firebase testi yapılmadı.
- **Kısmi / Eksik**: Kodda eksik veya dış kurulum gerektiriyor.

Tüm özellikler "Kodda var + Derleniyor" düzeyindedir; **uçtan uca doğrulanmış özellik yoktur.**

## Harita ve keşif

| Özellik | Durum | Dosyalar | Notlar |
|---|---|---|---|
| MapLibre dünya haritası, uydu/karanlık/sokak/topografik altlıklar | Kodda var | `components/MapView.tsx`, `App.tsx` | Altlık geçişi visibility ile; kaynak yeniden yüklenmez. |
| Açılış küresi / otomatik dönüş (spin) | Kodda var | `MapView.tsx` (`tick`), `App.tsx` (`spin`) | Kullanıcı etkileşiminde durur. |
| Etiketler, sınır (KKTC) katmanları, terrain | Kodda var | `MapView.tsx` | Sınır verisi `buildStyle` içinde. Siyasi sınır doğruluğu doğrulanmadı. |
| Yer pinleri (kategoriye göre filtre) | Kodda var | `MapView.tsx` (pins effect), `App.tsx` (`visiblePlaces`) | Marker'lar farkla güncellenir. |
| Yer detayı, öne çıkan yer, döngüleme | Kodda var | `BottomPanel.tsx`, `PlaceDetails.tsx`, `App.tsx` | — |
| Rehber yerleri (Efes, Kapadokya vb.) | Kodda var | `data/places.ts` | Elle seçilmiş örnekler; kapsam sınırlı. |
| Arama (ülke/şehir/yer) | Kodda var | `SearchBox.tsx`, `utils/geo.ts`, `utils/openMapPlaces.ts` | Photon'a bağımlı; ağ hatasında yedek şehir araması. Canlı test yok. |
| Konum (GPS) ve doğruluk dairesi | Kodda var | `hooks/useGeolocation.ts`, `MapView.tsx` (`showMe`) | İzin reddi ve zaman aşımı durumları App'te toast ile bildiriliyor. |
| Ters geokodlama (konum adı) | Kodda var | `utils/geo.ts` (`reverseName`) | — |
| Yer ekleme (haritada tıklayıp "iz" bırakma) | Kodda var | `AddDiscoveryModal.tsx`, `App.tsx` (`addMode`, `draft`) | Bulutta Firestore'a yazılır. |
| Yer silme (yalnız sahibi) | Kodda var | `App.tsx` (`handleDelete`), `firestore.rules` | Kural düzeyinde de sahiplik kontrolü var. |
| Fotoğraf ekleme (yer/post/hikâye) | Kodda var | `utils/image.ts`, `lib/firestoreData.ts`, `firestore.rules` | JPEG data URL, ≤180 KB; Firebase Storage kullanılmıyor. |
| Sokak görünümü (StreetPeek) | Kısmi | `StreetPeek.tsx` | OSM embed çalışır (doğrulanmadı); Google embed için anahtar gerekir; yoksa Google bağlantısı açılır. |
| Yakın sesli rehber | Kodda var, doğrulanmadı | `NearbyAudioGuide.tsx` | Tarayıcı ses API'sine bağlı. |

## Hesap ve veri

| Özellik | Durum | Dosyalar | Notlar |
|---|---|---|---|
| Firebase e-posta/şifre girişi | Kodda var, Firebase kurulumuna bağlı | `lib/auth.ts`, `contexts/AuthContext.tsx`, `AccountAccess.tsx` | `.env` olmadan çalışmaz; canlı test yok. |
| Doğrulama e-postası, şifre yenileme | Kodda var, Firebase'e bağlı | `lib/auth.ts`, `AccountAccess.tsx` | Kurulum yoksa çalışmaz. |
| Cihaz-içi hesap (Firebase yokken) | Kodda var | `lib/deviceAccounts.ts` | IndexedDB + PBKDF2. **Sunucu doğrulaması yok**; tarayıcı verisi silinirse hesap gider. |
| Google / Apple / telefon (SMS) girişi | Kısmi / dış kurulum gerekli | `AccountAccess.tsx`, `lib/auth.ts`, `AUTH_SETUP.md` | Apple `VITE_APPLE_AUTH_ENABLED=true` ile görünür. Sağlayıcılar Firebase Console'da açılmadan çalışmaz. Canlı test yok. |
| Profil adı / profil düzenleme | Kodda var | `ProfilePanel.tsx`, `AccountAccess.tsx` (ProfileSetup) | — |
| Oturum kapatma | Kodda var | `AuthContext.tsx`, `ProfilePanel.tsx` | — |
| Firestore canlı yer/post/hikâye aboneliği | Kodda var, Firebase'e bağlı | `hooks/useFirestoreAtlasData.ts`, `lib/firestoreData.ts` | Firebase yapılandırması yoksa devre dışı. |
| Yerel mod (yapılandırmasız) | Kodda var | `hooks/useAtlasData.ts`, `utils/storage.ts` | localStorage; cihazlar arası senkron yok. |
| Cihazlar arası senkronizasyon | Eksik (yerel modda) | — | Yalnızca Firestore modunda var. |

## Sosyal, hikâye, koleksiyon

| Özellik | Durum | Dosyalar | Notlar |
|---|---|---|---|
| Akış: gönderi, yanıt, beğeni | Kodda var | `SocialPanel.tsx`, `lib/firestoreData.ts` | Firestore modunda kalıcı. Beğeni sayacının arayüzde gösterilip gösterilmediği doğrulanmadı. |
| 24 saatlik hikâyeler | Kodda var | `StoryComposer.tsx`, `StoryViewer.tsx` | Süre sınırı istemci ve Firestore tarafında doğrulanmadı. |
| Kayıtlar / koleksiyonlar (alt şerit) | Kodda var | `RecordsDock.tsx`, `hooks/useCollections.tsx` | Yerel, kullanıcı kimliğine göre ayrılmış. |
| Benim yerlerim | Kodda var | `MyPlacesPanel.tsx` | — |
| Bildirim paneli | Kısmi | `App.tsx` (`notificationsOpen`) | Gerçek bildirim kaynağı doğrulanmadı. |

## Rota ve asistan

| Özellik | Durum | Dosyalar | Notlar |
|---|---|---|---|
| Rota sihirbazı (süre, tempo, bütçe, ulaşım) | Kodda var | `AtlasAssistant.tsx` (`RouteWizard`), `utils/routePlanner.ts` | Rota hesabı yerel kurallarla. |
| Rota çizimi, önizleme, onay | Kodda var | `MapView.tsx` (`drawRoute`), `AtlasAssistant.tsx` | Önizleme ve onay ayrı. |
| Rota sırası değiştirme (yeniden hesap) | Kodda var | `AtlasAssistant.tsx` (`onReorder`), `utils/routePlanner.ts` | — |
| Altın saat | Kodda var | `utils/sun.ts` | SunCalc + saat dilimi (tz-lookup). Hava/ücret verisi yok. |
| Hava (yağış) | Kodda var | `AtlasAssistant.tsx` | Open-Meteo, tek günlük yağış. |
| "Atlas" doğal dil sorguları | Kodda var, **yapay zekâ değil** | `AtlasAssistant.tsx` (`respond`), `utils/placeAdvice.ts` | Kural tabanlı; harici LLM çağrısı yok (grep ile doğrulandı). |
| Fotoğrafla atmosfer eşleştirme | Kodda var, doğrulanmadı | `AtlasAssistant.tsx` (`photoMatch`) | Algoritma ayrıntısı incelenmedi. |
| Rota koleksiyonuna katkı / birlikte düzenleme | Eksik | — | Ürün vizyonunda var; kodda ortak düzenleme akışı bulunmadı. |

## Platform

| Özellik | Durum | Dosyalar | Notlar |
|---|---|---|---|
| PWA (manifest, ikonlar, kurulum) | Kodda var | `public/manifest.webmanifest`, `hooks/useInstallApp.ts` | — |
| Service worker önbelleği | Kodda var | `public/sw.js`, `main.tsx` | v4; güncelleme davranışı tarayıcıda doğrulanmadı. |
| Mobil yerleşim | Kodda var | `App.tsx` (`smallScreen`), bileşen CSS'leri | Canlı cihaz testi yok. |
| Erişilebilirlik (aria, klavye) | Kısmi | Çeşitli bileşenler (ör. pin `keydown`, form etiketleri) | Kapsamlı denetim yapılmadı. |
| Çevrimdışı göstergesi | Kodda var | `NetworkStatus.tsx` | — |
| Hata sınırı | Kodda var | `AppErrorBoundary.tsx` | — |
| Açılış ekranı (landing, onboarding) | Kodda var | `LandingPage.tsx`, `Onboarding.tsx`, `Hero.tsx` | — |
| Testler | **Eksik** | — | Test dosyası ve test scripti yok. |
| Lint | **Eksik** | — | ESLint yapılandırması ve scripti yok. |
| Tema (açık/koyu) | Kodda var | `hooks/useTheme.ts`, `SettingsPanel.tsx` | — |

## Ürün vizyonu ile farklar (özet)

- "İnsanların deneyimlerini paylaşması" → Akış ve hikâyeler var; kalıcılık yalnızca Firestore modunda.
- "Kullanıcıların rota oluşturması/katkıda bulunması" → Kişisel rota var; ortak katkı yok.
- "Yerler hakkında fotoğraf, tarihçe, rehber" → Rehber sınırlı (birkaç elle seçilmiş yer); kapsam genişletilmesi gerek.
- "Renkli, etkileşimli 3D dünya küresi, siyasi sınırlar" → Küre/döndürme ve sınır katmanı kodda var; görsel ve sınır doğruluğu tarayıcıda doğrulanmadı.

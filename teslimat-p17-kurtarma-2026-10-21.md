# Teslimat — P17 kurtarma (PR #30 → main tabanlı) · 2026-10-21

**Kaynak:** PR #30 `arena/f5d256c1-atlasia` (HEAD `0a315d0`), ayrıntılı kabul matrisi ve fixture tablosu o daldaki `teslimat-p17.md` §3–§5'te.
**Bu teslimat:** P17'nin çekirdeği güncel `main` (`d393b4c`) üzerine taşındı. Main'de olmayan modüllere bağımlılık kaldırıldı. Ayrıca bulunan bir yayın hatası düzeltildi.

## Neden PR #30 doğrudan merge edilmedi

| # | Bulgu | Etki |
|---|---|---|
| 1 | Dalın tabanı `0a96a86`, yani 19 Ekim tarihli eski P4 dalı. main'in atası değil. | İki-nokta diff'i main'e göre 125 dosya ve −13 163 satır. `track.ts` dosyasında add/add çakışması var. |
| 2 | `TrackRecorderPanel.tsx`, main'de olmayan `utils/trackDraft`, `utils/trackPrivacy` ve `components/TrackRibbonPreview` modüllerini import ediyor. Bunlar paylaşılan kirli ağaçta başka ajanların commit edilmemiş dosyalarıydı (`teslimat-p17.md` §1: 39 M + 79 ??). | main'de derlenmiyor. |
| 3 | Panel `cloudAccount` prop'unu kaldırıyor. | PR #23'teki "cihaz hesabıyla buluta iz yazma" korumasını geri alıyor; `App.tsx` TS hatası veriyor. |
| 4 | Taslak rota `days[0].legs[0].coords` alanını `[lng,lat][]` olarak taşıyor. | Firestore iç içe diziyi kabul etmez. Yürüyüş taslağı yayınlanınca veya kaydedilince `Nested arrays are not supported` hatası alınırdı. Bu hata #30'un kendi testlerinde görünmüyordu. |

## Bu PR'da yapılanlar

| Dosya | Değişiklik |
|---|---|
| `src/utils/track.ts`, `track.test.ts`, `fixtures/trackFixtures.ts` | PR #30'dan **aynen** alındı: `TRACK_DETECTION`, sıçrama filtresi, `simplifyTrackWithStats` (maksimum sapma), `buildTrackDraft`, `trackRuleViolation`, 7 fixture. |
| `src/utils/elevation.ts`, `elevation.test.ts`, `components/ElevationProfile.tsx` | PR #30'dan **aynen** alındı: DEM yoksa yükseklik "bilinmiyor" olarak gösterilir, sentetik eğri çizilmez. (`ElevationProfile` main'de henüz hiçbir yerde render edilmiyor.) |
| `src/hooks/useTrackRecorder.ts` | **Main'e uyarlandı.** Akış main'deki gibi kaldı: bitir → buluta kaydet → taslak. Değişenler: (1) iç hesap `buildTrackDraft` ile yapılıyor; (2) yazmadan önce `trackRuleViolation` ön denetimi var; (3) canlı önizlemede sıçrama filtresi çalışıyor; (4) `FinishedTrack.stats` eklendi. Ad çözümlemesi (ağ çağrısı) hâlâ iz kaydedildikten **sonra** yapılıyor. #30'daki "Hesabıma kaydet" düğmesine taşıma ve `trackPrivacy` alınmadı; bu iş ayrı bir görev olarak ele alınmalı. |
| `src/components/TrackRecorderPanel.tsx`, `src/App.tsx` | **Değişmedi.** `cloudAccount` koruması yerinde duruyor. |
| `src/lib/routeData.ts` | `toFirestoreRoute` / `fromFirestoreRoute` eklendi. Bacak koordinatları yazılırken `coordsPolyline` metnine çevriliyor, okunurken `getPublishedRoute`, `listPublicRoutes` ve kayıtlı rota aboneliğinde geri açılıyor. Bacaksız rotalar aynen kalıyor; eski belgelerle uyumlu. |
| `src/lib/routeData.io.test.ts` | Sahte Firestore artık gerçek SDK gibi iç içe diziyi reddediyor. Yeni test bacaklı taslağı yayınlayıp geri okuyor. **Eski `routeData.ts` ile bu test düşüyor** (`Nested arrays are not supported … route.days[0].legs[0].coords[0]`); yeni kodla geçiyor. |
| `src/hooks/useTrackRecorder.test.ts` | İki testteki son ölçüm 10 sn'den 5 dk'ya alındı. 870 m / 10 sn = 313 km/h ediyordu; P17 sıçrama filtresi bunu haklı olarak atıyordu. Yeni test: tek sıçrama çizgiye ve mesafeye girmiyor, `stats.maxDeviationM ≤ 7`. |

`firestore.rules` değişmedi; `firebase deploy` gerekmez.

## Doğrulama (bu tur, gerçek çıktı)

- `npm run typecheck` ✅ · `npm run lint` ✅
- `npm run test:run` → 74 dosya / **436 test** ✅
- `npm run test:scripts` → 7/7 + 6/6 ✅
- `npm run build` + bundle bütçesi ✅ (ilk set 400 560 B gzip / bütçe 439 000 B)
- `npm run audit:check` ✅ · `git diff --check` ✅
- `test:rules:emulator`: sandbox'ta Java yok; kanıt CI'dan alınacak. Rules değişmedi.

## Açık noktalar

1. #30'daki "kaydı otomatik yazma, kullanıcı onayıyla kaydet" (`trackPrivacy`, `TrackRibbonPreview`) işi bu PR'da yok. Kaynak dosyalar remote'ta bulunmuyor. Bu iş, `cloudAccount` korumasını koruyan ayrı bir görev olarak yazılmalı.
2. Düzeltme genel: bacak taşıyan her rota (ör. `accessExample` verisi) yayınlanırken aynı iç içe dizi hatasına düşerdi; artık serileştiriliyor. Bu yolun arayüzden canlıda denenmesi ayrıca yapılmadı.
3. Saha testi (`teslimat-p17.md` §9) hâlâ gerekli: masaüstü fixture'ları sahadaki GPS davranışının yerine geçmez.

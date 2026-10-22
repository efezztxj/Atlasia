# Teslimat — PWA önbellek sınırları ve güvenli SW kurulumu (2026-10-23)

## Kaynak

#69 (`arena/48b0653c-atlasia`) dalındaki **`08fd3e0`** commit'i, güncel `main`
(`66ff18e`) üzerine cherry-pick edildi (`091f8c9`). Bu teslimat #69'un PWA
kısmının yerine geçer.

## Neden yalnız PWA commit'i alındı

#69'un dalı üç commit taşıyordu:

| Commit | İçerik | Karar |
| --- | --- | --- |
| `fb35a58` | "İŞ 1: sosyal yüzey" — `firestore.rules`, `firestore.indexes.json`, `follows`, `verifications`, `userProfiles` | **Alınmadı** |
| `01790fa` | Merge (kendi dalı) | Alınmadı |
| `08fd3e0` | PWA önbellek güvenliği (4 dosya) | **Alındı** |

`fb35a58` `main`'e göre **geri** durumda. `git diff origin/main fb35a58 -- firestore.rules`
şunları **silerdi**:

- `validFollow(...)` — takip kaydı doğrulaması (tamamen kaldırılıyor),
- `validUserProfileShape` / `validUserProfileCreate` / `validUserProfileUpdate`
  ayrımı — yerine tek ve daha gevşek `validUserProfile` geliyor
  (güncellemede `createdAt == resource.data.createdAt` kilidi kayboluyor).

Bu, "kurallar yalnız sıkılaşır" kuralına aykırı olduğu için dal birleştirilmedi;
yalnız bağımsız PWA commit'i taşındı.

## Taşınan değişiklikler

- Çevrimdışı karo isteğine null gövdeli **`204`** cevabı.
- Cache sınırları: **500 girdi**, **100 MiB toplam**, **5 MiB/karo**, **7 gün**
  yaş; aşımda `cachedAt` en eski girdi silinir.
- Kabuk ve karo yazımlarında istek URL'sinin yanında son `response.url` de
  denetlenir; Firebase/Auth/Firestore yönlendirmeleri Cache Storage'a yazılmaz.
- HTML'den başlayarak lazy JS/CSS/worker grafiği özyinelemeli precache edilir;
  eksik varlıkta `install` reddedilir.
- `postbuild` gerçek `dist` grafiğini doğrular (`verify:sw-shell`).
- `npm run test:scripts` zincirine `test:sw` eklendi.

## Kapılar (bu dalda, cherry-pick sonrası)

| Kapı | Sonuç |
| --- | --- |
| `npx tsc --noEmit` | 0 hata |
| `npx eslint . --max-warnings=0` | 0 hata / 0 uyarı |
| `npx vitest run` | **117 dosya / 883 test geçti** |
| `npm run test:scripts` | **30 test / 0 hata** (7 + 6 + 6 + 3 + 8; SW 8/8) |
| `npm run build` | bütçe içinde + **SW üretim kabuğu 25/25 varlık** |

## Dokunulmayanlar

- `firestore.rules`, `firestore.indexes.json`, `follows`, `verifications`,
  `userProfiles`: bu teslimatta değişmedi.
- `UpdateNotice` / `useServiceWorkerUpdate`, manifest ve `App.tsx`: değişmedi.
- **Deploy yapılmadı.**

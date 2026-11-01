# Teslimat — harita kasma/donma turu (2026-11-01)

## Görev

Kullanıcı bildirimi: "Atlasia'nın arayüzü çok kasıyor." İstenen: sıkıntı
çıkarmadan kasma/donma sorununu çözmek.

## Branch ve commit

- Branch: `arena/f93fa0ea-atlasia`
- Taban commit: `0d7695e051ccb53348d0706e5adb2fb16acd7851` (`main`)
- Teslim commit'i: bu dosyayı içeren commit (aşağıdaki "Değişen dosyalar")

## Kök neden — repo şişmesi değil

Ölçümler:

| Kalem | Ölçüm | Yorum |
|---|---|---|
| `.git` boyutu | 20,6 MB | Normal; "repo şişti" teorisi elendi |
| `public/social` | 17 MB | Git'te izlenen dosya yok (6 dosya), tarayıcıya da inmiyor |
| Service worker ön önbelleği | 7 küçük dosya (`atlasia-shell-v9`) | Sosyal görseller önbelleğe alınmıyor |
| `src` | 3,0 MB / 54.027 satır | Derlenmiş çıktı iniyor, kaynak değil |

Asıl nedenler:

1. **Harita `zoom` olayı → her karede iki React state güncellemesi.**
   `MapView` içindeki `report()` `onViewChange` (görünüm) ve
   `onViewportChange` (viewport) çağırıyordu; `zoom` olayı animasyon
   boyunca her karede geldiği için `Explorer` (1.796 satır, 59 `useState`)
   saniyede ~60 kez yeniden çiziliyordu. `Explorer` içinde `React.memo`
   yok ve prop'ların çoğu satır içi arrow olduğu için alt ağacın tamamı
   (Header, BottomPanel, paneller) her karede yeniden render ediliyordu.
2. **Otomatik dönüş döngüsü boşta da dönüyordu.** `tick` koşul sağlanmasa
   bile kendini yeniden kuruyordu: dönüş kapalıyken saniyede 60 boş
   callback (mobilde sürekli CPU/pil).
3. **Her render'da yeniden filtrelenen listeler.** `discoveries`,
   `filteredPosts`, `filteredStories` ve bildirim listeleri `useMemo`
   dışındaydı; ayrıca `useBlocks().isBlocked` her render'da yeni kimlik
   üretiyordu (memo'yu imkânsız kılıyordu).
4. **Pin başına `backdrop-filter`.** Her pin etiketi, görünmezken bile
   bulanıklık katmanı tanımlıyordu.

## Yapılan değişiklikler

- `src/utils/mapLifecycle.ts` — `VIEW_REPORT_INTERVAL_MS = 120` ve saf
  `shouldReportView(now, lastReportAt)` eklendi (hareket sırasında en çok
  ~8 görünüm bildirimi/sn).
- `src/components/MapView.tsx`
  - `zoom` dinleyicisi `reportThrottled()` kullanıyor; `moveend` her zaman
    tam bildirim yapıyor, yani parmak kalkınca görünüm kesinleşiyor.
  - Autospin döngüsü koşul sağlanmıyorsa kendini yeniden kurmuyor; sekmeye
    dönüşte, `zoomstart` ve `resize` olaylarında `ensureSpinLoop` ile
    yeniden başlıyor. `spinDisposed` bayrağı, `map.setCenter` içinden
    senkron yayılan bir olayın döngüyü ikinci kez kurmasını engelliyor.
    `visibilitychange` dinleyicisi cleanup'ta kaldırılıyor.
- `src/components/Explorer.tsx` — üç liste ve bildirim türetmeleri
  `useMemo`'ya alındı (`visibilitychange`/pin davranışı değişmedi).
- `src/hooks/useBlocks.ts` — `isBlocked` `useCallback` ile sabit kimlikli.
- `src/index.css` — pin etiketi bulanıklığı yalnız `:hover`/`.is-active`
  durumunda uygulanıyor (görsel sonuç aynı).
- `src/utils/mapLifecycle.test.ts` — 2 → 5 test.
- `src/components/mapRenderLoop.test.ts` — yeni regresyon kilidi (5 test):
  zoom'da doğrudan `report()` çağrılmaması, `moveend` tam bildirimi,
  döngünün boşta yeniden kurulmaması, `visibilitychange` temizliği ve pin
  bulanıklığının yalnız görünürken tanımlanması.

## Çalıştırılan komutlar ve sonuçları

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti (uyarı yok) |
| `npx vitest run` | 177 dosya / 1.362 test geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | **Bütçe içinde**: ilk set 465.952 B ham / 128.089 B gzip (bütçe 129.400), toplam JS 997.755 B gzip (bütçe 1.003.000), CSS 35.638 B gzip (bütçe 35.700) |
| `npm run audit:check` | Üretim bağımlılıklarında bilinen açık yok |
| `npm run test:rules:emulator` | **Koşulamadı**: ortamda Java 21 yok (`requires Java 21`). Değişiklik `firestore.rules` dosyasına dokunmuyor |
| `npx vite --host 0.0.0.0` | Dev sunucu açıldı; `index.html` ve değişen modüller HTTP 200 döndü |

E2E (`npm run test:e2e`) bu ortamda koşulamadı: Playwright tarayıcı ikilileri
kurulu değil ve tarayıcı indirme CDN'i ağ izin listesinde yok.

## Kilitli dosya / kapsam kontrolü

- `firestore.rules`, `public/sw.js`, `public/_headers`, `vite.config.ts`,
  `package.json` / `package-lock.json`: **dokunulmadı**, yeni bağımlılık yok.
- Yerleşim, renk, tema, panel konumları ve ürün kararları değişmedi; yalnız
  çizim sıklığı ve türetme maliyeti azaltıldı.

## Bilinen riskler

1. Hareket sırasında görünüm bilgisi artık en çok ~8 kez/sn güncelleniyor
   (önceden kare başına). `moveend` tam bildirim yaptığı için nihai değer
   doğru; yalnız animasyon sırasında zoom'a bağlı ara değerler (ör. hero
   gizlenme eşiği) en fazla 120 ms gecikmeli okunur.
2. Eşik değeri (`VIEW_REPORT_INTERVAL_MS`) sabit; cihaz bazlı ölçüm
   (gerçek telefondan DevTools Performance kaydı) bu ortamda yapılamadı.

## Sonraki görev (öneri)

`Explorer`'ı memo'lanabilir parçalara bölmek: `Header`, `BottomPanel` ve
paneller için satır içi prop'ları `useCallback`/`useMemo`'ya almak ve görünüm
verisini context'e taşımak. Bu tur, riski düşük ve kazancı yüksek dört
kalemle sınırlandırıldı.

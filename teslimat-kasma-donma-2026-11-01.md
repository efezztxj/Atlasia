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

---

# Tur 2 — nihai performans için ikinci geçiş (aynı branch)

## Ek kök neden

Tur 1'de bildirim sıklığı 60/sn'den ~8/sn'ye indi. Kalan maliyet iki yerdeydi:

1. **Faydasız state güncellemeleri:** parmak kayarken görünümde gözle
   görülür bir değişiklik olmasa da her bildirim `Explorer`'ı yeniden
   çiziyordu (state nesnesi her seferinde yeni kimlik).
2. **Kapalı panellerin boşuna render edilmesi:** `AtlasAssistant` (112 KB
   modül) ve `SocialPanel` (36 KB) kapalıyken yalnız bir başlatıcı düğme
   çiziyor; buna rağmen harita her hareket ettiğinde tüm gövdeleri yeniden
   çalışıyordu.

## Yapılanlar

| Değişiklik | Dosya | Kazanç |
|---|---|---|
| `shouldCommitView()` eşiği (`VIEW_ZOOM_EPSILON=0.15`, `VIEW_CENTER_EPSILON_RATIO=0.015`) | `utils/mapLifecycle.ts` | Eşik geçilmezse `onViewChange`/`onViewportChange` hiç çağrılmaz → React state aynı nesne → **yeniden render yok** |
| `lastCommitted` + `report(force)` (`moveend` ve ilk yükleme eşiği atlar) | `components/MapView.tsx` | Sürükleme bitince değer kesin; kayıp yok |
| Boylam sarması (180. meridyen) | `utils/mapLifecycle.ts` | Sahte 359°'lik bildirim yok |
| `memo` + özel karşılaştırıcı (kapalıyken yalnız başlatıcıyı etkileyen alanlar) | `components/AtlasAssistant.tsx`, `components/SocialPanel.tsx` | Harita hareketinde iki ağır panel render edilmiyor; açılınca güncel veri |
| Yeni testler | `components/panelMemo.test.ts` (6), `mapLifecycle.test.ts` (9), `mapRenderLoop.test.ts` (6) | Davranış kilitli |

## Doğrulama (tur 2)

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | Geçti |
| `npx eslint . --max-warnings=0` | Geçti |
| `npx vitest run` | 178 dosya / **1.373 test** geçti |
| `npx vite build` | Başarılı |
| `node scripts/bundle-budget.mjs` | Bütçe içinde: toplam JS 998.103 B gzip (bütçe 1.003.000), uygulama kabuğu 583.181 B (bütçe 603.400), CSS 35.638 B (bütçe 35.700) |

## Ölçüm sınırı (dürüst not)

Bu ortamda gerçek tarayıcı çalıştırılamadı: sistemde Chromium yok,
`@sparticuz/chromium` paketi `libnspr4`/NSS sistem kütüphanelerini
bulamıyor ve paket depolarına ağ erişimi kapalı. Bu yüzden kare süresi
(FPS) ölçümü **yapılmadı**; kazanç, çağrı sayısının matematiksel olarak
azaltılması ve davranışın testle kilitlenmesiyle gösterildi. Cihaz üstü
doğrulama için DevTools Performance kaydı hâlâ gerekli.

## Sıradaki adaylar (uygulanmadı, karar bekliyor)

1. **Uyarlanabilir harita kalitesi:** kaba işaretçi/düşük çekirdek sayısında
   terrain + hillshade varsayılan kapalı. GPU'ya bağlı kasmanın en olası
   kaynağı, ama görünümü değiştirdiği için ürün kararı gerektiriyor.
2. **İlk boya yolu:** harita ekranı açılmadan ~2,2 MB JS iniyor.
   `AtlasAssistant`/`SocialPanel` modüllerinin harita hazır olduktan sonra
   yüklenmesi (~55 KB gzip kazanç); başlatıcı düğmelerin biraz geç
   görünmesi pahasına.
3. **`Explorer` parçalama:** satır içi geri çağrıların `useCallback`'e
   alınması ve `Header`/`BottomPanel` için `memo`. Harita hareketi artık
   çoğunlukla render üretmediği için kazanç küçüldü.

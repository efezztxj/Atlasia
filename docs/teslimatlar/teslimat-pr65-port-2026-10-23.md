# Teslimat — #65'in main'e taşınması (2026-10-23)

## Amaç

#65 (`arena/b1059179-atlasia`, İŞ 2 / İŞ 4 / İŞ 5) #66 birleştikten sonra
`CONFLICTING` duruma düştü. Bu çalışma #65'in içeriğini güncel `main`
(`3f284d7`) üzerine taşır ve **#65'in yerine geçer**. Ayrıca `main`'de #66
sonrası kırılan bundle bütçesi kapısını düzeltir.

## Çakışma kararları

Dört dosyada çakışma vardı; hepsi #65'in İŞ 2 (yerleşim) işinden geliyordu.
İŞ 4 (site turları) ve İŞ 5 (PWA) dosyaları çakışmasız geçti.

| Dosya | Karar | Gerekçe |
| --- | --- | --- |
| `src/index.css` | `.mobile-bottom-stack-control` (ölçülen yığın) korundu; `.mobile-map-controls`'a `bottom: calc(186px + env(safe-area-inset-bottom))` **sabit yedeği** eklendi ve yığın kuralı ondan **sonra** yazıldı | Ölçülen `--discovery-occupied-space` gerçek değeri belirler (daraltılmış kartta sonuç ≈196 px, yani #65'in sabit değeriyle aynı); sabit değer yalnız yığın sınıfı yokken geçerli yedek |
| `src/index.css` | `.atlas-launcher` ve `.atlas-dock-expanded` → `64px !important` (#66) | 58 px alt çubuk + 6 px; FAB ile aynı hizada. #65'in 66 px değeri #66'nın taban çizgisi kararıyla çelişiyordu |
| `src/components/MapControls.tsx` | `mobile-bottom-stack-control glass-panel gold-frame` sarmalayıcı (#66) + `hiddenOnMobile && "max-md:hidden"` (#65) birlikte | #66 kapsül görünümünü zaten #65'in kullanıcı önerisinden almıştı; gizleme koruması kısa ekranlarda panel açıkken üst başlığa yaklaşma riskini kaldırır |
| `src/components/MapControls.tsx` | Düğme sınıfı `size-11` + `bg-white/[0.04]` (#66) | #66 bunu "her platformda tam görünür" olarak doğruladı; `size-11` = 44 px, CSS ile aynı |
| `src/components/BottomPanel.tsx` | `bg-[#021915]` + `p-2.5`, `max-md:bottom-[calc(118px…)]` | #65'in İŞ 2a bulanıklık (backdrop-blur) kaldırma niyeti korundu; 118 px #66'nın taban çizgisi |
| `src/App.tsx` | Yürüyüş hapı: `mobile-bottom-stack-control` (#66) + `panelOpen ? " max-md:hidden"` (#65) | Aynı gerekçe: ölçülen yığın + panel açıkken gizleme |

## Bundle bütçesi düzeltmesi (asıl kırmızı)

`main` CI'ı #66 birleşmesinden beri **kırmızıydı**:

- run `39855227074`, adım **"Production build and bundle budget"**, sonuç `failure`.
- Temiz `origin/main` (`3f284d7`) worktree ölçümü: `entry gzip 174.250 B > 174.000 B`.
- #65 taşındığında bu değer `175.770 B` oluyordu (iki kat aşım).

Eşik **gevşetilmedi** (`scripts/bundle-budget.mjs` yalnız gerekçeli teslimatla
güncellenir kuralı korundu). Bunun yerine gerçekten ertelenebilir kod entry'den
çıkarıldı:

- `src/components/NearbyAudioGuide.tsx` `React.lazy` sınırına alındı
  (`src/App.tsx`, `<Suspense fallback={null}>`).
- Site turu seçimi (`siteTourForPoint`, `src/data/siteTours.ts` verisi) App'ten
  bileşenin içine taşındı; `tourRoute` prop'u kaldırıldı. Böylece ~109 satırlık
  tur verisi entry paketinde değil, lazy parçada kalıyor.
- `src/main.tsx` **değişmedi**: `UpdateNotice` statik importu korundu, çünkü
  `src/config/pwaManifest.test.ts` bunu sözleşme olarak doğruluyor.

Sonuç: `entry gzip 171.069 B` (bütçe 174.000), `Toplam JS 876.250 B` (bütçe
886.000), `İlk HTML seti 414.343 B` (bütçe 439.000), `Toplam CSS 33.228 B`
(bütçe 34.500). **"Bundle bütçesi içinde."**

Davranış notu: sesli rehber düğmesi artık küçük bir lazy parça yüklendikten
sonra görünür (`fallback=null`); ilk boyama engellenmez.

## Kapılar (bu dalda, birleştirme sonrası)

| Kapı | Komut | Sonuç |
| --- | --- | --- |
| Tip | `npx tsc --noEmit` | 0 hata |
| Lint | `npx eslint . --max-warnings=0` | 0 hata / 0 uyarı |
| Test | `npx vitest run` | **117 dosya / 874 test geçti** |
| Build | `npm run build` | bütçe içinde, `entry 171.069 B` |

Politika denetimleri: `as any` = 0, `@ts-ignore`/`@ts-expect-error` = 0,
`eslint-disable` = 0, `firestore.rules` içinde `allow …: if true` = **2**
(değişmedi). Erişilebilirlik tabanı yükseltilmedi.

## Kapsam dışı / yapılmayanlar

- **Deploy yapılmadı** (kural yayını ve hosting dahil). Yalnız yerel prova.
- Firestore kuralları bu teslimatta değişmedi.
- #61 kapsamı (eski kural modeline dayanan guard dosyaları) taşınmadı; kendi
  dalında korunuyor ve ayrı inceleme gerektiriyor.

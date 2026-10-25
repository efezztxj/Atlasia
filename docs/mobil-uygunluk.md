# Atlasia — telefon (mobil) uygunluğu incelemesi

> Kapsam: Atlasia'nın web/PWA ürününün telefon tarayıcılarında ve ana ekrana
> eklenmiş (standalone) hâlinde kullanılabilirliği. Native mağaza uygulaması
> bu incelemenin konusu değildir (bkz. `AGENTS.md` → korunan ürün kararları).
> Yayın hattı değişmedi: GitHub → Cloudflare Pages. Bu belge bir deploy kaydı
> değil, ölçüm ve karar kaydıdır.

Tarih: 2026-10-25 · Branch: `arena/15655567-atlasia`

---

## 1. Bir uygulama telefonda "uygun" sayılırken neye bakılır?

Mobil uygunluk tek bir özellik değil, altı katmanın birlikte doğru olmasıdır.
Aşağıdaki ölçüt listesi bu incelemenin çerçevesidir; her ölçüt için eşik,
uygulamadaki durum ve kanıt verilmiştir.

| # | Katman / ölçüt | Eşik (kabul) | Durum | Kanıt |
|---|---|---|---|---|
| 1 | **Görünüm (viewport)** — cihaz genişliğine göre ölçekleme, çentik payı | `width=device-width, initial-scale=1, viewport-fit=cover`; yakınlaştırma kapatılmaz | ✅ | `index.html` → `meta name="viewport"` |
| 2 | **Kırılma noktası** — telefonda ayrı kabuk | < 768 px'te alt sekme çubuğu, alt yığın, mobil başlık | ✅ | `index.css` → `@media (max-width: 767px)`; `App.tsx` → `smallScreen` |
| 3 | **Güvenli alan** — çentik, home çubuğu, durum çubuğu | Her sabit-alt öğe `env(safe-area-inset-*)` ile kayar | ✅ | `index.css` → `.mobile-tab-bar`, `.mobile-explorer-header`, `.mobile-add-fab`, `.atlas-launcher`, `BottomPanel.tsx` alt ofsetleri |
| 4 | **Dokunma hedefleri** — parmakla basılabilirlik | ≥ 44×44 px (iOS HIG, WCAG 2.5.5) | ✅ (kaba işaretçide) | `index.css` → `@media (pointer: coarse) { button, [role="button"], a.btn { min-height: 44px } }`; harita kontrolleri `.map-round-btn` 44px |
| 5 | **Yazı tipi ve odak** — iOS'ta odak yakınlaştırması | Form alanları ≥ 16 px | ✅ (bu turda tamamlandı) | `index.css` → `input/textarea/select { font-size: max(16px, 1em) }` (mobil); `auth-field` alanları zaten 16 px |
| 6 | **Jestler** — geri tuşu / kenar kaydırma | Açık katman geri tuşuyla kapanır, uygulamadan çıkılmaz | ✅ (bu turda eklendi) | `src/hooks/useMobileBackClose.ts`; `App.tsx` → `closeTopLayer` |
| 7 | **Kaydırma davranışı** — pull-to-refresh, çift dokunuş | Harita sürüklerken sayfa yenilenmez; 300 ms gecikme yok | ✅ (bu turda eklendi) | `index.css` → `overscroll-behavior: none`, `touch-action: manipulation` |
| 8 | **Kurulabilirlik (PWA)** | Manifest + 192/512 ikon + `display: standalone` + theme-color + Apple meta'ları | ✅ | `public/manifest.webmanifest`, `index.html` |
| 9 | **Çevrimdışı** | Uygulama kabuğu ve harita döşemeleri önbellekte; güncelleme sessizce zorlanmaz | ✅ | `public/sw.js` (`SHELL`, döşeme LRU'su), `UpdateNotice.tsx` |
| 10 | **Telefon verisi yükü** | İlk paket bütçe içinde, harita/Firebase tembel yüklenir | ✅ | `scripts/bundle-budget.mjs`; `App.tsx` → `lazy()` sınırları |
| 11 | **Erişilebilirlik** | 12 px altı metin yok, odak halkası görünür, kontrast token'ları, `prefers-reduced-motion` | ✅ | `index.css` → mikro tipografi tabanı, `:focus-visible`, `html[data-theme="dark"]` kontrast düzeltmeleri |
| 12 | **Yatay mod / kısa ekran** | Dikey yığın haritayı yutmaz | ✅ (bu turda eklendi) | `index.css` → `@media (orientation: landscape) and (max-height: 500px)` |

---

## 2. Ölçüm aracı: telefon önizlemesi

Teknik inceleme yalnız kod okumasıyla kalmıyor; uygulama gerçek cihaz
ölçülerinde çalıştırılıp canlı DOM üzerinden ölçülüyor.

```bash
npm run dev                        # 1. terminal (uygulama, 5173)
node scripts/mobil-onizleme.mjs    # 2. terminal (önizleme, 5180)
# tarayıcıda: http://localhost:5180/
```

Araç ne yapar:

- Uygulamayı 6 cihaz çerçevesinde açar (iPhone 15/16, iPhone SE, Pixel 8,
  küçük Android 360×740, Pro Max, yatay telefon).
- Önizlemenin içindeki **canlı uygulama DOM'unu** ölçer ve şu raporu üretir:
  telefon kabuğunun etkin olup olmadığı, yatay taşma, **alt yığın çakışması**
  (sekme çubuğu ↔ ekle düğmesi ↔ Atlas AI ↔ harita kontrolleri ↔ keşif kartı),
  44 px altındaki dokunma hedefleri, 16 px altındaki form alanları (iOS odak
  yakınlaştırması), `env(safe-area-inset-*)` değerleri ve çubuk dolguları,
  manifest/service worker/standalone durumu, isimsiz düğmeler ve alt'sız
  görseller, toplam kaynak yükü.
- Cihaz çerçevesi değiştiğinde uygulamayı yeniden yükler (ilk açılışta okunan
  `window.innerWidth` kararları da doğru ölçülsün diye).
- Sayfa telefon genişliğinde açılırsa doğrudan uygulamaya (`/uygulama/`) geçer;
  aynı adres telefonda uygulamayı, masaüstünde denetim masasını açar.

Notlar:

- Dokunma hedefi ve `pointer` ölçümleri masaüstü tarayıcıda yapıldığı için
  `pointer: coarse` kuralı devre dışıdır; sonuç gerçek telefondan **kötümser**
  okunur.
- `env(safe-area-inset-*)` tarayıcı çerçevesinde 0 px'tir; sıfırdan farklı
  değerler yalnız gerçek cihazda ve yüklü PWA'da görülür.
- Araç `public/` altında değildir: üretim paketine ve Cloudflare çıktısına
  girmez.

---

## 3. Bu turda kapatılan boşluklar

### 3.1 Telefonda geri tuşu uygulamadan çıkarıyordu → katman kapatıyor

Android'de geri tuşu, iOS'ta kenardan geri kaydırma jesti açık paneli
kapatmıyor, doğrudan uygulamadan çıkıyordu; kullanıcı ekrandaki küçük "×"
düğmesini aramak zorundaydı.

- Yeni kanca: `src/hooks/useMobileBackClose.ts`. Katman açılınca geçmişe
  işaretli bir kayıt ekler; geri tuşu bu kaydı tüketince katman kapanır.
  Katman ekrandaki düğmeyle kapatılırsa eklenen kayıt sessizce geri alınır
  (geri tuşu ölü bir adımda takılmaz).
- `App.tsx` → `closeTopLayer()`: kapatma sırası görsel yığınla aynıdır —
  hikâye/sokak görünümü → rota düzenleyici → ekleme modu → arama → bildirim →
  yürüyüş kaydı → ayarlar → yer detayı → topluluk → profil → kayıtlar →
  izlerim → Atlas AI → keşif menüsü → keşif kartı.
- Yalnız telefon genişliğinde devreye girer; masaüstü tarayıcı geçmişi
  kirletilmez.
- Test: `src/hooks/useMobileBackClose.test.ts` (5 test).

### 3.2 iOS, form alanına odaklanınca sayfayı yakınlaştırıyordu

Sosyal gönderi, grup mesajı ve arama alanları 13 px yazı boyutundaydı; iOS
16 px altındaki alanlara odaklanınca sayfayı kendiliğinden yakınlaştırıp öyle
bırakıyor. Mobilde alan yazı boyutu `max(16px, 1em)` tabanına bağlandı;
`auth-*` alanlarının kendi 16 px kuralı korunuyor.

### 3.3 Harita üzerinde istenmeyen tarayıcı hareketleri

- `overscroll-behavior: none` → haritayı aşağı sürüklerken pull-to-refresh
  tetiklenmiyor.
- `touch-action: manipulation` → çift dokunuşta 300 ms bekleme ve yakınlaştırma
  yok.
- `-webkit-tap-highlight-color: transparent` → düğmelerde gri flaş yok.
- `-webkit-text-size-adjust: 100%` → yatay çevirmede Safari metni büyütmüyor.

### 3.4 Yatay telefon / çok kısa ekran

Yüksekliği 500 px altındaki yatay ekranlarda başlık geri çekiliyor, arama
sayfası ve keşif kartı kalan yüksekliğe göre kaydırılıyor, Atlas AI başlatıcısı
alt çubuğun üstüne sabitleniyor. Dikey yığın haritayı yutmuyor.

---

## 4. Değişmeyen kararlar

- Masaüstü yerleşimi (başlık solda, arama sağda, tek alt keşif paneli),
  Atlas AI'ın sağ alt konumu ve sağ harita kontrolleri korunuyor.
- Mobil yerleşim (alt sekme çubuğu 58 px + güvenli alan, ölçülen alt yığın,
  Atlas AI sağ altta 46 px) olduğu gibi bırakıldı.
- Yakınlaştırma kapatılmadı (`user-scalable=no` yok): erişilebilirlik için
  sayfa yakınlaştırması açık kalır.
- Native mağaza yayını, Firebase Blaze/Storage gibi ücretli katmanlar
  eklenmedi; yayın hattı GitHub → Cloudflare.

---

## 5. Bilinen sınırlar ve sonraki adımlar

1. **Yatay telefonda masaüstü kabuk.** Genişlik ≥ 768 px olduğu için yatay
   tutulan bir telefon (örn. 844×390) Tailwind'in `md:` kırılma noktasına girer
   ve masaüstü yerleşimini alır. Yatayda artık başlık gizleniyor ve yığın
   sıkışmıyor, ancak alt sekme çubuğu görünmüyor. Kalıcı çözüm kırılma
   noktasının "genişlik **veya** kaba işaretçi + kısa yükseklik" olarak
   yeniden tanımlanmasıdır; yerleşim kararlarını geniş biçimde etkilediği için
   ayrı bir görev olarak bırakıldı.
2. **Manifest maskable ikonu.** `icons/icon-512.png` hem `any` hem `maskable`
   olarak tanımlı. Android uyarlanabilir ikonunda güvenli alan (yarıçapın
   %80'i) dışındaki logo kırpılabilir; ayrı, dolgulu bir maskable ikon
   üretilmesi önerilir.
3. **Manifest `screenshots` alanı yok.** Kurulum ekranında zengin önizleme
   için gerekir; gerçek cihazdan alınacak görüntülerle eklenmeli.
4. **Gerçek cihaz doğrulaması.** Ölçümler tarayıcı benzetiminde yapıldı;
   iOS Safari + Android Chrome'da aşağıdaki liste bir kez elle koşulmalı.

### Gerçek cihaz kontrol listesi (10 dakika)

- [ ] Ana ekrana ekle → uygulama standalone açılıyor, durum çubuğu içeriği
      kesmiyor (çentikli cihaz).
- [ ] Alt sekme çubuğu home çubuğunun üstünde; keşif kartı ve harita
      kontrolleri çakışmıyor.
- [ ] Bir panel aç → geri tuşu / kenar jesti paneli kapatıyor, uygulamadan
      çıkmıyor.
- [ ] Arama alanına dokun → sayfa yakınlaşmıyor; klavye açılınca arama
      sonuçları görünür kalıyor.
- [ ] Haritayı aşağı sürükle → sayfa yenilenmiyor (pull-to-refresh yok).
- [ ] Uçak modunda aç → kabuk ve önbellekteki döşemeler geliyor, çevrimdışı
      bildirimi görünüyor.
- [ ] Telefonu yatay çevir → harita ve alt yığın kullanılabilir kalıyor.

---

## 6. Doğrulama

| Komut | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 127 dosya / 959 test |
| `npm run build` + `bundle:budget` + `verify:sw-shell` | ✅ (CSS bütçesi 34.500 → 35.500 B, gerekçe `scripts/bundle-budget.mjs` içinde) |
| `node scripts/mobil-onizleme.mjs` | ✅ önizleme 5180'de açılıyor |
| `npm run test:rules:emulator` | ⏭️ Rules değişmedi; bu ortamda Java yok |

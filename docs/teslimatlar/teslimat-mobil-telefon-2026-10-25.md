# Teslimat — Telefon (mobil) uygunluğu ve telefon önizlemesi (2026-10-25)

## Görev ve branch

- Görev: kullanıcı isteği — "bu uygulamanın telefon sürümü lazım, erişim
  sıkıntısı olmadan; bir uygulamanın telefon için uygun olup olmadığını
  teknikleriyle incele, ona göre bir şey çıkar; deploy yapma, önizlemeden göster".
- Branch: `arena/15655567-atlasia`
- Taban commit: `455d031` (feat(social): yuruyus serisini yayina hazirla #101)
- Teslim commit'i: bu kaydı içeren commit (PR head)

## Yapılanlar

1. **Teknik inceleme belgesi** — `docs/mobil-uygunluk.md`: mobil uygunluğun 12
   ölçütü (viewport, kırılma noktası, güvenli alan, dokunma hedefleri, iOS
   odak yakınlaştırması, jestler, kaydırma, PWA, çevrimdışı, veri yükü,
   erişilebilirlik, yatay mod), her biri için eşik + durum + dosya kanıtı,
   bilinen sınırlar ve gerçek cihaz kontrol listesi.
2. **Telefon önizleme aracı** — `scripts/mobil-onizleme.mjs` +
   `scripts/mobil-onizleme/index.html`: uygulamayı 6 cihaz çerçevesinde açar ve
   canlı DOM'dan mobil uygunluk raporu üretir (kabuk, yatay taşma, alt yığın
   çakışması, 44 px altı hedefler, 16 px altı alanlar, `env(safe-area-inset-*)`,
   manifest/SW/standalone, isimsiz düğmeler, kaynak yükü). Sayfa telefon
   genişliğinde açılırsa doğrudan uygulamaya geçer. `public/` altında değildir;
   üretim paketine girmez.
3. **Geri tuşu** — `src/hooks/useMobileBackClose.ts` + `App.tsx` →
   `closeTopLayer()`: telefonda geri tuşu/kenar jesti uygulamadan çıkarmak
   yerine en üstteki katmanı kapatır (yığın sırası görsel sırayla aynı).
   Masaüstünde devreye girmez.
4. **iOS odak yakınlaştırması** — mobilde alan yazı boyutu `max(16px, 1em)`
   tabanına bağlandı (13 px'lik sosyal/arama alanları iOS'ta sayfayı
   yakınlaştırıyordu).
5. **Jest/kaydırma sertleştirmesi** — `overscroll-behavior: none`,
   `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`,
   `-webkit-text-size-adjust: 100%`.
6. **Yatay telefon / kısa ekran** — `orientation: landscape and
   max-height: 500px` bloğu: başlık geri çekilir, arama ve keşif kartı kalan
   yüksekliğe göre kaydırılır, Atlas AI alt çubuğun üstüne sabitlenir.
7. **Belge dizini** — `docs/README.md` yeni inceleme belgesine bağlandı.

## Değişen dosyalar

- `src/hooks/useMobileBackClose.ts` (yeni)
- `src/hooks/useMobileBackClose.test.ts` (yeni, 5 test)
- `src/App.tsx` — geri tuşu katman kapatma bağlantısı
- `src/index.css` — telefon sertleştirme + yatay kısa ekran blokları
- `scripts/mobil-onizleme.mjs` (yeni)
- `scripts/mobil-onizleme/index.html` (yeni)
- `scripts/bundle-budget.mjs` — CSS bütçesi 34.500 → 35.500 B (ölçülen 34.597 B)
- `docs/mobil-uygunluk.md` (yeni)
- `docs/README.md` — dizin satırı
- `docs/teslimatlar/teslimat-mobil-telefon-2026-10-25.md` (bu kayıt)

## Doğrulama

| Komut | Sonuç |
| --- | --- |
| `npm ci` | ✅ |
| `npx tsc --noEmit` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 127 dosya / 959 test |
| `npm run build` (+ `bundle:budget` + `verify:sw-shell`) | ✅ "Bundle bütçesi içinde", SW kabuğu 28/28 |
| `npm run test:bundle-budget` | ✅ |
| `node scripts/mobil-onizleme.mjs` | ✅ 5180'de açılıyor; `/`, `/uygulama/`, `/src/*` yolları 200 |
| `npm run test:rules:emulator` | ⏭️ Firestore Rules değişmedi; ortamda Java yok |

## Kilitli dosya kontrolü

Çalışma yalnız `arena/15655567-atlasia` branch'inde; `main`'e dokunulmadı,
başka görev dosyası sahiplenilmedi. Deploy yapılmadı (Cloudflare/Netlify yok).
`.env.local` yalnız yerel `ATLASIA_ALLOWED_HOSTS` için oluşturuldu, `.gitignore`
kapsamında ve commit dışında.

## Bilinen riskler / notlar

- Ölçümler tarayıcı benzetiminde yapıldı (bu ortamda tarayıcı ikilisi
  çalıştırılamadı: sistemde `libnss3` yok, paket deposuna erişim kapalı).
  Gerçek cihaz kontrol listesi `docs/mobil-uygunluk.md` §5'te.
- Yatay telefonda (genişlik ≥ 768 px) hâlâ masaüstü kabuk açılır; kırılma
  noktası yeniden tanımlanması ayrı görev olarak bırakıldı.
- Manifest'te maskable ikon ayrı değil ve `screenshots` alanı yok — öneri
  olarak kayda geçti.
- CSS bütçesi bilinçli olarak 1 KB büyütüldü; gerekçe koda yazıldı.

## Sonraki görev önerisi

Kırılma noktasını "genişlik veya (kaba işaretçi + kısa yükseklik)" olacak şekilde
tanımlayıp yatay telefonda da mobil kabuğu açmak; ardından gerçek cihazda
§5 kontrol listesini koşup maskable ikonu ayırmak.

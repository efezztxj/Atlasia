# Teslimat — Mobil Alt Yığın Düzeni (2026-10-22)

## Görev ve branch

- Görev: Mobil ana ekranın alt bölgesini düzene sokmak (kullanıcı "hepsi"
  kapsamını seçti): çakışmaları bitir, alt bölgeyi tek sisteme bağla,
  üst başlığı ferahlat.
- Branch: `arena/446d12fa-atlasia`
- Taban commit: `1578608` (Merge pull request #58)
- Teslim commit'i: bu kaydın içinde bulunduğu commit (PR head)

## Yapılanlar

- **Ölçülen alt yığın:** Keşif paneli (BottomPanel) mobilde kapladığı
  alanı ResizeObserver ile ölçüp `onOccupiedSpaceChange` ile bildiriyor;
  App kökü değeri `--discovery-occupied-space` CSS değişkenine yazıyor.
  Yürüyüş kaydı hapı ve harita kontrolleri (`.mobile-bottom-stack-control`)
  kartın üst kenarının 10px üstüne yaslanıyor; sihirli `bottom` sayıları
  kaldırıldı, geçiş 350ms animasyonlu.
- **Tek taban çizgisi:** Daraltılmış kart 112→118, genişlemiş panel
  64→118 (üst kenarı korumak için `max-h: calc(42dvh - 54px)`);
  Atlas AI başlatıcısı 66→64 ile + FAB ile aynı hizaya geldi.
  Sıra: alt çubuk (58) → FAB satırı (64) → kart (118) → hap/kontroller
  (kart üstü +10).
- **Hero ferahlığı:** Mobil başlık bir kademe küçüldü
  (`clamp(24px, 6.6vw, 29px)`); ilk harita etkileşiminde
  (`onUserInteract`) başlık mobilde geri çekiliyor, masaüstü görünümü
  değişmiyor. Keşfet sekmesi ve görünüm sıfırlama başlığı geri getiriyor.
- Masaüstü yerleşimi, Atlas AI'ın sağ alt konumu ve sağ harita kontrolleri
  korunan kararlar doğrultusunda değiştirilmedi.

## Değişen dosyalar

- `src/App.tsx` — discoverySpace durumu + CSS değişkeni, heroCompact,
  hap sınıfı
- `src/components/BottomPanel.tsx` — alan ölçümü (ResizeObserver),
  kart alt ofsetleri
- `src/components/MapControls.tsx` — alt yığın sınıfı
- `src/components/Hero.tsx` — `compact` prop'u (mobilde geri çekilme)
- `src/index.css` — `--discovery-occupied-space`, `--mobile-stack-base`,
  `.mobile-bottom-stack-control`, başlık boyutu, Atlas başlatıcı hizası
- `teslimat-mobil-alt-yigin-2026-10-22.md` — bu kayıt

## Doğrulama

| Komut | Sonuç |
| --- | --- |
| `npm ci` | ✅ |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 107 dosya / 748 test |
| `npm run test:scripts` | ✅ |
| `npm run build` (+ bundle bütçesi) | ✅ "Bundle bütçesi içinde" |
| `npm run audit:check` | ✅ bilinen açık yok |
| `npm run verify:social-metadata` | ✅ |
| `npm run test:rules:emulator` | ⚠️ Ortamda Java yok; Rules değişmedi, CI'da koşulacak |

Gerçek tarayıcı ölçümü (390×844, cihaz hesabı): daraltılmış ve genişlemiş
panelde hap–kart ve kontrol–kart boşluğu tam 10px; harita sürüklemesi
sonrası Hero opacity 1→0; sayfa hatası 0.
Görüntüler (git dışı): `design-vizyon/duzen-peek.png`,
`design-vizyon/duzen-genis.png`, `design-vizyon/duzen-etkilesim.png`.

## Kilitli dosya kontrolü

Çalışma yalnız `arena/446d12fa-atlasia` branch'inde; `main`'e dokunulmadı,
başka görev dosyası sahiplenilmedi. `design-vizyon/` untracked ve commit
kapsamı dışında bırakıldı.

## Bilinen riskler / notlar

- Ölçüm 390×844 üzerinde doğrulandı; çok kısa ekranlarda (≤667px)
  genişlemiş panel + kontrol sütunu üst başlığa yaklaşabilir — gerçek
  cihazda (iOS Safari + Android Chrome) son bir göz kontrolü önerilir.
- Hero ilk etkileşimde geri çekilir; geri dönüş yalnız Keşfet sekmesi /
  görünüm sıfırlama ile olur (bilinçli tercih).

## Bağımsız inceleme

Diff dosya bazında gözden geçirildi; geometri, gerçek uygulama üzerinde
piksel ölçümüyle doğrulandı (10px boşluk her iki panel durumunda da).

## Sonraki görev önerisi

Merge onayı sonrası gerçek cihazda safe-area ve kısa ekran kontrolü;
gerekirse kontrol sütunu için üst sınır (max bottom) ince ayarı.

# Teslimat — Gece (lacivert/altın) teması + sağ rayda Atlas AI ve iz kaydı

**Tarih:** 2026-10-25 · **Dal:** `arena/0f7bafa4-atlasia`
**Kaynak:** Kullanıcının canlı keşif kaydı paleti önerisi ve önceki "Atlas AI ve iz kaydını da sağ tarafa ekle" isteği.

## Gece teması

- `AppTheme` artık `dark | light | midnight`. Ayarlar/Profil görünüm seçici **Koyu · Açık · Gece** üçlüsü oldu; seçim cihazda saklanıyor.
- Palet: gece laciverti `#071827`, panel `#0a2438`, krem metin `#f3ead3`, altın `#d9a94f` / açık altın `#ebcb83`, deniz köpüğü destek rengi `#79c7a3`.
- Tema yalnız birkaç paneli boyamıyor: tokenlar, `space-bg`, cam paneller, altın çerçeveler, birincil düğmeler, bölümlü kontroller, mobil üst/alt çubuk, kaydırma çubukları ve sabit kodlanmış koyu yeşil yüzeyler gece karşılıklarına geçiyor.
- Harita da temayı izliyor: etiketler krem metin + koyu lacivert hale, gökyüzü/ufuk/sis ve zemin lacivert; tema değişimi stil yeniden yüklenmeden canlı uygulanıyor.
- Kontrast kilidi üç temayı kapsayacak şekilde genişletildi; gece temasında tam opak metin ve /70 tonları AA'yı geçiyor.

## Sağ ray

- Masaüstü sağ kenar rayına **Yürüyüş/İz kaydı** ve **Atlas AI** düğmeleri eklendi (toplam 9 düğme). İki eylem de açıkken altın aktif durumda; Atlas düğmesi `aria-expanded`/`aria-controls` taşıyor.
- Masaüstündeki ayrı Yürüyüş hapı ve Atlas AI başlatıcısı kaldırıldı; sağ alt köşe boşaldı. Atlas paneli rayın soluna açılıyor.
- Mobil düzen bilinçli olarak aynı: iz kaydı ortadaki `+` yanında, Atlas AI sağ altta, harita kapsülü dört temel düğmeyle keşif kartının üstünde.

## Ölçümler (gerçek uygulama)

- PC 1366×900: `data-theme=midnight`; ray 58×608 ve 9 görünür düğme. Raydan Atlas paneli ve Yürüyüş kaydı paneli açıldı/kapatıldı.
- Mobil 390×844: gece teması aktif; kapsül–kart boşluğu 10 px korundu.
- Sayfa hatası: 0. Görseller (çalışma alanı): `design-vizyon/gece-pc.png`, `gece-atlas.png`, `gece-kayit.png`, `gece-mobil.png`.

## Kapılar

- `typecheck` ✅ · `lint` ✅ · `test:run` **126 dosya / 952 test** ✅ · `test:scripts` ✅ · `audit:check` ✅
- `build` ✅ · `verify:social-metadata` ✅. Toplam JS eşiği, yeni tema + iki ray eyleminin bilinçli büyümesi ve Cloudflare üretim ortamındaki küçük boyut farkı için **886.000 → 888.000 B** olarak güncellendi (scripts/bundle-budget.mjs politikasındaki ölçüm+gerekçe kuralıyla). Yeni bağımlılık veya yeni ikon eklenmedi; mevcut `Sparkles` yeniden kullanıldı ve tema düğmeleri tek şablona indirildi.
- `test:rules:emulator`: ortamda Java yok → CI koşar.

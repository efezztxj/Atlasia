# Teslimat — Yerleşim Düzeni (sabit eylem düğmeleri + mobil alt katman)

- **Görev:** Kullanıcı isteği: "bunların yerlerini düzene sok" — uygulama sandbox'ta
  çalıştırıldı, harita üzerindeki sabit (floating) düğmelerin ve mobil alt
  katmanın çakışmaları giderildi. Yeni özellik eklenmedi, deploy yapılmadı.
- **Branch:** `arena/c8fca047-atlasia`
- **Taban commit:** `1578608c7757b5a741eb80ff3c011481ce962a73` (main)

## Yapılanlar

### Masaüstü — sol alt eylem şeridi

`Yürüyüş kaydı` hapı `bottom-24 / left-8` (96/32px) konumundaydı, `İzler` hapı ise
`bottom-4 / left-4` (16/16px). İki düğme farklı sol hizada, farklı yükseklikte ve
İzler hapı ekranın alt kenarına neredeyse yapışık duruyordu (kullanıcı ekran
görüntüsündeki kırpılmış alan).

- `Yürüyüş kaydı`: `lg` ve üstünde `left-6 / bottom-84px`, `İzler` hapının 8px
  üstünde, aynı sol hizada hap olarak durur.
- `İzler` hapı ve açılan İzler paneli `left-6 / bottom-7` (24/28px) hizasına
  çekildi; iki düğme ve alt keşif paneli aynı 28px taban çizgisinde buluşur.
- İzler paneli açıkken `Yürüyüş kaydı` düğmesi gizlenir (panel onu örtüyordu).
- `Yürüyüş kaydı` paneli de aynı köşeye (`md:left-6 / md:bottom-7`) hizalandı.

### Mobil — alt katman

- `Yürüyüş kaydı` düğmesi `left-3 / bottom-136px` konumundaydı ve daraltılmış
  keşif kartının üstüne biniyordu. Artık Atlas AI düğmesiyle aynı satırda
  (`right-64px / bottom-66px`) 46px yuvarlak ikon düğme; etiketi masaüstünde
  görünür, mobilde `aria-label` okunur.
- Keşif kartı (daraltılmış ve açık durum) `bottom-120px` tabanına alındı; böylece
  + / Atlas AI / Yürüyüş kaydı düğmeleri kartın alt kenarını ve karttaki
  "Haritada gör" düğmesini örtmüyor.
- Mobil harita kontrolleri `bottom-122px` → `bottom-196px`: daraltılmış kartın
  (~180px) üstünde 8px boşlukla durur, düğmeler artık kartın altında kesilmiyor.

## Değişen dosyalar

`src/App.tsx`, `src/components/SocialPanel.tsx`,
`src/components/TrackRecorderPanel.tsx`, `src/components/BottomPanel.tsx`,
`src/index.css`, `teslimat-yerlesim-2026-10-22.md`.

Firebase/Rules/veri katmanına, metinlere ve akışlara dokunulmadı.

## Doğrulama

| Komut | Sonuç |
| --- | --- |
| `npm ci` | ✅ |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 107 dosya / 748 test |
| `npm run build` (+ bundle bütçesi) | ✅ "Bundle bütçesi içinde" |
| `npm run dev` (sandbox, cihaz hesabı) | ✅ 5173 portunda çalışıyor |

## Bilinen riskler / notlar

- Gerçek cihazda (iOS Safari + Android Chrome) safe-area ile son bir göz
  kontrolü önerilir: mobil alt katman artık 58px sekme çubuğu + 6px + 48px
  düğme satırı + 8px + kart sırasıyla diziliyor.
- `md` aralığında (768–1023px) sol alt hap, keşif paneli neredeyse tam genişlikte
  olduğu için panelin sol üst köşesine binmeye devam ediyor; bu aralık için ayrı
  bir yerleşim kararı gerekiyor.
- Görsel doğrulama bu turda tarayıcıyla yapılamadı (sandbox'ta headless tarayıcı
  yok); hizalar CSS ölçüleri üzerinden hesaplandı, önizlemede gözle kontrol
  edilmeli.

---

# Ek Tur — Erişilebilirlik bölümü (kullanıcı isteği)

Kullanıcı isteği: "erişilebilirlik kısmını da ekle". Ayarlar paneline (ve aynı
içeriği paylaşan Profil → Ayarlar sekmesine) **Erişilebilirlik** bölümü eklendi.

## Yapılanlar

- **`src/hooks/useAccessibilityPrefs.ts` (yeni):** üç tercih — *Hareketi azalt*,
  *Yazı boyutu (Normal/Büyük)*, *Yüksek kontrast*. Tercih `localStorage`
  (`atlasia.accessibility.v1`) içinde saklanır, `<html>` üzerine
  `data-motion` / `data-text-scale` / `data-contrast` öznitelikleri yazılır.
  Store `useSyncExternalStore` ile paylaşılır; bozuk kayıt varsayılana döner.
- **`src/main.tsx`:** `initAccessibilityPrefs()` ilk boyamadan önce çalışır,
  böylece sayfa eski görünümle çakmaz.
- **`src/components/SettingsPanel.tsx`:** yeni bölüm — iki `role="switch"`
  anahtarı (Hareketi azalt, Yüksek kontrast) + `aria-pressed` bölümlü
  Normal/Büyük yazı boyutu. Bölüm başlığı `accessibility-title`, tercihlerin
  cihazda saklandığı ve klavye/odak/dokunma hedefinin her zaman açık olduğu notu.
- **`src/index.css`:** `html[data-motion="reduced"]` animasyon/geçişleri durdurur;
  `html[data-text-scale="large"]` mikro tipografi tabanını bir kademe büyütür;
  `html[data-contrast="high"]` soluk metinleri beyaza çeker, çerçeve ve odak
  halkasını kalınlaştırır. Mevcut WCAG AA kontrast kilidi korunur.
- **`src/App.tsx`:** küre dönüşü artık işletim sistemi tercihi **veya** kullanıcı
  anahtarı kapalıysa durur.
- **Testler:** `useAccessibilityPrefs.test.ts` (5 test: varsayılan, kayıttan
  okuma, bozuk kayıt, güncelleme + kalıcılık, hook aboneliği) ve
  `SettingsPanel.test.ts` (bölüm varlığı + anahtar/yazı boyutu davranışı).

## Doğrulama (ek tur)

| Komut | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 uyarı |
| `npm run test:run` | ✅ 108 dosya / 754 test |
| `npm run test:scripts` | ✅ 22 test, 0 fail |
| `npm run build` (+ bundle bütçesi) | ✅ "Bundle bütçesi içinde" |
| `npm run verify:social-metadata` | ✅ |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⛔ sandbox'ta Java yok (Rules değişmedi) |

## Notlar

- Tercih cihaz bazlıdır (hesap senkronu yok); tema davranışıyla aynı çizgide.
- "Büyük" yazı boyutu yoğun panellerde satırları uzatabilir; gerçek cihazda
  gözle kontrol edilmeli.

---

## Revizyon (2026-10-23)

Bu nottaki mobil yerleşim maddeleri `main`e giren #66/#75 ile çakıştı; birleşmede
main'in çözümü korundu, dosya içeriklerine dokunulmadı. Yalnız mobil dışı küçük
hizalamalar (`SocialPanel` İzler hapı, `TrackRecorderPanel` panel köşesi) kaldı.
Güncel durum için `docs/mobil-denetim-2026-10-23.md` → "Revizyon" bölümüne bakın.

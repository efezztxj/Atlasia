# Teslimat P18 — Erişilebilirlik (klavye/odak/kontrast)

**Tarih:** 2026-10-22 · **Durum:** ✅ kod tamam; açık temadaki toplu kontrast kararı kullanıcıda.

## Yapılan
- AddDiscoveryModal, StoryComposer, StoryViewer, Onboarding, RouteEditor → `usePanelAccess` (odak tuzağı, Esc, odak iadesi) + `role="dialog"`/`aria-modal`/`aria-labelledby`.
- Backdrop'lar `<button tabIndex={-1}>` (klavye sırasına girmez, ekran okuyucuya etiketli).
- **Bug:** kapalı çekmecenin düğmeleri Tab sırasındaydı → `inert={!open}`.
- Kontrast: RouteEditor `/55`, PlaceDetails `/60` metinleri `/70`; tüm placeholder'lar `/70`.
- `src/utils/contrast.ts` (WCAG göreli parlaklık) + `src/config/accessibility.test.ts` (9 test; `text-mint/<70` sayısı için cırcır, BASELINE 140).

## Ölçüm (statik, sRGB; gerçek ekran okuyucu testi yapılmadı — "WCAG uyumlu" iddiası yok)
| Zemin | /45 | /50 | /60 | /65 | /70 |
|---|---|---|---|---|---|
| Koyu ink-2 | 4.04 | 4.64 | – | – | – |
| Açık `#fffdf7` | – | – | 3.90 | 4.51 | 5.24 |
| Açık `#f4f1e7` | – | – | – | 4.30 | 4.99 |

AA (4.5) için minimum: koyu /50, açık ink-2 /65, açık ink /70. `/70` iki temada da AA.

## Kullanıcı kararı
Açık temada AA altında 140 `text-mint/<70` kullanımı var (/35:1, /40:9, /45:14, /50:22, /55:23, /60:46, /65:25). Toptan düzeltme palet/tasarım kararı; cırcır yalnız artışı engeller.

## Yanlış pozitifler
- P18-03/06 `outline-none`: katmansız global `:focus-visible` kazanıyor; testle kilitlendi.
- P18-10/14 dokunma hedefleri 32–36 px: WCAG 2.5.8 AA (24 px) geçer.

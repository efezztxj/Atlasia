# Teslimat P18 — Erişilebilirlik (klavye/odak/kontrast)

**Tarih:** 2026-10-22 · **Durum:** ✅ tamam (2026-10-22 ikinci tur: açık tema kontrastı kapatıldı, giriş yüzeyi kararı verildi).

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

## Açık tema kontrastı — kapatıldı (2026-10-22, kullanıcı talimatıyla)
136 `text-mint/<70` kullanımı + `md:text-mint/65` açık temada AA altındaydı. Bileşenlere dokunmadan `src/index.css` içinde yalnız açık temaya uygulanan katman (`P18-LIGHT-AA`):

| Kaynak ton | Açık temada | `#fffdf7` | `#f4f1e7` |
|---|---|---|---|
| /35 /40 /45 /50 | %70 | 5.26 | 4.99 |
| /55 /60 | %74 | 5.95 | 5.62 |
| /65, md:/65 | %78 | 6.76 | 6.34 |

- Koyu tema değişmedi; açık temada sıralama korunuyor (soluk → daha az koyu).
- Hover rengi olan öğe üzerine gelinince kendi hover rengini kullanır (`:not([class*="hover:text-"]:hover)`).
- Kilit: `accessibility.test.ts` — kaynakta kullanılan her /70-altı ton katmanda olmalı ve iki açık zeminde AA vermeli; yeni ton eklenip katmana yazılmazsa test kırılır (denendi).

## P18-13 giriş yüzeyi — karar: her temada koyu kalır (❌ açık temaya çevrilmedi)
Gerekçe: giriş ekranının sol yarısı manzara fotoğrafı üstünde metin; ~196 elle yazılmış koyu kural var. Açık temaya çevirmek redesign olur ve bu ortamda tarayıcıyla görsel doğrulama yapılamıyor. Bunun yerine giriş yüzeyindeki 11 metin rengi iki koyu zemine karşı AA testiyle kilitlendi; açık tema katmanının `.auth-*`'a dokunmaması da testte.

## Yanlış pozitifler
- P18-03/06 `outline-none`: katmansız global `:focus-visible` kazanıyor; testle kilitlendi.
- P18-10/14 dokunma hedefleri 32–36 px: WCAG 2.5.8 AA (24 px) geçer.

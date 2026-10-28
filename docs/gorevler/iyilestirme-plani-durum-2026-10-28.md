# İyileştirme planı — durum defteri (T1–T21)

Bu defter, "Atlasia — İyileştirme Planı" maddelerinin **sırasını ve durumunu**
tutar. Sıra bağımlılığa göredir: Faz 1 (dönüşüm) ölçüm olmadan başlamaz —
"iyileşti mi?" sorusu hisle değil sayıyla yanıtlanır.

**Son güncelleme:** 2026-10-28 · **Referans sürüm:** bu dal (T1–T3, T9, T13–T16 + **T4/T5/T8** teslimatı)
**Ölçüm tablosu:** `docs/baseline.md` · **Olay sözleşmesi:** `docs/olcum-ve-hata-izleme.md` §2b/§4b

Plan sırası: `T1 → T2 → T3 → T12 → T11 → T7 → T4 → T5 → T8 → T9 → T6 → T10 → T13 → T14 → T15 → T16 → T18 → T19 → T20 → T21 → T17`

## 1. Durum

| # | Madde | Durum | Kanıt |
|---|---|---|---|
| T1 | Ölçüm altyapısı (toplayıcı + panel) | 🟡 **kısmi** — kod hazır, panel yok | `src/lib/telemetry.ts`, `telemetryBootstrap.ts`; panel için dış servis kimliği gerekli (§5b) |
| T2 | Huni olayları (landing→harita→kayıt) | ✅ | 16 olay: `analytics.ts`; katalog testi `src/config/telemetryCatalog.test.ts`; bağlama testi `src/config/siteSurface.test.ts` |
| T3 | Baseline tablosu | 🟡 **kısmi** — paket ölçüldü, CWV/Search Console ölçülmedi | `docs/baseline.md` |
| T4 | Misafir modu (kayıt duvarını kaldırma) | ✅ | CTA → misafir haritası; **kural değişmedi** (`request.auth` boş → yazma sunucuda reddedilir); `src/config/guestMode.test.ts` (10 test) |
| T5 | Kayıt duvarı sonrası ilk değer | 🟡 **kısmi** | Engellenen eylem hatırlanır (`atlasia.pendingIntent.v1`, 30 dk) ve hesap açılınca aynı yüzey açılır; misafir cihaz kayıtlarının hesaba taşınması ayrı iş (T5b) |
| T6 | Tanıtım videosu | ⛔ **sıradaki** ancak video barındırma kararı insan onayı istiyor (§3.3) | `preload="none"` + poster zorunlu |
| T7 | Landing CTA/çerez yerleşimi (1440×900 tıklanabilirlik, mobil sheet) | ✅ | `LandingPage.tsx`, `CookieConsent.tsx` (`bottom-[calc(66px+safe-area)]`, `md:right-6 md:bottom-6`), z-index: menü 95 > çerez 90 |
| T8 | Onboarding / ilk rota akışı | ✅ | `Onboarding.tsx` misafir notu + `askAccount(..., "route")`; panel `FIRST_ROUTE_KEY`'e bağlı; `onboarding_choice` olayı — `onboardingT8.test.ts` (8) |
| T9 | Giriş ekranı sürtünmesi (önce Google) | ✅ | `AccountAccess.tsx` + `AccountAccess.t9.test.ts` (7 test) |
| T10 | Görsel boru hattı (foto optimize) | ⛔ bekliyor | gerçek tarayıcı/cihaz ölçümü ister |
| T11 | Firebase'i ilk setten çıkarma | ✅ | İlk boya JS **91.254 B** gzip; `firebase-vendor` ilk sette değil (`npm run build` tablosu) |
| T12 | Kontrast düzeltmeleri (eyebrow/başlık) | ✅ | `#a37c35 → #8f6224` (4,66:1), `#ba8f45 → #9c7029` (3,86:1); `src/config/landingContrast.test.ts` |
| T13 | Mobil menü (768 px altı) | ✅ | Hamburger + `role="dialog"` panel, Escape/Tab tuzağı/odak iadesi — `src/config/landingA11y.test.ts` |
| T14 | Klavye: skip-link + `:focus-visible` | ✅ | "İçeriğe geç" → `#kesfet` (`tabIndex={-1}`); tek `:focus-visible` bloğu |
| T15 | Hareket azaltma | ✅ | `prefers-reduced-motion` bloğunda `scroll-behavior: auto !important` |
| T16 | Semantik (tek H1) | ✅ | Tek `h1` = "Dünyayı merakınla keşfet."; marka yazısı `aria-hidden` |
| T17 | Prerender/SSG (SEO) | ⛔ bekliyor | Landing istemci tarafında render ediliyor; JS'siz HTML'de metin yok |
| T18 | Footer'da dil + yasal bağlantılar | ⛔ bekliyor | — |
| T19 | İçerik/SEO meta seti | ⛔ bekliyor | — |
| T20 | Güven sinyalleri (sosyal kanıt) | ⛔ bekliyor | sahte sayaç yazılmaz; gerçek veri gerekir |
| T21 | Basın/iletişim yüzeyi | ⛔ bekliyor | — |

## 2. Bütçe ve eşikler (bugünkü ölçüm)

| Ölçüm | Değer | Eşik | Marj |
|---|---|---|---|
| İlk HTML seti (gzip) | 126.774 B | 129.400 B | 2.626 B |
| Toplam JS (gzip) | 997.923 B | 998.500 B | **577 B** |
| Toplam CSS (gzip) | 34.988 B | 35.700 B | 712 B |
| Tanıtım yolculuğu (gzip) | 126.774 B | 129.400 B | 2.626 B |
| Uygulama kabuğu (gzip) | 586.968 B | 603.400 B | 16.432 B |
| `entry` (bizim kod) | 20.839 B | 20.900 B | **61 B** |

Eşik kuralı: `scripts/bundle-budget.mjs` içindeki sayı **yalnız** yeni bir ölçüm
ve yazılı gerekçeyle değişir; testi yeşile çevirmek için asla değişmez. #127'den
beri **bayatlama kapısı** var: sahibi olduğumuz eşikler ölçümün %20'sinden fazla
üstünde olamaz. `entry` marjı 61 B — girişe (landing + App kabuğu) yeni kod
eklemeden önce `npm run build` ile ölçüm alın.

## 3. Açık kararlar (insan onayı ister)

1. **Misafir cihaz kayıtları:** misafirken cihazda kaydedilen iz/rotalar hesap
   açılınca **taşınmıyor** (bilinçli). Taşıma istenirse T5b olarak ayrı iş.
2. **T1 paneli:** kendi Cloudflare Worker toplayıcısı mı, Plausible/Umami köprüsü
   mü? İkisi de kod değişikliği istemiyor; tek zorunlu adım
   `VITE_TELEMETRY_ENDPOINT`.
3. **T6 video:** barındırma nerede olacak (repo dışı, `preload="none"` + poster)?

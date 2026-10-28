# Teslimat — Açık tema yıkıcı eylem kontrastı ve profil sekmeleri (P19, 2026-10-28)

## Görev ve branch

- Görev: açık temada okunmayan yıkıcı eylem metinleri ve taşan profil sekme
  çubuğu. Canlı denetimde (atlasia.pages.dev, giriş yapılmış hesap, açık tema)
  ölçülen değerler:
  - "Hesabımı ve verilerimi sil" — **1.34:1** (13 px)
  - "Hesaptan çık" — **1.39:1** (14 px)
  - "İz bırak" aktif (yeşil) durumu — **3.11:1**
  - Üst çubuk keşif sayacı — **3.79:1**
  - Aktif profil sekmesi — **4.30:1**, doğrulama rozeti — **4.45:1**
  - Profil sekme çubuğu `grid-cols-4` ile 3 sekme taşıyordu: "Keşiflerim"
    kısaltılıyor, dördüncü sütun X düğmesinin altında boş kalıyordu.
- Branch: `bionic/p19-acik-tema-kontrast`
- Taban commit: `dda45ca` (Merge PR #126)

## Yapılanlar

- **`src/index.css`:** `P19-LIGHT-DANGER` katmanı. Yalnız açık temada geçerli;
  koyu/gece temalarının tonları değişmedi.
  - `text-red-200*` / `text-red-300*` tonları `#a02318`e çekildi
    (beyaz kartta **7.64:1**). Bu tonlar yalnız iki düğmede değil, tüm silme
    ikonlarında kullanılıyor; tek katman hepsini kapsıyor.
  - `hover:text-red-*` ile kendi tonuna dönen ikonlar için hover kuralı.
  - Kırmızı kenarlıklar (`border-red-300/20` vb.) beyaz zeminde görünmüyordu;
    `rgba(160, 35, 24, .32)`.
  - Aktif profil sekmesi `#6f4712` (**6.23:1**), doğrulama rozeti `#0f5a41`.
  - Keşif sayacı `#6f4712` + `%12` altın zemin (yeni `.header-count-badge`).
- **`src/components/Header.tsx`:** "İz bırak" aktif durumu `bg-leaf` +
  sabit `text-[#10241A]` yerine `bg-leaf text-ink` kullanıyor; mevcut
  `.bg-leaf.text-ink` kuralı açık temada beyaza çeviriyor (**5.23:1**).
  Sayaç rozetine `.header-count-badge` sınıfı eklendi.
- **`src/components/ProfilePanel.tsx`:** sekme çubuğu `grid-cols-4` →
  `grid-cols-3` (3 sekme, 3 sütun). Üç sekme de 148 px ve kısaltma yok.
- **`src/config/accessibility.test.ts`:** P19 kilidi — katman varlığı,
  bileşenlerde kullanılan her kırmızı tonun kapsanması, yıkıcı metnin üç açık
  yüzeyde AA vermesi, sayaç/aktif sekme/yeşil CTA kontrastı ve sekme sütun
  sayısı.

## Çalıştırılan komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npx vitest run src/config/accessibility.test.ts src/components/a11y.test.ts` | 23/23 geçti |
| `npm run typecheck` | temiz |
| `npm run lint` | temiz (0 uyarı) |
| `npm run test:run` | 1207/1208; tek hata bu değişiklikten bağımsız (aşağıda) |
| `npm run build` | başarılı; bundle bütçesi içinde, SW kabuğu 44/44 |
| `vite preview` + headless Edge, açık tema, 1440×1000 | kontrast taraması **temiz**; kırmızılar `rgb(160,35,24)`; sekmeler `trunc:false` |

## Bilinen riskler

- **`src/config/firestoreRulesRunner.test.ts` Windows'ta kırmızı.** Test
  `spawn(\n  "java"` dizgesini arıyor; `scripts/run-firestore-rules-tests.mjs`
  CRLF ile checkout edildiği için eşleşmiyor. LF'e çevrildiğinde dizge 5457.
  indekste bulunuyor — yani üretim kodu doğru, test satır sonuna duyarlı.
  Bu PR'ın kapsamı dışında; ayrı görev önerisi: testte `\r?\n` kullanmak.
- Mobilde keşif panelinin tam ekran açılması **tasarım kararı** (index.css
  yorumu: "Telefonda açılan tüm paneller tam ekran çalışır"). Ürün kararı
  istenirse ayrı görevde header/tab bar görünürlüğü tartışılmalı.
- Koyu ve gece temalarına dokunulmadı; P18 katmanının `html[data-theme="light"]`
  sayısı kilidi (3 kural) korunuyor.

## Sonraki görev

- Landing tarafı: App Check/reCAPTCHA'yı auth akışına taşımak (performans +
  KVKK), `sitemap.xml` düzeltmesi, prerender.
- Mobil panel davranışı için ürün kararı.

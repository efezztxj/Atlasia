# Teslimat — S4: Lighthouse CI kapısı (gerçek LCP/TBT ölçümü)

**Tarih:** 1 Kasım 2026 · **Kapsam:** S4 (P1-2'nin kalanı) + manifest kısayolunun soğuk
açılışta çalışmaması · **Durum:** CI'da zorunlu adım

---

## 1. Neden

Bugüne dek performans **yalnız paket bütçesiyle** (gzip kB) korunuyordu. Paket bütçesi
"ne indiriliyor"u ölçer, "ne kadar sürede çiziliyor"u ölçmez: küçük paket yavaş LCP
verebilir, büyük paket hızlı açılabilir. `docs/gorevler/siradaki-isler-2026-11-01.md`
S4 ve G4 kabul listesi gerçek LCP/TBT ölçen bir kapı istiyordu.

## 2. Ne eklendi

| Parça | Dosya | İş |
|---|---|---|
| Kapı yapılandırması | `lighthouserc.cjs` | Üretim derlemesini (`dist/`) mobil profilde 3 kez ölçer, medyanı değerlendirir |
| Komut | `npm run test:lighthouse` (`lhci autorun`) | Yerelde ve CI'da aynı komut |
| CI adımı | `.github/workflows/ci.yml` | `Browser E2E + axe` adımından sonra, **zorunlu** (`continue-on-error` yok) |
| Rapor | artifact `lighthouse-reports` | `.lighthouseci/` (gitignore'da) 7 gün saklanır |
| Kilit | `src/config/lighthouseGate.test.ts` | Eşikler, ölçülen sayfalar, CI kablolaması test altında |

**Ölçülen iki sayfa:**

1. `/` — tanıtım. LCP'nin gerçekten kritik olduğu sayfa; ilk boya grafiğinin tamamı burada.
2. `/?tab=kesfet` — uygulama kabuğu (harita + kabuk). Bu URL için önce aşağıdaki hata
   düzeltildi.

**Eşikler (S4 kabul listesi, `AGENTS.md` gereği düşürülmesi yasak):**

- performans **≥ 0,85**
- erişilebilirlik **≥ 0,95**
- `cumulative-layout-shift` **≤ 0,05**

> Erişilebilirlik eşiği axe kapısının (S3) yerine geçmez: axe WCAG kural setini
> `critical/serious` düzeyinde zorlar, Lighthouse puanı daha geniş ama daha yüzeyseldir.
> İkisi birlikte tutuluyor.

## 3. Yol boyunca bulunan gerçek hata: PWA kısayolu soğuk açılışta çalışmıyordu

`public/manifest.webmanifest` "Keşfet" kısayolunu `./?tab=kesfet` olarak tanımlıyor.
Ama `parseShortcutTab` **yalnız `Explorer` içinde** okunuyordu; `Explorer` ise ancak
misafir/oturum bayrağı varken mount oluyor. Sonuç: ana ekrandan kısayola basan kullanıcı
tanıtım ekranına düşüyor, kısayol hiçbir şey açmıyordu (parametre de adreste kalıyordu).

**Düzeltme:** `App.tsx` kapısı, kısayol parametresi geçerliyse (`kesfet`, `iz-birak`,
`profil`, `profıl`) misafir oturumunu açar; parametreyi `Explorer` temizleyip ilgili
paneli açar, yani eylem iki kez tetiklenmez. Doğrulama aynı yerden (`parseShortcutTab`)
geliyor; bilinmeyen değer yok sayılır.

**Kanıt:** `src/App.test.ts` → "manifest kısayolu (?tab=kesfet) soğuk açılışta tanıtımı
atlar". Düzeltme kaldırıldığında test kırmızı (mutasyon denemesi yapıldı).

**Maliyet:** entry 16.656 → **16.823 B gzip** (+167). Bu yüzden entry eşiği
16.700 → **17.000** (%1,05 pay) olarak ölçüme göre yeniden bağlandı; diğer bütün eşikler
(ilk boya JS, ilk HTML, toplam JS, appShell) **değişmedi** ve payla içinde kaldı.

## 4. Kapılar (bu dalda, yerelde)

| Kapı | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npm run test:run` | ✅ 180 dosya / 1396 test |
| `npm run test:scripts` + `test:bundle-budget` | ✅ |
| `npm run build` | ✅ bütçe içinde (entry 16.823 / 17.000), SW 63/63 |
| `lhci autorun` (yerel) | ⚠️ Chrome yok — bu ortamda tarayıcı kurulamıyor, ölçüm CI'da |

## 5. Sınırlar / sıradaki

- Ölçüm **CI donanımında** alınır; mutlak sayı üretim kullanıcısının cihazı değildir.
  Amaç regresyonu yakalamak, laboratuvar mutlak değeri vaat etmemek.
- Kararlılık için 3 koşu/medyan var; yine de tek koşuluk ±%3-5 oynama normaldir.
  Eşik bu yüzden hedefin biraz altında değil, **hedefin kendisinde** tutuluyor.
- Lighthouse **alan verisi (CrUX) değildir**; gerçek kullanıcı ölçümü için Clarity/huni
  verisi ayrı kanal olarak kalıyor.
- Sıradaki: kalan panellerin axe kapsamı (Ayarlar, Raporlar, story, gruplar, bildirimler)
  ve `docs/baseline.md` tablosunun üretim ölçümüyle doldurulması.

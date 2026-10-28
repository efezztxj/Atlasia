# Yerel geliştirme rehberi

Son güncelleme: 28 Ekim 2026 · Kapsam: G2 (canlı denetim listesi)

Bu belge, depoyu ilk kez açan birinin **sıfırdan çalışan bir önizleme** alması
için gereken en kısa yolu ve bu depoya özgü tuzakları anlatır. Genel Vite/React
anlatımı değildir; burada yalnız Atlasia'da gerçekten işe yarayan adımlar var.

---

## 1. Gereksinimler

| Araç | Sürüm | Neden |
| --- | --- | --- |
| Node | `^22.13.0` veya `>=24` (`package.json → engines`) | MapLibre v6 zinciri Node 22 ister |
| npm | `10.9.2` (`packageManager`) | `npm ci` kilidi |
| Java 21 | yalnız Firestore kural testleri için | `npm run test:rules:emulator` |
| Chrome | yalnız Lighthouse için | `npm run lighthouse` |

## 2. Kurulum (3 komut)

```bash
npm ci                 # lockfile'dan tam kurulum (npm install değil)
cp .env.example .env.local   # yoksa .env.local oluştur, aşağıdaki değişkenleri doldur
npm run dev            # http://localhost:5173
```

`.env.example` yoksa gereken anahtarlar `scripts/verify-env.mjs` ve
`src/lib/firebaseConfig.ts` içinde listelidir. **Gerçek anahtar olmadan da
çalışır:** Firebase yapılandırılmadığında uygulama cihaz içi hesap moduna düşer
(`VITE_FIREBASE_*` boş olabilir).

Önizleme (Arena/E2B gibi proxy'li ortamlar) için tek ek değişken:

```
ATLASIA_ALLOWED_HOSTS=.e2b.app,localhost,127.0.0.1
```

Yeni bir barındırma alanı eklerken `parseAllowedHosts` biçimini kullan; joker
alan adı (`*`) kabul edilmez (`src/config/allowedHosts.ts`).

## 3. Günlük komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu (`0.0.0.0:5173`) |
| `npm run build` | Üretim derlemesi **+ bütçe kapısı** (aşağıya bak) |
| `npm run preview` | Derlenmiş `dist`'i servis eder |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, `--max-warnings=0` |
| `npm test` / `npm run test:run` | Vitest (tek koşu) |
| `npm run test:scripts` | Kredisiz betik testleri (SW, başlıklar, bütçe, köprü…) |
| `npm run test:rules:emulator` | Firestore kuralları (Java 21 + emülatör) |
| `npm run fonts:sync` | `public/fonts/` içeriğini fontsource paketlerinden tazeler |
| `npm run images:hero` | Hero görsel türevlerini (AVIF/JPEG) yeniden üretir |
| `npm run lighthouse` | Yerelde mobil Lighthouse (`dist` üzerinde) |
| `npm run audit:check` | Üretim bağımlılıklarında açık var mı |

## 4. Bu depoya özgü kurallar (kırılırsa build kırmızı olur)

### 4.1 Bütçeler gevşetilmez
`scripts/bundle-budget.mjs` ilk HTML, entry, CSS, JS ve rota bütçelerini tutar.
Eşik **yalnız sıkılaşır**; zorunlu bir artış varsa gerekçe o dosyanın başına
yorum olarak yazılır (ör. B2 font self-host: 35.700 → 36.600).

### 4.2 Fontlar self-host
Google Fonts yok. `public/fonts/fonts.css` elle yazılmış minimal `@font-face`
içerir (yalnız `wght` ekseni, latin + latin-ext). Fontsource CSS'ini doğrudan
`@import` etmek Vietnamca/Kiril alt kümelerini de paketleyip bütçeyi açar —
yapma. Değişiklik: `npm run fonts:sync` → `npm run build`.

### 4.3 Hero görselleri türetilir, elle kopyalanmaz
`scripts/build-hero-variants.mjs` master'dan (`public/images/atlasia-earth-hero.jpg`)
480/768/1376 px AVIF + JPEG üretir. Master'dan **büyük** türev üretilmez
(yükseltme olur). Yeni aday eklerken `index.html` preload `imagesrcset` ile
`LandingPage.tsx` `<picture>` **aynı adayları** göstermek zorunda
(`src/config/imagePipelineT10.test.ts` bunu kilitler).

### 4.4 Üçüncü taraf görsel yok
Rehber fotoğrafları `/gorsel?u=…` köprüsünden geçer:
- Üretim: Cloudflare Pages Function → `functions/gorsel.js` (allowlist: yalnız
  `images.pexels.com/photos/<sayı>/…`)
- Yerel: `vite.config.ts` içindeki `atlasia-image-bridge-dev` eklentisi aynı
  kuralı 302 ile uygular. **`npm run preview` bu köprüyü çalıştırmaz**; Pexels
  görselleri önizlemede görünmezse sebebi budur, kod hatası değil.

### 4.5 CSP `public/_headers` içinde
`img-src`/`style-src`/`font-src` listeleri dar tutulur. Yeni bir alan adı
eklemek `src/config/cloudflareHeaders.test.ts` testini de güncellemek demektir.

## 5. Kalite kapıları (ne zaman ne koşar)

| Kapı | Nerede | Eşik |
| --- | --- | --- |
| Vitest | `ci.yml` | 0 düşen test |
| axe (3 tema × kritik ekranlar) | `src/config/a11yThemes.test.ts` | 0 ihlal |
| Bütçe | `npm run build` | `Bundle bütçesi içinde` |
| Lighthouse mobil | `.github/workflows/lighthouse.yml` | perf ≥90, a11y ≥95, BP ≥95, SEO ≥95 |
| Lighthouse bütçesi | `lighthouse-budgets.json` | 420 KB / 14 istek, 0 üçüncü taraf |
| Bağımlılık güvenliği | `ci.yml` | üretim açığı 0 |

## 6. Sık karşılaşılan tuzaklar

- **`.tsx` testleri vitest'te çalışmaz** (depo yapılandırması): JSX denetimi
  gerekiyorsa kaynağı okuyan bir `.ts` testi yaz (`src/config/*.test.ts` deseni).
- **`gh run list --limit 1`** bazen eski SHA döndürür; `headSha` alanını kendi
  commit'inizle karşılaştırın.
- **Çok satırlı commit mesajı**: `git commit -m "…"` tırnakları bozar;
  `git commit --amend -F dosya` kullanın.
- **`require()` bir `.mjs` betiğinde** `ReferenceError` verir; `node:fs`'ten
  named import kullanın.
- **Lighthouse sandbox'ta koşmaz** (Chrome/libnss yok); yerelde `npm run
  lighthouse`, CI'da iş akışı.
- **`dist/` elle düzenlenmez**; `verify-sw-shell` derleme çıktısını denetler.

## 7. Yayın

Yayın `main` üzerinden Cloudflare Pages ile yapılır (ayrıntı:
`docs/deploy-runbook.md`). Bu depoda **otomatik deploy yoktur**; yayına alma
açık onay ister. Onaydan sonra `npm run build` çıktısı `dist/` yayınlanır.

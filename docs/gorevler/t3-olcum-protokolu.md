# T3 — Gerçek cihaz ölçüm protokolü (Lighthouse + saha)

> Amaç: "mobil 4G'de LCP < 2,0 sn · CLS < 0,05 · INP < 200 ms · Lighthouse
> Perf ≥ 90 / A11y ≥ 95" iddialarını **kanıtla** eşleştirmek. Bu ortamda
> tarayıcı yok; ölçüm bu protokolle insan tarafından alınır ve aşağıdaki
> tabloya yazılır. Kanıtsız satır "geçti" sayılmaz (`docs/gorevler/task-016-cihaz-matrisi.md` §4 kuralı).

## 1. Ön koşullar

- Yayındaki sürümün commit SHA'sı: `git rev-parse --short HEAD`
- Chrome (masaüstü) + Android Chrome (saha) + iOS Safari (saha)
- Ekran kaydı veya en az ekran görüntüsü + Lighthouse JSON çıktısı

## 2. Laboratuvar ölçümü (Lighthouse, mobil)

```bash
# 1) Üretim derlemesini yerel olarak sun (uç nokta ve env aynı olsun)
npm ci && npm run build && npx vite preview --port 4173

# 2) Tek komut: mobil profil, 3 koşu, medyan
npx lighthouse http://localhost:4173/ \
  --preset=perf --form-factor=mobile \
  --throttling-method=simulate --throttling.rttMs=150 \
  --throttling.throughputKbps=1600 --throttling.cpuSlowdownMultiplier=6 \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=/tmp/lh-landing.json --chrome-flags="--headless=new"

npx lighthouse http://localhost:4173/uygulama/ --preset=perf --form-factor=mobile \
  --output=json --output-path=/tmp/lh-app.json --chrome-flags="--headless=new"
```

Kaydedilecek alanlar (JSON'dan):

```bash
node -e "const r=require('/tmp/lh-landing.json');const a=r.audits;
console.log({
  perf:r.categories.performance.score, a11y:r.categories.accessibility.score,
  seo:r.categories.seo.score,
  LCP:a['largest-contentful-paint'].numericValue,
  CLS:a['cumulative-layout-shift'].numericValue,
  TBT:a['total-blocking-time'].numericValue,
  LCPel:a['largest-contentful-paint-element']?.details?.items?.[0]?.node?.snippet?.slice(0,120),
  thirdParty:a['third-party-summary']?.details?.items?.slice(0,5),
})"
```

## 3. Saha ölçümü (gerçek 4G)

| Ölçüm | Nasıl | Hedef |
|---|---|---|
| LCP | Chrome DevTools → Performance → 4G yavaş profili + gerçek cihaz | < 2,0 s |
| CLS | Aynı kayıt → Layout Shift bölümü | < 0,05 |
| INP | DevTools → Performance → "Interactions" veya `web-vitals` konsolu | < 200 ms |
| İlk boya JS | `npm run build` çıktısındaki "İlk boya JS" satırı | < 102.200 B gzip (bugün 98.287) |
| Video indirmesi | Ağ paneli: `#film` oynatılmadan `goreme-yuruyus.mp4` isteği **olmamalı** | 0 istek |

T3 için asgari kombinasyon: **Android Chrome (orta segment) + iOS Safari +
masaüstü Chrome**. Her satır: tarih, build SHA, cihaz, ağ, sayı, ekran görüntüsü.

## 4. Sonuç tablosu (doldurulacak)

| # | Sayfa | Cihaz | Ağ | LCP | CLS | INP | Perf | A11y | SHA | Kanıt |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Landing | — | 4G | | | | | | | |
| 2 | Landing | — | Masaüstü | | | | | | | |
| 3 | `/uygulama/` (misafir) | — | 4G | | | | | | | |
| 4 | `/uygulama/` (misafir) | — | Masaüstü | | | | | | | |

## 5. Bilinen ölçüm tuzakları

1. **`vite preview` yerine `npm run dev` ile ölçmeyin:** HMR istemcisi ve
   kaynak haritaları sonucu bozar (LCP ~%30 iyimser çıkar).
2. **Lighthouse'u eklenti olarak çalıştırmayın:** eklentiler ve açık sekmeler
   CPU profiline girer; `--chrome-flags="--headless=new"` kullanın.
3. **İlk ziyaret / önbellekli ziyaret ayrı ölçülür:** PWA servis çalışanı
   ikinci açılışta kabuğu önbellekten verir. Tabloya "soğuk" / "sıcak" yazın.
4. **A11y paneli (axe) ayrı:** Lighthouse a11y skoru %95 üstü olsa da
   `@axe-core` taraması 0 ihlal istiyor (T12 kabul kriteri). Komut:
   `npx @axe-core/cli http://localhost:4173/ --exit` (Chrome açık olmalı).

## 6. Ölçüm sonrası

- Sapma varsa `docs/denetim/` altına bulgu açın (şablon: TASK-016 §4).
- Bütçe tablosu (`docs/baseline.md`) ile saha sayıları çelişirse **bütçe**
  kazanır: saha ölçümü bütçenin temsil etmediği bir maliyeti gösteriyor
  demektir, eşik değil kod düzeltilir.

# Bakım Triyajı — Tur 4 (2026-10-22)

> **Kapsam:** Açık PR'lar #1, #3, #4, #6, #7, #8, #10, #11, #12, #13, #15, #18,
> #27 için `gh pr view` + `gh pr checks` ile **güncel main'e çakışma, CI, kapsam
> ve öneri**. **Bu turda hiçbir PR kapatılmadı, birleştirilmedi veya
> yeniden-tabanlanmadı** — karar kullanıcıdadır.
> **Gözlem kaydı:** Birçok PR'da `Workers Builds: atlasia **fail**` görünürken
> `Cloudflare Pages **pass**` görünüyor (bkz. `iddia-envanteri.md` §2 — ayrı
> hatlar). Ayrıca #1'de **Netlify `atlasiaworld`** deploy-preview kontrolleri
> var; depo dokümanları Netlify'ı yayın hattı saymıyor — entegrasyon GitHub
> tarafında dışarıdan bağlı, panel işlemi T4-DIŞI.

## 1. Özet tablo

| PR | Konu | main ile | CI (yalnız GitHub Actions adımı) | Öneri |
|---|---|---|---|---|
| #1 | Eski ana yol haritası dosyası (`ATLASIA_YOL_HARITASI.md`) | MERGEABLE | tarihsel kontroller (Workers fail / Pages pass / Netlify preview) | **kapat** |
| #3 | Agent Relay araç takımı (`tools/agent-relay`, workflow) | **CONFLICTING** | tarihsel | **kapat** (değerli kısım: TAŞI notu) |
| #4 | ROADMAP.md v2 | **CONFLICTING** | tarihsel | **kapat** |
| #6 | actions/setup-java 4.9.1 → 6.0.1 | MERGEABLE | **FAIL** | **kapat** (benim PR'ımda uygulandı) |
| #7 | actions/cache 4.3.0 → 6.1.0 | MERGEABLE | **FAIL** | **kapat** (aynen) |
| #8 | actions/setup-node 4.4.0 → 7.1.0 | MERGEABLE | **FAIL** | **kapat** (aynen) |
| #10 | lucide-react 1.54 → 1.56 | MERGEABLE | pass | **kapat** (benim PR'ımda uygulandı) |
| #11 | maplibre-gl 6.4.1 → 6.14.0 | MERGEABLE | **FAIL** | **birleştirme** — bütçe kararı kullanıcıda |
| #12 | tailwind-merge 3.4.0 → 3.7.0 | MERGEABLE | pass | **kapat** (benim PR'ımda uygulandı) |
| #13 | suncalc 1.9.0 → 2.1.1 | MERGEABLE | **FAIL** | **kapat** (API uyumu benim PR'ımda) |
| #15 | S0-ZEKA-02 çoklu fotoğraflı yer notları | **CONFLICTING** | pass (eski koşu) | **kapat** + TAŞI görevi |
| #18 | App Check / rota kontrolleri / yerel doğrulama onarımı | **CONFLICTING** | pass (eski koşu) | **kapat** + TAŞI notu |
| #27 | development-tooling grubu (9 paket) | MERGEABLE | **FAIL** (8 sn — kurulum/typecheck) | **birleştirme**; grup kırıcı majörleri içerir |

## 2. PR bazında gerekçe

### #1 — kapat (eskidi)
Tek dosya `ATLASIA_YOL_HARITASI.md` (13 Eki). İçerik işlevi bugün
`ROADMAP.md` (v2, main'de) tarafından karşılanıyor; iki ayrı yol haritası
kaynağı kafa karıştırır. Ek risk yok; kayıp yok.

### #3 — kapat (çakışmalı, eskidi) + TAŞI
`tools/agent-relay/**` + `agent-relay-build.yml` + README. main ile
**CONFLICTING** (README). 14 Eki'den beri güncellenmemiş. Değerli fikir
("tek yerden yaz, iki ajan sıralı çalışsın") canlıysa **TAŞI görevi** olarak
yeniden yazılmalı: `tools/agent-relay/` fikri + çalışma kuralı şerhi
(`docs/gorevler/calisma-kurallari.md` "aynı klasörü iki ajan paylaşmaz"
kuralıyla güncellenmeli).

### #4 — kapat (içerik zaten main'de)
`ROADMAP.md` v2 taslağı; main'deki ROADMAP.md zaten "Yeni Kronolojik Sıra (v2)"
ve PR #39 ile güncellendi. PR **CONFLICTING**; birleştirmek geriye sarmalar.

### #6 / #7 / #8 — kapat (benim PR'ımda uygulandı) — CI FAIL gerekçesi öğretici
Üç PR da yalnız `ci.yml` pin'ini büyütüyor ama `src/config/githubActions.test.ts`
`EXPECTED_PINS` eski SHA'lara kilitli olduğu için **Actions kontrolleri FAIL**
(48s/38s/41s). Benim PR'ımda pin'ler SHA-doğrulamalı güncellendi **ve** test
kilidi birlikte taşındı (`docs/github-actions-pins.md` kayıt defteri dahil).
Dependabot PR'ları bu hâliyle tek başına asla yeşil olamaz.

### #10 / #12 — kapat (benim PR'ımda uygulandı)
lucide-react 1.56.0 ve tailwind-merge 3.7.0 benim PR'ımda ayrı commit'lerle
geldi; bu PR'ların kontrolleri yeşildi ama içerik olarak gereksizleşti.
(Tercih edilirse önce benim PR'ım birleştirilir, bunlar kapanır — ters sıra
olursa çakışma doğar.)

### #11 — birleştirme (bilinçli karar gerekir)
maplibre-gl 6.14.0. CI **FAIL**: `npm run build` bundle bütçesi kapısı
(mapVendor kategorisi 284,6 + 10,5 ≈ 295,1 kB gzip > 286 kB sınırı; ham
map-vendor 1,04 MB). Benim denememde aynı sonuç alındı ve sürüm
**uygulanmadı** (`teslimat-p1-tur4.md`). Seçenekler: (a) PR kapanır, 6.4.1'de
kalınır; (b) kullanıcı bilinçli bütçe artışı onaylar, `BUNDLE_BUDGET`
güncellenir + görsel kontrol yapılır, PR yeniden yazılır. Ek not: maplibre
büyütmesi ayrıca **görsel regresyon kontrolü** ister.

### #13 — kapat (API uyumu benim PR'ımda)
suncalc 2.1.1. CI **FAIL**: 2.x default export'u kaldırdı ve `getPosition`
derece döndürmeye başladı; dependabot yalnız sürümü büyütüyor, `sun.ts`
adaptasyonu yok. Benim PR'ımda named export + birim düzeltmesi + regresyon
kilidi (65–72°) ile uygulandı.

### #15 — kapat + TAŞI
"Multi-photo place notes": `firestore.rules` + `AddDiscoveryModal` + `App.tsx`
+ `package.json` + lisans dosyaları. **CONFLICTING**; tarihsel CI yeşil.
Değerli kısımlar (TAŞI görevi, sahiplerine):
1. Çoklu fotoğraf + sıkıştırma (P3 `placePhotos`/`AddDiscoveryModal` yüzeyi),
2. Fotoğraf politikası/rules eki (P4 — mevcut kurallarla uyumlu yeniden
   yazılmalı; `firestore.rules` bu PR'dan bağımsız ilerledi),
3. `heic-to` lisans paket iddiası (`public/licenses/`) — lisans denetimi P1.

### #18 — kapat + TAŞI notu
"repair App Check, route checks, local verification". **CONFLICTING**;
tarihsel CI yeşil. Ancak ana değerinin çoğu main'de var: `appCheckConfig.ts` +
testleri, `verify-env.mjs` üretim kapısı, `firestoreConfig.test.ts`. Kalan
değer: kendi dalındaki ek doğrulama yamaları — `arena/3897767c-atlasia`
üzerinden okunup gerekli farklar "TAŞI" notu olarak alınmalı (P1 kapanış
notlarıyla çapraz kontrol).

### #27 — birleştirme (grup kırıcı majörleri içerir)
9 paketlik development-tooling grubu: rules-unit-testing 6, @tailwindcss/vite
4.3.3, @types/node 26.6.5, plugin-react 6.1.2, eslint 10.13, globals 17,
tailwindcss 4.3.3, **typescript 7.0.2**, vitest 5.0.5. CI **FAIL** (8 sn).
Bu turda tek tek denenip kanıtlandı:
- vitest 5 ✅ (benim PR'ımda; mocker açıkları kapandı),
- TS 7 ❌ (typescript-eslint TS 7.0'ı reddediyor → lint kırmızı),
- @types/node 26 ❌ (typecheck 3 hata: `Array.at` + lib ES2020),
- plugin-react 6 ❌ (peer `vite@^8`),
- rules-unit-testing 6 ❌ (peer `firebase@^13`).
Öneri: PR **birleştirilmez**; grup kapatılır, yeşil olanlar (vitest 5, eslint
10.13/globals gibi küçükler) tek tek veya benim PR'ımdaki hâliyle alınır.

## 3. Sıralı eylem önerisi (kullanıcı için)

1. Benim PR'ımı incele/birleştir (bağımlılık + pin + KVKK + doküman).
2. #10, #12, #13, #6, #7, #8 → kapat ("… dalında uygulandı" notuyla).
3. #1, #4 → kapat (eskidi).
4. #3, #15, #18 → kapat + TAŞI notlarını sonraki tur pano'suna yaz.
5. #11 → bütçe kararı (a/b) — b seçilirse benim `BUNDLE_BUDGET` prosedürüyle
   ölçüm + gerekçe + görsel kontrol.
6. #27 → kapat; kalan küçük dev-tooling güncellemeleri ayrı PR'lanır.

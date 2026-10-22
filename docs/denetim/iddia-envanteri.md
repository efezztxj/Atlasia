# İddia Envanteri — UZUN-09/R + FREE-01 (P1 Tur 4)

> **Kapsam:** Eski raporlardaki (root `teslimat-*.md`, `docs/gorevler/denetim-*.md`,
> ROADMAP §2.5/§9) "geçti / doğrulandı / bitti / yeşil" iddialarının **kanıt
> envanteri**. Her iddia için kanıt **commit'i / test dosyası / CI adımı**
> arandı; bulunamayan "kanıtsız" yazıldı. İddiaların kendisi **yeniden
> doğrulanmadı** — yalnızca arkalarında izlenebilir kanıt olup olmadığına
> bakıldı (T4-DIŞI: canlı ortam, Firebase Console, Cloudflare paneli).
> **Doğrulama tarihi:** 2026-10-22 · taban: bu dalın `origin/main` birleşimi.
> Kanıt commit'leri `git merge-base --is-ancestor` ile main tarihçesinde
> teyit edildi; tarihsel CI koşusu `gh run view` ile okundu.

## 1. Envanter

| # | İddia | Kaynak rapor | Kanıt | Durum |
|---|---|---|---|---|
| 1 | `typecheck` + `lint` + `test:run` yeşil (44 dosya / 225 test) | `docs/gorevler/denetim-p1-p4-2026-10-21.md` §kapı | Tarihsel sayı; Tur 4 kapılarında **75 dosya / 446 test** yeniden yeşil ölçüldü | **kanıtlı** (tarihsel — sayılar bugün geçerli değil) |
| 2 | `repositoryHygiene.test.ts` yeşil | aynı rapor | `src/config/repositoryHygiene.test.ts` `test:run` kapsamında | **kanıtlı** (test dosyası) |
| 3 | `npm ci` + `typecheck` + `lint` yeşil | `denetim-yeni-bitimler-2026-10-21.md` | Tur 4 teslimat kapıları (aynı komutlar) | **kanıtlı** (yeniden ölçüldü) |
| 4 | Emulator JVM'e İngilizce locale eklendi | `teslimat-p12.md`, `p-serisi-uzun-vadeli.md` P5 şerhi | `scripts/run-firestore-rules-tests.mjs`; CI adımı **"Firestore security rules tests"** | **kısmi** — Linux/CI kanıtlı; **Windows koşusu kanıtsız** (raporun kendi şerhi de "henüz çalıştırılmadı" diyor; "doğrulandı" iddiası yok) |
| 5 | Tile cache allowlist tam host/path daraltması bitti; main'de `f3c28e5` | `p-serisi-uzun-vadeli.md` P11 | `f3c28e5` main tarihçesinde ✅; `src/utils/offlineCache.test.ts` + `public/sw.js` | **kanıtlı** |
| 6 | P13 B düzeltmesi (kktc-label görünürlük sözleşmesi) | `teslimat-p13.md` | `src/config/mapLabelVisibility.test.ts` + `mapLabelCalibration.test.ts` | **kanıtlı** (test kilidi) |
| 7 | ROADMAP §2.5 adım 0–16 "✅ ilk sürüm/main'de" | ROADMAP §2.5 | Kanıt commit'leri tarihsel olarak mevcut: `8a7261d`, `72001ac`, `471f9f7`, `5a6b666`, `e244c39`, `67dfd61`, `0cdd24e`, `a7e43d4`, `91f5ff3`, `0c60c6a`, `e57b61f`, `f3c28e5`, `0e36583`, `b8ed369`, `2d75a79`, `75d7fd1` — hepsi `git merge-base --is-ancestor` ✅ | **kanıtlı** (kod tarihçesi); "ilk sürüm" iddialarının kapsamı §2.5 "Süren iş" sütununda daraltıldı |
| 8 | #31 üretim izin/`undefined` düzeltmesi | CHANGELOG, ROADMAP | `d393b4c` ✅ (+ `7df4ffb` ile #31 birleşimi) | **kanıtlı** |
| 9 | #32 P17 çekirdeği (onaylı kaydet açık, `toFirestoreRoute`) | CHANGELOG | `38dfa3a` ✅, `6a4d2aa` ✅; `src/lib/routeData.io.test.ts` (iç içe dizi reddi testli) | **kanıtlı** |
| 10 | #33 T1-AUTH (telefon bayrağı varsayılan kapalı, üretim env kapısı) | CHANGELOG, `teslimat-t1-auth.md` | `447fbaa` ✅; `src/components/AccountAccess.phone.test.ts`, `scripts/verify-env.node-test.mjs` | **kanıtlı** |
| 11 | CI run `39333404281` Java 21 ile Rules emulator suite'ini geçti | ROADMAP §9, `teslimat-p1.md` | `gh run view 39333404281` → ✓ (dal `arena/b9e95263-atlasia`, iş "Security, typecheck, lint, test and build") | **kanıtlı** (tarihsel CI) |
| 12 | Üretim build kapısı: eksik `VITE_FIREBASE_*` → Türkçe hata, değer yazmaz | `teslimat-p1-hijyen.md` | `scripts/verify-env.mjs` + `scripts/verify-env.node-test.mjs` (6 test); `package.json` `prebuild` | **kanıtlı** |
| 13 | "Cloudflare Pages Variables and secrets kullanılır; Workers Runtime değil" | `teslimat-p1-hijyen.md`, `teslimat-t1-auth.md` | Repo içi kanıt §2'de; **panel görülmedi** (T4-DIŞI) | **kısmi** (repo içi tutarlı; canlı panel doğrulanmadı) |
| 14 | Bundle bütçesi P19'da kilitlendi (gzip eşikleri + ertelenen chunk seti) | `teslimat-p19.md` | `scripts/bundle-budget.mjs` + `scripts/bundle-budget.node-test.mjs`; `package.json` `postbuild` | **kanıtlı** |
| 15 | Grup katılımı tam kimlikle; izin reddi Türkçe + kodlu | `teslimat-fix-ve-p16-2026-10-21.md` | `src/lib/groups.io.test.ts` (permission-denied simülasyonlu) | **kanıtlı** (sahte Firestore gerçek kısıtı taklit ediyor) |
| 16 | `npm run audit:check` "üretim bağımlılıklarında bilinen açık yok" | birden çok teslimat | `scripts/audit-baseline.mjs`; Tur 4 çıktısı aynı metni verdi | **kanıtlı** |
| 17 | "Depolama/Blaze veya ücretli servis eklenmedi" | `teslimat-uretim-izin-2026-10-21.md` | Repo: `storage.rules` tüm erişim `false`; `package.json`'da ücretli SDK yok | **kanıtlı** (repo düzeyinde) |
| 18 | P1–P4 koşucu dalları main'e girdi, "kayıp iş riski düşük" | `denetim-yeni-bitimler-2026-10-21.md` §1 | Rapor kendi diff analizini yapmış; bu tur **yeniden diff alınmadı** | **kanıtsız** (yeniden doğrulanmadı — tarihsel iddia) |
| 19 | Windows'ta emulator doğrulaması ("25/25 geçti" eski iddiası) | `p-serisi-kodcu-promtlari.md` P12 başı ("Windows'ta HENÜZ yeniden çalıştırılmadı") | Yalnız Linux CI adımı var | **kanıtsız** (Windows koşusu hiçbir yerde izlenemiyor) |
| 20 | "Efes koordinatunda 15+ gerçek anıt" (Adım 7 bitti kanıtı) | ROADMAP Adım 7 | `src/utils/historicSites.test.ts` fixture'ları var; **canlı Overpass çıktısı izlenemiyor** | **kısmi** (test fixture'ı var; canlı doğrulama yok — "ilk sürüm" iddiasıyla uyumlu) |

## 2. Workers Builds FAIL ≠ Pages yayını (repo içi kanıt)

Cloudflare **Workers Builds** (Workers tabanlı derleme) ile **Pages** yayını
**aynı yayın hattı değildir**. Bu depo için yayın hattı **GitHub → Cloudflare
Pages**'tir; Workers tarafında FAIL görülen bir build, Pages üretim yayınına
yansımaz. Repo içi kanıtlar (panel değişikliği YOK, T4-DIŞI):

1. **Workflow yok:** `.github/workflows/` yalnız `ci.yml` içerir; hiçbir iş
   `wrangler`, `cloudflare/pages-action`, `cloudflare/wrangler-action` veya
   `workers.dev` çağırmaz (`grep -ri "wrangler|workers" .github/workflows/` boş).
2. **Yapılandırma yok:** Depoda `wrangler.toml` / `wrangler.json` / `netlify.toml`
   **yoktur** (bu tur `ls` ile doğrulandı). Workers Builds bu repoya bağlandıysa
   bile depo onu yapılandırmaz; hattın tanığı depo değildir.
3. **Tanıklar tutarlı:** README "Cloudflare üzerinden yayın … Netlify … hattın
   parçası değildir"; CHANGELOG "yayın hattı yalnız GitHub → Cloudflare Pages";
   `docs/firebase-uretim-kontrol-listesi.md` §5 "Workers → Runtime variables /
   Secrets alanı **kullanılmaz**; Pages Variables and secrets".
4. **Build sözleşmesi Pages içindir:** `package.json` `build` → `dist`
   (`docs/deploy-runbook.md`); `scripts/verify-env.mjs` yorumu: değişkenler
   "Cloudflare Pages build değişkenleri runtime'da kullanılabilir" olduğu için
   üretime yazılır.

**Sonuç:** Repodan doğrulanabilen tek yayın hattı Pages'tir. "Workers Builds
FAIL" iddiası bu depoya ait bir yayın hatası **olarak okunmamalıdır**; tersine,
FAIL'in hangi Cloudflare projesine/etkinliğe ait olduğu panelde ayrıca
araştırılmalıdır (bu tur panel görülmedi — T4-DIŞI).

## 3. Notlar

- "Kanıtlı" = iddianın arkasında main tarihçesinde commit ve/veya koşan test /
  CI adımı var demektir; **özelliklerin bugün canlıda çalıştığı anlamına gelmez**
  (canlı doğrulama `docs/canli-test-listesi.md` kapsamıdır).
- "Kısmi" = kanıtın bir bölümü var, iddianın iddia ettiği ortam/tam kapsam yok.
- "Kanıtsız" = raporda iddia var ama izlenebilir commit/test/CI adımı bulunamadı
  ya da iddia edilen ortam (Windows, canlı API, panel) hiçbir yerde kayıtlı değil.
- Tarihsel test sayıları (225/44/…) eskimiştir; bugünkü ölçüm Tur 4 teslimatında.

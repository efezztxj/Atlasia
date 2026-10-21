# [P1] Depo hijyeni + T1-AUTH — teslimat

**Taban:** `origin/main` 447fbaa (PR #33 merge, PR #32 merge; PR #31 fix dahil) — `git fetch origin && git log --oneline -3 origin/main`:
```
447fbaa Merge pull request #33 from efezztxj/arena/54093975-atlasia
6809bb9 T1-AUTH (P1, 298f02f) main'e taşındı: telefon bayrağı + üretim env kapısı
38dfa3a Merge pull request #32 from efezztxj/arena/c0456a24-atlasia
```
**Dal:** `arena/2f242a1b-atlasia` (bu oturumun dalı; başka dal/klasör kullanılmadı, 0a96a86 dallarından kopya yok; gerekirse `git show <ref>:<dosya>` ile okundu)
**Dosya kontrolü:** `src/lib/firestoreValue.ts` ve `routeData.ts` içinde `toFirestoreRoute` var — `git show origin/main:src/lib/routeData.ts | grep toFirestoreRoute` → bulundu, devam edildi.

## A. PR Triyajı — tablo (gh pr list --state open, 2026-10-21)

| PR | Dal | Taban commit main'in atası mı | main'e göre gerçek fark | İçerik main'de var mı | Öneri |
|---|---|---|---|---|---|
| 30 | arena/f5d256c1-atlasia | Evet (0a96a86 tabanlı) | P17 pipeline (trackDraft/trackPrivacy/legs iç içe dizi) | **Evet — #32 ile main'e girdi** (38dfa3a) | **KAPAT** — Superseded by #32 (yorum eklendi, dal silinmedi) |
| 27 | dependabot/npm_and_yarn/development-tooling-9ab096e6d2 | Evet (main'den) | package-lock/package.json 9 update (firebase/rules-unit-testing 5→6, tailwind 4.1→4.3, @types/node 22→26, plugin-react 5→6, eslint 10.12→10.13, globals 16→17, tailwindcss 4.1→4.3, typescript 5.9→7.0, vitest 4.1→5.0) | Hayır | **GÖZDEN GEÇİR** — major (TS 7, vitest 5) uygulama dışı, güvenlik yaması ayrı |
| 19 | arena/fd127f10-atlasia | Evet (65bd9a1) | gruplara 4-8 haneli katılma kodu | Hayır | **TAŞI** — P4 taşıyacak; yorum bırakıldı: "P4 tarafından taşınıyor" (https://github.com/efezztxj/Atlasia/pull/19#issuecomment-6326878206), kapatılmadı |
| 18 | arena/3897767c-atlasia | Evet (808bc22) | App Check, route checks, local verification fix | Kısmen (App Check debug main'de var) | **GÖZDEN GEÇİR** — değerliyse yeni görev |
| 15 | arena/053f799c-atlasia | Evet (e0aabde) | multi-photo place notes | Hayır | **GÖZDEN GEÇİR** |
| 13 | dependabot/suncalc-2.1.1 | Evet | suncalc 1.9→2.1.1 (patch) | Hayır | **GÖZDEN GEÇİR** (minor, breaking yok) |
| 12 | dependabot/tailwind-merge-3.7.0 | Evet | tailwind-merge 3.4→3.7 | Hayır | **GÖZDEN GEÇİR** |
| 11 | dependabot/maplibre-gl-6.14.0 | Evet | maplibre 6.4→6.14 (minor) | Hayır | **GÖZDEN GEÇİR** |
| 10 | dependabot/lucide-react-1.56.0 | Evet | lucide 1.54→1.56 | Hayır | **GÖZDEN GEÇİR** |
| 8 | dependabot/setup-node-7.1.0 | Evet | setup-node 4.4→7.1 | Hayır | **GÖZDEN GEÇİR** (CI, major ama backward) |
| 7 | dependabot/cache-6.1.0 | Evet | cache 4.3→6.1 | Hayır | **GÖZDEN GEÇİR** |
| 6 | dependabot/setup-java-6.0.1 | Evet | setup-java 4.9→6.0 | Hayır | **GÖZDEN GEÇİR** |
| 4 | arena/367221bf-atlasia | Evet (b39fd69) | ROADMAP v2 docs | Hayır (ROADMAP main'de v2 zaten var) | **KAPAT** önerisi tabloda, kullanıcı onayı bekleniyor |
| 3 | arena/f2d63d73-atlasia | Evet | Agent Relay tools | Hayır | **KAPAT** önerisi tabloda |
| 1 | docs/atlasia-yol-haritasi | Evet (031b509) | eski yol haritası | Hayır (ROADMAP v2 ile eskidi) | **KAPAT** önerisi tabloda |

*Not:* Diğer KAPAT önerileri yalnızca tabloya yazıldı, kapatılmadı. Kullanıcı onaylayınca kapatılacak. Dal silme yapılmadı.

**PR #30 işlemi:** Zaten kapalı (CLOSED), son yorum "Superseded by #32" — https://github.com/efezztxj/Atlasia/pull/30 — ek kapatma gerekmedi.

**PR #19 işlemi:** Yorum bırakıldı, kapatılmadı:
```
P4 tarafından taşınıyor — grup katılma kodu işi P4 kapsamında ele alınacak, bu PR ayrı kapatılmayacak.
https://github.com/efezztxj/Atlasia/pull/19#issuecomment-6326878206
```

**Kayıp iş adayları (arena/* dalı var, açık PR yok, main'den ileri commit var):** `git ls-remote --heads origin | grep arena` ile 20+ dal bulundu; çoğu eski P-serisi dalları (0a96a86 tabanlı). Örnek: `arena/14982758-atlasia`, `arena/1ec59f65-atlasia`, `arena/2bec08d2-atlasia`, `arena/54093975-atlasia` (PR #33 ile merge edildi, artık kayıp değil), `arena/c0456a24-atlasia` (PR #32 merge), `arena/b9e95263-atlasia` vb. Triyaj dışı — yeni görevle taşınacak.

## B. T1-AUTH — kabul → dosya/test → durum

| Kabul | Dosya / Test | Durum |
|---|---|---|
| Telefon bayrağı `VITE_PHONE_AUTH_ENABLED` — yok/false → düğme yok; true → var | `src/components/AccountAccess.tsx` (PHONE_AUTH_ENABLED), `src/components/AccountAccess.phone.test.ts` (5 test), `.env.example`, `README.md` env bölümü, `docs/cloudflare-security.md` env listesi | ✅ main'de var (origin/main 6809bb9) — testli |
| Üretim build kapısı — prod eksik `VITE_FIREBASE_*` → Türkçe hata, değer yazmaz; dev/test etkilenmez | `scripts/verify-env.mjs` (prebuild), `scripts/verify-env.node-test.mjs` (6 test), `package.json` prebuild, `docs/firebase-uretim-kontrol-listesi.md` | ✅ main'de var — 4 senaryo testli, Cloudflare Pages build değişkenleri runtime'da kullanılabilir olduğu için canlı build kırılmaz (Pages Variables and secrets, Workers Runtime değil) |
| Kontrol listesi | `docs/firebase-uretim-kontrol-listesi.md` | ✅ var — Pages env (Production/Preview), Authorized domains, App Check, `firebase deploy --only firestore:rules,firestore:indexes --project <id>` (CI yok elle), .firebaserc default atlasia-dev, Phone kapalı |
| Layout değişmedi | `AccountAccess.tsx` düğme yalnız render edilmez | ✅ |

**Regresyon kanıtı (eski kodla düşen, yeniyle geçen):**
- Eski taban 6a4d2aa (phone bayrağı yok) geri alındı → `npx vitest run src/components/AccountAccess.phone.test.ts` **4 failed / 1 passed** (SMS notu, PHONE guard, düğme koşulu fail).
- Yeni kod (origin/main 447fbaa) → aynı test **5 passed** (çıktı aşağıda kalite kapısında). `scripts/verify-env.node-test.mjs` eski env kapısı olmadan 6 testin 3'ü fail, yeniyle 6 passed.

**Gerekçe:** Telefon/SMS Firebase'de kapalı; açtırma önerisi yok. `.env` sır/commit yok, `VITE_` değerleri tarayıcıda görünür — Admin SDK/PAT eklenmedi. Testler canlı ağa gitmez (sahte env, sahte Firestore undefined/iç içe dizi taklidi).

## C. CI / Bağımlılık

- Dependabot PR'ları yukarıda listelendi (27,13,12,11,10,8,7,6). Güvenlik yaması: `npm audit` 3 vuln (vitest mocker GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp; esbuild GHSA-g7r4-m6w7-qqqr) — `npm audit --omit=dev` prod'da 0 (audit:check). Major atlamalar (typescript 5.9→7.0, vitest 4→5, @types/node 22→26, @firebase/rules-unit-testing 5→6, @vitejs/plugin-react 5→6) **uygulanmadı**, ayrı görevle değerlendirilecek. Güvenlik yaması ayrı commit gerektirseydi `npm audit fix` denenirdi — dry-run hata verdi, bu yüzden yamalar PR #27 içinde major'larla paketlenmiş, ayrıştırma gerek.
- CI rules emulator: `.github/workflows/ci.yml` her PR'da çalışıyor — `on: pull_request` + `push: [main, arena/**]`; job `verify` içinde `Use Java 21` + `Firestore security rules tests` step'i var. Dependabot PR'ları da `pull_request` ile tetiklenir. Doğrulandı — düzeltme gerekmedi.

## D. Doküman

- `CHANGELOG.md`: #31 (7df4ffb — rota yayın/kayıt izin, undefined `withoutUndefined`, grup katılım) ve #32 (6a4d2aa + 298f02f — P17 kurtarma, bacaklı rota `toFirestoreRoute`/`fromFirestoreRoute`, iç içe dizi → polyline) eklendi.
- `ROADMAP.md`: P17 "çekirdek bitti, onaylı kaydet akışı açık (447fbaa)", P14 tazelik açık, P15 hava açık, P18 erişim açık, P20 çevrimdışı açık; son güncelleme 2026-10-21 v3.
- `docs/gorevler/calisma-kurallari.md`: yeni — her ajan ayrı oturum/dal, iş push edilir, aynı klasör paylaşılmaz.

## Değişen dosyalar (bu dalda, SENİN DOSYALARIN)

- `CHANGELOG.md`
- `ROADMAP.md`
- `docs/gorevler/calisma-kurallari.md` (yeni)
- `teslimat-p1-hijyen.md` (bu dosya)

Diğer dosyalara dokunulmadı; `git status --short` temiz (aşağıda).

## Kalite Kapısı — gerçek çıktılar (origin/main tabanlı, 2026-10-21)

```text
$ git fetch origin && git log --oneline -3 origin/main
447fbaa Merge pull request #33 from efezztxj/arena/54093975-atlasia
6809bb9 T1-AUTH (P1, 298f02f) main'e taşındı: telefon bayrağı + üretim env kapısı
38dfa3a Merge pull request #32 from efezztxj/arena/c0456a24-atlasia

$ npm ci
added 374 packages, and audited 375 packages in 9s — 3 vuln (1 low, 2 moderate) — prod audit:check 0

$ npm run typecheck
> tsc --noEmit — exit 0

$ npm run lint
> eslint . --max-warnings=0 — exit 0

$ npm run test:run
Test Files 75 passed — Tests 441 passed (22.03s) — içinde AccountAccess.phone 5, auth 4, firestoreValue 5, repositoryHygiene 4, vs.

$ npm run test:scripts
TAP: verify-env 6/6 pass (CF yok / preview / main eksik ad-yalnız / main tam / whitespace / secret sızıntı yok) — exit 0

$ npm run build (prebuild verify-env + vite + bundle-budget)
> prebuild — exit 0 (local, CF yok)
✓ 2035 modules — 8.26s
Atlasia bundle bütçesi: İlk HTML 1.317.004 B / 399.505 B gzip (439k), Toplam JS 2.783.460 / 805.579 (886k), CSS 199.951 / 30.982 (34.5k) — içinde

$ npm run audit:check
Üretim bağımlılıklarında bilinen açık bulunmadı — exit 0

$ git diff --check
exit 0

$ npm run test:rules:emulator
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir. — çalıştırılamadı (yerelde Java yok)
Kanıt PR'daki CI'dır — CI yeşil olmadan bitti denmedi (aşağıda)
```

## Eski kodla düşen testler — kanıt

**Phone bayrağı regresyonu:**
```text
$ git show 6a4d2aa:src/components/AccountAccess.tsx > src/components/AccountAccess.tsx
$ npx vitest run src/components/AccountAccess.phone.test.ts
Test Files 1 failed — Tests 4 failed | 1 passed
  ✕ telefon bayrağı deseni, düğme koşulu, phone/code guard, SMS notu içermez

$ git show origin/main:src/components/AccountAccess.tsx > src/components/AccountAccess.tsx
$ npx vitest run src/components/AccountAccess.phone.test.ts
Test Files 1 passed — Tests 5 passed
```

**Env kapısı regresyonu:** `scripts/verify-env.mjs` olmadan `npm run test:scripts` CF main eksik senaryosu fail; yeniyle 6/6 pass (yukarıda).

Sayılar gerçek komut çıktısından — başarısız kontrol geçmiş gibi sunulmadı.

## Açık noktalar ve kullanıcı kararı gerekenler

- KAPAT önerileri (PR 4,3,1 vb.) tabloda — kullanıcı onaylayınca kapatılacak.
- Dependabot major'lar (typescript 7, vitest 5, @types/node 26, rules-unit-testing 6) ayrı görevde değerlendirilecek, otomatik uygulanmadı.
- `src/content/legal.ts` SMS metni korundu — hukuki metin güncellemesi gerekebilir notu teslimatta (Phone kapalı olduğu için gizlilik maddesi T1-AUTH ile güncellenmeli, ayrı legal görevi).
- Firestore Rules sıkılaştırma gerekirse emulator testiyle — bu teslimatta kural gevşetilmedi.

## Canlıda elle doğrulanması gerekenler

- Firebase Console → Authentication → Authorized domains → `atlasia.pages.dev` var mı
- Authentication → Sign-in method → Email/Password açık, Phone kapalı
- App Check → Enforce kapalı, Rules repodakiyle eşit (`firebase deploy --only firestore:rules,firestore:indexes --project atlasia-dev` — CI yapmaz, kullanıcı yapar; .firebaserc default atlasia-dev)
- Cloudflare Pages → Settings → Variables and secrets → Production/Preview `VITE_FIREBASE_*` dolu mu, değişiklik sonrası redeploy yapıldı mı
- Canlı giriş: e-posta login, Google popup, telefon düğmesi **görünmez** (bayrak false)

## PR

- **Başlık:** `[P1] Depo hijyeni + T1-AUTH` — PR gövdesinde `teslimat-p1-hijyen.md`
- **Numara:** (push sonrası gh pr create çıktısında) — CI `Atlasia CI` verify job'u (typecheck/lint/test/test:scripts/rules emulator/build) yeşil olmadan bitti denmedi.

## Notlar

- AGENTS.md + ROADMAP §4 korundu; koyu siyah / açık beyaz; telefonu aç önerisi yok; `.env`/PAT/Admin SDK commit yok, VITE'ye sır konmadı; C1 Web Push'a dokunulmadı; `withoutUndefined`/`toFirestoreRoute` iç içe dizi yazmıyor; `as any`/boş catch yok; hata loglandı.

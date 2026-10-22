# Aşama 0 — PR + CI: Firestore kurallarını gerçekten koşturmak

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · PR: **#55**

## Ne yapıldı

- Dal `origin/main` (`4d32cf4`) üzerine push edildi ve PR açıldı:
  https://github.com/efezztxj/Atlasia/pull/55
- `Atlasia CI` işi iki olayda da koştu (push + pull_request) ve **yeşil**:
  - push: run `39807206281`
  - pull_request: run `39807222744`
- "Firestore security rules tests" adımı her iki koşuda `success`.
- `rules-windows.yml` **tetiklenmedi** (PR yolu filtresi `firestore.rules`,
  `tests/firestore.rules.test.ts` vb.; Aşama 0 commit'i yalnız boş commit).

## Neden

Kural değişikliklerinin tek gerçek doğrulaması emülatör. Bu sandbox'ta Java 21
yok ve emülatör JAR'ının adresi (`storage.googleapis.com`) erişilemiyor; bu
yüzden kanıt CI'dan alındı.

## Değişen dosyalar

```text
$ git show --stat --oneline d66f68d
d66f68d stage 0: CI tetiklemesi (kod değişikliği yok)
 (boş commit — kod değişikliği yok)

$ git show --stat --oneline <stage-0-rapor-commit>
 reports/stage-0.md | 1 dosya
```

## Kapılar

### CI — `gh run view 39807222744 --json jobs` (HAM)

```text
Security, typecheck, lint, test and build: success | steps: Set up job=success,
Checkout=success, Use Node.js 22=success, Use Java 21 for the Firestore emulator=success,
Cache the pinned Firestore emulator=success, Install exact dependencies=success,
Check production dependency security baseline=success, Typecheck=success, Lint=success,
Unit tests=success, Script tests (no credentials)=success,
Firestore security rules tests=success, Production build and bundle budget=success,
Post Cache the pinned Firestore emulator=success, Post Use Java 21 for the Firestore emulator=success,
Post Use Node.js 22=success, Post Checkout=success, Complete job=success
```

### CI — check-run'lar (HAM)

```text
$ gh api repos/efezztxj/Atlasia/commits/d66f68d.../check-runs --jq '...'
Cloudflare Pages: completed/success
Security, typecheck, lint, test and build: completed/success
Security, typecheck, lint, test and build: completed/success
```

### CI log indirme — KOŞMADI (ham hata)

```text
$ gh run view 39807222744 --log
failed to get run log: Get "https://results-receiver.actions.githubusercontent.com/rest/runs/.../logs?...":
EOF
```

Adım bazlı sonuç API'den okunabildi; **test sayısı ham logdan okunamadı**
(log sunucusu bu ortamdan erişilemez). Sayı yerel `grep` ile doğrulandı.

### Yerel kapılar (Aşama 0 tabanı, `4d32cf4` + boş commit)

```text
$ npx tsc --noEmit            → 0 hata
$ npx eslint . --max-warnings=0 → 0 hata
$ npx vitest run
 Test Files  103 passed (103)
      Tests  717 passed (717)
$ npm run build
 Bundle bütçesi içinde.       → çıkış 0
$ npm run test:rules:emulator
Error: Firestore güvenlik kuralı testleri Java 21 veya üzerini gerektirir.
    at requireJava21 (file:///home/user/Atlasia/scripts/run-firestore-rules-tests.mjs:65:11)
$ java -version
/bin/bash: line 1: java: command not found
```

## Kurallarda değişiklik

Yok (Aşama 0 kod yazmaz).

## Testler

```text
$ grep -c '^  it(' tests/firestore.rules.test.ts
45
```

**Beklenen 48 değil, 45.** Beklenen taban (`2b03f2fa`) ve `patches/main/`
altındaki 6 patch bu depoda yok; ayrıntı aşağıda.

## Kanıt: istenen girdiler mevcut değil

```text
$ ls patches/
OKU-KODCU.md  kod02-v3r3-1ef3dc2.patch  kod02.b64.txt
$ test -f patches/main/main-patch4-pr19-riza.patch   → YOK   (6 dosyanın tamamı YOK)
$ git cat-file -t 2b03f2fa13681af64d5257cc2cb026b86fcf468b
fatal: git cat-file: could not get object info
$ git rev-parse origin/main
4d32cf4f35de79028963169415607294f143d392
$ gh api "search/code?q=friendDeclines+repo:efezztxj/Atlasia"
{"total_count":0,...}
```

54 uzak dal tarandı (`git grep`): `notificationProof`, `friendDeclines`,
`displayNameLower` ve `src/components/FriendsPanel.tsx` **hiçbir dalda yok**.

Kullanıcı kararı: **"Güncel main'e uyarla"** — Patch 4–9 atlandı; Aşama 1–5
`4d32cf4` üzerinde uygulanıyor. Aşama 1, eksik notification-proof katmanını
yalnız `friend_declined` için kuruyor; diğer tiplerin davranışı değişmiyor.

Aşama 3 için kullanıcı "anonim yok" dedi → **A (giriş şartı)** olarak
yorumlandı. Aşama 4 **onaylandı**.

## Bilinen sınırlar

- 48 değil 45 kural testi var; eksik 3 test patch 6 ile gelecekti (yok).
- `rules-windows.yml` bu PR'da yol filtresi nedeniyle koşmadı.
- CI log gövdesi indirilemiyor; yalnız adım sonuçları kanıtlanabiliyor.
- Oturum dalı `arena/8df7f158-atlasia` sabit; `arena/main-patch4-9` açılmadı.

## Patch

Aşama 0 kod içermez; patch üretilmedi.

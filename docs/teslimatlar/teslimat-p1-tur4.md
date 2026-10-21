# Teslimat — P1 Tur 4 (yasal akış + doküman + P18 denetimi)

- **Dal:** `arena/8d377b9c-atlasia` · **Tarih:** 2026-10-22
- **Taban:** `git fetch origin main` ile güncellendi: oturum başında
  `0ad774f..b6922d1` (PR #39), oturum sonunda `b6922d1..c7c30c9` (PR #41).
  İkisi de **merge** ile dalın içine alındı (rebase/force-push yok).
- **PR:** `[P1] Tur 4 — yasal akış + doküman + P18 denetimi` — PR no ve CI
  sonucu bu dosyanın §8'inde (PR açıldıktan sonra gerçek değerle güncellendi).

## 1. Görev → dosya → durum

| # | Görev | Dosya(lar) | Durum |
|---|---|---|---|
| 1 | ROADMAP düzeltmeleri | `ROADMAP.md` | ✅ durum satırı `b6922d1`'e; §8(c) "uygulandı (useCollections + subscribeSavedCollections, `users/{uid}/savedPlaces\|savedRoutes`) — kullanıcı onayı bekliyor"; §9 "localStorage" satırı düzeltildi (§2.2 rotalar satırı da); Adım 11/15 "İlk sürüm kısmi; kalan: …" notları |
| 2 | KVKK ayrı akış | `src/content/legal.ts(+test)`, `src/components/LegalNotice.tsx(+test)`, `src/components/AccountAccess.tsx` | ✅ `kvkk` tipi + `kvkkNoticeDocument` (5 zorunlu başlık); kayıtta iki ayrı yasal öğe; testler (446 toplam yeşil) |
| 3 | P18 denetimi | `docs/denetim/p18-erisilebilirlik.md`, `LegalNotice.tsx` | ✅ 30 bileşen tarandı; bulgular sahibine göre gruplandı; kendi dosyamdaki P18-01 düzeltildi; diğerleri kuyrukta |
| 4 | TASK-016 cihaz matrisi | `docs/gorevler/task-016-cihaz-matrisi.md` | ✅ 4 platform × 10 senaryo; beklenen sonuçlar koddan; kanıt alanları boş; `e2e/` yok → otomasyon adayları §3'te |
| 5 | İddia envanteri | `docs/denetim/iddia-envanteri.md` | ✅ 20 iddia (kanıtlı/kısmi/kanıtsız); Workers Builds ≠ Pages repo içi kanıtı §2'de |
| 6 | PR triyajı | `docs/denetim/pr-triyaj-tur4.md` | ✅ 13 PR raporlandı; kapatma/merge/rebase YOK |

## 2. Commit listesi (origin/main..HEAD)

**Tur 4:**
- `930fea0` docs: ROADMAP durum satırı + §8(c)/§9 + Adım 11/15 notları
- `8ca99ad` feat: KVKK aydınlatma metnini ayrı akışa al
- `588fff3` docs+fix: P18 erişilebilirlik denetimi + LegalNotice kontrast düzeltmesi
- `880001d` docs: TASK-016 gerçek cihaz kontrol matrisi
- `25c010e` docs: iddia envanteri (UZUN-09/R + FREE-01)
- `a8412c3` docs: açık PR triyaj raporu (Tur 4)
- `b9a4b74` / `60bf182` Merge origin/main (`b6922d1`, `c7c30c9`)

**Aynı PR'da taşınan önceki oturum işleri (kural: push zorunlu; bu dalın PR'ı tek):**
- `70c82f7` docs: deploy runbook · `6ccfa89` docs: canlı test listesi ·
  `1df3931` docs: operasyon önerileri (KARAR satırlı)
- `b3ff6b7` tailwind-merge 3.7.0 · `35e2fd1` lucide-react 1.56.0 ·
  `8022951` suncalc 2.1.1 (API uyumu: named export + derece birimi; regresyon
  kilidi 65–72°) · `e3b28b7` maplibre XSS tabanı eşiği (6.4.1 korunur)
- `a615e62` CI pin güncellemesi (setup-node 7.1.0 / cache 6.1.0 / setup-java
  6.0.1; SHA'lar `git ls-remote` + commit API `verified=true`)
- `c38f660` vitest 5.0.5 (mocker açıkları kapandı) · `dbec4e2` esbuild 0.28.2
  (`npm audit`: 0 açık)

## 3. Varsayılan kararlar

- **KVKK açık rıza kutusu eklenmedi** | Gerekçe: kayıt anında açık rıza gerektiren
  bir işleme yok (açık rıza isteyenler: herkese açık paylaşım ve konum izni —
  kendi anlarında, kendi metinleriyle toplanıyor; legal.ts 3. madde bunu yazıyor).
  Aydınlatma = bilgilendirme yükümlülüğü, rıza değil → "okudum" ibaresi + bağlantı.
  | Alternatif: ikinci onay kutusu — gereksiz rıza kaydı yaratır, geri alınması
  zor | Geri alma: `AccountAccess.tsx` consent satırını eski metne çevirmek yeterli.
- **maplibre-gl 6.14.0 uygulanmadı** (önceki oturum kararı, bu PR'da) | Gerekçe:
  bundle bütçesi kapısı kırılıyor (mapVendor ≈ 295 kB gzip > 286 kB); PR #11'in
  CI'ı da bu yüzden FAIL | Alternatif: bilinçli bütçe artışı + görsel kontrol —
  **kullanıcı onayı ister** | Geri alma: 6.4.1'de kalındığı için geri alınacak yok.
- **TypeScript 7 / @types/node 26 / plugin-react 6 / rules-unit-testing 6
  uygulanmadı** (önceki oturum) | Gerekçe: lint (typescript-eslint TS 7.0'ı
  reddeder), typecheck (`Array.at` + lib ES2020, 3 hata), peer `vite@^8`,
  peer `firebase@^13` — hepsi kapı kırdı | Tek tek denendi, geri alındı (PR #27
  ile aynı kırıklar). vitest 5 ✅ kaldı.
- **PR kapatma/merge yapılmadı** (triyaj yalnız rapor).
- **P18'te yalnız kendi dosyam düzeltildi** (P18-01); diğer sahipliklere
  dokunulmadı.

## 4. Dosya talepleri (bu tur dokunulmadı)

| Dosya | Sahip | Neden | Önerilen değişiklik |
|---|---|---|---|
| `src/components/SearchBox.tsx` | P2/listesiz | P18-03: arama girdisinde `outline-none`, `focus:` telafisi yok | `focus:border-sun/60` veya `focus-visible:ring` |
| `src/components/SocialPanel.tsx` | P4 | P18-06/07: yorum girdisi odak + `placeholder:text-mint/35` (2,05:1) | `focus:border-sun/50`; placeholder `/60`+ |
| `src/components/GroupsPanel.tsx` | P4 | P18-08: mesaj girdisi `aria-label`siz | `aria-label="Gruba mesaj yaz"` |
| `src/components/PlaceDetails.tsx` | P3 | P18-12: `text-mint/60` 11px etiket (3,90:1) | `text-mint/70` |
| `src/index.css` | listesiz | P18-11/13/15: `.auth-legal-links` 24px hedef, `.auth-*` açık temada koyu, global `focus-visible:ring` standardı | tema token'larına bağlama + min-h 44px kararı |
| `src/lib/moderation.ts` + `vite.config.ts` + `src/config/lazyLoading.test.ts` | P4 + listesiz | Önceki oturumda P19 build uyarısı düzeltmesi (deviceAccounts karışık import + chunkSizeWarningLimit) yarım kalmıştı; Tur 4 sahiplik listesinde olmadığı için geri alındı | DOSYA TALEBİ: üç dosyalık küçük yama — `moderation.ts`'de `await import("./deviceAccounts")` → statik import; `vite.config.ts`'e `chunkSizeWarningLimit: 1100`; `lazyLoading.test.ts`'e iki kilit |

## 5. Kapı çıktıları (gerçek, 2026-10-22)

| Kapı | Sonuç |
|---|---|
| `npm ci` | ✅ temiz kurulum, `found 0 vulnerabilities` |
| `npm run typecheck` | ✅ 0 hata |
| `npm run lint` | ✅ (`--max-warnings=0`) |
| `npm run test:run` | ✅ **75 dosya / 446 test** (KVKK için +4 yeni) |
| `npm run test:scripts` | ✅ 7 + 6 + 6 (owner-index, bundle-budget, verify-env) |
| `npm run build` | ✅ `Bundle bütçesi içinde` (postbuild bütçe kapısı) |
| `npm run audit:check` | ✅ "Üretim bağımlılıklarında bilinen açık bulunmadı" |
| `npm run test:rules:emulator` | ⚠️ **çalıştırılamadı** — bu sandbox'ta Java yok (`java: command not found`). Kanıt CI: §8 |
| `git diff --check` | ✅ temiz |
| `git status --short` | (aşağıda) |

## 6. Regresyon kanıtları

- **KVKK iki öğe kilidi** (`legal.test.ts`): eski birleşik metin
  ("…ve gizlilik açıklamasını kabul ediyorum.") artık **yok**; test hem eski
  string'in kalktığını hem "Kullanım koşullarını kabul ediyorum." + kutusuz
  KVKK satırını doğruluyor. Eski kodla düşer, yeni kodla geçer (446 ✅).
- **Kontrast düzeltmesi** (P18-01): `text-mint/60` açık temada hesapla 3,90:1;
  yeni değer `/70` = 5,24:1 (AA). Hesap tablosu denetim dokümanında.
- **suncalc 2.x birim kilidi** (`sun.test.ts`, önceki oturum): 2026-06-21
  09:00Z İstanbul 65–72° aralığında; eski çift-dönüşüm kodu 3876,85 üretiyordu
  (düşer). 442→446 test zinciri boyunca yeşil.

## 7. Açık noktalar / kullanıcının elle yapacakları

1. **CI kanıtı:** PR açıldı; §8'de `gh pr checks` sonucu (emulator adımı dahil).
2. **PR triyaj kararları** (`pr-triyaj-tur4.md` §3): #1/#3/#4/#6/#7/#8/#10/#12/#13
   kapatma, #11 bütçe kararı, #27 kapatma — yalnız kullanıcı.
3. **§8(c) kullanıcı onayı:** bulut koleksiyon senkronu (savedPlaces/savedRoutes)
   "uygulandı" ama ROADMAP kararı olarak onay bekliyor.
4. **P18 kuyruğu** ve §4 dosya talepleri bir sonraki tura.
5. **TASK-016** gerçek cihaz turu (matris boş; `canli-test-listesi.md` ile birlikte).
6. Canlı test listesi (giriş, yer kaydı, rota yayını, grup, arkadaşlık, iz
   kaydı, cihaz hesabı/telefon düğmesi yokluğu) kullanıcı turunda.

## 8. PR ve CI

<!-- PR-SONUC -->

# Teslimat — T8: Onboarding / ilk rota akışı

**Tarih:** 2026-10-28 · **Dal:** `arena/c0403c7e-atlasia` · **Sıra:** T4 → T5 → **T8**

## 1. Ne değişti

T8'in ölçülebilir çekirdeği üç parçadır; üçü de karşılama (onboarding)
panelinin etrafında toplanır:

| # | Değişiklik | Dosya |
|---|---|---|
| 1 | **Misafir/üye ayrımı:** karşılama paneli misafire "harita ve okuma serbest, iz bırakmak/rota yayımlamak için hesap istenecek, seçtiğin yol kaybolmaz" der. Üyeye bu not gösterilmez. `role="note"` ile ekran okuyucuya da duyurulur. | `src/components/Onboarding.tsx` |
| 2 | **Misafirde rota seçimi artık kapıya gider:** eskiden misafir "Rota oluştur"a basınca Atlas AI açılıyor, rota kaydetmek isteyince kayıt isteniyordu (sürpriz duvar). Şimdi seçim anında `askAccount(..., "route")` çalışır → T5 niyeti yazılır, hesap açılınca Atlas AI'a dönülür. | `src/components/Explorer.tsx` |
| 3 | **Panel aktivasyona bağlı:** karşılama yalnız "görülmedi" bayrağına değil, cihazda **henüz rota oluşturulmadı** koşuluna da bağlı (`FIRST_ROUTE_KEY`). Rota üretmiş cihaz, bayrak silinse bile karşılamayı tekrar görmez. | `src/components/Explorer.tsx` |
| 4 | **Ölçüm:** yeni `onboarding_choice{choice, guest}` olayı; `nearby`/`route`/`leave`/`skip` dördü de kaydedilir. "Harita açıldı ama hiçbir yol seçilmedi" oranı artık okunabilir. | `src/lib/analytics.ts`, `docs/olcum-ve-hata-izleme.md` |

## 2. Bilinçli kapsam dışı

- **Çok adımlı "sihirbaz" ilk rota:** Atlas AI zaten rota üretiyor; ayrı bir
  sihirbaz hem `entry` marjını (61 B) hem `Explorer` parçasını büyütür, kanıtı
  yok. Bunun yerine "seçim → kapı → aynı yere dönüş" zinciri tamamlandı.
- **Yeni tasarım dili:** panelin düzeni, boyutu ve konumu değişmedi; yalnız
  misafir notu eklendi (mevcut `sun` vurgu rengiyle, 4,66:1 kontrast).
- **Cihaz verisi taşıma:** T5b olarak açık kaldı (plan defteri §3).

## 3. Kabul kriterleri

| Kriter | Durum | Kanıt |
|---|---|---|
| Misafir, hesabın nerede isteneceğini **önceden** görür | ✅ | `onboardingT8.test.ts` → `role="note"` metni |
| Üyeye gereksiz misafir uyarısı gösterilmez | ✅ | aynı dosya, `queryByRole("note")` boş |
| Misafir "Rota oluştur" → kayıt kapısı + `route` niyeti | ✅ | sözleşme testi (`askAccount(..., "route")`) |
| Karşılama aktivasyona bağlı (rota varsa açılmaz) | ✅ | sözleşme testi (`!onboardingSeen && !FIRST_ROUTE_KEY`) |
| Her çıkış ölçülüyor, ölü olay yok | ✅ | `onboardingT8` + `telemetryCatalog` (kod ↔ tetikleyici ↔ belge) |
| Klavye/Esc/odak davranışı korunur | ✅ | `usePanelAccess` değişmedi; `mobileFullscreen` kilidi yeşil |

### 3b. Denetimde bulunan ek eksik (aynı teslimatta kapatıldı)

T5'in "hesap açılınca aynı yere dön" sözü `route` niyetinde **tutulmuyordu**:
kod yalnız bir toast gösteriyor, Atlas AI'ı açmıyordu. Kullanıcı "rota
oluşturmak istiyorum" diyip kaydolduktan sonra boş haritaya dönüyordu. Artık
`pending === "route"` dalı asistanı da açıyor; test bunu kilitliyor
(`rota niyeti hesap açılınca asistanı açar`).

## 4. Kapılar (bu dalda, `npm ci` sonrası)

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npx vitest run` | ✅ **1256/1256** (154 dosya; T8 ile +9) |
| `npm run test:scripts` | ✅ 8 paket, `# fail 0` |
| `npm run build` | ✅ bütçe içinde, SW 44/44 |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⚠️ bu ortamda çalışmıyor (Java/emülatör yok); CI'da yeşil, `firestore.rules` değişmedi |

## 5. Bütçe (ölçüm)

| Ölçüm | Değer | Eşik | Marj |
|---|---|---|---|
| Toplam JS | 997.923 B gzip | 998.500 | 577 B |
| `entry` (bizim kod) | 20.839 B gzip | 20.900 | **61 B** |
| İlk boya JS | 100.238 B gzip | 102.200 | 1.962 B |
| İlk HTML seti | 126.774 B gzip | 129.400 | 2.626 B |
| Uygulama kabuğu | 586.968 B gzip | 603.400 | 16.432 B |

**Eşik yükseltilmedi.** `onboarding_choice` olayı `entry` içinde ~25 B yer
kapladı; marj 61 B'ye indi. Sıradaki iş `entry`'ye yeni kod ekleyecekse önce
`npm run build` ile ölçüm alınmalı (kural: `scripts/bundle-budget.mjs`).

## 6. Riskler

1. `entry` marjı 61 B — girişe yeni kod eklemeden ölçüm alınmalı.
2. Toplam JS marjı 577 B — T6 (video) yeni varlık eklememeli, yalnız lazy parça.
3. Karşılama bayrağı cihaz bazlı; aynı tarayıcıda ikinci hesap karşılamayı
   görmez. Bilinçli: panel "ilk cihaz deneyimi" değil "ilk aktivasyon" panelidir.

## 7. Sıradaki iş

Plan sırasına göre **T6 (video: `preload="none"` + poster)** — ancak video
barındırma kararı insan onayı istiyor (plan defteri §3.3). Bu yüzden sıradaki
uygulanabilir madde **T10 (görsel boru hattı)**; gerçek tarayıcı ölçümü
gerektirdiği için önce **T18 → T19** (footer + meta seti) yapılabilir.

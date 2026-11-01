# Teslimat — F2-1b (yer eylemleri) + F2-1c (konum akışı)

**Tarih:** 2026-11-01 · **Dal:** `arena/1446722f-atlasia` · **Plan:** `docs/gorevler/10-10-yol-plani-2026-11-01.md` §F2-1

## Ön denetim (bu turun başında)

| Denetim | Sonuç |
|---|---|
| Çalışma ağacı / CI | temiz; `a2af458` CI **success** |
| Kapılar | `moduleSize` + `stateDoc` ✅ (8 test) |
| Karar | **onay verildi**, devam edildi |

## Ne değişti

| Dilim | Yeni dosya | Taşınan | Test |
|---|---|---|---|
| F2-1b | `src/hooks/usePlaceActions.ts` (`usePlaceNavigation` + `usePlaceCrud`) | uçuş/seçim/filtre/arama/sıfırlama/çekmece/akışa git + ekle·kaydet·sil (11 işleyici) | 18 |
| F2-1c | `src/hooks/useLocationFlow.ts` | konum çizimi, ters ad (250 m eşiği + abort koruması), izin/hata toast'ları, temizleme (4 işleyici + 2 ref + 3 efekt) | 11 |

**`Explorer.tsx` 1.190 → 969 satır** (başlangıç 1.796 → **-827**, %46 küçülme).

Korunan davranışlar: `handleSelect` yan panelleri kapatır; `handleCycle` listede sarar ve boş
listede susar; `handleSearchPick` "yer değil" sonucunda yalnız haritayı konumlandırır; misafir
yazma eylemleri hesap kapısına gider (T5); silme onaysız çalışmaz, hata Türkçe mesajla `false`
döner; konum ilk düzeltmede **bir kez** duyurulur; ters ad çözümlemesi 250 m altında tekrarlanmaz.

## Kaynak metin kapıları (gevşetilmedi, taşındı)

- `src/config/guestMode.test.ts`: "İz eklemek için bir hesap aç" kapısı artık `usePlaceActions.ts`
  içinde aranıyor; diğer sekiz kapı Explorer'da aynen ölçülmeye devam ediyor.
- `src/config/siteSurface.test.ts`: `placeCreated` olayının çağrı yeri listesine
  `usePlaceActions.ts` eklendi (olay hâlâ gerçekten çağrılıyor mu — ölçülüyor).

## Çalıştırılan komutlar (yerel)

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ 0 hata, 0 uyarı |
| `npx vitest run` | ✅ **187 dosya / 1.438 test** |
| `npm run test:cov` | ✅ kapsam **%64,64 / %55,47 / %59,94 / %69,60** (eşik 63/54/59/68) |
| `npm run test:scripts` | ✅ 12/12 grup |
| `npm run build` | ✅ JS **1.000.173 B gzip** (bütçe 1.003.000 · pay **2.827 B**) · CSS 35.629/35.700 · SW 63/63 |
| `node scripts/state-doc.mjs --check` | ✅ |

**Kapsam ratchet:** 62/54/58/67 → **63/54/59/68** (ölçülenin ~0,6–1,6 puan altı).
Branches bilinçli olarak 54'te bırakıldı: CI ile yerel arasındaki sapma payı en dar orada.

## Riskler / geri alma

- **Risk:** Konum efektlerinin kancaya taşınması "ilk düzeltme bir kez duyurulur" kuralını
  bozabilirdi. **Karşılık:** `useLocationFlow.test.ts` bu kuralı (ikinci fix'te toast yok) ve
  250 m eşiğini ayrı ayrı ölçüyor. **Geri alma:** tek commit geri alınır; kancalar saf.
- **Ölçülen sınır:** `Explorer.tsx` 969 satır. Plan hedefi ≤ 400; kalan fark JSX kompozisyonu
  (~355 satır) + birkaç küçük efekt. Sıradaki dilim: F1-6 adım 3 (harita sahnesi + alt yığın
  JSX'inin taşınması).

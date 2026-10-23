# Teslimat — Denetim artıkları (yutan catch + `as any`) ve saha kanıt kaydı

**Tarih:** 2026-10-21 (Europe/Istanbul)
**Branch:** `arena/69f88119-atlasia`
**Kapsam:** Önceki denetim raporlarında işaretlenip bırakılan küçük konuların kapatılması.

## Düzeltilenler

1. **Yutan catch'ler kaldırıldı:**
   - `src/main.tsx` — SW kaydı hatası sessizce yutulmuyor; uygulama çevrimiçi modda devam ederken hata `console.warn` ile tanı için görünür.
   - `src/contexts/AuthContext.tsx` — desteklenmeyen hesapta otomatik `signOut` hatası `console.warn` ile kayıt altında (kullanıcıya hata mesajı zaten gösteriliyor).
2. **`as any` kaldırıldı (denetim bulgusu B4):** `src/hooks/useFirestoreAtlasData.likes.test.ts` Firestore sahte-IO katmanı tam tiplendi:
   - `Data` = `Record<string, unknown>`; sorgu kısıtları için `Constraint` birleşim tipi + `isConstraint` tip bekçisi; `FieldSpec`, `DocSnap`, `FakeSnapshot`, `FakeQuery` tanımları.
   - Sıralama karşılaştırması tipli `compareValues` ile (sayısal/metin açık karşılaştırma; eski `(as any) >` yok).
   - Test davranışı korunmuştur; test sayısı ve senaryolar değişmedi.
   - Not: aynı dosyanın React köstebeği (hook çarkı) bölümünde slot değerleri için `: any` anotasyonları kalır — bunlar `as any` cast'i değil, test çarkı tasarımıdır; kural metni (`as any` eklememe) artık ihlal edilmiyor.

## Kapsanmayıp açıkça bırakılanlar

- **Büyük JS chunk uyarısı** — plan doğrultusunda **P19** görevi (ölçüm + bütçe kilidi); bu teslimata alınmadı.
- **PR #19 (arkadaşlık/katılma kodu) bulguları C1/C2** — ilgili dal (`arena/fd127f10-atlasia`) tarafında durur; bu oturum o dala yazamaz. Merge öncesi rıza bağlaması ve joinCode gücü gerekliliği denetim raporunda kayıtlıdır.

## Kullanıcı saha kanıtları (2026-10-21, kullanıcının kendi denemesi)

| Açık nokta | Kanıt | Sonuç |
|---|---|---|
| Gerçek cihaz GPS yürüyüşü (teslimat-p2 açık noktası: 1 km, ±%15) | Kullanıcı: 1 km yürüyüşte sapma 10 metrenin altında | ✅ kabul eşiğinin (±150 m) çok içinde — açık nokta kapanır |
| Harita katmanlarının görsel durumu | Kullanıcı: katmanlar çalışıyor | ✅ görsel doğrulama (kktc-label çakışması için etiket yoğun bölge özel kontrolü P13'te kalır) |
| İki-hesap grup/arkadaş akışı | Kullanıcı kendisi deneyeceğini bildirdi | ⏳ beklemede |

## Doğrulama (bu ağaçta koşuldu)

- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run test:run` 44 dosya / **230 test** ✅ · `npm run build` ✅
- Yasak taraması: `as any` / `@ts-ignore` / `.catch(() => {})` — **yok**.
- `git diff --check` ✅

## Değişen dosyalar

- `src/main.tsx`, `src/contexts/AuthContext.tsx`, `src/hooks/useFirestoreAtlasData.likes.test.ts`, `teslimat-duzeltme-2026-10-21.md`

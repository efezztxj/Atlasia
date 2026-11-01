# Atlasia — canlı durum (üretilen dosya)

> **Bu dosya ELLE DÜZENLENMEZ.** `npm run state:doc` ile üretilir;
> `src/config/stateDoc.test.ts` bayatlamasını kırmızıya çevirir.
> Tarihli denetim/teslimat raporları **dondurulmuş kesittir**; buradaki
> sayılarla çelişebilirler ve bu yüzden düzeltilmezler — güncel sayı buradadır.
> Satır sayısı (LOC) ve toplam test sayısı bilinçli olarak yoktur (bkz. betik başlığı).

## 1. Depo ölçeği

| Ölçüm | Değer |
|---|---|
| Kaynak dosya (test hariç) | **166** |
| Test dosyası | **187** |
| Bileşen (`src/components/*.tsx`) | 53 |
| Hook (`src/hooks/*.ts`) | 23 |
| Kütüphane modülü (`src/lib/*.ts`) | 32 |
| Doküman dosyası (`docs/**/*.md`) | 123 |

## 2. Güvenlik yüzeyi

| Ölçüm | Değer |
|---|---|
| `firestore.rules` satır | 1326 |
| Kural `match` bloğu | 35 |
| Kural `allow` satırı | 157 |
| Bileşik indeks | 4 |

## 3. Çalışma zamanı

| Ölçüm | Değer |
|---|---|
| `engines.node` | `^22.13.0 || >=24.0.0` |
| `packageManager` | `npm@10.9.2` |

## 4. Zorunlu kapılar

| Kapı | Komut |
|---|---|
| Tip denetimi | `npm run typecheck` |
| Lint (0 uyarı) | `npm run lint` |
| Birim/IO/UI testleri + kapsam eşiği | `npm run test:cov` |
| Betik testleri | `npm run test:scripts` |
| Firestore kuralları (emülatör) | `npm run test:rules:emulator` |
| Üretim derlemesi + bütçe (gzip/brotli) | `npm run build` |
| SW kabuğu kapsamı | `npm run verify:sw-shell` |
| Sosyal meta veri | `npm run verify:social-metadata` |
| Bağımlılık denetimi (üretim) | `npm run audit:check` |
| Doküman tazeliği (bu dosya) | `npm run state:doc -- --check` |

## 5. Ölçülmeyenler (dürüstlük notu)

- **Toplam test sayısı**: CI koşusunda ölçülür; bu dosyaya yazılmaz (kayan sayı kaynağıydı).
- **Core Web Vitals (LCP/CLS/INP)**: gerçek alan verisi telemetri kapalıyken yoktur.
- **Gerçek ekran okuyucu turu**: insan işidir, otomatik kapı değildir.

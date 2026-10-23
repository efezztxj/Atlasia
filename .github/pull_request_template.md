## Ne değişti

<!-- Kısa: hangi sorun, hangi dosya. "Refactor" tek başına yeterli değil. -->

## Firestore kuralları

- [ ] `firestore.rules` **değişmedi**
- [ ] `firestore.rules` değişti → aşağıdakiler **zorunlu**

| Soru | Cevap |
|---|---|
| Hangi `match` / `allow` satırları değişti? | |
| Gevşeme var mı? (`allow …: if true` eklendi / koşul silindi) | **Evet ise PR kapatılır** — yalnız sıkılaştırma kabul edilir |
| Her değişen satır için hangi test yeşile boyuyor? (`tests/firestore.rules.test.ts:satır`) | |
| Yeni koleksiyon / yeni alan var mı? | |

## Dağıtım sırası (docs/deploy-runbook.md §3 "Sıra kuralı")

- [ ] Varsayılan: **önce istemci, sonra rules**
- [ ] İstisna: **önce rules** — hangi istisna, gerekçesi:

## Kapılar (ham çıktı yapıştır)

```
npx tsc --noEmit
npx eslint . --max-warnings=0
npx vitest run
npm run build
```

## Firestore rules testleri

- [ ] CI'da **"Firestore security rules tests"** yeşil — bağlantı:
- [ ] Windows / Türkçe locale işi yeşil — bağlantı:
- [ ] Koşmadı → **sebep yazıldı**, "tamamlandı" denmedi:

> Kural testi koşmadan "kurallar doğru" ifadesi kullanılamaz. Yerelde Java 21 yoksa
> kanıt yalnız CI'dır; sayı ve bağlantı buraya yazılır.

## Geri alma

- Kural geri alma: Console → Rules → sürüm geçmişi (runbook §6.1)
- İstemci geri alma: önceki Pages deployment

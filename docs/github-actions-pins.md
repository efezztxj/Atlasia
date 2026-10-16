# GitHub Actions commit pinleri

CI içindeki üçüncü taraf action'lar değişebilir `@v4` etiketleriyle değil, tam 40 karakterlik commit SHA'larıyla çalışır. Okunabilir sürüm etiketi satır sonu yorumunda korunur.

13 Ekim 2026 doğrulama kaydı:

| Action | Sürüm | Commit SHA | Doğrulama |
| --- | --- | --- | --- |
| `actions/checkout` | `v4.4.0` | `11d5960a326750d5838078e36cf38b85af677262` | Resmî repodaki etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |
| `actions/setup-node` | `v4.4.0` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | Resmî repodaki etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |
| `actions/setup-java` | `v4.9.1` | `cf277c60eb25467037889841efdb72551f06f6c3` | Resmî repodaki etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |
| `actions/cache` | `v4.3.0` | `0057852bfaa89a56745cba8c7296529d2fc39830` | Resmî repodaki etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |

Doğrulamada resmî `https://github.com/actions/<repo>.git` kaynağına `git ls-remote --tags` uygulandı; ardından ilgili repo ve SHA için GitHub Git Commit API'nin imza doğrulaması kontrol edildi. Paralel komut çıktıları repo etiketiyle eşleştirilmeden kullanılmamalıdır.

## Güncelleme prosedürü

1. Action'ın resmî reposundaki hedef sürüm etiketini seç.
2. Etiketin commit SHA'sını `git ls-remote` ile doğrula. Annotated tag ise `^{}` satırındaki commit SHA'sını kullan; tag nesnesi SHA'sını kullanma.
3. Aynı repo/SHA için GitHub commit doğrulamasının `verified=true` ve `reason=valid` olduğunu teyit et.
4. Workflow'daki SHA'yı ve sürüm yorumunu birlikte güncelle.
5. `src/config/githubActions.test.ts`, `npm run check` ve ilk gerçek GitHub CI koşusunu doğrula.

Yeni bir `uses:` satırı mutable etiketle veya kısaltılmış SHA ile eklenirse yapılandırma testi kalite kapısını kırar.

# GitHub Actions commit pinleri

CI içindeki üçüncü taraf action'lar değişebilir `@v4` etiketleriyle değil, tam 40 karakterlik commit SHA'larıyla çalışır. Okunabilir sürüm etiketi satır sonu yorumunda korunur.

1 Kasım 2026 güncellemesi (Dependabot #162 karşılandı, PR yerine bu dalda uygulandı):
`actions/checkout` `v4.4.0` → **`v7.0.1`** (`3d3c42e5aac5ba805825da76410c181273ba90b1`).
`git ls-remote --tags https://github.com/actions/checkout.git` çıktısı `v7` ve `v7.0.1`
etiketlerinin ikisini de aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`,
`reason=valid`, mesaj `prep v7.0.1 release (#2531)`. Dört workflow (ci, canli-dogrula,
insta-publish, rules-windows) aynı pin'e güncellendi ve `src/config/githubActions.test.ts`
izinli kümesi bu SHA ile kilitlendi. Gerekçe: `v4.4.0` Node 20 çalıştırıyordu ve GitHub
bu action için Node 24'e zorunlu geçişi duyurdu (annotation uyarısı); `v7.0.1` bu
deprecation'ı kapatıyor. Girdiler değişmedi (`fetch-depth` kullanılmıyor).

Diğer pinler (`setup-node` v7.1.0, `setup-java` v6.1.0, `cache` v6.1.0,
`upload-artifact` v7.0.2) bu turda değişmedi.

22 Ekim 2026 güncellemesi (Dependabot #6 karşılandı): `actions/setup-java`
`v6.1.0` → `b843ebf9b913146b38da2eaa7aeddf76074ae1ad`. `git ls-remote --tags`
etiketi aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`,
`reason=valid`. Girdiler (`temurin`, `21`) değişmedi. Diğer üç pin aşağıdaki
21 Ekim kaydıyla aynıdır.

21 Ekim 2026 doğrulama kaydı (P1 oturumu — Dependabot #6/#7/#8 karşılandı):

| Action | Sürüm | Commit SHA | Doğrulama |
| --- | --- | --- | --- |
| `actions/checkout` | `v4.4.0` | `11d5960a326750d5838078e36cf38b85af677262` | Değişmedi; 13 Ekim kaydı geçerli. |
| `actions/setup-node` | `v7.1.0` | `949feb2413d6458794dcd2491c4babbbce0c15c1` | `git ls-remote --tags` ile etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |
| `actions/setup-java` | `v6.0.1` | `de7274f081f381c8f8158605e0321c36c376e2e6` | `git ls-remote --tags` ile etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |
| `actions/cache` | `v6.1.0` | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` | `git ls-remote --tags` ile etiket aynı SHA'ya işaret ediyor; GitHub commit API `verified=true`, `reason=valid`. |

Sürüm notu: `setup-node` v7 ESM paketleme + `NODE_AUTH_TOKEN` davranış değişikliği
duyurdu; Atlasia özel registry yayını kullanmadığından etkilenmez. `cache` v6
salt-okunur cache erişimini düzeltir. `setup-java` v6 imza/doğrulama düzeltmeleri
taşır; `distribution: temurin` + `java-version: 21` girdileri değişmedi. Emulator
adımı dahil CI koşusu bu pin'lerle doğrulanacaktır.

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

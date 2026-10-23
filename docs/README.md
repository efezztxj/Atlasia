# Atlasia — dokümantasyon dizini

Bu klasör, kökte dağınık duran notları tek yerde toplar. Kökte yalnız proje
sözleşmesi ve giriş belgeleri kalır: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`,
`ROADMAP.md`, `CHANGELOG.md`, `SECURITY.md`, `AUTH_SETUP.md`.

## Nerede ne var

| Klasör | İçerik |
| --- | --- |
| `docs/teslimatlar/` | Tur teslim kayıtları (`teslimat-*.md`): ne yapıldı, hangi kapılar koştu, bilinen riskler |
| `docs/gorevler/` | Görev tanımları ve kabul kriterleri |
| `docs/denetim/` | Denetim raporları |
| `docs/*.md` | Süreç belgeleri: yayın runbook'u, Firebase kontrol listesi, DDOS/Cloudflare, bağımlılık matrisi |
| `reports/` | **Arşiv** — eski aşama raporları (stage-0…6). İçlerindeki yol/checksum ifadeleri yazıldığı güne aittir |
| `patches/` | **Arşiv** — geçmiş yamalar. `patches/OKU-KODCU.md` nasıl uygulanacağını anlatır |
| `mockups/` | Ön taslak HTML'leri (üretim paketine girmez, `python3 -m http.server` ile açılır) |

## Yeni teslim notu eklerken

1. Dosyayı **kök yerine** `docs/teslimatlar/` içine koy.
2. Adı `teslimat-<konu>-<yyyy-mm-dd>.md` olsun.
3. İçerik en az: görev, branch, taban/teslim commit, değişen dosyalar, koşulan
   komutlar ve sonuçları, kilitli dosya kontrolü, bilinen riskler.
4. `reports/` ve `patches/` arşivdir; yeni dosya eklemek yerine `docs/` kullan.

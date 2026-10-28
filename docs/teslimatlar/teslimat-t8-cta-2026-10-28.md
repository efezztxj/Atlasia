# Teslimat — T8 CTA hiyerarşisi (2026-10-28)

## Görev ve branch

- Görev: tanıtım sayfasında tek bir birincil keşif CTA'sını belirginleştirmek;
  diğer başlangıç yollarını ikincil/üçüncül sunmak.
- Branch: `arena/0f6e2b94-atlasia`
- Taban: `f58d0ef` (`origin/main`)
- Firestore kuralları ve indeksleri değişmedi; Firebase/Cloudflare ayarlarına
  dokunulmadı.

## Yapılanlar

- Hero'daki **“Dünyayı keşfet”** CTA'sı tek birincil eylem olarak işaretlendi.
- Üst çubuktaki CTA'nın görsel ağırlığı düşürüldü; açıklama bölümündeki
  eylem ikincil, footer eylemi üçüncül olarak sınıflandırıldı.
- Dört başlangıç CTA'sının da mevcut `onStart` akışını çağırdığı korundu.
- `LandingPage.test.ts` ile CTA seviyeleri, tek bir birincil CTA ve aynı
  başlangıç akışı kilitlendi.
- Yeni analitik/telemetri veya davranış değişikliği eklenmedi; canlı dönüşüm
  ölçümü iddiası yoktur.

## Değişen dosyalar

- `src/components/LandingPage.tsx`
- `src/components/LandingPage.test.ts` (yeni)
- `docs/teslimatlar/teslimat-t8-cta-2026-10-28.md` (bu kayıt)

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm ci` | başarılı |
| `npm run typecheck` | başarılı |
| `npm run lint` | başarılı |
| `npm run test:run` | **1204/1204** (150 dosya) |
| `npm run test:scripts` | başarılı |
| `npm run audit:check` | üretim bağımlılıklarında bilinen açık yok |
| `npm run build` | başarılı; bundle ve service-worker bütçe/varlık kontrolleri geçti |
| `git diff --check` | temiz |
| `npm run test:rules:emulator` | yerel Java 21+ bulunmadığı için çalışmadı; bu değişiklik kurallara dokunmuyor. CI'da kural testi kontrolü bekleniyor. |

Üretim derlemesinde Vite'ın 500 kB üzeri chunk uyarısı görüldü; derleme ve
mevcut paket bütçesi kapıları başarılıdır.

## Sonraki adım

PR kontrolleri yeşil olduktan sonra `main`e merge; Cloudflare Pages dağıtımını
ve canlı URL'yi doğrula. Sonraki ürün işi: T4 misafir modundan önce misafir
izin sınırlarını kararlaştırmak.

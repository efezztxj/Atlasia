# Teslimat — Açık temada katmanlı beyaz görünüm

- **Görev:** Kullanıcının düz beyaz açık temayı kullanışsız bulması üzerine modern ürün arayüzlerindeki katmanlı light-mode yaklaşımını uygulamak.
- **Branch:** `arena/4a1760d5-atlasia`
- **Taban commit:** `8572ae1b0e52459c86a3e9a5c5e29449a2448c38` (`main`, PR #94 merge commit'i)
- **Uygulama teslim commit'i:** `ac164c40f42957c13cbcda12167bcb67d3364353`
- **Devir kaydı:** Bu markdown dosyası ayrı dokümantasyon commit'indedir.

## Kabul kriterleri ve yapılanlar

- Her yüzeyi aynı beyaza boyamak yerine açık nötr kanvas üzerinde gerçek beyaz kartlar kullanıldı.
- Keşif haritasının fonu/atmosferi açık mavi-gri tonlara ayrıldı; küre ve kartlar zeminden ayrışıyor.
- Koyu haritada gerekli olan ağır başlık ve ipucu gölgeleri açık temada kaldırıldı; metin artık lekesiz ve keskin.
- Kart çerçeveleri nötr hairline, ölçülü iki katmanlı gölge ve beyaz yüzeylerle güncellendi.
- Pin gölgeleri açık temada hafifletildi; yıldızlı koyu-tema arka plan kopyası kaldırıldı.
- Mobil ve masaüstü yerleşimi, boyutlar, kontrol konumları, altın CTA'lar, koyu tema ve kayıtlı tema tercihi korunuyor.
- Yeni kanvas rengi de WCAG AA kontrast testlerine eklendi; beyaz panel token'ları değişmedi.

## Değişen dosyalar ve kilit kontrolü

- `src/index.css`: açık tema kanvas/border/elevation token'ları ve yüzey stilleri.
- `src/components/Hero.tsx`: yalnız açık tema stil hedefi olan `explorer-hero-title` sınıfı.
- `src/components/BottomPanel.tsx`: yalnız açık tema stil hedefi olan `explorer-map-hint` sınıfı.
- `src/components/MapView.tsx`: açık tema küre fonu ve atmosfer renkleri.
- `src/config/uiSurface.test.ts`: katmanlı zemin ve gölge regresyon kilitleri.
- `src/config/accessibility.test.ts`: açık kanvas üzerinde kontrast doğrulaması.

Başlangıçta çalışma ağacı temizdi. Firebase, Firestore Rules, Storage, harita veri kaynakları, ücretli servisler, yerleşim ölçüleri ve kontrol konumları değiştirilmedi. `dist/`, Chromium/Puppeteer araçları ve ekran görüntüleri Git'e eklenmedi.

## Doğrulama

| Komut / kontrol | Sonuç |
| --- | --- |
| `npm ci` | ✅ 365 paket, 0 güvenlik açığı |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 uyarı |
| `npx vitest run src/config/uiSurface.test.ts src/config/accessibility.test.ts` | ✅ 2 dosya / 24 test |
| `npm run test:run -- --maxWorkers=4` | ✅ 126 dosya / 952 test |
| `npm run build` | ✅ bundle bütçesi ve 28/28 SW kabuğu doğrulandı |
| `npm run audit:check` | ✅ üretim bağımlılıklarında bilinen açık yok |
| `npm run test:rules:emulator` | ⛔ Sandbox'ta Java 21 yok; emülatör başlayamadı. Rules değişmedi. |
| Chromium görsel kontrol | ✅ 1440×900 masaüstü ve 390×844 mobil; gerçek cihaz-hesabı kayıt akışı ve onboarding kapatma |

Bundle ölçümü: toplam JS gzip `885.750 B / 886.000 B`; toplam CSS gzip `34.086 B / 34.500 B`.

## İnceleme, riskler ve sonraki görev

- Uygulama diff'i ve `git diff --check` gözden geçirildi; değişiklik yalnız açık tema renk/yüzey katmanı ve iki semantik stil sınıfıyla sınırlı. Bu oturumda bağımsız ikinci agent/reviewer bulunmuyordu.
- Sandbox dış uydu/karo isteklerine izin vermediği için gerçek Esri görüntüleriyle görsel kontrol yapılamadı; küre, atmosfer, pinler ve bütün arayüz katmanları kontrol edildi.
- JS toplam gzip bütçesi mevcut tabana yakın (`250 B` pay) ancak kontrol başarılı; sonraki özelliklerde bütçe izlenmeli.
- Sonraki öneri: canlı önizlemede gerçek harita karolarıyla son bakış ve Java 21 bulunan CI'da `npm run test:rules:emulator`.

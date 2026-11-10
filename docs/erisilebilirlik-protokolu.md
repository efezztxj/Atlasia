# Atlasia — insan erişilebilirlik protokolü (F5-4)

**Durum:** protokol yazıldı · **uygulanmadı** (aşağıdaki üç oturum henüz koşmadı)
**Yazan:** 2026-11-01 · **Plan:** (bu depoda değil; ilgili PR #167 kapatıldı) §F5-4

Bu belge **ölçüm protokolüdür**, ölçüm sonucu değildir. Otomatik kapılar
(`axe` E2E planı F5-1, `a11y` kaynak kapıları, klavye kısayolu testleri) yalnız
"kural ihlali yok" der; **gerçek kişiyle** yapılan üç oturum "kullanılabilir mi?"
sorusunu yanıtlar. Sonuç tablosu boş bırakıldı: uydurma sonuç yazılmaz.

## 1. Kapsam ve süre

| Oturum | Araç | Süre | Katılımcı |
| --- | --- | --- | --- |
| A — Ekran okuyucu (Windows) | NVDA + Firefox | 45 dk | Haritayı hiç görmemiş 1 kişi |
| B — Ekran okuyucu (Apple) | VoiceOver + Safari | 45 dk | Aynı kişi ya da 1 yeni kişi |
| C — Yalnız klavye | Chrome, fare/ekran okuyucu kapalı | 30 dk | Klavye kullanan 1 kişi |

Katılımcıya **hiçbir adım tarif edilmez**; görev metni okunur, gözlem yazılır.

## 2. Görev metni (üç oturumda da aynı)

1. Haritayı aç ve yakınındaki bir sahil yerini bul.
2. O yerin detayını aç, tazelik durumunu öğren.
3. Bir yer kaydet (hesap gerekiyorsa gerektiğini anla ve geri dön).
4. Topluluk akışını aç, bir gönderiye beğeni ver.
5. Ayarları aç, konum iznini temizle.
6. Çıkış yapmadan haritaya geri dön.

## 3. Her görev için kaydedilecekler

| Alan | Değer |
| --- | --- |
| Tamamlandı mı? | evet / yardımla / hayır |
| Süre | saniye |
| Odak kayboldu mu? | evet (nerede) / hayır |
| Duyuru yeterli mi? | evet / kısmen / hayır — ekran okuyucu ne okudu (birebir alıntı) |
| Tuzak | odaklanılamayan kontrol, kapanmayan katman, sessiz durum değişikliği |

## 4. Odaklanacak yüzeyler (kodda bugün var olan kapılar)

| Yüzey | Beklenen | Kapı |
| --- | --- | --- |
| "İçeriğe geç" bağlantısı | İlk Tab ile görünür, haritaya atlar | `src/config/a11y*.test.ts` |
| Harita yüzeyi | `#harita`, klavye ile gezilebilir pin listesi | F5-5 (plan) |
| Alt panel / keşif kartı | Başlık düzeyi tutarlı, `aria-expanded` doğru | `uiSurface.test.ts` |
| Katmanlar sayfası | Esc kapatır, odak geri döner | `useMobileBackClose` testleri |
| Misafir kapısı | Neden açılmadığı **duyurulur** (toast `role="status"`) | `guestMode.test.ts` |
| Canlı bölgeler | `aria-live` yalnız gerekli yerde; spam yok | `designSystem`/`a11y` kapıları |

## 5. Sonuç tablosu (doldurulacak)

| Oturum | Tarih | Tamamlanan görev | Ortalama süre | Bulgu sayısı | Kritik bulgu |
| --- | --- | --- | --- | --- | --- |
| A — NVDA | _ölçülmedi_ | — | — | — | — |
| B — VoiceOver | _ölçülmedi_ | — | — | — | — |
| C — Klavye | _ölçülmedi_ | — | — | — | — |

Kural: bir bulgu kapatılmadan tablo satırı "tamam" sayılmaz; bulgular
`docs/denetim/` altına tarihli not olarak yazılır.

## 6. Bu protokolü kim, ne zaman koşar?

- Sürüm adayı (release candidate) hazırlanınca **bir kez**.
- Erişilebilirlikle ilgili bir yüzey yeniden yazılırsa (harita yüzeyi, paneller,
  klavye kısayolları) o yüzey için **tekrar**.

Katılımcı bulunamazsa oturum "yapılmadı" olarak kaydedilir; **otomatik kapı
sonucuyla ikame edilmez**.

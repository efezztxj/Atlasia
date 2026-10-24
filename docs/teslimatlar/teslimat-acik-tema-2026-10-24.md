# Teslimat — Gerçek beyaz açık tema

- **Görev:** Kullanıcının koyu keşif ekranı görüntüsüne istinaden “bunun beyaz formatını yap açık tema” isteği.
- **Branch:** `arena/5fa252ec-atlasia`
- **Taban commit:** `b6c486cf56096e8fca89b7b85dcb93ba810008af` (`main`)
- **Uygulama teslim commit'i:** `6e7b29f82ea6e9f8969996b508e76b5b7e7d103b`
- **Devir kaydı:** Bu markdown dosyası ayrı dokümantasyon commit'indedir.

## Yapılanlar

- Açık tema yeni varsayılan oldu; `atlasia.theme.v1` içindeki kayıtlı `dark` tercihi korunur ve Ayarlar → Görünüm'den tema değiştirilebilir.
- Açık tema token'ları krem yerine gerçek beyaz (`#ffffff`) sayfa/panel yüzeyleri kullanır. Metin, ikincil metin, altın vurgu, çerçeve ve gölgeler beyaz zemine göre düzenlendi.
- Koyu tema için kullanılan açık renkli metin ezmesi yalnız `data-theme="dark"` kapsamına alındı; beyaz zeminde silik kalan menü ve açıklamalar düzeltildi.
- MapLibre küre fonu ve atmosferi temaya bağlandı. Açık temada beyaz fon/açık atmosfer kullanılır; tema değişimi harita stilini yeniden yüklemeden uygulanır.
- Mobil/masaüstü keşif panelleri, bildirimler, ayarlar, gruplar, geri bildirim, rapor ve rota düzenleyici yüzeyleri açık temaya bağlandı.
- PWA/HTML tema rengi beyaz yapıldı; `initTheme()` kayıtlı tercihi React boyamasından önce uygular.
- Yüksek kontrast tercihi açık temada koyu metni ve görünür çerçeveyi korur.
- Yerleşim, harita kontrollerinin konumu, altın CTA dili, uydu altlığı ve koyu tema seçeneği değiştirilmedi. Landing/hesap ekranlarının korunan sinematik koyu tasarımı aynıdır.

## Değişen dosyalar ve kilit kontrolü

Uygulama commit'i: `index.html`, `public/manifest.webmanifest`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/hooks/useTheme.ts`, `src/hooks/useTheme.test.ts`, `src/components/MapView.tsx`, `src/components/FeedbackDialog.tsx`, `src/components/GroupsPanel.tsx`, `src/components/NetworkStatus.tsx`, `src/components/ProfilePanel.tsx`, `src/components/ReportDialog.tsx`, `src/components/RouteEditor.tsx`, `src/components/SocialPanel.tsx`, `src/config/accessibility.test.ts`, `src/config/uiSurface.test.ts`.

Başlangıçta çalışma ağacı temizdi; kullanıcıya ait commit'lenmemiş değişiklik yoktu. Firebase, Firestore Rules, Storage, ücretli servis, harita veri kaynakları ve yerleşim kilitlerine dokunulmadı. `dist/` ve görsel test araçları Git'e eklenmedi.

## Doğrulama

| Komut / kontrol | Sonuç |
| --- | --- |
| `npm ci` | ✅ 365 paket, 0 güvenlik açığı |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 uyarı |
| `npm run test:run -- --maxWorkers=4` | ✅ 126 dosya / 950 test |
| `npm run test:scripts` | ✅ |
| `npm run build` | ✅ bundle bütçesi ve SW kabuğu doğrulandı |
| `npm run verify:social-metadata` | ✅ |
| `npm run audit:check` | ✅ üretim bağımlılıklarında bilinen açık yok |
| `npm run test:rules:emulator` | ⛔ Sandbox'ta Java 21 yok; emülatör başlayamadı. Rules değişmedi. |
| Chromium görsel kontrol | ✅ 1568×795 masaüstü ve 390×844 mobil; cihaz hesabıyla keşif ekranı |

## İnceleme, riskler ve sonraki görev

- Teslim öncesi tam diff gözden geçirildi; krem token kalmadığı ve koyu yüzeylerin açık tema karşılıkları kontrol edildi. Bu oturumda bağımsız ikinci agent/reviewer bulunmuyordu.
- Görsel kontrolde dış uydu/karo istekleri sandbox ağ izinleri nedeniyle yüklenemedi; beyaz arayüz, küre atmosferi ve pinler doğrulandı. Gerçek uydu karolarıyla son görsel kontrol canlı önizlemede yapılmalı.
- Ara tam suite çalıştırmasında mevcut `TrackRecorderPanel` testi bir kez zamanlama kaynaklı başarısız oldu; izole test ve son tam suite (`maxWorkers=4`) geçti. Bu görevde kayıt akışı kodu değiştirilmedi.
- Sonraki öneri: Java 21 bulunan CI ortamında `npm run test:rules:emulator` komutunu çalıştırmak; tema dışı kalan tek doğrulama budur.

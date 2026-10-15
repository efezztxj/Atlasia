# Atlasia — Bilinen Sorunlar

Son güncelleme: 2026-10-15. Tüm maddeler kod okunarak veya komutla doğrulandı; "Yeniden üretme" sütunu adımları verir.
Durum: **Açık** = çözülmedi; **Doğrulandı** = kanıt var, düzeltilmedi.

## Doğrulanmış sorunlar

| # | Sorun | Kanıt | Etki | Yeniden üretme | Durum |
|---|---|---|---|---|---|
| 1 | Lint ve test altyapısı yok | `package.json` scripts yalnız `dev`, `build`, `preview`; repoda `*.test.*`/`*.spec.*` yok | Regresyonlar otomatik yakalanmaz | `git ls-files \| grep -E "test\|spec"` boş | Doğrulandı |
| 2 | `.env.example` belgelenmiş ama depoda yok | `AUTH_SETUP.md`, `CHANGELOG.md` referans veriyor; `git ls-files` içinde yok | Yeni geliştirici Firebase ortamını doğru kuramaz | `git ls-files \| grep -i env` → yalnız `src/vite-env.d.ts` | Doğrulandı |
| 3 | `README.md` boş (`# Atlasia`) | `wc -c README.md` = 9 | Kurulum/çalıştırma belgesi yok | `cat README.md` | Doğrulandı |
| 4 | Yinelenen ve ayrışmış kopya: `satellite-map-web-application (1)/` ve `satellite-map-web-application.zip` | `diff -rq src "satellite-map-web-application (1)/src"`: çok sayıda farklı dosya; build'e girmiyor | Yanlış dosya düzenlenme riski, depo şişkinliği (~3.4 MB) | `diff -rq src "satellite-map-web-application (1)/src"` | Doğrulandı — silme kullanıcı onayı bekliyor |
| 5 | Build'de 500 kB üzeri chunk uyarısı | `vite build` çıktısı: `map-vendor` 1,052.97 kB, `firebase-vendor` 576.02 kB | İlk yükleme yavaşlığı (mobilde) | `npx vite build` | Doğrulandı (uyarı, hata değil) |
| 6 | `capture.mjs` kök dizinde ve bağımlılığı tanımlı değil | `playwright-core` `package.json`'da yok; `localhost:5173` ve `/home/user/atlasia-shots` sabit | Betik başka makinede çalışmaz | `node capture.mjs` (playwright kurulu değilse hata) | Doğrulandı |
| 7 | Cihaz-içi hesap sunucu doğrulaması içermez | `lib/deviceAccounts.ts` IndexedDB; `AUTH_SETUP.md` bunu açıkça belirtir | Gerçek kullanıcı verisi için güvenli değil; yalnız geçici/yerel mod | `AUTH_SETUP.md` bölüm "Şimdi Kullanılabilen Cihaz Hesabı" | Doğrulandı (tasarım sınırı) |
| 8 | `App.tsx` 847 satır, tek bileşende çok sorumluluk | `wc -l src/App.tsx` | Değişiklik riski ve bakım zorluğu; ayrı test yazmayı zorlaştırır | `wc -l src/App.tsx` | Doğrulandı (teknik borç) |
| 9 | `capture.mjs` ve `satellite...` kopyası gibi artefaktlar, çalışma alanı kotası | `du -sh` | Kota (128 MB) ve depo karışıklığı | `du -sh` | Doğrulandı |
| 10 | `node_modules` (~374 MB) çalışma alanında | `du -sh node_modules` | Kotayı şişirir (snapshot'larda hariç tutulur) | `du -sh node_modules` | Bilgi |
| 11 | Hedef "beşli alt navigasyon" yok | `Header.tsx` (mobil 3 ikon), `BottomPanel.tsx` (5 sütun kategori ızgarası) | Ürün hedefi karşılanmıyor | `grep -rn "BottomNav\|tabbar" src` boş | Doğrulandı (eksik özellik) |
| 12 | Ülke tıklamasıyla keşif paneli yok | `MapView.tsx` `map.on("click")` yalnız addMode/pin | Ürün hedefi karşılanmıyor | Haritada ülkeye tıklamak panel açmaz (kod incelemesi) | Doğrulandı (eksik özellik) |
| 13 | Dünya siyasi sınırları üçüncü taraf raster overlay'de; ülke bazlı vektör yok | `MapView.tsx` `labels` kaynağı (Esri Reference) | Sınır doğruluğu/lisansı kontrol edilemiyor; etkileşim yok | `grep -n "World_Boundaries" src/components/MapView.tsx` | Doğrulandı (risk) |
| 14 | Ülke → şehir → ilçe hiyerarşisi yok | `SearchBox.tsx`, `utils/geo.ts` | Keşif akışı hedefin altında | Arama dışında gezinme UI'si yok | Doğrulandı (eksik özellik) |

| 15 | **Türkiye seçilince amber vurgu görünmüyor** (seçim toast'u çalışıyor) | Tarayıcı: Efes sonrası 4 karadaki tıklama "Turkey" döndürdü; piksel örneklemesinde vurgu rengi yok, KKTC'de var | Ülke vurgusu güvenilir değil; sebep doğrulanmadı (olası: filtre değerinin/katman sırasının etkisi) | `docs/COUNTRY_LAYER.md` §4; `/tmp` test betiği | **Açık — sonraki adımda incelenecek** |
| 16 | Kuzey Kıbrıs iki farklı poligonla çiziliyor (elle çizilmiş KKTC ve NE "N. Cyprus") | Örnekleme: NE'nin ~%8'i elle çizilmiş alan dışında; ~%96 örtüşme | İki çizgi hafif farklı görünür | `node` örnekleme (COUNTRY_LAYER.md §1) | Doğrulandı — karar bekliyor (NE'ye geçiş mi?) |
| 17 | Antimeridyen geçen poligonlar (Russia, Fiji, Antarctica) | `scripts/build-countries-geojson.test.mjs` sıçrama raporu | Yatay bant artefaktı olasılığı; tarayıcıda görülmedi | Sıçrama testi | Doğrulanmadı (görsel) |
| 18 | Ülke adları İngilizce (Turkey, Cyprus, ...) | Veri kaynağı | Türkçe arayüzde tutarsız | Seçim toast'u | Açık |
| 19 | Harita karoları (ESRI/CARTO) sandbox'ta yüklenemiyor | Konsol: AJAXError / ERR_CONNECTION_CLOSED | Test ortamında arka plan koyu; bu kodun hatası değil | Test çalıştırma | Ortam kısıtı |

## Doğrulanmadı (canlı ortamda test edilmedi)

| # | Konu | Neden doğrulanmadı |
|---|---|---|
| A | Harita render'ı, pin tıklama, rota çizimi, küre dönüşü | Headless tarayıcı + WebGL testi yapılmadı |
| B | Firebase e-posta, Google, Apple, SMS girişleri | Gerçek Firebase projesi ve sağlayıcı ayarı yok |
| C | Firestore yazma/okuma ve kural davranışı | Emülatör/canlı proje yok |
| D | Photon arama ve Open-Meteo yanıtları | Ağ erişimi kısıtlı (yalnızca izinli hostlar) |
| E | Service worker güncelleme davranışı | Tarayıcı oturumu yok |
| F | Mobil yerleşim | Cihaz/viewport testi yapılmadı |

## İncelenip sorun bulunmayanlar

- **MapView cleanup**: Ana effect `cancelAnimationFrame`, marker `remove`, `map.remove()` çağırıyor. Pin marker'ları `places` farkıyla eklenip kaldırılıyor (yinelenme yok).
- **Event listener birikmesi**: Pin `click`/`keydown` listener'ları yalnız yeni pin elementinde; marker kaldırılınca element de gider. Ayrı temizlik gerekmiyor.
- **TypeScript**: `npx tsc --noEmit` hatasız çıktı.
- **Build**: `npx vite build` hatasız tamamlandı (uyarı #5 hariç).
- **Önizleme**: `vite preview` ile `/` ve iki JS chunk'ı HTTP 200 döndü (yalnızca sunum kontrolü; render değil).
- **Ortam dosyaları**: `.env*` dosyası yok; içerik okunmadı.

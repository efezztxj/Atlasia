# Eksikler planı — 22 Ekim 2026

Taban: main `6d7cbce` (#56).

**Durum (2026-10-22 sonu):** A2, A3, B1 ve B2 yapıldı. A1 yapılmadı: açık temanın zemini zaten `#f4f1e7`, yani üst çubuk rengi zeminle uyumlu. "Gerçek beyaz" değişikliği beyaz sayfa modu işine girer ve o iş kullanıcıda. Kapsam: kodda henüz olmayan ya da yarım kalan her şey.
Sıralamanın ölçütü: önce onay ve maliyet gerektirmeyen işler, sonra onay isteyenler, en son
para ya da karar isteyenler. Her iş ayrı PR olarak yapılır. Kural (rules) değişikliği olan PR'dan
sonra deploy'u kullanıcı adım adım yapar.

## Faz A — onay gerektirmez, hemen yapılabilir

| # | İş | Nerede | Plan | Bitti kanıtı |
| --- | --- | --- | --- | --- |
| A1 | Açık temada `theme-color` krem (`#f4f1e7`) kalıyor; kural "açık tema gerçek beyaz" diyor | `src/hooks/useTheme.ts`, `useTheme.test.ts` | Açık tema değerini sayfa zeminiyle aynı beyaza çek, testi güncelle | Test, açık temada beyaz değeri bekliyor ve geçiyor |
| A2 | Kayıtlı/düzenlenen rotada durak bazlı varış havası yok (yalnız gün rozeti var) | `RouteEditor.tsx` `WeatherRiskPanel`, `utils/weather.ts` | "Hava riskini denetle" tıklanınca gün rozetinin altında her durak için "Varışta: sıcaklık · durum · %yağış" göster. `attachStopWeather` `pinId`'ye bağlı; kayıtlı rotalarda durak kimliğiyle eşleyen küçük bir yardımcı eklenir. İstek başına en çok 10 nokta sınırı var, fazlası iki isteğe bölünür. Veri yoksa "bilinmiyor" yazılır, tahmin uydurulmaz | Birim testi: saat eşleme, 10+ durak, veri yok durumu |
| A3 | Arkadaşlıktan çıkarılan kişi karşı tarafın listesinde kalıyor (karşı indeks silinemiyor) | `src/lib/friendships.ts`, `FriendsTab.tsx` | Kural değiştirmeden tembel temizlik: liste açılınca her arkadaş için `friendships/{id}` okunur. Okuma reddedilirse arkadaşlık bitmiş demektir (belge yok ya da üye değilsin). Bu durumda kişi kendi `friends/{x}` kaydını siler. Liste başına okuma sayısı sınırlanır | io testi: silinmiş arkadaşlık listeden düşüyor, geçerli arkadaşlık kalıyor |

## Faz B — kod hazır, ROADMAP §4 gereği MapView onayı ister

| # | İş | Plan | Risk |
| --- | --- | --- | --- |
| B1 | `kktc-label` katmanı `Open Sans Semibold` istiyor; OpenFreeMap stilinde yalnız `Noto Sans Regular` var, etiket görünmeyebilir | `text-font` değeri `["Noto Sans Regular"]` olur; sözleşme testi eklenir | Çok düşük, tek satır |
| B2 | Haritada bacak bazlı çizim (patika kesikli, yol düz) bağlı değil | App'teki `drawRoute(coords)` çağrıları, rotada `legs` varsa `drawRouteLegs(legs)` çağırır. Ayrıca iki düzeltme gerekir: yeni rota daha az bacaklıysa artan katmanlar silinir; `drawRoute`, bacak katmanlarını temizler | Orta. Sandbox'ta tarayıcı yok, görsel kontrolü kullanıcı yapar |

## Faz C — kural değişikliği (her PR sonrası kullanıcı deploy eder)

| # | İş | Plan |
| --- | --- | --- |
| C1 | #55: arkadaşlık reddi kanıtı ve `displayNameLower` | Başka oturum bitirince denetlenir, ✅/❌ verilir |
| C2 | Kullanıcı araması büyük-küçük harfe duyarlı ve yalnız önekle çalışıyor | #55'teki `displayNameLower` alanına bağlı: arama küçük harf alanda yapılır. Önek dışı (kelime içi) arama Firestore'da pahalı, şimdilik yapılmaz |
| C3 | #51'deki kural sertleştirmelerini güncel main'e taşımak | Üç küçük PR: (1) grup `updatedAt` + silinmiş grup `exists` koruması, (2) `users/{uid}/groups` üyelik kanıtı + rızasız üye ekleme yasağı, (3) hikâye 24 saat kuralı. Her birine emülatör testi eklenir |
| C4 | Firebase App ID doğrulaması (#51'in "8d eksik" iddiası) | Kod değişmez. Kullanıcı Console'daki App ID'yi koddaki değerle karşılaştırır; farklıysa tek satır düzeltilir |

## Faz D — içerik (para gerektirmez, zaman ister)

| # | İş | Plan |
| --- | --- | --- |
| D1 | Adım 7: 19 yerden yalnız 5'inde özel metin var | Kalan 14 yer için Wikidata/Wikipedia kaynaklı, kaynağı yazılı kısa metinler. Uydurma bilgi yok; doğrulanamayan alan "doğrulanmadı" kalır |
| D2 | Adım 8: site turu yalnız Efes'te var | Aynı `siteTours` modeliyle 2–3 açık hava ören yeri eklenir. Seçim ölçütü: açık veri yoğunluğu ve pilot bölgesine yakınlık. Pilot bölgesi henüz kararlaştırılmadı; yeri kullanıcı seçer, liste öneri olarak sunulur |

## Faz E — karar ya da para gerektirir

| # | İş | Durum / öneri |
| --- | --- | --- |
| E1 | Rozet ve takip (karar d) | ROADMAP bunlar için Cloud Functions (Blaze) varsayıyor. **Alternatif, Spark'ta çalışır:** takip `users/{uid}/following/{hedef}` olarak tutulur (yalnız sahibi yazar). Takipçi sayısı collection-group `count()` sorgusuyla bulunur. Rozet, kişinin `verifications` sayısından (`count()`) hesaplanır. Önkoşul (bugün YOK): `validVerification` belge kimliğini sınırlamıyor ve `placeId`'nin var olduğunu denetlemiyor; aynı kişi aynı yere sınırsız doğrulama yazabilir. Önce kural değişikliği gerekir: belge kimliği `{placeId}_{uid}` olarak zorlanır (kişi başına yer başına bir doğrulama). Konum sunucuda doğrulanamadığı için rozet "güven seviyesi düşük" bir sinyaldir. Hangi yol seçilecek, karar kullanıcıda |
| E2 | Foto depolama (karar b) | Öneri: data URL (~180 KB sınırı) kalsın. Storage için Blaze gerekir. #15 (çoklu foto) bu karara bağlı |
| E3 | Sohbet maliyeti (karar g) | Firestore ile uygulandı; resmî karar ve kullanım sınırı yazılmalı |
| E4 | Web Push bildirimleri | Yalnız kullanıcı "C1 başla" derse başlar |
| E5 | Native uygulama (karar e, 2. faz) | Web/PWA tamamlandıktan sonra Capacitor sarmalayıcı; arka plan konumu bunun gerekçesi |
| E6 | Hesap/veri silme arayüzü | Kullanıcı sonraya bıraktı |
| E7 | maplibre-gl yükseltmesi | Paket bütçesini ~60 KB aşıyor; gerçek ihtiyaç doğarsa bütçe kararıyla yapılır |
| E8 | Geliştirme araçlarının büyük sürümleri (TS 7, Vite 8, rules-unit-testing 6 / firebase 13) | Her biri ayrı PR; önce firebase 13 uyumluluğu |

## Kullanıcıda olanlar (ajan dokunmaz)

P18 giriş ekranı ve beyaz sayfa modu · TASK-016 cihaz testi · karar (c) iki cihaz onayı · pilot bölgesi · avukat TASK-021B.

## Önerilen sıra

A1 → A2 → A3 → (onay gelirse) B1 → B2 → C1/C2 → C3 → D1 → D2 → E kararları.

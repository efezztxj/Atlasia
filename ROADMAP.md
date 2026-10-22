# Atlasia — Yeni Kronolojik Sıra (v2)

> Bu dosya, Atlasia'ya eklenecek işlerin **bağımlılık sırasıdır**; özellik listesi değil.
> Ajanlar için yazıldı: her adımın amacı, girdisi, dosya yolları, "bitti kanıtı" komutu ve riski var.
>
> - **Son güncelleme:** 2026-10-22 (açık PR triyajı; Adım 11/14/15 durumları koda göre düzeltildi; karar (d) işlendi)
> - **Durum:** main `84d2425` (#54) + Dependabot #10. Bitti: P1–P5, P10–P20 kod işleri (P18 giriş ekranı kullanıcıda), sosyal akış (#52 gruplar/arkadaşlar/davet linkleri, #54 arkadaşlık isteği izin düzeltmesi), T1-AUTH (#33), P17 çekirdeği (#32). Kararlar: (a) alt koleksiyon, (d) XP yok / rozet+takip kalır, (e) önce web/PWA sonra Capacitor, (f) verildi; (c) uygulandı, kullanıcının iki cihaz onayı bekleniyor; (b) foto depolama ve (g) sohbet maliyeti resmî olarak açık. Açık PR'lar: #51 (kural sertleştirme, main'e taşınmayı bekliyor), #55 (başka oturumda sürüyor).
> - **Kural:** ⛔ işaretli adımlarda insan onayı olmadan kod yazılmaz.
> - **v1'e göre değişiklik:** ürün tezi netleşti (topluluk uygulaması) → sosyal katman silinmiyor, fonlanıyor; `routes`/`tracks` nesneleri eklendi; içerik boru hattı ayrı faz oldu.

## 0. Bu dosya nasıl kullanılır (ajanlar için)

1. Bir adıma başlamadan önce **önceki adımın "Bitti kanıtı" komutunu çalıştır.** Geçmiyorsa o adımda kal.
2. Adım sırasını atlama. Zorunlu kalırsan atladığın işi **§6 Bilinen Borçlar**'a tek satır yaz.
3. Her adım **tek commit**: `conventional commit` + depodaki stil (ascii Türkçe).
4. ⛔ adımlarda kod yazma; seçenekleri ve maliyetleri hazırla, kararı insana bırak.
5. §4 Dokunma Listesi ve §5 Sert Kısıtlar ihlal edilmez.
6. "Düzelttim" demek için **kanıt** gerekir: komut çıktısı veya test. Çıktısız iddia yazılmaz.

## 1. Ürün tezi (kapsam kararı — ajanlar bunu varsaymasın)

Atlasia bir **topluluk seyahat uygulamasıdır**: bir yere gidildiğinde o yerin rehberliğini yapar, rota üretir ve gezi planlar, hava durumunu izler, başkalarının gittiği yerlerden fikir verir, başkalarının rotalarını kaydedip paylaştırır, kişisel gruplarda sohbet ettirir.

İki ölçek var ve **karıştırılmamalı**:

| Ölçek | Örnek | Değerli olan |
|---|---|---|
| **Bölge** (km) | "Kapadokya'da 1 gün" | **motor**: hangi duraklar, hangi sıra, ne zaman |
| **Site** (yüz metre) | "Efes içinde 3 saat" | **içerik**: hangi kapıdan gir, hangi yöne yürü, neyi atlama |

Bölge ölçeğinde motor zaten var ve iyi. Site ölçeğinde motor **çalışmaz** (§7 Antipattern A) ve çalışmasına gerek yoktur; sıra bilinen bir turdur.

**Lansman kaması:** tek pilot bölgesi (yer kararı açık). Topluluk uygulamaları yoğunlukla yaşar; 500 kişi tek bölgede işe yarar, dünyada işe yaramaz. Kodda hiçbir bölgeye özel harita katmanı ya da arama kaydı yoktur (KKTC'ye özel sınır/isim katmanı, `regions.ts` ve ters-geokod üzerine yazma 2026-10-22 kullanıcı kararıyla kaldırıldı).

## 2. Kanıtlanmış mevcut durum

Bu tablo yeniden türetilmesin diye burada. Değiştiyse güncelle.

### 2.1 Depo

| Olgu | Değer | Doğrulama |
|---|---|---|
| Commit | P1 adım commitleri Arena branch'inde; SHA'lar teslimat raporunda | `git log --oneline` |
| İzlenen dosya | 145 mevcut + 5 P1 teslimat dosyası; kopya proje ağacı yok | `git ls-files \| wc -l` |
| Test | 29 Vitest dosyası + Firestore Rules suite + 7 credential-free Node tests | `find . -name "*.test.*" -not -path "./node_modules/*"` |
| CI | Node 22 gate; PR, `main`, `arena/**` push | `ls .github` |
| `.env.example` | 6 boş `VITE_` değişkeni | `git ls-files \| grep -c env.example` |
| `npx tsc --noEmit` | 0 hata | çalıştır |
| `npm run build` | başarılı; vendor chunk >500 kB warning (non-fatal) | çalıştır |
| Entry JS (gzip) | Build chunk ölçüleri son build çıktısında raporlanır | `npm run build` |
| Env değişkeni | 6 | `rg "import\.meta\.env\." src` |

Env: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_GEOCODER_URL`, `VITE_GOOGLE_MAPS_EMBED_KEY`, `VITE_APPLE_AUTH_ENABLED`.

### 2.2 Veri modeli (gerçek durum)

| Koleksiyon | İçerik | Not |
|---|---|---|
| `places/{id}` | keşif pinleri | `kind: "guide" \| "user"`, kural `authorUid` koruyor |
| `posts/{id}` | gönderi + seed/base `likes`, kullanıcı üyelikleri `likedBy[]` | toplam = base + benzersiz üyeler; yeni yanıtlarda gömülü alan yok |
| `posts/{id}/replies/{replyId}` | tek yanıt belgesi | bounded public read; yazar UID ile doğrulanır; değiştirilemez |
| `stories/{id}` | 24 saat ömürlü | görüldü durumu cihaz bazlı localStorage'da; Firestore `seen` yok |
| `users/{uid}` | profil | `xp`/`level` istemciden yazılamaz |
| `routes/{id}`, `users/{uid}/savedPlaces\|savedRoutes` | **rotalar + kayıtlı koleksiyonlar** | Firestore'da (görünürlüklü yayın + kayıt); yalnız Firebase yapılandırması yoksa localStorage (`atlasia.member.{uid}`) |
| — | **grup / mesaj** | **hiç yok** |
| — | **iz kaydı** | **hiç yok** |

Hiçbir moderasyon yapısı yok: `report`, `şikayet`, `block`, `ban` araması gerçek eşleşme vermiyor. Bildirimler ise iskelet: `App.tsx:703`'te panel var, içeriği "Şimdilik yeni bildirimin yok".

### 2.3 Kritik kod davranışları (yanlış varsayma)

| Bileşen | Gerçek davranış |
|---|---|
| `routePlanner.planRoute` | Polyline **duraklar arası düz çizgidir** (`encodePolyline([[start], ...stops])`), patika değil. Kodun kendi metni: *"çizgi durakları bağlar, yol navigasyonu değildir"* |
| Mesafe modeli | `haversine × 1.25` — **tek global sapma katsayısı** |
| Hız | `SPEED.walking = 4` km/h, `cycling 12`, `driving 35`, `transit 18` |
| Durak süresi | `STAY.history = 60` dk (kategori bazlı) |
| Durak tavanı | `maxStops = min(7, saat / 0.85)` |
| `hiddenInView` | yarıçap `max(3, 100/2^(zoom-3))` → **taban 3 km**, site ölçeğine inemez |
| Topluluk tercihi | `place.kind === "user" ? 1.4 : 1` — motor topluluk pinlerini öne alıyor |
| `openMapPlaces.fetchOpenMapPlaces` | Photon **metin araması** (7 sabit kelime, `limit 25`, yürüyüşte 4.5 km yarıçap, 60 kayıt tavanı). Mekânsal sayım yapamaz |
| `openMapPlaces.noteFor` | OSM'den gelen yerlerin notu **jenerik feragatname**: *"Güncel erişim, çalışma saati, ücret ve saha koşullarını gitmeden doğrula."* |
| `placeAdvice` | 19 alias, **yalnız 5'inde** özel içerik (kyoto, petra, kapadokya, banff, navagio) |
| `useGeolocation` | **Tek** en iyi ölçüm. 18 sn hassaslaştırma, 20 m'de erken bitirme, **daha kötü ölçümleri atıyor**. `GeoFix` = `lng/lat/accuracy/timestamp` — **yükseklik yok** |
| `NearbyAudioGuide` | Yakınlık anlatımı **zaten çalışıyor**: eşik `max(50, min(120, accuracy+30))`, `speechSynthesis` tr-TR, otomatik oynatmıyor. Metin: `place.story ?? STORIES[id] ?? place.note` |
| `polyline` | Google Encoded Polyline, 1e-5 (≈1,1 m). **Zaman ve doğruluk kodlanmıyor** |
| `usePlaceGallery` | Wikimedia Commons'a **mekânsal** sorgu: `generator=geosearch`, `ggsradius=500`, `ggsnamespace=6` |
| `drawRoute` | `drawRoute(coords, preview?)` — tek çizgi, `#F2D77C`, kalınlık 3.2 (önizleme 2.2) |
| `firestore.rules` | `users` delete `false` · `posts` update yalnız `likedBy` · yanıtlar alt koleksiyonda, sınırlı okuma/yetkili oluşturma/değiştiremezlik · fotoğraf ≤180.000 karakter JPEG data URL |

### 2.4 Bilinen kusurlar (kanıtlı)

| # | Kusur | Yer | Etki |
|---|---|---|---|
| 1 | BBOX eksen sırası regresyon kilidi | `src/utils/geo.ts` + `geo.test.ts` | Photon extent `[west,south,east,north]` doğrudan korunur; `toSearchResult` saf test dikişidir |
| 2 | Seed tabanı ve gerçek beğeni üyeliği ayrımı | `src/utils/likes.ts`, `firestoreData.ts` | tamamlandı: toplam seed/base + benzersiz `likedBy`; toggle yalnız atomik array transform yazar |
| 3 | Reply array read-modify-write yarışı | `posts/{id}/replies/{replyId}` | tamamlandı: yanıt başına belge; bounded batches ile parent silme öncesi child cleanup |
| 4 | Yanıtlarda yazar doğrulaması | `firestore.rules` | tamamlandı: `authorUid == request.auth.uid`, reply update kapalı, owner/author delete |
| 5 | Feed okumalarında sınır | `firestoreData.ts` | feed sayfaları 50; yanıt sayfaları 100; cursor tabanlı yükleme |
| 6 | Eski sosyal katman yardımcıları | gerçek `src/` taraması | eski `awardXp`/`followUser` ailesi bu checkout'ta mevcut değil. Karar (d): XP yeniden eklenmez; rozet/takip yalnız sunucu tarafı (Cloud Functions) ile gelir |
| 7 | Story `seen` alanı global dokümanda | `types.ts`, `firestoreData.ts`, rules | tamamlandı: Firestore şemasından çıkarıldı; UI yalnız cihaz bazlı `atlasia.feed.seen.v1` kullanır |
| 8 | Reply veri yolu sözleşmesi | `firestoreData.ts`, README, rules | tamamlandı: başlık, yazma/okuma, rules ve doküman aynı alt koleksiyon modelini kullanır |
| 9 | Sokak/topoğrafik altlıklarda `kktc-label` ile Esri'nin gömülü etiketleri üst üste gelebiliyordu | `MapView.tsx` efektler | kapandı: KKTC'ye özel `kktc-outline`/`kktc-label` katmanları 2026-10-22 kullanıcı kararıyla tamamen kaldırıldı; yokluğu `mapLabelVisibility.test.ts` ile kilitli |

### 2.5 Adım durumu (2026-10-22, main `0ad774f` üzerinde commit ataları doğrulanarak)

> ✅ = ilk sürümü main'de. Şu an P1–P4'e verilmiş ya da açık PR'da süren derinleştirmeler **işaretlenmedi**; "Süren iş" sütununda yalnız adı geçer.

| Adım | Konu | Durum | Kanıt (main'deki commit) | Süren iş (işaretlenmedi) |
|---|---|---|---|---|
| 0 | Depo temizliği ve kurulum kapısı | ✅ | P1 kapanışı (`teslimat-p1.md`) | — |
| 1 | Sözleşmeyi dondur | ✅ | `8a7261d` | — |
| 2 | Test + CI kapısı | ✅ | CI emulator dahil (P12, PR #20) | — |
| 3 | `routes` + `tracks` modeli ve kuralları | ✅ | `72001ac`, #31 (`7df4ffb`) | karar (b) foto, (c) senkron açık |
| 4 | İz kaydı → taslak rota | ✅ çekirdek | `471f9f7`, #32 (`6a4d2aa`) | onaylı kaydet akışı (PR #35), saha testi |
| 5 | Rotayı düzenle, yayınla, paylaş | ✅ | `5a6b666` | link içi paylaşım P20 (karar) |
| 6 | Rota keşif yüzeyi | ✅ | `e244c39` | — |
| 7 | Overpass + Wikidata/Wikipedia | ✅ ilk sürüm | `67dfd61` | P14 derinleştirme |
| 8 | Site içi tur modeli (Efes) | ✅ ilk sürüm | `0cdd24e` | — |
| 9 | Sıra-duyarlı yakınlık anlatımı | ✅ ilk sürüm | `a7e43d4` | — |
| 10 | Erişim tipi duraklar + bacak modu | ✅ | `91f5ff3` | — |
| 11 | Yükseklik profili + bacak çizimi | ✅ | `0c60c6a`, #32, `5218fae` (profil), bacak çizimi bağlandı (2026-10-22) | canlıda görsel kontrol |
| 12 | Çevrimdışı saha paketi | ✅ ilk sürüm | `e57b61f`, P11 allowlist `f3c28e5` | P15 tile paketi |
| 13 | Moderasyon temeli | ✅ | `0e36583` (bildir, engelle, hesap silme) | — |
| 14 | Tazelik döngüsü | ✅ ilk sürüm | `b8ed369` | PR #38; karar (d): XP yok, rozet/takip Cloud Functions bekliyor |
| 15 | Hava durumu (durağa varış saati) | ✅ | `2d75a79` + gün rozeti + durak varış havası (RouteEditor) + harita katmanı | — |
| 16 | Grup + sohbet | ✅ temel | `75d7fd1`, #31 (tam kimlikle katılma) | T1-SOSYAL (PR #37); karar (g) açık |

**Ek tamamlananlar:** #31 üretim izin/undefined düzeltmesi · #32 P17 çekirdeği + bacaklı rota serileştirmesi · #33 T1-AUTH (telefon bayrağı, üretim env kapısı) · #36 P1 hijyen dokümanları · P11 tile allowlist (tam host/path) · P12 · P13 · P16 · P19.

## 3. Vizyon → kod boşluk haritası

| Vizyondaki yetenek | Durum | Eksik olan | Adım |
|---|---|---|---|
| Gidilen yerin rehberliği | Var; Overpass + Wikidata ilk sürümü ✅ (`67dfd61`) | 19 yerin 5'inde gerçek içerik; OSM yerleri jenerik not | 7 |
| Yaklaşınca tarihçe açılsın | ✅ Mekanizma + sıra-duyarlı anlatım (`a7e43d4`) | içerik + canlı OSM envanteri + sıra duyarlılığı | 7, 9 |
| Rota oluştur / gezi planla | Var ve güçlü | — | — |
| Hava durumu anlık takip | ✅ Durağa varış saatine göre (asistan + kayıtlı rota), harita katmanı, gün rozeti | — | 15 |
| Başkalarının gittiği yerler | Var; tazelik ilk sürümü ✅ (`b8ed369`) | kim/ne zaman gitti, tazelik | 13, 14 |
| **Başkalarının rotalarını kaydet + paylaş** | ✅ Var (`72001ac`, `5a6b666`, `e244c39`, #31) | `routes` koleksiyonu, paylaşım linki, kaydetme | 3, 5, 6 |
| **Yürüdüğüm yeri kaydet → otomatik rota** | ✅ Çekirdek var (`471f9f7`, #32) | kayıt kancası, durak tespiti, sadeleştirme, `tracks` | 3, 4 |
| **Site içi turlar (her tarihî alan)** | ✅ Efes modeli var (`0cdd24e`); diğer alanlar yok | site modeli, sıralı duraklar, patika geometrisi | 7, 8 |
| **Erişim rotaları (yol yok: park et, yürü, in)** | ✅ Var (`91f5ff3`, `0c60c6a`) | erişim tipi duraklar, bacak modu, yükseklik | 10, 11 |
| Çevrimdışı saha kullanımı | ✅ Saha paketi ilk sürümü (`e57b61f`); tile paketi yok | tile önbelleği | 12 |
| Kişisel gruplar + sohbet | ✅ Temel var (`75d7fd1`, #31) | grup/mesaj modeli, kurallar, maliyet kararı | 16 |
| Moderasyon | ✅ Temel var (`0e36583`) | bildir, engelle, sil | 13 |
| Bildirimler | İskelet | veri kaynağı, push | 13, 16 |

## 4. Dokunma listesi

- `src/components/MapView.tsx` içindeki **katman, tile, marker ve event mantığı** — `CHANGELOG.md` bu kodun değiştirilmediğini taahhüt ediyor. Ayrı onay gerekir.
- `firestore.rules` **gevşetilmez**; yalnız sıkılaştırılır.
- `storage.rules` kapalı kalır (tüm erişim `false`) — foto politikası Adım 3'te karara bağlanır.
- `as any`, `@ts-ignore`, `@ts-expect-error`, boş `catch` **eklenmez**.
- Testleri geçirmek için assertion zayıflatılmaz.
- Esri tile'ları toplu indirilmez / çevrimdışı önbelleğe alınmaz (lisans yasağı).

## 5. Sert kısıtlar (karar zorlayan gerçekler)

1. **Web'de arka plan konumu yok.** Tarayıcı, ekran kapalı ve sekme arka planda iken konum izleyemez. Yani "yürüyorsun, kendiliğinden anlatıyor" senaryosu **ekran açık** iken çalışır. Gerçek saha rehberi için native/Capacitor sarmalayıcı gerekir → karar (e).
2. **Firestore ücretsiz katman sınırlı** (günlük okuma/yazma kotası; yayına girmeden güncel değeri doğrula). Sohbet, mesaj başına okuma demek → **faturalı plan** gerekir → karar (g).
3. **Cloud Functions olmadan XP/rozet/takip çalışmaz** — kurallar istemci yazımını doğru şekilde engelliyor. Fonlanacaksa sunucu gerekir.
4. **`tracks`/`routes` ham GPS içerir = konum geçmişi.** Varsayılan gizli, yayın açık eylem, tek dokunuşla silme. Mevcut söz tutulmalı: *"Konumun otomatik olarak paylaşılmaz."*
5. **Overpass kullanım politikası** vardır: agresif sorgulama yok, sonuç önbelleğe alınır. Veri lisansı **ODbL**; Wikipedia metni **CC BY-SA** → atıf zorunlu (`dataSources` alanı bunun için var).
6. **Durak tespiti polyline'dan sonra yapılamaz** — `encodePolyline` zaman kodlamıyor. Tespit, kayıt sırasında tam çözünürlüklü veriyle yapılmalı.
7. **Yükseklik GPS'ten gelmiyor** — `GeoFix` yalnız `lng/lat/accuracy/timestamp` taşır. Tırmanış `terrain` raster-dem'den hesaplanır.

---

# FAZ A — Temel (önkoşul, özellik değil)

## Adım 0 · Depo temizliği ve kurulum kapısı
**≈1 saat · bağımlılık yok — ŞİMDİ YAPILABİLİR**

**Amaç:** 145 izlenen dosyanın 63'ü bayat bir kopya; her kod aramasını ve ajan okumasını kirletiyor (bu dosyayı yazarken yapılan aramalara `satellite-map-web-application (1)/src/...` sonuçları karıştı). Ayrıca iki doküman var olmayan `.env.example`'ı işaret ediyor, kurulum 3. adımda duruyor.

**Yapılacak:**
```bash
# 0.1 Kopyayı silmeden ÖNCE asıl ağaçla karşılaştır
diff -rq "satellite-map-web-application (1)/src" src

# 0.2 Kopya klasör ve zip'i git'ten çıkar
git rm -r "satellite-map-web-application (1)"
git rm satellite-map-web-application.zip
printf '\n# Arşiv kopyaları\nsatellite-map-web-application*\n' >> .gitignore
```
- **0.3** `.env.example` yaz (6 değişken, değersiz, kısa açıklamalı).
- **0.4** `README.md` doldur: kurulum, env tablosu, mimari, veri modeli, komutlar, kural deploy, doğrulama sınırları.
- **0.5** `AUTH_SETUP.md` 3. adımı ve `CHANGELOG.md` referansını gerçek dosyaya bağla.
- **0.6** `package.json`: `name` hâlâ `react-vite-tailwind` → `atlasia`; `description`/`engines`/`packageManager` ekle.

**Bitti kanıtı:**
```bash
git ls-files | wc -l        # ~82
test -f .env.example && grep -c VITE_ .env.example   # 6
```
**Commit:** `chore: kopya arsivi kaldir ve kurulum dosyalarini tamamla`

## Adım 1 · Sözleşmeyi dondur
**1–2 gün · bağımlılık: Adım 0**

**Neden:** Son 15 commit'te 9 `fix` / 5 `feat` — düzeltme oranı özelliği geçmişse sözleşme borcu birikmiş demektir. Ve `firestore.rules` 5 gündür istemciyle çelişiyor, kimse fark etmedi çünkü hiçbir otomatik kontrol yok.

**1.1 Arama ekseni** — bu checkout'ta `src/utils/geo.ts` Photon extent'ini zaten `[west, south, east, north]` olarak doğrudan geçiriyordu; ters sıralama regresyonu mevcut değildi. `toSearchResult` dikişi ve bbox sırası testleri eklendi; `MapView.tsx` değiştirilmedi.
**1.2 Beğeni sözleşmesi** — `likes` seed/taban olarak kalır; kullanıcı üyeliği `likedBy` içindedir. Toplam `src/utils/likes.ts` → `totalLikes(post)` ile hesaplanır; Firestore toggle yalnız `likedBy` üzerinde `arrayUnion`/`arrayRemove` dönüşümü uygular.
**1.3 Yanıt yazımı** — seçilen modelde her yanıt `posts/{id}/replies/{replyId}` alt koleksiyonuna ayrı belge olarak yazılır; create kuralı yazar UID'sini doğrular.
**1.4 Yanıtlar dizi mi alt koleksiyon mu** — karar (a): **alt koleksiyon seçildi**; eski gömülü yanıtlar okuma uyumluluğu için normalize edilir, yeni yazımlar alt koleksiyona gider.
**1.5 Story `seen`'i kaldır** — tamamlandı: Firestore payload/type/rules alanından çıkarıldı; UI cihaz bazlı liste kullanır.
**1.6 Ölü sosyal katman** — eski `awardXp`/`addBadge`/`followUser` API ailesi bu checkout'ta yok; bunları yeniden tanıtma. İleride yeni yardımcı eklenirse çağrı sahibi ve ürün kararı netleştirilip deprecated durumu ayrıca tanımlanır.
**1.7 Feed'e tavan** — tamamlandı: gönderi/stories cursor sayfaları 50 kayıtla sınırlı; yanıt sorgusu 100 kayıtla sınırlı.
**1.8 Kuralları sıkılaştır** — tamamlandı: gönderi root shape'inde `replies` kabul edilmez; post update yalnız `likedBy` toggle'ı; replies bounded public read, doğrulanmış authenticated create, immutable update denial ve author/post-owner delete.
**Bitti kanıtı:** `npx tsc --noEmit` (0 hata) · `rg -n "likes:.*\?\?" src` (boş) · `rg -n "awardXp|followUser" src/hooks src/components` (boş). Rules emulator sonucu Java 21 runtime'ı olan ortamda tamamlanmalı.
**Commit:** `eede957 fix: freeze Firestore social data contracts`

## Adım 2 · Kanıt: test + CI
**1 gün · bağımlılık: Adım 1 · EŞİK — bu bitmeden özellik başlamaz**

**Neden:** 5 günde 46 commit, sıfır test. `CHANGELOG.md` ısrarla "MapView değiştirilmedi" diyor; "dokunma" kuralı + test yokluğu birleşince hatalar donup kalıyor — `geo.ts` eksen hatası böyle 5 gün hayatta kaldı.

**2.1 Dikiş aç:** `searchWorld` içindeki feature→`SearchResult` dönüşümünü `export function toSearchResult(feature, query)` yap. Hata o closure'ın içinde saklı olduğu için görünmedi.
**2.2** `vitest` + `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`.
**2.3 Test listesi:**

| Dosya | Kilitlediği |
|---|---|
| `geo.test.ts` | Photon `extent` doğrudan geçer; `bbox[1] < bbox[3]` — **regresyon kilidi** |
| `geo.test.ts` | `haversineKm(41.0082,28.9784, 39.9334,32.8597)` ≈ 351 km (fark <2 km) |
| `likes.test.ts` | `totalLikes` = `likes` + benzersiz `likedBy` |
| `time.test.ts` | `isStoryAlive` 24 saat sınırı; `storyRemaining` sonrası `null` |
| `polyline.test.ts` | `decodePolyline(encodePolyline(c))` → `c` (1e-5) |
| `routePlanner.test.ts` | `reorderRoute` mesafeyi artırmaz; `nearbyPlaces` yarıçapı; `validPlace` sınırları |
| `sun.test.ts` | `goldenHourWindow` doğuş < batış; kutup durumu boş |

**2.4 CI:** `.github/workflows/ci.yml` Node 22'de `npm ci`, audit, typecheck, lint, `npm test`, credential-free owner-index Node tests, Firestore Rules emulator tests ve build'i çalıştırır; push kapsamı `main` ve `arena/**`, ayrıca PR'dır.

**Bitti kanıtı:** `npm test` ve `npm run build` yerelde geçti. Branch CI run `39333404281` (SHA `9c79726372f7d7dcc915f32729af1eb22c22649c`) tüm adımlarda yeşil; Rules emulator dahil.
**Commit:** `f17d1b7 test: gate geo time and solar contracts in CI`

---

# FAZ B — Paylaşım altyapısı (vizonun önkoşulu)

## Adım 3 · `routes` + `tracks` nesne modeli ve kurallar
**⛔ karar (b) ve (c) gerekli · 2 gün · bağımlılık: Adım 2**

**Neden burada:** Vizyondaki "başkalarının rotalarını kaydet + paylaş" ile "yürüdüğümü kaydet" **aynı koleksiyona** ihtiyaç duyuyor. Bugün `AtlasRoute` hiç Firestore'a yazılmıyor, `useCollections` yalnız localStorage'a yazıyor — yani kaydedilen rota cihaza hapsolmuş.

**Model:**
```
users/{uid}/savedPlaces/{placeId}     — kaydedilen yerler (özel)
tracks/{trackId}                      — kayıt: özel, ham (sadeleştirilmiş) polyline,
                                        zamanlı duraklar, doğruluk istatistikleri
routes/{routeId}                      — yayınlanabilir rota: authorUid, visibility,
                                        AtlasRoute gövdesi, saveCount
```
**Kurallar:** `tracks` yalnız sahibi okuyup yazar. `routes` görünürlük alanına göre okunur (`private` / `unlisted` / `public`), yalnız sahibi yazar/siler. `savedPlaces` yalnız sahibi.

**Bitti kanıtı:** İki cihaz, aynı hesap, aynı kayıtlı rota. `firebase deploy --only firestore:rules` sonrası kurallar console'da görünür.
**Commit:** `feat: rota ve iz nesnelerini hesaba bagla`

## Adım 4 · İz kayıt → taslak rota *(vizonun arz motoru)*
**3–4 gün · bağımlılık: Adım 3 · en yüksek stratejik değer**

**Neden:** Vizyondaki her içerik ihtiyacının (site rotaları, erişim bilgisi, tazelik, topluluk rotaları) arz kaynağı yok. Yürüyüp kaydetmek kullanıcıyı **arz kaynağı** yapar; diğer özellikleri pahalılaştırmayan tek fikir bu.

**Yapılacak:**
- **Yeni `src/hooks/useTrackRecorder.ts`** — `useGeolocation` **kullanılmaz** (§7 Antipattern B). Kendi `watchPosition` çağrısı, `enableHighAccuracy: true`, `maximumAge: 0`, **hiçbir noktayı atmaz**; array `useRef`'te, canlı önizleme için saniyede bir state.
- **Durak tespiti (dwell)** — kayıt sırasında, tam çözünürlüklü veriyle (§5.6): yarıçap ~40 m (doğruluğa ölçekli) içinde **≥3 dk** kalan ardışık noktalar; kümeler birleştirilir; her durağa `t_start`/`t_end`/merkez.
- **Sadeleştirme** — Douglas–Peucker ~5–8 m → `encodePolyline` → `RouteDay.polyline`.
- **Mesafe sadeleştirilmiş izden** ölçülür; ham jitter toplamı %20–100 şişirir.
- **Canlı çizim** — `mapRef.current.drawRoute(coords, true)` (bu API zaten var).
- **Durak isimlendirme** — `reverseName()` (var, önbellekli) → yedek "Durak N"; daha iyisi Adım 7'nin envanteri.
- **`aiReason` dürüst olmalı:** *"Senin kaydından: burada 12 dakika durdun"* — uydurma gerekçe yok.
- **Pil:** 3–5 sn'de bir örnekle, hareketsizken duraklat, kullanıcıyı uyar (ekran açık kalmak zorunda).

**Bitti kanıtı:** Gerçek cihazda 1 km yürü, kaydı bitir; mesafe makul (±%15), duraklar doğru, polyline haritada görünüyor, `tracks` dokümanı oluştu.
**Commit:** `feat: yuruyus kaydi ve durak tespiti`

## Adım 5 · Rotayı düzenle, yayınla, paylaş
**2 gün · bağımlılık: Adım 4**

**Yapılacak:** Kayıttan gelen taslak → kullanıcı isim, fotoğraf, not ekler → görünürlük seçer → yayınlar. `routes` dokümanı oluşur. Kalıcı paylaşım linki (`AtlasRoute` serileştirilebilir: günler, duraklar, polyline, mesafe, hava notu).
**Kural:** otomatik yayın **yok**. Ham iz asla kendiliğinden paylaşılmaz (§5.4).
**Bitti kanıtı:** Yayınlanan rota ikinci bir hesapta link ile açılıyor ve kaydedilebiliyor.

## Adım 6 · Rota keşif yüzeyi
**2 gün · bağımlılık: Adım 5**

**Yapılacak:** Feed şu an post/story; rotalar için ayrı keşif akışı: bölge, süre, tema, kaydetme sayısı. "Kaydet" eylemi `users/{uid}/savedRoutes`.
**Bitti kanıtı:** Başkasının rotası listeleniyor, açılıyor, kaydediliyor, kaydedilenler `RecordsDock`'ta görünüyor.

---

# FAZ C — İçerik boru hattı (site ölçeği)

## Adım 7 · Overpass envanteri + Wikidata/Wikipedia tarihçesi
**3 gün · bağımlılık: Adım 2 · karar (f)**

**Neden:** "Her tarihî alan" elle yazılamaz (`placeAdvice`: 19 alias, 5 içerik). Ve mevcut Photon metin araması mekânsal sayım yapamaz — bu yüzden `noteFor()` jenerik feragatname üretiyor, yani bir anıtın yanında tarihçe değil uyarı okunuyor.

**Zincir:**
```
Overpass  →  node|way|relation["historic"](around:R,lat,lng)
             (geometri + wikidata/wikipedia etiketleri)
              ↓
Wikidata / Wikipedia geosearch  →  tarihçe metni
```
**Kod tarafı:** `src/utils/openMapPlaces.ts` içinde `fetchOpenMapPlaces`'in **yanına** mekânsal bir `fetchHistoricSites(center, radius)` ekle (Photon aramasını değiştirmeden; o yol da kalsın). `usePlaceGallery.ts` **zaten** Wikimedia Commons'a yarıçaplı sorgu atıyor (`generator=geosearch`, `ggsradius=500`) — aynı desen.
**Zorunlu:** `cache` deseni korunur; Overpass'a nazik davranılır; atıf `dataSources`'a yazılır ("OpenStreetMap contributors", "Wikipedia / CC BY-SA").
**Bitti kanıtı:** Efes koordinatında 15+ gerçek anıt, her birinde ad + özet metin.

## Adım 8 · Site içi tur modeli
**2–3 gün · bağımlılık: Adım 7**

**Neden:** Bölge motoru site ölçeğinde çalışmaz (§7 Antipattern A) ve çalışmasına gerek yok — sıra bilinen bir turdur.

**Yapılacak:** `site` kavramı: bir yerin **içindeki** sıralı duraklar, giriş/çıkış noktaları, ziyaret süresi, patika geometrisi. **`AtlasRoute` şekli kullanılır, yeni tip yazılmaz** (`startTime`/`endTime`/`durationMinutes`/`description`/`aiReason`/`tips`/`polyline` zaten yeterli). Sıra **editör tarafından yazılır**; motorun rolü yok.
**Gerçek geometri:** elle çizilmiş polyline (site içi ~2 km, yapılabilir) veya yaya profilli yönlendirme (OSRM/Valhalla + OSM `footway`). Düz çizgi + 1.25 katsayısı burada yanıltıcı.
**Bitti kanıtı:** Efes için 3 saatlik tur; durak saatleri, giriş kapısı ve çıkış noktası tanımlı; haritada gerçek patika görünüyor.

## Adım 9 · Yakınlık anlatımını besle ve sıra-duyarlı yap
**2 gün · bağımlılık: Adım 8**

**Mevcut durum:** `NearbyAudioGuide` zaten çalışıyor (eşik `max(50, min(120, accuracy+30))`, `speechSynthesis` tr-TR, otomatik oynatma yok). Eksik: içerik ve canlı envanter.
**Yapılacak:** `guideText()` zinciri Adım 7 içeriğini kullanır; rehber yalnız uygulamadaki yerleri değil, çevredeki envanteri de tarar. Sahada gerçek: anıtlar 20–40 m arayla, eşik 120 m'ye çıkıyor → **yanlış anıt tetikler.** Çözüm: rotada sıradaki durak öncelikli, yarıçap 35–50 m, girme/çıkma yarıçapı ayrı (histerezis).
**Bitti kanıtı:** Sıralı turda yürürken doğru durağın anlatımı öneriliyor; titreme yok.

---

# FAZ D — Saha ve erişim

## Adım 10 · Erişim tipi duraklar + bacak modu
**3 gün · bağımlılık: Adım 5**

**Neden:** "Yol yok, arabayı buraya park et, buradan yürü, aşağı in" mevcut modelde ifade edilemez.

| Eksik | Yer | Sorun |
|---|---|---|
| Erişim tipleri | `Place["category"]`, `StopType` | `parking`, `trailhead`, `descent`, `water` yok |
| Bacak modu | `TransportMode` | `trail` / `offroad` yok |
| Bacak bazlı mesafe | `distanceBetween = haversine × 1.25` | tek global katsayı; patikasız iniş modellenemez |
| Hız | `SPEED.walking = 4` | patikasız inişte ~2 km/h → süre iki kat yanlış |

**Yapılacak:** `RouteLeg { coords, mode, elevationGain? }` kavramı; moda göre hız tablosu; sapma katsayısı bacağa taşınır. Park yeri bir *yer* olarak modellenir (kapasite, ücret, saat, "son 200 m toprak").
**Bitti kanıtı:** "Park et → patika → iniş" rotası üretilebiliyor ve süresi makul.

## Adım 11 · Yükseklik profili + bacak bazlı çizim
**2 gün · bağımlılık: Adım 10**

**Neden ucuz:** `terrain` raster-dem kaynağı **zaten var**, rota motoruna bağlanmamış.
**Yapılacak:** Rota boyunca örnekleme → toplam tırmanış, en dik eğim, Naismith süresi. `drawRoute` şu an tek çizgi (`#F2D77C`, 3.2); `coords[]` yerine **bacak listesi** alır, her bacağa `mode` özelliği koyar, MapLibre data-driven styling ile patika kesikli / yol düz.
**Bitti kanıtı:** Profil grafiği + haritada mod ayrımı görünüyor.
**Durum (2026-10-22, koda göre):** Profil bağlı — `RouteEditor` içindeki `RouteElevationPanel` (`5218fae`) karo tabanlı DEM örnekler; tırmanış, en dik eğim ve Naismith süresi gösterilir, DEM yoksa "bilinmiyor". Haritada mod ayrımı bağlandı (kullanıcı onayı 2026-10-22): her günün bacağı varsa `drawAtlasRoute` → `drawRouteLegs`, yoksa düz çizgi (`utils/routeLegs.routeDrawLegs`). Artan bacak katmanları temizlenir; sıra değişince eski bacaklar düşer. **Kalan:** canlıda görsel kontrol (sandbox'ta tarayıcı yok).

## Adım 12 · Çevrimdışı saha paketi
**2 gün · bağımlılık: Adım 2**

**Neden:** `public/sw.js` kabuğu önbelleğe alıyor ama **maplibre tile'larını almıyor** — internet kesilince harita boş geliyor. Bu uygulamanın doğal kullanım yeri zaten sinyalsiz yer.
**Yapılacak:** Raster tile cache (stale-while-revalidate + LRU boyut sınırı) + "bu bölgeyi çevrimdışı indir" + kota göstergesi.
**Yasak:** Esri Wayback buraya bağlanmaz (lisans).
**Bitti kanıtı:** Uçak modunda harita kaydırılabiliyor, pinler görünüyor.

---

# FAZ E — Topluluk ve uyum

## Adım 13 · Moderasyon temeli *(grup/sohbetten ÖNCE)*
**3 gün · bağımlılık: Adım 6**

**Neden zorunlu:** Bugün `report`/`block`/`ban` yok ve `firestore.rules` `users` için `delete: if false` diyor → **hesap silinemiyor.** Grup ve sohbeti bunlar olmadan açmak mümkün değil (mağaza + KVKK/GDPR).
**Yapılacak:** İçerik bildirimi, kullanıcı engelleme, hesap silme (kendi verisinin silinmesi), gizlilik/kullanım metinleri, bildirim altyapısının ilk hali (`App.tsx` paneli boş duruyor).
**Bitti kanıtı:** Kullanıcı hesabını silebiliyor, verisi kalkıyor; içerik bildirilebiliyor.

## Adım 14 · Tazelik döngüsü (ve XP'nin gerçek işi)
**3 gün · bağımlılık: Adım 13 · karar (d)**

**Neden:** Uygulama kendi itiraf ediyor: *"Ücret doğrulanmadı"*, *"açılış saatleri doğrulanmadı"*. Eksik olan daha fazla yer değil, **bilginin hâlâ doğru olduğunu gösteren döngü**.
**Yapılacak:** Ziyaret sonrası tek dokunuş doğrulama ("hâlâ açık / ücret şu / yol kapalı") + her iddianın yanında zaman damgası (*"3 kişi son 2 ayda doğruladı"*) + rota motorunun taze veriyi tercih etmesi. **XP/rozet/takip burada fonlanır** (Cloud Functions gerekir — §5.3): puan değil **güven sinyali**.
**Neden güçlü:** Tazelik küçük bölgede tutulur, dünyada tutulamaz → lansman kamasıyla (KKTC) birbirini güçlendirir.
**Bitti kanıtı:** Bir yerin tazelik tarihi görünüyor ve rota motoru taze durağı öne alıyor.

## Adım 15 · Hava durumunu derinleştir
**2 gün · paralel yürüyebilir · bağımlılık: Adım 2**

**Mevcut:** `AtlasAssistant` tek nokta için `current=precipitation` çekiyor, 4,5 sn timeout.
**Yapılacak:** Saatlik + günlük (open-meteo, keyless), **her durağın varış saatindeki** hava, harita katmanı, uyarı. `RouteBrief.rain: "auto"` ve `ROUTE_ALTERNATIVES`'teki "Yağmur planı" zaten tanımlı ama kullanılmıyor.
**Bitti kanıtı:** Rota duraklarında varış saatine göre hava görünüyor; yağmur planı çalışıyor.
**Durum (2026-10-22, koda göre):** Asistan rotasında `rain: "auto"` açık; `optimizeForRain` → `attachStopWeather` ile her durakta "Varışta: sıcaklık · durum · yağış olasılığı" görünür. Harita hava katmanı (`utils/mapWeather`) ve `RouteEditor` gün bazlı kötü hava rozeti var. Kayıtlı rotada durak bazlı varış havası da bağlandı (`routeStopArrivalWeather`, en çok 40 durak, 10'luk istekler). **Kalan:** yok.

## Adım 16 · Grup + sohbet *(en son)*
**⛔ karar (g) gerekli · 4+ gün · bağımlılık: Adım 13**

**Neden en son:** En pahalı, en yüksek riskli ve önkoşulu en çok olan özellik. Mesaj başına okuma → **faturalı plan** (§5.2). Moderasyon olmadan (§13) açılamaz.
**Karar (g) seçenekleri:** (1) Firestore gerçek zamanlı (basit, maliyet mesajla büyür), (2) Realtime Database (sohbet için daha ucuz okuma), (3) üçüncü taraf (hazır, ama veri dışarıda). Karar verilmeden kod yazılmaz.
**Bitti kanıtı:** İki kullanıcı bir grupta mesajlaşıyor; engelleme ve bildirim çalışıyor.

---

## 7. Antipattern listesi (ajanların tekrarlamaması gereken yollar)

**A · Site ölçeğinde `planRoute` kullanmak.** Çıktısı: düz çizgi, 60 dk sabit duraklar, 7 durak tavanı, taban 3 km yarıçap. Ephesus'ta 15 anıtı 15 saate yayar. Site turu **yazılır**, hesaplanmaz.

**B · İz kaydı için `useGeolocation` kullanmak.** Kanca tek ve en iyi ölçüm için tasarlandı: 18 sn sonra kapanır, 20 m'de erken biter, daha kötü ölçümleri **atar**. Kayıt için üçü de yanlış. Ayrı `useTrackRecorder` yazılır.

**C · Polyline'dan durak/süre türetmek.** `encodePolyline` yalnız `[lng, lat]` kodlar; zaman yok. Tespit kayıt sırasında yapılır.

**D · Ham GPS noktalarının haversine'ini toplamak.** Jitter mesafeyi %20–100 şişirir. Sadeleştirilmiş izden ölç.

**E · OSM yerlerinin notunu tarihçe sanmak.** `noteFor()` bir feragatname üretir. Tarihçe Adım 7'den gelir.

**F · `as any`, boş `catch`, test assertion'ı zayıflatma.** Depo `strict`, `noUnusedLocals`, `noUnusedParameters` ile derleniyor; bu çizgi korunur.

## 8. Karar bekleyenler (⛔)

| # | Karar | Seçenekler | Etkilediği adımlar | Geri dönüş maliyeti |
|---|---|---|---|---|
| a | Yanıtlar: dizi mi alt koleksiyon mu | **Seçildi:** `posts/{id}/replies` | 1, 7 | orta — uygulandı; eski gömülü değerler yalnız okuma uyumluluğu |
| b | Fotoğraf depolama | (1) data URL kalır (2) nesne depolamaya geç | 3, 6, 12 | yüksek — feed sorgusu + kural + yükleme birlikte değişir |
| c | Koleksiyon senkronu | **Uygulandı (2):** `useCollections` + `subscribeSavedCollections`, `users/{uid}/savedPlaces\|savedRoutes` — **kullanıcı onayı bekliyor** | 3, 6 | orta — veri biriktikçe pahalanır |
| d | XP/rozet/takip | **Kullanıcı kararı (2026-10-22):** XP kaldırılacak; rozet ve takip kalacak (fonlaması Adım 14, Cloud Functions) | 14 | yüksek — ölü kod her okumada yanlış izlenim verir |
| e | Saha rehberi | **Kullanıcı kararı (2026-10-22):** ikisi de — önce web/PWA, sonra native uygulama (Capacitor) | 9, 12 | yüksek — arka plan konumu web'de yok |
| f | İçerik kaynağı | (1) Overpass + Wikidata/Wikipedia (2) elle içerik (3) LLM özeti | 7, 9, 14 | orta — lisans/atıf yükümlülüğü doğar |
| g | Sohbet altyapısı | (1) Firestore (2) Realtime Database (3) üçüncü taraf | 16 | yüksek — maliyet mimarisi |

## 9. Bilinen borçlar (defter)

| Borç | Kaynak | Etki |
|---|---|---|
| Yerel Firestore emulator komutu Java 21 ister | Java 21 runtime bu sandbox'ta kurulu değil | GitHub Actions run `39333404281` Java 21 ile Rules emulator suite'ini geçti; yerel sınırlama `teslimat-p1.md` içinde kayıtlı |
| Bağımsız aynı-candidate audit bekliyor | kullanıcı no-deploy/no-bypass gate | üretim dağıtımı veya audit bypass yapılmadı |
| Eski gömülü reply verisi Firestore'da kalabilir | yeni kontrat alt koleksiyon | normalize edilir; bu işin otomatik prod veri migrasyonu/deploy'u yok |
| Yol çizgileri yol navigasyonu değildir | routePlanner mevcut davranışı | kullanıcıya gerçek yol/navigasyon gibi sunulmamalı |
| ~~Rotalar ve kayıtlı koleksiyonlar localStorage'da~~ ✅ | Adım 3 uygulandı (`routes`, `users/{uid}/savedPlaces\|savedRoutes`) | Firebase yapılandırmasında cihazlar arası senkron çalışır; yalnız yerel modda localStorage yedeği kalır |
| ~~Moderasyon yok~~ ✅ | Adım 13 uygulandı (`0e36583`) | bildir/engelle/hesap silme main'de |
| Sokak/topoda çakışan etiket riski | doğrulanmadı | aynı bölge iki adla yazılabilir |

## 10. Değişiklik geçmişi

| Tarih | Sürüm | Değişiklik |
|---|---|---|
| 2026-10-14 | v1 | İlk sürüm: denetim/onarım eksenli sıra (Adım 0–8), kanıtlanmış durum tablosu |
| 2026-10-14 | v2 | Ürün tezi netleşti (topluluk uygulaması): sosyal katman silinmiyor, fonlanıyor. `routes`/`tracks` nesneleri, iz kaydı (arz motoru), site ölçeği, içerik boru hattı (Overpass+Wikidata), erişim bacakları, çevrimdışı saha paketi, moderasyon ve sohbet eklendi. Antipattern listesi, sert kısıtlar ve 7 karar maddesi çıkarıldı |
| 2026-10-22 | v3 | #31 üretim izin düzeltmesi, #32 P17 çekirdeği (onaylı kaydet açık), #33 T1-AUTH (telefon bayrağı, üretim env kapısı). Açık: P14 içerik hattı, P15 çevrimdışı paket, P18 erişilebilirlik, P20 paylaşım linki, T1-SOSYAL |
| 2026-10-22 | v3.1 | Tamamlanan adımlar ve işler §2.5'te işaretlendi (commit ataları doğrulandı); süren P1–P4 işleri işaretlenmedi |

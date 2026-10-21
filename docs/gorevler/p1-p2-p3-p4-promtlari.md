# P1–P4 · Kodcu Prompt'ları (teker teker)

> Bu dört görev **tamamlanmıştır**; kanıtları `teslimat-p1.md` … `teslimat-p4.md`
> içindedir. Aşağıdaki prompt'lar her görevin ne istediğini bilmek, kayıt ve
> gerekirse bağımsız yeniden-doğrulama içindir — **tamamlanmış işi tekrar
> çalıştırmak için değil.** Yeni iş, P12+ listesindedir
> ([`p-serisi-uzun-vadeli.md`](p-serisi-uzun-vadeli.md)).
>
> Her prompt tek başına kopyalanabilir. Blok dışı italik satırlar insan
> okuyucu içindir (ne ürettiği).

---

## P1 — Temel & Kapanış (Faz A: Adım 0→2)

*Üretti: temiz repo/kurulum kapısı, donuk veri kontratları, test+CI kapısı. Kanıt: `teslimat-p1.md`.*

```text
Atlasia deposunda (React 19 + Vite + Firebase PWA) çalışıyorsun.
GÖREV: P1 — TEMEL & KAPANIŞ (ROADMAP Faz A). Önce ROADMAP.md ve
AGENTS.md'yi oku; repo durumunu `git status --short --branch` ile doğrula,
kirli dosyaları ezme. Her adım ayrı mantıksal commit; main'e commit yok;
kullanıcı onayı olmadan push/PR/merge/deploy yok.

ADIM 0 — depo ve kurulum kapısı:
- Kopya ağaç/zip kalıntılarını kanıtla; varsayım olmadan tahminle dosya
  silme. Arşiv kalıntıları için ignore kuralı ekle.
- Paket kimliği: package.json + lockfile adı `atlasia`.
- .env.example: yalnız boş değerli VITE_ değişkenleri (sır koyma).
- README: kurulum, env, veri modeli, test ve dağıtım sınırları; gerçek
  AUTH_SETUP.md ve CHANGELOG.md bağlantıları.
- repo hijyen testiyle kilitle (kimlik, env satır sayısı, README bağları).

ADIM 1 — veri kontratlarını dondur:
- Beğeni: seed/base + benzersiz `likedBy`; Firestore toggle yalnız atomik
  array transform yazar (read-modify-write yok).
- Yanıtlar: `posts/{postId}/replies/{replyId}` alt koleksiyonu;
  `authorUid == request.auth.uid`, reply update kapalı, owner/author delete.
- Story `seen` alanı Firestore şemasından çıkar; UI cihaz bazlı
  `atlasia.feed.seen.v1` kullanır.
- Feed/story sayfaları 50, yanıt sayfaları 100 kayıtla sınırlı; cursor
  tabanlı yükleme.
- Photon dönüşümü `toSearchResult` saf fonksiyonu; bbox eksen sırası
  `[west,south,east,north]` doğrudan korunur (regresyon testi zorunlu).

ADIM 2 — kanıt: test + CI:
- geo/time/polyline/routePlanner/sun/likes birim testleri.
- `ensure-owner-places-index` credential-free: node --test ile sahte-IO
  testleri (manifest doğrulama, idempotence, bozuk JSON yan etkisiz hata).
- App Check yapılandırması + birim testi.
- GitHub Actions: Node 22 ile typecheck, lint, unit testler, owner-index
  testi ve Firestore Rules emulator testi koşsun.

KABUL (kanıtla): npm ci sonrası typecheck/lint/test:run/build yeşil;
rules emulator ortamda koşamıyorsa engeli (Java 21 yokluğu vb.) kanıtıyla
yaz — çalıştırmadan "geçti" deme. Karar gereken yerde (AGENTS.md çelişkisi)
dur. Teslim: `teslimat-p1.md` (commit dizisi, komut çıktıları, açık
noktalar) + sonda `git diff --check` ve `git status --short`.
```

---

## P2 — Rota Motoru (Faz B: Adım 3→6)

*Üretti: `routes`/`tracks` nesne modeli, iz kaydı→taslak rota, düzenle/yayınla/paylaş, rota keşif yüzeyi. Kanıt: `teslimat-p2.md`.*

```text
Atlasia deposunda (React 19 + Vite + MapLibre + Firebase PWA) çalışıyorsun.
GÖREV: P2 — ROTA MOTORU (ROADMAP Faz B, Adım 3→6, adım başına tek commit).
Önce ROADMAP §2.4, §5 sert kısıtlar ve AGENTS.md'yi oku;
`git status --short --branch` ile başla, kirli dosyaları ezme.
MapView.tsx katman/tile/marker/event mantığı kilitli — dokunma;
çizim mevcut public API üzerinden. Push/PR/merge/deploy kullanıcı onayı ister.

ADIM 3 — `routes` + `tracks` nesne modeli ve kurallar:
- Tipler: AtlasRoute / AtlasTrack; veri işlemleri src/lib/routeData.ts.
- `users/{uid}/savedPlaces` ve `savedRoutes` canlı senkron (karar (c));
  Firebase hazırken localStorage'a yazılmaz.
- `routes/{routeId}`: authorUid, visibility, route, saveCount, createdAt,
  updatedAt. `tracks/{trackId}` yalnız sahibi okur/yazar/siler.
- Görünürlük: private varsayılan; unlisted yalnız doğrudan bağlantı;
  public keşif sorgusunda. Yayın açık kullanıcı eylemi.
- Karar (b): foto Firestore JPEG data URL; istemci sıkıştırma ≤180.000
  karakter; Storage/Blaze/Functions yok.
- firestore.rules: sıkı alan beyaz listeleri; saveCount yalnız ilgili
  UID'nin savedRoutes create/delete'i ile aynı atomik işlemde.

ADIM 4 — iz kaydı → taslak rota:
- useTrackRecorder kendi watchPosition akışını kullanır; useGeolocation
  çağrısı yok. Noktalar kayıt süresince tam çözünürlük bellekte; dwell her
  callback'te işlenir (polyline sonrası tespit YASAK — zaman kodlanmıyor).
- Dwell ≥ 3 dk, doğruluk ölçekli 40–100 m yarıçap; Douglas–Peucker 7 m;
  mesafe sadeleştirilmiş polyline'dan; UI önizleme sn'de 1.
- Kayıt sonu: özel tracks dokümanı + dürüst metinli taslak rota.

ADIM 5 — düzenle, yayınla, paylaş: isim, açıklama, bölge (kullanıcının
girdiği filtre metni; konumdan otomatik bölge çıkarma yok), data URL kapak;
açık görünürlük seçimi; kalıcı `/?route={id}` bağlantısı uygulama
açılışında Firestore'dan yüklenir.

ADIM 6 — keşif yüzeyi: RecordsDock içinde kayıtlı yer/rota, açık rota
keşfi (bölge/süre/tema + kayıt sayısı), özel iz listeleme; rota/iz silme.
Kendi rotası sahibinindir; başkasının rotası çıkarılınca yalnız referans silinir.

KABUL (kanıtla): typecheck/lint/test:run/build/audit:check yeşil; koşulamaz
kontroller (rules emulator/Java, iki-hesap saha testi, gerçek cihaz GPS
yürüyüşü) teslimatta açıkça "yapılamadı" yazılır — uydurma kanıt yok.
Teslim: `teslimat-p2.md` + `git diff --check` + `git status --short`.
```

---

## P3 — İçerik & Saha (Faz C+D: Adım 7→12)

*Üretti: Overpass envanteri, Efes site turu, sıra-duyarlı yakınlık anlatımı, erişim bacakları, yükseklik profili, çevrimdışı saha paketi. Kanıt: `teslimat-p3.md`.*

```text
Atlasia deposunda (React 19 + Vite + MapLibre + Firebase PWA) çalışıyorsun.
GÖREV: P3 — İÇERİK & SAHA (ROADMAP Faz C+D, Adım 7→12, adım başına tek commit).
Önce ROADMAP §5 sert kısıtlar, §7 antipatternler ve AGENTS.md'yi oku;
`git status --short --branch` ile başla. Karar önceliği:
ücretsiz (Blaze/Functions/ücretli asla) > ürün tezi > geri alınabilir > en sıkı.
MapView.tsx kilitli: Adım 11'deki bacak çizimi ayrı onay gerektirir —
onaysız dokunma, gerekliyse teslimata "onay gerektiren" olarak listele.
firestore.rules/storage.rules dokunulmaz. Push/PR/merge/deploy onaysız yok.

ADIM 7 — Overpass envanteri + Wikidata/Wikipedia tarihçesi (karar (f)=(1)):
- Sorgu sınırı: yarıçap 200–2000 m, timeout 25, sonuç ≤60, paralellik 3;
  agresif sorgu yok. Önbellek: localStorage 7 gün + bellek 30 dk, LRU 20 giriş.
- OSM `note` tarihçe değildir (feragatname); `story` Wikipedia özeti.
- Lisans: ODbL + CC BY-SA atıfı `dataSources` ile zorunlu, silinmez.

ADIM 8 — site içi tur modeli: AtlasRoute şekli yeniden kullanılır (yeni
tip yok; legs opsiyonel). Site turu yazılır, hesaplanmaz — planRoute
çağrılmaz. Geometri elle çizilmiş footway polyline; Efes 3 saat fixture'ı
referans kanıtıdır.

ADIM 9 — yakınlık anlatımı, sıra-duyarlı: giriş eşiği 35–50 m, çıkış
+20 m histerezis (anıtlar 20–40 m arayla; 120 m eşik yanlış tetikler).
Anlatım önce `currentIndex+1`, sonra upcoming sırası. Web'de arka plan
konumu yok — ekran açık şartı kullanıcıya görünür (karar (e)=(1)).

ADIM 10 — erişim tipi duraklar + bacak modu: kategoriler parking,
trailhead, descent, water; TransportMode'e trail/offroad; bacak hız
tablosu walking 4, trail 3, descent/offroad 2 km/sa; katsayılar bacağa bağlı.

ADIM 11 — yükseklik profili + bacak bazlı çizim: yükseklik GPS'ten gelmez;
terrain raster-dem (terrarium) + queryTerrainElevation. drawRouteLegs her
bacağı ayrı katmanda mod rengi/dash ile çizer; eski drawRoute korunur.

ADIM 12 — çevrimdışı saha paketi: `atlasia-tiles-v1`, en çok 500 tile,
stale-while-revalidate + LRU; prefetch zoom 12–15, batch 4 + bekleme.
Esri (server.arcgisonline.com) lisans yasağı — asla cache'e yazılmaz.
storage.estimate() + tile sayısı gösterimi.

KABUL (kanıtla): her adımda ilgili birim testleri; sonda typecheck/
test:run/build yeşil. MapView değişiklik listesi, dürüst açık noktalar ve
sonraki adım teslimatta. Teslim: `teslimat-p3.md` + `git diff --check`
+ `git status --short`. Commit'ler adım başına tek; push onaysız yok.
```

---

## P4 — Topluluk & Uyum (Faz E: Adım 13→14∥15→16)

*Üretti: moderasyon temeli, tazelik döngüsü, varış-saatli hava durumu, grup+sohbet. Kanıt: `teslimat-p4.md`.*

```text
Atlasia deposunda (React 19 + Vite + Firebase PWA) çalışıyorsun.
GÖREV: P4 — TOPLULUK & UYUM (ROADMAP Faz E). Sıra: 13 önce, sonra 14 ∥ 15,
en son 16; her adım tek commit. Önce ROADMAP §4 dokunma listesi, §8 ⛔
kararlar (d: XP, g: sohbet) ve AGENTS.md'yi oku;
`git status --short --branch` ile başla. MapView.tsx ve storage.rules
değişmez; firestore.rules yalnız sıkılaştırılır. Push/PR/merge/deploy
kullanıcı onayı olmadan yok.

ADIM 13 — moderasyon temeli (grup/sohbetten önce): bildir, engelle,
içerik gizleme, hesap silme akışı. Rules'da yalnız sıkılaştırma; rapor/
engelleme verisi sahibine/yetkiliye kapalı modeli takip eder. Testler
(report validation, io katmanı) zorunlu.

ADIM 14 — tazelik döngüsü (karar (d) bağlı): yer bilgisi güncelliği
("son doğrulama") döngüsü; XP/rozet Cloud Functions olmadan sahte yazım
yapılmaz — fonlama kararı yoksa istemci tarafı işaretlenmez, karar notu
düşülür. Rota motoru tercihleri mevcut sözleşmeye uyar.

ADIM 15 — hava durumunu derinleştir: durakların varış saatine göre
saatlik hava + yağış planı; rota süresine bağlı hesaplama saf fonksiyon
ve testli; ücretsiz kaynak sınırı ve hata durumunda dürüst boş durum.

ADIM 16 — grup + sohbet (en son; karar (g) bağlı): grup/mesaj modeli
maliyet gerçeğiyle birlikte (Firestore ücretsiz katman kotası) —
faturalı plan gerekiyorsa kod sessizce ilerlemez, karar notu yazılır.
Moderasyon (Adım 13) olmadan sohbet açılmaz.

KABUL (kanıtla): temiz `npm ci` sonrası typecheck, lint (--max-warnings=0),
test:run, test:rules:emulator (ortam izin vermezse engel kanıtıyla),
build, audit:check, verify:social-metadata. Yasak taraması: as any /
@ts-ignore / boş catch / gevşetilen kural yok. Otonom kararlar tablosu
(seçenek, gerekçe, geri dönüş maliyeti), dürüst açık noktalar, değişen
dosyalar, sonraki görev ve bağımsız inceleme sonucu teslimatta.
Teslim: `teslimat-p4.md` + `git diff --check` + `git status --short`.
```

---

## Kural: biten iş ana listeden kalkar

Bir P-görevi teslimatıyla kapanınca, ana plandaki
([`p-serisi-uzun-vadeli.md`](p-serisi-uzun-vadeli.md)) satırı kaldırılır;
geçmiş kaydı yalnız `teslimat-pN.md` dosyasında yaşar. P1–P4 bu kurala
uyularak ana plan tablosundan çıkarılmıştır. Aktif görevlerin dayandığı
bağlam notları (ör. P5 koşucu, P10 spin, P11 cache allowlist) "bağlam"
olarak ana planda kalır, çünkü P12+ görevleri bunlara dayanır.

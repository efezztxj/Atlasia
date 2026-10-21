# P-Serisi · Kodcu Prompt'ları (P12–P20)

> Plan ve durum tablosu: [`p-serisi-uzun-vadeli.md`](p-serisi-uzun-vadeli.md)
> Her blok olduğu gibi kopyalanıp kodcu ajana verilir. Blok dışındaki metin
> yalnız insan okuyucu içindir. Bir vardiyada tek görev; bitince teslimat yazılır
> ve durulur.

---

## ORTAK ÖNSÖZ (her prompt'un başına zaten dahil — tekrar ekleme)

Tüm prompt'lar şu kalıcı kuralları taşır: `AGENTS.md` + ROADMAP §4 dokunma
listesi geçerli; `firestore.rules` gevşetilmez; `as any`/boş `catch` yok;
kullanıcı onayı olmadan commit/push/deploy yok; C1 Web Push'a dokunulmaz;
çalışma ağacındaki mevcut değişiklikler korunur; başarısız kontrol geçmiş
gibi sunulmaz; teslimda `git diff --check` + `git status --short` zorunlu.

---

## P12 — Firestore Rules test kapsamı + çapraz platform koşucu

```text
Atlasia deposunda (React 19 + Vite + Firebase PWA) çalışıyorsun.
GÖREV: P12 — Firestore Rules test kapsamını büyüt ve tests koşucusunu
çapraz platformda sağlamlaştır. Tahmini süre: bir gece (4–6 saat).

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli dosyaları ezme, mevcut değişikliği koru.
- AGENTS.md ve ROADMAP §4 (dokunma listesi) geçerli: rules gevşetilmez,
  yalnız sıkılaştırılır; bu görevde rules DEĞİŞİKLİĞİ beklemiyoruz, sadece
  test + koşucu. Bir açık bulursan önce testi yaz, sonra teslimatta
  "sıkılaştırma önerisi" olarak işaretle; kullanıcı onayı olmadan rules'a
  dokunma.
- Bilinen durum (P5): `scripts/run-firestore-rules-tests.mjs` içine emulator
  JVM komutuna İngilizce locale seçenekleri eklendi. Windows'ta geçici ortam
  değişkeniyle 25/25 geçmişti AMA script'teki son değişiklikle Windows
  emulator HENÜZ yeniden çalıştırılmadı. Gerçekten çalıştırmadan "Rules
  doğrulandı" deme. Windows doğrulaması bu ortamda mümkün değilse açıkça
  belirt ve kalan kapsama geç.

KAPSAM:
1. `tests/firestore.rules.test.ts` envanteri: mevcut senaryoları listele,
   `firestore.rules` içindeki her match bloğunu davranış tablosuna dök
   (kim, hangi koleksiyonda, ne yapabiliyor).
2. Tabloda testsiz kalan her davranış için test yaz: özellikle
   - `posts/{id}/replies` alt koleksiyonu (authorUid == auth.uid, update kapalı,
     owner/author delete),
   - beğeni `likedBy` array transform dışında yazma denemeleri,
   - story şemasından çıkarılmış `seen` alanı yazma denemesi (reddedilmeli),
   - gruplar/moderasyon/bildirim koleksiyonlarında çapraz kullanıcı erişimi.
3. Negatif test oranı en az pozitif kadar olsun: yetkisiz okuma/yazma,
   alan aşımı, tip uyumsuzluğu, kimliksiz (unauthenticated) istekler.
4. Koşucu sağlamlaştırma: `scripts/run-firestore-rules-tests.mjs`
   - Java sürümü kontrolü (Java 21+) erken ve anlaşılır hata versin
     (Java yoksa/yetersizse emulator hatası yığınını değil, tek satırlık
     eyleme dönüştürülebilir mesaj üret).
   - Locale bayraklarını Windows/macOS/Linux için aynı şekilde uygula;
     ortam değişkenlerini kullanıcının mevcut env'ini ezmeden genişlet.
   - Port çakışmasında sessizce takılma; zaman aşımında açık hata.
5. `src/config/firestoreRulesRunner.test.ts` varsa kapsama ekle; yoksa
   koşucunun saf kısımlarına (argüman/ortam kurumu) birim test ekle.
   Yeni test dosyası açarsan mevcut vitest pattern'lerine uy.

YASAKLAR:
- firestore.rules içeriğini gevşetme; test geçsin diye kural değiştirme.
- Prod projesine bağlanma; yalnız emulator + demo proje id.
- C1 Web Push'a ait hiçbir hazırlık (koleksiyon, kural, kod) yazma.

KABUL KRİTERLERİ (kanıtla):
- `npm run test:rules:emulator` çıktısı: kaç test, kaçı geçti (emulator
  çalışamıyorsa Java sürümü vb. somut engeli kanıtıyla yaz).
- `npm run typecheck`, `npm run lint`, `npm run test:run` yeşil.
- Davranış tablosu teslimat dosyasında; testsiz kalan match bloğu sıfır
  veya gerekçesi yazılı.

TESLİMAT: `teslimat-p12.md` (P4 formatı) + bu dosyanın plan tablosu
(`p-serisi-uzun-vadeli.md`) güncelle. Sonda `git diff --check` ve
`git status --short` çalıştır, çıktıyı teslimata ekle. Commit/push yapma.
```

---

## P13 — Harita etiket çakışması (kktc-label vs Esri) doğrulama + kilit

```text
Atlasia deposunda (React 19 + Vite + MapLibre PWA) çalışıyorsun.
GÖREV: P13 — ROADMAP §2.4 kusur #9'u kapat: sokak/topoğrafik altlıklarda
`kktc-label` katmanı ile Esri gömülü etiketleri aynı bölgede farklı adla
üst üste gelebilir. Tahmini süre: 3–4 saat. Bu görev DOĞRULAMA ağırlıklıdır;
kod ancak kanıtlanmış kusur için ve en küçük yüzeyle değişir.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- AGENTS.md + ROADMAP §4: `MapView.tsx` katman/tile/marker/event mantığı
  ayrı onay olmadan DEĞİŞMEZ. Bu görevde MapView.tsx'e yazma; kusur orada
  ise önce kanıtı üretip teslimatta "onay bekleyen düzeltme" olarak sun,
  dur.
- Bilinen P10 durumu: `MapView.tsx` spin döngüsü 15 FPS `setTimeout`
  kullanıyor — rAF varsayma, konuya karıştırma. Performans profili yoksa
  performans iddiasında bulunma.

KAPSAM:
1. `src/config/mapLabelCalibration.ts` + testini oku; mevcut kalibrasyon
   sözleşmesini özetle (hangi altlık, hangi zoom aralığında hangi etiket
   katmanı görünür bekleniyor).
2. Kusuru yeniden üretmeye çalış: sokak ve topo altlıklarda, etiket
   yoğun bölgelerde (büyük şehir merkezleri) katman görünürlük
   kombinasyonlarını tabloya dök. Tarayıcı kanıtı mümkün değilse
   stil/JSON ve katman tanımlarından statik kanıt üret; "görmedim" yerine
   neyi nasıl incelediğini yaz.
3. Senaryoları test ile kilitle: harita stil JSON'u ve kalibrasyon
   konfigürasyonu üzerinden "aynı anda iki etiket kaynağı görünemez"
   değişmezini (invariant) kodlayan testler yaz/güncelle
   (`darkMapSource.test.ts`, `mapLabelCalibration.test.ts` pattern'lerini izle).
4. Kusur konfigürasyonda giderilebiliyorsa (MapView mantığına dokunmadan)
   en küçük değişikliği yap; giderilemiyorsa düzeltmeyi diff taslağı olarak
   teslimata koy, uygulama.

YASAKLAR:
- MapView.tsx katman/event mantığını onaysız değiştirme.
- Esri tile indirme/önbelleğe alma; atlas/tile lisans sınırlarına uy.
- Gözle görmediğin ekranı "düzeldi" diye sunma; profil/ölçüm olmadan
  performans cümlesi kurma.

KABUL KRİTERLERİ (kanıtla):
- Değişmez testleri yeşil; `npm run typecheck`, `npm run lint`,
  `npm run test:run`, `npm run build` yeşil.
- Teslimatta: kusur durumu (çoğaltıldı/çoğaltılamadı), kanıt yöntemi,
  kalan görsel doğrulama ihtiyacı (varsa) açıkça yazıyor.

TESLİMAT: `teslimat-p13.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push yapma.
```

---

## P14 — Overpass + Wikidata/Wikipedia içerik boru hattı

```text
Atlasia deposunda (React 19 + Vite + MapLibre PWA) çalışıyorsun.
GÖREV: P14 — ROADMAP Adım 7/9: canlı OSM envanteri (Overpass) + yer
tarihçesi (Wikidata/Wikipedia) boru hattını, lisans/atıf sözleşmesini
bozmadan derinleştir. Tahmini süre: 1–2 gece. Karar (f) seçili seçenek:
(1) Overpass + Wikidata/Wikipedia. LLM özeti veya elle içerik işine girme.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- Mevcut durumu oku: `src/utils/openMapPlaces.ts`, `historicSites.ts`,
  `placePhotos.ts`, ilgili bileşenler (PlaceDetails, NearbyAudioGuide).
  Var olanı yeniden yazma; boşlukları doldur.
- Sert kısıtlar (ROADMAP §5.5): Overpass'e agresif sorgu yok, sonuç
  önbelleğe alınır; veri lisansı ODbL, Wikipedia metni CC BY-SA — atıf
  (`dataSources` alanı) zorunlu. Atıfsız içerik gösterme.
- P11 offline cache allowlist işi BİTTİ: `offlineCache.ts` ve `public/sw.js`
  allowlist'lerine bu görevde dokunma; yeni dış kaynak gerekiyorsa
  önce `src/config/allowedHosts.ts` sözleşmesini incele, ekleme gerekirse
  tam host/path kuralıyla ve testleriyle yap.

KAPSAM:
1. Envanter: bbox/yarıçap tabanlı Overpass sorgu kurumu saf fonksiyonlara
   ayrılsın (ağdan bağımsız test edilebilir). `geo.ts` BBOX eksen sırası
   regresyon kilidine dokunma — `[west,south,east,north]` sözleşmesi sabit.
2. Hız sınırı + önbellek: aynı bbox için tekrar sorgu yok; TTL'li, hata
   durumunda eskisiyle devam eden (stale-while-revalidate benzeri) ama
   hatayı gizlemeyen bir akış. Ağ hatası UI'da sessiz boşluk yaratmasın.
3. Tarihçe eşleştirme: OSM `wikidata` etiketi varsa Wikidata/
   Wikipedia özetini çek; yoksa isim eşleştirmesiyle tahmin ÜRETME
   (yanlış yere yanlış tarihçe = ürüne zarar). Özet uzunluğu ve dil
   (tr öncelikli, yoksa en) politikası tek yerde tanımlı olsun.
4. Atıf: her içerikte `dataSources` dolu; PlaceDetails yüzeyinde kaynak
   adı + lisans görünür. Kaynağı olmayan (seed/elle) içerikle canlı
   içeriği UI'da ayırt edilebilir kıl (mevcut desenleri izle, tasarım
   değişikliği yapma — AGENTS.md korunan kararlar).
5. Testler: sorgu kurumu, özet normalizasyonu, atıf doluluğu, önbellek
   isabet/ıskalama, ağ hatası yolları — hepsi fixture ile, canlı ağa
   test içinde gidilmez.

YASAKLAR:
- Canlı Overpass/Wikipedia'ya testte veya toplu biçimde vurma; geliştirme
  sırasında bile sorguları örnek fixture'larla sınırla.
- Lisans gereği atıfı atlama; CC BY-SA metni kendi içeriğin gibi sunma.
- Yeni ücretli/API-anahtarlı servis ekleme; `VITE_` içine sır koyma.

KABUL KRİTERLERİ (kanıtla):
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` yeşil.
- Teslimatta: sorgu/önbellek akış diyagramı (metin), lisans-uyum listesi,
  canlı doğrulama yapılamadığı noktalar açıkça yazılı.

TESLİMAT: `teslimat-p14.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push/deploy yapma.
```

---

## P15 — Çevrimdışı saha paketi: lisans-güvenli tile önbelleği

```text
Atlasia deposunda (React 19 + Vite + MapLibre PWA) çalışıyorsun.
GÖREV: P15 — ROADMAP Adım 12: çevrimdışı saha paketini harita tile
önbelleğiyle tamamla (yalnız lisansın izin verdiği kaynaklar).
Tahmini süre: bir gece.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- P11 durumu: `src/utils/offlineCache.ts` ve `public/sw.js` cache
  allowlist'leri tam HTTPS host/path eşleşmesine daraltıldı, LRU sırası
  güncellendi, lookalike URL testleri eklendi. Bu allowlist mantığını
  yeniden yazma, gevşetme veya "iyileştirme" adı altında tekrar açma.
  Tile kaynağı eklenirse aynı tam-eşleşme kuralına tabi olur + test yazılır.
- ROADMAP §4: Esri tile'ları toplu indirilmez ve çevrimdışı önbelleğe
  alınmaz (lisans yasağı). Esri tabanlı altlıklar saha paketine giremez;
  kullanıcıya neden giremediği UI'da dürüstçe görünür olmalı.
- Mevcut `OfflinePackage.tsx` ve `offlineCache.ts` akışını oku; paket
  kavramı, kota/boyut gösterimi varsa aynen kullan, paralel sistem kurma.

KAPSAM:
1. Seçili bölge (bbox) + zoom aralığı için tile sayısı/boyut tahmini —
   saf fonksiyon, testli. Üst sınır (tile sayısı ve MB) tek sabitten
   yönetilsin; aşımda indirme başlamadan kullanıcı uyarılır.
2. İndirme: sınırlı paralellik, iptal edilebilir, ilerleme bildirimi
   mevcut bileşen desenleriyle (tasarım/yerleşim değişikliği yok).
   Kısmi başarı (bazı tile'lar başarısız) durumunda paket "eksik" olarak
   işaretlenir; sessizce tam sayılmaz.
3. Paket yaşam döngüsü: listeleme, tek dokunuşla silme, toplam kullanım
   gösterimi, kota dolumu hatası (QuotaExceeded) yakalanıp kullanıcıya
   anlaşılır mesaj verir — boş `catch` yok.
4. Çevrimdışı kullanım: harita çevrimdışıyken paketli bölgede tile'lar
   önbellekten gelir; paketsiz bölgede boş gri ekran yerine mevcut
   "ağ yok" desenine düşülür (NetworkStatus ile uyumlu).
5. Testler: tahmin fonksiyonu, bbox→tile aralığı dönüşümü (kenar
   durumlar: antimeridian, kutup sınırı, zoom 0), kota aşımları,
   iptal/kısmi başarı durumları — ağ fixture ile.

YASAKLAR:
- Esri veya lisansı toplu indirmeyi yasaklayan kaynakları paketleme.
- Service worker'da allowlist dışı "her şeyi tut" davranışı.
- Arka planda habersiz indirme; kullanıcı eylemi olmadan paket yaratma.

KABUL KRİTERLERİ (kanıtla):
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` yeşil
  + `node --check public/sw.js` (sw değiştiyse).
- Teslimatta: lisans gerekçelendirmesi, boyut/kota politikası, gerçek
  cihazda doğrulanması gerekenler listesi.

TESLİMAT: `teslimat-p15.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push/deploy yapma.
```

---

## P16 — Testsiz modül kapsama maratonu

```text
Atlasia deposunda (React 19 + Vite + Vitest) çalışıyorsun.
GÖREV: P16 — testi olmayan modülleri karakterizasyon testleriyle kilitle.
Tahmini süre: bir gece ve fazlası (bitmezse kalan listeyle teslim edilir).
Bu görev davranış DEĞİŞTİRMEZ; mevcut davranışı kanıtlar. Hata bulursan
testi kırmızı bırakma — davranışı olduğu gibi belgeleyen test + teslimatta
"kuşkulu davranış" notu yaz, düzeltmeyi kullanıcı kararına bırak.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- Envanteri çıkar: `src/utils`, `src/lib`, `src/hooks` altında `.test.ts`
  eşi olmayan dosyalar (ör. `image.ts`, `openMapPlaces.ts`, `storage.ts`,
  `text.ts`, `placeAdvice.ts`, `placePhotos.ts`, `api.ts` ve test
  karşılıksız hook'lar). Liste tarihle eskiyebilir — gerçek liste
  `find`/`ls` çıktısından, bu metinden değil.

ÖNCELİK SIRASI:
1. Saf fonksiyonlar (text/geo/time yardımcıları, dönüştürücüler).
2. IO'lu modüller — mevcut `*.io.test.ts` desenini (groups.io,
   moderation.io) izle; ağ ve Firebase sahte (mock/fixture), gerçek istek yok.
3. Hook'lar — render gerektirmeyen mantığı saf fonksiyona ayırmadan
   test edilemiyorsa dokunma; "test dikişi önerisi" olarak teslimata yaz.
   Davranışı test için refactor etme (bu görev refactor görevi değil);
   istisna: tamamen eşdeğer, imza/davranış değişmez çıkarım ve teslimatta
   açıkça gerekçeliyse.

KURALLAR:
- Her test: normal yol + en az bir sınır (boş, null'e yakın, Türkçe
  karakter/diakritik, emoji, aşırı uzun, negatif/sıfır, zaman dilimi
  kenarı) + hata yolu.
- Türkçe metin işleyen fonksiyonlarda İ/ı/ş/ğ durumlarını özellikle
  kapsa; locale bağımlılığı varsa testte sabitle.
- Test isimleri mevcut dil düzenine uygun, iddialı ve somut olsun.
- Snapshot testi ancak format sözleşmesi gerçekten kararlıysa;
  kırılgan snapshot'larla sayı şişirme.

YASAKLAR:
- Testi geçirmek için kaynak kodu sessizce değiştirme.
- `as any`, gevşek matcher'larla her şeyi kabul eden testler.
- Canlı ağ/Firebase'e giden test.

KABUL KRİTERLERİ (kanıtla):
- `npm run test:run` yeşil; öncesi/sonrası test dosyası ve test sayısı
  teslimatta (sayılar gerçek çıktıdan, tahmin yok).
- `npm run typecheck` + `npm run lint` yeşil.
- Kapsanan/kapsanamayan modül tablosu + kuşkulu davranış listesi.

TESLİMAT: `teslimat-p16.md` + plan tablosu güncelle (kalanlar 🚧 ve
listeyle). Sonda `git diff --check` + `git status --short`.
Commit/push yapma.
```

---

## P17 — track → taslak rota boru hattı (Adım 4 derinleştirme)

```text
Atlasia deposunda (React 19 + Vite + MapLibre PWA) çalışıyorsun.
GÖREV: P17 — kayıtlı izden taslak rota türetme boru hattını sağlamlaştır:
durak tespiti, geometri sadeleştirme, yükseklik ilişkilendirme.
Tahmini süre: 1–2 gece.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- Mevcut kod: `src/utils/track.ts`, `polyline.ts`, `elevation.ts`,
  `hooks/useTrackRecorder.ts`, `lib/routeData.ts`, ilgili testleri oku;
  var olan sözleşmeyi genişlet, paralel boru hattı kurma.
- SERT KISITLAR (ROADMAP §5): durak tespiti polyline'dan SONRA yapılamaz
  (zaman bilgisi encode edilmiyor) — tespit tam çözünürlüklü akışta olur.
  Yükseklik GPS'ten gelmez; `terrain` raster-dem'den hesaplanır.
  `tracks` ham GPS = konum geçmişi: varsayılan gizli, yayın açık eylem,
  tek dokunuşla silme. "Konumun otomatik olarak paylaşılmaz." sözü sabit.
- Karar (c) ⛔: buluta senkron kullanıcı kararı bekliyor — bu görev cihaz
  içi boru hattıdır; yeni Firestore koleksiyonu/kuralı AÇMA.

KAPSAM:
1. Durak tespiti: hız/zaman eşiklerini tek konfigürasyonda topla; GPS
   sıçraması (accuracy kötü, ardışık aykırı nokta) durumunda sahte durak
   üretme. Eşikler sihirli sayı değil, isimli sabit + gerekçe yorumu.
2. Sadeleştirme: Douglas-Peucker (veya mevcut uygulama) için epsilon
   politikası — toplam uzunluk hatası üst sınırı testle kanıtlı.
3. Yükseklik: DEM örneklemesi başarısızsa profil "bilinmiyor" olur,
   sıfır düz çizgi YOK (yanıltıcı görsel üretme). ElevationProfile
   bileşeninin mevcut durumunda kırılma yaratma.
4. Taslak rota: duraklar + bacaklar mevcut rota modeline dönüşür;
   kullanıcının düzenleyip yayınlama akışı (RouteEditor) bozulmaz.
5. Testler: sentetik iz fixture'ları (düz yürüyüş, mola'lı yürüyüş,
   sinyal kaybı, şehir içi GPS sürüklenmesi) ile uçtan uca boru hattı;
   zaman kodlamayan polyline'a tespit yaptırmadığın testle sabitlenir.

YASAKLAR:
- Konumu arka planda izliyormuş gibi davranan akış tasarlama (web'de yok).
- Ham izi kullanıcının açık eylemi olmadan hiçbir yere yazma/paylaşma.
- Yol çizgisini "navigasyon" gibi sunma (ROADMAP borç kaydı).

KABUL KRİTERLERİ (kanıtla):
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` yeşil.
- Fixture tablo: her senaryoda bulunan durak sayısı vs beklenen.
- Saha doğrulaması gerekenler teslimata açıkça yazılır (masaüstü
  fixture, gerçek yürüyüşün yerine geçmez).

TESLİMAT: `teslimat-p17.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push yapma.
```

---

## P18 — Erişilebilirlik denetimi ve kilidi

```text
Atlasia deposunda (React 19 + Vite + Tailwind PWA) çalışıyorsun.
GÖREV: P18 — klavye/odak yönetimi, ekran okuyucu etiketleri ve tema
kontrast çiftleri için erişilebilirlik denetimi + düzeltme + regresyon
kilidi. Tahmini süre: bir gece.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- AGENTS.md korunan kararlar: yerleşim/tasarım değişikliği YOK. Koyu tema
  mevcut siyah, açık tema gerçek beyaz. Bu görev görünüm değişikliği
  değil; yalnız erişilebilirlik nitelikleri, odak davranışı ve gerekirse
  kontrast sınırında kalan renk token'ının en küçük düzeltmesi (tasarımı
  bozacak renk değişimi gerekiyorsa yapma, teslimatta karar iste).

KAPSAM:
1. Envanter: modal/drawer/panel yüzeyleri (AddDiscoveryModal, Drawer,
   BottomPanel, ReportDialog, StoryComposer/Viewer, Onboarding vb.) —
   odak tuzağı (focus trap), Esc ile kapanma, açan öğeye odak dönüşü
   var mı tabloya dök.
2. Etkileşimli öğeler: ikon düğmelerinde erişilebilir isim (aria-label
   veya görünür metin), dokunma hedefi boyutu, `role` kötüye kullanımı.
   Harita kontrolleri (MapControls) klavye ile erişilebilir mi?
3. Kontrast: metin/zemin çiftlerini her iki temada WCAG AA (normal metin
   4.5:1, büyük metin 3:1) karşısında hesapla; hesap saf fonksiyon + test
   olarak repoda kilitlensin (renk token'ından okunur, elle sayı yok).
4. Formlar: label ilişkisi, hata mesajlarının programatik bağlanması
   (aria-describedby), zorunlu alan bildirimi.
5. Düzeltmeler en küçük yüzeyle; her düzeltmeye davranış testi eşlik eder
   (klavye akışını DOM testiyle kanıtla — mevcut test altyapısında yoksa
   saf mantık kısmını testle, DOM kısmını "elle doğrulama gerekli" de).

YASAKLAR:
- Yerleşim/boyut/renk paleti yenileme; "erişilebilirlik" adı altında
  redesign yapma.
- Ölçmeden "WCAG uyumlu" demeye; hesaplanamayan çiftleri açıkça listele.

KABUL KRİTERLERİ (kanıtla):
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` yeşil.
- Kontrast tablosu (çift, tema, oran, sonuç) teslimatta; eksikler
  düzeltildi/karara bırakıldı ayrımıyla.

TESLİMAT: `teslimat-p18.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push yapma.
```

---

## P19 — Bundle bütçesi ve lazy-loading taraması (ölçüm var, iddia yok)

```text
Atlasia deposunda (React 19 + Vite PWA) çalışıyorsun.
GÖREV: P19 — üretim bundle'ına bütçe ve regresyon kilidi koy; lazy
yükleme kapsamını ölçülü şekilde derinleştir. Tahmini süre: 3–5 saat.
Ölçmediğin hiçbir iyileşmeyi olmuş gibi yazma.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- Mevcut desenler: `src/config/lazyLoading.test.ts`, `vite.config.ts`.
  Elle bölünmüş chunk'lar varsa gerekçesini anlamadan değiştirme.
- MapLibre ve Firebase ağır bağımlılıklar; beklenti yönetimi teslimatta
  açık yazılır, "hızlandı" cümlesi yalnız aynı ortamda tekrarlanmış
  ölçümle kurulur. P10 notu: MapView spin 15 FPS timeout — bu görevin
  konusu değil, karıştırma.

KAPSAM:
1. Baz ölçüm: `npm run build` çıktısını tabloya dök (chunk, ham/gzip
   boyut). İlk yüklemede gerçekten gerekenler vs ertelenebilirler ayrımı
   kod girişi (main.tsx → App) üzerinden gerekçeli.
2. Bütçe kilidi: build çıktısı boyutlarını okuyan, eşik aşımında
   kırılan bir betik/test ekle (ör. `scripts/` + vitest veya node --test
   deseni — repodaki mevcut pattern'i izle). Eşikler baz ölçüme makul
   toleransla bağlanır; keyfi sayı yok, gerekçe yorumda.
3. Ertelenebilir yüzeyler: seyrek açılan paneller/modallar `React.lazy`
   veya mevcut lazy desenine taşınabilir mi tek tek değerlendir; harita
   ilk boya yolundaki bileşeni erteleme. Her taşıma sonrası build + test
   kanıtı; görsel davranış değişikliği yok (yerleşim sabit).
4. Ağaç sallama (tree-shaking) engelleri: barrel import ve yan etkili
   modül taraması; düzeltme yalnız ölçümle anlamlı olanlara.

YASAKLAR:
- Kullanıcıya görünen yüklenme davranışını kötüleştiren "optimizasyon".
- Yeni bağımlılık eklemek için bağımlılık (visualizer devDependency
  gerekiyorsa teslimatta gerekçesiyle; prod bağımlılık ekleme).
- Profil/ölçüm olmadan milisaniye iddiası.

KABUL KRİTERLERİ (kanıtla):
- Öncesi/sonrası chunk tablosu; bütçe testi yeşil ve kasıtlı büyütmede
  kırıldığı gösterilmiş (geçici deney, teslimatta anlatılır, repo
  kirli bırakılmaz).
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` yeşil.

TESLİMAT: `teslimat-p19.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push/deploy yapma.
```

---

## P20 — Rota paylaşım linki (Firestore'suz, istemci içi)

```text
Atlasia deposunda (React 19 + Vite PWA) çalışıyorsun.
GÖREV: P20 — kayıtlı rotayı link ile paylaşma: rota, URL içinde kodlanmış
(sıkıştırılmış) veri olarak taşınır; sunucu/Firestore yazımı YOK.
Tahmini süre: bir gece.

BAŞLAMADAN DOĞRULA:
- `git status --short --branch` — kirli ağacı koru.
- Karar (c) ⛔ bulut senkronu kullanıcı kararı bekliyor ve ROADMAP
  Adım 5'teki `routes` koleksiyonu bu görevin DIŞINDA. Bu görev yalnız
  link içi kodlamadır; yeni koleksiyon/kural açarsan görev ihlalidir.
- Gizlilik: link, elinde olan herkese rotayı gösterir — kullanıcı
  paylaşmadan önce bunu açık onay kutucuğu/metinle görür (mevcut
  bileşen desenleriyle; tasarım değişikliği yok). Konum geçmişi içeren
  ham track linke GİRMEZ; yalnız yayınlanmış rota geometrisi + duraklar.
- Mevcut kod: `lib/routeData.ts`, `utils/polyline.ts`,
  `utils/routePlanner.ts`, fflate bağımlılığı mevcut (sıkıştırma için
  yeni bağımlılık arama).

KAPSAM:
1. Kodlama sözleşmesi: sürümlü format (v1 öneki), polyline + durak
   meta verisi, fflate ile sıkıştırma, URL-güvenli base64. Boyut üst
   sınırı (ör. ~8 KB URL) ve aşımda dürüst hata ("rota link için çok
   büyük") — sessiz kırpma yok.
2. Çözücü: bozulan/değiştirilmiş link → çökme yok, anlaşılır hata;
   bilinmeyen sürüm → açık "bu sürüm desteklenmiyor" durumu.
   Gelen veri güvenilmez girdidir: koordinat aralıkları, durak sayısı
   gibi alanlar doğrulanır, doğrulanmayanı haritaya basma.
3. Açılış akışı: link ile gelen rota önce önizlemede gösterilir;
   kullanıcı "kaydet" demeden koleksiyonuna girmez. Kopya isim
   çakışması mevcut koleksiyon desenine uyar.
4. Testler: gidiş-dönüş (round-trip) özdeşliği, sürüm/boyut sınırları,
   bozuk girdi tablosu, Türkçe isim/emoji içeren durak adlarıyla
   round-trip.

YASAKLAR:
- Kısa link servisi, analitik parametre, izleme — yok.
- Paylaşımı varsayılan açık yapma; her paylaşım açık eylem.
- C1 Web Push hazırlığı sayılabilecek bildirim akışı ekleme.

KABUL KRİTERLERİ (kanıtla):
- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` yeşil.
- Teslimatta: format sözleşmesi, boyut sınırları ve gizlilik metninin
  kullanıcıya nerede göründüğü.

TESLİMAT: `teslimat-p20.md` + plan tablosu güncelle. Sonda
`git diff --check` + `git status --short`. Commit/push/deploy yapma.
```

---

## Görev seçerken

- Sıralı bağımlılık: P14 içerik, P15 çevrimdışı paketin veri tarafını
  besler; ikisi paralel vardiyalarda çakışmaz (farklı dosyalar) ama aynı
  ağaçta üst üste bindirme.
- P16 her zaman güvenlidir ve diğer görevlerin önünü açar; belirsiz
  kaldığında P16'dan devam et.
- P12, rules'a değen her ilerideki işin sigortasıdır; gece vardiyası
  rotasında erken tut.

# Tur 4 · P1–P4 Kodcu Promtları (pilot öncesi kalan işler)

> Kaynak: Notion "🗓️ 22.10.2026 sonrası yapılacaklar" (Bölüm 1–3) · taban `main b6922d1`.
> Her blok tek başına kopyalanıp ayrı bir ajana verilir; ön söz her bloğun içindedir.
> Dört ajan aynı anda çalışabilir: dosya listeleri kesişmez. Kullanıcı kararları
> (Notion 5 karar, ROADMAP §8 b/d/e/g, pilot bölgesi, deploy, avukat, gerçek cihaz)
> bu turda **yoktur**.

| Ajan | Taban dalı | Ana iş | Yerine geçtiği PR |
|---|---|---|---|
| P1 | `origin/main` | Yasal akış (KVKK ayrı), doküman düzeltmeleri, P18 denetimi, TASK-016 kontrol listesi, bakım triyajı | — |
| P2 | `origin/arena/6a07c7ce-atlasia` (#35) | #35 düzeltmesi, kötü hava uyarısı, yükseklik profili bağlama, P20 | #35 |
| P3 | `origin/arena/422cfa59-atlasia` (#38) | Kayıp dosyalar, sayfalama IO, hava harita katmanı, P10, yakınlık histerezisi, P14 hattı, P15 lisans notu | #38 |
| P4 | `origin/arena/f80b0256-atlasia` (#40) | #40 rules testi, tam hesap silme, görünürlük matrisi, geri bildirim kanalı | #40, #37, #19 |

---

## P1 — Yasal akış, dokümanlar, erişilebilirlik denetimi

```text
ÖN SÖZ (kalıcı kurallar — hepsi bağlayıcı)
- Atlasia deposundasın (React 19 + Vite + MapLibre + Firebase PWA). Önce AGENTS.md,
  ROADMAP.md §4 ve docs/gorevler/calisma-kurallari.md'yi oku.
- Soru sorma. Karar gereken her yerde kendi önerini seç, uygula ve teslimatta
  "Varsayılan karar: … / gerekçe: …" diye yaz.
- Deploy yok: firebase deploy, Cloudflare ayarı, main'e merge yok. İş bitince
  commit + push + PR aç; merge'i denetçi yapar.
- Yalnız aşağıdaki SAHİP OLDUĞUN DOSYALAR'a yaz. Başka dosya gerekirse dokunma,
  teslimatta "dosya talebi" olarak yaz. Diğer üç ajan aynı anda çalışıyor.
- firestore.rules gevşetilmez. `as any`, boş catch, sessiz hata yutma yok.
  Başarısız kontrolü geçmiş gibi sunma; uydurma run ID/sayı yazma.
- Tasarım dili değişmez: koyu tema siyah, açık tema gerçek beyaz.
- Kapılar (PR öncesi hepsi): npm ci · npm run typecheck · npm run lint ·
  npm run test:run · npm run test:scripts · npm run build. Rules emulator
  sandbox'ta koşmazsa CI sonucunu `gh pr checks <no>` ile kanıtla.
- Teslimat: docs/teslimatlar/teslimat-p1-tur4.md (commit listesi, komut
  çıktıları, varsayılan kararlar, dosya talepleri, açık kalanlar) + sonda
  `git diff --check` ve `git status --short`.
- PR başlığı: "[P1] Tur 4 — yasal akış + doküman + P18 denetimi".

TABAN: güncel origin/main (b6922d1 veya sonrası). `git fetch origin main` ve
oradan başla.

SAHİP OLDUĞUN DOSYALAR (bu tur): ROADMAP.md, CHANGELOG.md, README.md, AGENTS.md,
docs/** (docs/teslimatlar/teslimat-p2/p3/p4-* hariç), .github/**, scripts/**,
e2e/**, src/content/legal.ts (+test), src/components/LegalNotice.tsx (+test),
src/components/AccountAccess.tsx (+testler), src/lib/auth*, src/lib/firebase*,
src/lib/appCheck*, src/main.tsx, package.json/lock (yalnız gerekiyorsa).

GÖREVLER (sırayla):
1. ROADMAP düzeltmeleri: baştaki durum satırını güncel main SHA'sına çek;
   §8 (c) koleksiyon senkronunu "uygulandı (useCollections +
   subscribeSavedCollections, users/{uid}/savedPlaces|savedRoutes)" diye işaretle,
   kullanıcı onayı bekliyor notuyla; §9'daki "rotalar localStorage'da" satırını
   kaldır/düzelt. Adım 11 (yükseklik profili) ve Adım 15 (hava katmanı + uyarı)
   için "ilk sürüm kısmi; kalan: …" notu ekle.
2. KVKK aydınlatmasını ayrı akışa al:
   - legal.ts: LegalDocumentType'a "kvkk" ekle, ayrı `kvkkNoticeDocument`
     (aydınlatma metni; veri sorumlusu, amaç, hukuki sebep, aktarım, haklar
     başlıkları). Mevcut LEGAL_PLACEHOLDERS yer tutucularını koru; gerçek
     künye uydurma. Metin "Taslak · avukat onayı bekleniyor" olarak kalsın.
   - AccountAccess: tek onay kutusu → (a) zorunlu "Kullanım koşullarını kabul
     ediyorum", (b) ayrı "KVKK aydınlatma metnini okudum" bilgilendirmesi
     (onay kutusu değil, bağlantı + okundu ibaresi). Açık rıza gerektiren bir
     işleme yoksa açık rıza kutusu EKLEME; varsayılan kararı teslimatta yaz.
   - LegalNotice "kvkk" tipini göstersin. Testler: kayıt akışı, yer tutucu
     tespiti (unresolvedLegalPlaceholders) kvkk için de çalışır.
3. P18 erişilebilirlik denetimi: tüm src/components için klavye, odak sırası,
   görünür odak, kontrast (iki tema), aria etiketleri, mobil dokunma hedefi.
   docs/denetim/p18-erisilebilirlik.md: bulguları DOSYA SAHİBİNE göre grupla
   (P1/P2/P3/P4 sahiplik tablosu calisma-kurallari'nda). Yalnız kendi
   dosyalarındaki bulguları düzelt; diğerleri sonraki tur için liste.
4. TASK-016 gerçek cihaz kontrol listesi: docs/gorevler/task-016-cihaz-matrisi.md
   (Android Chrome, iOS Safari, masaüstü Chrome/Firefox; giriş, harita,
   WebGL2 yoksa davranış, iz kaydı, çevrimdışı açılış, hesap silme, iki tema).
   Her satırda beklenen sonuç ve kanıt alanı boş. Varsa e2e/ smoke testini bu
   listenin otomatikleşebilen satırlarıyla eşle.
5. UZUN-09/R + FREE-01 envanteri: docs/denetim/iddia-envanteri.md — eski
   raporlardaki "geçti" iddialarını listele, her biri için kanıt commit'i /
   test dosyası / CI adımı; kanıtı yoksa "kanıtsız" yaz. Workers Builds FAIL
   ile Pages yayınının ayrı hatlar olduğunu repo içi kanıtla (wrangler/
   pages config, workflow dosyaları) not et; Cloudflare panelinde değişiklik yok.
6. Bakım triyajı raporu: docs/denetim/pr-triyaj-tur4.md — açık PR'lar #1, #3,
   #4, #6, #7, #8, #10, #11, #12, #13, #15, #18, #27 için `gh pr view`/
   `gh pr checks` ile: güncel main'e çakışma, CI, kapsam, öneri (kapat /
   yeniden taban / birleştirilebilir). PR KAPATMA veya merge YOK; yalnız rapor.

KAPSAM DIŞI: hesap silme kodu (P4), hava/yükseklik (P2/P3), rules (P4),
pilot bölgesi seçimi, avukat metni içeriği.

KABUL: kapılar yeşil; kayıt akışında iki ayrı yasal öğe; ROADMAP §8(c)/§9
düzeltildi; dört doküman var ve gerçek veriye dayanıyor; PR açık + CI yeşil.
```

---

## P2 — #35 düzeltmesi, kötü hava uyarısı, yükseklik profili, P20

```text
ÖN SÖZ (kalıcı kurallar — hepsi bağlayıcı)
- Atlasia deposundasın (React 19 + Vite + MapLibre + Firebase PWA). Önce AGENTS.md,
  ROADMAP.md §4 ve docs/gorevler/calisma-kurallari.md'yi oku.
- Soru sorma. Karar gereken her yerde kendi önerini seç, uygula ve teslimatta
  "Varsayılan karar: … / gerekçe: …" diye yaz.
- Deploy yok: firebase deploy, Cloudflare ayarı, main'e merge yok. İş bitince
  commit + push + PR aç; merge'i denetçi yapar.
- Yalnız aşağıdaki SAHİP OLDUĞUN DOSYALAR'a yaz. Başka dosya gerekirse dokunma,
  teslimatta "dosya talebi" olarak yaz. Diğer üç ajan aynı anda çalışıyor.
- firestore.rules gevşetilmez. `as any`, boş catch, sessiz hata yutma yok.
  Başarısız kontrolü geçmiş gibi sunma; uydurma run ID/sayı yazma.
- Tasarım dili değişmez: koyu tema siyah, açık tema gerçek beyaz.
- Kapılar (PR öncesi hepsi): npm ci · npm run typecheck · npm run lint ·
  npm run test:run · npm run test:scripts · npm run build. Rules emulator
  sandbox'ta koşmazsa CI sonucunu `gh pr checks <no>` ile kanıtla.
- Teslimat: docs/teslimatlar/teslimat-p2-tur4.md (commit listesi, komut
  çıktıları, varsayılan kararlar, dosya talepleri, açık kalanlar) + sonda
  `git diff --check` ve `git status --short`.
- PR başlığı: "[P2] Tur 4 — hava uyarısı + yükseklik profili + P20 (Supersedes #35)".

TABAN: PR #35'in dalı. `git fetch origin '+refs/heads/arena/6a07c7ce-atlasia:refs/remotes/origin/arena/6a07c7ce-atlasia'`
sonra o daldan başla ve `origin/main`'i içine merge et (çakışma varsa çöz,
teslimatta yaz). #35'in tüm işi senin PR'ında kalmalı. #35'i kapatma.

SAHİP OLDUĞUN DOSYALAR (bu tur): src/App.tsx, src/types.ts, src/lib/routeData*,
src/lib/firestoreValue*, src/lib/publishedRouteOpen*, src/hooks/useCollections*,
src/hooks/useAtlasData*, src/hooks/useTrackRecorder*, src/hooks/useGeolocation*,
src/utils/track*, polyline*, routePlanner*, routeLegs*, weather*, elevation*,
likes*, share*, src/components/TrackRecorderPanel*, TrackRibbonPreview*,
RouteEditor*, RecordsDock*, keşif bileşenleri, ve BU TUR İÇİN DEVREDİLEN
src/components/ElevationProfile.tsx (+test).
YAZMA: MapView/MapControls (P3), moderation.ts (P4), legal/AccountAccess (P1).

GÖREVLER (sırayla):
1. #35 düzeltmesi — beğeni çift sayımı: likes.ts ve onu kullanan yerlerde
   seed/base sayı + likedBy birleşiminde aynı kullanıcının iki kez sayılıp
   sayılmadığını test et (seed'de olan uid likedBy'a da eklendiğinde, iyimser
   güncelleme + snapshot geldiğinde). Hata varsa düzelt; regresyon testi yaz.
2. Kötü hava uyarısı (Adım 15 kalanı): weather.ts'e saf fonksiyon
   `assessWeatherRisk(hourly, window)` → { level: "none"|"caution"|"warning",
   reasons[] }. Eşikleri kendin seç ve sabit olarak dışa aktar (öneri: yağış
   olasılığı ≥60% veya ≥2 mm/sa, rüzgâr ≥40 km/sa veya hamle ≥60, sıcaklık
   ≥35 °C veya ≤0 °C, WMO fırtına kodları 95–99). Rota planı/RouteEditor'da
   ilgili gün/durak kartında uyarı rozeti + kısa neden. Veri yoksa "hava
   bilinmiyor"; tahmin uydurma. Testler: eşik sınırları, boş veri, saat
   penceresi.
3. Yükseklik profili (Adım 11 kalanı): ElevationProfile'ı rota detayına /
   RouteEditor'a bağla (buildElevationProfile verisiyle). DEM örneklemesi
   başarısızsa bileşen "yükseklik verisi yok" gösterir; sahte profil çizmez.
   Bundle bütçesini aşmamak için gerekiyorsa lazy import. Bileşen testi +
   bağlanma testi.
4. P20 paylaşım linki: kendi önerinle karar ver ve uygula (öneri: yayınlanmış
   rota → mevcut kalıcı link; yayınlanmamış/hesapsız → URL fragment'ına
   sıkıştırılmış, boyut sınırlı rota özeti; fragment sunucuya gitmez).
   Kötü/bozuk/aşırı büyük linkte güvenli hata. share.ts testleri. Adım 5
   paylaşımını bozma.

KAPSAM DIŞI: harita hava katmanı (P3), hesap silme (P4), rules.

KABUL: kapılar yeşil; çift sayım testle kanıtlı; uyarı ve profil ekranda;
P20 kararı teslimatta; PR açık + CI yeşil + "Supersedes #35".
```

---

## P3 — Kayıp iş, sayfalama, hava katmanı, harita performansı, içerik hattı

```text
ÖN SÖZ (kalıcı kurallar — hepsi bağlayıcı)
- Atlasia deposundasın (React 19 + Vite + MapLibre + Firebase PWA). Önce AGENTS.md,
  ROADMAP.md §4 ve docs/gorevler/calisma-kurallari.md'yi oku.
- Soru sorma. Karar gereken her yerde kendi önerini seç, uygula ve teslimatta
  "Varsayılan karar: … / gerekçe: …" diye yaz.
- Deploy yok: firebase deploy, Cloudflare ayarı, main'e merge yok. İş bitince
  commit + push + PR aç; merge'i denetçi yapar.
- Yalnız aşağıdaki SAHİP OLDUĞUN DOSYALAR'a yaz. Başka dosya gerekirse dokunma,
  teslimatta "dosya talebi" olarak yaz. Diğer üç ajan aynı anda çalışıyor.
- firestore.rules gevşetilmez. `as any`, boş catch, sessiz hata yutma yok.
  Başarısız kontrolü geçmiş gibi sunma; uydurma run ID/sayı yazma.
- Tasarım dili değişmez: koyu tema siyah, açık tema gerçek beyaz.
- Kapılar (PR öncesi hepsi): npm ci · npm run typecheck · npm run lint ·
  npm run test:run · npm run test:scripts · npm run build. Rules emulator
  sandbox'ta koşmazsa CI sonucunu `gh pr checks <no>` ile kanıtla.
- Teslimat: docs/teslimatlar/teslimat-p3-tur4.md (commit listesi, komut
  çıktıları, varsayılan kararlar, dosya talepleri, açık kalanlar) + sonda
  `git diff --check` ve `git status --short`.
- PR başlığı: "[P3] Tur 4 — sayfalama IO + hava katmanı + P10 + P14 (Supersedes #38)".
- Ara ara commit + push et; push edilmeyen iş kaybolur (önceki turda 8 dosya böyle kayboldu).

TABAN: PR #38'in dalı. `git fetch origin '+refs/heads/arena/422cfa59-atlasia:refs/remotes/origin/arena/422cfa59-atlasia'`
sonra o daldan başla ve `origin/main`'i içine merge et. #38'in işi senin
PR'ında kalmalı. #38'i kapatma.

SAHİP OLDUĞUN DOSYALAR (bu tur): src/components/MapView*, MapControls*,
SiteTourPanel*, Offline*, NearbyAudioGuide*, PlaceDetails*, src/lib/openMapPlaces*,
historicSites*, placePhotos*, offlineCache*, offlineTiles*, mapLifecycle*,
terrainProfile*, nearbyGuide*, tourGuide*, freshness*, verifications*,
src/hooks/useFreshness*, src/utils/geo*, sun*, src/data/siteTours*, siteRoutes*,
src/config/allowedHosts*, public/sw.js, src/lib/firestoreData (YALNIZ test
dosyaları), yeni dosya: src/utils/weatherLayer.ts (+test), scripts/content/**
(yeni). weather.ts'i OKUYABİLİRSİN, DEĞİŞTİRMEZSİN (P2'nin).
YAZMA: ElevationProfile (bu tur P2'de), RouteEditor, moderation.ts, rules.

GÖREVLER (sırayla):
1. Kayıp dosyalar: önceki turda commit edilmemiş 8 dosya — OfflineMapPackPanel.tsx,
   offlineTiles.ts, offlineTileWorker.test.ts, mapLifecycle.ts, terrainProfile.ts,
   nearbyGuide.ts, siteRoutes.ts, historicSites.live.test.ts — ve
   firestoreData.pagination.io.test.ts. Önce `git log --all` ve tüm uzak
   dallarda ara. Bulamazsan: pagination IO testini yeniden yaz (zorunlu);
   diğerlerinden yalnız bu turun görevleri için gerekeni yeniden yaz, gerisini
   teslimatta "yeniden yazılmadı" diye listele. Var olmayan dosyayı "kurtarıldı"
   diye yazma.
2. Sayfalama IO + UZUN-07: firestoreData sayfalaması için gerçek IO testi —
   gerçek silme ile sayfa dışına çıkmanın ayrımı; yeni ilk snapshot gelirken
   bekleyen sonraki-sayfa okumasının geçersizleşmesi; cursor sınırı. Kodda
   hata çıkarsa firestoreData.ts sahibi bu turda yok → düzeltmeyi minimal yap
   ve teslimatta açıkça işaretle (yalnız sayfalama fonksiyonu).
3. Hava harita katmanı (Adım 15 kalanı): MapControls'a "Hava" katman düğmesi,
   MapView'da görünür alan için seyrek ızgara (ör. 3×3) Open-Meteo sorgusu →
   sıcaklık/yağış simgeleri. weatherLayer.ts: ızgara üretimi, istek birleştirme,
   10 dk önbellek, harita hareketinde debounce, hata/çevrimdışında katmanı
   "veri yok" ile kapat. Anahtar veya yeni ücretli servis yok. allowedHosts'a
   gerekirse yalnız Open-Meteo hostu. Testler: ızgara, önbellek, debounce, hata.
4. P10 harita spin: idle spin'i rAF'ın her karesi yerine ≤15 FPS'e sınırla,
   sekme gizliyken ve kullanıcı etkileşiminde durdur, prefers-reduced-motion'a
   uy. Ölçüm: testte kare aralığı; teslimatta cihaz ölçümü yoksa "ölçülmedi" yaz.
5. Yakınlık rehberi: sıradaki durak seçimi + giriş/çıkış histerezisi (ör. giriş
   40 m, çıkış 60 m; GPS doğruluğu kötüyse tetikleme yok). nearbyGuide testleri.
6. P14 içerik hattı (bölgeden bağımsız): scripts/content/ altında bbox alan
   Overpass + Wikidata/Wikipedia çekici → doğrulanmamış aday JSON (kaynak, lisans,
   atıf, çekim tarihi alanlarıyla). Uygulamaya otomatik yazmaz; tarihçe ile
   kullanıcı notu ayrı alan. Ağ gerektiren test `.live.test` ve varsayılan
   koşuda atlanır; sahte yanıtla birim testi. Pilot bölgesi henüz seçilmedi —
   bölge verisi ÜRETME, yalnız hattı kur.
7. P15 lisans notu (kod yok): docs/denetim/p15-lisans.md — CARTO/Esri/font
   çevrimdışı kullanım şartları, kota, atıf; resmî kaynak bağlantılarıyla.
   Doğrulayamadığın şartı "doğrulanmadı" yaz.

KAPSAM DIŞI: kötü hava uyarısı (P2), yükseklik profili (P2), rules, hesap silme.

KABUL: kapılar yeşil; pagination IO testi var ve geçiyor; hava katmanı açılıp
kapanıyor; spin sınırlı; P14 hattı sahte veriyle test edilmiş; PR açık + CI yeşil.
```

---

## P4 — #40 rules, tam hesap silme, görünürlük matrisi, geri bildirim

```text
ÖN SÖZ (kalıcı kurallar — hepsi bağlayıcı)
- Atlasia deposundasın (React 19 + Vite + MapLibre + Firebase PWA). Önce AGENTS.md,
  ROADMAP.md §4 ve docs/gorevler/calisma-kurallari.md'yi oku.
- Soru sorma. Karar gereken her yerde kendi önerini seç, uygula ve teslimatta
  "Varsayılan karar: … / gerekçe: …" diye yaz.
- Deploy yok: firebase deploy (rules/index dahil), Cloudflare ayarı, main'e merge
  yok. İş bitince commit + push + PR aç; merge'i denetçi yapar.
- Yalnız aşağıdaki SAHİP OLDUĞUN DOSYALAR'a yaz. Başka dosya gerekirse dokunma,
  teslimatta "dosya talebi" olarak yaz. Diğer üç ajan aynı anda çalışıyor.
- firestore.rules gevşetilmez; yeni koleksiyon kuralı en dar haliyle eklenir ve
  emulator testiyle gelir. `as any`, boş catch, sessiz hata yutma yok.
  Başarısız kontrolü geçmiş gibi sunma; uydurma run ID/sayı yazma.
- Tasarım dili değişmez: koyu tema siyah, açık tema gerçek beyaz.
- Kapılar (PR öncesi hepsi): npm ci · npm run typecheck · npm run lint ·
  npm run test:run · npm run test:scripts · npm run build. Sandbox'ta Java yok:
  Rules emulator kanıtı CI'dan — `gh pr checks <no>` ve
  `gh api repos/efezztxj/Atlasia/actions/jobs/<job_id> -q '.steps[]'`.
  "Firestore security rules tests" adımı yeşil olmadan PR hazır değildir.
- Teslimat: docs/teslimatlar/teslimat-p4-tur4.md (commit listesi, komut
  çıktıları, CI job ID'leri, varsayılan kararlar, dosya talepleri, açık
  kalanlar) + sonda `git diff --check` ve `git status --short`.
- PR başlığı: "[P4] Tur 4 — rules düzeltmesi + tam hesap silme + gizlilik matrisi (Supersedes #40, #37)".

TABAN: PR #40'ın dalı. `git fetch origin '+refs/heads/arena/f80b0256-atlasia:refs/remotes/origin/arena/f80b0256-atlasia'`
sonra o daldan başla ve `origin/main`'i içine merge et. #40'ın işi senin
PR'ında kalmalı. #40/#37/#19'u kapatma.

SAHİP OLDUĞUN DOSYALAR (bu tur): firestore.rules, firestore.indexes.json,
storage.rules, tests/firestore.rules.test.ts, src/config/firestoreLimits*,
src/lib/groups*, friendships*, userProfiles*, notifications*, moderation*,
src/hooks/useBlocks*, sosyal paneller (GroupsPanel vb.), ReportDialog*, Header*,
Drawer*, BottomPanel*, AddDiscoveryModal*, Story*, Onboarding*, AtlasAssistant*,
yeni: src/lib/feedback.ts (+test), src/components/FeedbackDialog.tsx (+test).
YAZMA: legal.ts/AccountAccess (bu tur P1), routeData/useCollections (P2).
routes/tracks/savedPlaces/savedRoutes koleksiyonlarını moderation.ts içinden
kendi sorgunla sil; P2 dosyalarını değiştirme.

GÖREVLER (sırayla):
1. #40 CI düzeltmesi: son job 119510924986'da yalnız "Firestore security rules
   tests" adımı FAIL. Hangi testlerin neden düştüğünü bul (CI adım çıktısı veya
   test dosyası/rules karşılaştırması). Rules'ı gevşeterek değil, testi doğru
   senaryoya ya da kuralı doğru sıkılığa getirerek çöz. Ek zorunlu testler:
   üye olmayan kullanıcı grup belgesini/mesajlarını OKUYAMAZ (gerçekçi IO);
   joinCode deneme sayacı reddedilen katılım batch'inden AYRI yazımda kalıcı;
   arkadaşlık yetkisi çapraz kullanıcıda reddedilir.
2. Tam hesap silme (pilot engeli): deleteUserData şu an routes, tracks,
   users/{uid}/savedPlaces, users/{uid}/savedRoutes'u silmiyor ve grup/bildirim
   hatasını console.warn ile yutuyor. Düzelt:
   - Sahiplik alanını rules/şemadan doğrula (uid/ownerUid hangisiyse), sayfalı
     batch silme (≤500), tüm koleksiyonlar için.
   - Hata yutma yok: her adımın sonucu {deleted, failed, error?} raporu; herhangi
     biri başarısızsa deleteAccount Auth hesabını SİLMEZ ve kullanıcıya
     "silme tamamlanamadı, tekrar dene" döner (yarım silinmiş + hesapsız
     durumu engelle). Tekrar denemede idempotent.
   - Rules: kullanıcının kendi belgelerini silebildiği emulator testi; başkasınınkini
     silemediği negatif test.
   - moderation.io.test: tüm koleksiyonlar + kısmi hata senaryosu.
3. UZUN-12/P görünürlük matrisi: docs/denetim/gorunurluk-matrisi.md — profil,
   iz, rota (taslak/yayınlanmış), story, konum, kayıtlı yer/rota, grup, bildirim
   için "sahibi / arkadaş / grup üyesi / giriş yapmış herkes / anonim" kim neyi
   okur-yazar. Her hücre için emulator testi; matris ile rules uyuşmuyorsa
   rules'ı SIKILAŞTIR (gevşetme yok) ve teslimatta listele.
4. UZUN-12/G geri bildirim kanalı: `feedback` koleksiyonu — yalnız giriş
   yapmış kullanıcı create; istemci read/update/delete yok; alanlar sınırlı
   (kategori enum, metin ≤1000, uygulama sürümü, oluşturma zamanı = request.time,
   uid = auth.uid); konum/cihaz parmak izi toplanmaz. İstemci tarafı hız sınırı
   (ör. 5 dk'da 1) + rules'ta alan doğrulaması. Drawer'dan açılan
   FeedbackDialog. Saklama süresi önerisini teslimata yaz (otomatik TTL deploy
   yok). Hesap silmede kullanıcının feedback'i de silinir veya anonimleştirilir —
   kararını yaz.

KAPSAM DIŞI: yasal metin/AccountAccess (P1), App Check enforcement, rules deploy.

KABUL: CI'da rules adımı dahil tüm adımlar yeşil; hesap silme tüm koleksiyonları
siler ve hata durumunda Auth hesabını korur; matris + testler; feedback kanalı
testli; PR açık + "Supersedes #40, #37".
```

---

## Denetçi notu (insan okuyucu için)

- Sıra önerisi: P4 ve P3 önce (pilot engeli + kayıp iş), P2 ve P1 paralel.
- P4 PR'ı onaylanınca #40, #37 ve #19 kapatılır; P2 → #35; P3 → #38.
- Rules/index deploy, P4 merge edildikten sonra kullanıcı tarafından elle yapılır.

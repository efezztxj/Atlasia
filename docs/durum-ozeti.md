# Atlasia — Durum Özeti (dosyalardan çıkarıldı, 2026-10-20)

> Bu belge, `teslimat-p1..p4.md` dosyalarından ve repo içeriğinden derlenmiştir.
> Amaç: sandbox sıfırlamalarında kaybolmasın diye "ne yapıldı" kaydını repoda tutmak.

## Genel tablo
ROADMAP Adım 0–16 tamamlandı ve main'e merge edildi (PR #17, merge `fb2927a`).
Dört paralel ajan teslimat verdi: P1 temel ∥ P2 rota ∥ P3 içerik/saha ∥ P4 topluluk/uyum.
Denetim: 4/4 ACCEPTED + entegrasyon ACCEPTED. MapView (Adım 11) kullanıcı onaylı.

## P1 · TEMEL & KAPANIŞ (Adım 0–2) — `teslimat-p1.md`
- **Adım 0:** Depo temizliği (archive ignore), package adı `atlasia`, `.env.example` (6 `VITE_`),
  README kurulum/env/veri modeli/test/dağıtım sınırları + `AUTH_SETUP.md` / `CHANGELOG.md`.
- **Adım 1 (veri kontratları):** Yanıtlar `posts/{postId}/replies/{replyId}` alt koleksiyonuna taşındı;
  beğeni atomik `likedBy` toggle; story'den `seen` şeması çıkarıldı; feed/story 50, reply 100 kayıt limiti.
- **Adım 2 (test+CI):** geo/time/sun/polyline/routePlanner testleri; GitHub Actions Node 22 gate'i
  credential-free owner-index (7 sahte-IO testi) + Firestore Rules emülatör testi; App Check config testi.
- Kanıt: tsc/lint/test/build + CI yeşil (3 run).

## P2 · ROTA MOTORU (Adım 3–6) — `teslimat-p2.md`
- **Adım 3:** `AtlasRoute`/`AtlasTrack` tipleri + `src/lib/routeData.ts`; routes/tracks kuralları.
- **Adım 4:** `useTrackRecorder` (watchPosition, bilinçli atlanan callback yok); Douglas–Peucker 7 m;
  dwell eşiği ≥3 dk, doğruluk ölçekli 40–100 m; kayıt bitince özel `tracks` + dürüst metinli taslak rota.
- **Adım 5:** Rota düzenleyici (isim/açıklama/bölge/kapak), görünürlük `private` (varsayılan)/`unlisted`/`public`,
  kalıcı `/?route={id}` bağlantısı; `users/{uid}/savedPlaces|savedRoutes` bulut senkronu (karar c: BULUT).
- **Adım 6:** Rota keşif yüzeyi + RecordsDock (kayıtlı yer/rota, keşif filtreleri, özel izler).
- Kararlar: **(b) foto = JPEG data URL** (istemcide ≤180.000 karakter, kural reddeder) — nesne depolama/ücret yok.
- Açık: saha kanıtları kullanıcıda (1 km yürüyüş ±%15, iki cihaz); emülatör turu o ortamda koşamamıştı.

## P3 · İÇERİK & SAHA (Adım 7–12) — `teslimat-p3.md`
- **Adım 7:** Overpass envanteri + Wikidata/Wikipedia tarihçe (atıflı; karar f).
- **Adım 8:** Site içi tur modeli (Efes 3 saatlik örnek: `siteTours.ts` + fixture).
- **Adım 9:** Sıra-duyarlı yakınlık anlatımı (`tourGuide.ts`); histerezis (35 m enter / 50 m zayıf GPS).
- **Adım 10:** Erişim tipi duraklar + lacak modu (`routeLegs.ts`, `accessExample.ts`).
- **Adım 11:** Yükseklik profili (`elevation.ts`, gerçek DEM + sentetik fallback) + **bacak bazlı çizim
  (`MapView.tsx` +61/-1) — AYRI ONAY GEREKTİRİYOR → kullanıcı ONAYLADI.**
- **Adım 12:** Çevrimdışı saha paketi (`public/sw.js`, `offlineCache.ts`, tile prefetch LRU 500).
- Açık noktalar (teslimatta dürüstçe yazıldı): canlı Overpass yalnız gerçek ağda; Wikidata TR eksik olabilir;
  sentetik yükseklik fallback; offline kota kapsamı; zayıf GPS'te yanlış tetikleme histerezisle azalır.

## P4 · TOPLULUK & UYUM (Adım 13–16) — `teslimat-p4.md`
- **Adım 13 Moderasyon:** `ReportDialog` + `moderation.ts` → `reports/{id}` (kapalı listeler); engelleme
  `blocks/{blockerUid}_{blockedUid}` + `useBlocks` istemci filtreleri; sahip-silme korundu.
- **Adım 14 Tazelik:** `verifications/{id}` (status: still_open/fee_changed/road_closed/free_entry/closed);
  `freshness.ts` 30g ×1.35 / 90g ×1.10 / bayat ×0.80; tek canlı dinleyici limit(50).
  **XP/rozet/takip: karar (d) BAĞLI — yalnız Blaze onayından sonra.**
- **Adım 15 Hava:** `weather.ts` Open-Meteo anahtarsız; saatlik; 7 durak tek HTTP; varış saatine göre.
- **Adım 16 Grup+sohbet:** `groups.ts` + `notifications.ts` Firestore (karar g); kurallar 1-20 üye,
  mesaj yazım/silme, son mesaj güncelleme; kurallar emülatör testleri eklendi.
- P4'ün sonraki görev listesi: (1) emülatör CI + rules deploy — ✅ BİTTİ (CI'da 23/23 yeşil, main'de);
  (2) iki gerçek hesapla canlı duman testi — KULLANICIDA; (3) moderasyon kuyruğu/itiraz — YENİ İŞ;
  (4) hava harita katmanı (MapView onayı ile) — YENİ İŞ.

## Entegrasyon notu (denetim kaydı — teslimatlar dışında)
- PR #17 birleştirilirken CI bisect ile bulunanlar düzeltildi: `firestore.rules` yapısal çöküş
  (savedRoutes kapanış parantezi), gövdesiz test kabuğu, P4 test tutarsızlıkları ×2
  (spoofed/forged vakaları aslında meşruydu), P1 no-op kilidi (`changed.size() == 0`) restorasyonu,
  blocks/reports liste sahiplik filtresi. Son kapılar: tsc 0 · lint 0 · 225/225 · 23/23 kurallar emülatör · build.
- Teslimatlardaki "CI yeşil" iddialarından yalnız P1'inki gerçekti (P2/P3/P4 dallarında hiç CI run'ı yoktu).

## 2. tur görevleri (kullanıcı onaylı dağılım)
- Agent-1: A4 içerik doldurma → `docs/gorevler/gorev-a4-icerik.md`
- Agent-2: B1+B2+D küçük işler → `docs/gorevler/gorev-paket-b.md`
- Agent-3: C1 web push → `docs/gorevler/gorev-c1-webpush.md` (⚠️ "C1 başla" denmeden başlamaz)
- Kullanıcı: A1 canlı kabul turu · A2 1 km yürüyüş (±%15) · A3 iki cihaz+uçak modu · B3 Console gözlem · C2 beta davet

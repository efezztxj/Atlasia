# P4 Tur 4 — rules düzeltmesi + tam hesap silme + gizlilik matrisi

Dal: `arena/f80b0256-atlasia` · PR: #40 (başlık: "[P4] Tur 4 — rules düzeltmesi + tam hesap silme + gizlilik matrisi (Supersedes #40, #37)")
Taban: `origin/main` = c7c30c9 (PR #41 birleşmiş hâli), merge ile dala alındı.
PR #37/#19 kapatılmadı. Merge denetçide.

## 1. CI durumu (dürüst özet)

- Önceki koşular (run 39683289900 / job 119510924986 ve run 39687807381 / job 119526569430): yalnız
  **"Firestore security rules tests"** adımı başarısız; diğer adımlar (typecheck, lint, test, build) geçti.
- **Kök neden BULUNAMADI.** Log indirme (results-receiver / blob) sandbox'tan erişilemiyor; check-run
  annotation'ları yalnız "exit code 1" veriyor; artifact yok.
- Teşhis notu: `scripts/run-firestore-rules-tests.mjs` emulator jar'ını `storage.googleapis.com`'dan
  indiriyor, SHA doğruluyor, `--rules firestore.rules` ile başlatıyor, 30 sn port bekliyor. "exit code 1"
  ve test adı olmaması şu iki durumla uyumlu: (a) emulator başlamadı (indirme/SHA/kural derleme hatası),
  (b) test dosyası içinde bir `it` düştü ama vitest çıktısı loglanmadı. Hangisi olduğu log olmadan kesin değil.
- Yerelde doğrulanamayan: `firestore.rules` derlemesi (yerel `firebase-rules-parser@2.0.1` bozuk sözdizimini
  de kabul ediyor — güvenilir değil), emulator (jar hiçbir izinli kaynakta yok).
- Bu turda yapılan rules değişiklikleri (feedback bloğu, hesap silme testleri, matris testi) **CI'da
  doğrulanmamıştır**. Aşağıdaki CI job ID bölümü push sonrası gerçek sonuçla doldurulacak.

**Kullanıcının yapacağı (CI kanıtı için):** GitHub → Actions → PR #40 koşusu → "Firestore security rules tests"
adımının tam logunu paylaşın. Log yoksa şu yerel komutu bir Java 21 makinesinde çalıştırın:
`npm run test:rules:emulator` ve çıktıyı paylaşın.

## 2. Commit listesi (bu tur)

| Commit | Konu |
|---|---|
| 7ac0d57 | P4 hesap silme: hata yutulmaz, tüm sahip verisi adım adım silinir |
| 20653a2 | P4 rules testi: rota görünürlüğü ve hesap silme kayıt sayacı |
| 457fc1b | docs(p4): tur 4 durum (önceki tur özeti) |
| 096589f | P4 hesap silme raporu: her adım {deleted, failed, error}; hata varsa Auth silinmez |
| 066fa71 | P4 rules testi: hesap silme her sahip koleksiyonunda yalnız sahibi siler |
| dc45292 | P4 geri bildirim kanalı: feedback koleksiyonu + FeedbackDialog + hesap silmede feedback |
| d475425 | P4 görünürlük matrisi: docs/denetim/gorunurluk-matrisi.md + rules matris testi |
| (merge) | origin/main (c7c30c9) dala merge edildi |

## 3. Madde → dosya / test tablosu

| Madde | Durum | Dosya | Test |
|---|---|---|---|
| 1 CI rules hatası | **Açık** (kök neden bilinmiyor; §1) | — | — |
| 1 üye olmayan grup okuma (IO) | Mevcut (önceki tur) | src/lib/groups.io.test.ts | "kod-katılma: üye olmayan grup belgesini okuyamaz" + rules "grubu yalnız kurucu oluşturur, yalnız üyeler okur" |
| 1 joinCode sayacı ayrı yazımda kalıcı | Mevcut | src/lib/groups.io.test.ts | "yanlış kod: üye eklenmez ve deneme sayacı kalıcı olarak artar" |
| 1 çapraz arkadaşlık reddi | Mevcut | tests/firestore.rules.test.ts | "C1 arkadaslik … başkasının listesine kendini yazma → FAIL" |
| 2 tam hesap silme | **Yapıldı** | src/lib/moderation.ts | moderation.io.test: "rota sayacını, arkadaşlığı, profili…", "grup üyeliği temizlenemezse hata yutulmaz" |
| 2 sahiplik alanı doğrulama | Yapıldı (şema): routes/places/posts/stories/tracks/reports/blocks/verifications: `authorUid`/`reporterUid`/`blockerUid`/`uid`; feedback: `uid`; users/{uid}/*: yol sahibi | moderation.ts | rules "hesap silme: sahip olunan her belge sahibince silinir; başkasınınki silinemez" |
| 2 sayfalı silme | Yapıldı (sayfa 50, döngü sınırı 200) | moderation.ts | moderation.io (birden çok sayfa dolaylı) |
| 2 hata yutma yok, Auth korunur | Yapıldı: her adım raporu, hata varsa `data/delete-incomplete` ve Auth silinmez | moderation.ts | "doğrulama kayıtları silinemezse… Auth'u silmez" |
| 2 idempotent | Yapıldı: boş belge atlanır | moderation.ts | — (doğal) |
| 3 görünürlük matrisi | Yapıldı | docs/denetim/gorunurluk-matrisi.md | rules "görünürlük matrisi: profil, iz, rota…" |
| 3 rules sıkılaştırma | Gerekmedi: matrisle rules uyuşuyor; değişiklik yok | — | — |
| 4 geri bildirim kanalı | Yapıldı | firestore.rules (match /feedback), src/lib/feedback.ts, src/components/FeedbackDialog.tsx | rules "geri bildirim: …"; feedback.test.ts (7); FeedbackDialog.test.ts (4) |
| 4 hız sınırı | İstemci: 5 dk/kullanıcı | src/lib/feedback.ts | feedback.test "5 dakika içindeki ikinci gönderim" |
| 4 alan doğrulama | Rules: hasOnly/hasAll, enum, ≤1000, appVersion ≤40, createdAt==request.time, uid==auth | firestore.rules | rules feedback testi (her alan ihlali FAIL) |

## 4. KARAR satırları

- KARAR: Hesap silme her adımı çalıştırır, hataları toplar; herhangi bir adım başarısızsa Auth hesabı silinmez ve `data/delete-incomplete` döner. | GEREKÇE: Yarım silinmiş + hesapsız durumu önler; eski kod grup hatasını console.warn ile yutup Auth'u siliyordu. | ALTERNATİF: İlk hatada dur (fail-fast). | GERİ ALMA: `deleteUserData` içindeki toplama döngüsünü tek tek `await` ile değiştir (tek commit).
- KARAR: Bulunmayan ve başkasının özel rotası aynı şekilde reddedilir (permission-denied). | GEREKÇE: Varlık sızdırılmaz. | ALTERNATİF: Ayrı "bulunamadı" kuralı. | GERİ ALMA: `routes` get kuralına `resource == null` dalı ekle.
- KARAR: Kayıtlı rota silinirken rota sayacı aynı batch'te düşürülür; rota yoksa yalnız kayıt silinir. | GEREKÇE: `savedRouteCounterDecreased` kuralı bunu zorunlu kılar. | ALTERNATİF: Sayaçsız silme (kural reddeder). | GERİ ALMA: —.
- KARAR: Geri bildirim `get` kapalı, `list` ve `delete` yalnız sahibine açık; hesap silmede kullanıcının geri bildirimleri silinir (anonimleştirme yok). | GEREKÇE: Silme için liste gerekir; anonimleştirme update izni gerektirirdi (istemci update yok). | ALTERNATİF: Anonimleştirme için Cloud Function (deploy, kapsam dışı). | GERİ ALMA: moderation.ts `OWNED_TOP_LEVEL` içindeki feedback satırını ve rules `allow list`/`delete` satırlarını kaldır.
- KARAR: Geri bildirim girişi `ProfilePanel`'de (Drawer değil). | GEREKÇE: Drawer mekân listesi; hesap ve veri işleri profil panelinde. | ALTERNATİF: Drawer'a ekleme. | GERİ ALMA: düğmeyi taşı.
- KARAR: İstemci geri bildirim hız sınırı 5 dk/kullanıcı, yerel depoda. | GEREKÇE: Rules geçmiş kayıtları sayamaz; yalnız kolay kötüye kullanımı keser. | ALTERNATİF: App Check + Function. | GERİ ALMA: `FEEDBACK_COOLDOWN_MS = 0`.
- KARAR: Hikâye ve doğrulama `get: true` (anonim dahil) kalır. | GEREKÇE: Kamusal keşif içeriği. | ALTERNATİF: giriş zorunluluğu (keşfi kırar). | GERİ ALMA: `signedIn()` koşulu.
- KARAR: Konum/yer kaydı kamusal; konum geçmişi (`tracks`) yalnız sahibinde. | GEREKÇE: Yerler harita içeriği; iz kişisel. | ALTERNATİF: yerleri gizlemek. | GERİ ALMA: —.
- KARAR: Uygulama sürümü `FEEDBACK_APP_VERSION` sabitinde; test `package.json` ile eşleşmeyi doğrular. | GEREKÇE: Kaynak yok; yeni env (`VITE_`) eklemek kuralına aykırı. | ALTERNATİF: Vite `define` (vite.config P1 dosyası). | GERİ ALMA: —.

## 5. Açık noktalar

- Karşı tarafın `users/{arkadaş}/friends/{uid}` indeksi kuralla silinemez; UI `friendships` ile doğrulamalı.
- Giden arkadaş istekleri alıcı kutusunda kalır (gönderen listesi yok).
- Sahibi olunan grubun mesajları grup silinince yetim kalır (mesaj silme yalnız gönderene).
- Başkasının özel rotası kaydedilmişse savedRoutes adımı `getDoc` izni nedeniyle düşebilir → hesap silinmez (bilinçli, kullanıcıya hata).
- Feedback saklama süresi önerisi: 180 gün, sonra toplu silme (TTL deploy yapılmaz; önerildi).
- Rules emulator testleri bu turda **yerelde çalıştırılamadı**; CI kanıtı bekleniyor.
- Tur 4'te yapılmayanlar: madde 5 (bildirim normalizasyonu), 6 (eski reply), 7 (storage), 8 (XP/rozet), 9 (moderasyon kanıtı), 10 (gizlilik metni), 12 (veri indirme), 13 (erişilebilirlik), 14 (PR #19), 15 (ROADMAP/CHANGELOG).

## 6. DOSYA TALEBİ

- Yok. Tüm değişiklikler sahip olunan dosyalarda. `scripts/run-firestore-rules-tests.mjs` ve `vitest.config.ts`
  (`*.test.ts` dışı `.tsx` testlerini dışarıda bırakıyor) P1/altyapı dosyası: dokunulmadı.
  - Öneri: vitest include'a `src/**/*.test.tsx` eklenirse dialog testleri doğrudan `.tsx` olabilir (şimdilik `.test.ts` + createElement).

## 7. Kapı çıktıları (yerel, bu tur son koşu)

- `npm ci`: başarılı.
- `npm run typecheck`: başarılı.
- `npm run lint`: başarılı (`--max-warnings=0`).
- `npm run test:run`: 77 dosya, 462 test geçti.
- `npm run test:scripts`: başarılı.
- `npm run build`: başarılı, "Bundle bütçesi içinde".
- `npm run audit:check`: "Üretim bağımlılıklarında bilinen açık bulunmadı."
- `npm run test:rules:emulator` / `vitest --config vitest.rules.config.ts`: **yerelde çalıştırılamadı** (Java 21 + emulator jar yok). CI kanıtı bekleniyor.
- `git diff --check`: temiz.

## 8. CI sonucu

- Son koşu: run 39688953859, job 119530037342 — **KIRMIZI**. Başarısız adım: "Firestore security rules tests".
  Diğer adımlar (typecheck, lint, test, build, audit) bu koşuda sonuçlandı; yalnız rules adımı başarısız.
- Kök neden bu turda da bulunamadı (log erişimi yok; §1). PR #40 bu hâliyle teslim edilebilir DEĞİL.
- Önceki koşular: run 39687807381 / job 119526569430 (aynı adım kırmızı).

## 9. ROADMAP / CHANGELOG önerisi

- ROADMAP §4 (P4): "Geri bildirim kanalı (feedback) yazıldı; hesap silmede tam veri temizliği ve görünürlük matrisi." — yalnız öneri; ROADMAP P1'e aittir.
- CHANGELOG: "Hesap silme artık hata durumunda Auth hesabını silmez; geri bildirim gönderme eklendi."

## 10. Kullanıcının elle yapacakları

- PR #40 koşusunun "Firestore security rules tests" adımı logunu paylaşmak (veya yerelde `npm run test:rules:emulator`).
- Rules deploy'u (bu turda yok; deploy onayı sonra): firestore.rules'ta feedback bloğu ve hesap silme için delete kuralları değişti — yeni kural deploy edilmeden istemci feedback'i çalışmaz.
- Feedback saklama süresi kararını onaylamak.

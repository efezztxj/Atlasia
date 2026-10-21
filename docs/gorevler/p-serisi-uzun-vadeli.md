# P-Serisi · Uzun Vadeli Görev Planı (Gece Vardiyası)

> Oluşturma: 2026-10-21 · Durum: aktif plan
> Bu dosya, P1–P11 sonrası uzun süreli (geceler boyu sürdürülebilen) görevlerin
> tek kaynağıdır. Kopyala-yapıştır prompt'ları
> [`p-serisi-kodcu-promtlari.md`](p-serisi-kodcu-promtlari.md) dosyasındadır.

## 0. Nasıl kullanılır

1. Bir vardiyada en fazla **bir** P-görevi alınır; görev bitmeden yenisine başlanmaz.
2. Göreve başlamadan önce `git status --short --branch` çıktısı kontrol edilir;
   kirli ağaç varsa mevcut değişiklikler **dokunulmadan** korunur, görev ertelenir
   veya kullanıcının o turda verdiği açık talimat izlenir.
3. Görev, ilgili kodcu prompt'u bire bir kopyalanarak başlatılır. Prompt dışında
   kapsam genişletilmez; genişletme ihtiyacı teslimata "açık nokta" olarak düşülür.
4. Görev bittiğinde `teslimat-pN.md` dosyası (kök dizin) P4 formatıyla yazılır ve
   aşağıdaki durum tablosu güncellenir.
5. Commit / push / PR / merge / deploy yalnızca kullanıcının açık onayıyla yapılır.
6. **C1 Web Push** bu seriden bağımsızdır; kullanıcı tam olarak "C1 başla"
   demeden başlatılmaz ve aşağıdaki görevlerin hiçbirinde hazırlık koduna bile
   girilmez (sahte push aboneliği, VAPID iskeleti vb. yazılmaz).

## 1. Bağlam notları (aktif görevlerin dayandığı kapanmış işler)

> Kural: biten görev ana listeden kaldırılır, geçmişi `teslimat-pN.md`
> dosyasında yaşar (P1–P4 bu kurala uyularak çıkarıldı; prompt'ları
> [`p1-p2-p3-p4-promtlari.md`](p1-p2-p3-p4-promtlari.md) içindedir).
> Aşağadakiler tablo maddesi değil, P12+ görevleri için zorunlu bağlamdır:

| Görev | Konu | Not |
|---|---|---|
| P5 | `run-firestore-rules-tests.mjs` locale | Emulator JVM'e İngilizce locale eklendi. Windows'ta son hâli **henüz yeniden çalıştırılmadı** — çalışan doğrulama yoksa "doğrulandı" denmez (→ P12 bunu kapsıyor) |
| P10 | `MapView.tsx` spin | Spin döngüsü **15 FPS `setTimeout`** kullanıyor; rAF varsayma. Profil yokken performans iddiası yok. ⚠️ **Denetim şerhi (2026-10-21, `arena/c064e040-atlasia`):** bu ağaçta spin `requestAnimationFrame` kullanıyor (MapView.tsx:655-657); P10 işi bu dalda yok — bkz. `denetim-p1-p4-2026-10-21.md` |
| P11 | Offline cache allowlist | `offlineCache.ts` + `public/sw.js` tam HTTPS host/path; LRU güncellendi; lookalike URL testleri var. **Cache allowlist işi bitti, yeniden açma.** ✅ **2026-10-22: main'de doğrulandı** — `f3c28e5` main'in atası; `offlineCache.ts` ve `sw.js` `host === … && pathname.startsWith(…)` kullanıyor. (Eski şerh tarihsel:) ⚠️ **Denetim şerhi (2026-10-21, `arena/c064e040-atlasia`):** bu ağaçta `isCacheableTile` hâlâ `url.includes(...)` substring eşleşmesi kullanıyor (offlineCache.ts:25-31, sw.js:19-22); tam host/path daraltması bu dalda yok — bkz. `denetim-p1-p4-2026-10-21.md` |

## 2. Kalıcı kısıtlar (her görevde geçerli)

- `AGENTS.md` kuralları ve ROADMAP §4 "Dokunma listesi" aynen geçerlidir:
  - `MapView.tsx` katman/tile/marker/event mantığı — ayrı onay olmadan değişmez.
  - `firestore.rules` gevşetilmez, yalnız sıkılaştırılır. `storage.rules` kapalı kalır.
  - `as any`, `@ts-ignore`, boş `catch` eklenmez; testi geçirmek için assertion
    zayıflatılmaz; Esri tile'ları toplu indirilmez/önbelleklenmez (lisans).
- ROADMAP §8'deki ⛔ karar maddeleri (b foto, c bulut senkron, d XP fonlama,
  e native sarmalayıcı, g sohbet maliyeti) kullanıcı kararı olmadan kodlanmaz;
  görev bunlardan birine dayanıyorsa karar notu yazılır ve durulur.
- Git güvenliği: `reset --hard`, `clean`, `stash`, rebase, force-push,
  zorla checkout/restore — kullanıcı onayı olmadan yasak.
- Kalite kapısı (AGENTS.md): temiz kurulumda `npm ci` ardından
  `npm run typecheck`, `npm run lint`, `npm run test:run`,
  `npm run test:rules:emulator`, `npm run build`, `npm run audit:check`.
  Emulator Java 21 ister; ortamda yoksa görev prompt'unda belirtildiği şekilde
  düşülür, "geçti" denmez.
- Teslim kanıt ister: komut + çıktı özeti + değişen dosyalar + bilinen riskler.

## 3. Durum tablosu (P12+)

| ID | Görev | Tahmini süre | Tip | Bağımlılık | Durum |
|---|---|---|---|---|---|
| P13 | Harita etiket çakışması kusuru (kktc-label vs Esri) — doğrulama + kalibrasyon kilidi | ~3–4 sa | doğrulama | tarayıcı kanıtı | ✅ tamamlandı — kullanıcı onayıyla B düzeltmesi uygulandı (`teslimat-p13.md`) |
| P14 | Overpass + Wikidata/Wikipedia içerik boru hattı (atıf dahil) | 1–2 gece | özellik | karar (f) seçili: 1 | ⏳ bekliyor |
| P15 | Çevrimdışı saha paketi: tile önbelleği (lisans-güvenli kaynaklar) | 1 gece | özellik | P11 allowlist'e dokunmadan genişletme | ⏳ bekliyor |
| P16 | Testsiz modül kapsama maratonu (utils/lib/hooks) | 1 gece+ | test | yok | ✅ tamamlandı — utils/lib/hooks envanterinin tamamında ilişkili test var; kapanış: `teslimat-p16.md` (73 dosya / 399 test) |
| P17 | track → taslak rota boru hattı (durak tespiti + sadeleştirme) | 1–2 gece | özellik | ROADMAP Adım 4 | ✅ çekirdek tamamlandı — PR #32 (`6a4d2aa`, main `38dfa3a`); `teslimat-p17-kurtarma-2026-10-21.md`. Onaylı kaydet akışı PR #35'te sürüyor (işaretlenmedi) |
| P18 | Erişilebilirlik denetimi (klavye/odak/kontrast, tema çiftleri) | 1 gece | kalite | AGENTS tema kararı | ⏳ bekliyor |
| P19 | Bundle bütçesi + lazy-loading derin taraması (ölçüm, iddia yok) | ~3–5 sa | perf-araç | `lazyLoading.test.ts` | ✅ tamamlandı — Auth preload sızıntısı kapatıldı, bundle bütçesi kilitlendi; kapanış: `teslimat-p19.md` |
| P20 | Rota paylaşım linki (yalnız istemci içi kodlama, Firestore'suz) | 1 gece | özellik | karar (c) ⛔ — buluta geçmeden | ⏳ bekliyor |

### 3.1 Tamamlanan ek işler (P serisi dışı, 2026-10-21/22)

| İş | PR / commit | Durum |
|---|---|---|
| Üretim izin düzeltmesi (rota yayını/kaydı, undefined alan, grup katılımı) | #31 · `d393b4c` | ✅ tamamlandı — `teslimat-uretim-izin-2026-10-21.md` |
| P17 kurtarma + bacaklı rota Firestore serileştirmesi | #32 · `38dfa3a` | ✅ tamamlandı — `teslimat-p17-kurtarma-2026-10-21.md` |
| T1-AUTH: telefon bayrağı (varsayılan kapalı) + üretim env kapısı | #33 · `447fbaa` | ✅ tamamlandı — `teslimat-t1-auth.md` |
| P1 hijyen: PR triyajı, çalışma kuralları, CHANGELOG/ROADMAP | #36 · `0ad774f` | ✅ tamamlandı — `teslimat-p1-hijyen.md` |
| P11 tile allowlist (tam host/path) | `f3c28e5` | ✅ main'de doğrulandı |
| PR #30 (eski P17) | — | ✅ kapatıldı (#32 ile yerine geçildi) |
| PR #34 (P1 ilk teslim) | — | ✅ kapatıldı (#36 ile yerine geçildi) |

> Süren işler işaretlenmedi: PR #35 (P2 P17-Tur2), PR #37 (P4 T1-SOSYAL), PR #38 (P3 tazelik), ayrıca P1–P4'e verilmiş güncel görev metinleri.

"Sabaha kadar" hedefi: bir gecede tek görev; biterse teslimat yazılır, tablo
güncellenir ve **durulur** — kullanıcı talimatı olmadan sıradaki göreve
gece yarısı kendi başına geçilmez.

## 4. Gece vardiyası çalışma düzeni

- Vardiya başı kontrol listesi:
  1. `git status --short --branch`
  2. Önceki teslimat (`teslimat-p*.md` en günceli) + bu dosyanın durum tablosu
  3. Görev prompt'undaki "Başlamadan doğrula" maddeleri
- Vardiya içinde:
  - Önce ilgili modülleri okuyup mevcut davranışı test/fixture ile kilitle
    (karakterizasyon), sonra değişikliği yap. Değişiklikten önce yeşil,
    sonrasında yeşil kanıtı olmadan "bitti" yok.
  - Saat başı mental checkpoint: kapsam kaydı mı, dokunma listesine temas
    oldu mu, yarım kalan yüzey var mı?
- Vardiya sonu:
  - `teslimat-pN.md` yazılır; görev ✅ kapandıysa satırı bu tablodan
    **kaldırılır** (geçmiş teslimat dosyasında), ⚠️/yarım ise kalır,
    `git diff --check` + `git status --short` çıktısı teslimata eklenir.
  - Yarım kaldıysa durum 🚧 ve "tamamlanma koşulu" tek cümleyle yazılır.

## 5. Kapsam dışı (bu seride ASLA)

- C1 Web Push ve her türlü push abonelik/bildirim altyapısı değişikliği
  (ayrı seri, açık başlatma talimatı ister).
- Prod veri migrasyonu, canlı Firestore yazımı, deploy.
- Firebase Storage/Blaze veya ücretli servis ekleme (kullanıcı onayı şart).
- Native/Capacitor sarmalayıcı (karar (e) kullanıcıda).
- Tasarım/yerleşim değişikliği (AGENTS.md korunan ürün kararları).

## 6. Değişiklik geçmişi

| Tarih | Değişiklik |
|---|---|
| 2026-10-21 | İlk sürüm: P12–P20 tanımlandı, P1–P11 kapanış notları taşındı |
| 2026-10-21 | P1–P4 prompt'ları ayrı dosyaya çıkarıldı, satırı ana listeden kaldırıldı; "biten görev tablodan kalkar" kuralı eklendi |
| 2026-10-21 | P12 kapatıldı (PR #20, CI emulator kanıtlı) ve satırı kural gereği kaldırıldı; geçmişi `teslimat-p12.md` içinde |
| 2026-10-22 | Tamamlananlar işaretlendi: P17 çekirdeği ✅, P11 main doğrulaması ✅, §3.1 ek işler tablosu (#31, #32, #33, #36); süren işler işaretlenmedi |
| 2026-10-21 | P19 kapatıldı — Firebase Auth preload sızıntısı düzeltildi ve `scripts/bundle-budget.mjs` ile üretim bundle bütçesi kilitlendi; ayrıntı `teslimat-p19.md` içinde |

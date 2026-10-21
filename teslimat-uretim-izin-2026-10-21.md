# Teslimat: Üretim izin ve undefined hataları (2026-10-21)

**Branch:** `arena/c0456a24-atlasia` · **Taban:** `main` @ `a25e87e`
**Tetikleyici:** Kullanıcının `atlasia.pages.dev` ekran görüntüleri (Firebase hesabıyla giriş yapılmışken).

## Belirtiler → kök nedenler

| Belirti | Kök neden | Düzeltme |
|---|---|---|
| Rota yayınla (Bağlantısı olanlar) → "Missing or insufficient permissions." | `publishRoute` yazmadan önce `routes/{id}` belgesini okuyor. Kural `resource.data` okuduğu için belge **henüz yokken** `resource == null` oluyor ve okuma reddediliyor. Yazmaya hiç sıra gelmiyor. | Ön okuma `readRouteIfVisible` ile yapılır. `permission-denied` "okunabilir rota yok" sayılır ve doğrudan create yazılır. **Kurallar değişmedi.** |
| Rota "Kaydet" / Kayıtlarım'da kalıcı "Missing or insufficient permissions." | `saveRouteReference` içinde aynı ön okuma. | Aynı yardımcı kullanıldı. Yazma reddi Türkçe mesaja çevrilir, `cause` korunur. |
| "Unsupported field value: undefined (found in field place.image …)" | Firestore `undefined` alanı reddeder. `Place.image` ve `AtlasRoute.origin` (durağı olmayan yürüyüş taslağında) gibi alanlar `undefined` gidiyordu. | `withoutUndefined` yardımcısı eklendi. Kayıtlı yer, rota ve iz yazımlarında undefined alanlar derinlemesine ayıklanır; sentinel'lere dokunulmaz. |
| Silinmiş kayıtlı rota tüm Kayıtlarım'ı hataya düşürebiliyordu | Abonelik her rota için `getDoc` yapıyor, olmayan belge `permission-denied` veriyordu. | O rota atlanır, koleksiyonun geri kalanı yüklenir. |
| Paylaşılan rota linki silinmiş/özel rotada ham hata | `getPublishedRoute` için de aynı durum. | `null` döner ve mevcut "bulunamadı veya artık paylaşılmıyor" mesajı görünür. |
| Gruplara katılınamıyor | (1) Listede grup kimliğinin yalnız ilk 8 karakteri görünüyordu. Paylaşılan kısa kimlikle belge bulunmuyor ve kural reddediyordu. (2) Zaten listede olan gruba tekrar "Katıl" denince indeks ikinci kez yazılıyor, `users/{uid}/groups` update kapalı olduğu için ham izin hatası çıkıyordu. (3) Davet bildirimindeki "Grubu aç" grubu açıyor ama kişinin grup listesine eklemiyordu. | Tam kimlik listede seçilebilir görünür. Açık grupta "Grup kimliğini kopyala" düğmesi var. `joinGroup` girdiyi kırpar ve indeks varsa yeniden yazmaz. Bildirimden açılan grup `joinGroup` yolundan geçip listeye eklenir. Hata mesajı nedeni açıklar. |

## Bilinen sınır (kod/kural kararı gerektirir, bu teslimatta yapılmadı)

- Kurucu, grubu kurduktan **sonra** üye ekleyemez. Arayüz yok. Kural tarafında da gruptaki `lastMessage` başka birine aitse kurucunun `validGroupShape` güncellemesi reddedilir. Kalıcı çözüm PR #19'un (katılma kodu) C1/C2 düzeltmeleriyle taşınmasıdır (P4 görevi). Şimdilik grup kurulurken üye hesap kimlikleri eklenmelidir.

## Değişen dosyalar

- `src/lib/firestoreValue.ts` (yeni) + `src/lib/firestoreValue.test.ts` (yeni)
- `src/lib/routeData.ts`, `src/lib/routeData.io.test.ts`: sahte Firestore artık gerçek kurallar gibi olmayan rota okumasını reddediyor ve undefined yazımı reddediyor. Eski kodla 4 test kırmızıya düştü, yeni kodla yeşil.
- `src/lib/groups.ts`, `src/lib/groups.io.test.ts`
- `src/components/GroupsPanel.tsx`
- `tests/firestore.rules.test.ts`: kök nedeni belgeleyen emulator testi. Olmayan rota ön okuması reddedilir, kayıtlı yer ve grup indeksi ön okuması başarılı olur, yürüyüş taslağı unlisted olarak oluşturulabilir. **Kural dosyası değişmedi.**

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm ci` | ✅ |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm run test:run` | ✅ 74 dosya / 410 test |
| `npm run test:scripts` | ✅ 7/7 + 6/6 |
| `npm run build` | ✅ bundle bütçesi içinde |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⚠️ Yerelde Java 21 yok. CI (push) sonucu esas alınır |
| `git diff --check` | ✅ |

## Deploy notu

- İstemci düzeltmesi: `main`'e merge → Cloudflare Pages build. Firestore Rules **değişmediği** için `firebase deploy` gerekmez.
- Ekrandaki eski hata kutuları yeni build yüklenince ve sayfa yenilenince kaybolur.

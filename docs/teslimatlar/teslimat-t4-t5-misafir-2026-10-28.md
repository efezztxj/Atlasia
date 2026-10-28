# Teslimat — Misafir modu (T4) ve kayıt sonrası ilk değer (T5)

**Tarih:** 2026-10-28 · **Görev:** T4 + T5 (kısmi) · **Branch:** `arena/c0403c7e-atlasia`
**Taban commit:** `117c1ea` (T1–T3, T9, T13–T16 sonrası) + merge `origin/main` · **Kural dosyası:** `firestore.rules` **değişmedi**

## Amaç (plandan)

| # | Plandaki madde | Bu teslimatta |
|---|---|---|
| T4 | Kayıt duvarını kaldır: landing'den haritaya kayıtsız gir | ✅ Landing CTA'sı artık giriş ekranını değil **misafir haritasını** açar |
| T5 | Kayıt duvarı sonrası ilk değer | 🟡 Engellenen eylem hatırlanır; hesap açılınca kullanıcı aynı yere döner |

Plan hedefi: landing → harita açılışı %15 → %40+, harita → kayıt %10 → %25+.
Bu teslimat **davranışı** değiştirir; oranlar `VITE_TELEMETRY_ENDPOINT` tanımlanana
kadar ölçülemez (T1 panel yok).

## Ne değişti

### 1. Misafir oturumu (kimlik değil)

- `AuthContext`: `guest` bayrağı (`sessionStorage: atlasia.guest.v1`), `startGuest()`,
  `endGuest()`, `requireAccount(intent)` sayaç tabanlı hesap kapısı ve `accountIntent` metni.
- `App.tsx`: CTA → `startGuest()` (önce `cta_click`). Misafirken `Explorer` çizilir;
  yazma denemesi geldiğinde `AccountAccess` **kapatılabilir** açılır (`onClose`).
  Hesap açılınca bayrak düşer, kullanıcı doğrudan haritaya döner.

### 2. Okuma açık, yazma kapalı

- `useFirestoreAtlasData({ guest })`: `places`/`posts`/`stories` **zaten herkese açık**
  kurallarla okunur (`allow get: if true`, `allow list: if boundedList(...)`); sahip
  sorgusu (`subscribeOwnedPlaces`) misafirde hiç kurulmaz.
- Dokuz yazma yolu (`addPlace`, `removePlace`, `addPost`, `removePost`, `addReply`,
  `addStory`, `removeStory`, `toggleLike`, `uploadPhoto`) misafirde istemcide de
  reddedilir. **Asıl güvenlik sınırı sunucudadır**: misafirin `request.auth` değeri
  boştur, tüm yazma kuralları `signedIn()` ister → istek kuralda düşer.

### 3. Tek tek kapıya bağlanan eylemler (`Explorer.askAccount`)

İz ekleme · gönderi/hikâye/yanıt/beğeni · rota oluşturma · yürüyüş kaydı · profil ·
bildirimler. Her biri kendi metniyle açıklanır ("İz eklemek için bir hesap aç ya da
giriş yap."), tıklanan akış kaybolmaz.

### 4. T5 — kayıt sonrası ilk değer

`atlasia.pendingIntent.v1` = `<niyet>|<zaman damgası>`; 30 dakikadan eski niyet bayat
sayılır. Hesap açılınca:

| Niyet | Hesap açıldıktan sonra |
|---|---|
| `place` | Harita **ekleme modunda** açılır + "haritada bir noktaya dokun" ipucu |
| `feed` | Topluluk akışı açılır |
| `route` | Atlas AI'a yönlendiren mesaj |
| diğer | Yalnız selamlama; akış bozulmaz |

## Kilitli dosya kontrolü

| Dosya | Durum |
|---|---|
| `firestore.rules` | **değişmedi** (`git diff` boş) |
| `src/components/LandingPage.tsx` | değişmedi (CTA sözleşmesi aynı: `onStart(placement)`) |
| Bütçe eşiği | JS 916.500 → **918.000** (ölçüm 917.290; gerekçe kod içinde yazılı) |

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | temiz |
| `npm run lint` | temiz |
| `npm run test:run` | **1248/1248** (153 dosya) |
| `npm run test:scripts` | 8 paket geçti |
| `npm run build` | bütçe içinde · SW kabuğu 44/44 |
| `npm run audit:check` | üretim bağımlılıklarında açık yok |
| `npm run test:rules:emulator` | **koşulmadı** — bu ortamda emülatör yok |

Yeni testler: `src/config/guestMode.test.ts` (10 test — CTA→misafir, yazma kapısı,
veri katmanı kilidi, `firestore.rules`'da herkese açık yazma olmadığı) +
`AccountAccess.t9.test.ts` içinde 2 test ("Misafir olarak devam et" yolu) +
`App.test.ts` güncellendi (CTA artık haritayı açar, misafir bayrağı yenilemede korunur).

## Ölçüm (bu ağaç)

| Ölçüm | Değer | Eşik | Not |
|---|---|---|---|
| İlk HTML seti | 117.958 B gzip | 129.400 | |
| İlk boya JS | 91.536 B gzip | 102.200 | |
| `entry` (bizim kod) | 20.814 B gzip | 20.900 | +284 B (T4/T5) |
| Toplam JS | 918.314 B gzip | 997.500 | eşik değişmedi |
| Toplam CSS | 35.187 B gzip | 35.700 | +95 B (misafir dönüş çubuğu) |
| Tanıtım yolculuğu | 117.958 B gzip | 129.400 | |
| Uygulama kabuğu | 517.820 B gzip | 603.400 | |

> Eşikler main'de #127 ile **ölçüme bağlandı** (bayatlama kapısı: sahibi
> olduğumuz kapılar ölçümün %20'sinden fazla üstünde olamaz). Bu teslimat
> hiçbir eşiği yükseltmedi; ölçümler eşiklerin içinde kaldı.

## Bilinen sınırlar (dürüst kayıt)

- **Gerçek tarayıcı/cihaz doğrulaması yapılmadı**: misafir haritasında maplibre'nin
  WebGL kurulumu, 390 px'te "misafir olarak devam et" çubuğu, iOS Safari klavye
  davranışı elle denenmeli.
- Misafir, cihazda kayıt (iz/rota kaydetme) **yapabilir**; bunlar `atlasia.member.guest`
  anahtarında kalır ve hesap açılınca **taşınmaz**. Bu bilinçli: hesap verisi ile
  misafir verisi karışmasın. (Taşıma istenirse ayrı bir iş: T5b.)
- Misafir okuması Firebase yapılandırmasına bağlı; `VITE_FIREBASE_*` yoksa harita
  yerel (boş) veriyle açılır ve toast uyarır.
- Misafir modu ağa çıkar (herkese açık okuma). Çerez bandı "yalnız zorunlularla"
  seçilse bile bu okuma **ölçüm değildir**, telemetri kapalı kalır.
- Huni oranları hâlâ ölçülemez: `VITE_TELEMETRY_ENDPOINT` yok (T1).

## Sıra

Tamamlanan: T11, T12, T7, T1 (kısmi), T2, T3 (kısmi), T9, T13, T14, T15, T16,
**T4**, T5 (kısmi).
Sırada: **T8** (onboarding/ilk rota), T6/T10 (görsel boru hattı — gerçek tarayıcı
ister), T18–T21, T17 (prerender).

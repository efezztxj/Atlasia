# TASK-016 — Gerçek Cihaz Kontrol Matrisi

> **Amaç:** Atlasia'nın gerçek cihaz/tarayıcı kombinasyonlarında elle
> doğrulanacağı resmî kontrol listesi. Her satır için **beklenen sonuç**
> koddan türetilmiştir; **kanıt** alanı test sırasında doldurulur
> (ekran görüntüsü + kısa not + tarih + build SHA'sı).
> **Kural:** Kanıtsız "geçti" yazılmaz. Beklenen sonuçtan sapma olursa
> bulgu olarak `docs/denetim/` altına açılır.
> **Otomasyon:** `e2e/` smoke testi **şu an yok** (bkz. §3). Otomatikleşebilir
> satırlar §3'te aday olarak işaretlidir.

## 1. Cihaz matrisi

| # | Senaryo | Android Chrome (son 2 majör) | iOS Safari (son 2 majör) | Masaüstü Chrome | Masaüstü Firefox |
|---|---|---|---|---|---|
| 1 | Giriş — e-posta/şifre | ☐ kanıt: | ☐ kanıt: | ☐ kanıt: | ☐ kanıt: |
| 2 | Giriş — cihaz hesabı (bu cihaza özel) | ☐ | ☐ | ☐ | ☐ |
| 3 | Giriş — telefon düğmesi YOK | ☐ | ☐ | ☐ | ☐ |
| 4 | Harita yükleme + kaydırma/yakınlaştırma | ☐ | ☐ | ☐ | ☐ |
| 5 | WebGL2 yoksa davranış | ☐ | ☐ | ☐ | ☐ |
| 6 | İz kaydı: başlat → bitir → kaydet → yayınla | ☐ | ☐ | ☐ | — (konum masaüstünde Wi-Fi) |
| 7 | Çevrimdışı açılış (daha önce açılmışsa) | ☐ | ☐ | ☐ | ☐ |
| 8 | Hesap silme (Tehlikeli alan) | ☐ | ☐ | ☐ | ☐ |
| 9 | İki tema: koyu (siyah) | ☐ | ☐ | ☐ | ☐ |
| 10 | İki tema: açık (gerçek beyaz) | ☐ | ☐ | ☐ | ☐ |

## 2. Satır beklentileri (koddan türetilmiş)

| # | Beklenen sonuç | Kaynak (kod) | Sapmada |
|---|---|---|---|
| 1 | Giriş ekranı açılır; e-posta + şifre ile oturum açılır, harita gelir. Yanlış şifrede Türkçe hata; ham Firebase hatası basılmaz | `AccountAccess.tsx`, `auth.ts` | bulgu aç |
| 2 | "Bu cihaza özel hesap" ile kayıt/giriş çalışır; veriler yalnız cihazda kalır; profil rozeti "Bu cihaza özel hesap" | `deviceAccounts.ts`, `ProfilePanel.tsx` | bulgu aç |
| 3 | "Telefon numarasıyla giriş yap" düğmesi **hiç render edilmez** (`VITE_PHONE_AUTH_ENABLED` açık değilse) | `AccountAccess.tsx` (`PHONE_AUTH_ENABLED`) | **güvenlik/maliyet bulgusu** |
| 4 | Masaüstünde başlık solda / arama sağda; harita karo + stil yüklenir; keşif pinleri tıklanabilir | `MapView.tsx`, `App.tsx` | tasarım bulgusu (P2/P3) |
| 5 | WebGL2 desteklenmiyorsa uygulama çökmemeli; anlaşılır Türkçe uyarı/yer tutucu görünmeli. **Bilinen açık:** kod tabanında WebGL tespiti/ye-deği yok (`grep webgl src/` boş; yalnız 2D canvas var) — MapLibre kendi hata durumunu basabilir. Bu madde TASK-016'nın gerekçelerinden biri | `MapView.tsx` (MapLibre GL v6 WebGL2 zorunlu) | bulgu + tasarım kararı |
| 6 | Kayıt yalnız Firebase hesabında başlar (`canRecord = firebaseConfigured && cloudAccount`); iz **gizli** kaydedilir, otomatik yayınlanmaz; cihaz hesabında "Kaydı başlat" kapalı ve "Bitir ve kaydet" sunulmaz | `TrackRecorderPanel.tsx`, `useTrackRecorder.ts` | güvenlik/UX bulgusu |
| 7 | Daha önce çevrimiçi açılmış uygulama çevrimdışı açılır (SW app-shell precache: HTML + hash'li asset'ler). Harita karoları çevrimdışı **boş** gelebilir (P15 tile paketi henüz yok); pin/kayıtlı veri son senkron hâliyle görünür | `public/sw.js` (`precacheAppShell`) | P15 kapsam notu |
| 8 | Profil → Tehlikeli alan → "Hesabımı ve verilerimi sil" hesabı ve verileri kaldırır; oturum kapanır; cihaz hesabında yerel kayıt da silinir | `ProfilePanel.tsx` → `moderation.ts#deleteAccount` | **veri kaybı bulgusu — dikkatli test** |
| 9 | Koyu tema **siyah** yüzeyler; harita/panel kontrastı korunur | `useTheme.ts`, `index.css` | tasarım bulgusu |
| 10 | Açık tema **gerçek beyaz** yüzeyler. **Bilinen istisna:** giriş/`auth-access` yüzeyi açık temada koyu kalıyor (`docs/denetim/p18-erisilebilirlik.md` P18-13) | `index.css` `.auth-access` | P18-13 ile birleştir |

## 3. Otomasyon eşlemesi

`e2e/` smoke testi bu turda **kurulmadı** (PLAYWRIGHT/CI maliyeti ayrı karar).
Kurulduğunda aşağıdaki satırlar otomatikleşebilir (canlı Firebase'e gitmez):

| Matris satırı | Otomasyon adayı | Not |
|---|---|---|
| 1 (giriş ekranı açılır) | evet | Yalnız ekranın/formun görünürlüğü; gerçek auth canlıya gider, mock'lanır |
| 3 (telefon düğmesi yok) | evet | DOM'da `Telefon` metni bulunmamalı |
| 4 (harita kabuğu yüklenir) | kısmen | WebGL headless'da sınırlı; yalnız konteyner/yükleniyor iskeleti |
| 5 (WebGL2 yok) | kısmen | `--disable-webgl` ile uyarı yüzeyi doğrulanabilir |
| 9/10 (tema) | evet | `data-theme` geçişi + body arka plan rengi |
| 2, 6, 7, 8 | hayır | Gerçek cihaz konumu/çevrimdışı/veri silme elle; SW için ayrı entegrasyon testi |

## 4. Doldurma notları (test eden için)

- Her oturumda: tarih (UTC), cihaz/tarayıcı sürümü, **build SHA'sı**
  (Cloudflare Pages → deployment), hesap tipi (Firebase / cihaz).
- Konum izinleri Android ve iOS'ta farklı akışta sorulur; ikisi de not edilir.
- iOS Safari: PWA ekleme sonrası açılış (`apple-mobile-web-app` meta) ayrıca
  gözlenir; Ana ekrana ekle + çevrimdışı aç birlikte test edilirse madde 7'nin
  iOS kanıtı sayılır.
- Hesap silme (madde 8) **gerçek veriyi yok eder**; test hesabı kullanılır.

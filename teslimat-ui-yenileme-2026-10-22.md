# Teslimat — Arayüz Yenileme (Altın Çerçeve Tasarım Sistemi)

- **Görev:** Kullanıcı isteğiyle mevcut arayüzün yenilenmesi. İstenenler: yoldan
  sapmadan kullanışlılık, İzler sekmesi, Yürüyüş Kaydı sekmesi, altın çerçeveli
  alt çubuk, Profil sekmesi, Atlas AI sekmesi; Instagram ve büyük şirketlerin
  arayüz kalıpları baz alınsın.
- **Branch:** `arena/98fcf003-atlasia`
- **Taban commit:** `84d242584a6671437a4cea5f7d5136bdc04d1dbd` (main)
- **Teslim commit'i:** Bu dosyayı içeren commit (aşağıdaki git kaydı).

## Korunan ürün kararları (AGENTS.md)

- Yerleşim değişmedi: masaüstünde başlık solda/arama sağda, Atlas AI sağ altta,
  sağ harita kontrolleri yerinde, tek alt keşif paneli var ve kapalı panel
  kaybolmuyor. Değişiklik yalnız yüzey dili + dokunma hedefi boyutlarında.
- Koyu tema siyah-yeşil, açık tema gerçek beyaz olarak kaldı; yeni sınıfların
  açık tema karşılıkları `index.css` sonuna eklendi.
- Ücretli servis eklenmedi; Firebase/Rules/data katmanına dokunulmadı.

## Yapılanlar

### Tasarım sistemi (`src/index.css`)
- `--color-gold` / `--color-gold-2` token'ları (koyu + açık tema).
- `.gold-frame` (altın çerçeve + sıcak gölge), `.glass-panel` (cam),
  `.btn-gold` (altın degrade birincil düğme), `.btn-gold-round`,
  `.segmented` (iOS bölümlü kontrol, `aria-pressed` ile çalışır),
  `.sheet-handle`, `.avatar-gold-ring`, `.fade-x`, `.rec-dot`, `.skeleton`,
  `.pressable`.
- Mobil alt çubuk: 46px → 58px cam bar, altın degrade üst çizgi, Material 3
  hap göstergesi (alt çizgi kaldırıldı), ikon 13px → 19px, etiket 9px → 10px.
  Buna bağlı mobil offset'ler güncellendi (Atlas AI 46px, harita kontrolleri
  38px ve bottom 122px, + FAB 44px).
- Story halkası altın ağırlıklı degrade oldu.

### Ekranlar
- **Alt çubuk + keşif paneli** (`App.tsx`, `BottomPanel.tsx`): sekme ikonları
  `.mobile-tab-icon` hapı içinde, aktif sekmede kalın ikon (Kaydet/İzlerim
  dolu), ortadaki + altın halka düğme, paneller `gold-frame`, aktif kategori
  ve "Haritada gör" altın degrade, mobil sayfada tutamaç.
- **İzler** (`MyPlacesPanel.tsx`, `RecordsDock.tsx`, `SocialPanel.tsx`):
  İzlerim'e yer/bölge araması + sonuç sayısı + arama boş durumu eklendi;
  Kayıtlarım sekmeleri bölümlü kontrole çevrildi ("Kaydettiklerim" → "Rotalar",
  sayaç hapları), yükleniyor durumunda iskelet kartlar, özel iz kartında
  mesafe öne çıkarıldı; akışta Tümü/Yakınımda bölümlü kontrol + ipucu sayacı hapı.
- **Yürüyüş kaydı** (`TrackRecorderPanel.tsx`): durum hapı (HAZIR /
  KAYDEDİLİYOR + nabız noktası / TASLAK HAZIR), büyük süre göstergesi,
  Mesafe/Tempo/Ölçüm karoları (tempo mevcut süre+mesafeden türetilir, yeni
  veri toplanmaz), altın birincil düğmeler. Onaylı kaydet akışı ve tüm
  metinler/roller korundu.
- **Profil** (`ProfilePanel.tsx`): altın halkalı avatar + hesap durumu hapı +
  yer/rota istatistikleri içeren özet kartı; Kayıtlarım/Geri bildirim/Verilerimi
  indir iOS gruplu listeye çevrildi; kaydet düğmesi tam genişlik altın.
- **Atlas AI** (`AtlasAssistant.tsx`): altın halka FAB, AI avatarlı başlık,
  konum referans hapı, sohbet balonları (kullanıcı altın, asistan cam),
  hap şeklinde mesaj yazma alanı, sihirbaz/gün seçimlerinde altın aktif durum.
- **Üst bar / genel** (`Header.tsx`, `Drawer.tsx`, `MapControls.tsx`, `App.tsx`):
  altın halkalı profil düğmesi, bildirim sayı rozeti (mobilde de), hap şeklinde
  "İz bırak", çekmecede altın kenar + 44px kapat düğmesi, harita kontrolünde
  aktif durum altın, Yürüyüş kaydı başlatıcısı ve toast altın çerçeveli cam.

## Değişen dosyalar

`src/index.css`, `src/App.tsx`, `src/components/Header.tsx`,
`src/components/BottomPanel.tsx`, `src/components/MyPlacesPanel.tsx`,
`src/components/RecordsDock.tsx`, `src/components/SocialPanel.tsx`,
`src/components/TrackRecorderPanel.tsx`, `src/components/ProfilePanel.tsx`,
`src/components/AtlasAssistant.tsx`, `src/components/Drawer.tsx`,
`src/components/MapControls.tsx`, `teslimat-ui-yenileme-2026-10-22.md` (bu dosya).

## Doğrulama (temiz `npm ci` sonrası)

| Komut | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 103 dosya / 719 test |
| `npm run test:scripts` | ✅ |
| `npm run build` (+ bundle bütçesi) | ✅ "Bundle bütçesi içinde" |
| `npm run audit:check` | ✅ bilinen açık yok |
| `npm run verify:social-metadata` | ✅ |
| `npm run test:rules:emulator` | ⚠️ Ortamda Java yok; Rules dosyası değişmedi, CI'da koşulacak |

## Kilitli dosya kontrolü

Çalışma yalnız `arena/98fcf003-atlasia` branch'inde yapıldı; başka agent
dosyası sahiplenilmedi, `main`'e dokunulmadı, commit edilmemiş kullanıcı
değişikliği yoktu (başlangıçta `git status` temizdi).

## Bilinen riskler / notlar

- Mobil alt çubuk yüksekliği arttığı için çakışan sabit panellerin
  `bottom` değerleri gözden geçirildi (keşif paneli 62→64, İzlerim 62→64,
  daraltılmış panel 110→112); gerçek cihazda safe-area ile son bir göz
  kontrolü önerilir.
- Görsel doğrulama geliştirme önizlemesinde (cihaz hesabı akışı) yapılabilir;
  Firebase yapılandırması olmayan ortamda açılış Landing gösterir.
- P18 kontrast kilidi korundu: yeni metinlerde `text-mint/70` altına inilmedi,
  kayıt hapı için açık tema karşılığı (`.rec-pill`) eklendi.

## Bağımsız inceleme

Değişiklikler bileşen bazında gözden geçirildi; kilitli davranış testleri
(erişilebilirlik, RecordsDock, TrackRecorderPanel onaylı kaydet akışı) dahil
tüm test paketi yeşil.

## Sonraki görev önerisi

Gerçek cihazda (iOS Safari + Android Chrome) alt çubuk/safe-area ve yürüyüş
kaydı canlı istatistik ekranının saha kontrolü; beğenilirse aynı altın çerçeve
dilinin PlaceDetails ve SettingsPanel'e taşınması.

---

# Ek Tur — İzler kaydırma + kapsamlı Profil (2026-10-22)

Kullanıcı isteği: (1) İzler panelinin üst kısmı aşağı kayabilsin,
(2) Profil daha kapsamlı olsun, ayarların hepsi Profil sekmesinde yer alsın.

## Yapılanlar

### İzler (`SocialPanel.tsx`)

- Story şeridi, filtre ve gönderiler tek dikey kaydırma alanına alındı:
  üst içerik akışla birlikte kayıyor; `Tümü / Yakınımda` filtresi
  kaydırırken üstte sabit (sticky) kalıyor; yazma alanı sabit.
- Panel tutamacı/başlığı aşağı sürüklenebiliyor: ~90px üstü çekiş paneli
  mevcut "daralt" davranışıyla kapatıyor (CSS `translate` kullanıldığı
  için giriş animasyonuyla çakışma yok; butonlardan sürükleme başlamıyor).

### Profil + Ayarlar (`ProfilePanel.tsx`, `SettingsPanel.tsx`, `App.tsx`)

- Ayar içeriği paylaşılan `SettingsContent` bileşenine ayrıldı; Ayarlar
  penceresi kabuğu/odak tuzağı/başlık aynen korundu, iki görünüm de aynı
  `settingsContentProps` kaynağından besleniyor.
- Profil artık tüm ayarları içeriyor: koyu/açık tema, 4 harita altlığı,
  yer adları, 3B arazi, çevrimdışı harita, uygulama kurulumu,
  konum durumu/izin/yenileme/haritada gösterme/temizleme + gizlilik
  açıklamaları (`location-settings` bölümü).
- Profil özeti genişletildi: izim / yer kaydı / rota kaydı istatistikleri,
  hesap türü + doğrulama satırları, bölüm çipleriyle hızlı gezinme
  (Hesabım / Kayıtlar / Ayarlar / Konum), Keşiflerim grubunda Kayıtlarım,
  İzlerim (mobil), Bildirimler (okunmamış rozeti) ve Atlas AI kısayolları;
  Destek ve veriler grubu. İsim düzenleme, e-posta doğrulama, Hesap kimligi
  kopyalama, geri bildirim, veri indirme, çıkış ve hesap silme akışları
  değişmedi. Masaüstü panel genişliği içeriğe göre 430px'e çıkarıldı.
- Yeni davranış testi: `src/components/SettingsPanel.test.ts`
  (bölüm eksiksizliği + tema/altlık/anahtar bağlantıları).

## Doğrulama (ek tur)

| Komut | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 104 dosya / 721 test |
| `npm run test:scripts` | ✅ |
| `npm run build` (+ bundle bütçesi) | ✅ "Bundle bütçesi içinde" |
| `npm run audit:check` | ✅ bilinen açık yok |
| `npm run verify:social-metadata` | ✅ |
| `npm run test:rules:emulator` | ⚠️ Ortamda Java yok; Rules değişmedi, CI'da koşulacak |

Gerçek uygulama görüntüleri (dev sunucusu, cihaz hesabı ile):
`design-vizyon/gercek-profil-ust.png`, `gercek-profil-ayarlar.png`,
`gercek-profil-konum.png`, `gercek-izler.png` (git kapsamı dışında).

## Notlar

- Bölüm çiplerindeki aktif durum tıklamayla güncellenir (kaydırma
  casusu yok); istenirse sonraki turda eklenebilir.
- İzler'de sürükleyerek kapatma eşiği gerçek cihazda hissiyatla
  ayarlanabilir (şu an ~90px).

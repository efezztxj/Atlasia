# Mobil Denetim ve İyileştirme — 2026-10-23

Kapsam: `src/App.tsx` mobil yerleşimi, `Header`, `BottomPanel`, `MobileDiscoverySheet`
(yeni), `MapControls`, `SearchBox`, `SocialPanel`, `RecordsDock`, `MyPlacesPanel`,
`TrackRecorderPanel`, `SettingsPanel`/`ProfilePanel`, `index.css` mobil bloğu.

Referans kalıplar: **Google Maps** (katman FAB'ı, üç kademeli alt sayfa, yakınımdaki
listesi), **Apple Maps** (tutamaç + sürükleme, tek elle erişim), **Airbnb / AllTrails**
(boş durumda son aramalar + kategori kısayolları), **Instagram** (5 sekmeli alt bar +
ortada eylem), **Strava** (yürüyüş kaydı durum hapı).

---

## 1. Bugünkü mobil yüzeyler (envanter)

| Yüzey | Konum | Durum |
| --- | --- | --- |
| Üst bar | `Header.tsx` 68px | Logo + ara + bildirim + menü (konum yok) |
| Hero | `Hero.tsx`, `App.tsx` `mobile-home-content` | 52px'ten başlar, zoom > 3.4'te kaybolur |
| Keşif sayfası | `BottomPanel.tsx` → yeni `MobileDiscoverySheet.tsx` | **Bu turda** üç kademeli sürüklenebilir sayfa |
| Harita kontrolleri | `MapControls.tsx` | **Bu turda** 4 düğme + katman menüsü |
| Arama | `SearchBox.tsx` (`App.tsx` mobil sayfa) | **Bu turda** son aramalar + otomatik klavye |
| Alt sekme çubuğu | `App.tsx` | 5 sekme + ortada + FAB, 58px |
| Topluluk (İzler) | `SocialPanel.tsx` | Sürükleyerek küçültme var, iyi durumda |
| Kayıtlarım | `RecordsDock.tsx` | Sabit sayfa, sürükleme yok |
| İzlerim | `MyPlacesPanel.tsx` | Sabit sayfa + arama |
| Yürüyüş kaydı | `TrackRecorderPanel.tsx` | Panel sabit, alt eylem şeridiyle hizalı |
| Ayarlar / Profil | `SettingsPanel.tsx`, `ProfilePanel.tsx` | Tam ekran çekmece + erişilebilirlik bölümü |

---

## 2. Tespitler (önem sırasına göre)

### P0 — kırık ya da erişilemeyen

1. **Telefonda üç harita katmanı hiç açılamıyor.** `index.css` içindeki
   `.mobile-map-controls > div:nth-of-type(n + 5) { display: none }` kuralı
   "Yer adları", "3B arazi" ve "Hava katmanı" düğmelerini tamamen gizliyordu;
   kullanıcı yalnız Ayarlar → Görünüm altında bulabiliyordu.
   → Çözüldü: mobilde tek **Katmanlar** düğmesi + satır hâlinde `role="switch"` anahtarlar.
2. **Keşif sayfası sabit yükseklikteydi.** Açık panel `max-h-[42dvh]`, kapalı panel
   `~68px`; kullanıcı içeriği büyütemiyordu ve uzun açıklama iki satıra sıkışıyordu.
   → Çözüldü: peek / yarım / tam kademeleri, sürükleme + klavye oku tuşları.
3. **Arama boş durumu boştu.** Kutu açıldığında klavye gelmiyor, geçmiş de
   gösterilmiyordu (her arama sıfırdan).
   → Çözüldü: otomatik odak + cihazda tutulan son 5 arama.

### P1 — kullanılabilirlik sürtünmesi

4. **Sekme adları karışıyor:** "Kaydet" (kayıtlı yerler) ile "İzlerim" (kendi
   bıraktığın izler) telefonda yan yana ve ikisi de yer gibi okunuyor.
   → Öneri: "Kaydet" → **"Kayıtlar"**, "İzlerim" → **"İzlerim"** kalsın; boş
   durum metinleri hangi listenin ne olduğunu söylesin. (Bu turda metin değişmedi;
   ürün kararı gerektiriyor.)
5. **Katman/bildirim/menü üçlüsü üst barda eşit ağırlıkta**; telefonda "menü"
   (keşif çekmecesi) en sık kullanılan öğe olmasına karşın arama ile aynı boyutta.
   → Öneri: menü 44px, diğerleri 40px; arama çubuğu üst barın altında tam genişlik.
6. **Kayıtlarım ve İzlerim sayfaları sürüklenemiyor**; İzler ise sürüklenebiliyor.
   Aynı ürün içinde iki farklı "kapatma" dili var.
   → Öneri: ikisini de `MobileSheet` tutamacına geçirmek (tek bileşen).
7. **Tablet aralığı (768–1023px) sahipsiz:** sol alt hap, keşif paneli neredeyse tam
   genişlikte olduğu için panelin sol üst köşesine biniyor.

### P2 — cila / sıradaki tur

8. **Yakınımdaki listesi yok.** Konum hazırken panel hâlâ "tesadüf" öneriyor;
   Google Maps'te bu durumda mesafeye göre sıralı liste gösterilir.
9. **Geri tuşu kademe düşürmüyor.** Tam kademede Android geri tuşu uygulamadan
   çıkıyor (tarayıcı geçmişi kullanılmıyor).
10. **Yürüyüş kaydı arka planda durabilir** uyarısı var ama ekran kilidi davranışı
    için `wakeLock` yok; kayıt sırasında ekran kararırsa ölçüm seyrekleşiyor.
11. **Çevrimdışı paket durumu** yalnız Ayarlar içinde; harita üzerinde küçük bir
    "çevrimdışı" rozeti yok (NetworkStatus var, konum farklı).
12. **Haptik geri bildirim yok** (destekleyen cihazlarda `navigator.vibrate`).

---

## 3. Bu turda uygulananlar

1. `src/components/MobileDiscoverySheet.tsx` (yeni): üç kademeli alt sayfa.
   - Peek 132px · Yarım `min(52dvh, 470px)` · Tam `100dvh − 196px`.
   - Sürükleme yalnız tutamaç/başlık şeridinden; düğmeler etkilenmez
     (`touch-none` + pointer capture).
   - Klavye: `ArrowUp/ArrowDown/Enter` kademe değiştirir; `aria-expanded` ve
     `role="button"` etiketli.
   - Hızlı eylemler: **kaydet** (artık telefonda da görünür, `aria-pressed`),
     sonraki yer, **Haritada gör**.
   - Panel kapanınca tam kademede kalmaz (`useEffect`).
2. `src/components/MapControls.tsx`: masaüstü sütunu korundu; mobilde
   Yakınlaştır / Uzaklaştır / Konumum / Katmanlar. Katman menüsü `role="switch"`
   satırları, dışına dokunma ve Escape ile kapanır, içinde "Görünümü sıfırla".
3. `src/components/SearchBox.tsx`: `atlasia.recentSearches.v1` içinde son 5 arama
   (etiket + bölge + koordinat), "Temizle", boş girişte öneri listesi, `autoFocus`.
4. `src/index.css`: mobil harita kontrolleri 42px hedef, keşif sayfası gölgesi,
   eski `nth-of-type` gizleme kuralı kaldırıldı.
5. Testler: `MobileDiscoverySheet.test.ts` (4), `MapControls.test.ts` (4).
6. Ön taslak: `mockups/mobil-v2.html` (6 telefon karesi; `python3 -m http.server`
   ile önizlenir, üretim paketine girmez).

## 4. Doğrulama

| Komut | Sonuç |
| --- | --- |
| `npm ci` | ✅ |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ 0 uyarı |
| `npm run test:run` | ✅ 110 dosya / 762 test |
| `npm run build` + bundle bütçesi | ✅ (Ayarlar paneli lazy yüklendi, entry 174.0 B sınırının altına indi) |
| `npm run test:scripts` | ✅ |
| `npm run verify:social-metadata` | ✅ |
| `npm run audit:check` | ✅ |
| `npm run test:rules:emulator` | ⛔ sandbox'ta Java yok, Rules değişmedi |

## 5. Sıradaki işler (öneri sırası)

1. **Tek `MobileSheet` bileşeni**: Keşif, Kayıtlarım, İzlerim, İzler aynı tutamaç ve
   kademe dilini kullansın (3 farklı uygulama yerine 1).
2. **Yakınımdaki listesi**: konum hazırsa mesafe sıralı, "Yakınımda" sekmesiyle.
3. **Geri tuşu → kademe**: `history.pushState` ile tam kademeyi geri tuşuna bağla.
4. **Tablet düzeni (768–1023px)**: sol alt hap ve panel çakışmasını bitir.
5. **Sekme adları**: "Kaydet" → "Kayıtlar"; boş durum metinleri.
6. **Kayıt sırasında `wakeLock`** ve isteğe bağlı haptik geri bildirim.

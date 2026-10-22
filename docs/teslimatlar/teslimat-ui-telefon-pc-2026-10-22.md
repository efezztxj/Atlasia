# Teslimat — Telefon & Masaüstü UI Kiti (tasarım önizlemesi)

- **Görev:** Kullanıcı isteği — "atlasia için telefon ve pc üzerine bir UI tasarla",
  önce (ön izleme) görülebilir olacak şekilde.
- **Branch:** `arena/b690d97b-atlasia`
- **Taban commit:** `c1e1939adf476b58d10732bb2a07570d6a06c59a` (main)
- **Teslim commit'i:** Bu dosyayı içeren commit.
- **Durum:** Yalnız tasarım önizlemesi. Üretim uygulamasının (`src/**`) hiçbir dosyası
  değiştirilmedi; yeni UI hiçbir ekrana bağlanmadı.

## Ne teslim edildi

`tasarim/` altında bağımsız, statik ve çalışan bir UI kiti:

| Dosya | İçerik |
| --- | --- |
| `tasarim/index.html` | Vitrin: hero + canlı önizlemeler, ekran galerisi, tasarım sistemi, bileşen kütüphanesi, ürün kuralları |
| `tasarim/kesif.html` | **Mobil · Keşif** — arama, kategoriler, harita pinleri, keşif kartı, alt çubuk |
| `tasarim/izler.html` | **Mobil · İzler** — hikâye şeridi, akış filtresi, gönderi kartı, sabit yazma alanı |
| `tasarim/yer.html` | **Mobil · Yer detayı** — hero görsel, künye, sesli rehber, yakındaki izler |
| `tasarim/atlas-ai.html` | **Mobil · Atlas AI** — sohbet, gerekçeli rota kartı, onay düğmeleri |
| `tasarim/masaustu-kesif.html` | **Masaüstü · Keşif** — sol liste, sağ kontrol sütunu, tek alt keşif paneli |
| `tasarim/rota.html` | **Masaüstü · Rota planlayıcı** — durak listesi, harita çizgisi, yükseklik profili |
| `tasarim/profil.html` | **Masaüstü · Profil & ayarlar** — istatistik, tema, konum izni, hesap |
| `tasarim/css/base.css` | Token'lar (renk, tipografi, yüzey, gölge), cihaz çerçeveleri, harita dili, temel bileşenler |
| `tasarim/css/screens.css` | Ekran bazlı stiller ve iki temanın karşılıkları |
| `tasarim/css/gallery.css` | Vitrin sayfası |
| `tasarim/js/ui.js` | Lucide ikon basımı, tema, ekran ölçekleme, klavye gezinmesi, galeri önizleme ölçeği |
| `tasarim/js/gallery.js` | Mobil/masaüstü filtresi |
| `tasarim/assets/` | 8 fotoğraf (JPEG, toplam ~1,1 MB), 4 woff2 font alt kümesi, font lisansı |

Çalıştırma: `tasarim/index.html` dosyasını tarayıcıda açmak yeterlidir (derleme adımı yok).
Yerel sunucu istenirse: `python3 -m http.server -d tasarim 4173`.

## Tasarım kararları

- **Kimlik korundu:** siyah-yeşil koyu tema, altın vurgu, Bricolage Grotesque + DM Sans.
  Altın yalnız birincil eylemde ve seçili durumda; pasif öğeler nötr yüzeyde.
- **Açık tema gerçek açık tema:** krem-beyaz zemin (`#F5F3EA`), koyu mürekkep metin,
  altın `#A9711F`'e düşürüldü (AA kontrast). Harita üstü metinler açık temada koyu mürekkep
  + açık kapsül olarak yeniden renklendirildi.
- **Harita üstünde blur yok:** paneller opak `--panel-on-map` yüzeyi kullanır; bulanıklık
  yalnız sunum kabuğunda (vitrin çubuğu) var.
- **Korunan yerleşim:** masaüstünde başlık solda, arama sağda; Atlas AI sağ altta; sağ harita
  kontrolleri yerinde; tek alt keşif paneli var ve kapalıyken de ince satır olarak durur.
- **Dokunma hedefi:** mobil düğmeler ≥ 44 px, alt çubuk öğeleri 54 px, gövde metni 11,5–14 px.
- **Erişilebilirlik:** görünür `:focus-visible` halkası, `aria-pressed`/`aria-current`/`role`
  etiketleri, `prefers-reduced-motion` desteği, tüm görsellere `alt`, klavye kısayolları
  (`←/→` ekran, `G` vitrin, `T` tema, `F` tam ekran).

## Doğrulama

| Komut | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 117 dosya / 883 test |
| `npm run build` | ✅ (postbuild: bundle bütçesi + SW kabuğu) |
| `npm run audit:check` | ✅ |

Ek olarak tasarım kiti için headless Chromium ile yapılan kontroller:

- 8 sayfa × 2 tema (koyu/açık): 0 JS hatası, 0 başarısız istek, 0 eksik ikon,
  0 kırık görsel, yatay taşma yok.
- Ekran görüntüleri: mobil 390×844, masaüstü 1440×900, vitrin 1440/1500 px ve 430×932
  mobil vitrin doğrulandı.

## Bilinen riskler / notlar

- Bu bir **önizleme kiti**; veri katmanı, Firebase ve harita motoru bağlı değildir. Harita
  görüntüleri uydu dokusudur, gerçek MapLibre çıktısı değildir; pinler ve rota çizgisi temsilidir.
- Fotoğraflar ürün içeriği değil, tasarım önizlemesi içindir (`tasarim/assets/`). Üretime
  taşınacaksa lisans/atıf ve gerçek yer verisiyle değiştirilmelidir. Kapadokya ve Likya
  görselleri üretilmiştir, diğerleri web aramasından alınmıştır.
- `dir="ltr"`/`lang` ve tüm metinler Türkçedir; sayı biçimi `tr-TR`.
- Kitteki hiçbir dosya uygulama paketine (Vite build) girmez; `dist/` çıktısı değişmez.
- Sonraki adım (kullanıcı onayıyla): onaylanan ekranların `src/**` içine parça parça
  taşınması (önce mobil alt çubuk + keşif kartı, sonra yer detayı ve Atlas AI rota kartı).

## Kilitli dosya kontrolü

Çalışma yalnız `arena/b690d97b-atlasia` branch'inde yapıldı; `main`'e dokunulmadı,
başka agent dosyası sahiplenilmedi, başlangıçta çalışma alanı temizdi (`git status` boş).
`src/**`, `public/**`, `firestore.rules` ve iş akışları değişmedi.

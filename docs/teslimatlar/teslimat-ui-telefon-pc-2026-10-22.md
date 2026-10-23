# Teslimat — Telefon & Masaüstü UI Kiti (tasarım önizlemesi)

- **Görev:** "Atlasia için telefon ve PC üzerine bir UI tasarla; ön giriş ve kayıt sayfası dahil."
  İstenen: ön izleme, profesyonel detay, başka ürünlerin çözümlerinden örnek alma, **deploy yok**.
- **Branch:** `arena/b690d97b-atlasia`
- **Taban commit:** `c1e1939adf476b58d10732bb2a07570d6a06c59a` (main)
- **Durum:** Yalnız tasarım önizlemesi. Üretim uygulamasının (`src/**`) hiçbir dosyası
  değiştirilmedi, hiçbir yere dağıtım (deploy) yapılmadı.

## Ne teslim edildi

`tasarim/` altında bağımsız, statik ve çalışan bir UI kiti — **13 ekran**, iki cihaz sınıfı:

| Dosya | İçerik |
| --- | --- |
| `tasarim/index.html` | Vitrin: hero + canlı önizleme, 13 kartlık galeri, tasarım sistemi, bileşen kütüphanesi, ürün kuralları |
| `tasarim/on-giris.html` | **Mobil · 01 Ön giriş** — tam ekran fotoğraf, tek vaat, sosyal kanıt, 3 slayt göstergesi, atla |
| `tasarim/giris.html` | **Mobil · 02 Giriş** — iki alan, passkey, "beni hatırla", kayıt ve misafir yolu |
| `tasarim/kayit.html` | **Mobil · 03 Kayıt** — Apple/Google önce, e-posta alternatif, şifre gücü, KVKK onayı |
| `tasarim/dogrulama.html` | **Mobil · 04 Doğrulama** — 6 haneli kod, imleç, geri sayım, hata/ipucu metni |
| `tasarim/kesif.html` | **Mobil · 05 Keşif** — arama, kategoriler, harita pinleri, keşif kartı, alt çubuk |
| `tasarim/izler.html` | **Mobil · 06 İzler** — hikâye şeridi, akış filtresi, gönderi kartı, sabit yazma alanı |
| `tasarim/yer.html` | **Mobil · 07 Yer detayı** — hero görsel, künye, sesli rehber, yakındaki izler |
| `tasarim/atlas-ai.html` | **Mobil · 08 Atlas AI** — sohbet, gerekçeli rota kartı, onay düğmeleri |
| `tasarim/masaustu-on-giris.html` | **Masaüstü · 09 Giriş** — bölünmüş ekran, rota kartı, passkey, "hesap açmadan keşfet" |
| `tasarim/masaustu-kayit.html` | **Masaüstü · 10 Kayıt** — adım çubuğu, aşamalı açılım, ilgi alanları önizlemesi |
| `tasarim/masaustu-kesif.html` | **Masaüstü · 11 Keşif** — sol liste, sağ kontrol sütunu, tek alt keşif paneli |
| `tasarim/rota.html` | **Masaüstü · 12 Rota planlayıcı** — durak listesi, harita çizgisi, yükseklik profili |
| `tasarim/profil.html` | **Masaüstü · 13 Profil & ayarlar** — istatistik, tema, konum izni, hesap |
| `tasarim/css/base.css` | Token'lar (renk, tipografi, yüzey, gölge), cihaz çerçeveleri, harita dili, temel bileşenler, sunum çubuğu |
| `tasarim/css/screens.css` | Ekran bazlı stiller ve iki temanın karşılıkları |
| `tasarim/css/auth.css` | Giriş akışı bileşenleri: alan, şifre ölçer, onay kutusu, sosyal giriş, kod hücresi, bölünmüş ekran |
| `tasarim/css/gallery.css` | Vitrin sayfası |
| `tasarim/js/ui.js` | 100 satır içi ikon, tema, ekran ölçekleme, klavye gezinmesi, kaydırılabilir ekran şeridi |
| `tasarim/js/gallery.js` | Mobil/masaüstü filtresi |
| `tasarim/assets/` | 10 fotoğraf (JPEG), 4 woff2 font alt kümesi, font lisansı |

**Önizleme (yerel):** `python3 -m http.server -d tasarim 4173` → `http://localhost:4173`.
Derleme adımı yoktur; `index.html` dosyasını doğrudan açmak da yeterlidir. Dağıtım yapılmadı.

## Tasarım kararları

- **Kimlik korundu:** siyah-yeşil koyu tema, altın vurgu, Bricolage Grotesque + DM Sans.
  Altın yalnız birincil eylemde ve seçili durumda; pasif öğeler nötr yüzeyde.
- **Açık tema gerçek açık tema:** krem-beyaz zemin (`#F5F3EA`), koyu mürekkep metin,
  altın `#A9711F`'e düşürüldü (AA kontrast). Harita üstü metinler açık temada koyu mürekkep
  + açık kapsül olarak yeniden renklendirildi.
- **Harita açık temada da açık.** `rota.html` ve `profil.html` haritanın karartmasını satır içi
  stille yazıyordu; açık temada bu koyu kalıp etiketleri okunamaz hâle getiriyordu. Karartma,
  görsel filtresi ve rota çizgisinin arazi gölgesi `.map__scrim--rota`, `.map__img--rota`,
  `.route-shadow` sınıflarına taşındı; her biri iki temada ayrı değer alıyor.
- **Harita üstünde blur yok:** paneller opak `--panel-on-map` yüzeyi kullanır; bulanıklık
  yalnız sunum kabuğunda (vitrin çubuğu) var.
- **Korunan yerleşim:** masaüstünde başlık solda, arama sağda; Atlas AI sağ altta; sağ harita
  kontrolleri yerinde; tek alt keşif paneli var ve kapalıyken de ince satır olarak durur.

### Giriş akışı (yeni)

- **Önce değer, sonra hesap.** Karşılama ekranı tek bir vaat ve tek bir eylemle açılır; üç slayt,
  "Atla" her zaman görünür, sosyal kanıt hero'da. Hesap isteme adımı akışın sonuna bırakıldı.
- **Sosyal giriş önce.** Apple ve Google, e-posta formunun üstünde; arada ince "veya e-posta ile"
  ayırıcısı. Böylece şifre yazmadan giriş mümkün. Mobilde giriş ve kayıt ayrı sayfalar: birbirine
  sessiz bir alt satır bağlantısıyla geçiyor, iki eşit düğme birbirine karışmıyor.
- **Hızlı dönüş yolu.** Mobil girişte "Beni hatırla" ve Face ID aynı satırda: biri oturumu
  açık tutar, diğeri şifreyi tamamen atlar. E-posta alanı demo hesabıyla dolu gelir; "Şifremi
  unuttum" etiketin karşısında, göz düğmesi alanın içinde. Alt satırda kayıt ve "hesap açmadan
  keşfet" ikincil bağlantı olarak durur.
- **Tek sayfa kayıt.** Ad Soyad, e-posta, şifre — üç alan. "Şifreyi tekrar gir" yok; yerine göz
  düğmesi ve yazarken dolan üç kademeli güç göstergesi var.
- **Kod doğrulama ayrı ekran.** 6 hücre (56 px), görünür imleç, `09:12` ömrü, `00:47` geri sayımı,
  "tekrar gönder" ve "kod gelmezse" notu; hata durumu renk + metinle.
- **Masaüstünde bölünmüş ekran.** Solda gerçek harita, rota kartı ve gezgin sayısı; sağda tek kolon
  form. Giriş ekranında passkey (`Face ID ile gir`) ve misafir yolu, kayıt ekranında iki adımlı akış.
- **Aşamalı açılım.** Kayıt 1. adım hesap, 2. adım ilgi alanları. Adım çubuğu ve "Sırada:" notu
  kullanıcıya ne olacağını önceden söyler; ikinci adım sonraya da bırakılabilir.
- **Detaylar:** görünür etiketler (placeholder etiket değil), `autocomplete` (`email`,
  `current-password`, `new-password`), 52 px alan yüksekliği, 44 px hedef, `:focus-visible` halkası,
  `aria-current` yalnız aktif ekranda, `prefers-reduced-motion` desteği, tüm görsellere `alt`.

## Neyden örnek alındı

- Sosyal girişin e-posta/şifreye göre 2–3 kat dönüştürdüğü, izin istemenin değerden sonraya
  bırakılması ve 5 ekran kuralı: UXCam'in onboarding derlemesi.
- Değer → kişiselleştirme → hesap → izin → "aha" sırası ve izin öncesi açıklama: Aaron Mallen.
- Misafir modu / önce göz atma ve kısa kayıt formu: Appcues, Eleken, Icons8 (8fit örneği).
- Bölünmüş ekran (solda güven paneli, sağda form), mobilde tek kolon: UI Design Prompts ve
  Shadcn auth blokları.
- "Şifreyi tekrar gir" alanının kaldırılması, canlı gereksinim kontrolü, passkey: 21st.dev ve
  Authgear'ın giriş/kayıt rehberi.
- Etiketli alanlar, `autocomplete`, hesap sızdırmayan hata metni, 4.5:1 kontrast: AdminLTE'nin
  auth sayfası kontrol listesi.

## Doğrulama

| Komut | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ (0 uyarı) |
| `npm run test:run` | ✅ 117 dosya / 883 test |
| `npm run build` | ✅ (postbuild: bundle bütçesi + SW kabuğu 25/25) |
| `npm run audit:check` | ✅ (bilinen açık yok) |

Ek olarak tasarım kiti için headless Chromium ile yapılan kontroller:

- **14 sayfa × 2 tema** (koyu/açık): 0 JS hatası, 0 konsol hatası, 0 başarısız istek,
  0 eksik ikon, 0 kırık görsel, 0 eksik `alt`, yatay taşma yok.
- Ekran görüntüleri: mobil 390×844, masaüstü 1440×900, vitrin 1440 px ve 430×932 doğrulandı.
- Ekran görüntüleri `onizleme/` altında: `atlasia-ui-kiti-koyu-tema.jpg`, `atlasia-ui-kiti-acik-tema.jpg`
  (tek sayfalık kontakt sayfası) ve `onizleme/koyu|acik/01–13.jpg` (tek tek ekranlar). Bu klasör
  bilerek git'e eklenmedi; üretilmiş önizleme çıktısıdır.
  Galeri kartlarındaki telefon çerçeveleri 390:844 oranında; alt çubuk ve home indicator kırpılmıyor.
- Sunum çubuğu 13 ekranla 1440 px'te tam sığıyor (tüm etiketler kesilmeden); 1366 ve 1280'de
  sayfa taşmıyor, yalnız şerit kendi içinde yatay kayıyor ve aktif ekran otomatik görünür oluyor.

## Bilinen riskler / notlar

- Bu bir **önizleme kiti**; veri katmanı, Firebase ve harita motoru bağlı değildir. Harita
  görüntüleri uydu dokusudur, gerçek MapLibre çıktısı değildir; pinler ve rota çizgisi temsilidir.
- **Dağıtım yapılmadı** (Cloudflare/Firebase hosting dahil). Önizleme yalnız yerel sunucuda çalışır.
- Apple/Google düğmeleri görsel örnektir; OAuth akışı bağlanmadı. Doğrulama kodu da statik.
- Fotoğraflar ürün içeriği değil, tasarım önizlemesi içindir (`tasarim/assets/`). Üretime
  taşınacaksa lisans/atıf ve gerçek yer verisiyle değiştirilmelidir.
- Kitteki hiçbir dosya uygulama paketine (Vite build) girmez; `dist/` çıktısı değişmez.
- Sonraki adım (kullanıcı onayıyla): onaylanan ekranların `src/**` içine parça parça taşınması
  (önce giriş/kayıt akışı ve alt çubuk, sonra keşif kartı, yer detayı ve Atlas AI rota kartı).

## Kilitli dosya kontrolü

Çalışma yalnız `arena/b690d97b-atlasia` branch'inde yapıldı; `main`'e dokunulmadı,
başka agent dosyası sahiplenilmedi, başlangıçta çalışma alanı temizdi (`git status` boş).
`src/**`, `public/**`, `firestore.rules` ve iş akışları değişmedi.

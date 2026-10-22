# Teslimat D1 — Rehber yerleri için kaynaklı "Gitmeden bil" metinleri

**Görev:** 19 yerden yalnız 5'inde özel metin vardı. Eksik alanı koddan bulup
kalan yerler için Vikipedi ve Wikidata'ya dayanan kısa metinleri yazmak, her yerin
kaynak URL'sini `docs/icerik/yer-kaynaklari.md` içinde toplamak ve metnin eksiksiz
ve kaynaklı kalmasını testle kilitlemek.

**Branch:** `arena/b0c9a423-atlasia`
**Taban commit:** `1578608c7757b5a741eb80ff3c011481ce962a73` (`main`)

## Bulunan alan

Eksik metin `src/utils/placeAdvice.ts` içindeki `advice()` fonksiyonunun yerel
`specific` kaydıydı. Yalnız beş yerde kayıt vardı: `kyoto`, `petra`, `kapadokya`,
`banff`, `navagio`. Diğer 14 alias'lı yer ve alias'ı olmayan 9 rehber yeri genel
kalıp metni alıyordu. `ROADMAP.md` §4 ve §7 de bunu "19 alias, yalnız 5'inde özel
içerik" olarak kaydediyor.

## Değişen dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `src/utils/placeAdvice.ts` | `PLACE_ADVICE` (28 yer × 4 alan), `PLACE_SOURCES` (Vikipedi + Wikidata), `UNVERIFIED`, `ADVICE_FIELD_MAX_CHARS`, `placeSources()`; 9 eksik alias eklendi |
| `src/utils/placeAdvice.test.ts` | Eksiksizlik, kaynak URL/lisans/dil, doküman eşleşmesi ve alias testleri |
| `src/data/places.test.ts` | Yeni: kart kimlik listesi, zorunlu alanlar ve kullanıcı üretimi alan yasağı |
| `docs/icerik/yer-kaynaklari.md` | Yeni: yöntem, lisans tablosu, 28 satırlık kaynak tablosu, doğrulanmayan alanlar |
| `docs/teslimatlar/teslimat-d1-yer-metinleri-2026-10-22.md` | Bu teslim kaydı |

`src/data/places.ts` **değişmedi**. KKTC kartları (`girne`, `buyuk-han`,
`salamis`, `karpaz`) dahil hiçbir kart silinmedi; KKTC için ayrı bölüm, ayrı metin
kalıbı veya ayrı kural eklenmedi. 28 yer aynı kuralla işlendi.

## İçerik yaklaşımı

- Her yer için önce Türkçe Vikipedi, yetmediğinde İngilizce Vikipedi okundu;
  Wikidata öğesi kimlik ve konum eşleştirmesi için kullanıldı.
- Metinler kendi cümlelerimizle yazıldı; kaynaktan cümle kopyalanmadı.
- Ücret, açılış saati, sezon ve cankurtaran bilgisi gibi kaynakta güncel yer
  almayan alanlar **"Doğrulanmadı."** olarak bırakıldı (Kyoto'da ücretsiz giriş
  ve 24 saat açıklık Vikipedi'de açıkça yazdığı için doğrulanmıştır).
- Aliases: `kaputas`, `gaziantep`, `kackar`, `navagio`, `camino`, `aral`,
  `buyuk-han`, `salamis`, `positano` eklendi. Böylece 28 kartın tamamı
  `namedPlace` ile bulunabiliyor.

## Testlerin kilitlediği sözleşme

- `PLACE_ADVICE` ve `PLACE_SOURCES` anahtarları rehberdeki 28 kimlikle birebir
  eşleşir; eksik ya da fazla yer testi kırar.
- Dört alan da doludur. Her alan ya en az 20 karakterlik doğrulanmış metindir ya
  da tam olarak `UNVERIFIED`; serbest metin içinde "doğrulanmadı" kabul edilmez.
- Her alan 240 karakteri geçmez, cümle sonu noktayla biter, URL/HTML içermez.
- Her yerde ulaşım ve dikkat alanı doğrulanmıştır; farklı yerler aynı kalıp
  cümleyi paylaşamaz.
- Her yerin en az bir Vikipedi ve bir Wikidata kaynağı vardır; URL biçimi, lisans
  (CC BY-SA 4.0 / CC0), dil ve erişim tarihi denetlenir.
- `docs/icerik/yer-kaynaklari.md` her kimliği, başlığı ve **her kaynak URL'sini**
  içerir; tablo satırı sayısı 28'dir. Kod ve doküman tek taraflı değiştirilemez.

## Çalıştırılan komutlar

| Komut | Sonuç |
| --- | --- |
| `npm ci` | 365 paket kuruldu |
| `npm run typecheck` | Geçti |
| `npm run lint` | Geçti (`--max-warnings=0`) |
| `npm run test:run` | 108 dosya, 761 test geçti |
| `npm run test:scripts` | Geçti |
| `npm run audit:check` | Üretim bağımlılıklarında bilinen açık yok |
| `npm run build` | Geçti; entry gzip **173.581 B** (bütçe 174.000 B), "Bundle bütçesi içinde." |

`npm run test:rules:emulator` çalıştırılmadı: bu görevde Firestore kuralı
değişmedi. Kural dosyalarına dokunulmadı.

## Riskler ve sonraki adımlar

- **Kaynak tazeliği:** Vikipedi/Wikidata içeriği değişebilir. Doküman–kod
  eşleşmesi testi URL değişikliğini yakalar; ancak madde metni değişirse
  doğrulanmış cümlelerin gözden geçirilmesi gerekir.
- **Güncel ücret/saat:** Bilerek yazılmadı. Ürün, kullanıcıyı resmî kaynağa
  yönlendiren mevcut feragatnameyi koruyor.
- **Paket bütçesi:** Entry için yalnız ~419 B gzip boşluk var. Kaynak URL'leri
  üretim paketine girmesin diye `PLACE_SOURCES` yalnız testte kullanılıyor;
  ürüne URL listesi eklenmedi.
- **Bayat ROADMAP:** `ROADMAP.md` satır 83 ve 135 hâlâ "19 alias, 5 içerik"
  diyor. Dosya bu görevin sahiplik listesinde olmadığı için değiştirilmedi;
  ayrı bir doküman görevinde güncellenmeli.
- **Bağımsız inceleme:** Yapılmadı; bu kayıt ajanın kendi doğrulamasıdır.

# Teslimat — Ölçüm tabanı: T1, T2, T3 (2026-10-28)

> **Not (2026-10-28, main'e taşıma):** Bu belgedeki ölçümler taşınmadan
> önceki dala aittir. Bu dalda güncel sayılar `docs/baseline.md` ve son teslim
> notlarındadır (toplam JS 997.981 / 998.500 · `entry` 20.888 / 20.900 ·
> ilk boya JS 100.287 / 102.200 · ilk HTML seti 127.069 / 129.400).

## Görev ve branch

- Görev: iyileştirme planının **Faz 0** maddeleri — ölçüm altyapısı. Plan
  "T1–T3 bitmeden Faz 1'e başlama" diyor; önceki turda T12/T11/T7 (hızlı
  kazançlar) yapılmıştı, bu tur Faz 0'ı tamamlıyor.
- Branch: `arena/1058237b-atlasia`
- Taban: `2a7f1a4` (T11/T12/T7 commit'i)
- Teslim commit'i: bu kaydı içeren commit

## Yapılanlar

### T2 — Huni olayları (kod tamam)

`src/lib/analytics.ts` sözleşmesi genişletildi; olay sayısı 10 → 16:

| Yeni olay | Özellikler | Çağrı yeri |
|---|---|---|
| `cta_click` | `placement`, `signedIn` | `LandingPage` → `App.handleStart` (hero/header/how_it_works/footer ayrı ayrı) |
| `map_open` | `guest` | `Explorer` açılışı — bugün `guest:false` |
| `signup_start` | — | `AccountAccess` kayıt moduna geçince |
| `signup_complete` | `method`, `account` | `AuthContext.signup` (`sign_up` adının yerini aldı) |
| `sign_in` | `method`, `account` | `AuthContext.login` + sosyal giriş (popup) |
| `first_route_created` | `account`, `stops` | Rota ilk kez kaydedilince (cihaz bayrağı) |
| `audio_guide_start` | `source` | Ses gerçekten başladığında |
| `consent_choice` | `analytics` | Çerez bandındaki iki düğme |

- Tüm yeni olaylar **sabit enum + boolean/sayı** taşır; serbest metin, kimlik,
  konum yok. `telemetry` PII temizliği aynen geçerli (testlerle kilitli).
- `cta_click`, `map_open`, `signup_start`, `first_route_created` oturumda bir kez
  sayılır (sayfa yenilemesi huniyi şişirmez).
- Landing'in `onStart` imzası `(placement: CtaPlacement)` oldu; dört CTA ayrı
  yerleşim gönderiyor.

### T3 — Baseline dosyası (kısmen doldurulabilir)

Yeni `docs/baseline.md`: paket ölçümleri (taban `2412ace` ↔ bu dal), Core Web
Vitals, Search Console ve huni tabloları. **Ölçülmeyen her satır "ölçülmedi"
olarak işaretli**, nasıl ölçüleceği komutla yazılı; uydurma sayı yok.

### T1 — Analytics altyapısı (panel açılmadı)

- Kod tarafı hazır: tipli olaylar, rıza kapısı, `VITE_TELEMETRY_ENDPOINT`.
- **Panel/hesap açılmadı.** Plausible/Umami/GA4 için dış servis kimlik bilgisi
  yok; bu depoda hesap açmak yetki dışı.
- `docs/olcum-ve-hata-izleme.md` §5/§5b güncellendi: kendi toplayıcı (Cloudflare
  Worker → Analytics Engine) veya Plausible/Umami köprüsü (Worker'da isim
  eşlemesi) — ikisinde de tek zorunlu adım uç nokta değişkeni.
- SPA "route tracking" karşılığı: yönlendirici olmadığı için `app_open` +
  `session_start`; bu eşleme belgeye yazıldı.

## Doğrulama

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | temiz |
| `npm run lint` | temiz |
| `npm run test:run` | **1129/1129** (143 dosya) |
| `npm run build` | bütçe içinde, `verify:sw-shell` 35/35 |
| `npm run test:scripts` | geçti |
| `test:rules:emulator` | çalıştırılmadı (emülatör/Java yok) — kurallar değişmedi |

Ölçüm: ilk HTML seti 423.814 B ham / **115.329 B gzip** (T11 sonrası seviye
korunuyor). Toplam JS 908.149 B gzip; eşik 908.000 → **909.000**'e çekildi
(gerekçe `scripts/bundle-budget.mjs` içinde: yeni bağımlılık yok, artış huni
sözleşmesinin kendisi). CSS değişmedi.

### main'e taşınma notu (2026-10-28)

Bu iş `arena/1058237b-atlasia` dalında yapıldı; #120 kapatıldığı için main'in
`f58d0ef` sürümü üstüne yeniden uygulandı. Main'e taşınırken ölçümler değişti:

| Ölçüm | Eski dal | Bu dal (`7079387`) | Eşik |
|---|---|---|---|
| İlk HTML seti (gzip) | 115.753 B | **117.585 B** | 439.000 |
| Toplam JS (gzip) | 908.600 B | **916.296 B** | 916.500 |
| Toplam CSS (gzip) | 35.083 B | **35.092 B** | 35.700 |
| `test:run` | 1148/1148 | **1228/1228** (151 dosya) | — |
| SW kabuğu | 35/35 | **44/44** | — |

Farkın kaynağı yeni iş değil, main'de araya giren #124/#125 (tembel panel
yükleme + bütçe kararı) ve bu dalda geri getirilen T1–T3/T9 olay kablolamasıdır.
JS marjı yalnız **206 B** kaldı: yeni bağımlılık eklemeden önce `npm run build`
ile ölçüm alınmalı. Ayrıca bu dalda "Gizlilik" girişi mobil panelde bağlantı
değil düğme (yasal metni iletişim kutusunda açıyor); `landingA11y.test.ts`
beklentisi buna göre yazıldı.

## Bilinen sınırlar

1. **Veri akmıyor.** Uç nokta tanımlı değil; hiçbir olay ağa çıkmıyor
   (bilinçli, KVKK). "İyileşti mi?" sorusu bugün hâlâ cevaplanamaz.
2. **`consent_choice{analytics:false}` gönderilemez.** Ret seçen kullanıcıda rıza
   kapısı kapalı; ret oranı istenirse rıza öncesi çalışan ayrı bir sunucu sayacı
   gerekir (KVKK açısından ayrıca değerlendirilmeli).
3. **`map_open{guest}` bugün hep `false`.** Misafir modu (T4) yok; olay alanı
   hazır, T4 ile `true` değeri de akmaya başlayacak.
4. **Yönlendirmeli sosyal giriş sayılmıyor.** Popup engellenip `signInWithRedirect`
   akışına düşen kullanıcıda `sign_in` bu sayfada ateşlenmez; oturum açılışı bir
   sonraki ziyarette `session_start` ile görünür. (Bu yüzden `signup_complete`
   ile `sign_in` toplamı gerçek kayıt sayısından biraz düşük olabilir.)
5. **Lighthouse/CWV/Search Console ölçülmedi** — tarayıcı ve hesap erişimi yok.
6. **Brotli ölçümü yok**; tabloda gzip var (planda "250 KB brotli" hedefi).

## Sonraki görev

Plandaki sıraya göre **T4 (misafir modu)** ve **T5 (kademeli giriş)**. T4
Firestore kurallarını gerektiriyor: `places`/`posts` zaten `allow read: if true`;
misafir için yazma yolu **hiç açılmamalı** ve kural değişikliği ayrı PR'da,
okuma-yalnız koleksiyonlarla sınırlı olmalı (planın kendi risk notu). Ayrıca
misafirde hangi özelliklerin açık olacağı ürün kararı: plan "harita + POI detay +
1 sesli rehber dinleme" diyor; rota kaydet / iz bırak / grup / moderasyon kapalı.

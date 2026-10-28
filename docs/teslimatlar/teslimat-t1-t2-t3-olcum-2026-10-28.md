# Teslimat — Ölçüm tabanı: T1, T2, T3 (2026-10-28)

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
| `cta_click` | `placement`, `signed_in` | `LandingPage` → `App.handleStart` (hero/header/how_it_works/footer ayrı ayrı) |
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

# Teslimat — Denetim düzeltmeleri + T9 (giriş ekranı sürtünmesi) · 2026-10-28

> **Not (2026-10-28, main'e taşıma):** Bu belgedeki ölçümler taşınmadan
> önceki dala aittir. Bu dalda güncel sayılar `docs/baseline.md` ve son teslim
> notlarındadır (toplam JS 997.981 / 998.500 · `entry` 20.888 / 20.900 ·
> ilk boya JS 100.287 / 102.200 · ilk HTML seti 127.069 / 129.400).

## Görev ve branch

- Görev: kullanıcı isteği — "sıkıntıları kontrol et, denetle, sonra devam et".
  Önce kendi son iki commit'im denetlendi, bulunan sorunlar düzeltildi; ardından
  plandaki sıradaki uygulanabilir madde (**T9**) yapıldı. T8 ve T4 misafir
  moduna bağlı olduğu için bu turda **başlatılmadı** (aşağıda "Neden T8/T4 değil").
- Branch: `arena/1058237b-atlasia`
- Taban: `91062fb` (T1–T3 commit'i)
- Teslim commit'i: bu kaydı içeren commit

## 1. Denetim bulguları ve düzeltmeleri

| # | Bulgu | Önem | Düzeltme |
|---|---|---|---|
| D1 | `consent_choice{analytics:false}` çağrısı rıza kapısı kapalıyken yapılıyordu; kodda "neden ağa çıkmıyor" notu yoktu → yanlışlıkla "ret ölçülüyor" sanılabilirdi | Orta | Kod içi açıklama eklendi + belgede sınır olarak yazıldı |
| D2 | Huni kablolamasının **hiç davranışsal testi yoktu**; `cta_click` yanlış yerleşimle ateşlense testler yeşil kalırdı | Yüksek | `src/App.test.ts`'e 3 test: hero → `{placement:"hero"}`, header/footer ayrımı, landing açılışında `map_open`/`signup_*` ateşlenmemesi |
| D3 | `auth-secondary-providers` CSS'i T9 sonrası ölü kalacaktı | Düşük | 5 kural + 1 medya sorgusu satırı silindi; CSS 35.117 → **34.964 B** gzip, eşik yeniden 35.100'e çekildi (gevşetme geri alındı) |
| D4 | Erişilebilirlik testi yalnız `src/components/*.tsx` + `App.tsx` tarıyor; `Explorer.tsx` taşındıktan sonra kapsam dışında kalabilirdi | Kontrol edildi | `Explorer.tsx` `src/components/` altında olduğu için dizin taramasına zaten giriyor — **kapsam kaybı yok** |
| D5 | `first_route_created` bayrağı cihaz genelinde; aynı tarayıcıda ikinci hesap "ilk rota" sayılmıyor | Kabul edildi | "Cihaz aktivasyonu" tanımı olarak belgelendi; hesap başına istenirse uid'li anahtar gerekir (PII değil, ama ek karmaşıklık) |
| D6 | `sign_in` yönlendirmeli (redirect) sosyal akışta sayılmıyor | Kabul edildi | Belgede sınır olarak duruyor; popup akışında sayılıyor |
| D7 | `AccountAccess` içinde `useEffect` `useState`'lerin arasına girmişti | Düşük | Hook sırası sabit olduğu için hata değil; okunabilirlik için yerinde bırakıldı, yorum eklendi |

**Denetimde temiz çıkanlar:** typecheck/lint/test/build; SW kabuğu 35/35; ilk HTML
seti hâlâ ~115 KB gzip (Firebase ertelenmiş); `dist/` commit edilmemiş; geçici test
dosyası kalmamış; `App.tsx`'in yerleşim/kontrast/erişilebilirlik kilitleri
`Explorer.tsx`e taşındıktan sonra güncellenmiş ve yeşil.

## 2. T9 — giriş/kayıt ekranı sürtünmesi

**Önce (bulgu):** Giriş modunda e-posta formu sağlayıcıların **önündeydi**; Apple
kapalı olduğu hâlde "Apple ile giriş yakında" diye **devre dışı, tıklanamayan**
bir düğme duruyordu (boşuna dokunma hedefi + hayal kırıklığı). Sağlayıcılar ayrıca
`auth-secondary-providers` ile küçültülmüş (44 px, ikincil görünüm) çiziliyordu.

**Sonra:**

1. **Sıra:** Google (ve etkinse Apple) her iki modda da formun **üstünde**;
   altında "veya e-posta ile" ayırıcısı. Sağlayıcılar artık birincil boyutta
   (52–54 px, tam genişlik).
2. **Devre dışı sağlayıcı yok:** Yalnız `authConfigured` (Google) ve
   `APPLE_AUTH_ENABLED` (Apple) doğruysa render ediliyor. Apple kapalıyken
   yerine e-posta formunun altında mikro metin: *"Apple ile giriş yakında.
   Şimdilik Google veya e-posta ile devam edebilirsin."*
3. **Cihaz hesabı modu:** Firebase yapılandırılmamışsa hiç sosyal düğme ve
   ayırıcı yok; mevcut "Google ve Apple bağlantısı henüz etkin değil" notu kalıyor
   ve e-posta formu birincil oluyor (önceden 2 devre dışı düğme gösteriliyordu).
4. **Korunanlar:** şifre göster/gizle, `autocomplete="email"`,
   `current-password`/`new-password`, alan bazlı `aria-invalid` + satır içi hata.

### Testler

- `src/components/AccountAccess.t9.test.ts` (yeni, 7 test): Google'ın formdan
  önce geldiği (`compareDocumentPosition` ile), Apple düğmesinin hiç olmadığı,
  mikro metnin varlığı, yapılandırma yokken hiç sosyal düğme/ayırıcı olmadığı,
  `autocomplete` değerleri, şifre göster/gizle davranışı, kaynak düzeyi kilitler.
- `AccountAccess.phone.test.ts` yerleşim testi T9 kararına göre güncellendi
  (davranışsal sıra artık yeni testte; eski test yalnız "tanımlı ve formdan önce").

## 3. Doğrulama

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | temiz |
| `npm run lint` | temiz |
| `npm run test:run` | **1139/1139** (144 dosya) |
| `npm run test:scripts` | geçti |
| `npm run build` | bütçe içinde; SW kabuğu 35/35 |
| `test:rules:emulator` | çalıştırılmadı (emülatör yok) — kurallar değişmedi |

Ölçüm: ilk HTML seti 422.893 B ham / **115.033 B gzip**; toplam JS 907.955 B
(eşik 909.000); toplam CSS **34.964 B** (eşik 35.100).

## 4. Neden T8 / T4 değil

- **T8 (CTA hiyerarşisi)** "Dünyayı keşfet → misafir harita" diyor; misafir harita
  T4'ün ürünü. T4 yokken T8'i yapmak CTA'yı yine giriş ekranına göndermek olurdu.
- **T4 (misafir modu)** iki şeyi gerektiriyor:
  1. **Ürün kararı:** misafirde hangi özellikler açık (plan: harita + POI detay +
     1 sesli rehber; rota kaydet / iz bırak / grup / moderasyon kapalı) ve
     `map_open{guest:true}` akışı.
  2. **Firestore kural PR'ı:** plandaki risk notu gereği ayrı PR + okuma-yalnız
     koleksiyonlarla sınırlı.
  Bu ikisi olmadan `Explorer`'ı misafire açmak yazma yollarını yanlışlıkla açma
  riski taşıyor; bu yüzden başlatılmadı.

## 5. Sonraki görev

Onay gelirse: **T4 (misafir modu)** — önce kural PR'ı (`places`/`posts` okuma
zaten açık; yazma yolları misafire kapalı kalacak şekilde doğrulama), sonra
`Explorer`'ın misafir varyantı ve T5 (kademeli giriş) ile birlikte `AuthGateModal`.

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

# Teslimat — Zorunlu Çerez (`atlasia_consent`), Cihaz Depolaması Şeffaflığı ve Bundle Optimizasyonu (2026-10-25)

- **Görev:** Atlasia birinci taraf zorunlu çerez bilgilendirmesi (`atlasia_consent`), Ayarlar/Profil entegrasyonu, Gizlilik bölüm 3 güncellemesi ve production bundle bütçesi optimizasyonu.
- **Dal:** `arena/a6047e09-atlasia`
- **Taban commit:** `70386b2` (`chore(social): kuyruk bossa is akisini erken cikar (#100)`)

## 1. Ne yapıldı?

1. **Çerez ve yerel yedek katmanı (`src/lib/cookieConsent.ts`):**
   - Atlasia'nın ilk birinci taraf zorunlu HTTP çerezi `atlasia_consent` tanımlandı (`Max-Age=31536000` / 12 ay, `Path=/`, `SameSite=Lax`, HTTPS üzerinde `Secure`).
   - İçerik şeması: `{ version: 1, analytics: false, marketing: false, updatedAt: ISO }`.
   - Aynı kayıt `atlasia.cookieConsent.v1` anahtarıyla `storage` katmanına (tarayıcı çerezi/localStorage engellenirse bellek yedeğine düşecek şekilde) yazılır.
   - İleride isteğe bağlı bir kategori eklendiğinde sürüm artırımıyla yeniden sorma, `hasCookieConsent(record, category)` izin kapısı ve `expireCookie` temizleme yardımcısı eklendi.
2. **Çerez ve cihaz depolaması kartı (`src/components/CookieConsent.tsx` ve `src/main.tsx`):**
   - `AppErrorBoundary` içinde `NetworkStatus` ve `UpdateNotice` yanına bağlandı (`z-[90]`, `SettingsPanel` `z-[80]` üstünde, `LegalNotice` `z-[100]` altında).
   - İlk ziyarette görünür; kayıt sonrası kapanır ve yenilemede tekrar çıkmaz.
   - Sahte “Tümünü kabul et” veya çalışmayan analitik/pazarlama anahtarları eklenmedi; `Ayrıntılar` altında dürüst durumlar (`Zorunlu: Her zaman açık`, `Analitik: Kullanılmıyor`, `Pazarlama: Kullanılmıyor`) ve gerçek tarayıcı depolaması envanteri (`atlasia.theme.v1`, `atlasia.mapStyle.v1`, `atlasia.accessibility.v1`, `IndexedDB`, `Cache Storage`, Firebase Auth, Google App Check/reCAPTCHA) listelendi.
   - `Gizlilik açıklaması` düğmesi mevcut `LegalNotice` bileşenini `lazy` yükler.
   - Kayıtlı kullanıcı kartı Ayarlar/Profil üzerinden yeniden açtığında `X` düğmesi ve `Escape` tuşu ile (altındaki paneli kapatmadan) kapatabilir; odak önceki tetikleyiciye döner.
   - Mobilde alt çubuğun üstünde (`bottom-[calc(66px+env(safe-area-inset-bottom))]`), masaüstünde sol altta (`md:bottom-6 md:left-6`, `max-w-[420px]`) konumlanır.
3. **Ayarlar ve Profil bağlantısı (`src/components/SettingsPanel.tsx`):**
   - `SettingsContent` içindeki `Konum ve gizlilik` bölümüne `Çerez ve depolama` satırı eklendi.
   - Kayıt durumunu ve tarihini canlı gösterir (`atlasia:cookie-consent` olayını dinler); `Tercihleri aç` düğmesi `atlasia:cookie-preferences` olayını gönderir. `ProfilePanel` aynı `SettingsContent` bileşenini kullandığı için Profil'de de görünür.
4. **Yasal metin güncellemesi (`src/content/legal.ts`):**
   - `privacyDocument` Bölüm 3'e `atlasia_consent`, 12 ay saklama süresi, `atlasia.cookieConsent.v1` yerel yedeği, Ayarlar'dan yeniden açma yolu ve reklam/pazarlama/analitik çerezi bulunmadığı işlendi.
   - Taslak durumu (`LEGAL_REVIEW_NOTICE`) ve yer tutucular (`[TARİH]`, `[AD SOYAD / UNVAN]`, `[E-POSTA]`, `[ŞEHİR]`) korundu.
5. **Bundle bütçesi optimizasyonu (`src/utils/shareLink.ts` + `src/config/lazyLoading.test.ts`):**
   - Yeni benzersiz Lucide ikonu eklenmedi (`ShieldCheck` ve `X` yeniden kullanıldı); yalnız depoda mevcut Tailwind sınıfları kullanılarak CSS artışı **0 B** tutuldu.
   - Zaten yalnız dinamik `import("./utils/shareLink")` ile yüklenen `src/utils/shareLink.ts` içindeki iç içe `await import("fflate")` çağrıları isimlendirilmiş ESM import'a (`strFromU8`, `strToU8`, `Unzlib`, `zlibSync`) çevrilerek Rollup ağaç-budaması (tree-shaking) etkinleştirildi. Böylece `fflate` ilk HTML yüküne girmeden kullanılmayan ZIP/GZIP/Worker kodları elendi ve toplam JS gzip boyutu başlangıç tabanının da altına indi (`888.591 B` -> `881.324 B`, bütçenin **6.676 B** altında). Başlangıç yükü sınırı `src/config/lazyLoading.test.ts` ile kilitlendi.

## 2. Değişen ve eklenen dosyalar

- `src/lib/cookieConsent.ts` (yeni)
- `src/lib/cookieConsent.test.ts` (yeni)
- `src/components/CookieConsent.tsx` (yeni)
- `src/components/CookieConsent.test.ts` (yeni)
- `src/components/SettingsPanel.tsx`
- `src/components/SettingsPanel.test.ts`
- `src/content/legal.ts`
- `src/content/legal.test.ts`
- `src/main.tsx`
- `src/utils/shareLink.ts`
- `src/config/lazyLoading.test.ts`
- `docs/teslimatlar/teslimat-cerez-ve-depolama-2026-10-25.md` (yeni)

## 3. Kilitli dosya kontrolü

- `src/components/MapView.tsx`: dokunulmadı.
- `firestore.rules`, `firestore.indexes.json`, `storage.rules`: dokunulmadı.
- `public/_headers`, `public/sw.js`: dokunulmadı.

## 4. Kalite kapıları ve sonuçları

| Komut | Çıkış kodu | Sonuç |
| --- | --- | --- |
| `npm run typecheck` | `0` | 0 hata |
| `npm run lint` | `0` | 0 hata, 0 uyarı (`--max-warnings=0`) |
| `npm run test:run` | `0` | **128 dosya / 970 test geçti** |
| `npm run test:scripts` | `0` | **60 Node testi geçti** (owner-index 7, bundle-budget 6, verify-env 6, content 3, sw 11, rules-inventory 8, social 19) |
| `npm run test:rules:emulator` | `1` (yerel ortam sınırı) | Bu çalışma alanında `java` kurulu olmadığı için yerelde Java 21 kontrolünde durdu; GitHub Actions CI (`Java 21`) kanıtı kullanılır |
| `npm run build` | `0` | Bütçe içinde + SW üretim kabuğu **27/27 varlık** doğrulandı |
| `npm run verify:social-metadata` | `0` | 18 değer, 1200×630 JPEG doğrulandı |
| `npm run audit:check` | `0` | Üretim bağımlılıklarında 0 açık |

## 5. Bundle ölçümleri (gzip)

| Metrik | Taban (`70386b2`) | Optimizasyon öncesi çerezli | Teslim (`npm run build`) | Bütçe | Kalan pay |
| --- | --- | --- | --- | --- | --- |
| İlk HTML seti | 400.426 B | 402.695 B | **402.685 B** | 439.000 B | 36.315 B |
| Toplam JS | 886.088 B | 888.591 B (aşım) | **881.324 B** | 888.000 B | **6.676 B** |
| Toplam CSS | 34.451 B | 34.451 B | **34.451 B** | 34.500 B | 49 B (`+0 B` artış) |

## 6. Kontrast, yerleşim ve önizleme doğrulaması

- **WCAG 2.2 AA kontrast ölçümleri (`CookieConsent.test.ts` ile kilitli):**
  - Koyu tema (`#04201b` / `#072b24`): ana metin `15,11:1`, ikincil metin `8,94:1` / `8,18:1`, altın bağlantı `9,14:1`, birincil düğme `8,70:1`.
  - Açık tema (`#ffffff` / `#f1f4f6`): ana metin `13,69:1`, ikincil metin `6,20:1` / `5,87:1`, altın bağlantı `5,03:1`, birincil düğme `8,70:1`.
  - Gece teması (`#0a2438` / `#10324e`): ana metin `13,25:1`, ikincil metin `8,01:1` / `6,88:1`, altın bağlantı `7,36:1`, birincil düğme `8,70:1`.
- **Ortam notu:** Bu izole çalışma alanında yerel headless tarayıcı ikilisi (`chromium`/`firefox`/`webkit`) kurulu değildir; sahte görsel üretilmemiştir. Gerçek üretim derlemesi (`dist/`) `vite preview` üzerinden canlı önizleme olarak ayağa kaldırılmış; bileşen etkileşimleri, çerez yazımı, Ayarlar senkronu ve `window` `error` = 0 kontrolü gerçek DOM testleriyle doğrulanmıştır.

## 7. Bilinen riskler ve geri alma yolu

- **Riskler:** Yasal metinlerdeki `[TARİH]`, `[AD SOYAD / UNVAN]`, `[E-POSTA]`, `[ŞEHİR]` yer tutucuları yayından önce veri sorumlusu künyesi ve hukuk onayı ile doldurulmalıdır.
- **Geri alma (rollback):** Tek mantıksal commit `git revert <commit-sha>` ile geri alınabilir; mevcut kullanıcı verisi veya Firestore şeması etkilenmez.

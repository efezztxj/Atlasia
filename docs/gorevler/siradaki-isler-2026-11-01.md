# Atlasia — sıradaki işler (kesit: 1 Kasım 2026)

**Dal:** `arena/dbd151f7-atlasia` · **Taban:** `main` = `33564fd` (PR #161 merge)
**Yöntem:** Bu turda depo, açık PR'lar ve son CI koşuları okundu. Kod iddiası = dosya satırı,
operasyon iddiası = kanıt bekliyor. Tahminler "≈" ile işaretli.

Bu defter, `docs/mvp-cikis-plani-2026-10-27.md` (P0/P1), `docs/gorevler/iyilestirme-plani-durum-2026-10-28.md`
(T1–T21) ve `docs/gorevler/ana-yol-acik-kalanlar-2026-10-23.md` (AY-xx) belgelerinin **1 Kasım itibarıyla
geçerli özeti**dir; eskimiş satırlar aşağıda §5'te ayrıca işaretlendi.

---

## 0. Bugünkü gerçek durum (kanıtlı)

| Kalem | Durum | Kanıt |
|---|---|---|
| `main` CI (tip, lint, test, script, rules, build, Playwright smoke) | ✅ yeşil | PR #163 koşusu `41311077772` |
| Cloudflare Pages | ✅ yeşil (son PR önizlemesi) | PR #163 check-run |
| Canlı yapılandırma haftalık doğrulaması (`canli-dogrula.yml`) | ✅ yeşil, son koşu 27 Ekim | run `40544220105` |
| Açık PR | **5** (#163 kod, #162/#157/#156/#155 Dependabot) | `gh pr list` |
| Açık issue | 0 | `gh issue list` |
| Microsoft Clarity (rıza kapılı, üçüncü taraf) | ⚠️ kod `main`'de ama **CSP onu engelliyor** | düzeltme PR #163'te, henüz merge değil |
| Kendi telemetri yığını (`telemetry.ts` + `workers/telemetry/`) | 🟡 kod hazır, `VITE_TELEMETRY_ENDPOINT` boş → ağ kapalı | `.env.example:19` |

**Tek cümle:** Kod tarafında acil bir yangın yok; açık işlerin çoğu **hukuk, saha kanıtı ve ölçüm
operasyonu**. Ama iki tane *gerçek* kod/CI işi var: Clarity'nin CSP'de engellenmesi (#163) ve
ölçüm yığınının iki başlı kalması.

---

## 1. Hemen kapanabilir — kod/CI işi (ben yapabilirim)

| # | İş | Neden şimdi | Kabul kriteri | Emek |
|---|---|---|---|---|
| **S1** | **PR #163'ü merge et** (CSP'ye `https://scripts.clarity.ms` izni) | Şu an rıza veren kullanıcıda bile Clarity çalışmıyor: script `script-src 'self'`e takılıyor → analitik "var" görünüyor, veri gelmiyor | CI yeşil (öyle), merge + deploy sonrası rızalı oturumda Clarity panelinde 1 oturum görülmesi | 10 dk + 1 saha teyidi |
| **S2** | **Clarity'nin doküman/karar borcunu kapat** | `clarity` kelimesi `docs/`, `README.md`, `CHANGELOG.md` içinde **hiç geçmiyor**; yalnız `src/lib/clarity.ts` + `legal.ts` metninde var. Ayrıca T1'deki kendi Cloudflare Worker'ı ile **iki ayrı ölçüm yığını** duruyor | (a) CHANGELOG kaydı, (b) `docs/olcum-ve-hata-izleme.md`'ye "hangi veri nerede" tablosu, (c) README veri sağlayıcı listesine Microsoft Clarity, (d) **karar kaydı**: Clarity = oturum/etkileşim, Worker = huni olayları **veya** Worker emekli | 2-3 saat |
| **S3** | **Gerçek sayfada `axe` kapısı** (P1-4'ün kalanı) | Bugün `axe-core` yalnız 5 bileşen testinde koşuyor (JSDOM); tanıtım, harita kabuğu, paneller gerçek tarayıcıda taranmıyor | `@axe-core/playwright` ile 4 akış × 2 tema × 390×844; kritik/ciddi ihlal 0; CI'da zorunlu adım | ~1,5 gün |
| **S4** | **Lighthouse CI** (P1-2'nin kalanı) | Performans kapısı yalnız *paket bütçesi*; gerçek LCP/TBT ölçen kapı yok, G4 kabul listesi bunu istiyor | Mobil profilde tanıtım + uygulama kabuğu; perf ≥ 85, a11y ≥ 95; eşik PR'da zorunlu (ilk koşuda gerçek sayıya göre bağlanır) | ~1 gün |
| **S5** | **`loadMorePosts/Stories` oturum koruması** (AY-02) | `useFirestoreAtlasData.ts:349-361`: `await listPostsPage` sonrası UID/generation denetimi yok. Sızıntı **kanıtlanmadı**, önce test yazılmalı | Kullanıcı değişimi + geç yanıt için regresyon testi; hata görünürse kuşak (generation) kapısı; cursor/sıralama bozulmaz | ~yarım gün |
| **S6** | **Dependabot trafiğini kapat** | #157 (maplibre 6.16) ve #156 (lucide 1.61) yeşil; **#162 kırmızı** çünkü `src/config/githubActions.test.ts` pin listesi eski SHA'yı bekliyor; #155 (dev tooling) 3 gün önceki koşuda kırmızı, nedeni log'lardan okunamadı | #162'de pin testi + `docs/github-actions-pins.md` güncellenir; #155 yeniden koşup nedeni yazılır; her biri **ayrı** PR, toplu merge yok | ~2-3 saat |
| **S7** | **Durum defterlerini tazele** | `ana-yol-acik-kalanlar-2026-10-23.md` AY-01'i "hata, düzeltilmedi" diyor ama `FriendsTab.tsx:119-138` artık `searchSeqRef` ile sıra koruyor ve 16 testi var; #78/#79-83 satırları da kapalı | AY tablosuna "1 Kasım kesiti" kolonu; kapananlara kanıt satırı + `iyilestirme-plani-durum` tarih damgası | ~1-2 saat |

> Not: S3/S4 bilinçli olarak "kapı ekle" işleri. Repo kuralı gereği **eşiği yeşile çevirmek için
> düşürmek yasak**; ilk koşunun gerçek sayısı yazılıp eşik ona göre bağlanacak.

---

## 2. Kod değil — operatör/senin tarafında (ben yapamam)

| # | İş | Blokaj mı | Gereken |
|---|---|---|---|
| **O1** | **P0-1 hukuk / `LEGAL_IMPRINT`** | **Evet — lansman** | Gerçek veri sorumlusu, e-posta, şehir, sürüm tarihi + avukat onayı. Kod tarafı hazır: `src/content/legal.ts` içindeki tek nesneye 5 alan girilecek, taslak rozeti otomatik kalkacak |
| **O2** | **P0-5 App Check `Enforce` + Rules/index yayın teyidi** | Evet | Firebase Console'da Enforce + yayın zaman damgası kaydı. Haftalık `canli-dogrula` bunun yalnız "hangi projeye bağlı" kısmını otomatik doğruluyor |
| **O3** | **P0-6 / TASK-016 cihaz matrisi** | Evet | iOS Safari + Android Chrome'da 8 senaryo (giriş, konum, iz→yayın, çevrimdışı, harita, tema, hesap silme, PWA kurulumu), SHA + tarih ile |
| **O4** | **P0-7 moderasyon SLA'sı** | Evet | 24 saat yanıt hedefi, itiraz yolu, 3 raporluk uçtan uca tatbikat süreleriyle |
| **O5** | **T1/T2 ölçüm açılışı** | Hayır (S2'ye bağlı) | Ya `wrangler deploy` + `VITE_TELEMETRY_ENDPOINT`, ya "Clarity tek kaynak" kararı. S2'de karar yazılmadan env'e dokunma |
| **O6** | **T3 CWV/Search Console** | Hayır | `docs/baseline.md` LCP/INP/CLS satırları hâlâ boş; ölçüm protokolü `docs/gorevler/t3-olcum-protokolu.md`'de hazır |
| **O7** | **AY-14 pilot bölge** | Evet (pilot) | Tek bölge + ≥30 saha-doğrulanmış nokta + bir gerçek yürüme geometrisi (bugün 4 turun tamamında `isRealPath === false`) |
| **O8** | **P1-7 yedek tatbikatı** | Hayır | `scripts/firestore-restore.mjs` hazır ve test edilmiş; eksik olan **zamanlama** ve ikinci projeye gerçek restore tatbikatı |
| **O9** | **P1-6 alan adı** | Hayır | `sitemap.xml`, `robots.txt`, JSON-LD **var**; eksik olan özel alan adı + domain maliyeti kararı |
| **O10** | **Cloudflare Pages aralıklı kırmızı** | Hayır | 27-28 Ekim notunda "kod dışı, aralıklı" yazıyor; son 4 günde tekrar etti mi diye panel geçmişine bakılmalı |

---

## 3. Karar bekleyenler (senin "evet/hayır"ın olmadan kodlanmaz)

1. **Clarity vs kendi Worker'ı** — ikisi birden mi, biri mi? (S2'nin çıktısı)
2. **Web Push (P1-8)** — iOS'ta yalnız kurulu PWA'da çalışıyor: uygula ya da pilot boyunca bilinçli ertele.
3. **Çoklu foto (AY-07)** — bugünkü tek-foto + belge içi base64 modeliyle açılamaz; Storage/Blaze ya da "tek foto kalıcı".
4. **Misafir cihaz kayıtlarının hesaba taşınması (T5b)** — şu an bilinçli olarak taşınmıyor.
5. **T20 sosyal kanıt yolu** — tarihli statik sayı / ayrı `/kesfet/` sayfası / statüko.

---

## 4. Önerilen sıra (3 oturumluk)

1. **Oturum 1 (bugün, ~2-3 saat):** S1 (merge) → S2 (doküman + karar) → S6 (#162 pin testi).
   Gerekçe: üçü de yarım kalmış işi kapatıyor; hiçbiri yeni özellik değil, hiçbiri bütçeyi büyütmüyor.
2. **Oturum 2 (~2 gün):** S3 (axe E2E) → S4 (Lighthouse CI). Gerekçe: G4/G5 kapıları bunlarsız kapanmıyor;
   ikisi de ölçüm üretiyor, ölçüm de sonraki her kararın girdisi.
3. **Oturum 3 (~1 gün):** S5 (kuşak koruması) → S7 (defter tazeleme).
   Gerekçe: tek gerçek eşzamanlılık riski burada; defterler tazelenmezse sıradaki oturum yine yanlış
   "kalanlar" listesiyle başlar.

Paralelde sen: **O1'i avukata gönder** (2-3 iş günü sürüyor ve tek gerçek blokaj), O2'yi Console'da aç,
O3 için bir iPhone + bir Android ayarla.

---

## 5. Bu kesitte eskidiği doğrulanan satırlar

| Belge satırı | Eski iddia | 1 Kasım gerçeği |
|---|---|---|
| AY-01 / #76 | FriendsTab aramasında eski yanıt yenisini eziyor, düzeltilmedi | **Düzeltilmiş**: `FriendsTab.tsx:119-138` `searchSeqRef` + UID kapısı; `FriendsTab.test.ts` 16 test |
| AY-26 / #78 | Mobil sadeleştirme PR'ı açık | **Kapalı** (merge edildi) |
| AY-27 / #79-83 | 6 Dependabot PR'ı açık, CI kırmızı | Bugün **4** açık (#155-157, #162), #157/#156 yeşil |
| „Analitik yok" (MVP planı §1.6) | Üretimde hiç analitik yok | Kısmen eski: rıza kapılı Clarity `main`'de (CSP düzeltmesi #163 bekliyor) |
| „E2E/Playwright yok" (aynı tablo) | Tarayıcı testi yok | **Var**: `e2e/smoke.spec.ts` CI'da koşuyor; eksik olan `axe` ve Lighthouse katmanı |

---

## 6. Tek cümlelik özet

**Yazılacak yeni özellik yok; sırada iki yarım işi kapatmak var (Clarity'nin CSP'si ve dokümanı),
iki kalite kapısını eklemek var (axe + Lighthouse) ve geri kalan her şey hukuk, saha ve Console
kanıtı.** Bugün başlanacak doğru yer: **S1 → S2 → S6**.

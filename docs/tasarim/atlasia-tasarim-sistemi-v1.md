# Atlasia Tasarım Sistemi v1 — derinlemesine spesifikasyon

> **Durum:** öneri. Kod davranışı değişmedi. Her bölüm "bugün ne var → neden sorun → kural
> ne olmalı → nasıl ölçülür" sırasında yazıldı, çünkü tasarım kararı ancak kanıtla kapanır.
>
> **Kardeş belge:** [`atlasia-urun-tasarim-yaklasimi.md`](./atlasia-urun-tasarim-yaklasimi.md)
> (strateji, omurga, saha modu). Bu belge onun **mühendislik tarafı**: token, sözleşme,
> makine, eşik, bütçe.
>
> **Kapsam dışı:** ürün kapsamı, navigasyon sayısı, bölge kararı. Bunlar kullanıcı onayı ister.

---

## 0. Bu belge nasıl okunur

Üç katman var, karıştırılmamalı:

| Katman | Nedir | Değişim maliyeti |
|---|---|---|
| **Token** | renk, punto, boşluk, süre, katman | tek dosya, geri alınabilir |
| **Sözleşme** | bileşenin props/states/a11y garantisi | bileşen başına 1 PR |
| **Makine** | ekranların birbirine geçiş kuralı | orta risk, test ister |

Kural: **token olmadan sözleşme yazılmaz, sözleşme olmadan makine kurulmaz.**

---

## 1. Ölçülen mevcut durum (tahmin değil, sayaç)

Aşağıdaki sayılar `src` üzerinde çalıştırılan aramalarla alındı (2026-10-25, bu dal).

| Ölçüm | Bugün | Sağlıklı üst sınır | Verdict |
|---|---|---|---|
| Farklı hex renk (`#rrggbb`) | **233** | 12 | ✗ token yok |
| Farklı `bg-[#…]` dolgu | **12** | 4 | ✗ |
| Farklı punto (`text-[Npx]`) | **22** | 5 | ✗ `text-[12px]` tek başına 196 kez |
| Keyfî `z-[N]` katmanı | **13** (38…120) + tailwind 5 | 6 | ✗ katman sızdırıyor |
| Farklı köşe yarıçapı | **7** (18…30px) | 3 | ✗ |
| 44px altı dokunma hedefi | **56** (size-7 ×7, size-8 ×18, size-9 ×31) | 0 | ✗ |
| `truncate` kullanımı | **61** | <20 | ✗ metin kesiliyor |
| `App.tsx` içinde `useState` | **38** (19'u overlay boolean) | — | ✗ makine yok |
| `aria-label` | 190 | — | ✓ iyi |
| `min-h-11` (44px) kullanımı | 66 | — | ✓ kısmen doğru fikir |
| Test dosyası | 128 | — | ✓ ama görsel regresyon **yok** |
| İlk yük JS bütçesi (gzip) | 439 kB / harita 286 kB | mevcut | ✓ tasarım yeni bağımlılık eklememeli |

### 1.1 En çok işaret eden üç kanıt

**a) Metin ölçekleme çözümü, sorunun kendisi.** `src/index.css:1070+` "büyük metin" modu
için her keyfî sınıfı tek tek eziyor:

```css
html[data-text-scale="large"] .text-\[9px\], .text-\[9\.5px\], .text-\[10px\], …
```

Yani yeni bir punto eklemek, erişilebilirlik özelliğini **sessizce bozuyor**. Token
sisteminde bu tek satırdır: `--fs-*` çarpılır, iş biter. Bu tek örnek, 22 puntonun neden
sadece "dağınıklık" değil **hata kaynağı** olduğunu gösteriyor.

**b) Renk: 233 hex, ama 6'sı karar.** Gerçekten anlam taşıyan 6 renk var (ink, mint,
leaf, gold, gold-2, danger). Kalan 227, "biraz daha koyu" arayışının izi.

**c) Katman: 13 keyfî z-index.** `z-[38]` ile `z-[120]` arasında, kimsenin sahibi
olmadığı bir sıralama. Bir modal açıldığında hangi katmanın üstte kalacağı **okunarak**
değil **denenerek** bulunuyor.

### 1.2 Spesifikasyon ile kod arasında sürüklenme

`docs/mobil-denetim-2026-10-23.md` §3, `src/components/MobileDiscoverySheet.tsx`
dosyasının eklendiğini söylüyor; **bu dosya kodda yok** (üç kademeli davranış
`BottomPanel.tsx` içine yayılmış görünüyor). Bu bir suçlama değil, bir **süreç bulgusu**:
tasarım dokümanı ile kod arasında otomatik bağ yok. §13'teki "sözleşme testi" bunun
cevabı.

---

## 2. Tasarım borcunun kök nedeni

Beş kök neden; geri kalan her bulgu bunlardan türüyor:

| # | Kök neden | Belirti |
|---|---|---|
| K1 | **Anlamsal token yok**, sadece ham değer var | 233 hex, 22 punto |
| K2 | **Bileşen sözleşmesi yok**, her ekran kendi stilini yazıyor | 7 köşe yarıçapı, 2 kapatma dili |
| K3 | **Ekran geçişi makine değil, boolean yığını** | 19 overlay state, "hangisi açık" sorusu |
| K4 | **Boşluk ölçüsü yok**, göz kararı | dokunma hedefleri 28/32/36px |
| K5 | **Tasarımın kabul testi yok** | bozulma ancak kullanıcı görünce fark ediliyor |

---

## 3. Token sistemi

İki katman: **primitif** (ham değer) ve **anlamsal** (ne işe yaradığı). Bileşenler
yalnız anlamsal token kullanır; primitif hex'i bileşende görünmez.

### 3.1 Renk — 6 primitif, 14 anlamsal

```
PRİMİTİF            ANLAMSAL                     KULLANIM
ink-900  #021512 →  --surface-base             harita arka planı
ink-800  #04201b →  --surface-panel            sheet, kart
ink-700  #072b24 →  --surface-raised           kart içi bölüm
                    --surface-overlay          modal karartma %56
mint     #e4f5ea →  --text-primary             gövde metni
                    --text-secondary   (%72)   ikincil
                    --text-tertiary    (%52)   meta
                    --line-subtle      (%12)   1px çerçeve
                    --line-strong      (%24)   seçili çerçeve
gold     #f2c666 →  --action-primary           dolu buton zemini
                    --action-primary-hover
gold-2   #d99a33 →  --action-gradient-end
gold-ink #10241a →  --action-on-primary        altın üstündeki METİN
leaf     #5be0a6 →  --status-live              doğrulandı / çevrimiçi
danger   #ff6b5e →  --status-danger            yıkıcı
warning  #efcf77 →  --status-warn              eski bilgi
```

**Altın kuralı (koddaki İŞ 2a kararının genişletilmesi):** `--action-primary` bir ekranda
**en fazla bir** dolu yüzeyde görünür. Başlık, pin, etiket, logo noktası altın **olamaz**;
onlar `--text-primary` veya `--action-primary` **kenarlık** kullanır. Bugünkü "altın her
yerde" durumu vurguyu yok ediyor.

**Kontrast (hesaplandı, tahmin değil):**

| Ön plan | Zemin | Oran | Sonuç |
|---|---|---|---|
| `#ffffff` | `#f2c666` | **1.61:1** | ✗✗ okunamaz — beyaz metin altına konmaz |
| `#10241a` | `#f2c666` | **10.9:1** | ✓ AAA (mevcut `.btn-gold` doğru) |
| `#f2c666` | `#021512` | 11.66:1 | ✓ AAA (kenarlık/ikon olarak serbest) |
| `#e4f5ea` | `#021512` | 16.58:1 | ✓ AAA |
| `#e4f5ea` %52 | `#021512` | ~4.4:1 | ⚠ sınır — meta için 12px'te kullanılmaz |
| `#5be0a6` | `#021512` | 11.32:1 | ✓ AAA |
| `#d99a33` | `#021512` | 7.71:1 | ✓ AA+ |

> Not: önceki turda "altın üstünde beyaz 2.9:1" demiştim; doğrusu **1.61:1**. Yani daha
> kötü. Bu satır düzeltilmiş hâlidir.

**Kural:** `--text-tertiary` yalnız ≥12px ve AA gerektirmeyen dekoratif metinde; süre,
mesafe, puan gibi **karar veren** meta bilgi `--text-secondary` (%72) kullanır.

### 3.2 Boşluk — 4 tabanlı, 8 değer

```
--sp-1 4   --sp-2 8   --sp-3 12  --sp-4 16
--sp-5 20  --sp-6 24  --sp-8 32  --sp-12 48
```
- bileşen içi: 4/8
- bileşenler arası: 12/16
- bölümler arası: 24/32
- ekran kenarı: 16 (mobil), 24 (≥768)
Gerekçe: bugün `max-md:inset-x-3` (12px) ile `md:p-4` (16px) arasında tutarsız; tek ölçek
sheet, kart ve nav'ı kendiliğinden hizalar.

### 3.3 Yarıçap — 3 değer

```
--r-sm 12   çip, etiket, küçük buton
--r-md 20   kart, girdi
--r-lg 28   sheet, modal
```
Kural: **bir bileşenin içinde iki farklı yarıçap olmaz**; iç öğe = dış − 4 (optik düzeltme).

### 3.4 Yükseklik — 3 seviye, gölge yerine çizgi

```
--el-1  harita          0 gölge
--el-2  sheet/kart      0 10px 26px rgba(0,0,0,.28) + inset 0 1px 0 rgba(255,255,255,.05)
--el-3  modal           aynı gölge + %56 karartma
```
Bugünkü `.gold-frame` (index.css:764) doğru fikir; adı yanlış (`gold` ama nötr çerçeve).
Token'a taşınırken `--el-2` olur, sınıf adı geriye uyum için korunur.

### 3.5 Hareket — 3 süre, 2 eğri

```
--dur-tap    120ms   --ease-out   cubic-bezier(.2,.8,.2,1)
--dur-sheet  260ms   --ease-inout cubic-bezier(.4,0,.2,1)
--dur-camera 520ms   --ease-cam   cubic-bezier(.22,.61,.36,1)
```
**Tek eşzamanlılık kuralı:** aynı anda iki bağımsız hareket başlamaz. Harita kamerası
uçarken sheet açılmaz (kuyruğa alınır: `await camera.idle()`).

---

## 4. Tipografi — 4 rol, 2 mod

| Rol | Mobil | ≥768 | Satır | Harf aralığı | Kullanım |
|---|---|---|---|---|---|
| `display` | 30 | 44 | 1.03 | −0.03em | ekran/plan başlığı |
| `title` | 18 | 20 | 1.2 | −0.01em | kart başlığı |
| `body` | 15 | 15 | 1.45 | 0 | açıklama |
| `meta` | 12 | 12.5 | 1.3 | +0.02em | süre, mesafe, etiket |
| `eyebrow` | 11 | 11 | 1.2 | +0.21em, bold, uppercase | bölüm etiketi |

Mevcut 22 puntonun eşlemesi: `9→11`, `10/10.5/11→11-12`, `11.5/12/12.5→12`, `13/13.5→15`,
`14/15→15`, `17/18/19/21→18-20`, `25/26/27/28→30`, `38/60→44`. **Tek satırlık kural:**
`text-[Npx]` yerine `text-meta|body|title|display`.

**Türkçe uzunluk kuralı.** TR ortalama %15–30 daha uzun; `truncate` bu yüzden 61 yerde
kullanılıyor. Kural: birincil bilgi **tek satırda kesilmez**; kesilmesi gerekiyorsa
2 satıra izin verilir, üçüncü satır yerine sheet'in tam hâli açılır. Sayılar `tabular-nums`
(süre/mesafe hizası için).

---

## 5. Katman sistemi — 8 sabit, kaynak tek

```
--z-map       0
--z-pin      10
--z-mapui    20   (harita kontrolleri, konum)
--z-sheet    30   (keşif sheet, gün şeridi)
--z-nav      40   (alt sekme)
--z-overlay  50   (modal, drawer)
--z-popover  60   (menü, toast üstü)
--z-toast    70
```
Kural: `z-[…]` **yasak**; yeni katman gerekiyorsa bu liste büyür, tek commit'te, gerekçesiyle.
Bugünkü 13 keyfî değerin tamamı bu 8'e indirgenebilir.

---

## 6. Bileşen sözleşmeleri

Her bileşen için: **amaç · props · durumlar · a11y garantisi · yapma**.

### 6.1 `Sheet` (tek kapatma dili)

```ts
type SheetStage = "peek" | "half" | "full";
interface SheetProps {
  stage: SheetStage;
  onStageChange(s: SheetStage): void;
  snapPoints?: { peek: number; half: number; full: number }; // dvh
  title: string;                 // ekran okuyucu başlığı
  children: ReactNode;
  dismissible?: boolean;         // full'de geri = half
}
```
- Durumlar: `idle | dragging | settling`. Sürükleme sırasında yükseklik `transform: translateY`
  ile (layout tetiklemez), snap'te `transition`.
- a11y: `role="dialog"`, tutamak `aria-label="Paneli sürükle"`, klavye `↑/↓` kademe,
  `Esc` bir kademe iner; `full` dışında odak tuzağı yok.
- Yapma: kademeyi boolean ile ifade etme (`open: boolean`) — üç kademe iki boolean'a
  sığmaz, bugünkü karışıklığın kaynağı bu.

### 6.2 `PlacePin`

| Özellik | Kural |
|---|---|
| Boyut | 28×34 (harita), aktif 1.35× |
| Etiket | yalnız aktif/odak/hover; 1 satır, max 14 karakter + "…" |
| Yoğunluk | görünür alanda **≤8**; fazlası küme (cluster) |
| a11y | `aria-label="Efes Antik Kenti, İzmir, 4.8 puan"`, klavye `Enter` |
| Dokunma | görünmez 44×44 hedef (`::before` padding ile) |

Yoğunluk kuralı bugünkü ekran görüntüsündeki kalabalığın tek çözümü: 12 pin yerine
**6 pin + "hepsini gör (12)"**.

### 6.3 `PlaceCard` (satır)

```
[thumb 56×56] [title 1 satır · meta 1 satır · ikincil meta] [eylem]
```
- Başlık `title`, meta `meta` rolü; **`truncate` yok**, gerekirse satır 68px'e büyür.
- Eylem alanı tam 1 tane; kartın tamamı tıklanabilirse ayrı ok ikonu gereksiz → kaldır.
- a11y: kart `<a>` veya `role="button"`; tek `aria-label` ile başlık+meta okunur.

### 6.4 `DayStrip`

- Yükseklik 72 (boş), 96 (dolu), 44 (saha modu kompakt).
- Durak boncuğu 20px, dokunma 44px; boncuklar arası min 56px (küçük ekranda yatay kaydırma).
- Sürükleme: boncuk sürüklenince komşularına göre sıra değişir; **bırakınca** saat yeniden
  hesaplanır (sürükleme sırasında süre değişmez — titreme olmasın).
- Kamera: bırakma anında tüm durakları kapsayan `fitBounds`, 520ms.
- a11y: her boncuk `role="button"`, `aria-label="2. durak, Celsus Kütüphanesi, 10:30"`;
  klavye `←/→` sıra değiştirir (sürüklemenin eşdeğeri şart).

### 6.5 `ActionButton` (3 ton, 1 boy)

| Ton | Zemin | Metin | Nerede |
|---|---|---|---|
| `primary` | altın degrade | `--action-on-primary` | ekran başına 1 |
| `secondary` | cam + 1px çizgi | mint | yan eylemler |
| `ghost` | yok | mint %72 | iptal/atla |

Boy: 44 (normal), 56 (saha modu). Yükleme durumunda genişlik **sabit kalır** (metin
"Gönderiliyor…" iken buton zıplamaz), spinner metnin soluna girer.

### 6.6 `StateBlock` (tek boş/hata bileşeni)

```ts
type StateKind = "empty" | "error" | "offline" | "permission" | "loading";
interface StateBlockProps {
  kind: StateKind;
  title: string;
  body?: string;
  action?: { label: string; onClick(): void }; // en fazla 1
}
```
Her ekranın 5 durumu bu tek bileşenle çizilir. Bugün boş/hata metinleri dağınık; tek
bileşen hem dili hem boşluğu hem kontrastı garantiler.

---

## 7. Durum makinesi — 19 boolean'ın yerine

### 7.1 Overlay: tek birlik tip

```ts
type Overlay =
  | { kind: "none" }
  | { kind: "sheet"; stage: SheetStage }
  | { kind: "place"; id: string }
  | { kind: "search" }
  | { kind: "feed"; tab: "stories" | "groups" | "friends" }
  | { kind: "plan" }
  | { kind: "profile" }
  | { kind: "settings" }
  | { kind: "record" }
  | { kind: "field"; siteId: string };   // saha modu
```

- Bugün: 19 ayrı `useState` + `closePanels()` ile elle temizlik. Aynı anda iki overlay
  açık kalabiliyor; hangisinin üstte olduğu z-index yarışıyla çözülüyor.
- Sonra: tek `overlay` state + `stack: Overlay[]`. `close()` = `stack.pop()`, geri tuşu =
  pop. **İki overlay aynı anda görünmez** (field hariç, o tam ekran).
- Geçiş tablosu (kısaltılmış):

| Nereden | Olay | Nereye |
|---|---|---|
| `none` | pin | `place` |
| `place` | geri | `sheet:peek` |
| `sheet:peek` | yukarı sürükle | `sheet:half` → `full` |
| `full` | geri | `half` → `peek` → `none` |
| herhangi | `Escape` | bir katman iner |
| `none` | sit alanına 300 m | **öneri** `field` (tek seferlik davet, zorla değil) |

### 7.2 Saha modu makinesi

```
idle → approaching (300 m) → invited → active → paused → completed
                                  ↘ declined (bu site için bir daha sorulmaz)
```
- `active` durumunda: harita etkileşimi kapalı, tek elle iki buton.
- `paused`: uygulama arka planda / ekran kilidi; `wakeLock` istenir, alınamazsa "ekran
  kapanabilir" mikro uyarısı (suçlayıcı değil).
- `completed`: özet ekranı → "Planıma işle" (tek altın buton).

---

## 8. Jest ve hareket eşikleri

| Jest | Eşik | Sonuç |
|---|---|---|
| Sheet yukarı sürükle | >64px **veya** >0.5px/ms | bir üst kademe |
| Sheet aşağı sürükle | >120px **veya** >0.6px/ms | bir alt kademe |
| Bırakma kararsız | hız <0.2px/ms ve mesafe <32px | bulunduğu kademeye döner |
| Harita çift dokunma | — | zoom +1, 260ms |
| Pin uzun basma | 420ms | önizleme kartı (sayfa açmaz) |
| DayStrip boncuk sürükle | 8px eşik | sürükleme moduna girer (kazara sıra değişmez) |
| Yatay kaydırma çakışması | 12° içinde yatay | sheet sürüklemesini iptal eder |

**Kesinti kuralı:** sürükleme sırasında yeni bir hareket başlarsa mevcut animasyon
`transition` kesilir, `transform` anlık hedefe atlar (takılma hissi olmaz).

**Kamera koreografisi** ("yola çık" sonrası):

| t | Ne olur |
|---|---|
| 0ms | sheet peek'e iner (260ms) |
| 120ms | kamera durak 1'e `flyTo` (520ms, zoom 15) |
| 620ms | konum noktası nabız atar (1.8s, 2 kez) |
| 640ms | plan bandı belirir: "1/4 · Celsus Kütüphanesi · 140 m" |

Reduced motion: 0ms'de kesme, nabız yok, bant anında görünür.

---

## 9. Durum kataloğu — 6 ekran × 5 durum

Tablo tasarımın asıl işi; "mutlu yol" ekranı zaten herkes çizebilir.

| Ekran | Boş | Yükleniyor | Hata | Çevrimdışı | İzin yok |
|---|---|---|---|---|---|
| Keşfet haritası | "Bu bölgede henüz iz yok. İlk sen bırakır mısın?" + *İz bırak* | harita grid iskeleti, kamera sabit | "Harita açılmadı." + *Tekrar dene* | grid + "Son paket 4 saat önce" | "Nerede olduğunu bilmiyorum." + *Yakınımı göster* |
| Planım | "Bugün 3 saat var. Yakında 12 durak var, kuralım mı?" | 3 iskelet satır | "Plan yüklenemedi." + *Tekrar dene* | tam çalışır + "çevrimdışı düzenleme" etiketi | — (konum gerekmez) |
| Yer sayfası | — | foto iskeleti + başlık anında | "Bu yerin hikâyesi yüklenemedi." + *Tekrar dene* | son paket + "eski olabilir" | "Buraya 140 m" (mesafe yerine) |
| Çevrem | "Burada henüz kimse iz bırakmamış. İlk sen olur musun?" | 2 hikâye iskeleti | tekrar dene | son görülen zaman | — |
| Saha modu | — | durak listesi iskeleti | "Sesli anlatım indirilemedi." + *Yeniden indir* | **ana senaryo** | "Pusula yok, haritadan devam" |
| Profil/İzlerim | "Henüz iz yok. İlk izin bir cümle, bir fotoğraf yeter." | iskelet | tekrar dene | yerel kayıtlar + "eşitlenmeyi bekliyor" | — |

Kural: her durumda **en fazla bir** eylem; eylem yoksa durum bir bilgi değil bir çıkmazdır.

---

## 10. Erişilebilirlik — kodla eşleşen denetim

| Kontrol | Bugün | Kural | Doğrulama |
|---|---|---|---|
| Kontrast | altın üstü beyaz 1.61:1 riski | `--action-on-primary` zorunlu | token testi (§13) |
| Dokunma hedefi | 56 öğe <44px | 44/56 | lint kuralı: `size-7|8|9` ikon butonu uyarı |
| Metin ölçekleme | 20 satır override | `--fs-*` ×1.15 | tek kural, snapshot |
| Klavye | sheet `↑/↓` var, DayStrip yok | boncuk `←/→` | birim test |
| Odak tuzağı | modal bazılarında | `full`/modal | test |
| Harita alternatifi | yok | "Liste olarak gör" | her zaman görünür |
| Ekran okuyucu sırası | harita canvas'tan sonra panel | panel önce, sonra harita özeti | manuel |
| `prefers-reduced-motion` | `useAccessibilityPrefs` var | tüm animasyon 0 | test |
| Dokunma geri bildirimi | `active:scale` kısmi | 120ms + haptik (destekliyorsa) | manuel |

---

## 11. Performans tasarım bütçesi

Mevcut bütçe (`scripts/bundle-budget.mjs`): ilk yük 439 kB gzip, harita 286 kB, toplam 886 kB.

**Tasarım kuralı:** hiçbir görsel karar yeni runtime bağımlılığı getirmez.
- Sheet, DayStrip, StateBlock → **saf CSS + mevcut React** (framer-motion yok, ekleme yok).
- Gölge/glass yerine çizgi + düşük opaklık dolgu → `backdrop-filter` sayısı bugün 9;
  mobilde 6'nın üstüne çıkarsa kaydırma FPS'i düşer → **sheet + nav ile sınırlı**.
- Görsel: pin ikonları SVG (mevcut), foto küçük resimleri 56px'te `loading="lazy"` +
  `decoding="async"`; kart başına 1 foto.
- Ekran başına hedef: ilk anlamlı boya <1.5 s (4G), etkileşim <100 ms, kaydırma 60 fps.

---

## 12. İçerik tasarımı

Ses: **yol arkadaşı**, bilgiç değil. Kural: emir kipi yok, suçlama yok, süre/mesafe somut.

| Yerine | Şöyle | Neden |
|---|---|---|
| "Konum izni gerekli" | "Nerede olduğunu bilmiyorum. İzin ver, yakınını göstereyim." | "gerekli" bir engel dili |
| "Sonuç bulunamadı" | "Burada henüz kimse iz bırakmamış. İlk sen olur musun?" | boşluk → davet |
| "Kaydedildi" | "Planına ekledim. Yola çıkarken hatırlatırım." | ne olacağını söyler |
| "Hata oluştu" | "Bağlantı düştü. Tekrar dener misin?" | ne + ne yapabilirim |
| "Silinsin mi?" | "Bu izi siliyorum. Geri alınamaz." | sonucu söyler |

TR uzunluk kontrolü: buton metni ≤16 karakter, kart başlığı ≤28, meta ≤32. Çeviri değil,
**yeniden yazım** — İngilizce metnin birebir çevirisi %25 uzar ve `truncate`'i tetikler.

---

## 13. Tasarım QA — bozulma kullanıcıdan önce görünsün

Bugün 128 test var, **sıfır görsel test**. Öneri:

1. **Token sözleşme testi** (`vitest`): `tokens.json` içindeki her anlamsal token'ın
   kontrast oranı ≥4.5 (metin) / ≥3 (ikon) olduğunu doğrular. Altın üstü beyaz bir daha
   gönderilemez.
2. **Yasak sınıf testi**: `src` içinde `z-[`, `bg-[#`, `text-[Npx]` geçerse test kırmızı
   (mevcutlar için `// legacy` allowlist).
3. **Görsel regresyon**: 5 genişlik (320/360/390/768/1280) × 2 tema × 6 ekran = 60
   snapshot; yalnız PWA kabuğu, deterministik font (yerel DM Sans).
4. **Durum testi**: `StateBlock` beş türünün her biri bir story olarak render edilir.
5. **Dokunma hedefi testi**: jsdom'da `getBoundingClientRect` ile 44px altı buton avı.

---

## 14. Yayın planı (bayraklı, geri alınabilir)

| Adım | İçerik | Bayrak | Geri alma |
|---|---|---|---|
| S1 | `tokens.css` + tipografi ölçeği (görsel fark minimal) | — | tek commit revert |
| S2 | `z-index` 8 katmana indirme | — | tek commit |
| S3 | `Sheet` bileşeni (BottomPanel'i sarmalar, davranış aynı) | `sheet_v2` | bayrak kapat |
| S4 | `StateBlock` + 5 durum metni | `state_v2` | bayrak kapat |
| S5 | `PlaceCard` ve `truncate` temizliği | `card_v2` | bayrak kapat |
| S6 | `overlay` birleşik state (en riskli, en son) | `overlay_v2` | bayrak kapat |
| S7 | `DayStrip` (yeni yüzey, veri yok) | `daystrip` | bayrak kapat |

Kural: S1–S2 tek başına yayınlanabilir ve **hiçbir davranışı değiştirmez** — bu yüzden
önce onlar. S6 tek başına PR olmaz; en az S3 ile birlikte.

---

## 15. Açık kararlar (senin onayın gerekiyor)

1. **Navigasyon 5 → 3?** (Keşfet · Planım · Çevrem). AGENTS.md korunan karar değil ama
   ürün kararı.
2. **Altın kuralının sertleşmesi:** başlıkta altın kelime kalsın mı? Kural: hayır.
3. **Gün Şeridi** yeni yüzey olarak onaylanıyor mu (mevcut `routes` verisiyle)?
4. **Saha modu** otomatik davet mi (300 m) yoksa yalnız elle mi?
5. **`truncate` yasağı:** 61 yerin temizliği ~1 gün; kabul edilsin mi?
6. **Görsel regresyon** altyapısı için ek dev bağımlılığı (Playwright) izni?

---

## 16. Kabul kriterleri (ölçülebilir)

Bir sonraki tur "bitti" sayılır ancak:

- [ ] `#rrggbb` sayısı `src` içinde ≤16 (token dosyası hariç)
- [ ] `text-[Npx]` sayısı ≤5 rol
- [ ] `z-[` sayısı 0
- [ ] 44px altı dokunma hedefi 0 (istisnalar `// a11y-exempt` ile gerekçeli)
- [ ] `truncate` ≤20 ve hepsi ikincil metin
- [ ] `--action-primary` dolu yüzey: ekran başına ≤1 (6 ekranda elle doğrulandı)
- [ ] 6 ekran × 5 durum çizilmiş ve `StateBlock` ile kodda karşılığı var
- [ ] ALTIN ÜSTÜ METİN her yerde `#10241a` (otomatik test)
- [ ] 200% metin ölçeğinde hiçbir kart kırpılmıyor (5 genişlikte görsel)
- [ ] İlk rota oluşturma <90 sn (5 kullanıcı, moderasyonlu test)

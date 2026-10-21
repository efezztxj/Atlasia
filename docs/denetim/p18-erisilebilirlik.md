# P18 — Erişilebilirlik Denetimi (P1 Tur 4)

> **Kapsam:** `src/components/*.tsx` (30 bileşen) için klavye, odak sırası, görünür
> odak, kontrast (koyu + açık tema), `aria` etiketleri ve mobil dokunma hedefi.
> **Yöntem:** kaynak kod üzerinde yapısal tarama (script) + elle doğrulama +
> hesaplanmış kontrast oranları (WCAG 2.2). Tarayıcıda `axe`/ekran okuyucu turu
> **bu turda yapılmadı** — sonuçlar statik kanıta dayanır; iddia edilmeyen
> başlıklar "kapsanmadı" diye işaretlidir.
> **Yetki:** Yalnızca bu turun sahiplik listesindeki bulgular düzeltildi
> (P18-01). Diğerleri sahiplerine kuyruk olarak yazıldı — dosyalarına
> **dokunulmadı**.
> **Sahiplik kaynağı:** `docs/gorevler/calisma-kurallari.md` + P serisi görev
> panosu (P1–P4 dosya listeleri). Panoda adı geçmeyen dosyalar "listesiz".

## 0. Özet

| Sahip | Bulgu | Bu tur düzeltildi | Kuyrukta |
|---|---|---|---|
| P1 (bu tur: AccountAccess, LegalNotice, legal.ts) | 2 | 1 (P18-01) | 1 (P18-11, CSS sahipliğinde) |
| P2 | 3 | 0 | 3 |
| P3 | 1 | 0 | 1 |
| P4 | 6 | 0 | 6 |
| Listesiz (index.css, SearchBox, StreetPeek vb.) | 3 | 0 | 3 |

**Olumlu doğrulananlar (kayıt için):** `usePanelAccess` odak tuzağı + Escape +
odak iadesi üçlüsünü kuruyor ve testleri var; `LegalNotice` `role="dialog"` +
`aria-modal` + etiketli kapatma düğmesiyle tam desen; `AccountAccess` tüm
alanlarında `label[htmlFor]`, `aria-invalid`, `aria-describedby`, `role="status"`
kullanıyor; `RouteEditor`/`PlaceDetails`/`ReportDialog` girdileri label ile
sarmalı. Bu desenler P2/P3/P4 panellerinin çoğunda da tekrarlanıyor.

## 1. P1 bulguları (bu tur)

### P18-01 · DÜZELTİLDİ — açık temada AA altı metin (kontrast)

- **Yer:** `src/components/LegalNotice.tsx` — `updatedLine` satırı
  (`text-[12px] text-mint/60`).
- **Kanıt:** `--color-mint` açık temada `#12332b`, panel `#fffdf7` üzerinde
  `%60` karışımda **3,90:1** → WCAG 2.2 AA küçük metin için **< 4,5:1**
  (koyu temada 5,35:1 olduğu için yalnız açık temada düşüyor).
- **Düzeltme:** `text-mint/60` → `text-mint/70` (açık tema **5,24:1**, koyu
  6,76:1). Tasarım dili değişmedi; aynı token, AA eşiğinin üstüne çıkan en
  yakın opaklık.
- **Regresyon kilidi:** bu denetim dokümanındaki oran tablosu + aynı token'ı
  kullanan diğer `/60` kullanımları P18-04/P18-05 altında listeli.

### P18-11 · KUYRUKTA — yasal bağlantı düğmeleri hedef boyutu (gözlem)

- **Yer:** `src/components/AccountAccess.tsx` KVKK/koşul bağlantı satırı;
  boyut `.auth-legal-links button { min-height: 24px }` ile veriliyor
  (`src/index.css` — **bu tur sahiplik dışı**).
- **Değerlendirme:** WCAG 2.2 AA (2.5.8) alt sınırı 24×24 CSS px → **geçer**;
  iOS/Android 44px platform önerisinin altında. Acil değil; CSS sahibi
  isterse `min-height: 44px`'e çıkarabilir (düzen kayması yaratabilir).

## 2. P2 kuyruğu (dosyalarına dokunulmadı)

| ID | Yer | Kategori | Ciddiyet | Kanıt | Öneri |
|---|---|---|---|---|---|
| P18-03 | `src/components/SearchBox.tsx` ~110 (arama girdisi) | Görünür odak | **yüksek** | `outline-none` var, aynı satırda `focus:`/`focus-visible:` telafisi **yok** (tarama + elle doğrulama) | `focus:border-sun/60` veya `focus-visible:ring` ekle |
| P18-04 | `src/components/RouteEditor.tsx` ~96 (`text-mint/55`, 13px ipucu) | Kontrast (açık tema) | orta | `/55` açık temada **3,39:1** < 4,5:1 | `text-mint/70` |
| P18-05 | `src/components/SearchBox.tsx` ~127 (filtre düğmesi, `size-9`) | Dokunma hedefi | düşük | 36×36 px < 44 px önerisi (aria-label var, klavye tamam) | `size-11`/`min-h-11` |

Olumlu: `RouteEditor` girdileri label ile sarmalı ve `focus:border-sun/60`
telafisi var (P18-03'ten farkı bu).

## 3. P3 kuyruğu

| ID | Yer | Kategori | Ciddiyet | Kanıt | Öneri |
|---|---|---|---|---|---|
| P18-12 | `src/components/PlaceDetails.tsx` ~222 (`text-mint/60`, 11px etiket) | Kontrast (açık tema) | orta | `/60` açık temada **3,90:1** < 4,5:1 (P18-01 ile aynı hesap) | `text-mint/70` |

Olumlu: `PlaceDetails` modal `role="dialog"` + `usePanelAccess(true, onClose, true)`
ile odak tuzağı; doğrulama girdisi label + `focus:border-leaf/50` telafili.
Harita yüzeyi (MapView canvas) için ekran okuyucu metni/klavye harita kontrolü
ayrı büyük iştir; bu turda **kapsanmadı**.

## 4. P4 kuyruğu

| ID | Yer | Kategori | Ciddiyet | Kanıt | Öneri |
|---|---|---|---|---|---|
| P18-06 | `src/components/SocialPanel.tsx` ~616 (yorum girdisi) | Görünür odak | **yüksek** | `outline-none`, `focus:` telafisi yok (tarama + elle doğrulama) | `focus:border-sun/50` ekle (diğer girdilerdeki desen) |
| P18-07 | `src/components/SocialPanel.tsx` ~616 (`placeholder:text-mint/35`) | Kontrast | orta | `/35` açık temada **2,05:1**, koyuda 2,80:1 — placeholder metni AA'ya girer | `placeholder:text-mint/60`+ |
| P18-08 | `src/components/GroupsPanel.tsx` ~310 (mesaj girdisi) | `aria` adı | orta | Yalnız `placeholder` ile adlandırılmış; `aria-label`/label yok | `aria-label="Gruba mesaj yaz"` |
| P18-09 | `AddDiscoveryModal.tsx` ~97, `Drawer.tsx` ~37, `StoryComposer.tsx` ~88, `StoryViewer.tsx` ~96 | Klavye | düşük-orta | `onClick`'li `<div>` arka planları: `role`/`tabIndex` yok, klavyeyle ulaşılamaz (her ekranda ayrı kapama düğmesi var) | backdrop'ları `<button aria-label="Kapat">` yap (LegalNotice'daki desen) |
| P18-10 | `BottomPanel.tsx` ~108–111, `NotificationsPanel.tsx` ~24–25, `ReportDialog.tsx` ~56, `GroupsPanel.tsx` ~297–302 | Dokunma hedefi | düşük | `size-8`/`size-9`/`min-h-8` = 32–36 px < 44 px önerisi; etiketler mevcut | `min-h-11`/`size-11` |
| P18-13 | `src/components/AccountAccess.tsx` + `src/index.css` `.auth-*` | Tema kapsamı | orta | `.auth-access` açık temada `#061c16` koyu arka planda kalıyor (açık tema "gerçek beyaz" kuralı bu yüzeyde işlemiyor); sabit renkler `--color-*` token'larına bağlı değil | CSS sahibi (listesiz) + P1 birlikte karar versin: token'a bağla veya bilinçli "her zaman koyu giriş" kararı al |

## 5. Listesiz dosyalar (sahiplik doğrulanmalı)

| ID | Yer | Not |
|---|---|---|
| P18-14 | `src/components/StreetPeek.tsx` ~45–49 | `size-9` üçlü düğme; aria-label'lar tam, hedef 36 px (düşük) |
| P18-15 | `src/index.css` | `outline-none` uygulanan girdilerin odak stili çoğunlukla `focus:border-*` ile veriliyor; 2.4.7 için yeterli ama tek başına ince renk farkı — `focus-visible:ring` standardı önerilir (global) |
| P18-16 | `Hero.tsx`, `LandingPage.tsx`, `Avatar.tsx`, `AppErrorBoundary.tsx`, `NetworkStatus.tsx`, `PlaceImage.tsx`, `SettingsPanel.tsx`, `MyPlacesPanel.tsx` | Taramada ciddi bulgu çıkmadı (SettingsPanel `aria-pressed` kullanıyor); derin denetim turu yapılmadı |

## 6. Sonraki tur için kısa liste (öncelik sırasıyla)

1. **P18-03 + P18-06** (görünür odak — iki girdi, en yüksek kullanıcı etkisi).
2. **P18-04 + P18-07 + P18-12** (kontrast; `/55`, `/35`, `/60` değerleri AA'ya çekilsin).
3. **P18-08** (mesaj girdisi `aria-label`).
4. **P18-09** (backdrop'lar buton desenine geçsin).
5. **P18-13** (giriş yüzeyi tema kararı).
6. **P18-10/14** (dokunma hedefleri — 44 px standardı).
7. Çalışır zamanlı `axe` + ekran okuyucu (NVDA/VoiceOver) turu ve MapView canvas
   erişilebilirliği ayrı görev olarak planlansın.

## 7. Kontrast oranları (yeniden üretilebilir hesap)

Token karışımları (metin opaklığı × `--color-mint` üzerine tema paneli):

| Opaklık | Koyu tema (mint over ink-2) | Açık tema (mint over ink-2) | AA (<4,5:1) |
|---|---|---|---|
| `/35` | 2,80:1 | 2,05:1 | ❌ iki tema |
| `/55` | 4,77:1 | 3,39:1 | ❌ açık tema |
| `/60` | 5,35:1 | 3,90:1 | ❌ açık tema |
| `/70` | 6,76:1 | 5,24:1 | ✅ |
| `/75` | 7,49:1 | 6,11:1 | ✅ |
| `/85` | 9,22:1 | 8,49:1 | ✅ |

Hesap: WCAG bağıl parlaklık; koyu `mint #e4f5ea / ink-2 ≈ #0a332c`, açık
`mint #12332b / ink-2 #fffdf7` (`src/index.css` tema blokları).

# Teslimat P15 — Çevrimdışı saha paketi

**Tarih:** 2026-10-22 · **Durum:** ✅ kod tamam; gerçek cihazda uçak modu testi yapılmadı.

## Lisans kararı (docs/denetim/p15-lisans.md'ye uygun)
- Yalnız **OpenFreeMap** vektör karoları + stil varlıkları (TileJSON, sprite, Noto Sans 0-511) paketlenir.
- Esri (Uydu/Sokak/Topoğrafik), CARTO ve **AWS Terrain (DEM, hakkı doğrulanmadı)** paketlenmez. DEM indiren kullanılmayan `prefetchTilesForBbox` kaldırıldı.
- Tek sabit sınır `OFFLINE_PACK_LIMITS`: 3.000 karo / 50 MB / 4 paralel, z12–15. SW allowlist'i değişmedi.

## Davranış (`src/utils/offlinePacks.ts`, `OfflinePackage.tsx`)
- Ayarlar → "Çevrimdışı harita": görünen alan için **önce tahmin** (karo + MB); sınır aşılırsa düğme kapalı, "yakınlaştır" mesajı. İndirme yalnız düğmeyle başlar.
- Karo şablonu canlı TileJSON'dan alınır (sürümlü URL; eski kod sürümsüz `/planet/{z}/…` kullanıyordu, harita bu URL'leri hiç istemediği için önbellek işe yaramıyordu) ve allowlist'ten geçmezse paket başlamaz.
- İptal → dizine yazılmaz, yarım karolar silinir. Kısmi hata / 50 MB / `QuotaExceededError` → paket **eksik** etiketiyle kaydedilir.
- Paket listesi, toplam boyut, tek tek silme; ortak karolar diğer pakette korunur, son paket silinince cache tamamen kalkar.
- `sw.js`: `atlasia-packs-v1` önce okunur, LRU (500) kırpmasına girmez; kabuk `v5`.
- Bileşen lazy chunk (4,6 KB gzip); entry 169.653 B (bütçe 174.000).

## Testler
`offlinePacks.test.ts` (13): z0, antimeridyen, kutup, 3000 reddi (ağ isteği yok), şablon allowlist (Esri/terrain/lookalike), ≤4 paralel, eksik, kota, iptal temizliği, ortak karo koruması, sw.js sözleşmesi.

## Doğrulama
`node --check public/sw.js` ✅ (denetim 2026-10-22).

## Açık
- Ayarlar paneline yeni "Çevrimdışı harita" bölümü eklendi. Bileşen daha önce hiçbir yere bağlı değildi; spec "yerleşim değişikliği yok" diyor → bu ekleme kullanıcı onayına tabidir.
- Paketsiz bölgede SW 204 boş karo döner; NetworkStatus çevrimdışı bandı gösterir. Gri alan + bant birlikte gerçek cihazda görülmeli.
- Çevrimdışıyken yalnız "Karanlık" altlık çalışır; UI bunu söylüyor. Gerçek cihazda uçak modu doğrulaması (TASK-016) kullanıcıda.

# Denetim · Tüm P görevleri (P1–P20) — 2026-10-22

**Hüküm:** ✅ **ONAY (şerhli).** Main'de hiçbir P görevi kırık değil. 5 görev kullanıcı kararı bekleyen açık nokta taşıyor (aşağıda ⚠️). Belge eksikleri ve P16 gerilemesi bu turda kapatıldı.

- **Taban:** main `f05d06c` (#48 sonrası), dal `arena/f4e28a87-atlasia`
- **Yöntem:** teslimat iddiası → kod/test satırı çapraz kontrolü + tam kalite kapısı. Canlı site, gerçek cihaz ve ekran okuyucu bu denetime girmez.

## Kalite kapısı (yerel, `f05d06c`)

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npm run test:run` | ✅ 96 dosya / 676 test (düzeltmeler sonrası 98 / 686) |
| `npm run test:scripts` | ✅ 7 + 6 + 6 + 3 node testi |
| `npm run audit:check` | ✅ üretim bağımlılıklarında bilinen açık yok |
| `npm run build` + bütçe | ✅ entry 169.653 / 174.000 B · HTML 410.631 / 439.000 · JS 850.780 / 886.000 · CSS 31.156 / 34.500 |
| `npm run verify:social-metadata` | ✅ |
| `node --check public/sw.js` | ✅ |
| `test:rules:emulator` | yerelde Java yok → **CI kanıtı:** run 39760744523 (`f05d06c`) "Firestore security rules tests" ✅ |

## Görev görev hüküm

| P | Konu | Kanıt (main) | Hüküm |
|---|---|---|---|
| P1 | Temel: atomik beğeni, replies alt koleksiyonu, story `seen` yerelde | `firestoreData.ts:652` arrayUnion/Remove; `SocialPanel.tsx:39` `atlasia.feed.seen.v1`; `types.ts`'te `seen` yok | ✅ |
| P2 | Rota motoru: görünürlük, track sahip-only, foto ≤180.000, dwell ≥3 dk, `?route=` | rules 23/184; `image.ts:1`; `track.ts:70` `dwellMinMs: 3*60*1000`; `App.tsx:186` | ✅ (gerçek cihaz GPS yok) |
| P3 | Overpass 200–2000 m, timeout 25, ≤60, cache 7 g + 30 dk; Esri cache yasağı | `historicSites.ts:14-16,139-140,236`; `isEsriTile` | ✅ |
| P4 | Topluluk: storage.rules kapalı, boş catch yok | `storage.rules` tümü kapalı; `.catch(() => {})` taraması temiz | ✅ |
| P5 | Emulator JVM İngilizce locale | `run-firestore-rules-tests.mjs:172-173` | ⚠️ kod var; **Windows'ta hâlâ çalıştırılmadı** (CI Linux) |
| P10 | Spin döngüsü | rAF + `shouldAdvanceSpin` ≤15 FPS, gizli sekme/reduced-motion/hareket durdurur | ✅ — **plan notu yanlıştı** ("15 FPS setTimeout"), düzeltildi |
| P11 | Tile allowlist tam host/path | `offlineCache.ts` + `sw.js` `host === … && startsWith`; `includes(` yok; senkron testi | ✅ |
| P12 | Rules test kapsamı + koşucu | CI emulator adımı yeşil; `firestoreRulesRunner.test.ts` | ✅ |
| P13 | KKTC etiket çakışması (B) | `MapView.tsx:728-733` outline her altlıkta, label `kktcLabelVisible` | ✅ |
| P14 | Overpass + Wikipedia, atıf | `historicSites.pipeline.test.ts` (9); PlaceDetails atıf satırı | ⚠️ boru hattı ✅; **UI'a bağlı değil** → "hata sessiz kalmasın" maddesi UI'da karşılanmadı; CSP `connect-src` overpass/wikipedia/wikidata yok. Teslimatta akış diyagramı ve lisans listesi **eksikti → eklendi** |
| P15 | Çevrimdışı saha paketi | `offlinePacks.test.ts` (13); `sw.js` pack cache | ⚠️ kod ✅; Ayarlar'a **yeni bölüm eklendi** (spec "yerleşim değişikliği yok" der) → onayın gerekli; `node --check` teslimata eklendi; uçak modu cihaz testi yok |
| P16 | Testsiz modül kalmaması | envanter taraması | ❌→✅ **gerileme vardı:** P16 sonrası gelen `lib/friendships.ts`, `lib/userProfiles.ts` testsizdi → saf fonksiyon testleri eklendi (10). `utils/mapWeather.ts` (MapLibre DOM'a bağlı) hâlâ testsiz — kayıtlı |
| P17 | track → taslak rota + onaylı kaydet | `trackDraft.ts`, `TrackRecorderPanel` + testler; #35 MERGED | ✅ — plan "#35'te sürüyor" diyordu, düzeltildi |
| P18 | Erişilebilirlik | 13 dialog'un 12'si `usePanelAccess`, SettingsPanel kendi tuzağı (Tab+Esc); etiketsiz ikon düğmesi taraması temiz; `accessibility.test.ts` | ⚠️ açık temada 140 `text-mint/<70` (karar sende); P18-13 `.auth-access` açık temada hâlâ koyu (karar sende); StoryComposer hata metni `role="alert"` değildi → **düzeltildi** |
| P19 | Bundle bütçesi | `bundle-budget.mjs` + CI; `deleteUser` dinamik import (`moderation.ts:587`) | ✅ |
| P20 | Paylaşım linki | `shareLink.ts` v1, 12.000 karakter / 512 KB sınırı, Türkçe+emoji round-trip, RouteEditor onay kutusu | ✅ — teslimatta format/sınır/gizlilik yeri **eksikti → eklendi** |

> P6–P9 için depoda iddia/teslimat kaydı yok; denetlenecek tanım bulunamadı.

## Bu turda yapılan düzeltmeler

1. `src/lib/friendships.test.ts`, `src/lib/userProfiles.test.ts` (10 test; kuşkulu davranış: tek kullanıcılı arkadaşlık belgesi `["a",""]` döner — belgelendi, değiştirilmedi).
2. `StoryComposer.tsx` hata mesajı `role="alert"`.
3. `teslimat-p14.md` akış diyagramı + lisans listesi; `teslimat-p20.md` format/sınır/gizlilik; `teslimat-p15.md` doğrulama + açık noktalar.
4. `p-serisi-uzun-vadeli.md`: P10 notu, P17 #35, "süren işler" satırı güncel.

## Kullanıcı kararı bekleyenler

1. **P14:** `historicSites`'ı bir ekrana bağlamak + CSP'ye `overpass-api.de`, `*.wikipedia.org`, `www.wikidata.org` eklemek.
2. **P15:** Ayarlar'daki "Çevrimdışı harita" bölümü kalsın mı?
3. **P18:** Açık tema kontrastı (140 kullanım) ve giriş yüzeyinin açık temada koyu kalması.
4. **P5:** Windows'ta `npm run test:rules:emulator` bir kez çalıştırılmalı.
5. **Genel:** Firestore rules + indeks deploy hâlâ yapılmadı (sosyal özellikler canlıda izin hatası verir).

## Biçim notu
Plan "biten satır tablodan kaldırılır" kuralı ile 2026-10-22 "✅ işaretle" uygulaması çelişiyor; mevcut tablo ikincisini izliyor. Teslimatlar hem kökte (P12/13/16/19) hem `docs/teslimatlar/` altında; taşıma yapılmadı.

## İkinci tur (2026-10-22, kullanıcı: "sırasıyla yap, düzelt")

| P | Önce | Şimdi | Ne yapıldı |
|---|---|---|---|
| P16 | ⚠️ mapWeather testsiz | ✅ | `mapWeather.test.ts` (5): kapalıyken ağ yok, hata/boş yanıt etiketi, geç yanıt çizilmez, destroy |
| P5 | ⚠️ Windows'ta koşulmadı | ✅ (CI kanıtı PR'da) | `rules-windows.yml`: windows-latest + `Set-Culture tr-TR` + emulator testleri |
| P14 | ⚠️ UI'a bağlı değil, CSP kapalı | ✅ | Yer detayında "Yakındaki tarihî yerler" (düğmeyle, lazy); CSP tam host; Efes fixture entry sızıntısı kapatıldı |
| P15 | ⚠️ yerleşim değişikliği | ✅ karar: kalır | Bölüm olmadan özellik ölü; teslimata işlendi |
| P18 | ⚠️ 140 açık tema AA altı, giriş yüzeyi | ✅ | Açık tema AA katmanı (koyu tema aynen); giriş yüzeyi **bilinçli koyu** + AA testi |
| P6–P9 | — | kapandı | Tanım yok; plan dosyasına "boş numara" olarak işlendi |

Canlı rules karşılaştırması: `canli-rules-farki-2026-10-22.md`.

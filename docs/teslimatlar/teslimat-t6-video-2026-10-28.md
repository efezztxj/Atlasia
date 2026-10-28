# Teslimat — T6: tanıtım filmi (`preload="none"` + poster)

**Tarih:** 2026-10-28 · **Dal:** `arena/1ec07123-atlasia`
**Karar:** harici barındırma yerine **repodaki mevcut klip** kullanıldı
(`public/social/goreme-yuruyus.mp4`, Kapadokya · Aşk Vadisi sırtı, 1080×1920,
4,0 MB). Yeni servis, yeni bağımlılık, CDN hesabı yok.

## 1. Ne yapıldı

`LandingPage` içine `#film` bölümü eklendi (`#nasil` ile SSS arasında):

| Kural | Uygulama | Neden |
|---|---|---|
| `preload="none"` | Var | Kullanıcı oynatmadan **tek bayt** inmez; mobil veri harcamaz. |
| `poster` | `/images/atlasia-earth-hero.jpg` | Hero'da **zaten** yüklenen marka görseli: ek ağ maliyeti sıfır, SW kabuğunda önbellekte. *Videodan alınmış bir kare değildir* — afiş görseli olarak kullanılıyor. |
| Otomatik oynatma | Yok | `autoPlay`/`loop`/`muted` yok; ses de kendiliğinden başlamaz. |
| `controls` + `playsInline` | Var | iOS'ta tam ekrana zorlamaz, kontroller kullanıcıda. |
| `width`/`height` + `aspect-[9/16]` | 1080 × 1920 | Yer önceden ayrılır → CLS yok. |
| Geri dönüş | `<source>` altında ve bölümde "Videoyu ayrı aç" bağlantısı | Video oynatılamazsa yol kapanmaz. |
| Mobil menü | `#film` bağlantısı eklendi | Bölüm klavyeden/menüden erişilebilir. |

## 2. Neden bu klip, neden bu poster

- **Klip:** ürün tezinin tam karşılığı (yürüyerek keşif, Kapadokya), Türkiye'deki
  hedef kitleye yakın, dosya boyutu klipler arasında ortada (4,0 MB; en küçüğü
  3,5 MB, en büyüğü 5,3 MB). Klipler Instagram hattı için üretilmiş reels
  boyutunda; tanıtımda dikey kart olarak duruyor.
- **Poster:** ffmpeg bu ortamda yok, videodan kare çıkarılamadı. Uydurma bir AI
  görseli yerine **zaten yüklenen** marka görseli afiş olarak kullanıldı; bu,
  "poster gerçek bir kare olmalı" kuralını esnetir ama ek ağ maliyeti ve yanlış
  izlenim riski sıfır. Gerçek kare istenirse `ffmpeg -ss 2 -i … -frames:v 1`
  ile üretilip aynı yola konur (kod değişikliği gerekmez).

## 3. Doğrulama

`src/config/landingVideoT6.test.ts` (7 test): `preload="none"`, poster dosyası
var, `autoPlay`/`loop`/`muted` **yok**, `width`/`height` yazılı, klip var ve
8 MB altında, **SW kabuğu videoyu önbelleğe almıyor**, video oynatılamazsa
okunabilir bağlantı var.

## 4. Bütçe (ölçüm)

| Ölçüm | Önce | Sonra | Eşik |
|---|---|---|---|
| `entry` | 18.344 B | **18.888 B** (+544) | 20.900 (değişmedi) |
| İlk boya JS | 97.743 B | **98.287 B** | 102.200 (değişmedi) |
| İlk HTML seti | 125.351 B | **125.991 B** | 129.400 (değişmedi) |
| Toplam JS | 999.785 B | **1.000.364 B** | 1.001.000 → **1.002.000** |
| SW kabuğu | 44/44 | **46/46** varlık | ✅ |

Video **JS paketine girmez**; `dist/social/goreme-yuruyus.mp4` olarak durur ve
yalnız oynatma anında istenir. Toplam JS eşiği tek seferde ölçüme göre
1.002.000'e çekildi (pay 1.636 B), gerekçe `scripts/bundle-budget.mjs` içinde.

## 5. Kapılar

| Komut | Sonuç |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (`--max-warnings=0`) | ✅ |
| `npx vitest run` | ✅ **1292/1292** (160 dosya) |
| `npm run test:scripts` | ✅ 8 paket, `# fail 0` |
| `npm run build` | ✅ bütçe içinde, SW 46/46 |
| `npm run audit:check` | ✅ |

## 6. Riskler / açık noktalar

1. **Poster gerçek kare değil** (yukarıda açıklandı). Ürün kararı: kalabilir ya
   da ffmpeg ile tek komutla değiştirilir.
2. **4 MB klip** kullanıcı oynatınca iner; mobilde veri uyarısı vermiyoruz.
   Metin "video yalnız oynat dediğinde iner" diyor. İstenirse 720p türevi
   (`<source media>` ile) eklenebilir — ayrı iş.
3. Sesli anlatım/alt yazı yok; sağır kullanıcı için metin özet bölümde
   ("Bir sırt, bir sabah, bir iz." + iki paragraf) duruyor.

# Teslimat — Mobil sadeleştirme: tam ekran paneller, aksiyon sırası, altın PP halkası

**Tarih:** 2026-10-23 · **Dal:** `arena/0667dc52-atlasia`
**Kaynak:** PR #66 canlıya alındıktan sonra kullanıcının telefon görüntüsüyle verdiği geri bildirimler.

## Kullanıcı istekleri → yapılan

| İstek | Uygulama |
| --- | --- |
| "Yürüyüş kaydı pinle aynı yerde olsun, yer bilgisiyle karışmasın" | Mobilde soldaki geniş hap kaldırıldı; yürüyüş artık merkezdeki `+` butonunun **hemen solunda** 46 px yuvarlak ikon. Aynı satırda sağda Atlas AI var; üçü tek sakin aksiyon sırası oluşturuyor. Masaüstünde etiketli hap korundu. |
| "PP etrafındaki RGB kötü" | `.avatar-gold-ring` çok renkli conic degrade yerine tek renk altın degrade (`#f7d774 → #eab54f → #c98a2d`). Profil, başlık ve Atlas avatarları aynı sade halkayı kullanıyor. Hikâye halkası (`.story-ring`) kapsam dışı, dokunulmadı. |
| "PC'de Profil bölümleri sağa çekilemiyor; ekran genişlesin/oynatılabilir olsun" | Profil paneli PC'de 430 → **520 px**; bölüm şeridi yatay kayan flex yerine **4 sütunlu grid**: Hesabım/Kayıtlar/Ayarlar/Konum kaydırmadan, eksiksiz görünüyor. Dar telefonda ikonlar gizlenip etiketler tam okunuyor. |
| "Telefonda Profil ve İzler tam ekran olsun" | Profil mobilde `inset-0` tam ekran (başlıkta safe-area boşluğu). İzler mobilde üstte yalnız **6 px + safe-area** bırakıp alta kadar iniyor; yazma alanına alt safe-area boşluğu eklendi. |
| "İzler'in üstünde kalan alan neredeyse tamamen kapansın" | Panel tam ekran + mobilde **tamamen opak** zemin; arkada başlık/Hero hayalet gibi görünmüyor. |
| "Telefon kısmı çok rahatsız edici" | Kök `h-screen → h-dvh` ve harita kapsülü `absolute → fixed`: kapsül/FAB'lar aynı gerçek görünüm alanına göre konumlanıyor (canlı görüntüde kapsülün kart arkasına kayması bu uyumsuzluktandı). Yürüyüş hapının kalkmasıyla sol alt köşe boşaldı. |

## Güncel `main` ile birleştirme

Dal, tabanından ilerlemiş `origin/main` (`22224be`) ile birleştirildi (`10b4033`).
Beş dosyada çakışma çıktı; yeni main'in davranışları ezilmeden korundu:

- `panelOpen` iken yürüyüş butonunu mobilde gizleme (main) + yeni yuvarlak konum (bu iş).
- `MapControls`'un `hiddenOnMobile` gizlemesi (main) + `fixed` konum (bu iş).
- Blur kaldırma / performans kararları (main) + İzler tam ekran geometrisi ve Profil grid şeridi (bu iş). İzler mobil zemini blur olmadığı için tamamen opak yapıldı.
- `.mobile-map-controls` 186 px yedek konumu (main) korundu; ölçülen yığın kuralı üstte kazanmaya devam ediyor.

## Ölçümler (390×844 mobil, 1366×900 PC — gerçek uygulama, cihaz hesabıyla)

- Yürüyüş–`+` arası **10 px**; ikisi de alt satırda aynı hizada (46/44 px).
- Kapsül altı ↔ keşif kartı üstü **10 px** (ölçülen yığın kuralı).
- İzler paneli: üst **6 px**, alt **0**, yükseklik **838/844**.
- Profil mobil: **0–844** tam ekran. PC: genişlik **520 px**, "Konum" çipi panel içinde bitiyor.
- Sayfa hatası: 0. Görseller (çalışma alanı): `design-vizyon/rahat-ana.png`, `rahat-izler.png`, `rahat-profil-mobil.png`, `rahat-profil-pc.png`.

## Kapılar

- `typecheck` ✅ · `lint` ✅ · `test:run` **122 dosya / 919 test** ✅ · `test:scripts` ✅ · `audit:check` ✅
- `build` ✅ — bundle bütçesi içinde (entry **171.149 B** gzip / bütçe 174.000 B) + `verify:sw-shell` ✅ · `verify:social-metadata` ✅
  - Not: Eski dal tabanında entry bütçesi yerelde 250 B aşılıyordu; güncel main ile birleştirme sonrası bütçe içinde. Eşik gevşetilmedi.
- `test:rules:emulator`: ortamda Java yok → CI koşar.

## Açık/cihazda doğrulanacak

- Gerçek Android'de tarayıcı çubuğu açılıp kapanırken kapsül/FAB hizası (`h-dvh` + `fixed` sonrası) ve tam ekran paneller kullanıcının telefonunda son kez bakılacak.
- Yürüyüş butonu mobilde yalnız ikon; `aria-label`/`title` mevcut. Keşfedilebilirliği yetersiz bulunursa etiketi geri getirmek tek satırlık iş.

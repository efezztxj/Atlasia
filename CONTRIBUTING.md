# Atlasia katkı akışı

1. Güncel görev sahipliğini ve kilitli dosyaları doğrula.
2. Tek görev için ayrı branch aç.
3. Başlamadan önce dokunulacak dosyaları kaydet.
4. Özellik kapsamı dışında tasarım veya yapılandırma değişikliği yapma.
5. `npm run check` başarılı olmadan commit'i incelemeye gönderme.
6. Teslim notuna değişen dosyaları, çalıştırılan testleri ve bilinen riskleri ekle.
7. İncelemeyi kodu yazmayan agent veya ekip üyesi yapsın.

## Commit ilkesi

- Bir commit tek bir mantıksal değişiklik taşımalıdır.
- Yarım özellik, geçici gizli anahtar veya üretilmiş `dist/` içeriği commit edilmez.
- Force-push, geçmişi yeniden yazma ve yıkıcı Git komutları kullanıcı onayı olmadan kullanılmaz.

## Korunan ürün kararları

- Yayın hattı GitHub → Cloudflare'dır; Netlify kullanılmaz.
- Masaüstünde başlık solda, arama sağda kalır; mobil yerleşim ayrı korunur.
- Atlas AI sağ alttaki konumunda kalır.
- Sağ harita kontrolleri korunur.
- Masaüstünde tek alt keşif paneli vardır; kapalı hâli masaüstü ve mobilde tamamen kaybolmaz.

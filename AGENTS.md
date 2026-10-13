# Atlasia — agent çalışma kuralları

Bu dosya, aynı repo üzerinde çalışan agentların çakışmasını önleyen kalıcı mühendislik sözleşmesidir. Göreve özgü sahiplik ve dosya kilitleri, kullanıcı tarafından sağlanan ortak görev panosunda tutulur; özel koordinasyon bağlantıları repoya yazılmaz.

## Başlamadan önce

1. `git status --short --branch` ile çalışma alanını kontrol et.
2. Atanmış görev ve kabul kriteri yoksa kod yazma.
3. Dokunulacak ve kilitli dosyaları görev kaydında belirt.
4. Her görev için ayrı branch ve mantıksal commit kullan; `main` üzerinde doğrudan geliştirme yapma.
5. Başka agentın sahiplendiği dosyayı paralel değiştirme.

## Git güvenliği

- Kullanıcı onayı olmadan `git reset --hard`, `git clean`, zorla checkout/restore, rebase, force-push veya geçmişi yeniden yazan işlem çalıştırma.
- Commit edilmemiş kullanıcı değişikliklerini silme, stash'e taşıma ya da başka göreve katma.
- Üretilmiş `dist/`, gizli `.env` dosyaları ve yarım özellikleri commit etme.
- Bir özellik mümkün olduğunca tek görev ve ayrı commit olarak ilerlemelidir.

## Korunan ürün kararları

- Atlasia mevcut web/PWA ürününü güçlendirir; bu repo için güncel hedef native mağaza yayını değildir.
- Yayın hattı GitHub → Cloudflare'dır; Netlify eklenmez veya etkinleştirilmez.
- Kullanıcı istemeden konum, boyut, yerleşim veya tasarım değişikliği yapma.
- Masaüstünde başlık solda, arama sağda kalır; mobil yerleşim ayrı korunur.
- Atlas AI sağ altta kalır; sağ harita kontrolleri korunur.
- Masaüstünde tek alt keşif paneli vardır; kapalı panel masaüstü ve mobilde tamamen kaybolmaz.
- Koyu tema mevcut siyah tema, açık tema gerçek beyaz tema olmalıdır.
- Firebase Storage/Blaze veya ücretli servis, açık kullanıcı onayı olmadan eklenmez.

## Güvenlik ve kalite kapısı

- API anahtarı, PAT, şifre, servis hesabı veya özel kullanıcı verisini koda, commit'e ya da ortak göreve yazma.
- Vite değişkenlerinin tarayıcı paketinde görünür olduğunu varsay; yönetici sırrını `VITE_` değişkenine koyma.
- Teslimden önce temiz kurulumda `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` ve `npm run audit:check` çalıştır.
- Derlenmeyen, test edilmemiş veya bilinen durumu saklayan kodu push/merge/deploy etme.
- Bilinmeyen repo, deployment veya ürün durumunu kesin bilgi gibi sunma.

## Devir teslim

Teslim kaydı en az şunları içermelidir:

- görev ve branch adı,
- taban ve teslim commit'i,
- değişen dosyalar,
- çalıştırılan komutlar ve sonuçları,
- kilitli dosya kontrolü,
- bilinen riskler ve sonraki görev,
- bağımsız inceleme sonucu.

Bir talimat bu kurallarla çelişirse çalışmayı durdur ve kullanıcıdan doğrulama iste.

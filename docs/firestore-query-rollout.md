# Firestore pencereli sorgu yayın sırası

Bu paket eski `places=250`, `posts=100`, `stories=100` tek pencere modelini kaldırır. Her istek küçük ve güvenlik kurallarıyla sınırlıdır; eski içerik cursor, dar harita viewport'u veya `authorUid` sahip sorgusuyla erişilebilir.

## Zorunlu sıra

1. `firestore.indexes.json` içindeki indeksleri dağıt ve Firebase konsolunda durumları **Ready** olana kadar bekle.
2. Yeni istemciyi Cloudflare preview'da doğrula. Özellikle İzlerim, yakınlaştırılmış harita, “Daha eski gönderileri yükle” ve “Daha eski” story akışlarını kontrol et.
3. Yeni istemciyi yayınla; hata oranı ve Firestore `failed-precondition` / `permission-denied` kayıtlarını izle.
4. Eski service worker/sekme sürümlerinin yenilenmesi için geçiş penceresi bırak.
5. Son olarak yeni `firestore.rules` dosyasını dağıt. Bu adım istek başına sınırları places=50, posts=25 ve stories=25 olarak sıkılaştırır.

İndeksler hazır olmadan istemci veya kurallar yayınlanmamalıdır. Eski istemci 250/100/100 limitleriyle sorgu yaptığı için kuralların erkenden sıkılaştırılması, açık eski sekmeleri fail-closed biçimde durdurur.

## Duman testleri

- Dünya görünümünde küçük overview örneği gelir; zoom 5 ve üstünde görünür bölgenin pinleri güncellenir.
- Tarih çizgisini geçen viewport iki sınırlı sorguyla birleştirilir.
- Kullanıcının viewport dışındaki kendi izleri İzlerim'de görünür ve sahip kontrollü silinebilir.
- Gönderi ve story ilk sayfaları canlıdır; yükleme kontrolü cursor ile sonraki sayfayı getirir ve yinelenen kimlik üretmez.
- Limitsiz sorgu ile places>50, posts>25 ve stories>25 istekleri Rules tarafından reddedilir.

## Geri alma

Kurallar sıkılaştırıldıktan sonra eski istemciye dönülecekse önce önceki Rules limitlerini geri yükle; ardından istemciyi geri al. İndeksleri aceleyle silme: aktif veya önbellekteki yeni istemciler bunlara ihtiyaç duyabilir. Sorun yalnız yeni viewport sorgusundaysa yeni istemciyi overview davranışına döndüren bir düzeltme yayımla ve indeksleri yerinde bırak.

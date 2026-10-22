# P15 — çevrimdışı harita lisans / kota notu

**Kontrol tarihi:** 2026-10-22. Bu not hukuki görüş değildir. Servis şartları ve her bir harita katmanının item-level kullanım kısıtı yeniden kontrol edilmeden çevrimdışı indirme açılmamalı. Lisansın izin vermediği katmanları uygulama kodu indirme allowlist'ine dahil etmemelidir.

| Kaynak | Çevrimdışı kullanım | Kota / istek | Atıf | Durum |
|---|---|---|---|---|
| **Esri ArcGIS Online basemap/World Imagery** | Genel web servis karolarını doğrudan toplu indirme/önbelleğe alma bu PWA için kapalı kalır. Esri'nin offline dokümanı, yalnız offline-enabled web map/layer ve export izinli item/servis akışını tarif eder; bu, her public REST tile URL'sine genel indirme izni değildir. Bu uygulamanın kullandığı public tile endpoint'i için export izni doğrulanmadı. | Servis/item ve hesap türüne bağlıdır; Atlasia'nın kullandığı URL için çevrimdışı indirme kotası doğrulanmadı. | Görünür, ilgili item/service credits; Esri dokümanı item'ın kendi credits alanına bakılmasını söyler. | **Atlasia offline pack'e dahil etmeyin.** |
| **CARTO Basemaps** | Toplu indirme ve tile içeriğini yeniden dağıtma yasak; kullanıcı cihazında/browser cache'i 30 günden uzun tutma yasak. Yerel çevrimdışı paket için uygun değil. | 2026-09-29 tarihli resmi terms: ücretsiz fair-use aylık 5M non-commercial / 1M commercial tile request; ücretli commercial tier ve anlaşma limitleri değişebilir. Kota müşteri anahtarları toplamına uygulanır. | Her haritada görünür `© OpenStreetMap contributors, © CARTO`; attribution bilgisi iki kaynağa link vermelidir. | **Offline pack'e dahil etmeyin.** Atlasia'nın mevcut aktif katmanı olduğu varsayılmamalıdır. |
| **OpenFreeMap public instance / OpenMapTiles** | Resmi OpenFreeMap ana sayfası offline indirmeye izin veriyor. | Tek indirme en çok **3,000 tile veya 50 MB**; en çok **4 paralel istek**; uygulamayı tanımlayan benzersiz User-Agent şartı. Daha büyük indirme için sağlayıcıyla iletişim. Public servis kapasitesine saygı gerekir. | Görünür `OpenFreeMap © OpenMapTiles Data from OpenStreetMap`. | Şartlar bu tarihte resmi sayfada doğrulandı. Her saha paketi iki tavanı da aşmamalı. |
| **Google Fonts / self-host edilen font dosyaları** | Google Fonts FAQ self-host etmeye izin verildiğini belirtiyor; izin, kullanılan fontun kendi lisans şartlarına tabidir. Google webfont API'sinden uzaktaki fontu çekmek çevrimdışı ilk yüklemeyi garanti etmez. | Google Fonts self-host font dosyaları için tile benzeri bir istek kotası belirtilmiyor. Üçüncü taraf/ücretli fontların kendi lisansı ayrıca kontrol edilir. | Her font ailesinin kendi lisans dosyası ve telif/attribution bildirimleri korunmalı. Google Fonts ailelerinin çoğu OFL; bazılarında Apache veya Ubuntu Font License. | **Her font ailesi tek tek kontrol edilmeli.** Ürün içi mevcut fontların bütün lisansları bu notta doğrulanmadı. |
| **AWS Terrain Tiles (Atlasia DEM)** | Bu uygulama kaynakta raster-DEM endpoint'ini kullanıyor. S3 endpoint'inin Atlasia tarafından bbox/zoom bazında paketlenmesi için açık offline yetkisi bu kontrolde doğrulanmadı. | Servis kotası/ücret koşulu bu denetimde doğrulanmadı. | MapLibre style'da mevcut atıf `Terrain data: AWS Terrain Tiles`; ek/kesin atıf şartları doğrulanmadı. | **Doğrulanmadı;** sağlayıcı şartları teyit edilene kadar offline pack'e ekleme kararı verilmemeli. |

## Resmî kaynaklar

- Esri ArcGIS Online terms of use: https://doc.arcgis.com/en/arcgis-online/reference/terms-of-use.htm
- Esri item-level access/use constraints: https://doc.arcgis.com/en/arcgis-online/reference/access-use-constraints.htm
- Esri take web maps offline (offline-enabled layers, export settings): https://doc.arcgis.com/en/arcgis-online/manage-data/take-maps-offline.htm
- Esri basemap attribution: https://support.esri.com/en-us/knowledge-base/what-is-the-correct-way-to-cite-an-arcgis-online-basema-000012040
- CARTO Basemaps Terms (2026-09-29 version shown on official page): https://carto.com/legal/basemap-terms/
- CARTO attribution instructions: https://carto.com/attribution/
- OpenFreeMap official usage/attribution/offline limits: https://openfreemap.org/
- OpenStreetMap Foundation standard tile-server ban on prefetch/offline usage: https://operations.osmfoundation.org/policies/tiles/ (uygulama doğrudan OSM tile.openstreetmap.org kullanmamalıdır)
- Google Fonts FAQ (self-hosting and font licenses): https://developers.google.com/fonts/faq
- Google Fonts official repository (per-family licensing): https://github.com/google/fonts
- Google Fonts self-hosting guide: https://fonts.google.com/knowledge/using_type/self_hosting_web_fonts

## Uygulama kararı

Varsayılan karar: Esri ve CARTO karoları Atlasia offline saha paketine dahil edilmez; OpenFreeMap yalnız resmi per-download tile/byte/concurrency tavanları ve görünür atıf korunarak kullanılabilir; DEM kaynağının çevrimdışı hakkı **doğrulanmadı**, teyit olmadan paketlenmez. Font dosyaları ancak kendi lisans metinleri birlikte taşınarak self-host edilir.

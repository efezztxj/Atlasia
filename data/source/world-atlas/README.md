# Dünya ülke sınırları — kaynak verisi

- **Dosya:** `countries-110m.topojson.json`
- **Paket:** `world-atlas@2.0.2` (npm), dosya `countries-110m.json` olarak alındı ve adı değiştirildi; içeriğe dokunulmadı.
- **Üst kaynak:** Natural Earth 4.1.0, Admin 0 ülke sınırları, 1:110m ölçek. Ülke ve kıta verisinin kamu malı (public domain) olduğu naturalearthdata.com Terms of Use sayfasında belirtilir; atıf zorunlu değildir.
- **Paket lisansı:** ISC (bkz. `LICENSE`, Copyright 2013-2019 Michael Bostock). Yeniden dağıtım için ISC izin verir.
- **Bilinen sınır:** Bu veri "Natural Earth" kapsamında genelleştirilmiştir; hukuki sınır doğruluğu için değildir. Tartışmalı sınırlar Natural Earth'ün kendi sınıflandırmasını izler (ör. "N. Cyprus", "Somaliland", "Kosovo" ayrı poligonlar, ISO numarası yok).
- **Dönüşüm:** `node scripts/build-countries-geojson.mjs data/source/world-atlas/countries-110m.topojson.json public/data/countries-110m.geojson`

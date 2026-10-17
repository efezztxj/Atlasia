# UI-1 / PKG-0 raporu

- Durum: tamamlandı; PKG-0 dışındaki paketlere geçilmedi.
- Dal: `arena/e23e5bd7-atlasia`; PKG-0 commit öncesi HEAD `a1151c7c646bca3cdadd5a8bc1271a892f1b556d`.
- Geçmiş: `git fetch --deepen=200 origin` sonrası `git merge-base --is-ancestor a1151c7 origin/main` → `ATA VAR`.
- Taban: `origin/main` d8872d01256f4fac250b21743e00e2d46eebebc2; dal değiştirilmedi.

## Değişiklikler
- `src/index.css`: PKG-0 için +4 / -1 satır; yalnız mobil görünürlük seçicisi ve açıklaması değiştirildi.
- `RAPOR.md`: +30 / -0 satır (yeni rapor dosyası).
- Önceden kirli olan `src/index.css` içindeki 15 parola-gücü CSS satırı korunup commit dışında bırakıldı.
- PKG-4: taban dışı, atlandı.

## Kapılar
- `npm ci`: PASS (npm audit bir düşük önem dereceli bulgu bildirdi; audit fix çalıştırılmadı).
- `npm run typecheck`: PASS (0 hata).
- `npm run lint`: PASS (0 uyarı/hata).
- `npm run test:run`: PASS — 24 dosya / 113 test.
- `npm run build`: PASS; Vite büyük chunk uyarısı verdi.

## PKG-0 kabul ölçütleri
- Anchor tam 1 kez bulundu ve değiştirildi; `git diff src/index.css | grep -c "nth-of-type(3)"` → 1: ✅
- `npm run build` çıkış kodu 0: ✅
- Görsel mobil kontrol ayrıca yapılmadı; bu paketin komut tabanlı kabul ölçütleri geçti.
- VARSAYIM: Yok.

## SHA-256 ve commit
- PKG-0 staged `src/index.css` blob SHA-256: `dce46c08678b41fa87ffb3a6e58d41f8beda2a3dba85350eff07250fe268aa29`.
- Çalışma ağacındaki `src/index.css` SHA-256: `2e2724afa81af0b9a53ea1075a56b1bf55ed440abcf7b7f8f92c0e16d1fd129b` (korunan, commit dışı 15 satırı da içerir).
- PKG-0 commit: `feat(ui1): PKG-0 — mobile map controls visibility fix`; SHA `d48c954e24370ce7ed68960795a9b28801360464`.

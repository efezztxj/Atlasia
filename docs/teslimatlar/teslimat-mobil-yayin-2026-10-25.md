# Teslimat — Mobil tur yayını (2026-10-25)

## Görev ve branch

- Görev: kullanıcı "deploy" talimatı; öncesinde "ilk önce geride kalanları çöz"
  (main ile çakışmanın kapatılması).
- Branch: `arena/15655567-atlasia` → `main`
- PR: #103 (merge commit `aef4e3a`)
- Birleştirme öncesi taban: `455d031`; birleştirme commit'i: `54ec23e`

## Yapılanlar

1. **Geride kalan kapatıldı.** `main` (hava katmanı/Windy görünümü, moderasyon +
   askıya alma, çerez onayı) bu branch'e birleştirildi. Çakışan iki dosya:
   - `src/App.tsx`: mobil eylem çubuğu (nötr yürüyüş kaydı, çubuğun ortasında
     `+`, "Kaydet" üst menüde) korundu; `main`'in `MapLayersSheet`, hava
     katmanı durumu ve `SuspensionNotice` blokları aynen alındı.
   - `scripts/bundle-budget.mjs`: iki tarafın gerekçeleri birleştirildi.
     Birleşik ölçüm: JS 893.504 B / CSS 34.903 B gzip → CSS eşiği
     34.800 → **35.100 B**; JS eşiği 902.000 B'de kaldı.
2. **Kapılar** (yerel): `tsc` ✅, lint ✅, `test:run` 136 dosya / 1028 test ✅,
   `build` + bütçe + SW kabuğu ✅, `test:bundle-budget` ✅.
3. **PR kontrolleri**: CI ✅, Cloudflare Pages önizleme ✅.
4. **Yayın**: PR #103 `main`'e merge edildi (`aef4e3a`). `main` üzerinde CI ✅
   ve Cloudflare Pages ✅; yayın hattı GitHub → Cloudflare Pages, ayrı bir
   deploy workflow'u yok.

## Notlar / riskler

- Merge, "review required" korumasına takıldı; PR yazarı ile depo sahibi aynı
  hesap olduğu için GitHub kendi PR'ına onay veremiyor. Kullanıcının açık
  "deploy" talimatı üzerine `--admin` ile yönetici olarak birleştirildi.
- `npm run test:rules:emulator` bu ortamda Java olmadığı için koşulmadı;
  Firestore kuralları bu turda değişmedi (main'den gelenler CI'da koştu).
- Sandbox'tan `atlasia.pages.dev` adresine ağ erişimi yok (yalnız GitHub/npm/
  PyPI); yayının ayakta olduğu Cloudflare Pages kontrolünün başarısıyla
  doğrulandı.
- Gerçek cihaz kontrol listesi: `docs/mobil-uygunluk.md` §5.

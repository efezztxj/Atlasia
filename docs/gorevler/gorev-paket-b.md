# GÖREV PAKET B — Küçük işler paketi (Agent-2)

Üç küçük iş, tek teslimat. Hepsi bağımsız, sırayla yap.

## B1 · Sokak/topo çakışan etiket testi (bilinen borç)
ROADMAP §9'da "Sokak/topoda çakışan etiket riski | doğrulanmadı" diye açık borç var.
- Hedef kod: `src/utils/geo.ts` (`toSearchResult`, `reverseName`, `label` üretimi).
- Risk: aynı bölge/yer iki farklı isimle etiketlenebilir (ör. "Kordon" hem semt hem sokak).
- Yapılacak: `src/utils/geo.test.ts`'e (veya yeni `tests/` altında) bu riski kapatan testler:
  - normalize/alias eşleşmesi iki farklı label'ı çakıştırmıyor mu,
  - aynı koordinat için `reverseName` ile `toSearchResult` label'ı tutarlı mı,
  - kritik: aynı isimli iki SearchResult üretilirse (varsa) hangi alanın öncelendiği kanıtlanır.
- Testin öncesinde davranışı gözle: gerçekten çakışma varsa TEST YAZMA, önce düzelt
  (tek iş tek commit: `fix: ...` + sonra `test: ...`). Çakışma yoksa testler "dokunulmadı" kanıtı olsun.

## B2 · Feed/pagination son kontrol
Adım 1.7 "Feed'de limit() yok" borcu kapandı sayıldı ama kanıt taze değil.
- `src/lib/firestoreData.ts` + çağıran yerlerde HER liste sorgusunda `limit(...)` var mı tara.
- Eksik limit varsa ekle (ücretsiz katman koruması). Sayfalama (cursor) davranışı testlerle kanıtla.
- Performans notu: ilk açılışta gereksiz sorgu/indirme var mı — varsa düzelt, yoksa teslimatta
  "kontrol edildi, temiz" de + kanıt.

## D · Evrak güncellemesi
- `ROADMAP.md` başlık durumu: "Adım 0 bekliyor · 5 karar onay bekliyor (⛔)" satırı ARTIK YANLIŞ.
  Yerine: "Adım 0–16 tamamlandı (2026-10-20, main `fb2927a`) · 7 karar (a–g) sonuçlandı".
- `ROADMAP.md` §10'a yeni satır: 2026-10-20 | v3 | ana yol tamamlandı.
- `CHANGELOG.md` başına yeni sürüm bloğu (repo stiline uy): ana yol P1–P4 özeti + bu paket.

## ORTAK DOSYA KURALI (zorunlu)
- Dokunduğun HER ortak dosyanın (`ROADMAP.md`, `CHANGELOG.md`, `geo.ts`, `geo.test.ts` vb.)
  **TAMAMINI** teslim et; parça diff gönderme. Hangi ortak dosyalara dokunduğunu teslimatta listele.

## Kısıtlar
- Ücretsiz katman. Kod içi Türkçe yorumlar ASCII-Türkçe. `check:local` kapıları yeşil.
- `firestore.rules` ve testlerine DOKUNMA (yeni merge edildi; ayrı iş).

## Teslim
- `teslimat-b.md`: B1/B2/D için ayrı ayrı — ne buldun, ne yaptın, komut kanıtları.
- Conventional commit'ler; kendi branch'inde çalış, push et.

## Kabul kriterleri
- B1: çakışma riski testlerle kapalı (veya düzeltildi + test).
- B2: tüm liste sorguları limit'li, kanıtlı.
- D: ROADMAP/CHANGELOG güncel ve tutarlı.
- Tüm kapılar yeşil: tsc · lint · test · build.

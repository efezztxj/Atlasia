# Teslimat — Depo düzeni ve dal temizliği (2026-10-23)

- **Görev:** "GitHub reposu dağınık mı?" sorusu üzerine depo düzeni.
- **Branch:** `arena/c8fca047-atlasia` · **PR:** #86 · **Taban:** `main` (`3038344`)
- **Teslim commit'i:** bu dosyayı içeren commit.

## Yapılanlar

1. Kökteki 21 `teslimat-*.md` notu `docs/teslimatlar/` altına taşındı; kökte
   yalnız `README/AGENTS/CONTRIBUTING/ROADMAP/CHANGELOG/SECURITY/AUTH_SETUP`
   kaldı. Dosya **içeriklerine dokunulmadı** (saf taşıma).
2. `docs/README.md` eklendi: hangi klasörde ne var, yeni not nereye yazılır.
3. `reports/` ve `patches/` **bilinçli olarak taşınmadı**: kendi içlerinde
   `reports/stage-*.md` → `patches/main/...` ve checksum ifadeleriyle birbirine
   bağlılar; taşıma belgeleri yanlış gösterirdi. `docs/README.md` içinde "arşiv"
   olarak işaretlendi.
4. **Dal temizliği:** 74 dal → 16. PR'ı merge olmuş 42 dal, PR kaydı olmayan ve
   2 günden eski 13 dal silindi. Açık PR'ı olan dallar, `main` ve bu dal korundu.
   Bugün oluşturulmuş, PR'ı olmayan `arena/b690d97b-atlasia` yanlışlıkla silindi ve
   **aynı SHA ile geri getirildi** (`198e587`).

## Dokunulmayanlar

- `firestore.rules`, Firebase yapılandırması, SW, veri katmanı.
- Diğer agentların açık PR dalları (8 adet) ve 5 Dependabot dalı.
- Repo açıklaması/konu etiketleri: entegrasyonun token'ı `PATCH /repos` için
  403 döndü (yönetici yetkisi yok). Kod tarafından yapılabilecek bir şey yok;
  GitHub arayüzünden elle girilmeli.

## Kapılar

`npm ci` ✅ · `typecheck` ✅ · `lint` ✅ · `test:run` 123 dosya / 925 test ✅ ·
`build` + bundle bütçesi ✅ (entry 172.491 B / 174.000 B) · `test:scripts` ✅ ·
`verify:social-metadata` ✅ · `verify:sw-shell` ✅ 25/25 ·
`test:rules:emulator` ⛔ (sandbox'ta Java yok, Rules değişmedi).

## Açık işler

- PR #78 (mobil sadeleştirme) bu dal birleşmeden önce açılmıştı; güncel `main`
  üzerine taşınması gerekiyor.
- Mobil katman menüsü ve üç kademeli keşif sayfası `main`in yeni yığını üzerinde
  yeniden yazılmalı (`docs/mobil-denetim-2026-10-23.md` → Revizyon).
- 5 Dependabot PR'ının CI'ı kırmızı; tek tek bakılmalı (major sürüm atlamaları:
  firebase 13, maplibre 6.15, React grubu).

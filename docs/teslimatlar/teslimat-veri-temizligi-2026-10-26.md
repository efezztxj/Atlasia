# Teslimat: Süresi Dolan Verilerin ve Yetim Kayıtların Fiziksel Temizliği (2026-10-26)

## 1. Görev ve Dal Özeti
- **Görev:** Sunucu yol haritası Madde 4 (*Süresi dolan verilerin fiziksel temizliği ve veri saklama politikası*).
- **Not (Madde 3 Çakışma Koruması):** Moderasyon genişletmesi aynı anda açık ve yeşil olan **PR #106** (`arena/e839d2c1-atlasia`) üzerinde sahiplenildiği için `AGENTS.md` kuralı gereği o dosyalara paralel dokunulmadı; sıfır çakışmayla doğrudan Madde 4 tamamlandı.
- **Dal (branch):** `arena/678fbe13-atlasia`
- **Taban commit (`main`):** `1287387079fc8f9264083c44504c4a57538a955c` (PR #105 birleşimi sonrası güncel `main`)

## 2. Değişen ve Eklenen Dosyalar
- `scripts/firestore-cleanup.mjs` — `firestore.rules` gevşetilmeden, varsayılan `--dry-run` modunda çalışan, `atlasia-dev` ve `<25` saat canlı hikâye silimini reddeden, kalıcı koleksiyonları (`places`, `posts`, `routes`, `tracks`, `userProfiles`, `friendships`, `moderators`, `bans`, `reports`, `verifications`, `blocks`) sert kilitle koruyan, Spark okuma (`--max-reads 5000`) ve silme (`--max-deletes 2000`) kotalı fiziksel temizlik aracı.
- `scripts/firestore-cleanup.node-test.mjs` — Saklama eşikleri, canlı hikâye koruması, bozuk zaman damgası fail-safe davranışı, yetim alt koleksiyon tespiti, dry-run/apply ayrımı ve token sızdırmama birim testleri.
- `scripts/verify-env.node-test.mjs` — Yeni temizlik testlerinin CI `npm run test:scripts` adımında otomatik koşması için bağlantı.
- `docs/veri-saklama-ve-temizlik.md` — Koleksiyon bazlı saklama süreleri ve 3 adımlı güvenli temizlik prosedürü.
- `docs/teslimatlar/teslimat-veri-temizligi-2026-10-26.md` — Bu teslimat kaydı.

## 3. Kilitli Dosya ve Çakışma Kontrolü
- `firestore.rules`, `src/**`, `MapView.tsx`, `package.json` ve açık **PR #106** / **PR #93** içindeki hiçbir dosyaya dokunulmadı (`0` çakışma, `0 B` istemci bundle etkisi).

## 4. Bilinen Riskler
- Fiziksel silme geri alınamaz olduğu için araç varsayılan olarak **yalnız önizleme (`DRY-RUN`)** yapar; `--apply` öncesi `scripts/firestore-backup.mjs` ile güncel yedek alınması zorunlu prosedür olarak belgelendi.

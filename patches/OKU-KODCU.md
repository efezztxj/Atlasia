# KOD-02 v3r3 teslim yaması (Kodcu için)

Bu klasör yalnızca teslim artifact'ı içerir; uygulama kodu DEĞİŞMEZ.

- `kod02-v3r3-1ef3dc2.patch` — 795 satır / 27.386 bayt
  sha256: eba371fa836563f9a25a4cdcb6d586183c8de827d69d1989b81052afdcac370a
- `kod02.b64.txt` — aynı yamanın base64(gzip) kapsülü; 137 satır / 10.497 bayt
  sha256: 12af1ece0a1e8bf8856aaa87016be5365755eda12dd66b3b747b3797a5dfda09

Taban commit: 1ef3dc2240f1e41ffdcf55372e3ea2e1cf6fdce2 (refs/heads/preview/chain-20261014)

Kullanım (Kodcu):
  git fetch origin arena/395b339a-atlasia
  git show FETCH_HEAD:patches/kod02-v3r3-1ef3dc2.patch > /tmp/kod02-v3r3-1ef3dc2.patch
  sha256sum /tmp/kod02-v3r3-1ef3dc2.patch   # eba371fa...370a olmalı

Kurallar: kirli ağaca (127 yol) DOKUNMA; ayrı worktree kullan; commit/push/merge/deploy YOK;
bir değer tutmazsa DUR + rapor.

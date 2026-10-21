# Çalışma Kuralları — P Serisi

> Bu belge P serisi ajanları için kalıcı çalışma kuralıdır. AGENTS.md ve ROADMAP §4'ü tamamlar.

## Oturum ve dal

- Her ajan **ayrı oturum** ve **ayrı dal** (`arena/<id>-atlasia`) kullanır. Aynı klasörü iki ajan paylaşmaz.
- Dal adı rastgele suffix içerir; eski 0a96a86 tabanlı dallardan dosya kopyalanmaz. Gerekirse `git show <ref>:<dosya>` ile okunur ve `origin/main` tabanına uyarlanır.
- İş bitince **commit edilir, push edilir, PR açılır**. Push edilmeyen iş kaybolur — eski "commit/push yapma" talimatı geçersizdir. Merge ve `firebase deploy` kullanıcı onayıyla yapılır.

## Dosya sahipliği

- `AGENTS.md` ve `ROADMAP §4` dokunma listesi geçerlidir. Tasarım/yerleşim değişikliği yok: koyu tema siyah, açık tema gerçek beyaz.
- `firestore.rules` gevşetilmez; sıkılaştırma yalnız emulator testiyle.
- İzin verilmeyen dosyaya dokunma; gerekirse teslimatta "dosya talebi" yaz.

## Push disiplini

- Aynı klasör paylaşılmaz — her ajan kendi sandbox'ında çalışır.
- Commit etmeden önce `git status --short` kontrol edilir, yalnız görev dosya listesi commit'e girer.
- PR başlığı `[P?] <görev>` biçiminde, gövdede teslimat dosya yolu yer alır.

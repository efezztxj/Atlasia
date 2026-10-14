# Agent Relay — tek yerden yaz, iki agent sırayla çalışsın

Kanka senin istediğin şey tam olarak bu: **tek bir kutuya isteğini yazıyorsun**, sistem isteği
sırayla agent'ların kendi yazı kutusuna kendisi yazıp gönderiyor, birinin işi bitince
diğerinin sırası geliyor ve **sen baştan sona izleyip istediğin an müdahale ediyorsun**.

Ne yapar:
- Kuyruk: birden fazla istek yazarsın, tek tek işlenir.
- Sıra: `Agent 1 → Agent 2` (`turns` ile istediğin kadar uzatabilirsin: A→B→A→B…).
- Devir teslim: 1. agent bitince çıktısı otomatik olarak 2. agent'ın prompt'una gömülür
  (isteğin + "önceki ajan şunu yaptı, doğrula/düzelt" talimatı).
- Kontrol: duraklat / devam / bu sırayı atla / **devral** (ben yapıyorum, relay bekle) / durdur /
  yeniden dene / devirde onay.
- Canlı ekran: agent'ın yazı kutusuna harf harf yazılan metni ve gelen cevabı panelde canlı görürsün.

---

## 1. Demo (10 saniye)

Repo kökünde:

```bash
cd tools/agent-relay
node server.mjs
```

Panel: <http://localhost:8787>

Şu an iki agent da **demo modunda** (sahte ama gerçekçi cevaplar üretir). Bu modda akışın
tamamını görebilirsin: istek yaz → Agent 1 yazar → biter → devir onayı → Agent 2 yazar → biter.
Hiçbir şeyi bozmaz, kurulum gerektirmez.

Komut satırından da kullanılır:

```bash
node bin/relay.mjs send "harita ekranında ölçek çubuğu ekle"   # gönder + bitmesini bekle
node bin/relay.mjs add  "başka bir istek"                       # sadece kuyruğa ekle
node bin/relay.mjs status                                       # kuyruk + ajan sağlığı
node bin/relay.mjs ctl <jobId> pause|resume|skip|takeover|approve|stop
```

---

## 2. Gerçek agent'a bağlama

Panelde **⚙ bağla** butonu var. Üç mod:

| Mod | Ne yapar | Ne zaman kullan |
|---|---|---|
| `mock` | Simülasyon | Deneme, panel testi |
| `cdp` | **Tarayıcı sekmesi**: yazı kutusunu bulur, gerçekten yazar, Enter'a basar, cevabı okur | Agent'lar tarayıcı sekmesinde çalışıyorsa (web chat arayüzleri) |
| `os` | **Masaüstü penceresi**: panoya kopyalar, pencereyi öne alır, yapıştırır, Enter'a basar | Agent'lar masaüstü uygulamasında çalışıyorsa |

### A) Tarayıcı sekmesi (önerilen)

1. Chrome/Edge/Brave'i hata ayıklama portuyla aç (normal tarayıcını kapatmana gerek yok):

   ```bash
   # macOS
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-relay"

   # Windows (PowerShell)
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\.chrome-relay"

   # Linux
   google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-relay"
   ```

2. Bu pencerede agent'ların **iki ayrı sekmesini** aç.
3. Panelde ⚙ → mod: *Tarayıcı sekmesi* → **Sekmeleri getir** → hangi sekme hangi agent, seç → Kaydet.
4. Gerekirse gelişmiş seçiciler: yazı kutusu, cevap alanı, "yükleniyor" göstergesi.

Notlar:
- Aynı başlıkta birden fazla sekme varsa "sekmeleri getir" listesinden doğru olanı seç —
  seçim sekme kimliğiyle kaydedilir.
- Cevap okunamazsa relay bunu dürüstçe söyler (`cevap yakalanamadı`) ve devirde senden onay ister.
- Bu mod sekmeyi **gerçekten** kullanır: siz o sekmede yazarken relay yazmaya kalkarsa
  çakışır, o yüzden relay yazarken o sekmeye dokunma.

### B) Masaüstü penceresi

1. Panelde ⚙ → mod: *Masaüstü penceresi* → pencere adının bir parçasını yaz (örn. `Claude`) → Kaydet.
2. Relay metni panoya koyar, pencereyi öne alır, yapıştırır ve Enter'a basar.

Gerekli araçlar:
- macOS: yok (Erişilebilirlik izni gerekir: Sistem Ayarları → Gizlilik → Erişilebilirlik)
- Windows: yok
- Linux/X11: `xdotool` + `xclip` · Wayland: `ydotool` + `wl-clipboard`

Bu modda cevap otomatik okunamaz. Relay her devirde onay bekler; panelde
**📋 Panodan cevabı al** ile cevabı agent'tan kopyalayıp devir notuna koyabilir ya da elle yazabilirsin.

---

## 3. Panel

- **Kuyruk**: her istek bir kart. Karttan: duraklat / devam / atla / devral / durdur / yeniden dene.
- **Devir onayı**: sıradaki ajana gidecek metni görür, gerekirse **düzenler**, sonra gönderirsin.
  Üstteki *"Devirde onay"* kapalıysa iş tam otomatik ilerler (en az yorucu mod).
- **Şu an**: aktif işin adım adım durumu, agent'ın yazdığı metin ve gelen cevap.
- **Canlı ekran**: her agent için ayrı kutu, adapter tipi (demo/tarayıcı/pencere) ve sağlık durumu.
- **Günlük**: ne olduysa zaman damgasıyla.

`1 tur (A→B)` / `2 tur (A→B→A→B)` seçicisiyle tek istekte kaç tur dönüleceğini belirlersin.

---

## 4. Ayar dosyası

`relay.config.json` (ya da `RELAY_CONFIG=/yol/dosya.json`):

| Alan | Anlamı |
|---|---|
| `port` / `host` | Panel adresi (varsayılan 8787) |
| `turns` | Sıra: `["builder","reviewer"]`, istediğin kadar uzatılabilir |
| `requireApproval` | `true`: her devirde onay ister · `false`: tam otomatik |
| `handoffNeedsOutput` | Cevap yakalanamadıysa devirde mutlaka onay ister |
| `prompts.build` / `prompts.handoff` | Prompt şablonları: `{{request}}`, `{{agent}}`, `{{prevAgent}}`, `{{output}}`, `{{turn}}` |
| `typing.chunk` / `typing.delayMs` | Yazma temposu |
| `agents[].adapter` | `mock` / `cdp` / `os` |
| `agents[].cdp` | `endpoint`, `match`, `input`, `reply`, `busy`, `submit`, `send`, `idleMs`, `timeoutMs` |
| `agents[].os` | `window`, `submit` |

Hazır örnekler: `examples/browser-tabs.json`, `examples/desktop-windows.json`

---

## 5. Dürüst sınırlar

- **Tarayıcı/panel arayüzü değişirse seçiciler kayabilir.** Yanlış yazma riskine karşı relay,
  göndermeden önce yazı kutusunun içeriğini doğrular; tutmuyorsa göndermez, hata verir.
- **`os` modunda cevap okunamaz** — bu yüzden varsayılan olarak onaylı çalışır.
- **Aynı sekmeye/pencereye elle müdahale** ederken relay yazıyorsa çakışabilir: önce *Duraklat*.
- Panel ve motor **senin makinende** çalışır; dışarıya veri göndermez. Ama `host: 0.0.0.0`
  olduğu için aynı ağdaki makinelerden erişilebilir — ortak Wi-Fi'deysen `host`'u `127.0.0.1` yap.
- `--remote-debugging-port` açık bir tarayıcı, o portu bulabilen her yerel programa kontrol verir.
  Ayrı bir profil klasörü (`--user-data-dir`) kullanmak daha güvenli.

## 6. Geliştirme

```
tools/agent-relay/
├── server.mjs              HTTP + SSE + statik panel
├── bin/relay.mjs           CLI (up / send / add / status / watch / ctl / health)
├── lib/orchestrator.mjs    kuyruk + sıra + devir + onay mantığı
├── lib/store.mjs           durum deposu (data/state.json, oturumlar arası kalıcı)
├── lib/adapters/{mock,cdp,os}.mjs
├── public/                 panel (bağımlılıksız, sıfır npm paketi)
└── examples/               hazır ayar örnekleri
```

Bağımlılık yok — Node 22+ yeterli (`node --version`).

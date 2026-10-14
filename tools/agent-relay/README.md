# Agent Relay — tek yerden yaz, ekibin sırayla çalışsın

Kanka senin istediğin şey tam olarak bu: **tek bir kutuya isteğini yazıyorsun**, sistem isteği
sırayla agent'ların kendi yazı kutusuna kendisi yazıp gönderiyor. Birinin işi bitince diğerinin
sırası geliyor ve **sen baştan sona izleyip istediğin an müdahale ediyorsun**.

Klasik kurulum: **bir kodcu** (işi yapan, projeyi/durumu en iyi bilen) + **bir sert denetçi**
(sadece hata, eksik ve kanıtsız iddia arayan). Kodcu yapar → denetçi kırar → kodcu düzeltir →
denetçi onaylayana kadar döner.

---

## 0. Hızlı kurulum (kendi bilgisayarında)

**En kolay: derlenmiş program (exe) — Node bile gerekmez**

1. GitHub → **Releases** sayfası → `agent-relay-v0.1.0` → platformuna uygun dosyayı indir:
   - Windows: `agent-relay-win-x64.exe` → **çift tıkla**
   - macOS: `agent-relay-macos` → `chmod +x agent-relay-macos && ./agent-relay-macos`
   - Linux: `agent-relay-linux-x64` → `chmod +x agent-relay-linux-x64 && ./agent-relay-linux-x64`
2. Program çalıştığı klasörde `relay.config.json` ve `data/` oluşturur — taşınabilir (portable), kurulum yazmaz.
3. Panel tarayıcıda açılır: <http://localhost:8787>

> İlk açılışta işletim sistemi uyarır (program imzasız): Windows'ta **Ek bilgi → Yine de çalıştır**,
> macOS'ta **sağ tık → Aç**. Bu normaldir; kod açık, ağa hiçbir şey göndermiyor.

Nerede bulurum / nasıl üretirim:
- **Releases** (hazır dosyalar): `https://github.com/efezztxj/Atlasia/releases`
- **Kendim üreteyim**: `cd tools/agent-relay && npm install && npm run build:win` (macOS: `build:mac`, Linux: `build:linux`)
- **GitHub kendi üretsin**: Actions → *Agent Relay derleme (exe)* → **Run workflow** (veya `agent-relay-v*` etiketi push'la) → dosyalar hem artifact hem Release'e düşer.

**Alternatif: Node'lu yol (exe istemiyorsan)**

```bash
git clone https://github.com/efezztxj/Atlasia.git
cd Atlasia/tools/agent-relay
node bin/relay.mjs up        # (eski kısayol: node server.mjs)
```

Çift tıkla başlatmak istersen: `start-windows.bat` · `start-mac.command` · `start-linux.sh`
Node hiç yoksa ve kurmak istemiyorsan: `run-windows.bat` / `run-mac-linux.sh` — bunlar taşınabilir
Node'u otomatik indirir (~30 MB, bir kerelik) ve paneli açar.

Gereksinim (yalnızca Node'lu yolda): **Node.js 22+** ([nodejs.org](https://nodejs.org) → LTS). Kontrol: `node -v`.

Nerede çalışır: **senin makinende**. Panel ve motor tamamen yereldir, dışarıya veri gitmez,
API anahtarı istemez. Agent'lar kendi tarayıcı sekmelerinde/pencerelerinde açık olmalıdır —
bu yüzden uzak bir sunucuda değil, agent'ların çalıştığı bilgisayarda çalıştır.

**Ana beyin kim?** Relay'in içinde AI yok; o sadece kuyruk + sıra + aktarım yapar (orkestra şefi).
"Düşünen" taraf, bağladığın agent'ların kendisi. Detay: [§9 Roller ve beyin](#9-roller-ve-beyin-kim-nerede).

---

## 1. Roller

Her ajanın bir rolü var, prompt'u rolüne göre kurulur:

| Rol | Ne alır | Ne ister |
|---|---|---|
| `implementer` (Kodcu) | İstek + **proje bağlamı** + (varsa) denetçi raporu | "Uygula, varsayım yapma, DEVİR NOTU bırak" / sonra "denetçinin maddelerini tek tek ele al: ya düzelt ya gerekçelendir" |
| `reviewer` (Denetçi) | İstek + önceki ajanın çıktısı | "Sert denetle: iddiaları kanıtla karşılaştır, her sorun için NE·NEREDE·NEDEN·ÖNERİ, sonunda KARAR: ONAYLIYORUM / DÜZELTME GEREKİYOR" |
| `custom` (Özel) | Devir şablonu | Kendi şablonunu `prompts.handoff` içinde yazarsın |

**Proje bağlamı** (`context`): her prompt'un başına eklenir. "Kod yazan her şeyi biliyor" kısmı
bu alanla sağlanır — proje, stack, klasörler, dokunulmaz dosyalar, mevcut durum…

**Durdurma kalıbı** (`stopPattern`, denetçiye koy): denetçinin cevabı bu regex'e uyarsa kalan
turlar boşuna dönmez. Örn. `KARAR:\s*ONAYLIYORUM|SORUN YOK`.

---

## 2. Kaç ajan, hangi sıra?

- **İstediğin kadar ajan ekleyebilirsin** (panelde `+ Ajan ekle`, ya da `relay.config.json`).
  Silme ve sıralama (▲▼) da panelden.
- Her istek için **kimlerin çalışacağını sen seçersin**: istek kutusunun altındaki ajan
  çipleri (tıklayarak aç/kapat).
- **Tur seçimi**:
  - `1 tur` → seçili ajanlar birer kez
  - `2 tur` → seçili ajanlar ikişer kez
  - `Denetim döngüsü` → **yap → denetle → düzelt → doğrula** (ilk iki ajan), denetçi onay verirse erken biter
- Gönderirken tam sıra önizlemesi görünür: `Kodcu → Denetçi → Kodcu → Denetçi`.
- Pratikte 2–4 ajan en verimlisi: kodcu + denetçi, gerekirse "testçi" ya da "güvenlik" uzmanı.
  4'ten fazlası her isteği çok uzatır (her tur ayrı bir bekleme ve daha çok token).

İstek `turns` alanıyla gönderilir, örn: `["coder","auditor","coder","auditor"]`.

---

## 3. Demo (10 saniye)

```bash
cd tools/agent-relay
node server.mjs
```

Panel: <http://localhost:8787> — iki ajan demo modunda, denetim döngüsünü baştan sona gösterir
(denetçi 2 sorun bulur, kodcu düzeltir, denetçi onaylar, döngü erken biter).

Komut satırı:

```bash
node bin/relay.mjs send "harita ekranındaki ölçek çubuğunu düzelt"   # gönder + bitmesini bekle
node bin/relay.mjs add  "başka bir istek"                            # kuyruğa ekle
node bin/relay.mjs status                                            # kuyruk + ajan sağlığı
node bin/relay.mjs ctl <jobId> pause|resume|skip|takeover|approve|stop
```

---

## 4. Gerçek agent'lara bağlama

Panelde ajanın **Düzenle**'sine bas. Üç mod:

| Mod | Ne yapar | Ne zaman |
|---|---|---|
| `mock` | Simülasyon | Deneme, panel testi |
| `cdp` | **Tarayıcı sekmesi**: yazı kutusuna gerçekten yazar, Enter'lar, cevabı okur | Ajanlar tarayıcı sekmesinde (web arayüzleri) |
| `os` | **Masaüstü penceresi**: panoya kopyalar, pencereyi öne alır, yapıştırır, Enter'lar | Ajanlar masaüstü uygulamasında |

### A) Tarayıcı sekmesi (önerilen)

1. Tarayıcıyı hata ayıklama portuyla aç:

   ```bash
   # macOS
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-relay"

   # Windows (PowerShell)
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\.chrome-relay"

   # Linux
   google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-relay"
   ```

2. Bu pencerede agent'ların **iki ayrı sekmesini** aç (örn. bir kodcu sekmesi, bir denetçi sekmesi).
3. Panelde ajanı düzenle → mod: *Tarayıcı sekmesi* → **Sekmeleri getir** → doğru sekmeyi seç → Kaydet.
4. Gerekirse gelişmiş seçiciler (yazı kutusu / cevap alanı / yükleniyor göstergesi).

Notlar:
- Aynı başlıkta birden fazla sekme varsa listeden doğru olanı seç; seçim sekme kimliğiyle kaydedilir.
- Cevap okunamazsa relay dürüstçe söyler (`cevap yakalanamadı`) ve devirde senden onay ister.
- Relay yazarken o sekmeye elle dokunma; önce **Duraklat**.

### B) Masaüstü penceresi

1. Ajanı düzenle → mod: *Masaüstü penceresi* → pencere adının bir parçası (örn. `Claude`) → Kaydet.
2. Gerekli araçlar: macOS'ta ekstra yok (Erişilebilirlik izni gerekir) · Windows'ta ekstra yok ·
   Linux/X11: `xdotool` + `xclip`, Wayland: `ydotool` + `wl-clipboard`.

Bu modda cevap otomatik okunamaz → relay her devirde onay ister; panelde
**📋 Panodan cevabı al** ile cevabı agent'tan kopyalayıp devir notuna koyabilirsin.

---

## 5. Panel

- **Kuyruk**: her istek bir kart; karttan duraklat / devam / atla / devral / durdur / yeniden dene.
- **Devir onayı**: sıradaki ajana gidecek metni görür, gerekirse **düzenler**, öyle gönderirsin.
  Üstteki *Devirde onay* kapalıysa iş tam otomatik ilerler.
- **Şu an**: aktif işin adım adım durumu, yazılan metin, gelen cevap, "✔ onay" işareti.
- **Ekip**: ajan kartları; rol + mod + sağlık durumu, yazdığı metin/cevabı canlı, Düzenle/▲/▼.
- **Günlük**: ne olduysa zaman damgasıyla.

---

## 6. Ayar dosyası (`relay.config.json`)

| Alan | Anlamı |
|---|---|
| `port` / `host` | Panel adresi (varsayılan 8787) |
| `turns` | Varsayılan sıra (panelden gelen `turns` bunu ezer) |
| `requireApproval` | `true`: her devirde onay · `false`: tam otomatik |
| `handoffNeedsOutput` | Cevap yakalanamadıysa devirde mutlaka onay ister |
| `prompts.build` / `handoff` / `review` / `reviewFirst` | Rol bazlı şablonlar: `{{request}} {{agent}} {{role}} {{prevAgent}} {{output}} {{turn}}` |
| `agents[].role` | `implementer` / `reviewer` / `custom` |
| `agents[].context` | Her prompt'un başına eklenen proje bağlamı |
| `agents[].stopPattern` | Cevapta bu regex çıkarsa kalan turlar atlanır |
| `agents[].cdp` / `os` | Bağlantı ayarları (`endpoint`, `match`, `input`, `reply`, `busy`, `submit`, `idleMs` / `window`) |

Hazır örnekler: `examples/browser-tabs.json`, `examples/desktop-windows.json`

---

## 9. Roller ve beyin: kim nerede

```
         sen (tek panel, tek yazı kutusu)
                    │
                    ▼
   ┌────────────────────────────────┐
   │  Agent Relay  (senin makinende)│   ← orkestra şefi: kuyruk, sıra,
   │  içinde AI YOK, sadece aktarır  │     devir teslim, onay, günlük
   └────────────────────────────────┘
        │ yazar                        │ yazar
        ▼                              ▼
   ┌──────────┐                   ┌──────────┐
   │ Agent 1  │  devir notu  →    │ Agent 2  │
   │ (kodcu)  │  otomatik geçer   │ (denetçi)│
   └──────────┘                   └──────────┘
     ↑ beyin burada: bağladığın sekme/pencere (Claude, ChatGPT, Gemini, Arena, Cursor…)
```

- **Relay = şef, beyin değil.** İçinde model yok, API anahtarı yok, karar vermez. Sadece
  "şimdi sıra Agent 2'de" der, metni yazar, cevabı okur, devreder. Bu yüzden aboneliği olmayan,
  tamamen yerel bir parça.
- **Beyin = bağladığın agent'lar.** Hangi sekmeye/pencerelere bağlarsan düşünen taraf onlar
  olur. Farklı markaları karıştırabilirsin (kodcu ChatGPT, denetçi Claude gibi) — relay için
  hepsi aynı tip "yazı kutusu".
- **Arena.ai (bu sohbet)** = atölye. Aracı burada yazdık, demoyu burada gördün. Sandbox'taki
  önizleme senin bilgisayarına erişemez; gerçek kullanım için yukarıdaki 3 adımı kendi
  makinende çalıştırmalısın.
- Arena sekmelerini de agent olarak bağlayabilirsin (tarayıcı sekmesi modu): o zaman "beyin"
  Arena'nın modelleri olur, koordinasyon yine senin makinendeki relay'de kalır.

---

## 10. Dürüst sınırlar

- **Arayüz değişirse seçiciler kayabilir.** Relay göndermeden önce yazı kutusunun içeriğini
  doğrular; tutmuyorsa göndermez, hata verir.
- **`os` modunda cevap okunamaz** — bu yüzden onaylı çalışır.
- **Denetçi gerçekten sert olur ancak sen söylersen**: `prompts.review` içindeki talimatı
  sertleştirip yumuşatabilirsin; "kanıt iste" kısmını silersen denetçi de yumuşar.
- Panel ve motor **senin makinende** çalışır; dışarıya veri göndermez. `host: 0.0.0.0` aynı
  ağdaki makinelere açıktır — ortak Wi-Fi'de `host`'u `127.0.0.1` yap.
- `--remote-debugging-port` açık tarayıcı, o portu bulan her yerel programa kontrol verir;
  ayrı profil (`--user-data-dir`) kullan.

## 8. Geliştirme

```
tools/agent-relay/
├── server.mjs              HTTP + SSE + statik panel + ajan CRUD
├── bin/relay.mjs           CLI (up / send / add / status / watch / ctl / health)
├── lib/orchestrator.mjs    kuyruk + sıra + roller + devir + onay + erken çıkış
├── lib/store.mjs           durum deposu (data/state.json, oturumlar arası kalıcı)
├── lib/adapters/{mock,cdp,os}.mjs
├── public/                 panel (bağımlılıksız)
└── examples/               hazır ayar örnekleri
```

Bağımlılık yok — Node 22+ yeterli.

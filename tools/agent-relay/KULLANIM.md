# Agent Relay — Kullanım Kılavuzu

Tek yere yazarsın, sırayla iki (ya da daha fazla) agent'a kendisi yazar; sen izleyip yönetirsin.
Bu kılavuz sıfırdan, sırayla ilerler. Takıldığın adımın başlığına atla.

---

## 1. Programı aç

**Windows (indirdiğin exe):**
1. `agent-relay-win-x64.exe` dosyasına **çift tıkla**.
2. Uyarı çıkarsa: **Ek bilgi → Yine de çalıştır** (program imzasız, normal).
3. Siyah bir komut penceresi açılır ve **açık kalmalı** — "Agent Relay → http://localhost:8787" yazar.
4. Tarayıcıda panel otomatik açılır. Açılmazsa elle `http://localhost:8787` yaz.

> Ne oluşur: exe'nin yanında `relay.config.json` (ayarlar) ve `data\` (kayıtlar) klasörü.
> Yazılamayan bir klasördeysen (Program Files gibi) bunlar `C:\Users\<sen>\.agent-relay` altına gider.

**Kapatmak:** komut penceresini kapat, yeter. (Panel kapanır, o an çalışan iş durur ve kaydedilir.)

---

## 2. İlk 5 dakika: demo modunda izle

Hiçbir şey bağlamadan deneyebilirsin; iki agent "demo" modunda gerçekçi cevaplar üretir.

1. Panelde **istek kutusuna** bir şey yaz. Örnek:
   `landing sayfasındaki giriş formunda boş şifre kontrolü yok, bul ve düzelt`
2. Altındaki **Kimler çalışsın** çiplerinden istediklerini seç (tıklayarak aç/kapat).
3. **Kaç tur** kutusundan birini seç:
   - `1 tur (her ajan bir kez)` → Kodcu → Denetçi
   - `2 tur (her ajan iki kez)` → Kodcu → Denetçi → Kodcu → Denetçi
   - `Denetim döngüsü: yap → denetle → düzelt → doğrula` → en çok kullandığın mod; denetçi onay verirse erken biter
4. Altındaki satır tam sırayı gösterir: `Sıra: Kodcu → Denetçi → Kodcu → Denetçi`
5. **Kuyruğa ekle** (ya da Ctrl+Enter).

İzleyeceğin yer:
- **Şu an**: aktif işin adımı — "yazdığı metin" (agent'a ne yazıldığı) ve "gelen cevap".
- **Ekip**: her agent için ayrı kutu; canlı yazım ve cevap burada.
- **Günlük**: kısa olay kaydı ("Denetçi → yazıyor", "onay verdi → kalan turlar atlandı" gibi).

Demo döngüsü şöyle biter: Kodcu yapar → Denetçi 2 sorun bulur → Kodcu düzeltir → Denetçi "KARAR: ONAYLIYORUM" der → iş biter.

---

## 3. Gerçek agent'ları bağla (asıl kullanım)

Agent'ları **tarayıcı sekmelerinde** ya da **masaüstü pencerelerinde** açık olarak çalıştıracaksın.

### 3.1 Tarayıcı sekmesi (önerilen)

1. Chrome'u hata ayıklama modunda aç (PowerShell'e yapıştır):
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\.chrome-relay"
   ```
   Günlük Chrome'un kapanmaz; bu, ayrı profilli yeni bir pencere açar.
2. Bu pencerede **agent sekmelerini aç**. Örnek:
   - 1. sekme: kod yazan agent (ChatGPT / Claude / Gemini / ne kullanıyorsan)
   - 2. sekme: denetçi (başka bir model olabilir — karışık kullanmak serbest)
3. Panelde **Agent 1 · Kodcu → Düzenle**:
   - **Nasıl çalışsın** = `Tarayıcı sekmesi`
   - **Sekmeleri getir** → listeden 1. sekmeyi seç
   - **Proje bağlamı** yaz (aşağıda §5'te örneği var)
   - **Kaydet**
4. Aynısını **Agent 2 · Denetçi** için yap ama **2. sekmeyi** seç.
5. Sekme listesinde aynı başlıkta birden fazla sekme varsa doğru olanı listeden seç (seçim sekme kimliğiyle kaydedilir).

> Relay sekmeye gerçekten yazar: yazı kutusunu bulur, metni yazar, Enter'a basar, cevabın bitmesini bekler ve son cevabı okur.
> Yazarken o sekmeye elle dokunma. Dokunacaksan önce **Duraklat**.

### 3.2 Masaüstü penceresi

1. Panelde agent → **Düzenle** → **Nasıl çalışsın** = `Masaüstü penceresi`
2. **Pencere adı** alanına pencerenin başlığından bir parça yaz (örn. `Claude`, `Cursor`).
3. Kaydet.

Bu modda relay: metni panoya koyar → pencereyi öne alır → yapıştırır → Enter'a basar.
Cevap otomatik okunamaz; bu yüzden relay her devirde senden onay ister (bkz. §6 "Panodan cevabı al").

---

## 4. Günlük kullanım akışı

```
1) İsteğini yaz                    → Kuyruğa ekle
2) Kimler çalışsın + kaç tur seç    → Sıra önizlemesini kontrol et
3) Agent 1 yazar/çalışır            → "Şu an"da canlı izle
4) Onay açıksa: gelen metni görüp    → "✔ Onayla ve gönder" (istersen metni düzenle)
   gerekirse düzelt → gönder
5) Agent 2 devralır (doğrula/düzelt) → denetçi onaylarsa döngü erken biter
6) Sonunda: kuyruk kartında çıktıları oku → "✔ onay" işaretini gör
```

**Kuyruk**: aynı anda birden fazla istek yazabilirsin; sırayla işlenir.
**Bitenleri temizle**: bitmiş işleri listeden temizler (kayıtlar `data\state.json`'da kalır).

### Devirde onay (üst sağdaki anahtar)
- **Açık** (varsayılan): her devirde durur, sıradaki agent'a gidecek metni gösterir → sen onaylarsın. En kontrollü mod.
- **Kapalı**: her şey otomatik akar; sen sadece sonucu okursun. En az yorucu mod.
- İş kartındaki "Devir onayı" kutusunda metni **düzenleyip** de gönderebilirsin ("✔ Bu metinle gönder").

---

## 5. Roller, bağlam ve durdurma kalıbı

Her agent'ın Düzenle penceresinde şu alanlar var:

| Alan | Ne işe yarar | Örnek |
|---|---|---|
| **Adı** | Panelde görünen isim | `Agent 2 · Denetçi` |
| **Rolü** | Prompt'un nasıl kurulacağını belirler | `Kodcu` / `Denetçi` / `Özel` |
| **Proje bağlamı** | **Her isteğin başına** eklenir; "durumu bilen" agent böyle olur | `Proje: Atlasia (React+Vite+Tailwind). Klasörler: src/components, src/hooks. Kural: MapView.tsx katman mantığına dokunma; derleme yeşil kalmalı; veri katmanı firestore.rules ile uyumlu olacak.` |
| **Durdurma kalıbı** | Denetçinin cevabı bu regex'e uyarsa kalan turlar atlanır | `KARAR:\s*ONAYLIYORUM|SORUN YOK` |
| **Nasıl çalışsın** | Demo / Tarayıcı sekmesi / Masaüstü penceresi | — |

**Kodcu** rolü: "Uygula, varsayım yapma, DEVİR NOTU bırak" — denetçi raporu gelince "madde madde: düzelttim / düzeltmedim (gerekçe)".
**Denetçi** rolü: "Sert denetle: iddiaları kanıtla karşılaştır, her sorun için NE·NEREDE·NEDEN·ÖNERİ, sonunda KARAR".
**Özel** rolü: devir şablonunu `relay.config.json` içindeki `prompts.handoff` ile kendin kurarsın.

> Denetçi gerçekten "sert" olsun istiyorsan: `prompts.review` metnindeki "kanıt iste" kısmını koru.
> Yumuşaması istiyorsan o satırı sil. Ton tamamen şablondan gelir.

---

## 6. Kontroller (iş kartındaki butonlar)

| Buton | Ne yapar |
|---|---|
| **✔ Onayla ve gönder** | Sıradaki agent'a geçilir (devir onayı modunda) |
| **📋 Panodan cevabı al** | Masaüstü penceresi modunda: cevabı agent'tan kopyala (Ctrl+C) → bas → devir notuna girer |
| **⤼ Bu sırayı atla** | O turu hiç çalıştırmadan sonrakine geç |
| **⏸ Duraklat / ▶ Devam** | İşi olduğu yerde duraklatır (sekmeye elle müdahale edeceksen kullan) |
| **✋ Devral** | "Ben yapıyorum" — relay o agent'a dokunmaz, iş senin elinde |
| **↻ Yeniden dene** | Hata alan turu tekrar dener |
| **⏹ Durdur** | İşi bitirir, kalan turlar çalışmaz |
| **🗑** | Kaydı listeden siler |

---

## 7. Ekip yönetimi (istediğin kadar agent)

- **+ Ajan ekle** → ad, rol, bağlam gir.
- Her agent kartında: **▲ ▼** (sırayı değiştir), **Düzenle**, sil (Düzenle penceresinin altında).
- Sıra, ekleme/taşıma yaptıkça otomatik güncellenir (`relay.config.json`'a yazılır).
- İstek gönderirken **çiplerle** hangilerinin çalışacağını seçersin.
- Pratik: 2–4 agent (kodcu + sert denetçi + gerekirse testçi/güvenlik). 4'ten fazlası her isteği uzatır.

---

## 8. Komut satırı (isteğe bağlı)

Kurulum klasöründe:

```powershell
.\agent-relay-win-x64.exe send "harita ekranındaki ölçek çubuğunu düzelt"   # gönder + bitmesini bekle
.\agent-relay-win-x64.exe add  "başka bir istek"                            # kuyruğa ekle
.\agent-relay-win-x64.exe status                                            # kuyruk + ajan sağlığı
.\agent-relay-win-x64.exe ctl <jobId> pause|resume|skip|takeover|approve|stop
.\agent-relay-win-x64.exe health                                            # bağlantı kontrolü
.\agent-relay-win-x64.exe diag                                              # kurulum teşhisi
```

macOS/Linux'ta aynı komutlar `./agent-relay-macos-arm64 ...` şeklinde.

---

## 9. Sorun giderme

| Belirti | Çözüm |
|---|---|
| Panel açılmadı | Tarayıcıya `http://localhost:8787` yaz. Port doluysa program sıradaki boş portu seçer — komut penceresindeki adrese bak. |
| Pencere açılıp kapanıyor | PowerShell'de elle çalıştır: `cd <klasör>` → `.\agent-relay-win-x64.exe`. Hata ekranda kalır; `agent-relay-error.log` dosyasına da yazılır. |
| "Sekme bulunamadı" | Chrome'u `--remote-debugging-port=9222` ile aç. Panelde adres `http://127.0.0.1:9222` olmalı. |
| Metin kutuya girmedi | Düzenle → Gelişmiş seçiciler → "Yazı kutusu seçicisi"ni o siteye göre ayarla. |
| Cevap "yakalanamadı" | Devirde onay istenir; cevabı panodan al ya da elle yapıştır. |
| Yanlış yere yazdı | Relay göndermeden önce kutu içeriğini doğrular; yine de emin olmak istiyorsan **Devirde onay** açık kalsın. |
| İki kopya açtım | İkincisi otomatik başka porta geçer (8788 gibi). Karışmaması için birini kapat. |

---

## 10. Kısa özet (ezberlemen gereken 4 şey)

1. **İsteği bir kez yaz** → gerisi sırayla akar.
2. **Kimler çalışsın + kaç tur** seç → sıra önizlemesi zaten altında yazıyor.
3. **Devirde onay** açık olsun: en kontrollü, en az sürprizli mod.
4. Takılırsan: **Duraklat / Devral / Durdur** — kontrol her zaman sende.

Panel ve motor tamamen senin bilgisayarında çalışır; dışarıya veri göndermez, API anahtarı istemez.
Program bir "şef"tir; düşünen taraf bağladığın agent'ların kendisidir.

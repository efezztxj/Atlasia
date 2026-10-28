# Hava Widget'ı — "Bu hafta sonu nereye?"

Fikir #5 ([`../10-yenilikci-fikir.md`](../10-yenilikci-fikir.md)). Reklam vermeden **dağıtım**
kurmanın yolu: kutu başkasının sitesinde durur, sunucu çalışmaz, para çıkmaz.

| | |
|---|---|
| Kutu | [`widget.html`](widget.html) — tek dosya, bağımlılık yok, ~15 KB |
| Demo | [`index.html`](index.html) — açık/koyu temada sahte blog içinde, gömme kodu, parametre tablosu |
| Veri | [Open-Meteo](https://open-meteo.com/) — anahtarsız, ücretsiz, CC BY 4.0 (atıf kutuda) |
| Maliyet | ₺0 |
| Sunucu / cron / kota | yok |

## Ne yapar

1. Şehri seçer (`?sehir=izmir`), 7 günlük tahmini çeker.
2. **Hafta sonuna** bakar — içindeki Cumartesi/Pazar günlerinden en iyisini seçer.
   Puan: yağış olasılığı + yağış miktarı + aşırı sıcak/soğuk + rüzgâr.
3. Tek cümle karar verir: *"Gitmek için iyi gün. Kalabalık da az olur."*
4. Altında o gün için **örnek bir rota** gösterir ve tek bağlantı verir: **Rotanı çiz →**

## Sözleşme (ürünle aynı olmak zorunda)

Eşikler [`src/utils/weather.ts`](../../src/utils/weather.ts) → `rainRisk` ile birebir aynı:

| Yağış olasılığı | Sınıf | Kutudaki renk |
|---|---|---|
| %30 altı | `clear` | mint |
| %30–59 | `possible` | altın |
| %60 ve üstü | `rainy` | kiremit |

Eşik değişirse **burada da değişmeli**. Yoksa ürün "yağmur yok" derken kutu "yağmurlu"
diyebilir — markaya en pahalı hasarı bu yapar.

## Parametreler

| Parametre | Değer | Not |
|---|---|---|
| `sehir` | izmir · istanbul · kapadokya · efes · pamukkale · ankara · antalya · bodrum | tanınmayan değer İzmir'e düşer |
| `tema` | `light` · `dark` · `auto` | varsayılan `auto` (sistem teması) |
| `utm` | serbest, `[a-z0-9_-]` | `utm_content` olarak CTA'ya eklenir |

Gömme:

```html
<iframe src="https://atlasia.pages.dev/widget.html?sehir=izmir&tema=light&utm=blog-adi"
        title="Atlasia hafta sonu hava ve rota" loading="lazy"
        width="100%" height="410"
        style="border:0;max-width:460px;margin:0 auto;display:block"></iframe>
```

Kutu kendi yüksekliğini `postMessage({type:"atlasia-widget-height"})` ile bildirir;
isteyen tek satırla otomatik boyutlandırır (kod demo sayfasında).

## Yayına alma — iki yol

**A · ayrı deploy (ürün koduna hiç dokunmaz, önerilen)**
Cloudflare Pages'te ikinci proje: `reklam/widget/` klasörünü yayınla, özel alan adı
`widget.atlasia.pages.dev` ya da kendi subdomain'i. Ana uygulamanın deploy'u etkilenmez.

**B · ana siteye kopyala**
`widget.html` → `public/widget.html`. Sonuç: `atlasia.pages.dev/widget.html`.
Tek dosya, mevcut hiçbir sayfayı değiştirmez — **ama yine de ürün yüzeyi**, onay ister.

Her iki yolda da `index.html` **yayınlanmaz** (iç demo sayfası).

## 20 site listesi (elle teklif)

Kural: **soğuk toplu e-posta yok.** Her siteye tek tek, o sitenin bir yazısına atıfla yaz.
Sıralama "en kolay evet"ten zora.

| # | Site türü | Neden ister | Nerede aranır |
|---|---|---|---|
| 1–4 | Küçük hostel / butik otel siteleri | Misafir "yarın ne yapsam" diye soruyor; kutu cevabı veriyor | Kapadokya, Selçuk, Ayvalık, Kaş |
| 5–8 | Tek kişilik gezi blogları | Yazıya gömülü canlı veri = güncel içerik sinyali | "İzmir 3 günlük rota" aramaları |
| 9–11 | Yerel haber / şehir rehberi siteleri | Hafta sonu içeriği için hazır kutu | İzmir, Antalya, Eskişehir |
| 12–14 | Üniversite gezi toplulukları | Blog sayfalarında kullanılır, itiraz etmezler | Kulüp siteleri |
| 15–16 | Bisiklet / yürüyüş rotası siteleri | Hava = rotayı iptal eden tek şey | Strava kulüpleri, forumlar |
| 17–18 | Kamp / karavan blogları | Hava kararı doğrudan işleri | Kamp alanı listeleri |
| 19–20 | Belediye turizm sayfaları | Yavaş ilerler; 6. ayda dönüş beklenir | İlçe belediyeleri |

Hedef: **30 günde 5 gömme.** 20 siteye ulaşmak, 5 evet almak demek — %25 normaldir.

## Teklif metni (kopyala)

> Merhaba, [site]'deki [yazı başlığı] yazınızı okudum — özellikle [tek detay] kısmı iyiydi.
>
> Atlasia diye bir rota uygulaması yapıyoruz. "Bu hafta sonu [şehir]'de hava nasıl, hangi gün
> gitmeli?" kutusunu sitenize gömmek için ücretsiz, reklamsız, takip kodu yok. Tek dosya:
> sayfanıza 4 satır kod. Altında küçük bir "Rotanı çiz" bağlantısı var, o kadar.
>
> Örnek: [demo linki]
>
> İsterseniz kurulumu ben yaparım, siz sadece onay verin. İstemezseniz de sorun değil —
> yazı iyiydi, onu söylemek istedim.

Kısa versiyon (DM):

> Selam! [site] için ücretsiz bir hava+rota kutusu yaptık, sayfana 4 satırla gömülüyor,
> reklam yok. Bakmak ister misin? [link]

## Ölçüm

- **Gömme sayısı** → elle say (hedef 5 / 30 gün).
- **Kutu başına tıklama** → `?utm=<site-adi>` her sitede farklı; `utm_content` olarak düşer.
- **Gerçek kullanım** → CTA `utm_source=widget&utm_medium=embed&utm_campaign=hafta-sonus`.
- Anlamsız metrik: kutu görüntülenmesi. Gösterim kolay şişer, tıklama zor. Tıklamaya bak.

## Bakım ve dürüst sınırlar

- **Kota:** Open-Meteo ücretsiz katmanı ticari olmayan kullanım için ve günlük istek sınırı var.
  Her görüntüleme bir istek demek olurdu — bu yüzden kutu `sessionStorage`'da **30 dakika**
  önbellekliyor. Yine de 429 gelirse kutu **örnek veriye düşer ve sağ üstte "örnek veri" yazar.**
  Sessizce uydurmaz.
- **Rota temsilî.** Kutudaki güzergâhlar ve km elle yazıldı, `optimizeForRain` çıktısı değil.
  Gerçek motoru bağlamak her tıklamada Firebase okuması demek; o ayrı bir karar.
- **Atıf zorunlu.** Open-Meteo CC BY 4.0 — kutudaki bağlantı silinirse lisans ihlali olur.
- **KVKK:** kutu kişisel veri toplamıyor, çerez yazmıyor; yalnız `sessionStorage`'da o oturumun
  hava verisi duruyor. Gizlilik metni gerekmez.

## Test

```bash
cd reklam/widget && python3 -m http.server 8100
# http://localhost:8100/            → demo
# http://localhost:8100/widget.html?sehir=kapadokya&tema=dark
```

Doğrulananlar: açık/koyu/auto tema, 8 şehir + bilinmeyen şehir (İzmir'e düşer), ağ hatası →
örnek veri bayrağı, 30 dk önbellek, ünlü uyumu ("İzmir'de" / "Selçuk'ta" / "Kapadokya'da").

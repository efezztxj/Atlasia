# Karar kaydı — ölçüm yığını (Clarity + birinci taraf telemetri)

**Durum:** ⏳ **Karar bekliyor** (sahibi: kurucu) · **Açılış:** 1 Kasım 2026
**İlgili:** `docs/olcum-ve-hata-izleme.md` §5c · `docs/mvp-cikis-plani-2026-10-27.md` P0-2/P0-3 · T1/T2

## Neden bu kayıt var

30 Ekim – 1 Kasım arasında sayfaya **rıza kapılı Microsoft Clarity** eklendi
(`src/lib/clarity.ts`, `CookieConsent.tsx`, aydınlatma metni). Aynı anda depoda
**birinci taraf telemetri** katmanı da duruyor (`src/lib/telemetry.ts` +
`workers/telemetry/`, T1). İkisi farklı rıza anahtarı, farklı veri ve farklı
sorumlu (Microsoft) kullanıyor. İki katmanın birlikte kalması bir **karar**
değil, art arda eklemelerin sonucu; bu yüzden yazılı hâle getiriliyor.

## Seçenekler

| # | Seçenek | Artı | Eksi |
|---|---|---|---|
| **A** | **Clarity tek kaynak** (Worker emekli) | Kurulum bitti; panel, ısı haritası ve oturum kaydı hazır; "neden" sorusunu cevaplar; ek iş yok | Üçüncü taraf + yurt dışı aktarım; huni olayları (kayıt → iz → rota) özel olay olarak ayrıca tanımlanmalı; oturum kaydı KVKK açısından en riskli veri türü |
| **B** | **İkisi birlikte** (Clarity = nitel, Worker = nicel) | Huni sayıları kendi kontrolümüzde, PII sıfır; Clarity yalnız "neden" için | İki rıza anahtarı ve iki aydınlatma satırı bakımı; `VITE_TELEMETRY_ENDPOINT` deploy'u hâlâ operatörde; kullanıcıya iki ayrı izin sorusu |
| **C** | **Clarity çıkar, Worker kalsın** | Tek sağlayıcı, tam veri egemenliği, çerezsiz | Worker deploy edilmeden hiç ölçüm olmaz; oturum/ısı haritası kaybı; eklenmiş kodu geri almak gerekir |

## Öneri (sahibi onaylamadan uygulanmaz)

**B — ikisi birlikte, ama iş bölümü yazılı:** Clarity yalnız *nitel* sorular için
(hangi ekranda takılıyor, ölü tıklama), birinci taraf huni ise *nicel* KPI'lar için
(`docs/mvp-cikis-plani` §9'daki altı metrik). Gerekçe: pilotun altı metriği
Clarity'nin oturum kaydından güvenilir biçimde türetilemez; buna karşılık huni
sayıları "neden" sorusunu cevaplamaz.

B seçilirse **zorunlu ek işler:**

1. `VITE_TELEMETRY_ENDPOINT` operatör tarafından tanımlanır (Worker deploy) — yoksa B'nin nicel yarısı boş kalır.
2. Clarity panelinde maskeleme doğrulanır: oturum kaydında **metin, e-posta ve konum görünmemeli**.
3. Çerez bandındaki iki izin birbirinden bağımsız açıklanır (tek "kabul et" düğmesi iki izni birleştirmemeli).

A seçilirse: `workers/telemetry/`, `telemetryBootstrap.ts` ve `analytics.ts` emekliye
ayrılır; huni olayları Clarity özel olaylarına eşlenir; aydınlatma metninden birinci
taraf katman anlatımı çıkarılır. **C seçilirse** `src/lib/clarity.ts`, CSP satırları ve
aydınlatma §2.5/§3/§4.1 cümleleri geri alınır.

## Karar

- [ ] A — Clarity tek kaynak
- [ ] B — ikisi birlikte (öneri)
- [ ] C — Clarity çıkar

Karar tarihi: ____________ · Onaylayan: ____________

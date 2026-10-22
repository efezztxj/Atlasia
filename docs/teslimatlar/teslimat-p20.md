# Teslimat P20 — Rota paylaşım linki (Firestore'suz)

**Tarih:** 2026-10-22 · **Durum:** ✅ kapandı (kod #43 ile main'de; bu turda kod değişikliği yok).

## Kabul kriteri doğrulaması
- Link yalnız istemci içi kodlama (`src/utils/shareLink.ts`, `shareLinkUrl.ts`); Firestore yazımı yok.
- Açılan link önizleme gösterir (`AtlasAssistant` `resumeRoute`); kayıt yalnız kullanıcı "Kaydet"e basınca (`onSave`).
- Yayınlama `resolveTrackShare` kapısından geçer; testler `shareLink.test.ts`.

## Karar: id çakışması
`saveRoute` (useCollections) id ile tekilleştirir; aynı id'li link aynı rotanın güncellemesi sayılır ve üzerine yazar. Bu, koleksiyonların mevcut desenidir; değiştirilmedi. İstenirse ayrı iş: içe aktarmada yeni id üretmek.

## Format sözleşmesi (denetim 2026-10-22'de eklendi)
- Biçim: `https://<site>/#r=v1.<base64url(zlib(JSON))>` — fragment'ta taşınır, sunucuya gitmez. Eski `?r=` okunmaya devam eder.
- Sınırlar: token ≤ `SHARE_LINK_MAX_CHARS` = 12.000 karakter (aşımda "çok büyük" hatası, kırpma yok); açılmış veri ≤ `SHARE_PAYLOAD_MAX_BYTES` = 512.000 bayt (`inflateBounded` sıkıştırma bombasını keser).
- Bilinmeyen sürüm → "desteklenmiyor"; bozuk girdi → çökme yok, Türkçe hata; koordinat/durak sayısı doğrulanır.
- Testler: round-trip (Türkçe karakter + emoji), sürüm, boyut, bozuk girdi tablosu (`shareLink.test.ts`).

## Gizlilik metninin göründüğü yer
`RouteEditor.tsx` "Paylaşmayı onaylıyorum" onay kutusu: "bağlantısı olan herkesçe açılmasını kabul ediyorum. Ham yürüyüş izim paylaşılmaz; yalnız bu rota paylaşılır." Onaysız paylaşım düğmesi çalışmaz.

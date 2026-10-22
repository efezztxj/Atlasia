# Teslimat P20 — Rota paylaşım linki (Firestore'suz)

**Tarih:** 2026-10-22 · **Durum:** ✅ kapandı (kod #43 ile main'de; bu turda kod değişikliği yok).

## Kabul kriteri doğrulaması
- Link yalnız istemci içi kodlama (`src/utils/shareLink.ts`, `shareLinkUrl.ts`); Firestore yazımı yok.
- Açılan link önizleme gösterir (`AtlasAssistant` `resumeRoute`); kayıt yalnız kullanıcı "Kaydet"e basınca (`onSave`).
- Yayınlama `resolveTrackShare` kapısından geçer; testler `shareLink.test.ts`.

## Karar: id çakışması
`saveRoute` (useCollections) id ile tekilleştirir; aynı id'li link aynı rotanın güncellemesi sayılır ve üzerine yazar. Bu, koleksiyonların mevcut desenidir; değiştirilmedi. İstenirse ayrı iş: içe aktarmada yeni id üretmek.

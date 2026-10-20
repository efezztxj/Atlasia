# GÖREV C1 — Web push bildirimleri (Agent-3) ⚠️ ONAY BEKLİYOR

> **BU BRIEF KULLANICI ONAYI OLMADAN BAŞLATILMAZ.**
> Kullanıcı "C1 başla" diyene kadar ajan bu göreve başlamaz.

## Amaç
Uygulama içi bildirim sistemi (Firestore `users/{uid}/notifications`) tamam; ancak kullanıcı
uygulamayı açık tutmuyorsa bildirimi görmüyor. Web push ile: kapalıyken de bildirim gelsin.

## Karar noktaları (kullanıcıdan — brief sahibi cevaplar)
1. İzin ne zaman sorulacak? (öneri: ilk grup/mesaj deneyiminden sonra — asla ilk açılışta)
2. İzin metni Türkçe + samimi mi resmî mi? (kullanıcı karar verir)
3. Gece sessiz saat (ör. 23:00–08:00 bildirim yok) ister mi?

## Kapsam (ajan işi — onay gelirse)
1. Servis worker (`public/sw.js` mevcut — genişletilecek) + `Notification.requestPermission`
   akışı; izin UI'ı ürün diline uygun.
2. Backend'siz çözmek ZORUNLU: FCM'in ücretsiz web push'u için `firebase-messaging-sw.js` + istemci
   token kaydı (Firestore'a token yazma — kurallara `fcmTokens` alanı gerekir → bu bir KURAL
   değişikliğidir, teslimatta açıkça listelenir ve denetimden geçer).
3. Bildirim tetikleyici: push altyapısı yalnız "izin + token + self-push testi" kurar.
   Otomatik tetik (Cloud Functions) BLAZE gerektirir — KAPSAM DIŞI, kırmızı çizgi.
4. Testler + `check:local` kapıları yeşil.

## ORTAK DOSYA KURALI
Dokunduğun ortak dosyaların TAMAMINI teslim et; `firestore.rules` değişikliği gerekiyorsa teslimatta
"KURAL DEĞİŞİKLİĞİ" başlığıyla ayrı ve gerekçeli yaz.

## Kısıtlar
- Ücretsiz katman. Ücretli servis YOK. Blaze/Functions YOK (kırmızı çizgi).
- Mevcut bildirim/güvenlik mimarisine uy; `AGENTS.md` yasakları geçerli.

## Teslim
- `teslimat-c1.md`: karar noktalarına verilen cevaplar + altyapı + kanıt.

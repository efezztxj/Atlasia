# Aşama 6 — Yayın provası (kod yok, deploy YAPILMADI)

Tarih: 2026-10-22 · Dal: `arena/8df7f158-atlasia` · PR: #55

> Bu aşama **yalnız provadır**. `firebase deploy` çalıştırılmadı, hiçbir üretim
> kaynağı değiştirilmedi.

## Sıra

1. `hosting` — yeni istemci yayına alınır (yeni kurallarla uyumlu yazımlar).
2. `firebase deploy --only firestore:rules` — kurallar yayına alınır.
3. 24 saat `permission-denied` logu izlenir.

Gerekçe: yeni istemci eski kurallarla da çalışır (yeni alanlar eski `hasOnly`
listesinde yoksa reddedilir; yeni istemci `displayNameLower` yazar).
Ters sıra, eski istemcilerin profil yazımını hemen kırar.

## Eski istemci hangi yazımlarda reddedilir?

| Çağrı | Yeni kural | Eski istemci davranışı | Kullanıcıya etki |
|---|---|---|---|
| `userProfiles/{uid}` create | `displayNameLower` zorunlu (Aşama 2) | alan yok → `permission-denied` | **Yok**: `App.tsx:189` `.catch(...)` → `console.warn`, uygulama devam eder; arama dizini güncellenmez |
| `friend_declined` bildirimi | `friendDeclines` kanıtı zorunlu (Aşama 1) | kanıt yok → `permission-denied` | **Yok**: `friendships.ts:226` `try/catch`; ret yine tamamlanır, bildirim gitmez |
| `verifications` anonim get/list | `signedIn()` (Aşama 3) | eski istemci `uid` yokken abone olmuyor (`useFreshness.ts:31`) | **Yok**: anonimken istek atılmaz |
| Diğer tüm okuma/yazmalar | değişmedi | değişmedi | Yok |

### Bildirim yazımlarının tamamı yakalanıyor mu? (doğrulandı)

```text
src/lib/friendships.ts:180  friend_request   → try/catch (console.warn)
src/lib/friendships.ts:226  friend_declined  → try/catch (console.warn)
src/lib/friendships.ts:283  friend_accepted  → try/catch (console.warn)
src/lib/groups.ts:332       group_invite     → try/catch (console.warn)
src/lib/groups.ts:722       group_message    → try/catch (console.warn)
src/lib/moderation.ts:119   report_received  → .catch (console.warn)
```

Ek olarak `App.tsx:189` profil senkronizasyonu `.catch` ile sarılı.
Yani yeni kuralların reddettiği hiçbir yazım ana akışı kesmiyor.

## Geri alma

```bash
# Önceki kural sürümüne dön (istemci dağıtımı geri alınmaz):
firebase deploy --only firestore:rules
```

- Kurallar geri alınırsa: eski istemci yazımları yeniden çalışır; **yeni**
  istemcinin `displayNameLower`/`friendDeclines` yazımları eski kurallarda
  `hasOnly`/catch-all nedeniyle reddedilir. Yani geri alma da tam simetrik
  değildir; pencere kısa tutulmalı.
- İstemci dağıtımı geri alınmaz (talimat).

## 24 saat izleme

- Firestore `permission-denied` oranı; özellikle:
  - `userProfiles` yazımları (eski PWA önbelleği),
  - `users/*/notifications` create (friend_declined),
  - `verifications` get/list (anonim sekme).
- Eşik önerisi: 10 dk içinde >20 `permission-denied` → geri alma provası.
- Log kaynağı: Firebase Console → Firestore → Usage/Monitoring; Cloud Logging
  `severity>=ERROR resource.type="firestore.googleapis.com"`.

## Yapılmayanlar (açıkça)

- **Gerçek deploy yapılmadı.** `firebase deploy` hiç çalıştırılmadı.
- Firebase Console'da yayındaki kural sürümü teyit edilmedi.
- Hosting önizlemesi/Cloudflare Pages dağıtımı tetiklenmedi.
- 24 saatlik izleme başlatılmadı (prova metni).

## Bilinen riskler

1. Eski PWA önbelleği: yeni kurallar yayına girdikten sonra eski istemci
   `userProfiles` yazamaz (sessiz `console.warn`). Kullanıcı yeni sürümü alana
   kadar arama dizini güncellenmez.
2. `displayNameLower` biçim regex'i nokta/kesme/emoji içeren adları reddeder
   (Aşama 2 sınırı); bu kullanıcılar profil dizinine hiç yazamaz.
3. `friendDeclines` birikimi (TTL yok).

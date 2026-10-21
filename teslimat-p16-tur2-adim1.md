# Teslimat — P16 2. tur, adım 1: hesap katmanı karakterizasyonu (2026-10-21)

## Kapsam
`src/lib` testsiz modüllerinden hesap katmanı: `accountTypes`, `deviceAccounts`,
`auth` kapıları, `firebase` env kilidi. Üretim kodu **değişmedi**; yalnız test +
test bağımlılığı (`fake-indexeddb`, devDependency).

## Kilitler
| Dosya | Ne kilitledi? |
|---|---|
| `accountTypes.test.ts` (4) | normalizeEmail trim+lowercase; isValidEmail biçim+254; passwordRules 8–128 + harf (`\p{L}`, Türkçe) + rakam; AccountError code/name taşıma. |
| `deviceAccounts.test.ts` (5) | Gerçek PBKDF2 (600k) + fake-indexeddb + sahte sessionStorage ile uçtan uca: kayıt→kurtarma kodu biçimi→finish→restore aynı uid; geçersiz girdi red kodları (invalid-email/weak-password/invalid-profile-name/email-already-in-use); yanlış parola→invalid-credential, doğru parola oturum; profil güncelle trim; silinen hesap giremez; kurtarma kodu parolayı değiştirir, eski parola reddedilir; IndexedDB yokken `device/storage-unavailable`, restore→null. |
| `auth.test.ts` (4) | Env yokken `authConfigured=false`, backend `"device"`, `getAtlasAuth`→`auth/not-configured`, parola sıfırlama→`device/recovery-required`; provider kapıları: anonim/bilinmeyen provider reddi, password'da emailVerified şartı, phone'da numara şartı; `toFirebaseAccount` dönüşümü. |
| `firebase.test.ts` (3) | `resetModules`+`stubEnv`: eksik env → configured=false, app/db null, summary "(missing)"; yarım env hazır sayılmaz; tam env → Firestore örneği (node'da window'sız) kurulur. |

## Bağımlılık notu
`fake-indexeddb@^6.2.5` devDependency — üretim bundle'ına girmez. Node 22
WebCrypto ile gerçek PBKDF2 türetmeleri koştu (dosya süresi ~1.3 sn;
CI yavaşlaması önemsiz).

## Doğrulama
`typecheck`, `lint`, `test:run` (57 dosya / **284 test**, +16), `build`,
`git diff --check` — hepsi yerel koşuda geçti. CI sonucu PR ile birlikte ayrıca
izlenecektir.

## P16'da kalanlar (adım 2)
- `notifications.ts`, `verifications.ts`, `routeData.ts`: groups desenindeki
  IO çıkarımı + io testleri (üretim kodu refactor'ü, karakterizasyonla güvenli).
- `fetchOpenMapPlaces` ağ karakterizasyonu (fetch mock).
- Hook'lar: `useTrackRecorder`, `useTheme`, `useFreshness` vb. — jsdom +
  `renderHook` gerektirir; ayrı bağımlılık kararı.

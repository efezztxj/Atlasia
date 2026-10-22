# Teslimat — Üretim izin hatası düzeltmesi + P16 (1. tur: utils)

**Tarih:** 2026-10-21 (Europe/Istanbul)
**Branch:** `arena/2bec08d2-atlasia`
**Tetikleyici:** Kullanıcı üretim (`atlasia.pages.dev`) ekran görüntüsü: Gruplar panelinde
"Missing or insufficient permissions." ve yürüyüş kaydının da atılamaması.

---

## 1. Üretim sorununun kök neden analizi

İki ayrı mekanizma, tek semptom (ham İngilizce Firebase hata mesajı):

**a) Gruba katılma:** `joinGroup`, önce `fetchGroup` ile grubu okur. Kurallar
grubu yalnız üyelerine açar; üye olmayan kullanıcı `permission-denied`
alır ve bu hata yakalanmadan panel hatasına dönüşürdü — düzgün "Bu gruba
eklenmemişsin" cevabına hiç ulaşılamıyordu.

**b) Yürüyüş kaydı:** Uygulama iki hesap tipine sahip (`firebase | device`).
TrackRecorderPanel yalnızca `firebaseConfigured` (env) kontrolü yapıyor,
kullanıcının **cihaz hesabında** olup olmadığına bakmıyordu. İz, cihaz
hesabı UID'siyle Firestore'a yazılmak istenince `request.auth` uyumsuzluğu
nedeniyle reddediliyor ve ham hata basılıyordu.

## 2. Yapılan düzeltmeler (davranış güvenli, kurallar gevşetilmedi)

- `src/lib/groups.ts` — `joinGroup`: `permission-denied`, kodlu ve Türkçe
  hataya çevrildi (`group/not-member`: "Bu gruba eklenmemişsin. Kurucudan
  davet iste."). Diğer hatalar olduğu gibi yükselir.
- `src/lib/routeData.ts` — `createTrack`: hata kodu ayırt edilip Türkçe
  mesaja çevrildi; izin reddinde bulut-hesabı yönlendirmesi verir, hata
  zinciri `cause` ile korunur.
- `src/components/TrackRecorderPanel.tsx` + `src/App.tsx` — yeni
  `cloudAccount` prop'u (`user.backend === "firebase"`): cihaz hesabında
  kayıt butonu baştan kapalı ve nedenini açıklayan bilgi notu gösterilir;
  kullanıcı yürüyüşün sonuna gidip hata ile karşılaşmaz.
- `src/lib/groups.io.test.ts` — mock'ta permission-denied simülasyonu +
  3 yeni test: üye katılımı (indeks yazımı), üye olmayan/reddedilen
  katılım (Türkçe+kodlu), olmayan grup.

## 3. P16 birinci tur (testsiz modül kapsama maratonu)

`src/utils` altındaki tüm testsiz modüller kilitlendi (toplam **230→264 test**;
bu fazda +31 kilit testi, +3 katılım testi). Davranış değişikliği yok; karakterizasyon testleri:

| Dosya | Kilitlenen sözleşme |
|---|---|
| `text.test.ts` | Türkçe normalizasyon: İ/I→i, diakritik silme, NFD bileşimleri |
| `cn.test.ts` | clsx + twMerge: çakışmada son gelen, koşullu/falsy atlama |
| `api.test.ts` | `mediaUrl`: boş/yok → undefined |
| `storage.test.ts` | kota/depoya erişim hatasında çökmesiz bellek yedeği + local/session ayrımı |
| `placeAdvice.test.ts` | alias eşleşmesi, özel/genel tavsiye kalıpları |
| `placePhotos.test.ts` | foto zincir sırası, Pexels id ile dedup, 10 foto tavanı, atıf etiketi |
| `image.test.ts` | 180.000 karakter kilidi (rules ile eşitlik), görsel olmayan dosyayı erken reddetme |
| `openMapPlaces.test.ts` | ulaşım türü → arama yarıçapı (saf kısım) |

**P16'nın kalanı (2. tur adayı):** `fetchOpenMapPlaces` ağ karakterizasyonu
(Photon fixture + window stub), `src/lib` testsiz modülleri (`auth`,
`deviceAccounts`, `notifications`, `verifications`, `routeData` — IO deseni
gerekir) ve hook'lar (çoğu test dikişi gerektirir). Plan tablosunda P16 🚧.

## 4. Dürüst not (prod teşhisi)

Bu düzeltme **kod tarafındaki** iki hastalığı giderir ve cihaz-hesabı
kullanıcısına artık doğru bilgi verir. Ancak kullanıcının hatayı **bulut
hesabıyla** alıyor olması ihtimalinde kök neden üretim Firestore kurallarının
deploy durumudur — bu oturumun Firebase Console/proje erişimi yoktur;
repo kuralları CI emulator'ında kanıtlıdır. Düzeltme sonrası aynı hata
bulut hesabıyla da alınırsa prod kurallarının `firebase deploy --only
firestore:rules` ile güncel sürüme çekilmesi ve proje/auth eşleşmesi
kontrol edilmelidir (bu kontrol bu teslimatla yapılmamış sayılmaz,
yapılamadığı için burada açıkça kayıtlıdır).

## 5. Doğrulama (bu ağaçta koşuldu)

- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run test:run` 52 dosya / **264 test** ✅ · `npm run build` ✅ · `git diff --check` ✅
- Değişen: `src/lib/groups.ts`, `src/lib/routeData.ts`, `src/lib/groups.io.test.ts`,
  `src/components/TrackRecorderPanel.tsx`, `src/App.tsx`,
  `src/utils/{text,cn,api,storage,placeAdvice,placePhotos,image,openMapPlaces}.test.ts`,
  bu teslimat + plan güncellemesi.

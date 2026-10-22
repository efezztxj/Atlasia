# F12 Hata Avcısı — Atlasia

Bu rehber iki işe yarar: **(A)** üretim sitesinden hatayı doğru biçimde toplaman,
**(B)** topladığın yolu kural dosyasındaki satırla eşleştirmen.

> ⚠️ **Üretim sitesi bu dalın düzeltmelerini İÇERMİYOR.** Kurallar deploy
> edilmedi, dal push edilmedi. Yani `atlasia.pages.dev`'de göreceğin hatalar
> **eski kodun** hatalarıdır — bu bizim için yararlı, gerçek üretim durumunu
> gösterir. Ama "düzelttim" dediğim 5 kök nedeni orada hâlâ görürsün.

---

## A) F12'den neyi kopyalayacaksın

### 1. Konsol sekmesi

Her hata için şunları al:

- **Tam mesaj metni** — örn. `Missing or insufficient permissions.`
- **Hatanın YIĞINI** (stack): kırmızı satırın solundaki **üçgeni aç**. En üstteki
  2-3 çerçeve yeterli, örn. `at saveRouteReference (index-abc123.js:1:23456)`.
  Bu, hangi fonksiyonun patladığını söyler — en değerli bilgi bu.
- Mesajın **öncesindeki** `[Atlasia]` ile başlayan `console.warn` satırları varsa
  onları da al; kod hangi aşamada olduğunu oraya yazıyor.

### 2. Ağ (Network) sekmesi

Firestore gRPC-web kullanır, yani URL'ler dosya adı değil **metot adı** taşır.

**Adımlar:**
1. Network sekmesini aç, **`Fetch/XHR`** filtresine bas (ya da filtre kutusuna
   `firestore.googleapis.com` yaz).
2. Sayfayı yenile, hatayı üreten butona bas.
3. **Kırmızı** (4xx) satırı bul. Adı şunlardan biri olur:

| Metot adı | Hangi istemci işlemi | Anlamı |
|---|---|---|
| `BatchGetDocuments` | `getDoc` / `getAll` | Tek belge okuma |
| `RunQuery` | `getDocs(query(...))` | Liste/sorgu okuma |
| `Commit` | `setDoc` / `updateDoc` / `deleteDoc` / `writeBatch.commit` | Yazma |
| `Write` | `onSnapshot` (dinleyici), `runTransaction` | Uzun ömürlü akış |
| `Listen` | `onSnapshot` | Dinleyici kaydı |
| `RunAggregateQuery` | `count()` | Sayaç sorgusu |

4. O satıra tıkla → **Payload** (Chrome) veya **Request** sekmesi.
5. İçinde şu biçimde bir yol ara:

```
projects/atlasia-xxxx/databases/(default)/documents/routes/abc123
                                                    └──────┬──────┘
                                              KOPYALAYACAĞIN KISIM
```

6. Bir de **Response** sekmesindeki hatayı al:

```json
{"error":{"code":403,"message":"Missing or insufficient permissions.","status":"PERMISSION_DENIED"}}
```

**Bana yazman gereken asgari bilgi:**

```
Buton/ekran : Kayıtlarım → Rotalar sekmesi
Konsol      : Missing or insufficient permissions.
Stack       : at saveRouteReference (index-abc.js:1:23456)
Metot       : RunQuery   (403)
Yol         : users/XYZ123/savedRoutes
```

> **Not:** `Write` akışları uzun ömürlü olduğu için tek satırda birçok işlem
> taşır. Yol payload içinde görünmüyorsa, o satırın **EventStream** /
> **Response** sekmesindeki ilk kareye bak.

---

## B) Yol → kural eşleştirme tablosu

`firestore.rules` satır numaraları bu daldaki gerçek dosyadan çıkarıldı.
Topladığın yolun **koleksiyon** kısmını aşağıda bul.

### Kök koleksiyonlar

| Yol | Blok | get | list | create | update | delete |
|---|---|---|---|---|---|---|
| `routes/{id}` | 507 | 509 | 512 | 515 | 522 | 533 |
| `tracks/{id}` | 536 | 537 | 538 | 539 | 544 | 550 |
| `places/{id}` | 443 | 444 | 447 | 448 | 452 | 458 |
| `posts/{id}` | 462 | 463 | 465 | 466 | 472 | 473 |
| `stories/{id}` | 494 | 495 | 497 | 498 | 502 | 503 |
| `groups/{id}` | 613 | 631 | **634 = false** | 635 | 637 | 665 |
| `groups/{id}/messages/{mid}` | 667 | 671 | 672 | 673 | 676 | 677 |
| `blocks/{id}` | 601 | 602 | 603 | 605 | 606 | 607 |
| `reports/{id}` | 592 | 593 | 594 | 596 | 597 | 598 |
| `verifications/{id}` | 584 | 585 | 586 | 587 | 588 | 589 |
| `friendships/{pairId}` | 715 | 716 | **717 = false** | 718 | 731 | 756 |

### `users/{uid}/...` alt koleksiyonları

| Yol | Blok | get | list | create | update | delete |
|---|---|---|---|---|---|---|
| `users/{uid}/savedPlaces/{id}` | 553 | 554 | 555 | — | — | 563 |
| `users/{uid}/savedRoutes/{id}` | 566 | 567 | 568 | 569 | 576 | 577 |
| `users/{uid}/groups/{id}` | 682 | 683 | **684 → limit ≤ 20** | 685 | 687 | 688 |
| `users/{uid}/notifications/{id}` | 692 | 693 | 694 | 695 | 696 | 699 |
| `users/{uid}/blocks/{id}` | 703 | 704 | 705 | 706 | 707 | 708 |
| `users/{uid}/friendships/{pairId}` | 762 | 767 | 768 | 769 | 787 | 804 |

### `permission-denied`'ın 5 bilinen nedeni

Yolu bulduktan sonra hangisi olduğuna bak:

1. **VAR OLMAYAN belgeye `getDoc`.** Kural `resource.data`'ya dokunuyorsa
   (`routes` satır 509, `tracks` 537) Firestore `not-found` yerine
   **`permission-denied`** döndürür. Mesaj yanıltıcıdır: yetki sorunu değil,
   belge yok. → 1. kök neden, bu dalda düzeltildi.
2. **`list: false` olan koleksiyon sorgulanıyor.** `groups` (634) ve
   `friendships` (717). Bu ikisine `RunQuery` görürsen **gerçek bir kod
   hatasıdır** — denetimde istemcide böyle bir çağrı bulunamadı.
3. **`limit` kural sınırını aşıyor.** `boundedList(n)` = `limit <= n`
   (satır 10-12). Sınır aşımında mesaj yine "Missing or insufficient
   permissions" olur, neden görünmez. Tek sınır 20: `users/{uid}/groups`
   (684). → 5. kök neden, bu dalda düzeltildi.
4. **`uid` uyuşmuyor.** `users/{uid}/...` bloklarının hepsi
   `uid == request.auth.uid` ister. Yoldaki `{uid}` senin Auth UID'in değilse
   reddedilir. Ağdaki yolu kendi UID'inle karşılaştır.
5. **Yazım şekli ihlali.** `update` kuralları değişmez alanları korur
   (`createdAt`, `authorUid`, `ownerUid`, `participants`) ve değişen
   anahtarları `hasOnly([...])` ile sınırlar. Var olan belgeye tam `setDoc`
   yapmak `update` sayılır ve bu yüzden reddedilir. → 4. kök neden
   (`syncFriendshipMirror`), bu dalda düzeltildi.

### Hızlı karar

| Ağda gördüğün | İlk bakılacak |
|---|---|
| `RunQuery` + yol `users/{uid}/groups` | Neden 3 (limit ≤ 20) |
| `BatchGetDocuments` + yol `routes/{id}` | Neden 1 (belge var mı?) |
| `RunQuery` + yol `groups` veya `friendships` | Neden 2 (kod hatası) |
| `Commit` + herhangi bir yol | Neden 5 (yazım şekli) |
| `Write` / `Listen` | Dinleyici: neden 4 (uid) veya 3 (limit) |

---

## C) Bilinen kusurlu akışlar — bunları özellikle dene

Denetimin öngördüğü, üretimde **hâlâ bozuk** olan akışlar:

| # | Akış | Beklenen belirti |
|---|---|---|
| 1 | Yeni rota kaydet / yayınla | `Missing or insufficient permissions` (neden 1) |
| 2 | Kayıtlarım → Rotalar sekmesi | Sekme boşalır + aynı hata (neden 1, `Promise.all`) |
| 3 | Kayıtlarım → herhangi bir sekmede hata | Hata diğer sekmelere de yayılır (paylaşılan hata durumu) |
| 4 | Hesabı sil | Konsolda `[Atlasia] Grup/notification verisi temizlenemedi` (neden 3) — **bildirimler silinmez** |
| 5 | Mobil: haritadan ayrılıp geri dön | Harita gri/boş kalabilir (2. sorun) |

4. maddede hata **kullanıcıya görünmez**, yalnız konsola `console.warn` düşer.
Bu yüzden hesabı silerken konsolu açık tut.

---

## D) Doğrulanmamış hipotez: App Check

`fetch_page` ile çekilen canlı sayfada `"Recaptcha requires verification"`
ifadesi görüldü. `src/lib/firebase.ts` App Check için
`ReCaptchaEnterpriseProvider` kullanıyor ve `docs/cloudflare-security.md:79`
şu kontrolü belgeliyor: *"App Check reCAPTCHA Enterprise alan listesinin üretim
ve izin verilen preview alanlarıyla uyumunu kontrol et."*

**Hipotez:** App Check Firestore için *enforced* ise ve site key'in izinli alan
listesinde `atlasia.pages.dev` yoksa token alınamaz, **tüm** Firestore çağrıları
reddedilir ve SDK bunu `permission-denied` olarak gösterir. Bu, aynı hatanın
birden çok ekranda çıkmasını tek nedenle açıklar.

**Bu doğrulanmadı** — Firebase konsoluna erişim yok. F12'de şu ayırt edici
işarete bak:

- Hata **her** Firestore isteğinde ve **her** ekranda çıkıyorsa, ayrıca
  konsolda `reCAPTCHA` / `app-check` / `Failed to get App Check token`
  benzeri bir satır varsa → App Check olasılığı yüksek.
- Hata **yalnız belirli** yollarda çıkıyorsa (örn. sadece `routes/{id}`) →
  neden 1-5'ten biri, App Check değil.

Konsolda `app-check` geçen herhangi bir satırı bana ilet; bu ayrımı kesinleştirir.

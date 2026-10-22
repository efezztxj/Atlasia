# Atlasia — Firestore Rules ve Indexes Deploy Runbook'u

> **Kapsam:** Yalnızca `firestore.rules` ve `firestore.indexes.json` dağıtım adımları.
> Web/PWA yayını bu runbook'un dışındadır: o hat **GitHub main → Cloudflare Pages**
> otomatik akar ve bu belgeyle yönetilmez.
>
> **Kim çalıştırır?** Kurallar ve indeksler yalnız **kullanıcı** tarafından deploy
> edilir. Ajanlar bu belgeyi yazar; `firebase deploy` komutunu **çalıştırmaz**
> (`AGENTS.md` deploy yasağı). Ajan PR açar; merge ve deploy kararı kullanıcıdadır.
>
> **Yasak:** `firestore.rules` gevşetilmez. Yalnız sıkılaştırma deploy edilir
> (ROADMAP §4). `firebase deploy` dışında Firebase/Cloudflare ayar değişikliği de
> bu belge kapsamı dışındadır; onlar `docs/firebase-uretim-kontrol-listesi.md`
> içindedir.

## 0. Özet akış

```
1. Proje kimliğini doğrula        (§1)
2. Kuralları test et              (§2)
3. İstemciyi yayınla (Pages)      (§3 — sıra kuralı)
4. Rules + indexes deploy et      (§4)
5. Console zaman damgası kontrol  (§5)
6. Canlı duman testi              (docs/canli-test-listesi.md)
7. Gerekirse geri al              (§6)
```

## 1. Proje kimliği doğrulaması (deploy'dan ÖNCE)

`.firebaserc` içindeki **varsayılan** proje `atlasia-dev`'dir. `--project`
yazılmazsa komut sessizce **dev** projesine gider — en sık yapılan hata budur.
Üretim proje kimliği şuradan teyit edilir:

1. **Cloudflare Dashboard → Pages → *atlasia* projesi → Settings →
   Environment variables → Production.**
2. `VITE_FIREBASE_PROJECT_ID` değerini oku (ör. `atlasia-xxxx`).
3. **Firebase Console** üst çubuğundaki proje kimliğiyle karşılaştır. Üçü
   (Pages değeri, Console, `--project` bayrağı) **birebir aynı** olmalı.
4. Farklıysa deploy **durdurulur**; hangi projenin hedef olduğu kullanıcıya
   sorulur/yazılır. Tahminle devam edilmez.

> Preview ortamının `VITE_FIREBASE_PROJECT_ID` değeri bilerek farklı olabilir
> (ayrı dev projesi). Bu runbook yalnızca **production** hedefi içindir.

## 2. Deploy öncesi yerel kapı

```bash
npm ci
npm run typecheck
npm run lint
npm run test:run
npm run test:rules:emulator    # Java 21 gerekli; yoksa kanıt CI'dır (bkz. not)
npm run build
npm run audit:check
git diff --check
```

- Yerelde Java 21 yoksa `test:rules:emulator` **çalıştırılamaz**; bunun yerine
  ilgili PR'ın GitHub Actions koşusunun *Firestore security rules tests*
  adımının yeşili kanıt olarak gösterilir. Emulator JAR'ı
  `~/.cache/atlasia/firebase-emulators` altına sabit özetle indirilir
  (sürüm 1.22.0, `scripts/run-firestore-rules-tests.mjs`).
- `tests/firestore.rules.test.ts` suite'i değişen her kural için yeni iddia
  içermelidir. `firestore.rules` değiştiyse bu adım **atlanamaz**.

## 3. Sıra kuralı: önce istemci (Pages), sonra rules

**Varsayılan sıra:**

1. **Önce istemci:** İlgili PR merge edilir; `main` push'ı Cloudflare Pages'te
   production build'ini tetikler. Build'in yeşil olduğu **Actions** ve Pages
   *Deployment* sayfasından doğrulanır.
2. **Sonra rules:** İstemci yayını doğrulandıktan sonra §4'teki komut çalışır.

**Gerekçe:** Kurallar genellikle *sıkılaştırmadır* (yeni şekil doğrulaması, yeni
alan zorunluluğu). Sıkı kural önce gelirse, önbellekteki/eski istemci paketi
kullanıcıların yüzünde `permission-denied` üretir. Önce istemci yayınlanırsa eski
yazma biçimi zaten bırakılmış olur; kural uygulandığında iki sürüm de kuralla
uyumludur. İkisi arasındaki dakikalarda güvenlik açığı oluşmaz; mevcut kural
zaten tek yetkilendirme katmanıdır.

**İstisnalar (bilinçli ters sıra):**

| İstisna | Ters sıra | Gerekçe |
| --- | --- | --- |
| **Aktif güvenlik açığı / kötüye kullanım** | **Önce rules**, istemci sonra | Veri gizliliği ve bütünlüğü erişilebilirlikten önce gelir. Eski istemcilerin hata görmesi kabul edilir; kural penceresi dakikalarca açık tutulmaz. |
| **Yeni koleksiyona izin veren *ek* kural** (yalnız yeni istemci kullanır) | **Rules önce veya aynı anda** | Ek kural eski istemciyi etkilemez; kural geç gelirse yeni istemci aradaki pencerede `permission-denied` alır. Sıkılaştırma olmadığı için sıra kuralının gerekçesi burada geçerli değildir. |
| **Mevcut belgeye yeni alan yazan istemci** (ör. #44: `groups.joinCode`; kural `hasOnly` ile alan listesini sınırlıyorsa) | **Önce rules** | Eski kural yeni alanı reddeder; istemci önce yayınlanırsa mevcut özellik (grup kurma) herkes için kırılır. 22.10.2026'da canlıda yaşandı. Yeni kural eski istemciyi etkilemez çünkü alan isteğe bağlıdır. |

Ters sıra kullanıldıysa teslimat/PR notuna **hangi istisna** ve **gerekçesi**
yazılır.

## 4. Rules ve indexes dağıtımı

Komutlar her zaman açık proje bayrağıyla:

```bash
# Kurallar (anında uygulanır)
firebase deploy --only firestore:rules --project <onayli-proje-id>

# İndeksler (arka planda inşa edilir; dakikalar sürebilir)
firebase deploy --only firestore:indexes --project <onayli-proje-id>

# İkisi birlikte de olur:
firebase deploy --only firestore:rules,firestore:indexes --project <onayli-proje-id>
```

Kontroller:

- Komut çıktısındaki `Project ID` satırı §1'deki kimlikle aynı olmalı.
- Bu komutlar **Firebase Hosting dağıtmaz**; `firebase.json` içinde hosting
  tanımı yoktur. Web yayını yalnız GitHub → Cloudflare Pages'tir.
- İndeks değişiklikleri **ekleyicidir**: yeni indeks inşa edilirken eski
  indeksler çalışmaya devam eder. İndeks **kaldırma** ayrı işlem ister
  (Console veya `firebase firestore:indexes`); bu runbook'ta kaldırma adımı
  yoktur — gerektiğinde kullanıcı kararıyla ayrıca yapılır.
- Index inşası bitmeden ilgili sorgu `failed-precondition` verebilir; Pages
  istemcisi bu pencerede eski sorgu desenini kullanmaya devam eder.

## 5. Deploy sonrası: Console zaman damgası kontrolü

1. **Firebase Console → Firestore → Rules** sekmesi.
2. Editör içeriğinin depodaki `firestore.rules` ile **birebir** olduğunu
   hızlıca karşılaştır (başlık/son kural satırı yeterliyse satır sayısı).
3. **"Son yayınlanma / Last release" zaman damgasını** not et; deploy
   saatimizle ve `git log -1 --format=%ci -- firestore.rules` tarih saatiyle
   uyuşmalı (saat dilimi farkı normaldir; mutlak an değil, aynı gün/dakika
   aralığı yeterlidir).
4. **Firestore → Rules → Release history** listesinde yeni sürümün
   *deployed* (yayında) olduğu görülmeli; listedeki ilk satır budur.
5. Aynı kontrol **Indexes** sekmesi için de yapılır: beklenen indeksler
   *Building* → *Enabled* durumuna geçmeli; `firestore.indexes.json` ile
   sayı/isim uyuşmalıdır.
6. Uyuşmazlık varsa (Console eski sürümü gösteriyorsa) deploy muhtemelen başka
   projeye gitmiştir → §1'e dön. **Sormadan ikinci deploy yapılmaz.**

## 6. Geri alma

İki yol vardır; birincisi tercih edilir.

### 6.1 Console'dan sürüm geri alma (tercih edilir — hızlı, denetim izli)

1. **Firebase Console → Firestore → Rules → Release history.**
2. Geri dönülecek bilinen iyi sürümü seç (tarih/saat ve commit notu ile).
3. **Rollback** → onayla. Kural **anında** eski metne döner.
4. §5 zaman damgası kontrolünü tekrar çalıştır; geri alma kaydı da Release
   history'de yeni bir satır açar (siler değil, üzerine yazar).
5. Sorunun kaynağını bulup düzeltilmiş `firestore.rules` ayrıca deploy edilir;
   rollback kalıcı çözüm değildir.

### 6.2 Depodan yeniden dağıt (rollback sürümü Console'da yoksa)

```bash
# Kullanıcı, bilinen iyi commit'in ağacını ayrı bir worktree'de açar:
git worktree add /tmp/atlasia-rules-rollback <iyi-commit-sha>
cd /tmp/atlasia-rules-rollback
firebase deploy --only firestore:rules --project <onayli-proje-id>
cd - && git worktree remove /tmp/atlasia-rules-rollback
```

- Not: `git checkout --`, `reset --hard` ve `clean` ajan çalışma kurallarında
  yasaktır; yukarıdaki **worktree** yöntemi çalışma ağacına dokunmadan eski
  sürümü üretir. Kullanıcı isterse Console yolundan da yapabilir (§6.1).
- İndeks geri alma: eski `firestore.indexes.json` ile §4 komutu tekrarlanır;
  artık gerekmeyen indeksler pasif kalır (maliyeti önemsizdir) ve ayrıca
  kaldırılmaz.

### 6.3 Geri alma doğrulaması

- Release history'de geri alma satırı görünmeli.
- `docs/canli-test-listesi.md`'den etkilenen senaryolar (rota yayını, yer
  kaydı) yeniden denenir; kullanıcı tarafında `permission-denied` kalmamalı.
- Yaşanan olay, kök neden ve geri alma nedeni teslimat notuna yazılır.

## 7. Sık yapılan hatalar

| Hata | Sonuç | Önleme |
| --- | --- | --- |
| `--project` yazılmadan deploy | `atlasia-dev` projesine gider; üretim değişmez | §1 + her komutta açık bayrak |
| Rules değişti, test eklenmedi | CI kırmızı veya sessiz regresyon | §2; her kural değişikliğine iddia |
| İndeks beklemeden yeni sorguyu yayınlama | `failed-precondition` | İndeks deploy'u PR ile paralel planlanır; istemci hatayı kullanıcı diliyle gösterir |
| Preview/production `VITE_FIREBASE_PROJECT_ID` karışıklığı | Yanlış projede doğrulama | §1; yalnız production değeri hedef alınır |
| Rollback sonrası düzeltme deploy'unu unutma | Aynı hata geri gelir | §6.1 adımı 5 |

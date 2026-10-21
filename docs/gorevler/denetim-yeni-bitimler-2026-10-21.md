# Denetim · Koşucu dallarından gelen P1–P4 bitimleri + fd127f10 (2026-10-21)

> **Kapsam:** Başka koşucu (ajan) dallarındaki P1–P4 bitim çalışmaları ve
> `arena/fd127f10-atlasia` üzerindeki yeni iş. Kendi dalımdan ayrılmadan,
> dallar `refs/denetim/*` altına fetch edilerek okundu; fd127f10 ağacı
> `/tmp/atlasia-fd` altına açılıp kalite kapısı bizzat koşuldu.
> Kod değişikliği yapılmadı.
>
> **İnceleme dalı:** `arena/c064e040-atlasia` @ `fb2927a` (main ile aynı)

## 1. P1/P2/P3/P4 koşucu dallarının durumu

| Dal | Görev | main ile ilişki | Denetim sonucu |
|---|---|---|---|
| `arena/9e4e5884-atlasia` | P2 Rota Motoru | üç nokta diff **boş** — tamamı main'de | ✅ Önceki denetim (denetim-p1-p4) geçerli, ek iş yok |
| `arena/2f242a1b-atlasia` | P3 İçerik & Saha | diff **boş** | ✅ aynen |
| `arena/f5d256c1-atlasia` | P4 Topluluk & Uyum | diff **boş** | ✅ aynen |
| `arena/b9e95263-atlasia` | P1 Temel & Kapanış | main'den **46 geride / 9 ileride** (diverged) | ⚠️ aşağıdaki not |

**P1 dalı notu:** 9 unique commit teslimat zinciri + P1 kodudur; anahtar
çıktılar (`feedMetrics.ts`, `appCheckConfig.ts`, `ensure-owner-places-index.mjs`,
hijyen/veri-kontratı testleri) main'de mevcut — iş main'e PR #17 yolundan
girmiş. Kayıp iş riski düşük; dal arşiv niteliğindedir, merge'i önerilmez
(46 commit geride). Küçük fark: daldaki `tests/firestore.rules.test.ts`
main'dekinden farklı (~133 satır) — P12'de karşılaştırmaya değer, kritik değil.

## 2. fd127f10 — yeni gelen asıl iş (arkadaşlık + grup katılma kodu)

İçerik: 3 commit main üzerinde — grup katılma kodu (`38f2d4a`), arkadaşlık
istek-kabul + tam ekran grup kurulumu + tazelik bildirimi (`65bd9a1`),
durum özeti/görev brief'leri (`e88c67f`). PR #19 açık.

### Kalite kapısı (bu denetimde bizzat koşuldu, /tmp ağacı)

| Komut | Sonuç |
|---|---|
| `npm ci` + `typecheck` + `lint` | ✅ yeşil |
| `npm run test:run` | ✅ **46 dosya / 234 test** (main 44/225; +2 dosya: friendships, userProfiles; +9 test) |
| `test:owner-index` / `audit:check` / `verify:social-metadata` | ✅ |
| `npm run build` | ✅ (büyük chunk uyarısı sürüyor) |
| `test:rules:emulator` | ❌ koşulamadı — Java 21 yok (bu ortamın engeli; teslimattan dürüst) |

### Teslimat dürüstlüğü

- `teslimat-arkadaslik.md` gerçek hesap smoke testi yapılmadığını açıkça
  yazıyor; rules "gevşetilmedi, yalnız eklendi" iddiası diff ile doğrulandı
  (mevcut match'lerde daraltma/koruma korunmuş, yeni bloklar eklenmiş).
- `MapView.tsx` ve `storage.rules` dokunulmamış (diff'de yok) ✅.
- `docs/gorevler/gorev-c1-webpush.md` "⚠️ ONAY BEKLİYOR" işareti taşıyor —
  C1 kuralı korunmuş ✅.

### Bulgular

**C1 — Rules'ta karşılıklı rıza bağlaması eksik (orta, güvenlik/bütünlük).**
- `friendships` create yalnızca `request.auth.uid in users` istiyor;
  bekleyen `friendRequest` varlığı `get()` ile doğrulanmıyor ve tek geçerli
  status `accepted`. Yani kötü niyetli istemci, karşı taraf istemeden de
  "kabul edilmiş arkadaşlık" belgesi üretebilir.
- `users/{uid}/friends` create izni `(uid==auth || friendUid==auth)`:
  herkes kendisini başkasının arkadaş listesine yazabilir.
Veri sızıntısı değil; sahte sosyal ilişki/spam yüzeyi. Kabul akışında
`friendRequest` belgesinin varlığına bağlanması (getAfter/get kontrolü)
önerilir.

**C2 — joinCode gücü ve deneme sınırı (orta).**
Kod aralığı `[0-9]{4,8}` (4 hane geçerli → ~10⁴ uzay). `joinAttempts`
yazımlarında rate-limit/kilit yok; grup ID'sini bilen oturumlu kullanıcı
kodu kaba kuvvetle deneyebilir. Minimum 6 hane + deneme sayacı/iptal
penceresi önerilir (uygulama maliyeti kullanıcı kararıyla).

**C3 — Yutan catch'ler arttı (düşük, kural ihlali).**
fd ağacında 6 adet `.catch(() => {})`: `GroupsPanel.tsx:95`,
`lib/friendships.ts:342,344` (removeFriend silmeleri — hata yutulursa
"arkadaş silindi" sanılabilir), `lib/groups.ts:292` fd işiyle gelmiş;
`contexts/AuthContext.tsx:67` ve `main.tsx:19` main'den miras.
(Önceki denetim raporunda blok-formu taraması zincir formunu kaçırmıştı;
düzeltme notu o rapora eklendi.)

**C4 — userProfiles okuma yüzeyi (bilgi).**
`allow get: if signedIn()` + `list` bounded(20): her oturumlu kullanıcı
displayName + photoURL okuyabilir. UID'siz seçim için bilinçli karar
(teslimatta gerekçeli), e-posta vb. hassas alan içermiyor.

**C5 — P10/P11 işi fd127f10'a commit'lenmemiş (bilgi, kayıp riski).**
fd diff'inde `MapView.tsx`, `src/utils/offlineCache.ts`, `public/sw.js`
**yok**. Kullanıcının anlattığı P10 (15 FPS) ve P11 (tam host/path
allowlist) işleri bu dalın commit'lerinde bulunmuyor — kirli çalışma
ağacındaysa kayıp riski taşır. Oturum sahibinin commit'leyip push'laması gerekir.

## 3. Önerilen sıra

1. PR #19 merge öncesi: C1 (rıza bağlaması) — rules + emulator testi (P12 ile birleştirilebilir).
2. C2: joinCode min 6 hane kararı kullanıcıda (eski gruplarla uyum: `joinCode` alanı main gruplarında yok; validGroupShape artık zorunlu tuttuğu için **main istemcisi bu rules ile grup oluşturamaz** — rules deploy'u ile istemci sürümü birlikte gitmeli).
3. C3: yutan catch'ler P16 içinde temizlenir (özellikle removeFriend hata gizleme).
4. P1 dalı: arşiv; dokunma. P2/P3/P4 dalları: main'e girmiş, ek iş yok.

## Denetim sınırları

- Rules emulator Java 21 yokluğu nedeniyle koşulamadı → rules bulguları statik inceleme düzeyinde.
- İki gerçek hesapla arkadaşlık/grup-kod akışı canlı denenmedi (teslimatta da beklemede işaretli).
- Merge/deploy/PR yorumu kullanıcı onayı olmadan yapılmadı; bu rapor yalnız denetimdir.
- `refs/denetim/*` ref'leri tekrar denetim için bırakıldı (çalışma ağacına etkisi yok).

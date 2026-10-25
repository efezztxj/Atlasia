# Atlasia — güncelleme mimarisi (web/PWA ve ileride masaüstü)

> **Karar özeti:** Atlasia bugün **GitHub → Cloudflare Pages** hattıyla yayınlanan bir
> web/PWA ürünüdür; Windows/macOS/Linux kurulum dosyası (.exe/.dmg/.AppImage) üretmez.
> Bu belge, (a) bugünkü güncelleme akışını, (b) build başına service worker
> damgasını ve (c) gerçek kurulum dosyası dağıtılmaya başlanırsa güncellemenin
> nasıl gönderileceğini kayda geçirir.

## 1. Bugünkü hat

```
branch + PR → CI (typecheck, lint, test, rules, build)
            → main merge → Cloudflare Pages otomatik build (`npm run build` → `dist`)
            → atomik deploy → kullanıcı açınca/yenileyince yeni sürüm
```

- `index.html` ve `sw.js` **`no-store`**, `/assets/*` hash'li ve `immutable`
  (`public/_headers`). Bu yüzden yeni build eski cache'e takılmaz.
- Service worker gezinmede **ağ-öncelikli**; internet yoksa son kabuk cache'ten gelir.
- Kayıtlı PWA “mağaza” üzerinden güncellenmez: aynı origin'i açtığı için web ile
  aynı anda güncellenir.
- Geri alma: Cloudflare Pages → Deployments → **Rollback** (saniyeler), veya
  sorunlu commit'i revert eden PR. Firestore kuralları ayrı hattır; sırası
  `docs/deploy-runbook.md` §3'tedir (önce istemci, sonra sıkılaşan kural).

## 2. Build başına service worker damgası

**Sorun:** Tarayıcı bir service worker'ı yalnızca `sw.js` baytları değiştiğinde
günceller. `public/sw.js` sabit olduğu için her deploy aynı dosyayı yayınlıyordu:

- `UpdateNotice` (“Yeni sürüm hazır”) çoğu deploy'da hiç görünmüyordu,
- eski hash'li kabuk dosyaları aynı `atlasia-shell-v7` cache'inde birikiyordu.

**Çözüm:** `scripts/stamp-sw.mjs` build sonunda `public/sw.js`'i `dist/sw.js`
olarak yazar ve **yalnız `CACHE` adını** `atlasia-shell-<build-id>` yapar.

| Konu | Davranış |
| --- | --- |
| Build kimliği | `CF_PAGES_COMMIT_SHA` → `GITHUB_SHA` → git kısa SHA → zaman damgası |
| Değişen tek şey | `CACHE` sabitinin değeri; kod bit-bit aynı (`verify:sw-shell` kilitler) |
| Sonuç | Her yeni build yeni SW → `waiting` → kullanıcıya sorulan “Yenile” akışı |
| Temizlik | `activate`, eski `atlasia-shell-*` cache'lerini siler (depolama şişmez) |
| Korunanlar | `atlasia-tiles-*` ve `atlasia-packs-*` (kullanıcının saha paketleri) silinmez |
| Kaynak | `public/sw.js` sabit kalır; `sw.node-test.mjs` ve `pwaManifest.test.ts` onu test eder |

Kapılar: `npm run build` → `postbuild` = `stamp:sw` → `bundle:budget` →
`verify:sw-shell`. Damgalanmamış veya kaynaktan farklı `dist/sw.js` build'i kırar.

**Sınır:** Aynı commit'in iki build'i aynı kimliği üretir; Vite çıktısı da
içerik-hash'li olduğu için o durumda güncellenecek bir şey yoktur.

## 3. Gerçek kurulum dosyası dağıtılırsa güncelleme nasıl gönderilir?

Üç yol var; güncelleme sorumluluğu yukarıdan aşağıya artar.

### 3.1 İnce sarmalayıcı (önerilen ilk adım, gerekirse)

Uygulama `https://atlasia.pages.dev` adresini kendi penceresinde açar.
**Güncelleme = web ile aynı**; updater, manifest, imza, kademeli dağıtım gerekmez.
Kazanç masaüstü kısayolu/tek pencere; kayıp çevrimdışı çalışma.
Şart: yalnız kendi origin'ine izin, dış bağlantılar sistem tarayıcısında,
`nodeIntegration: false`, izin isteklerinin elle onayı. Firebase **App Check**
(`src/lib/firebase.ts`) ve OAuth origin'e bağlı olduğu için sarmalayıcı uzak URL
yüklemeli; `file://` yüklemesi oturum/App Check akışını kırar.

### 3.2 Paketli uygulama + kendi güncelleme hattı (Tauri/Electron)

```
sürüm artır (semver) → CI matrisi (windows/macos/ubuntu) → kod imzala
→ güncelleme manifesti üret (Tauri: latest.json + .sig, Electron: latest.yml)
→ GitHub Releases / R2'ye yayınla
→ uygulama periyodik olarak manifesti sorar → indirir → imzayı doğrular
→ kullanıcıya sorar / sessiz kurar → yeniden başlatır
```

| Konu | Kural |
| --- | --- |
| İmza | macOS: Developer ID + notarization (yıllık ücret); olmadan otomatik güncelleme çalışmaz. Windows: Authenticode (SmartScreen). Linux: opsiyonel. Tauri ayrıca **minisign** ister; özel anahtar kaybı = kurulu kullanıcılara bir daha güncelleme gönderilemez |
| Yayın yeri | Repo public olduğu için GitHub Releases token gerektirmez |
| Kademeli dağıtım | `latest` bunu desteklemez; manifest kendi alan adında tutulup yüzde uygulanır |
| Zorunlu sürüm | Manifestte `minSupportedVersion` + uygulama içi kapı |
| Geri alma | Yayından kaldırmak **kurulu** istemciyi geri almaz: `N+1` düzeltme + uzak kapı |
| Eski istemci | Ömrü haftalara/aylara çıkar → geriye dönük uyumlu şema ve `deploy-runbook` §3 sırası zorunlu |

### 3.3 Mağaza (MS Store, Mac App Store, Flathub, winget, Homebrew)

Güncelleme hattını mağaza üstlenir; bedeli inceleme gecikmesi (acil düzeltme
1–7 gün), sandbox kısıtları ve platform başına ayrı paketlemedir.

## 4. Neden şimdilik masaüstü paketi yok

- `AGENTS.md`: “bu repo için güncel hedef native mağaza yayını değildir.”
- `ROADMAP.md` karar (e): önce web/PWA, sonra native (**Capacitor**).
- `AGENTS.md`: ücretli servis (kod imzalama, mağaza hesabı) **açık kullanıcı onayı**
  olmadan eklenmez; ajan deploy etmez.

Paketli sürüme geçilirse sıra: (1) sürümü tek kaynağa indir (bugün
`package.json` + `src/lib/feedback.ts` + testte sabit), (2) CI build matrisi
(pin politikası: `docs/github-actions-pins.md`), (3) imza bütçesi kararı,
(4) updater + `minSupportedVersion`, (5) kurulum-yükseltme test matrisi,
(6) yayın/geri alma runbook'u. Ayrıca `scripts/verify-env.mjs` yalnız Cloudflare
Pages production build'inde çalışıyor; masaüstü build'inde eksik `VITE_*`
değişkeni sessizce “cihaza özel hesap” moduna düşürür.

## 5. Bilinen sınırlar

- Kademeli dağıtım, kanal (stable/beta) ve “minimum desteklenen sürüm” kapısı yok.
- UI'da sürüm/build SHA gösterilmiyor; hangi sürümün kaç kullanıcıda olduğu
  yalnız Cloudflare deployment kaydından ve geri bildirimdeki `appVersion`'dan izlenir.
- `_headers` CSP allowlist'i sabittir; güncelleme kontrolü kendi alan adı dışında
  bir uca giderse `connect-src` ve `src/config/cloudflareHeaders.test.ts` birlikte güncellenir.

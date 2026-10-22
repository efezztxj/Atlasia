# Tur 5 · P4 promtu (hesap silme boşlukları, veri indirme, sosyal temizlik)

> Taban: PR #44 (`arena/237e8e1c-atlasia`), #40'ın tamamını ve rules test düzeltmesini içerir; CI'daki rules adımı dahil yeşil.
> Bu turda yalnız P4 çalışır. Aşağıdaki boşluklar koordinatör denetiminde kodda doğrulandı.

```text
ÖN SÖZ (kalıcı kurallar — hepsi bağlayıcı)
- Atlasia deposundasın (React 19 + Vite + MapLibre + Firebase PWA). Önce AGENTS.md,
  ROADMAP.md §4 ve docs/gorevler/calisma-kurallari.md'yi oku.
- Soru sorma. Karar gereken her yerde kendi önerini seç, uygula ve teslimatta
  "Varsayılan karar: … / gerekçe: …" diye yaz.
- Deploy yok: firebase deploy (rules/index dahil), Cloudflare ayarı, main'e merge
  yok. İş bitince commit + push + PR aç; merge'i denetçi yapar.
- Yalnız aşağıdaki SAHİP OLDUĞUN DOSYALAR'a yaz. Başka dosya gerekirse dokunma,
  teslimatta "dosya talebi" olarak yaz.
- firestore.rules gevşetilmez; yeni izin en dar haliyle eklenir ve emulator
  testiyle gelir. `as any`, boş catch, sessiz hata yutma yok. Başarısız kontrolü
  geçmiş gibi sunma; uydurma run ID/sayı yazma.
- Tasarım dili değişmez: koyu tema siyah, açık tema gerçek beyaz.
- Kapılar (PR öncesi hepsi): npm ci · npm run typecheck · npm run lint ·
  npm run test:run · npm run test:scripts · npm run build. Sandbox'ta Java yok:
  Rules emulator kanıtı CI'dan — `gh pr checks <no>` ve
  `gh api repos/efezztxj/Atlasia/actions/jobs/<job_id> -q '.steps[] | "\(.name): \(.conclusion)"'`.
  "Firestore security rules tests" adımı yeşil olmadan PR hazır değildir.
  CI logu indirilemez; rules testi düşerse test dosyasını kurallarla satır satır
  karşılaştır (Tur 4'teki iki hata böyle bulundu: üye olmayanın okuma beklentisi
  ve eksik alanla tohumlanmış rota belgesi). Tohum belgeleri tam şemayla yaz.
- Teslimat: docs/teslimatlar/teslimat-p4-tur5.md (commit listesi, komut
  çıktıları, CI job ID'leri, varsayılan kararlar, dosya talepleri, açık
  kalanlar) + sonda `git diff --check` ve `git status --short`.
- PR başlığı: "[P4] Tur 5 — hesap silme boşlukları + veri indirme + sosyal temizlik (Supersedes #44)".

TABAN: `git fetch origin '+refs/heads/arena/237e8e1c-atlasia:refs/remotes/origin/arena/237e8e1c-atlasia'`
sonra o daldan başla ve `origin/main`'i içine merge et (rebase/force-push yok).
#44'ü kapatma. #37 ve #19'u kapatma (denetçi kapatır).

SAHİP OLDUĞUN DOSYALAR (bu tur): firestore.rules, firestore.indexes.json,
tests/firestore.rules.test.ts, src/lib/moderation*, groups*, friendships*,
userProfiles*, notifications*, feedback*, src/hooks/useBlocks*,
src/components/ProfilePanel*, FeedbackDialog*, GroupsPanel*, SocialPanel*,
ReportDialog*, yeni: src/lib/accountExport.ts (+test).
YAZMA: legal.ts, AccountAccess, LegalNotice (P1); routeData, useCollections,
firestoreData (P2/P3); vite.config.ts, package.json.

GÖREVLER (sırayla; her biri ayrı commit):
1. Cihaz hesabı silinemiyor (kesin hata): deleteAccount önce deleteUserData'yı
   çağırıyor, o da requireDb() ile başlıyor. Firebase yapılandırılmamış derlemede
   "Firestore hazır değil" fırlatıyor. Firebase'li derlemede `backend === "device"`
   hesap ise Firestore'a oturumsuz sorgu atıp permission-denied alıyor. Sonuç: cihaz
   hesabı hiçbir zaman silinemiyor. Düzelt: cihaz hesabında yalnız yerel veri +
   deleteDeviceAccount; Firebase hesabında mevcut akış. Hangi yolun seçildiği
   kullanıcının backend'inden belirlensin, firebaseApp'in varlığından değil.
   Test: iki yol için ayrı birim testi.
2. Silme sonrası Auth hatası (veri gitti, hesap kaldı): deleteUser
   auth/requires-recent-login fırlatabilir. Şu an bu, veriler silindikten SONRA
   oluyor. Düzelt: veri silmeden ÖNCE yeniden kimlik doğrulama iste (e-posta+şifre
   hesabında ProfilePanel onay penceresine şifre alanı +
   reauthenticateWithCredential). Doğrulama başarısızsa hiçbir şey silinmez.
   Türkçe hata metni. Test: reauth başarısız → deleteUserData çağrılmaz.
3. Silme kapsamı boşlukları (moderation.ts → deleteUserData):
   a) users/{uid}/blocks alt koleksiyonu silinmiyor (OWN_SUBCOLLECTIONS'ta yok).
   b) Kullanıcının başkalarının gönderilerine yazdığı posts/*/replies silinmiyor.
      Collection-group sorgusu (authorUid == uid, sayfalı) + gerekirse
      firestore.indexes.json'a fieldOverride + rules'ta replies için en dar
      collection-group list izni (yalnız authorUid == auth.uid, boundedList).
      Emulator testi: kendi yanıtını listeler/siler, başkasınınkini listeleyemez.
   c) leaveOrDeleteGroups grup indeksinin yalnız ilk sayfasını (50) işliyor;
      drainQuery desenine çevir.
   d) groups/*/joinAttempts/{uid} kişisel veridir ama rules delete:false. Sayaç
      atlatılmasın diye: delete yalnız kendi belgesi + kilit penceresi dolmuşsa
      (windowStart + 15 dk < request.time) izinli olsun. Hesap silmede pencere
      dolmamış kayıtlar teslimatta "açık kalan" olarak raporlansın (silinemez,
      sayaç kötüye kullanımını önlemek bilinçli). Emulator testleri.
   e) groups/*/invites/{uid}: kullanıcıya gelen davetleri sil (aynası
      users/{uid}/groupInvites'ten groupId okunarak).
   Her biri moderation.io.test'te kapsansın; adım raporu yeni adımları içersin.
4. Veri indirme (KVKK md.11 erişim hakkı; kodda yok): ProfilePanel'de "Verilerimi
   indir" düğmesi. Yeni src/lib/accountExport.ts: deleteUserData'nın kapsadığı
   kullanıcının kendi koleksiyonlarını okuyup tek JSON dosyası üretsin (şema
   sürümü, oluşturma zamanı, koleksiyon başına dizi). Firestore Timestamp → ISO
   metin. Başkasının verisi yok: grup mesajlarında yalnız kendi mesajları,
   arkadaşlıkta yalnız karşı uid ve ad. Sayfalı okuma, okuma hatası yutulmaz
   (kısmi dosya üretme, hata göster). Cihaz hesabında yerel veriden üretir.
   Test: alan seçimi, Timestamp dönüşümü, hata durumu.
5. P18 dosya talepleri (P1 denetiminden, sahibi sensin):
   SocialPanel yorum girdisine odak stili + placeholder kontrastı (≥4,5:1);
   GroupsPanel mesaj girdisine aria-label="Gruba mesaj yaz".
6. Grup silinince yetim mesajlar: sahibi grubu silerken önce
   groups/{id}/messages'ı sayfalı silebilsin. Rules: messages delete'e
   "grup sahibi" dalı ekle (yalnız get(groups/{id}).data.ownerUid == auth.uid).
   deleteGroup bu sırayı izlesin. Emulator testi: sahip başkasının mesajını
   siler; üye silemez.

KAPSAM DIŞI: yasal metin değişikliği (P1), App Check enforcement, rules/index
deploy, Cloud Functions, XP/rozet.

KABUL: CI'da rules adımı dahil tüm adımlar yeşil; cihaz hesabı silinebiliyor;
reauth başarısızsa veri silinmiyor; 3a–e testli; "Verilerimi indir" JSON üretiyor
ve testli; PR açık + "Supersedes #44". Teslimatta: rules değişikliği
deploy gerektirir notu ve deploy SIRASI (önce rules + index, sonra merge).
```

# -*- coding: utf-8 -*-
"""Paket-01 metin hattı: captions.md + pano.html tek kaynaktan.
Çalıştır: python3 reklam/uretim/paket-01/uret.py
"""
import os, html

BASE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://atlasia.pages.dev/"

VIDEOLAR = {
 "T1": "videolar/video-t1-uydudan-dus.mp4",
 "D1": "videolar/video-d1-indirmeden-ac.mp4",
 "D2": "videolar/video-d2-goreme-1gun.mp4",
 "T2": "videolar/video-t2-nereye-gidelim.mp4",
 "U1": "videolar/video-u1-iz-birak.mp4",
 "T3": "videolar/video-t3-evinden-15dk.mp4",
 "I3": "videolar/video-i3-altin-saat.mp4",
 "U2": "videolar/video-u2-24-saat.mp4",
}

def link(source, medium, campaign, content, tab="kesfet"):
    return (f"{SITE}?tab={tab}&utm_source={source}&utm_medium={medium}"
            f"&utm_campaign={campaign}&utm_content={content}")

ICERIK = [
 dict(
  id="T1", gun="Gün 1 · 1 Kas Pazar", baslik="Uydudan Düş 01 — kyoto", tip="Video (Reels + TikTok)",
  gorsel=["gorseller/kapak-t1-uydudan-dus.jpg"],
  link_ig=link("instagram", "reels", "uydudan-dus", "kyoto-01"),
  link_tt=link("tiktok", "video", "uydudan-dus", "kyoto-01"),
  senaryo="Küre döner → uyduyla Fushimi İnari'ye iniş (son 2 sn yavaşla) → pin açılır: '10.000 kapı var' → kapanış: rotası profilde.",
  tt="""kyoto'da kalabalığın bittiği yeri bulduk 👀
Fushimi İnari'de 10.000 kapı var ama herkes ilk 200 metrede kalıyor. 30 dakika yukarı çık: kalabalık bitiyor, kyoto ayağının altında.
İnmeden önce tahminin neydi? Yoruma yaz 👇 sıradaki iniş nereye olsun?

#kyoto #fushimiinari #japonya #gezi #atlasia #200metre""",
  ig="""10.000 kapı var. Herkes aynı 200 metrede kalıyor. ⛩️

Uydudan indik: Fushimi İnari, kyoto.
Asıl sır aşağıda değil — 30 dakika yukarı çıkınca kalabalık bitiyor, şehir ayağının altına seriliyor.

🚶 Rotası (durak durak, saatiyle) profildeki linkte.
Uygulama indirmiyorsun, üyelik açmıyorsun — harita direkt açılıyor.

Sen olsan yukarı kadar çıkar mıydın, ilk kapılarda döner miydin? 👇""",
  ig_tags="#kyoto #fushimiinari #japonya #japantravel #gezi #seyahat #gezgin #keşfet #atlasia #200metre #uydudandüş #travelgram",
  yorum="Doğru tahmin edenleri sabitliyoruz 📌 Sıradaki iniş için şehir önerin, en çok istenene iniyoruz.",
  story="Yeni iniş yayında 🛰️ Burası neresiydi, bildin mi? (anket: Bildim / Sonda anladım)"),
 dict(
  id="I1", gun="Gün 2 · 2 Kas Pazartesi", baslik="Gitmeden Önce Bil — Pamukkale (carousel)", tip="Carousel (IG + TikTok fotoğraf modu)",
  gorsel=[f"gorseller/pamukkale-carousel/slayt-{i}.jpg" for i in range(1, 8)],
  link_ig=link("instagram", "carousel", "gitmeden-once-bil", "pamukkale"),
  link_tt=link("tiktok", "photo", "gitmeden-once-bil", "pamukkale"),
  senaryo="7 slayt: kapak + 5 ipucu + CTA. TikTok'ta fotoğraf moduyla aynı görseller, ilk görsele uygulama içi yazıyla 'kaydır' ekle.",
  tt="""Pamukkale'ye gitmeden önce bilmen gereken 5 şey (kaydet, gidince açarsın) 📌
1) Yarım gün ayır — Hierapolis aynı yamaçta
2) Gün batımında git — ışık turkuvaza döner
3) Yalınayak yürüyeceksin
4) Beyazın üstünde bir kent var
5) Antik havuz hâlâ ılık

Sıralı rotası profilde. Gidenler: sizin 1 numaranız ne? 👇

#pamukkale #denizli #hierapolis #gezi #atlasia #seyahat""",
  ig="""Pamukkale'ye gitmeden önce bil: 5 şey 🤍 Kaydet — gidince açarsın.

Beyaz görünüyor ama hikâye beyazda değil; üstündeki antik kentte, ışıkta ve saatinde.
Slaytlarda hepsi var: kaç saat, hangi ışık, neden yalınayak, antik havuz gerçeği.

🗺️ Sıralı yürüyüş rotası profildeki linkte — indirme yok, harita direkt açılıyor.

Birlikte gideceğin kişiye gönder, plan sizden önce hazır olsun ✈️""",
  ig_tags="#pamukkale #hierapolis #denizli #türkiye #gezi #seyahat #gezilecekyerler #antikkent #keşfet #atlasia #200metre #travelturkey",
  yorum="Sizden gelen en iyi Pamukkale ipucunu yarın story'de paylaşıyoruz. Yazın 👇",
  story="Pamukkale kartları yayında 🤍 Kaydet, gidince beni hatırla (link çıkartması)"),
 dict(
  id="D1", gun="Gün 3 · 3 Kas Salı", baslik="İndirmeden Aç", tip="Video (Reels + TikTok) · 10 sn ekran kaydı",
  gorsel=["gorseller/kapak-d1-indirmeden-ac.jpg"],
  link_ig=link("instagram", "reels", "indirmeden-ac", "globe"),
  link_tt=link("tiktok", "video", "indirmeden-ac", "globe"),
  senaryo="Bio linkine dokun → küre açılır (misafir modu) → 3 saat + yürüyorum + tarih → rota çizilir. Hepsi gerçek ekran kaydı, hızlandırma yok hissi için 1,25x.",
  tt="""Uygulama indirmedim. Üyelik açmadım. Haritadayım. 🌍
Atlasia: linke dokun, küre açılsın. 28 seçilmiş nokta, 4 antik kent sesli turu — ücretsiz, reklam yok.
Deneyip kaç saniyede açıldığını yoruma yaz ⏱️

#gezi #harita #seyahat #atlasia #rota #kesfet""",
  ig="""İndirmeden açılan harita gördün mü? 🌍

Dokun → küre açılıyor → zamanını seçiyorsun → rotan hazır.
Uygulama yok, üyelik yok, reklam yok. Misafir gibi gir, gezgin gibi gez.

28 seçilmiş nokta · 4 antik kent sesli turu · varış saatinde hava durumu

Link profilde. Açılış süreni ölçüp yoruma bırak ⏱️ rekabet başlasın 👇""",
  ig_tags="#atlasia #gezi #seyahat #harita #rota #gezgin #keşfet #seyahatönerisi #dünyayıkeşfet #travelturkey #200metre #ücretsiz",
  yorum="En hızlı açılışı yapanı sabitliyoruz 📌 (cihazını da yaz, dürüst olalım)",
  story="10 saniyelik meydan okuma ⏱️ Linke dokun, harita kaç saniyede açılıyor? (link çıkartması)"),
 dict(
  id="D2", gun="Gün 4 · 4 Kas Çarşamba", baslik="Sor, Rota Gelsin — Göreme'de 1 gün", tip="Video (Reels + TikTok)",
  gorsel=["gorseller/kapak-d2-goreme-1gun.jpg"],
  link_ig=link("instagram", "reels", "sor-rota-gelsin", "goreme-1gun"),
  link_tt=link("tiktok", "video", "sor-rota-gelsin", "goreme-1gun"),
  senaryo="Soru kadrajda yazar → harita üstünde gün planı saniye saniye akar: gün doğumu Aşk Vadisi sırtı → müze/vadi → gün batımı. Soru cümlesini videoda sesli de söyle (arama için).",
  tt="""Göreme'de 1 günde ne yapılır? 🎈 (sepete binmeden plan)
Herkes 05.30'da kalkıp sepete biniyor; Aşk Vadisi sırtından aynı gökyüzü bedava izleniyor. Sonra vadi, sonra gün batımı — sıra videoda, rotası profilde.
Kapadokya'ya gidenler: 1 güne ne eklerdiniz? 👇

#kapadokya #goreme #cappadocia #gezi #atlasia #travelturkey""",
  ig="""Göreme'de 1 günün var. Plan hazır 🎈

Gün doğumunda balonları Aşk Vadisi sırtından izle — araba yok, kalabalık yok, aynı gökyüzü.
Sonra vadiler, sonra ışık yumuşarken son durak. Sıralı hâli videoda, haritalı hâli profildeki linkte.

Kaydet: Kapadokya bileti alınca ilk bu açılacak 📌
Sen sepete biner miydin, sırttan mı izlerdin? 👇""",
  ig_tags="#kapadokya #goreme #cappadocia #balon #peribacaları #gezi #seyahat #gezilecekyerler #keşfet #atlasia #200metre #travelturkey",
  yorum="Sepet ekibi mi sırt ekibi mi? Tarafını seç 👇 kaybeden ekip bir sonraki videoda kendini savunsun",
  story="Sepete binmek mi, sırttan izlemek mi? 🎈 (anket) — Göreme planı yayında"),
 dict(
  id="I2", gun="Gün 5 · 5 Kas Perşembe", baslik="Aynı Şehir, 3 Zaman — Efes (carousel)", tip="Carousel (IG + TikTok fotoğraf modu)",
  gorsel=[f"gorseller/efes-carousel/slayt-{i}.jpg" for i in range(1, 6)],
  link_ig=link("instagram", "carousel", "ayni-sehir-3-zaman", "efes"),
  link_tt=link("tiktok", "photo", "ayni-sehir-3-zaman", "efes"),
  senaryo="5 slayt: kapak + 1 saat imza üçlü + 3 saat gerçek tur sırası (09.00 Magnesia → 11.50 Büyük Tiyatro, 10 durak/2,1 km) + 'neden bu sıra?' + CTA.",
  tt="""Efes'te 1 saatin mi var, 3 saatin mi? Plan değişir 🏛️ (kaydet)
1 saat: Celsus → Mermer Cadde → Büyük Tiyatro
3 saat: 09.00 Magnesia Kapısı'ndan gir, yokuş aşağı 10 durak, 11.50 Büyük Tiyatro'da bitir. Tam liste slaytta.
Sıra neden böyle? Son slaytta. Rotası profilde 👇

#efes #ephesus #izmir #antikkent #gezi #atlasia""",
  ig="""Efes'te zamanın kaç saat? 🏛️ Planını ona göre veriyoruz — kaydet, kapıda açarsın.

⏱️ 1 saat: imza üçlü (Celsus, Mermer Cadde, Büyük Tiyatro)
🗺️ 3 saat: Atlasia'nın gerçek tur sırası — 10 durak, 2,1 km, 09.00 Magnesia Kapısı → 11.50 Büyük Tiyatro
Son slaytta işin sırrı var: neden üst kapıdan girip yokuş aşağı bitiriyorsun?

Haritalı, saatli hâli profildeki linkte. İndirme yok.
Efes'e daha önce gidenler: hangi durakta en çok oyalandınız? 👇""",
  ig_tags="#efes #ephesus #efesantikkenti #selçuk #izmir #celsuskütüphanesi #antikkent #tarih #gezi #seyahat #keşfet #atlasia #200metre",
  yorum="Celsus mu Büyük Tiyatro mu? Efes'in imza karesi sizce hangisi? 📸",
  story="Efes'te kaç saatin var? (anket: 1 saat / 3 saat) — planın hazır, yayında"),
 dict(
  id="T2", gun="Gün 6 · 6 Kas Cuma", baslik="Nereye Gidelim Kavgası", tip="Video (Reels + TikTok)",
  gorsel=["gorseller/kapak-t2-nereye-gidelim.jpg"],
  link_ig=link("instagram", "reels", "nereye-gidelim", "grup"),
  link_tt=link("tiktok", "video", "nereye-gidelim", "grup"),
  senaryo="Grup sohbeti hızlı akar (ekran görüntüsü stili) → biri altın baloncukla rota linki atar → kesme: ekip sokakta yürüyor. Son yazı: 'Karar 1 link sürdü.'",
  tt="""3 saat mesajlaştık. Hâlâ evdeydik. 😭
"nereye gidelim" "sen söyle" "bana fark etmez"... tanıdık geldi mi?
Sonunda biri gruba hazır rota linki attı: 3 saat, 7 durak, karar bitti.
Grubunuzun "bana fark etmez"cisini etiketleyin 👇 o kişi bu videoyu görmeli

#gezi #arkadasgrubu #rota #atlasia #komik #kesfet""",
  ig="""Bu sohbet her hafta sonu yaşanıyor, itiraf edin 😅

3 saat mesajlaşma, sıfır karar, akşam evde çay.
Ta ki biri gruba tek link atana kadar: saatlik plan, sıralı duraklar, herkes aynı haritada.

Cumartesi planınızı kurtarın: rotayı çiz, linki gruba at, çıkın 🚶 Link profilde.

Sizin grupta kararı kim veriyor — etiketle, görevi resmileşsin 👇""",
  ig_tags="#gezi #haftasonu #arkadaşlar #rota #seyahat #şehirhayatı #keşfet #atlasia #200metre #cumartesi #plan #istanbul",
  yorum="Etiketlenen kişi bu hafta rotayı çizmek zorunda, kurallar böyle 😎",
  story="Bu cumartesi karar kimde? (anket: Ben / Yine ben) 😅 rota linki burada"),
 dict(
  id="U1", gun="Gün 7 · 7 Kas Cumartesi", baslik="1 İz Bırak — meydan okuma", tip="Video (Reels + TikTok) + UGC çağrısı",
  gorsel=["gorseller/kapak-u1-iz-birak.jpg"],
  link_ig=link("instagram", "reels", "1-iz-birak", "lansman", tab="iz-birak"),
  link_tt=link("tiktok", "video", "1-iz-birak", "lansman", tab="iz-birak"),
  senaryo="Kurucu/ekip kameraya şehrinde 1 iz bırakır (pin + tek cümle not) → 'sıradaki sen' → her hafta en iyi 3 iz tek videoda okunur.",
  tt="""Şehrinde haritada yazmayan 1 yeri söyle. Ben başlıyorum 📍
Rehber kitaplarında olmayan, sadece oradan geçenlerin bildiği yerler... Biz ilk izi bıraktık, sıra sende.
#1izbirak ile düet yap ya da Atlasia'da pin'ini bırak: en iyi 3 izi her hafta tek videoda okuyoruz.
Şehrini yoruma yaz, bakalım hangi şehir daha gizli 👇

#izbirak #gezi #gizliyeler #atlasia #kesfet #sehir""",
  ig="""Meydan okuma başladı: ŞEHRİNDE 1 İZ BIRAK 📍

Haritada yazmayan, rehberde geçmeyen ama "iyi ki gitmişim" dediğin o yer...
Tek cümlelik bir notla Atlasia'ya bırak: "Kapıdan girme, sağdan dolan. 10 dk." gibi.

Her hafta en iyi 3 izi tek videoda okuyup bırakanları etiketliyoruz 🏅
İlk iz bizden — seninki hangi şehirden olacak? Link profilde (iz bırakma ekranı direkt açılıyor).""",
  ig_tags="#1izbirak #atlasia #200metre #gezi #kesfet #gizliyerler #şehir #gezgin #seyahat #türkiye #meydanokuma #harita",
  yorum="Şehrini + yerin tek cümlelik ipucunu yaz 👇 en gizli şehir kapışması başlasın",
  story="1 iz bırak meydan okuması başladı 📍 Şehrinin gizli yerini söyle (soru çıkartması)"),
 dict(
  id="T3", gun="Gün 8 · 8 Kas Pazar", baslik="Evinden 15 Dakika — Galata & Haliç", tip="Video (Reels + TikTok)",
  gorsel=["gorseller/kapak-t3-evinden-15dk.jpg"],
  link_ig=link("instagram", "reels", "evinden-15dk", "galata"),
  link_tt=link("tiktok", "video", "evinden-15dk", "galata"),
  senaryo="Haritada 15 dakikalık halka → Galata'dan Haliç'e 3 durak hızlı kesme → Karaköy'de çay → kapanış: 'Turist olmana gerek yok. 15 dakikan var.'",
  tt="""İstanbul'da yaşıyorsun ama bu yürüyüşü hiç yapmadın 🚶
Evinden 15 dakika: Galata'dan Haliç'e bak, Karaköy'de çayını iç, köprüye yürü. Uçak bileti yok, bahane yok.
Senin evinden 15 dakika nereye çıkıyor? Yoruma mahalleni yaz, sıradaki bölümü oradan çekelim 👇

#istanbul #galata #karaköy #gezi #atlasia #200metre""",
  ig="""Evinden 15 dakika. Hiç gitmedin. 🚶

Kendi şehrinde turist olma turu: Galata'dan Haliç'e bakış, Karaköy'de bir çay molası, köprüye yürüyüş.
15 dakikalık halkanın içinde koca bir rota varmış — haritası profildeki linkte.

Bu pazar deneyip story'de bizi etiketleyenleri paylaşıyoruz 📸
Sıradaki "15 dakika" hangi mahalle olsun? 👇""",
  ig_tags="#istanbul #galata #galatakulesi #karaköy #haliç #şehir #yürüyüş #gezi #keşfet #atlasia #200metre #haftasonu",
  yorum="Mahalleni yaz, en çok istenen yer sıradaki 15 dakika bölümü olsun 👇",
  story="Bugün 15 dakikan var mı? 🚶 Galata rotası yayında (link çıkartması)"),
 dict(
  id="I3", gun="Gün 9 · 9 Kas Pazartesi", baslik="Altın Saate Yetiş — Pamukkale", tip="Video (Reels + TikTok)",
  gorsel=["gorseller/kapak-i3-altin-saat.jpg"],
  link_ig=link("instagram", "reels", "altin-saat", "pamukkale"),
  link_tt=link("tiktok", "video", "altin-saat", "pamukkale"),
  senaryo="Geri sayım çipi ekranda → rota son durağı altın saate ayarlar → yürüyüş hızlanır → gün batımı karesinde dur. Kapanış: 'Atlasia hesaplıyor, sen yürü.'",
  tt="""Gün batımına 47 dakikan var. Son durağa yetişir misin? 🌅
Pamukkale'de gün batımında ışık turkuvaza döner — mesele o ana doğru yerde olmak.
Atlasia altın saati hesaplayıp rotanın son durağını ışığa denk getiriyor. Sen sadece yürü.
Altın saat avcıları: en iyi gün batımı noktanız neresi? 👇

#pamukkale #gunbatimi #altinsaat #gezi #atlasia #fotograf""",
  ig="""Gün batımına 47 dakika 🌅

Fotoğraf aynı yerde çekilir ama ışık her saat aynı olmaz.
Atlasia altın saat aralığını hesaplıyor; rotanın son durağını tam o ışığa denk getiriyorsun.
Pamukkale'de beyaz, turkuvaz ve altın aynı karede buluşuyor.

Bu ışığı kiminle izlemek isterdin? Gönder, plan başlasın ✈️
Haritalı rota profilde.""",
  ig_tags="#pamukkale #günbatımı #altınsaat #goldenhour #denizlİ #gezi #seyahat #fotoğraf #keşfet #atlasia #200metre #traverten",
  yorum="Altın saatte en güzel yer sizce neresi? 📸 En iyisini sıradaki bölümde gidiyoruz",
  story="Bugün altın saat kaçta biliyor musun? 🌅 (anket: Biliyorum / Atlasia söylesin)"),
 dict(
  id="U2", gun="Gün 10 · 10 Kas Salı", baslik="24 Saat İzi — Venedik Cannaregio", tip="Video (Reels + TikTok) + Story devamı",
  gorsel=["gorseller/kapak-u2-24-saat.jpg"],
  link_ig=link("instagram", "reels", "24-saat-izi", "venedik"),
  link_tt=link("tiktok", "video", "24-saat-izi", "venedik"),
  senaryo="24 saatlik hikâye izi bırakılır (geri sayım çipi) → ipucu okunur → kanal boyu yürüyüş → ertesi gün 'iz silindi' story follow-up'ı ile seri bağlanır.",
  tt="""Bu not yarın haritada olmayacak ⏳
Bir gezgin Venedik'te 24 saatlik bir iz bıraktı: herkes Rialto'da sıkışırken Cannaregio'ya 40 dakika yürü, kanal aynı kanal kalabalık yok.
Atlasia'da bazı izler 24 saat yaşıyor — silinmeden git, gör.
Böyle geçici ipuçlarını sever misiniz, kalıcı mı olsun? 👇

#venedik #venice #italya #gezi #atlasia #200metre""",
  ig="""Bu not yarın haritada olmayacak ⏳

Venedik'te bir gezginin bıraktığı 24 saatlik iz:
"Herkes Rialto'da sıkışıyor. Cannaregio'ya yürü — 40 dakika, kalabalık yok."

Bazı ipuçları kalıcı olmamalı; tam zamanında, tam yerinde güzeller.
Atlasia'da 24 saatlik izler var. Süresi dolmadan yakala — link profilde.

Kaydet 📌 Venedik planı yapan arkadaşına göndermeyi unutma.""",
  ig_tags="#venedik #venice #cannaregio #italya #italy #gezi #seyahat #avrupa #keşfet #atlasia #200metre #travelitaly",
  yorum="24 saatlik ipucu mu, sonsuza kadar kalan not mu? Tarafını seç 👇",
  story="⏳ Dünün izi silindi. Bugünün izi hangi şehirde olsun? (soru çıkartması)"),
]

# ---------- captions.md ----------
def build_md():
    L = []
    L.append("# Paket-01 · Kopyala-yapıştır açıklamalar (Instagram + TikTok)")
    L.append("")
    L.append("> Kullanım: bloğun tamamını kopyala → yapıştır → yayınla. Instagram'da hashtag'leri "
             "ister açıklama sonuna ister **ilk yoruma** koy (önerilen: ilk yorum, açıklama temiz kalır). "
             "Link profilde; Story'de link çıkartmasına o içeriğin UTM'li bağlantısını yapıştır.")
    L.append("> Saat: IG 19.00 · TikTok 20.00. Mevcut yürüyüş kuyruğu 31 Ekim'de bitiyor; bu paket **1 Kasım**'da başlar.")
    L.append("")
    for c in ICERIK:
        L.append(f"---\n\n## {c['id']} · {c['baslik']} — {c['gun']}")
        L.append(f"**Tür:** {c['tip']}  \n**Görsel:** {' · '.join(c['gorsel'])}")
        if c["id"] in VIDEOLAR:
            L.append(f"**Video:** {VIDEOLAR[c['id']]} (seslendirmeli, yayına hazır) · Altyazı: {VIDEOLAR[c['id']].replace('.mp4', '.srt')}")
        L.append(f"**Link (IG story/bio):** {c['link_ig']}  \n**Link (TikTok bio):** {c['link_tt']}")
        L.append("\n### TikTok açıklaması\n\n```text\n" + c["tt"] + "\n```")
        L.append("\n### Instagram açıklaması\n\n```text\n" + c["ig"] + "\n```")
        L.append("\n**Instagram hashtag (ilk yorum):**\n\n```text\n" + c["ig_tags"] + "\n```")
        L.append("\n**Sabitlenecek ilk yorum:**\n\n```text\n" + c["yorum"] + "\n```")
        L.append("\n**Story metni:** " + c["story"])
        L.append("")
    L.append("""---

## Hashtag bankası (yeni şehirlerde hazır)

**Çekirdek (her gönderide 3–4'ü):** #atlasia #200metre #gezi #seyahat #keşfet #rota #harita #gezgin

| Yer | Hashtagler |
|---|---|
| kyoto / Fushimi İnari | #kyoto #fushimiinari #japonya #japantravel |
| Kapadokya / Göreme | #kapadokya #göreme #cappadocia #balon #peribacaları |
| Pamukkale / Hierapolis | #pamukkale #hierapolis #denizli #traverten |
| Efes / Selçuk | #efes #ephesus #efesantikkenti #selçuk #izmir #celsuskütüphanesi |
| İstanbul / Galata | #istanbul #galata #galatakulesi #karaköy #haliç |
| Venedik | #venedik #venice #cannaregio #italya #travelitaly |

**Kural:** TikTok'ta toplam 5–6 hashtag + açıklama içinde arama cümlesi ("X'de ne yapılır?").
Instagram'da çekirdek + yer seti ilk yorumda. Her gönderide aynı 30 hashtagi tekrarlama;
**#atlasia + #200metre** sabit, gerisi yere göre.
""")
    open(os.path.join(BASE, "captions.md"), "w", encoding="utf-8").write("\n".join(L))
    print("captions.md OK")

# ---------- pano.html ----------
CSS = """
*{box-sizing:border-box} body{margin:0;background:#020D17;color:#F1F0E9;font-family:'DM Sans',system-ui,sans-serif}
header{padding:48px 6vw 8px} h1{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:clamp(30px,5vw,54px);margin:0 0 8px}
h1 b{color:#F3C870} .sub{color:#B4BEC6;max-width:70ch;line-height:1.55}
main{padding:24px 6vw 80px;display:grid;gap:56px}
.card{background:#071726;border:1px solid #12314a;border-radius:22px;padding:28px}
.card h2{margin:0 0 4px;font-size:26px}.meta{color:#F3C870;font-weight:700;letter-spacing:.04em;font-size:13px;text-transform:uppercase}
.grid{display:grid;grid-template-columns:minmax(240px,340px) 1fr;gap:28px;margin-top:18px}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
.imgs{display:flex;flex-wrap:wrap;gap:10px}.imgs img{width:100%;max-width:340px;border-radius:14px;border:1px solid #1b3d5a}
.imgs.multi img{width:calc(50% - 5px)}
.imgs video{width:100%;max-width:340px;border-radius:14px;border:1px solid #1b3d5a;background:#000}
pre{white-space:pre-wrap;background:#03101d;border:1px solid #12314a;border-radius:12px;padding:16px;font-size:14.5px;line-height:1.55;color:#E8EAE6}
h3{margin:20px 0 8px;font-size:15px;color:#7EE0B8;text-transform:uppercase;letter-spacing:.06em}
button{background:#F3C870;color:#020D17;border:0;border-radius:999px;padding:9px 18px;font-weight:800;cursor:pointer;margin:2px 6px 2px 0}
button:active{transform:scale(.97)} a{color:#F3C870;word-break:break-all}.small{color:#B4BEC6;font-size:13.5px;line-height:1.5}
table{border-collapse:collapse;width:100%;font-size:14.5px}td,th{border-bottom:1px solid #12314a;padding:9px 8px;text-align:left}
th{color:#F3C870} .pill{display:inline-block;background:#0b2b44;border-radius:999px;padding:3px 12px;font-size:12.5px;margin-right:6px}
"""

def build_html():
    P = []
    P.append('<!doctype html><html lang="tr"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1">'
             '<title>Atlasia · Paket-01 Instagram + TikTok Panosu</title>'
             '<link rel="preconnect" href="https://fonts.googleapis.com">'
             '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=DM+Sans:wght@400;600;800&display=swap" rel="stylesheet">'
             f'<style>{CSS}</style></head><body>')
    P.append('<header><h1>Atlasia <b>Paket-01</b> · Instagram + TikTok</h1>'
             '<p class="sub">10 içerik, 20 görsel, <b>8 seslendirmeli video</b>, kopyala-yapıştır açıklamalar. '
             'Yayın: <b>1–10 Kasım</b>, IG 19.00 · TikTok 20.00. Her kartta "Kopyala" çalışmazsa metni seçip elle kopyala — bloklar seçim için hazır.</p></header>')
    P.append('<main><section class="card"><h2>Yayın takvimi</h2><table><tr><th>Gün</th><th>İçerik</th><th>Tür</th></tr>')
    for c in ICERIK:
        P.append(f"<tr><td>{html.escape(c['gun'])}</td><td>{c['id']} · {html.escape(c['baslik'])}</td><td>{html.escape(c['tip'])}</td></tr>")
    P.append('</table><p class="small">Not: mevcut yürüyüş videoları kuyruğu (kyoto/Göreme/Venedik/Pamukkale) 31 Ekim\'de bitiyor; bu paket çakışmadan devam eder.</p></section>')
    for c in ICERIK:
        vtag = (f'<video controls preload="metadata" poster="{c["gorsel"][0]}" src="{VIDEOLAR[c["id"]]}"></video>' if c["id"] in VIDEOLAR else "")
        imgs = vtag + "".join(f'<img loading="lazy" src="{g}" alt="{html.escape(c["baslik"])}">' for g in c["gorsel"])
        multi = " multi" if len(c["gorsel"]) > 1 else ""
        P.append(f'<section class="card"><div class="meta">{c["id"]} · {html.escape(c["gun"])} · {html.escape(c["tip"])}</div>'
                 f'<h2>{html.escape(c["baslik"])}</h2>'
                 f'<div class="grid"><div class="imgs{multi}">{imgs}</div><div>')
        P.append(f'<h3>Kısa senaryo</h3><p class="small">{html.escape(c["senaryo"])}</p>')
        for label, key in [("TikTok açıklaması", "tt"), ("Instagram açıklaması", "ig")]:
            t = html.escape(c[key])
            P.append(f'<h3>{label}</h3><pre id="{c["id"]}-{key}">{t}</pre>'
                     f'<button onclick="cp(\'{c["id"]}-{key}\',this)">Kopyala</button>')
        P.append(f'<h3>Hashtag (IG ilk yorum)</h3><pre id="{c["id"]}-tag">{html.escape(c["ig_tags"])}</pre>'
                 f'<button onclick="cp(\'{c["id"]}-tag\',this)">Kopyala</button>')
        P.append(f'<h3>Sabit yorum · Story</h3><p class="small"><b>Yorum:</b> {html.escape(c["yorum"])}<br><b>Story:</b> {html.escape(c["story"])}</p>')
        P.append(f'<h3>Bağlantılar (UTM)</h3><p class="small">IG: <a href="{c["link_ig"]}">{c["link_ig"]}</a><br>TT: <a href="{c["link_tt"]}">{c["link_tt"]}</a></p>')
        P.append('</div></div></section>')
    P.append('<p class="sub">Detaylı çekim senaryoları: <a href="senaryolar.md">senaryolar.md</a> · '
             'Tüm metinler: <a href="captions.md">captions.md</a> · Görselleri yeniden üretmek: <code>python3 render.py</code></p>')
    P.append('</main><script>function cp(id,b){var t=document.getElementById(id).innerText;'
             'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){b.textContent="Kopyalandı ✓";setTimeout(function(){b.textContent="Kopyala"},1600)})}'
             'else{var r=document.createRange();r.selectNode(document.getElementById(id));var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="Seçildi — Ctrl+C";}}</script>')
    P.append('</body></html>')
    open(os.path.join(BASE, "pano.html"), "w", encoding="utf-8").write("\n".join(P))
    print("pano.html OK")

if __name__ == "__main__":
    build_md()
    build_html()

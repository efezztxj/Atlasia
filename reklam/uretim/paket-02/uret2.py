# -*- coding: utf-8 -*-
"""Paket-02 metin hattı: captions.md + pano.html (video oynatıcılı).
Çalıştır: python3 reklam/uretim/paket-02/uret2.py
"""
import os, html

BASE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://atlasia.pages.dev/"

def link(source, medium, content):
    return (f"{SITE}?tab=kesfet&utm_source={source}&utm_medium={medium}"
            f"&utm_campaign=orada-degil-burada&utm_content={content}")

ICERIK = [
 dict(id="S1", gun="Gün 1 · 11 Kas Çarşamba", baslik="Bademli — Maldivler'e bakıyorsun",
  video="videolar/video-s1-bademli.mp4", cover="gorseller/kapak-s1-bademli.jpg",
  link_ig=link("instagram", "reels", "s1-bademli"), link_tt=link("tiktok", "video", "s1-bademli"),
  tt="""Maldivler'e bakıyorsun ama bu turkuaz İzmir Dikili'de 🏝️
Bademli koyları: aktarma yok, kuyruk yok — in, yüz.
Sizin oranın "Maldivleri" neresi? Yoruma yaz, sıradaki bölüm orası olabilir 👇

#bademli #dikili #izmir #gezi #atlasia #oradadegilburada""",
  ig="""Maldivler'e bakıyorsun. Aktarmalı uçuş, bir de o fiyatlar. ✈️

Aynı turkuaz İzmir Dikili'de: Bademli koyları.
Uçak yok, kuyruk yok — arabadan in, suya gir.

Serinin adı üstünde: Orada değil. Burada. 📍
Bademli planı profildeki linkte (indirme yok, harita direkt açılıyor).

Senin şehrinin "Maldivleri" neresi? Yoruma yaz, sıradaki bölümü oradan çekelim 👇""",
  ig_tags="#bademli #dikili #izmir #ege #koy #yaz #deniz #gezi #seyahat #keşfet #atlasia #oradadegilburada"),
 dict(id="S2", gun="Gün 2 · 12 Kas Perşembe", baslik="Salda — NASA burayı Mars'a benzetiyor",
  video="videolar/video-s2-salda.mp4", cover="gorseller/kapak-s2-salda.jpg",
  link_ig=link("instagram", "reels", "s2-salda"), link_tt=link("tiktok", "video", "s2-salda"),
  tt="""NASA bu gölü Mars'a benzetiyor 🪐
Jezero Krateri'yle aynı mineraller... ve o göl Burdur'da: Salda.
Beyaz kum, turkuaz su — uzaya çıkmadan Mars.
Gidenler: ilk gördüğünüzde ne dediniz? 👇

#salda #saldagolu #burdur #nasa #gezi #atlasia""",
  ig="""NASA bu gölü Mars'a benzetiyor. 🪐

Mars'taki Jezero Krateri'yle aynı minerallere sahip olduğu söylenen o yer, Amerika'da değil Burdur'da: Salda Gölü.
Beyaz kum. Turkuaz su. Uzaya çıkmadan Mars.

Orada değil. Burada. 📍 Salda planı profilde.

Tek ricamız: beyaz kuma ayakkabıyla basma, izini sadece Atlasia'da bırak 🤍

Kaydet, yaz planına ekle 📌""",
  ig_tags="#salda #saldagölü #burdur #türkiyeninmaldivleri #nasa #mars #göl #doğa #gezi #seyahat #keşfet #atlasia #oradadegilburada"),
 dict(id="S3", gun="Gün 3 · 13 Kas Cuma", baslik="Termessos — İskender bile alamamış",
  video="videolar/video-s3-termessos.mp4", cover="gorseller/kapak-s3-termessos.jpg",
  link_ig=link("instagram", "reels", "s3-termessos"), link_tt=link("tiktok", "video", "s3-termessos"),
  tt="""Machu Picchu'ya can atıyorsun ama aynısı Antalya'da 🏔️
Termessos: bin metrenin üstünde, Büyük İskender'in bile alamadığı şehir.
Dağ + orman + antik tiyatro. Buraya çıkanlar, yokuş kaç üzerinden kaç? 👇

#termessos #antalya #antikkent #gezi #atlasia #oradadegilburada""",
  ig="""Machu Picchu'ya can atıyorsun. Peru, dağın tepesinde kayıp şehir... 🏔️

Aynısı Antalya'da da var: Termessos.
Bin metrenin üstünde, ormanın içinde saklı. Öyle sarp ki Büyük İskender bile alamamış bu şehri.

Orada değil. Burada. 📍
Yürüyüş rotası ve durakları profildeki linkte (suyu unutma, yokuş gerçek).

Kaydet — Antalya'da denizden bir gün çalıp buraya çık 📌""",
  ig_tags="#termessos #antalya #antikkent #machupicchu #arkeoloji #tarih #yürüyüş #doğa #gezi #keşfet #atlasia #oradadegilburada"),
 dict(id="S4", gun="Gün 4 · 14 Kas Cumartesi", baslik="Kuyucak — Aynı mor Isparta'da",
  video="videolar/video-s4-kuyucak.mp4", cover="gorseller/kapak-s4-kuyucak.jpg",
  link_ig=link("instagram", "reels", "s4-kuyucak"), link_tt=link("tiktok", "video", "s4-kuyucak"),
  tt="""Provence lavanta tarlası kovalıyorsun ama aynı mor Isparta'da 💜
Kuyucak köyü Temmuz'da mora bürünüyor. Fransa'ya gitmeden o fotoğraf burada çekiliyor.
Bu karede kiminle olmak isterdin? Etiketle 👇

#kuyucak #lavanta #isparta #gezi #atlasia #oradadegilburada""",
  ig="""Provence'ta lavanta kovalıyorsun. Fransa, mor tarlalar, o meşhur fotoğraf... 💜

Aynı mor Isparta'da: Kuyucak köyünde.
Temmuz gelince bütün köy mora bürünüyor; tarladan lavantalı dondurmaya kadar her şey lavanta.

Orada değil. Burada. 📍
Sezon kısa sürüyor — planı profildeki linkten şimdiden kaydet.

Bu fotoğrafı kiminle çekmek isterdin? Gönder ona ✈️""",
  ig_tags="#kuyucak #lavanta #lavantaköyü #isparta #provence #lavender #çiçek #yaz #gezi #seyahat #keşfet #atlasia #oradadegilburada"),
]

def build_md():
    L = ["# Paket-02 · Orada Değil, Burada — kopyala-yapıştır açıklamalar", "",
         "> 4 video (seslendirmeli, altyazısı gömülü + .srt yanında). IG 19.00 · TikTok 20.00.",
         "> Hashtag'ler Instagram'da ilk yoruma. Link profilde; Story çıkartmasına UTM'li bağlantı.", ""]
    for c in ICERIK:
        L += [f"---\n\n## {c['id']} · {c['baslik']} — {c['gun']}",
              f"**Video:** {c['video']} · **Kapak:** {c['cover']}",
              f"**Link (IG):** {c['link_ig']}  \n**Link (TikTok):** {c['link_tt']}",
              "\n### TikTok\n\n```text\n" + c["tt"] + "\n```",
              "\n### Instagram\n\n```text\n" + c["ig"] + "\n```",
              "\n**Hashtag (ilk yorum):**\n\n```text\n" + c["ig_tags"] + "\n```", ""]
    open(os.path.join(BASE, "captions.md"), "w", encoding="utf-8").write("\n".join(L))
    print("captions.md OK")

CSS = """
*{box-sizing:border-box} body{margin:0;background:#020D17;color:#F1F0E9;font-family:'DM Sans',system-ui,sans-serif}
header{padding:48px 6vw 8px} h1{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:clamp(30px,5vw,54px);margin:0 0 8px}
h1 b{color:#F3C870} .sub{color:#B4BEC6;max-width:70ch;line-height:1.55}
main{padding:24px 6vw 80px;display:grid;gap:48px}
.card{background:#071726;border:1px solid #12314a;border-radius:22px;padding:28px}
.card h2{margin:0 0 4px;font-size:26px}.meta{color:#F3C870;font-weight:700;letter-spacing:.04em;font-size:13px;text-transform:uppercase}
.grid{display:grid;grid-template-columns:minmax(240px,340px) 1fr;gap:28px;margin-top:18px}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
video{width:100%;max-width:340px;border-radius:14px;border:1px solid #1b3d5a;background:#000}
pre{white-space:pre-wrap;background:#03101d;border:1px solid #12314a;border-radius:12px;padding:16px;font-size:14.5px;line-height:1.55;color:#E8EAE6}
h3{margin:20px 0 8px;font-size:15px;color:#7EE0B8;text-transform:uppercase;letter-spacing:.06em}
button{background:#F3C870;color:#020D17;border:0;border-radius:999px;padding:9px 18px;font-weight:800;cursor:pointer;margin:2px 6px 2px 0}
a{color:#F3C870;word-break:break-all}.small{color:#B4BEC6;font-size:13.5px;line-height:1.5}
table{border-collapse:collapse;width:100%;font-size:14.5px}td,th{border-bottom:1px solid #12314a;padding:9px 8px;text-align:left}th{color:#F3C870}
"""

def build_html():
    P = ['<!doctype html><html lang="tr"><head><meta charset="utf-8">'
         '<meta name="viewport" content="width=device-width,initial-scale=1">'
         '<title>Atlasia · Paket-02 Orada Değil Burada Panosu</title>'
         '<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=DM+Sans:wght@400;600;800&display=swap" rel="stylesheet">'
         f'<style>{CSS}</style></head><body>']
    P.append('<header><h1>Atlasia <b>Paket-02</b> · Orada Değil, Burada</h1>'
             '<p class="sub">4 profesyonel video (senkron kesim · -16 LUFS · gömülü altyazı). '
             'Yayın: <b>11–14 Kasım</b>, IG 19.00 · TikTok 20.00 (Paket-01\'in devamı).</p></header>')
    P.append('<main><section class="card"><h2>Yayın takvimi</h2><table><tr><th>Gün</th><th>Video</th></tr>')
    for c in ICERIK:
        P.append(f"<tr><td>{html.escape(c['gun'])}</td><td>{c['id']} · {html.escape(c['baslik'])}</td></tr>")
    P.append('</table></section>')
    for c in ICERIK:
        P.append(f'<section class="card"><div class="meta">{c["id"]} · {html.escape(c["gun"])}</div><h2>{html.escape(c["baslik"])}</h2>'
                 f'<div class="grid"><div><video controls preload="metadata" poster="{c["cover"]}" src="{c["video"]}"></video></div><div>')
        for label, key in [("TikTok açıklaması", "tt"), ("Instagram açıklaması", "ig"), ("Hashtag (IG ilk yorum)", "ig_tags")]:
            P.append(f'<h3>{label}</h3><pre id="{c["id"]}-{key}">{html.escape(c[key])}</pre>'
                     f'<button onclick="cp(\'{c["id"]}-{key}\',this)">Kopyala</button>')
        P.append(f'<h3>Bağlantılar (UTM)</h3><p class="small">IG: <a href="{c["link_ig"]}">{c["link_ig"]}</a><br>TT: <a href="{c["link_tt"]}">{c["link_tt"]}</a></p>')
        P.append('</div></div></section>')
    P.append('</main><script>function cp(id,b){var t=document.getElementById(id).innerText;'
             'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){b.textContent="Kopyalandı ✓";setTimeout(function(){b.textContent="Kopyala"},1600)})}'
             'else{var r=document.createRange();r.selectNode(document.getElementById(id));var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="Seçildi — Ctrl+C";}}</script></body></html>')
    open(os.path.join(BASE, "pano.html"), "w", encoding="utf-8").write("\n".join(P))
    print("pano.html OK")

if __name__ == "__main__":
    build_md()
    build_html()

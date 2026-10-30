# -*- coding: utf-8 -*-
"""Atlasia Paket-01 görsel üretimi: kapaklar 1080x1920, carousel 1080x1350.
Marka: INK #020D17 · CREAM #F1F0E9 · GOLD #F3C870 · MINT #7EE0B8
Çalıştır: python3 reklam/uretim/paket-01/render.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "kaynak")
OUT = os.path.join(BASE, "gorseller")
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(OUT, "pamukkale-carousel"), exist_ok=True)
os.makedirs(os.path.join(OUT, "efes-carousel"), exist_ok=True)

INK = (2, 13, 23)
INK2 = (8, 28, 42)
CREAM = (241, 240, 233)
GOLD = (243, 200, 112)
MINT = (126, 224, 184)
DIM = (180, 190, 198)

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def cover_crop(im, w, h, focus_y=0.5):
    im = im.convert("RGB")
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    x = (nw - w) // 2
    y = int((nh - h) * focus_y)
    return im.crop((x, y, x + w, y + h))


def gradient(im, top_frac=0.38, strength=225):
    w, h = im.size
    grad = Image.new("L", (1, h), 0)
    px = grad.load()
    start = int(h * top_frac)
    for y in range(h):
        if y <= start:
            px[0, y] = 0
        else:
            t = (y - start) / max(1, h - start)
            px[0, y] = int(strength * (t ** 1.35))
    alpha = grad.resize((w, h))
    black = Image.new("RGB", (w, h), (1, 7, 13))
    return Image.composite(black, im, alpha)


def top_shade(im, hfrac=0.22, strength=150):
    w, h = im.size
    grad = Image.new("L", (1, h), 0)
    px = grad.load()
    end = int(h * hfrac)
    for y in range(h):
        px[0, y] = int(strength * max(0.0, 1 - y / max(1, end))) if y < end else 0
    alpha = grad.resize((w, h))
    black = Image.new("RGB", (w, h), (1, 7, 13))
    return Image.composite(black, im, alpha)


def wrap(d, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=fnt) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def fit_font(d, text, max_w, start, min_size=44, path=FB):
    """Headline'i satırlara böl; sığana kadar küçült."""
    size = start
    while size > min_size:
        fnt = font(path, size)
        lines = wrap(d, text, fnt, max_w)
        if all(d.textlength(l, font=fnt) <= max_w for l in lines) and len(lines) <= 4:
            return fnt, lines
        size -= 6
    fnt = font(path, min_size)
    return fnt, wrap(d, text, fnt, max_w)


def draw_headline(d, x, y, text, max_w, start=118, highlight=None, lh=1.08):
    fnt, lines = fit_font(d, text, max_w, start)
    asc, desc = fnt.getmetrics()
    step = int((asc + desc) * lh)
    for line in lines:
        if highlight and any(h in line for h in highlight):
            cx = x
            for part in line.split(" "):
                col = GOLD if part.strip("?.!,:'") in [h.strip("?.!,:'") for h in highlight] else CREAM
                d.text((cx + 3, y + 3), part, font=fnt, fill=(0, 0, 0))
                d.text((cx, y), part, font=fnt, fill=col)
                cx += int(d.textlength(part + " ", font=fnt))
        else:
            d.text((x + 3, y + 3), line, font=fnt, fill=(0, 0, 0))
            d.text((x, y), line, font=fnt, fill=CREAM)
        y += step
    return y


def pill(d, cx, cy, text, fnt_size=40):
    fnt = font(FB, fnt_size)
    tw = d.textlength(text, font=fnt)
    pad_x, pad_y = 44, 20
    w, h = int(tw + pad_x * 2), fnt_size + pad_y * 2
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=h // 2, fill=GOLD)
    d.text((cx - tw / 2, cy - fnt_size / 2 - 4), text, font=fnt, fill=INK)
    return (x0, y0, x0 + w, y0 + h)


def kicker(d, x, y, text):
    fnt = font(FB, 34)
    d.rectangle([x, y + 4, x + 54, y + 12], fill=GOLD)
    d.text((x + 70, y - 8), text, font=fnt, fill=GOLD)


def footer(d, w, h, note="Ücretsiz · Kurulum yok"):
    fnt = font(FB, 30)
    txt = "ATLASIA"
    d.text((64, h - 118), txt, font=fnt, fill=CREAM)
    tw = d.textlength(note, font=font(FR, 28))
    d.text((64, h - 72), note, font=font(FR, 28), fill=DIM)
    pill(d, w - 300, h - 92, "atlasia.pages.dev", 34)


def make_cover(bg_path, out, kick, head, sub, highlight=None, focus_y=0.5, chip=None):
    W, H = 1080, 1920
    im = cover_crop(Image.open(bg_path), W, H, focus_y)
    im = ImageEnhance.Color(im).enhance(1.06)
    im = gradient(im, 0.34, 232)
    im = top_shade(im)
    d = ImageDraw.Draw(im)
    kicker(d, 64, 86, kick)
    if chip:
        fnt = font(FB, 44)
        tw = d.textlength(chip, font=fnt)
        d.rounded_rectangle([W - 64 - tw - 56, 150, W - 64, 150 + 84], radius=42, outline=MINT, width=4)
        d.text((W - 64 - tw - 28, 150 + 16), chip, font=fnt, fill=MINT)
    y = draw_headline(d, 64, 1050, head, W - 128, 124, highlight)
    y += 26
    fnt = font(FR, 44)
    for line in wrap(d, sub, fnt, W - 160):
        d.text((66, y + 2), line, font=fnt, fill=(0, 0, 0))
        d.text((64, y), line, font=fnt, fill=(232, 234, 230))
        y += 62
    footer(d, W, H)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))


def make_chat_cover(out):
    W, H = 1080, 1920
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    # hafif vinyet halkaları
    for r in range(900, 200, -140):
        d.ellipse([W // 2 - r, 240 - r // 2, W // 2 + r, 240 + r // 2], outline=(16, 42, 60), width=2)
    kicker(d, 64, 86, "GRUP SOHBETİ · 14:02")
    msgs = [("nereye gidelim??", False), ("bilmem, sen söyle", True),
            ("bana farketmez", False), ("dün de öyle dedin, evde kaldık", True),
            ("tamam ben hallediyorum. 1 link atıyorum", False, True)]
    y = 240
    for m in msgs:
        text, right = m[0], m[1]
        gold = len(m) > 2
        fnt = font(FB if gold else FR, 40)
        tw = d.textlength(text, font=fnt)
        bw, bh = int(tw + 56), 92
        x = W - 64 - bw if right else 64
        fill = GOLD if gold else (23, 52, 72)
        col = INK if gold else CREAM
        d.rounded_rectangle([x, y, x + bw, y + bh], radius=34, fill=fill)
        d.text((x + 28, y + 22), text, font=fnt, fill=col)
        y += bh + 30
    y2 = draw_headline(d, 64, y + 90, "3 SAAT MESAJLAŞTIK. HÂLÂ EVDEYİZ.", W - 128, 110, ["EVDEYİZ."])
    fnt = font(FR, 44)
    d.text((64, y2 + 24), "Sonra biri rotayı link olarak attı. Karar 1 dakika sürdü.", font=fnt, fill=(232, 234, 230))
    # sub iki satır olabilir; alt boşluk yeterli
    footer(d, W, H)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))


def make_pin_cover(out):
    W, H = 1080, 1920
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    # harita halkaları + pin
    cx, cy = W // 2, 620
    for r in (430, 320, 210):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(22, 58, 80), width=3)
    d.line([cx - 430, cy, cx + 430, cy], fill=(22, 58, 80), width=2)
    d.line([cx, cy - 430, cx, cy + 430], fill=(22, 58, 80), width=2)
    # pin gövdesi
    d.ellipse([cx - 130, cy - 260, cx + 130, cy], fill=GOLD)
    d.polygon([(cx - 92, cy - 55), (cx + 92, cy - 55), (cx, cy + 150)], fill=GOLD)
    d.ellipse([cx - 52, cy - 182, cx + 52, cy - 78], fill=INK)
    kicker(d, 64, 86, "#1İZBIRAK · MEYDAN OKUMA")
    y = draw_headline(d, 64, 1180, "ŞEHRİNDE 1 İZ BIRAK.", W - 128, 126, ["İZ"])
    fnt = font(FR, 44)
    yy = y + 24
    for line in wrap(d, "Haritada yazmayan yerini söyle. En iyileri her hafta tek videoda okuyoruz.", fnt, W - 160):
        d.text((64, yy), line, font=fnt, fill=(232, 234, 230))
        yy += 62
    footer(d, W, H, note="Senin izin, birinin rotası olsun")
    im.save(out, quality=88)
    print("OK", os.path.basename(out))


# ---------------- KAPAKLAR (9:16) ----------------
make_cover(os.path.join(SRC, "kyoto-bg.jpg"), os.path.join(OUT, "kapak-t1-uydudan-dus.jpg"),
           "UYDUDAN DÜŞ · 01", "BURASI NERESİ?",
           "Son saniyede iniyoruz. Tahminini yoruma bırak — inince 1 gerçeği söylüyorum.",
           highlight=["NERESİ?"])
make_chat_cover(os.path.join(OUT, "kapak-t2-nereye-gidelim.jpg"))
make_cover(os.path.join(SRC, "galata-bg.jpg"), os.path.join(OUT, "kapak-t3-evinden-15dk.jpg"),
           "KENDİ ŞEHRİNDE TURİST OL", "EVİNDEN 15 DAKİKA. HİÇ GİTMEDİN.",
           "Galata'dan Haliç'e: 3 durak, 1 çay molası. Uçak bileti yok, bahane yok.",
           highlight=["GİTMEDİN."], focus_y=0.35)
make_cover(os.path.join(SRC, "pamukkale-bg.jpg"), os.path.join(OUT, "kapak-i3-altin-saat.jpg"),
           "ALTIN SAAT ROTASI", "GÜN BATIMINA 47 DAKİKAN VAR.",
           "Son durak ışığa denk geliyor. Atlasia altın saati hesaplıyor — sen yürü.",
           highlight=["47"])
make_pin_cover(os.path.join(OUT, "kapak-u1-iz-birak.jpg"))
make_cover(os.path.join(SRC, "venedik-bg.jpg"), os.path.join(OUT, "kapak-u2-24-saat.jpg"),
           "24 SAAT İZİ", "BU NOT YARIN HARİTADA OLMAYACAK.",
           "Bir gezgin bıraktı, süresi doluyor. Silinmeden git, gör.",
           highlight=["OLMAYACAK."], chip="23:59")
make_cover(os.path.join(BASE, "..", "..", "..", "public", "images", "atlasia-earth-hero.jpg"),
           os.path.join(OUT, "kapak-d1-indirmeden-ac.jpg"),
           "İNDİRME YOK · ÜYELİK YOK", "UYGULAMA İNDİRMEDİM. HARİTADAYIM.",
           "Linke dokun, küre açılsın. 28 nokta, 4 sesli tur — ücretsiz, reklam yok.",
           highlight=["HARİTADAYIM."], focus_y=0.4)
make_cover(os.path.join(SRC, "goreme-bg.jpg"), os.path.join(OUT, "kapak-d2-goreme-1gun.jpg"),
           "SOR, ROTA GELSİN", "GÖREME'DE 1 GÜNDE NE YAPILIR?",
           "Balonu sepete binmeden izlemek dahil. Sıralı gün planı videoda.",
           highlight=["1"])

# ---------------- CAROUSEL ORTAK ----------------
CW, CH = 1080, 1350


def carousel_cover(bg_path, out, kick, head, sub, highlight=None):
    im = cover_crop(Image.open(bg_path), CW, CH, 0.42)
    im = gradient(im, 0.30, 235)
    im = top_shade(im)
    d = ImageDraw.Draw(im)
    kicker(d, 64, 76, kick)
    y = draw_headline(d, 64, 640, head, CW - 128, 112, highlight)
    fnt = font(FB, 40)
    yy = y + 22
    for line in wrap(d, sub, fnt, CW - 160):
        d.text((64, yy), line, font=fnt, fill=GOLD)
        yy += 56
    footer(d, CW, CH)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))


def tip_slide(out, num, total, kick, title, body):
    im = Image.new("RGB", (CW, CH), INK)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, CW, 14], fill=GOLD)
    kicker(d, 64, 90, kick)
    big = font(FB, 300)
    d.text((56, 170), str(num), font=big, fill=(16, 44, 64))
    d.text((64, 190), str(num), font=font(FB, 120), fill=GOLD)
    y = draw_headline(d, 64, 540, title, CW - 128, 88)
    fnt = font(FR, 46)
    yy = y + 30
    for line in wrap(d, body, fnt, CW - 150):
        d.text((64, yy), line, font=fnt, fill=(232, 234, 230))
        yy += 66
    # sayfa göstergesi
    f2 = font(FB, 30)
    s = f"{num + 1} / {total}"
    d.text((CW - 64 - d.textlength(s, font=f2), CH - 120), s, font=f2, fill=DIM)
    d.text((64, CH - 120), "ATLASIA", font=f2, fill=CREAM)
    # ilerleme çubuğu
    d.rectangle([64, CH - 60, CW - 64, CH - 52], fill=(23, 52, 72))
    d.rectangle([64, CH - 60, 64 + int((CW - 128) * (num + 1) / total), CH - 52], fill=GOLD)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))


def cta_slide(out, head, body, sub):
    im = Image.new("RGB", (CW, CH), INK2)
    d = ImageDraw.Draw(im)
    for r in (520, 380, 240):
        d.ellipse([CW // 2 - r, 300 - r, CW // 2 + r, 300 + r], outline=(24, 64, 88), width=3)
    cx, cy = CW // 2, 300
    d.ellipse([cx - 78, cy - 156, cx + 78, cy], fill=GOLD)
    d.polygon([(cx - 55, cy - 33), (cx + 55, cy - 33), (cx, cy + 90)], fill=GOLD)
    d.ellipse([cx - 31, cy - 109, cx + 31, cy - 47], fill=INK2)
    y = draw_headline(d, 64, 560, head, CW - 128, 96, ["ATLASIA'DA", "AÇ"])
    fnt = font(FR, 42)
    yy = y + 24
    for line in wrap(d, body, fnt, CW - 150):
        tw = d.textlength(line, font=fnt)
        d.text(((CW - tw) / 2, yy), line, font=fnt, fill=(232, 234, 230))
        yy += 60
    # başlığı da ortalamak için üstte solda bıraktık; hap ortada:
    pill(d, CW // 2, yy + 90, "atlasia.pages.dev", 44)
    f2 = font(FB, 32)
    tw = d.textlength(sub, font=f2)
    d.text(((CW - tw) / 2, yy + 180), sub, font=f2, fill=MINT)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))


# --- Pamukkale carousel (7 slayt) ---
PAM = os.path.join(OUT, "pamukkale-carousel")
carousel_cover(os.path.join(SRC, "pamukkale-bg.jpg"), os.path.join(PAM, "slayt-1.jpg"),
               "GİTMEDEN ÖNCE BİL · PAMUKKALE", "PAMUKKALE'YE GİTMEDEN ÖNCE 5 ŞEY",
               "Kaydet — gidince açarsın. Kaydırmaya başla.", highlight=["5"])
tips = [
    ("YARIM GÜN AYIR.", "Travertenler ve Hierapolis aynı yamaçta. İkisi aynı yürüyüşte biter; acele edersen ikisini de yarım görürsün."),
    ("GÜN BATIMINDA GİT.", "Gün batımında ışık turkuvaza döner, beyaz teraslar altın gibi parlar. Öğle kalabalığı da çoktan dağılmış olur."),
    ("YALINAYAK YÜRÜYECEKSİN.", "Teraslarda ayakkabı yok — beyaz taşın üstünde yalınayak yürünür. Ellerini boş tut, ılık suya şaşırma."),
    ("BEYAZIN ÜSTÜNDE BİR KENT VAR.", "Travertenlerin üstünde Hierapolis antik kenti duruyor. Tiyatroyu atlama; yukarı yürüdükçe kent açılır."),
    ("ANTİK HAVUZ HÂLÂ ILIK.", "Devrilmiş sütunların arasında, ılık suda yüzüyorsun. Rehber notu kısa ve net: antik havuz hâlâ ılık."),
]
for i, (t, b) in enumerate(tips, start=1):
    tip_slide(os.path.join(PAM, f"slayt-{i+1}.jpg"), i, 7, "PAMUKKALE · GİTMEDEN ÖNCE BİL", t, b)
cta_slide(os.path.join(PAM, "slayt-7.jpg"), "SIRALI ROTASI ATLASIA'DA",
          "28 seçilmiş nokta · 4 antik kent sesli turu. Ücretsiz, reklam yok, indirme yok.",
          "Link profilde · Kaydetmeyi unutma")

# --- Efes carousel (5 slayt) ---
EFE = os.path.join(OUT, "efes-carousel")
carousel_cover(os.path.join(SRC, "efes-bg.jpg"), os.path.join(EFE, "slayt-1.jpg"),
               "AYNI ŞEHİR, 3 ZAMAN · EFES", "EFES'TE 1 SAATİN Mİ VAR, 3 SAATİN Mİ?",
               "Zamanını söyle, plan değişsin. Kaydır.", highlight=["1", "3"])

def list_slide(out, idx, total, kick, title, rows, foot):
    im = Image.new("RGB", (CW, CH), INK)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, CW, 14], fill=GOLD)
    kicker(d, 64, 90, kick)
    y = draw_headline(d, 64, 160, title, CW - 128, 80, ["1", "3"])
    yy = y + 36
    f_time, f_name = font(FB, 34), font(FR, 36)
    step = 62 if len(rows) > 5 else 80
    for tm, nm in rows:
        d.ellipse([72, yy + 10, 90, yy + 28], fill=GOLD)
        if tm:
            d.text((118, yy), tm, font=f_time, fill=GOLD)
        d.text((240 if tm else 118, yy), nm, font=f_name, fill=CREAM)
        yy += step
    f2 = font(FB, 32)
    tw = d.textlength(foot, font=f2)
    pill(d, CW // 2, CH - 155, foot, 32)
    s = f"{idx} / {total}"
    d.text((CW - 64 - d.textlength(s, font=font(FB, 30)), CH - 96), s, font=font(FB, 30), fill=DIM)
    d.text((64, CH - 96), "ATLASIA", font=font(FB, 30), fill=CREAM)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))

list_slide(os.path.join(EFE, "slayt-2.jpg"), 2, 5, "EFES · AYNI ŞEHİR, 3 ZAMAN",
           "1 SAATİN VARSA: İMZA ÜÇLÜ",
           [("", "Celsus Kütüphanesi — ilk ışık taşlarda"),
            ("", "Mermer Cadde — yokuş yukarı yürü"),
            ("", "Büyük Tiyatro — sonda dönüp bak")],
           "Ekspres tur: 3 durak, karar yok")
list_slide(os.path.join(EFE, "slayt-3.jpg"), 3, 5, "EFES · AYNI ŞEHİR, 3 ZAMAN",
           "3 SAATİN VARSA: GERÇEK TUR SIRASI",
           [("09:00", "Magnesia Kapısı (giriş)"), ("09:15", "Devlet Agorası"),
            ("09:33", "Odeon"), ("09:48", "Domitian Tapınağı"),
            ("10:02", "Herakles Kapısı"), ("10:15", "Kuretler Caddesi"),
            ("10:35", "Yamaç Evler"), ("11:08", "Hadrian Tapınağı"),
            ("11:23", "Celsus Kütüphanesi"), ("11:50", "Büyük Tiyatro (çıkış)")],
           "10 durak · 2,1 km · 180 dakika")

def why_slide(out):
    im = Image.new("RGB", (CW, CH), INK)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, CW, 14], fill=GOLD)
    kicker(d, 64, 90, "EFES · AYNI ŞEHİR, 3 ZAMAN")
    y = draw_headline(d, 64, 180, "NEDEN BU SIRA?", CW - 128, 96, ["SIRA?"])
    fnt = font(FR, 47)
    yy = y + 36
    paras = [
        "Üst kapıdan (Magnesia) giriyorsun, yokuş aşağı inerek Büyük Tiyatro'da bitiriyorsun.",
        "Rota seni aynı yoldan geri yürütmüyor. Celsus'a öğle sıcağı basmadan varıyorsun.",
        "Üstelik her durağa varış saatindeki hava durumu da yanında. Sıra tesadüf değil; Atlasia nedenini gösteriyor.",
    ]
    for p in paras:
        for line in wrap(d, p, fnt, CW - 150):
            d.text((64, yy), line, font=fnt, fill=(232, 234, 230))
            yy += 68
        yy += 30
    d.text((64, CH - 96), "ATLASIA", font=font(FB, 30), fill=CREAM)
    d.text((CW - 64 - d.textlength("4 / 5", font=font(FB, 30)), CH - 96), "4 / 5", font=font(FB, 30), fill=DIM)
    im.save(out, quality=88)
    print("OK", os.path.basename(out))

why_slide(os.path.join(EFE, "slayt-4.jpg"))
cta_slide(os.path.join(EFE, "slayt-5.jpg"), "SAATİNİ SEÇ, ROTANI AÇ",
          "Zamanına göre sıralı rota + varışta hava + yerinde sesli anlatım. İndirme yok, üyelik yok.",
          "Link profilde · Kaydet, Efes'te açarsın")
print("BITTI")

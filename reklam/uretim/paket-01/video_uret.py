# -*- coding: utf-8 -*-
"""Paket-01 videoları: beat still'leri (PIL) + seslendirme (ses/*.mp3) -> MP4 (ffmpeg).
Önce sesler üretilir (generate_speech), sonra: python3 reklam/uretim/paket-01/video_uret.py [t1 d1 ...]
Çıktı: videolar/video-*.mp4 (+ .srt). 1080x1920, 30 fps, H.264 High + AAC mono 48 kHz.
"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import imageio_ffmpeg
from mutagen.mp3 import MP3

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "kaynak")
STILLS = os.path.join(SRC, "beat-stills")
SES = os.path.join(BASE, "ses")
OUT = os.path.join(BASE, "videolar")
for d in (STILLS, OUT):
    os.makedirs(d, exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1080, 1920, 30
INK, INK2 = (2, 13, 23), (8, 28, 42)
CREAM, GOLD, MINT, DIM = (241, 240, 233), (243, 200, 112), (126, 224, 184), (180, 190, 198)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
EARTH = os.path.join(BASE, "..", "..", "..", "public", "images", "atlasia-earth-hero.jpg")


def font(p, s):
    return ImageFont.truetype(p, s)


def cover_crop(im, w, h, fy=0.5):
    im = im.convert("RGB")
    sw, sh = im.size
    sc = max(w / sw, h / sh)
    nw, nh = int(sw * sc + .5), int(sh * sc + .5)
    im = im.resize((nw, nh), Image.LANCZOS)
    x, y = (nw - w) // 2, int((nh - h) * fy)
    return im.crop((x, y, x + w, y + h))


def shade(im):
    w, h = im.size
    g = Image.new("L", (1, h), 0)
    px = g.load()
    st = int(h * 0.32)
    for y in range(h):
        px[0, y] = 0 if y <= st else int(235 * ((y - st) / max(1, h - st)) ** 1.35)
    im = Image.composite(Image.new("RGB", (w, h), (1, 7, 13)), im, g.resize((w, h)))
    g2 = Image.new("L", (1, h), 0)
    px = g2.load()
    en = int(h * 0.22)
    for y in range(h):
        px[0, y] = int(150 * max(0.0, 1 - y / max(1, en))) if y < en else 0
    return Image.composite(Image.new("RGB", (w, h), (1, 7, 13)), im, g2.resize((w, h)))


def wrap(d, text, fnt, mw):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=fnt) <= mw or not cur:
            cur = t
        else:
            lines.append(cur); cur = wd
    if cur:
        lines.append(cur)
    return lines


def headline(d, x, y, text, mw, start=120):
    size = start
    while size > 46:
        fnt = font(FB, size)
        lines = wrap(d, text, fnt, mw)
        if len(lines) <= 4 and all(d.textlength(l, font=fnt) <= mw for l in lines):
            break
        size -= 6
    fnt = font(FB, size)
    lines = wrap(d, text, fnt, mw)
    asc, desc = fnt.getmetrics()
    step = int((asc + desc) * 1.08)
    for l in lines:
        d.text((x + 3, y + 3), l, font=fnt, fill=(0, 0, 0))
        d.text((x, y), l, font=fnt, fill=CREAM)
        y += step
    return y


def kicker(d, x, y, text):
    fnt = font(FB, 34)
    d.rectangle([x, y + 4, x + 54, y + 12], fill=GOLD)
    d.text((x + 70, y - 8), text, font=fnt, fill=GOLD)


def pill(d, cx, cy, text="atlasia.pages.dev", size=40):
    fnt = font(FB, size)
    tw = d.textlength(text, font=fnt)
    w, h = int(tw + 88), size + 40
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=h // 2, fill=GOLD)
    d.text((cx - tw / 2, cy - size / 2 - 4), text, font=fnt, fill=INK)


def base_photo(bg, fy=0.5):
    im = cover_crop(Image.open(bg), W, H, fy)
    return shade(ImageEnhance.Color(im).enhance(1.06))


def draw_text_block(im, kick, head, sub=None, show_pill=False, chip=None, head_y=1040):
    d = ImageDraw.Draw(im)
    if kick:
        kicker(d, 64, 86, kick)
    if chip:
        fnt = font(FB, 44)
        tw = d.textlength(chip, font=fnt)
        d.rounded_rectangle([W - 64 - tw - 56, 150, W - 64, 234], radius=42, outline=MINT, width=4)
        d.text((W - 92 - tw, 166), chip, font=fnt, fill=MINT)
    y = headline(d, 64, head_y, head, W - 128)
    if sub:
        fnt = font(FR, 44)
        yy = y + 24
        for l in wrap(d, sub, fnt, W - 160):
            d.text((66, yy + 2), l, font=fnt, fill=(0, 0, 0))
            d.text((64, yy), l, font=fnt, fill=(232, 234, 230))
            yy += 62
    d.text((64, H - 118), "ATLASIA", font=font(FB, 30), fill=CREAM)
    d.text((64, H - 72), "Ücretsiz · Kurulum yok", font=font(FR, 28), fill=DIM)
    if show_pill:
        pill(d, W - 300, H - 92, size=34)
    return im


def still_photo(bg, kick, head, sub=None, show_pill=False, chip=None, fy=0.5):
    return draw_text_block(base_photo(bg, fy), kick, head, sub, show_pill, chip)


def still_dark(kick, head, sub=None, show_pill=False, num=None):
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 14], fill=GOLD)
    if num:
        d.text((58, 300), str(num), font=font(FB, 260), fill=(22, 58, 80))
        d.text((64, 294), str(num), font=font(FB, 260), fill=GOLD)
    return draw_text_block(im, kick, head, sub, show_pill, head_y=760 if num else 820)


def still_pin(kick, head, sub=None, show_pill=False):
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    cx, cy = W // 2, 600
    for r in (430, 320, 210):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(22, 58, 80), width=3)
    d.ellipse([cx - 130, cy - 260, cx + 130, cy], fill=GOLD)
    d.polygon([(cx - 92, cy - 55), (cx + 92, cy - 55), (cx, cy + 150)], fill=GOLD)
    d.ellipse([cx - 52, cy - 182, cx + 52, cy - 78], fill=INK)
    return draw_text_block(im, kick, head, sub, show_pill, head_y=1180)


def still_chat(kick, bubbles, head, sub=None, show_pill=False):
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    y = 300
    for b in bubbles:
        text, right = b[0], b[1]
        gold = len(b) > 2 and b[2]
        fnt = font(FB if gold else FR, 40)
        tw = d.textlength(text, font=fnt)
        bw, bh = int(tw + 56), 92
        x = W - 64 - bw if right else 64
        d.rounded_rectangle([x, y, x + bw, y + bh], radius=34, fill=GOLD if gold else (23, 52, 72))
        d.text((x + 28, y + 22), text, font=fnt, fill=INK if gold else CREAM)
        y += bh + 30
    return draw_text_block(im, kick, head, sub, show_pill, head_y=max(900, y + 120))


BG = lambda n: os.path.join(SRC, n)

VIDEOS = {
 "t1": dict(audio="t1-uydudan-dus.mp3", out="video-t1-uydudan-dus.mp4", segs=[
   (lambda: still_photo(EARTH, "UYDUDAN DÜŞ · 01", "BURASI NERESİ?", "İnmeden tahmin et.", fy=.4),
    "Burası neresi? İnmeden tahmin et."),
   (lambda: still_photo(BG("kyoto-bg.jpg"), "UYDUDAN DÜŞ · 01", "10.000 KAPI VAR.", "kyoto · Fushimi İnari"),
    "kyoto. Fushimi İnari. On bin kapı var."),
   (lambda: still_photo(BG("kyoto-bg.jpg"), "UYDUDAN DÜŞ · 01", "HERKES AYNI 200 METREDE.", fy=.62),
    "Ama herkes ilk iki yüz metrede kalıyor."),
   (lambda: still_photo(BG("kyoto-bg.jpg"), "UYDUDAN DÜŞ · 01", "30 DAKİKA ÇIK.", "Kalabalık orada bitiyor.", fy=.3),
    "Otuz dakika yukarı çık. Kalabalık orada bitiyor."),
   (lambda: still_photo(BG("kyoto-bg.jpg"), "UYDUDAN DÜŞ · 01", "ROTASI PROFİLDE.", show_pill=True),
    "Rotası profilde."),
 ]),
 "d1": dict(audio="d1-indirmeden-ac.mp3", out="video-d1-indirmeden-ac.mp4", segs=[
   (lambda: still_photo(EARTH, "İNDİRME YOK · ÜYELİK YOK", "UYGULAMA İNDİRMEDİM.", fy=.35),
    "Uygulama indirmedim."),
   (lambda: still_photo(EARTH, "İNDİRME YOK · ÜYELİK YOK", "ÜYELİK DE AÇMADIM.", fy=.5),
    "Üyelik de açmadım."),
   (lambda: still_photo(EARTH, "İNDİRME YOK · ÜYELİK YOK", "HARİTADAYIM.", "Rotam da hazır.", fy=.45),
    "Haritadayım. Rotam da hazır."),
   (lambda: still_photo(EARTH, "İNDİRME YOK · ÜYELİK YOK", "28 NOKTA · 4 SESLİ TUR", "Ücretsiz, reklam yok.", show_pill=True, fy=.4),
    "Yirmi sekiz nokta, dört sesli tur. Ücretsiz, reklam yok. Link profilde."),
 ]),
 "d2": dict(audio="d2-goreme-1gun.mp3", out="video-d2-goreme-1gun.mp4", segs=[
   (lambda: still_photo(BG("goreme-bg.jpg"), "SOR, ROTA GELSİN", "GÖREME'DE 1 GÜNDE NE YAPILIR?"),
    "Göreme'de bir günde ne yapılır?"),
   (lambda: still_photo(BG("goreme-bg.jpg"), "SOR, ROTA GELSİN", "ÖNCE SEPETE BİNME.", "Aşk Vadisi sırtı: aynı gökyüzü, bedava.", fy=.4),
    "Önce sepete binme. Aşk Vadisi sırtından aynı gökyüzü bedava izleniyor."),
   (lambda: still_photo(BG("goreme-bg.jpg"), "SOR, ROTA GELSİN", "ÖĞLEN GÖLGEYİ KOVALA.", "Vadiye in, sıcağı beklet.", fy=.6),
    "Öğlen vadiye in, gölgeyi kovala."),
   (lambda: still_photo(BG("goreme-bg.jpg"), "SOR, ROTA GELSİN", "GÜN PLANI PROFİLDE.", "Son durak akşam ışığında biter.", show_pill=True),
    "Akşam ışığı yumuşarken son durak. Sıralı gün planı profilde."),
 ]),
 "t2": dict(audio="t2-nereye-gidelim.mp3", out="video-t2-nereye-gidelim.mp4", segs=[
   (lambda: still_chat("GRUP SOHBETİ", [("nereye gidelim??", 0), ("bilmem, sen söyle", 1), ("bana farketmez", 0)], "3 SAAT MESAJLAŞTIK."),
    "Üç saat mesajlaştık."),
   (lambda: still_dark("GRUP SOHBETİ", "HÂLÂ EVDEYİZ.", "Tanıdık geldi mi?"),
    "Hâlâ evdeydik. Nereye gidelim, sen söyle, bana fark etmez."),
   (lambda: still_chat("GRUP SOHBETİ", [("tamam ben hallediyorum", 0), ("rota: 3 saat, 7 durak", 0, True)], "BİRİ TEK LİNK ATTI."),
    "Sonra biri gruba tek link attı. Üç saat, yedi durak."),
   (lambda: still_dark("GRUP SOHBETİ", "KARAR 1 DAKİKA SÜRDÜ.", "Rotayı çiz, gruba at, çık.", show_pill=True),
    "Karar bir dakika sürdü. Rotayı çiz, gruba at, çık."),
 ]),
 "u1": dict(audio="u1-iz-birak.mp3", out="video-u1-iz-birak.mp4", segs=[
   (lambda: still_pin("#1İZBIRAK · MEYDAN OKUMA", "ŞEHRİNDE 1 İZ BIRAK."),
    "Şehrinde, haritada yazmayan bir yeri söyle. Ben başlıyorum."),
   (lambda: still_dark("#1İZBIRAK · MEYDAN OKUMA", "'KAPIDAN GİRME, SAĞDAN DOLAN. 10 DK.'", "Tek cümle yeter."),
    "Kapıdan girme, sağdan dolan. On dakika. Tek cümle yeter."),
   (lambda: still_pin("#1İZBIRAK · MEYDAN OKUMA", "SENİN İZİN, BİRİNİN ROTASI."),
    "Senin izin, bir başkasının gününün en iyi iki saati olabilir."),
   (lambda: still_dark("#1İZBIRAK · MEYDAN OKUMA", "#1İZBIRAK", "Şehrini yoruma yaz. En iyi 3 izi haftaya okuyoruz.", show_pill=True),
    "Şehrini yoruma yaz. En iyi üç izi haftaya okuyoruz."),
 ]),
 "t3": dict(audio="t3-evinden-15dk.mp3", out="video-t3-evinden-15dk.mp4", segs=[
   (lambda: still_photo(BG("galata-bg.jpg"), "EVİNDEN 15 DAKİKA", "EVİNDEN 15 DAKİKA.", "Hiç gitmedin.", fy=.35),
    "Evinden on beş dakika. Hiç gitmedin."),
   (lambda: still_dark("EVİNDEN 15 DAKİKA", "GALATA'DAN HALİÇ'E BAK", num=1),
    "Bir: Galata'dan Haliç'e bak."),
   (lambda: still_dark("EVİNDEN 15 DAKİKA", "KARAKÖY'DE ÇAY MOLASI", num=2),
    "İki: Karaköy'de bir çay molası ver."),
   (lambda: still_dark("EVİNDEN 15 DAKİKA", "KÖPRÜYE DOĞRU YÜRÜ", num=3),
    "Üç: Köprüye doğru yürü."),
   (lambda: still_photo(BG("galata-bg.jpg"), "EVİNDEN 15 DAKİKA", "15 DAKİKAN VAR.", "Turist olmana gerek yok.", show_pill=True, fy=.45),
    "Turist olmana gerek yok. On beş dakikan var. Rotası profilde."),
 ]),
 "i3": dict(audio="i3-altin-saat.mp3", out="video-i3-altin-saat.mp4", segs=[
   (lambda: still_photo(BG("pamukkale-bg.jpg"), "ALTIN SAAT ROTASI", "GÜN BATIMINA 47 DAKİKAN VAR.", chip="47:00"),
    "Gün batımına kırk yedi dakikan var. Yetişir misin?"),
   (lambda: still_photo(BG("pamukkale-bg.jpg"), "ALTIN SAAT ROTASI", "SON DURAK IŞIĞA DENK GELİYOR.", "Atlasia altın saati hesaplıyor.", fy=.4),
    "Atlasia altın saati hesaplıyor, son durağı ışığa koyuyor."),
   (lambda: still_photo(BG("pamukkale-bg.jpg"), "ALTIN SAAT ROTASI", "YETİŞTİ.", "Işık turkuvaza döndü.", chip="00:00", fy=.55),
    "Pamukkale'de ışık turkuvaza dönerken sen çoktan varmış oluyorsun."),
   (lambda: still_photo(BG("pamukkale-bg.jpg"), "ALTIN SAAT ROTASI", "SEN YÜRÜ.", "Işığı biz ayarladık.", show_pill=True),
    "Sen yürü. Işığı biz ayarladık."),
 ]),
 "u2": dict(audio="u2-24-saat.mp3", out="video-u2-24-saat.mp4", segs=[
   (lambda: still_photo(BG("venedik-bg.jpg"), "24 SAAT İZİ", "BU NOT YARIN OLMAYACAK.", chip="23:59"),
    "Bu not yarın haritada olmayacak."),
   (lambda: still_photo(BG("venedik-bg.jpg"), "24 SAAT İZİ", "'RİALTO'DA SIKIŞMA. CANNAREGİO'YA YÜRÜ.'", fy=.4),
    "Bir gezgin bıraktı: Herkes Rialto'da sıkışıyor, sen Cannaregio'ya yürü."),
   (lambda: still_photo(BG("venedik-bg.jpg"), "24 SAAT İZİ", "40 DAKİKA. BOŞ SOKAK.", "Aynı kanal, kalabalık yok.", fy=.6),
    "Kırk dakika. Aynı kanal, boş sokak."),
   (lambda: still_photo(BG("venedik-bg.jpg"), "24 SAAT İZİ", "SİLİNMEDEN GİT.", chip="00:01", show_pill=True),
    "Bazı izler yirmi dört saat yaşar. Silinmeden git, gör."),
 ]),
}


def srt_ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build(vid):
    v = VIDEOS[vid]
    mp3 = os.path.join(SES, v["audio"])
    dur = MP3(mp3).info.length
    total = dur + 0.7
    texts = [t for _, t in v["segs"]]
    weights = [max(8, len(t)) for t in texts]
    durs = [total * w / sum(weights) for w in weights]
    durs = [max(1.5, d) for d in durs]
    k = total / sum(durs)
    durs = [d * k for d in durs]
    stills = []
    for i, (fn, _) in enumerate(v["segs"], 1):
        p = os.path.join(STILLS, f"{vid}-{i}.jpg")
        fn().save(p, quality=90)
        stills.append(p)
    # SRT
    srt_path = os.path.join(OUT, v["out"].replace(".mp4", ".srt"))
    t, lines = 0.0, []
    for i, (tx, d) in enumerate(zip(texts, durs), 1):
        lines += [str(i), f"{srt_ts(t)} --> {srt_ts(t + d)}", tx, ""]
        t += d
    open(srt_path, "w", encoding="utf-8").write("\n".join(lines))
    # ffmpeg
    inputs, filters = [], []
    for p in stills:
        inputs += ["-i", p]
    n = len(stills)
    for i, d in enumerate(durs):
        frames = max(2, int(round(d * FPS)))
        filters.append(
            f"[{i}:v]scale=1620:2880,zoompan=z='1+0.05*on/{frames}':x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[v{i}]")
    filters.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vc]")
    filters.append(f"[vc]fade=t=in:st=0:d=0.3,fade=t=out:st={total - 0.45:.2f}:d=0.45[vout]")
    filters.append(f"[{n}:a]apad,atrim=0:{total:.2f},afade=t=out:st={total - 0.5:.2f}:d=0.5,aresample=48000[aout]")
    out = os.path.join(OUT, v["out"])
    cmd = [FF, "-hide_banner", "-loglevel", "error", "-y"] + inputs + ["-i", mp3,
           "-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
           "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-ac", "1",
           "-ar", "48000", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(f"OK {v['out']}  ses={dur:.2f}sn toplam={total:.2f}sn  {os.path.getsize(out)/1e6:.2f} MB  + {os.path.basename(srt_path)}")


if __name__ == "__main__":
    ids = sys.argv[1:] or list(VIDEOS.keys())
    for vid in ids:
        build(vid)
    print("BITTI")

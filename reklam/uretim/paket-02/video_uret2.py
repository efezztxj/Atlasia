# -*- coding: utf-8 -*-
"""Paket-02 · "Orada Değil, Burada" — profesyonel video hattı.
Farkları (Paket-01'e göre): sessizlik algılamayla gerçek cümle senkronu, ayrı metin
katmanı (fade-in/out), değişken yönlü Ken Burns, xfade geçişleri, outro kartı,
-16 LUFS loudnorm, gömülü altyazı hapı + .srt, kapak çıktısı.
Çalıştır: python3 reklam/uretim/paket-02/video_uret2.py
"""
import os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import imageio_ffmpeg
from mutagen.mp3 import MP3

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "kaynak")
WORK = os.path.join(SRC, "work")
SES = os.path.join(BASE, "ses")
OUT = os.path.join(BASE, "videolar")
COVERS = os.path.join(BASE, "gorseller")
for d in (WORK, OUT, COVERS):
    os.makedirs(d, exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS, XF = 1080, 1920, 30, 0.35
INK, CREAM, GOLD, MINT, DIM = (2, 13, 23), (241, 240, 233), (243, 200, 112), (126, 224, 184), (180, 190, 198)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SERIES = "ORADA DEĞİL BURADA"


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
    st = int(h * 0.30)
    for y in range(h):
        px[0, y] = 0 if y <= st else int(238 * ((y - st) / max(1, h - st)) ** 1.3)
    im = Image.composite(Image.new("RGB", (w, h), (1, 7, 13)), im, g.resize((w, h)))
    g2 = Image.new("L", (1, h), 0)
    px = g2.load()
    en = int(h * 0.20)
    for y in range(h):
        px[0, y] = int(140 * max(0.0, 1 - y / max(1, en))) if y < en else 0
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


def base_still(bg, fy):
    im = cover_crop(Image.open(bg), W, H, fy)
    return shade(ImageEnhance.Color(im).enhance(1.07))


def text_layer(no, head, hl, sentence):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # kicker
    kf = font(FB, 30)
    d.rectangle([64, 90, 118, 98], fill=GOLD + (255,))
    d.text((134, 78), f"{SERIES} · {no}", font=kf, fill=GOLD + (255,))
    # headline (kelime kelime, vurgular altın)
    size = 118
    while size > 46:
        fnt = font(FB, size)
        lines = wrap(d, head, fnt, W - 128)
        if len(lines) <= 4 and all(d.textlength(l, font=fnt) <= W - 128 for l in lines):
            break
        size -= 6
    fnt = font(FB, size)
    lines = wrap(d, head, fnt, W - 128)
    asc, desc = fnt.getmetrics()
    step = int((asc + desc) * 1.08)
    y = 900 if len(lines) <= 3 else 772
    for line in lines:
        cx = 64
        for part in line.split(" "):
            col = GOLD if part.strip("?.!,:'") in [h.strip("?.!,:'") for h in hl] else CREAM
            d.text((cx + 3, y + 3), part, font=fnt, fill=(0, 0, 0, 255))
            d.text((cx, y), part, font=fnt, fill=col + (255,))
            cx += int(d.textlength(part + " ", font=fnt))
        y += step
    d.rectangle([64, y + 14, 136, y + 21], fill=GOLD + (255,))
    # altyazı hapı (söylenen cümle)
    sf = font(FR, 38)
    slines = wrap(d, sentence, sf, W - 220)
    ph = len(slines) * 54 + 36
    pw = int(max(d.textlength(l, font=sf) for l in slines) + 56)
    py = 1430
    d.rounded_rectangle([64, py, 64 + pw, py + ph], radius=26, fill=(2, 13, 23, 200))
    yy = py + 18
    for l in slines:
        d.text((92, yy), l, font=sf, fill=(238, 240, 235, 255))
        yy += 54
    return im


def outro_still(no):
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    cx, cy = W // 2, 560
    for r in (420, 315, 210):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(22, 58, 80), width=3)
    d.ellipse([cx - 118, cy - 236, cx + 118, cy], fill=GOLD)
    d.polygon([(cx - 84, cy - 50), (cx + 84, cy - 50), (cx, cy + 136)], fill=GOLD)
    d.ellipse([cx - 47, cy - 165, cx + 47, cy - 71], fill=INK)
    kf = font(FB, 30)
    d.rectangle([64, 90, 118, 98], fill=GOLD)
    d.text((134, 78), f"{SERIES} · {no}", font=kf, fill=GOLD)
    fnt = font(FB, 104)
    y = 1080
    for line, col in [("ORADA DEĞİL.", CREAM), ("BURADA.", GOLD)]:
        tw = d.textlength(line, font=fnt)
        d.text(((W - tw) / 2, y), line, font=fnt, fill=col)
        y += 128
    sf = font(FR, 42)
    tw = d.textlength("Rotası Atlasia'da.", font=sf)
    d.text(((W - tw) / 2, y + 10), "Rotası Atlasia'da.", font=sf, fill=(232, 234, 230))
    pf = font(FB, 40)
    tw = d.textlength("atlasia.pages.dev", font=pf)
    pw, ph = int(tw + 96), 88
    d.rounded_rectangle([(W - pw) // 2, y + 110, (W + pw) // 2, y + 110 + ph], radius=ph // 2, fill=GOLD)
    d.text(((W - tw) / 2, y + 110 + 20), "atlasia.pages.dev", font=pf, fill=INK)
    ff = font(FR, 30)
    tw = d.textlength("28 nokta · 4 sesli tur · ücretsiz, reklam yok", font=ff)
    d.text(((W - tw) / 2, H - 120), "28 nokta · 4 sesli tur · ücretsiz, reklam yok", font=ff, fill=DIM)
    return im


def detect_bounds(mp3, texts):
    dur = MP3(mp3).info.length
    total = dur + 0.25
    ws = [max(8, len(t)) for t in texts]
    targets, acc = [], 0.0
    for w in ws[:-1]:
        acc += total * w / sum(ws)
        targets.append(acc)
    p = subprocess.run([FF, "-hide_banner", "-i", mp3, "-af",
                        "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", p.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", p.stderr)]
    mids = [(a + b) / 2 for a, b in zip(starts, ends) if 0.3 < a < dur - 0.4]
    used, cuts = set(), []
    for tg in targets:
        cand = [(abs(m - tg), j, m) for j, m in enumerate(mids) if j not in used and abs(m - tg) <= 1.0]
        if cand:
            _, j, m = min(cand)
            used.add(j)
            cuts.append(m)
        else:
            cuts.append(tg)
    bounds = [0.0]
    for c in cuts:
        bounds.append(max(c, bounds[-1] + 1.15))
    if total - bounds[-1] < 1.2:
        bounds[-1] = total - 1.2
    bounds.append(total)
    return [bounds[i + 1] - bounds[i] for i in range(len(texts))], dur


def proportional(texts, dur):
    ws = [max(8, len(t)) for t in texts]
    tot = dur + 0.25
    ds = [max(1.4, tot * w / sum(ws)) for w in ws]
    k = tot / sum(ds)
    return [d * k for d in ds]


def srt_ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


BG = lambda n: os.path.join(SRC, n)
B = lambda bg, fy, head, sent, hl=(): dict(bg=bg, fy=fy, head=head, sent=sent, hl=list(hl))

VIDEOS = {
 "s1": dict(no="01", audio="s1-bademli.mp3", out="video-s1-bademli.mp4", cover="kapak-s1-bademli.jpg", beats=[
   B(BG("maldivler-bg.jpg"), .45, "MALDİVLER'E BAKIYORSUN.", "Maldivler'e bakıyorsun.", ["BAKIYORSUN."]),
   B(BG("maldivler-bg.jpg"), .62, "AKTARMA + BİR SERVET", "Aktarmalı uçuş. Bir de o fiyatlar."),
   B(BG("bademli-bg.jpg"), .5, "AYNI TURKUAZ: BADEMLİ", "Aynı turkuaz İzmir'de. Dikili'de. Bademli koylarında.", ["BADEMLİ"]),
   B(BG("bademli-bg.jpg"), .35, "UÇAK YOK. KUYRUK YOK.", "Uçak yok. Kuyruk yok. İniyorsun, yüzüyorsun."),
   B(BG("bademli-bg.jpg"), .58, "ORADA DEĞİL. BURADA.", "Orada değil. Burada.", ["BURADA."]),
 ]),
 "s2": dict(no="02", audio="s2-salda.mp3", out="video-s2-salda.mp4", cover="kapak-s2-salda.jpg", beats=[
   B(BG("salda-bg.jpg"), .5, "NASA BURAYI MARS'A BENZETİYOR.", "NASA, bu gölü Mars'a benzetiyor.", ["MARS'A"]),
   B(BG("mars-bg.jpg"), .5, "MARS'TAKİ KRATERLE AYNI MİNERAL", "Mars'taki Jezero Krateri'yle aynı minerallere sahip, diyor."),
   B(BG("salda-bg.jpg"), .38, "AMERİKA'DA DEĞİL. BURDUR'DA.", "O göl Amerika'da değil. Burdur'da. Salda Gölü.", ["BURDUR'DA."]),
   B(BG("salda-bg.jpg"), .66, "SALDA GÖLÜ", "Beyaz kum. Turkuaz su. Uzaya çıkmadan Mars.", ["SALDA"]),
   B(BG("salda-bg.jpg"), .52, "ORADA DEĞİL. BURADA.", "Orada değil. Burada.", ["BURADA."]),
 ]),
 "s3": dict(no="03", audio="s3-termessos.mp3", out="video-s3-termessos.mp4", cover="kapak-s3-termessos.jpg", beats=[
   B(BG("machu-bg.jpg"), .45, "MACHU PICCHU'YA CAN ATIYORSUN.", "Machu Picchu'ya can atıyorsun.", ["ATIYORSUN."]),
   B(BG("machu-bg.jpg"), .6, "DAĞIN TEPESİNDE KAYIP ŞEHİR", "Peru'da. Dağın tepesinde kayıp bir şehir."),
   B(BG("termessos-bg.jpg"), .5, "AYNISI ANTALYA'DA: TERMESSOS", "Aynısı Antalya'da da var. Termessos. Bin metrenin üstünde.", ["TERMESSOS"]),
   B(BG("termessos-bg.jpg"), .62, "İSKENDER BİLE ALAMAMIŞ.", "Büyük İskender bile alamamış bu şehri.", ["ALAMAMIŞ."]),
   B(BG("termessos-bg.jpg"), .4, "ORADA DEĞİL. BURADA.", "Orada değil. Burada.", ["BURADA."]),
 ]),
 "s4": dict(no="04", audio="s4-kuyucak.mp3", out="video-s4-kuyucak.mp4", cover="kapak-s4-kuyucak.jpg", beats=[
   B(BG("provence-bg.jpg"), .45, "PROVENCE'I KOVALIYORSUN.", "Provence'ta lavanta tarlası kovalıyorsun.", ["KOVALIYORSUN."]),
   B(BG("provence-bg.jpg"), .62, "MOR TARLALAR. O FOTOĞRAF.", "Fransa'da. Mor tarlalar. O meşhur fotoğraf."),
   B(BG("kuyucak-bg.jpg"), .5, "AYNI MOR: KUYUCAK", "Aynı mor Isparta'da. Kuyucak köyünde.", ["KUYUCAK"]),
   B(BG("kuyucak-bg.jpg"), .38, "TEMMUZ'DA KÖY MORA BÜRÜNÜYOR.", "Temmuz gelince bütün köy mora bürünüyor."),
   B(BG("kuyucak-bg.jpg"), .58, "ORADA DEĞİL. BURADA.", "Orada değil. Burada.", ["BURADA."]),
 ]),
}


def build(vid):
    v = VIDEOS[vid]
    mp3 = os.path.join(SES, v["audio"])
    beats = v["beats"]
    durs, adur = detect_bounds(mp3, [b["sent"] for b in beats])
    mode = "karma-senkron"
    OUTRO = 1.9
    # kareler
    inputs, filters, seg_labels = [], [], []
    all_durs = durs + [OUTRO]
    seg_len = lambda i: all_durs[i] + (XF + 0.12 if i < len(all_durs) - 1 else 0.0)
    idx = 0
    for i, b in enumerate(beats):
        base_p = os.path.join(WORK, f"{vid}-b{i+1}.jpg")
        txt_p = os.path.join(WORK, f"{vid}-t{i+1}.png")
        bs = base_still(b["bg"], b["fy"])
        bs.save(base_p, quality=92)
        tl = text_layer(v["no"], b["head"], b["hl"], b["sent"])
        tl.save(txt_p)
        if i == 0:  # kapak = ilk beat kompoziti
            cov = bs.convert("RGBA"); cov.alpha_composite(tl)
            cov.convert("RGB").save(os.path.join(COVERS, v["cover"]), quality=90)
        d, L = all_durs[i], seg_len(i)
        frames = max(2, int(round(L * FPS)))
        zoom = f"1+0.055*on/{frames}" if i % 2 == 0 else f"1.055-0.055*on/{frames}"
        bi, ti = idx, idx + 1; idx += 2
        inputs += ["-i", base_p, "-loop", "1", "-framerate", str(FPS), "-t", f"{L:.2f}", "-i", txt_p]
        filters.append(
            f"[{bi}:v]scale=1620:2880,zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={W}x{H}:fps={FPS},trim=0:{L:.2f},setpts=PTS-STARTPTS,settb=AVTB,format=yuv420p[base{i}]")
        filters.append(
            f"[{ti}:v]format=rgba,fade=t=in:st=0.12:d=0.28:alpha=1,fade=t=out:st={max(0.5, d-0.12):.2f}:d=0.3:alpha=1,"
            f"trim=0:{L:.2f},setpts=PTS-STARTPTS[txt{i}]")
        filters.append(f"[base{i}][txt{i}]overlay=0:0,fps=30,settb=AVTB,format=yuv420p[seg{i}]")
        seg_labels.append(f"[seg{i}]")
    # outro segmenti (pişmiş kare, hafif zoom)
    out_p = os.path.join(WORK, f"{vid}-outro.jpg")
    outro_still(v["no"]).save(out_p, quality=92)
    frames = int(round(OUTRO * FPS))
    oi, idx = idx, idx + 1
    inputs += ["-i", out_p]
    j = len(beats)
    filters.append(
        f"[{oi}:v]scale=1620:2880,zoompan=z='1+0.03*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s={W}x{H}:fps={FPS},trim=0:{OUTRO:.2f},setpts=PTS-STARTPTS,fps=30,settb=AVTB,format=yuv420p[seg{j}]")
    seg_labels.append(f"[seg{j}]")
    # xfade zinciri — offset'ler nominal sınırlar (handle'lar payı veriyor)
    total = sum(all_durs)
    cur = seg_labels[0]
    for k in range(1, len(seg_labels)):
        off = sum(all_durs[:k])
        lbl = f"[x{k}]"
        filters.append(f"{cur}{seg_labels[k]}xfade=transition=fade:duration={XF}:offset={off:.2f}{lbl}")
        cur = lbl
    filters.append(f"{cur}trim=0:{total:.2f},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25,fade=t=out:st={total-0.4:.2f}:d=0.4,format=yuv420p[vout]")
    ai = idx
    filters.append(f"[{ai}:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=0:{total:.2f},"
                   f"afade=t=out:st={total-0.45:.2f}:d=0.45[aout]")
    out = os.path.join(OUT, v["out"])
    cmd = [FF, "-hide_banner", "-loglevel", "error", "-y"] + inputs + ["-i", mp3,
           "-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
           "-preset", "veryfast", "-crf", "19", "-c:a", "aac", "-b:a", "160k", "-ac", "1",
           "-ar", "48000", "-movflags", "+faststart", out]
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        print(p.stderr[-3000:])
        raise SystemExit(f"ffmpeg hata: {vid}")
    # SRT (xfade kaymasını yaklaşık yansıt: kesimler xf/2 erken)
    lines, t = [], 0.0
    for i, b in enumerate(beats):
        lines += [str(i + 1), f"{srt_ts(t)} --> {srt_ts(t + durs[i])}", b["sent"], ""]
        t += durs[i]
    open(os.path.join(OUT, v["out"].replace(".mp4", ".srt")), "w", encoding="utf-8").write("\n".join(lines))
    print(f"OK {v['out']}  [{mode}] ses={adur:.2f}sn toplam={total:.2f}sn  {os.path.getsize(out)/1e6:.2f} MB  cuts={[round(x,2) for x in durs]}")


if __name__ == "__main__":
    for vid in (sys.argv[1:] or list(VIDEOS.keys())):
        build(vid)
    print("BITTI")

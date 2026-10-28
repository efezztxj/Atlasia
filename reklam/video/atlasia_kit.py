"""Atlasia reklam filmleri için ortak görsel kit.

Kaynak reels'lerde gömülü metin var; bu yüzden hiçbir kare tam ekran kullanılmaz,
yalnız yazısız bölgeden (y 1080-1732) kırpım alınır. Kurgu koyu zeminde tipografi +
ürün mockup'ı üzerine kurulur. Bkz. reklam/video/README.md.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "reklam" / "video" / "build"
STILLS = BUILD / "stills"
OUT_DIR = ROOT / "reklam" / "video"

W, H, FPS = 1080, 1920, 30

INK = (2, 13, 23)
INK2 = (6, 24, 29)
CREAM = (241, 240, 233)
GOLD = (243, 200, 112)
MINT = (126, 224, 184)
MUTED = (198, 216, 210)

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FB if bold else FR, size)


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


# ------------------------------------------------------------------ metin


def text_layer(text: str, fnt, color, tracking: int = 0, blur: int = 16) -> Image.Image:
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    widths = [probe.textlength(ch, font=fnt) for ch in text]
    tw = int(sum(widths) + tracking * max(0, len(text) - 1))
    asc, desc = fnt.getmetrics()
    raw = Image.new("RGBA", (max(1, tw) + 6, asc + desc + 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(raw)
    x = 3
    for ch, w in zip(text, widths):
        d.text((x, 3), ch, font=fnt, fill=color + (255,))
        x += w + tracking
    pad = blur
    canvas = Image.new("RGBA", (raw.width + pad * 2, raw.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", raw.size, (0, 0, 0, 190)), (pad, pad + 3))
    sh.putalpha(sh.getchannel("A"))
    mask = Image.new("L", canvas.size, 0)
    mask.paste(raw.getchannel("A"), (pad, pad + 3))
    canvas.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, 0), mask.point(lambda v: int(v * 0.55)))
    canvas.alpha_composite(raw, (pad, pad))
    return canvas


def paste(base: Image.Image, layer: Image.Image, xy, alpha: float = 1.0):
    if alpha <= 0.004:
        return
    a = layer.getchannel("A")
    if alpha < 0.999:
        a = a.point(lambda v: int(v * alpha))
    base.paste(layer.convert("RGB"), (int(xy[0]), int(xy[1])), a)


# ------------------------------------------------------------------ fotoğraf kırpımları

STILL_NAMES = ["k1", "g1", "p1", "v1", "k3", "g2", "p2", "v2", "g3", "p3", "v3", "k1"]
RAW = {n: Image.open(STILLS / f"{n}.jpg").convert("RGB") for n in STILL_NAMES}

# Kaynak reels'ler kart geçişli: gömülü yazı y≈590–930 (başlık + alt başlık) ve
# y≈1735–1775 (yer adı) bölgelerinde; rozetler y≈55–105. ÖLÇÜLDÜ (kare varyansı).
# Tek güvenli bölge: y 960–1690. Kare kırpım buradan alınır.
CLEAN_Y0, CLEAN_Y1 = 1080, 1732
CLEAN_SIDE = CLEAN_Y1 - CLEAN_Y0          # 652
CLEAN_X0 = (W - CLEAN_SIDE) // 2          # 214


def clean_square(name: str, size: int) -> Image.Image:
    img = RAW[name]
    return img.crop((CLEAN_X0, CLEAN_Y0, CLEAN_X0 + CLEAN_SIDE, CLEAN_Y1)).resize(
        (size, size), Image.LANCZOS)


def clean_wide(name: str) -> Image.Image:
    """Yazısız bölgeden geniş kırpım; oranı bozmadan 1080x1920'ye oturtur."""
    src = RAW[name].crop((0, CLEAN_Y0, W, CLEAN_Y1))
    scale = max(W / src.width, H / src.height)
    nw, nh = int(src.width * scale), int(src.height * scale)
    src = src.resize((nw, nh), Image.LANCZOS)
    return src.crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))


# ------------------------------------------------------------------ zemin


def glow_bg() -> Image.Image:
    bg = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(bg)
    for r in range(620, 0, -6):
        a = (1 - r / 620) ** 2.2 * 0.30
        col = (int(INK[0] + (GOLD[0] - INK[0]) * a), int(INK[1] + (GOLD[1] - INK[1]) * a),
               int(INK[2] + (GOLD[2] - INK[2]) * a))
        d.ellipse([W - 240 - r, -160 - r, W - 240 + r, -160 + r], fill=col)
    return bg


GLOW = glow_bg()


def photo_bg(name: str, blur: int = 26, opacity: float = 0.16, dark: float = 0.55) -> Image.Image:
    """Koyu zeminde çok soluk, okunamaz fotoğraf dokusu."""
    bg = GLOW.copy()
    ph = clean_wide(name).filter(ImageFilter.GaussianBlur(blur))
    ph = ImageEnhance.Brightness(ph).enhance(dark)
    return Image.blend(bg, ph, opacity)


def vignette(img: Image.Image, strength: int = 120) -> Image.Image:
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    steps = 26
    for i in range(steps):
        f = i / steps
        inset = int(f * 520)
        d.ellipse([-inset + 120, -inset + 260, W + inset - 120, H + inset - 260],
                  fill=int(strength * (1 - f) ** 1.4))
    mask = mask.filter(ImageFilter.GaussianBlur(90))
    img = img.copy()
    img.paste(Image.new("RGB", (W, H), INK), (0, 0), mask)
    return img


def bottom_scrim(img: Image.Image, height: int = 620, strength: int = 215) -> Image.Image:
    col = Image.new("L", (1, height))
    for y in range(height):
        col.putpixel((0, y), int(strength * (y / height) ** 1.6))
    img = img.copy()
    img.paste(Image.new("RGB", (W, height), INK), (0, H - height), col.resize((W, height)))
    return img


# ------------------------------------------------------------------ rozet


def badge() -> Image.Image:
    t = text_layer("200 METRE · 04", font(27), (255, 255, 255), tracking=6, blur=0)
    pad = 20
    box = Image.new("RGBA", (t.width + pad * 2, t.height + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(box)
    d.rounded_rectangle([0, 0, box.width - 1, box.height - 1], radius=99,
                        fill=INK + (225,), outline=(255, 255, 255, 105), width=2)
    box.alpha_composite(t, (pad, 0))
    return box


BADGE = badge()


# ------------------------------------------------------------------ galeri duvarı

TILE, GAP, MARGIN = 258, 10, 16
COLS = 4
WALL_W = MARGIN * 2 + COLS * TILE + (COLS - 1) * GAP
WALL_X = (W - WALL_W) // 2
ROWS = 16
WALL_H = MARGIN * 2 + ROWS * TILE + (ROWS - 1) * GAP


def build_wall() -> Image.Image:
    canvas = Image.new("RGB", (WALL_W, WALL_H), INK)
    for r in range(ROWS):
        for c in range(COLS):
            name = STILL_NAMES[(r * COLS + c) % len(STILL_NAMES)]
            tile = clean_square(name, TILE)
            tile = ImageEnhance.Brightness(tile).enhance(0.74)
            tile = ImageEnhance.Color(tile).enhance(0.8)
            canvas.paste(tile, (MARGIN + c * (TILE + GAP), MARGIN + r * (TILE + GAP)))
    return canvas


WALL = build_wall()
KEEP = [(3, 1), (5, 2), (7, 0), (9, 3), (11, 1)]


def wall_frame(offset: float, veil: float, keep_lit: bool) -> Image.Image:
    off = int(clamp(offset) * (WALL_H - H))
    base = Image.new("RGB", (W, H), INK)
    slab = WALL.crop((0, off, WALL_W, min(WALL_H, off + H)))
    base.paste(slab, (WALL_X, 0))
    if veil > 0:
        base = Image.blend(base, Image.new("RGB", (W, H), INK), veil)
    if keep_lit:
        for r, c in KEEP:
            x = WALL_X + MARGIN + c * (TILE + GAP)
            y = MARGIN + r * (TILE + GAP) - off
            if -TILE < y < H:
                base.paste(clean_square(STILL_NAMES[(r * COLS + c) % len(STILL_NAMES)], TILE), (x, y))
                d = ImageDraw.Draw(base)
                d.rectangle([x - 2, y - 2, x + TILE + 1, y + TILE + 1], outline=CREAM, width=3)
    return base


# ------------------------------------------------------------------ ürün mockup'ı

CARD = (94, 556, W - 94, 1560)
PTS = [(190, 1440), (330, 1330), (300, 1210), (470, 1130), (640, 1080), (790, 990), (900, 880)]


def card_panel(img: Image.Image) -> Image.Image:
    x0, y0, x1, y1 = CARD
    panel = Image.new("RGB", (x1 - x0, y1 - y0), INK2)
    ph = clean_square("g2", 820)
    ph = ph.filter(ImageFilter.GaussianBlur(3))
    ph = ImageEnhance.Brightness(ph).enhance(0.52)
    ph = ImageEnhance.Color(ph).enhance(0.55)
    pw, phh = x1 - x0, y1 - y0
    scale = max(pw / ph.width, phh / ph.height)
    ph = ph.resize((int(ph.width * scale), int(ph.height * scale)), Image.LANCZOS)
    panel.paste(ph.crop(((ph.width - pw) // 2, (ph.height - phh) // 2,
                         (ph.width - pw) // 2 + pw, (ph.height - phh) // 2 + phh)), (0, 0))
    panel = Image.blend(panel, Image.new("RGB", panel.size, INK), 0.52)

    d = ImageDraw.Draw(panel, "RGBA")
    for gx in range(0, pw, 54):
        d.line([(gx, 0), (gx, phh)], fill=(255, 255, 255, 12), width=1)
    for gy in range(0, phh, 54):
        d.line([(0, gy), (pw, gy)], fill=(255, 255, 255, 12), width=1)

    r = Image.new("RGBA", panel.size, (0, 0, 0, 0))
    ImageDraw.Draw(r).rounded_rectangle([0, 0, pw - 1, phh - 1], radius=34, fill=(255, 255, 255, 255))
    mask = r.getchannel("A")
    img.paste(panel, (x0, y0), mask)
    ImageDraw.Draw(img).rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=34,
                                          outline=(255, 255, 255, 42), width=2)
    return img


def draw_route(img: Image.Image, progress: float):
    lx = [p[0] - CARD[0] for p in PTS]
    ly = [p[1] - CARD[1] for p in PTS]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    seglens = [((lx[i + 1] - lx[i]) ** 2 + (ly[i + 1] - ly[i]) ** 2) ** 0.5 for i in range(len(PTS) - 1)]
    total = sum(seglens)
    target = total * clamp(progress)
    acc = 0.0
    dash, gap, on = 24.0, 18.0, True
    for i in range(len(PTS) - 1):
        seg = seglens[i]
        pos = 0.0
        while pos < seg and acc < target:
            span = dash if on else gap
            end = min(pos + span, seg, pos + (target - acc))
            if on and end > pos:
                t1, t2 = pos / seg, end / seg
                d.line([(CARD[0] + lx[i] + (lx[i + 1] - lx[i]) * t1, CARD[1] + ly[i] + (ly[i + 1] - ly[i]) * t1),
                        (CARD[0] + lx[i] + (lx[i + 1] - lx[i]) * t2, CARD[1] + ly[i] + (ly[i + 1] - ly[i]) * t2)],
                       fill=GOLD + (240,), width=8)
            acc += end - pos
            pos = end
            on = not on
        if acc >= target:
            break
    shown = clamp((progress - 0.10) / 0.90) * len(PTS)
    for i, (px, py) in enumerate(PTS):
        if i >= round(shown):
            continue
        d.ellipse([px - 23, py - 23, px + 23, py + 23], fill=(255, 255, 255, 235))
        d.ellipse([px - 11, py - 11, px + 11, py + 11], fill=INK + (255,))
        d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=GOLD + (255,))
    img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A"))
    return img


def stop_chip(img: Image.Image, alpha: float):
    if alpha <= 0.01:
        return img
    x0, y0 = CARD[0] + 34, CARD[3] - 168
    w, h = CARD[2] - CARD[0] - 68, 128
    chip = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(chip)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=24, fill=INK + (232,), outline=(255, 255, 255, 40), width=2)
    d.ellipse([26, 44, 66, 84], fill=GOLD + (255,))
    d.text((86, 28), "Celsus Kütüphanesi", font=font(30), fill=CREAM + (255,))
    d.text((86, 72), "Varışta 27° · yağış %10", font=font(25, bold=False), fill=MUTED + (235,))
    paste(img, chip, (x0, y0), alpha)
    return img




# ------------------------------------------------------------------ kodlayıcı


def encode_video(render_frame, out_path: Path, voice_path: Path, total_frames: int,
                 cover_at: int | None = None, cover_path: Path | None = None) -> int:
    """render_frame(i, t) -> PIL.Image olacak şekilde kareleri üretip mp4'e yazar."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(voice_path), "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-level", "4.1", "-g", str(FPS * 2),
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        "-movflags", "+faststart", "-shortest", str(out_path),
    ]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for i in range(total_frames):
            img = render_frame(i, i / FPS)
            if cover_at is not None and i == cover_at and cover_path is not None:
                img.save(cover_path, quality=90)
            enc.stdin.write(img.convert("RGB").tobytes())
    finally:
        enc.stdin.close()
        rc = enc.wait()
    if rc != 0:
        print("ffmpeg hatası", rc, file=sys.stderr)
        return rc
    print(f"yazıldı: {out_path}  ({out_path.stat().st_size / 1e6:.2f} MB)")
    return 0

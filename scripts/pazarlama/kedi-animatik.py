#!/usr/bin/env python3
"""
Atlasia — "Dünyayı bir kedi döndürüyor" animatik üretici.

Girdi : docs/pazarlama/kreatifler/ai-video-keyframe/*.jpg (AI ile üretilmiş ana kareler)
Çıktı : docs/pazarlama/kreatifler/ai-video-keyframe/animatik-dikey.mp4 (9:16, sessiz)

Ken Burns (yaklaşma/kayma) + alt bant metin + yumuşak karartma geçişleri.
Bu dosya gerçek bir AI video değil, **çekim öncesi akış provası**dır: dış AI video aracına
verilecek kare sırası, süre ve yazı zamanlamasını kilitler.

Kullanım:
  pip install --break-system-packages --target ~/.pylibs pillow
  PYTHONPATH=~/.pylibs python3 scripts/pazarlama/kedi-animatik.py
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
KEY = ROOT / "docs/pazarlama/kreatifler/ai-video-keyframe"
OUT = KEY / "animatik-dikey.mp4"

W, H, FPS = 720, 1280, 24
INK = (2, 21, 18)
MINT = (228, 245, 234)
SUN = (234, 181, 79)
DIM = (168, 192, 180)

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(text: str, f, max_w: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if f.getlength(trial) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def cover(img: Image.Image, zoom: float, dx: float, dy: float) -> Image.Image:
    """Görüntüyü kareye sığdır, zoom ve kaydırma uygula (Ken Burns)."""
    src_w, src_h = img.size
    scale = max(W / src_w, H / src_h) * zoom
    nw, nh = int(src_w * scale) + 1, int(src_h * scale) + 1
    resized = img.resize((nw, nh), Image.LANCZOS)
    max_x, max_y = nw - W, nh - H
    x = int(max_x * (0.5 + dx))
    y = int(max_y * (0.5 + dy))
    x = max(0, min(max_x, x))
    y = max(0, min(max_y, y))
    return resized.crop((x, y, x + W, y + H))


def bottom_scrim(img: Image.Image, strength: float) -> Image.Image:
    """Alt üçte birlik alanda okunabilirlik için degrade karartma."""
    scrim = Image.new("L", (1, H), 0)
    px = scrim.load()
    start = int(H * 0.44)
    for y in range(H):
        if y < start:
            px[0, y] = 0
        else:
            t = (y - start) / (H - start)
            px[0, y] = int(248 * (t ** 1.15) * strength)
    mask = scrim.resize((W, H))
    black = Image.new("RGB", (W, H), INK)
    return Image.composite(black, img, mask.point(lambda v: v))


def ease(t: float) -> float:
    return t * t * (3 - 2 * t)


SCENES = [
    {
        "src": "01-kedi-kure.jpg",
        "dur": 2.6,
        "kicker": "atlasia",
        "lines": [("Dünyayı bir kedi", MINT), ("döndürüyor.", SUN)],
        "sub": "Ciddiyim. Reklamı da yapay zekâ yaptı.",
        "zoom": (1.00, 1.10),
        "pan": ((0.0, 0.0), (0.03, -0.02)),
    },
    {
        "src": "02-pati-kure.jpg",
        "dur": 2.6,
        "kicker": "01 / 03",
        "lines": [("Sen haritaya", MINT), ("bakıyorsun.", MINT)],
        "sub": "O küreyi çeviriyor.",
        "zoom": (1.14, 1.02),
        "pan": ((0.04, 0.02), (-0.02, 0.0)),
    },
    {
        "src": "03-kedi-harita.jpg",
        "dur": 3.0,
        "kicker": "02 / 03",
        "lines": [("3 saat. 11 durak.", SUN), ("Sıra belli.", MINT)],
        "sub": "Her durağın gerekçesi yazılı. Uydurma yok.",
        "zoom": (1.02, 1.13),
        "pan": ((0.0, -0.03), (0.0, 0.03)),
    },
    {
        "src": None,
        "dur": 2.4,
        "kicker": "03 / 03",
        "lines": [("Gerisini", MINT), ("Atlasia yapıyor.", SUN)],
        "sub": "Yaklaşınca anlatır. İzin verirsen.",
        "zoom": (1.0, 1.0),
        "pan": ((0.0, 0.0), (0.0, 0.0)),
    },
    {
        "src": "01-kedi-kure.jpg",
        "dur": 2.4,
        "kicker": "son",
        "lines": [("Uygulama yok.", MINT), ("Mağaza yok.", MINT), ("Link var.", SUN)],
        "sub": "atlasia.pages.dev",
        "zoom": (1.10, 1.20),
        "pan": ((0.02, 0.02), (0.0, -0.01)),
    },
]

FADE = 0.28  # saniye; sahne başı/sonu karartma


def brand_card() -> Image.Image:
    """Uygulama arayüzü taklidi yok: yalnız marka zemini (harita ızgarası + yaylar)."""
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    step = 96
    for gx in range(0, W + step, step):
        d.line([(gx, 0), (gx, H)], fill=(26, 52, 44), width=1)
    for gy in range(0, H + step, step):
        d.line([(0, gy), (W, gy)], fill=(26, 52, 44), width=1)
    for i, r in enumerate(range(150, 900, 90)):
        d.arc([W // 2 - r, H // 2 - r - 120, W // 2 + r, H // 2 + r - 120], 110, 250, fill=(44, 66, 55), width=2)
    return img


def shadow_text(d, xy, text, f, fill, offset=3):
    """Koyu zeminde ince gölge: hareketli görüntü üzerinde okunabilirlik."""
    d.text((xy[0] + offset, xy[1] + offset), text, font=f, fill=(0, 0, 0))
    d.text(xy, text, font=f, fill=fill)


def text_block(img: Image.Image, scene: dict, alpha: float) -> Image.Image:
    if alpha <= 0.01:
        return img
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    margin = 56

    y = int(H * 0.615)
    kick = scene["kicker"]
    kf = font(REG, 22)
    shadow_text(d, (margin, y), kick.upper(), kf, SUN if kick != "atlasia" else MINT)
    y += 46

    hf = font(BOLD, 64)
    for text, color in scene["lines"]:
        shadow_text(d, (margin, y), text, hf, color, offset=4)
        y += 74

    sf = font(REG, 30)
    y += 14
    for line in wrap(scene["sub"], sf, W - margin * 2):
        shadow_text(d, (margin, y), line, sf, DIM, offset=2)
        y += 42

    # yazı katmanını kendi alfasıyla bindir (zemin saydam kalır)
    a = layer.getchannel("A").point(lambda v: int(v * alpha))
    layer.putalpha(a)
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def frame(scene: dict, t: float, total: float) -> Image.Image:
    if scene["src"] is None:
        base = brand_card()
    else:
        src = Image.open(KEY / scene["src"]).convert("RGB")
        p = ease(min(1.0, t / max(0.001, total)))
        z = scene["zoom"][0] + (scene["zoom"][1] - scene["zoom"][0]) * p
        (x0, y0), (x1, y1) = scene["pan"]
        base = cover(src, z, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p)

    base = bottom_scrim(base, 1.0)

    # yazı giriş/çıkışı
    a_in = ease(min(1.0, t / FADE))
    a_out = ease(min(1.0, (total - t) / FADE))
    alpha = min(a_in, a_out)
    img = text_block(base, scene, alpha)

    # karartma
    fade = min(a_in, a_out)
    if fade < 1.0:
        img = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, fade)
    return img


def main() -> None:
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg,
        "-y",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}",
        "-r", str(FPS),
        "-i", "-",
        "-an",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "21",
        "-preset", "medium",
        "-movflags", "+faststart",
        str(OUT),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    total_frames = 0
    for scene in SCENES:
        n = int(scene["dur"] * FPS)
        for i in range(n):
            assert proc.stdin is not None
            proc.stdin.write(frame(scene, i / FPS, scene["dur"]).tobytes())
        total_frames += n

    assert proc.stdin is not None
    proc.stdin.close()
    proc.wait()
    print(f"{OUT} · {total_frames} kare · {total_frames / FPS:.1f} sn")


if __name__ == "__main__":
    main()

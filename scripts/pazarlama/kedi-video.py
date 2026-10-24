#!/usr/bin/env python3
"""
Atlasia — "Dünyayı bir kedi döndürüyor" video serisi üretici.

Tek betik, iki iş:
  · animatik  : AI ana karelerden Ken Burns + alt bant yazı + karartma geçişleri (mp4)
  · ses       : sentetik ambiyans + marka imzası + geçiş efektleri (wav) ve mux

Girdi kareler: docs/pazarlama/kreatifler/ai-video-keyframe/*.jpg
Çıktı        : aynı klasörde `animatik-bolum-0X.mp4` ve `sesli-bolum-0X.mp4`

Kullanım:
  pip install --break-system-packages --target ~/.pylibs pillow imageio-ffmpeg
  PYTHONPATH=~/.pylibs python3 scripts/pazarlama/kedi-video.py --bolum 01 --ses
  PYTHONPATH=~/.pylibs python3 scripts/pazarlama/kedi-video.py --bolum 02 --ses

Not: ses tamamen sentetiktir (telif yok, trend müzik kullanılmaz).
"""
from __future__ import annotations

import argparse
import math
import random
import struct
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
KEY = ROOT / "docs/pazarlama/kreatifler/ai-video-keyframe"
KREATIF = ROOT / "docs/pazarlama/kreatifler"

W, H, FPS = 720, 1280, 24
INK = (2, 21, 18)
MINT = (228, 245, 234)
SUN = (234, 181, 79)
DIM = (168, 192, 180)
FADE = 0.28

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

SR = 44100


# ---------------------------------------------------------------- metin / kare

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


def ease(t: float) -> float:
    return t * t * (3 - 2 * t)


def cover(img: Image.Image, zoom: float, dx: float, dy: float) -> Image.Image:
    src_w, src_h = img.size
    scale = max(W / src_w, H / src_h) * zoom
    nw, nh = int(src_w * scale) + 1, int(src_h * scale) + 1
    resized = img.resize((nw, nh), Image.LANCZOS)
    max_x, max_y = nw - W, nh - H
    x = max(0, min(max_x, int(max_x * (0.5 + dx))))
    y = max(0, min(max_y, int(max_y * (0.5 + dy))))
    return resized.crop((x, y, x + W, y + H))


def bottom_scrim(img: Image.Image) -> Image.Image:
    scrim = Image.new("L", (1, H), 0)
    px = scrim.load()
    start = int(H * 0.44)
    for y in range(H):
        if y >= start:
            t = (y - start) / (H - start)
            px[0, y] = int(248 * (t ** 1.15))
    mask = scrim.resize((W, H))
    return Image.composite(Image.new("RGB", (W, H), INK), img, mask)


def shadow_text(d, xy, text, f, fill, offset=3):
    d.text((xy[0] + offset, xy[1] + offset), text, font=f, fill=(0, 0, 0))
    d.text(xy, text, font=f, fill=fill)


def brand_card() -> Image.Image:
    """Uygulama arayüzü taklidi yok: yalnız marka zemini (harita ızgarası + yaylar)."""
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    step = 96
    for gx in range(0, W + step, step):
        d.line([(gx, 0), (gx, H)], fill=(26, 52, 44), width=1)
    for gy in range(0, H + step, step):
        d.line([(0, gy), (W, gy)], fill=(26, 52, 44), width=1)
    for r in range(150, 900, 90):
        d.arc([W // 2 - r, H // 2 - r - 120, W // 2 + r, H // 2 + r - 120], 110, 250, fill=(44, 66, 55), width=2)
    return img


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

    a = layer.getchannel("A").point(lambda v: int(v * alpha))
    layer.putalpha(a)
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def frame(scene: dict, t: float, total: float) -> Image.Image:
    if scene["src"] is None:
        base = brand_card()
    else:
        src = Image.open(KREATIF / scene["src"]).convert("RGB")
        p = ease(min(1.0, t / max(0.001, total)))
        z = scene["zoom"][0] + (scene["zoom"][1] - scene["zoom"][0]) * p
        (x0, y0), (x1, y1) = scene["pan"]
        base = cover(src, z, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p)

    img = text_block(bottom_scrim(base), scene, min(ease(min(1.0, t / FADE)), ease(min(1.0, (total - t) / FADE))))
    fade = min(ease(min(1.0, t / FADE)), ease(min(1.0, (total - t) / FADE)))
    if fade < 1.0:
        img = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, fade)
    return img


# --------------------------------------------------------------------- bölümler

BOLUMLER: dict[str, list[dict]] = {
    "01": [
        {
            "src": "ai-video-keyframe/01-kedi-kure.jpg",
            "dur": 2.6,
            "kicker": "atlasia",
            "lines": [("Dünyayı bir kedi", MINT), ("döndürüyor.", SUN)],
            "sub": "Ciddiyim. Reklamı da yapay zekâ yaptı.",
            "zoom": (1.00, 1.10),
            "pan": ((0.0, 0.0), (0.03, -0.02)),
        },
        {
            "src": "ai-video-keyframe/02-pati-kure.jpg",
            "dur": 2.6,
            "kicker": "01 / 06",
            "lines": [("Sen haritaya", MINT), ("bakıyorsun.", MINT)],
            "sub": "O küreyi çeviriyor.",
            "zoom": (1.14, 1.02),
            "pan": ((0.04, 0.02), (-0.02, 0.0)),
        },
        {
            "src": "ai-video-keyframe/03-kedi-harita.jpg",
            "dur": 3.0,
            "kicker": "02 / 06",
            "lines": [("3 saat. 11 durak.", SUN), ("Sıra belli.", MINT)],
            "sub": "Her durağın gerekçesi yazılı. Uydurma yok.",
            "zoom": (1.02, 1.13),
            "pan": ((0.0, -0.03), (0.0, 0.03)),
        },
        {
            "src": None,
            "dur": 2.4,
            "kicker": "03 / 06",
            "lines": [("Gerisini", MINT), ("Atlasia yapıyor.", SUN)],
            "sub": "Yaklaşınca anlatır. İzin verirsen.",
            "zoom": (1.0, 1.0),
            "pan": ((0.0, 0.0), (0.0, 0.0)),
        },
        {
            "src": "ai-video-keyframe/01-kedi-kure.jpg",
            "dur": 2.4,
            "kicker": "son",
            "lines": [("Uygulama yok.", MINT), ("Mağaza yok.", MINT), ("Link var.", SUN)],
            "sub": "atlasia.pages.dev",
            "zoom": (1.10, 1.20),
            "pan": ((0.02, 0.02), (0.0, -0.01)),
        },
    ],
    "02": [
        {
            "src": "ai-video-keyframe/bolum-02-01-pati-efes.jpg",
            "dur": 2.4,
            "kicker": "bölüm 02 / 06",
            "lines": [("Pati haritaya", MINT), ("bastı.", SUN)],
            "sub": "Magnesia Kapısı. Giriş burası.",
            "zoom": (1.00, 1.10),
            "pan": ((0.0, 0.02), (0.02, -0.02)),
        },
        {
            "src": "ai-video-keyframe/03-kedi-harita.jpg",
            "dur": 2.6,
            "kicker": "11 durak",
            "lines": [("Sonra iz", MINT), ("çıktı.", SUN)],
            "sub": "Tek sıra, 3 saat: Kuretler → Celsus → Tiyatro.",
            "zoom": (1.03, 1.14),
            "pan": ((0.0, -0.02), (0.0, 0.03)),
        },
        {
            "src": "ai-video-keyframe/bolum-02-02-kedi-bakiyor.jpg",
            "dur": 2.4,
            "kicker": "sıra sende",
            "lines": [("Şehir", MINT), ("aşağıda.", SUN)],
            "sub": "Bir yer seç, üç soruya cevap ver.",
            "zoom": (1.10, 1.00),
            "pan": ((0.02, 0.0), (-0.02, 0.01)),
        },
        {
            "src": None,
            "dur": 2.4,
            "kicker": "gerekçe",
            "lines": [("Celsus 17:10.", SUN)],
            "sub": "Sebebi yazılı: kalabalık azalıyor, ışık batıdan geliyor.",
            "zoom": (1.0, 1.0),
            "pan": ((0.0, 0.0), (0.0, 0.0)),
        },
        {
            "src": "ai-video-keyframe/bolum-02-02-kedi-bakiyor.jpg",
            "dur": 2.8,
            "kicker": "son",
            "lines": [("Sen de", MINT), ("iz bırak.", SUN)],
            "sub": "atlasia.pages.dev · link var, mağaza yok",
            "zoom": (1.04, 1.16),
            "pan": ((0.0, 0.0), (0.02, -0.02)),
        },
    ],
    "kor-rota": [
        {
            "src": "kor-rota/01-kapali-zarf.jpg",
            "dur": 2.6,
            "kicker": "kör rota",
            "lines": [("Nereye", MINT), ("gittiğini", MINT), ("söylemiyorum.", SUN)],
            "sub": "Sana yalnız bir rota veriyorum. Mühürlü.",
            "zoom": (1.06, 1.18),
            "pan": ((0.0, 0.0), (0.0, 0.02)),
        },
        {
            "src": "kor-rota/02-yol-gizem.jpg",
            "dur": 2.6,
            "kicker": "1. durak · 900 m",
            "lines": [("Sadece", MINT), ("yürü.", SUN)],
            "sub": "İlk durak açılmadan adı görünmüyor.",
            "zoom": (1.00, 1.12),
            "pan": ((0.0, 0.02), (0.0, -0.02)),
        },
        {
            "src": "kor-rota/01-kapali-zarf.jpg",
            "dur": 2.6,
            "kicker": "mühür",
            "lines": [("Vardığında", MINT), ("açılıyor.", SUN)],
            "sub": "Adı, hikâyesi, sesi — hepsi orada. 40 metre kalınca.",
            "zoom": (1.18, 1.04),
            "pan": ((0.01, 0.02), (0.0, 0.0)),
        },
        {
            "src": None,
            "dur": 2.4,
            "kicker": "nasıl",
            "lines": [("Atlas AI'a", MINT), ("“beni şaşırt”", SUN), ("yaz.", MINT)],
            "sub": "2 saatlik yürüyüş. Gizli yerler, fotoğraf.",
            "zoom": (1.0, 1.0),
            "pan": ((0.0, 0.0), (0.0, 0.0)),
        },
        {
            "src": "kor-rota/02-yol-gizem.jpg",
            "dur": 2.6,
            "kicker": "sonra",
            "lines": [("Geri dönünce", MINT), ("anlatırsın.", SUN)],
            "sub": "atlasia.pages.dev · link var, mağaza yok",
            "zoom": (1.10, 1.22),
            "pan": ((0.0, 0.0), (0.0, -0.01)),
        },
    ],
}


def araliklar(scenes: list[dict]) -> list[float]:
    times, acc = [], 0.0
    for s in scenes[:-1]:
        acc += s["dur"]
        times.append(round(acc, 3))
    return times


# --------------------------------------------------------------------- video

def render_video(scenes: list[dict], out: Path) -> float:
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "21", "-preset", "medium", "-movflags", "+faststart", str(out),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    total = 0
    for scene in scenes:
        n = int(scene["dur"] * FPS)
        for i in range(n):
            assert proc.stdin is not None
            proc.stdin.write(frame(scene, i / FPS, scene["dur"]).tobytes())
        total += n
    assert proc.stdin is not None
    proc.stdin.close()
    proc.wait()
    return total / FPS


# ----------------------------------------------------------------------- ses

def env_adsr(t: float, attack: float, decay_tau: float) -> float:
    if t < 0:
        return 0.0
    a = min(1.0, t / attack) if attack > 0 else 1.0
    return a * math.exp(-t / decay_tau)


def soundtrack(dur: float, transitions: list[float], spin: tuple[float, float] | None, pings: list[float], out: Path) -> None:
    n = int(SR * dur)
    random.seed(7)
    left = [0.0] * n
    right = [0.0] * n

    def add(buf, i, v):
        if 0 <= i < n:
            buf[i] += v

    # ambiyans pedi
    for i in range(n):
        t = i / SR
        lfo = 0.5 + 0.5 * math.sin(2 * math.pi * 0.08 * t)
        fade = min(1.0, t / 1.2) * min(1.0, (dur - t) / 1.0)
        base = 0.055 * fade * (0.55 + 0.45 * lfo)
        left[i] += base * (math.sin(2 * math.pi * 110 * t) + 0.5 * math.sin(2 * math.pi * 165 * t + 0.6))
        right[i] += base * (math.sin(2 * math.pi * 110 * t + 0.25) + 0.5 * math.sin(2 * math.pi * 164.5 * t + 1.1))

    # marka imzası
    for start in pings:
        for offset, freq, amp in ((0.0, 880.0, 0.20), (0.13, 1318.5, 0.16)):
            begin = int((start + offset) * SR)
            for k in range(int(1.1 * SR)):
                e = env_adsr(k / SR, 0.004, 0.22)
                if e < 1e-4:
                    break
                v = amp * e * (math.sin(2 * math.pi * freq * k / SR) + 0.32 * math.sin(4 * math.pi * freq * k / SR))
                add(left, begin + k, v * 0.95)
                add(right, begin + k, v)

    # geçiş whoosh
    for start in transitions:
        begin = int((start - 0.28) * SR)
        length = int(0.62 * SR)
        lp = 0.0
        for k in range(length):
            p = k / length
            e = math.sin(math.pi * p) ** 1.6
            alpha = 0.03 + 0.30 * (1 - p)
            lp += alpha * (random.uniform(-1, 1) - lp)
            v = 0.16 * e * lp * 3.2
            add(left, begin + k, v * 0.85)
            add(right, begin + k, v)

    # küre dönme vınlaması
    if spin:
        begin = int(spin[0] * SR)
        length = int((spin[1] - spin[0]) * SR)
        phase = 0.0
        for k in range(length):
            p = k / length
            phase += 2 * math.pi * (190 + 140 * p) / SR
            v = (math.sin(math.pi * p) ** 1.2) * 0.05 * (math.sin(phase) + 0.25 * math.sin(2 * phase))
            add(left, begin + k, v * 0.9)
            add(right, begin + k, v)

    # kapanış tık (link vurgusu)
    begin = int((dur - 0.95) * SR)
    for k in range(int(0.09 * SR)):
        v = 0.13 * env_adsr(k / SR, 0.001, 0.02) * math.sin(2 * math.pi * 2100 * k / SR)
        add(left, begin + k, v)
        add(right, begin + k, v)

    peak = max(max(abs(v) for v in left), max(abs(v) for v in right), 1e-9)
    gain = 0.72 / peak
    frames = bytearray()
    for i in range(n):
        frames += struct.pack("<h", int(max(-1.0, min(1.0, math.tanh(left[i] * gain * 1.05))) * 32767))
        frames += struct.pack("<h", int(max(-1.0, min(1.0, math.tanh(right[i] * gain * 1.05))) * 32767))

    with wave.open(str(out), "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))


def mux(video: Path, audio: Path, out: Path) -> None:
    import imageio_ffmpeg

    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(), "-y",
            "-i", str(video), "-i", str(audio),
            "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bolum", default="01", choices=sorted(BOLUMLER))
    ap.add_argument("--ses", action="store_true", help="ses tasarımını üret ve videoya ekle")
    args = ap.parse_args()

    scenes = BOLUMLER[args.bolum]
    video = KEY / f"animatik-bolum-{args.bolum}.mp4"
    sure = render_video(scenes, video)
    print(f"{video.name} · {sure:.1f} sn · sessiz")

    if args.ses:
        wav = KEY / f"ses-bolum-{args.bolum}.wav"
        spin = None
        for i, s in enumerate(scenes):
            if s["src"] and "kure" in s["src"] and i == 1:
                bas = sum(x["dur"] for x in scenes[:i])
                spin = (bas, bas + s["dur"])
        soundtrack(sure, araliklar(scenes), spin, [0.18, sure - 2.3], wav)
        sesli = KEY / f"sesli-bolum-{args.bolum}.mp4"
        mux(video, wav, sesli)
        print(f"{sesli.name} · video + ses")


if __name__ == "__main__":
    main()

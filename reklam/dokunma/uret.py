#!/usr/bin/env python3
"""
Atlasia — "Bir yere dokun" reklam filmi üreteci.

Girdi : kareler/*.png (AI ile üretilmiş 9:16 sahneler), fontlar/*.ttf, ses/vo-tr.mp3
Çıktı : kareler/kaplama-*.png (yazı katmanları), ses/jingle.wav, reklam-dokunma.mp4,
        kapak.jpg

Kullanım:
    FFMPEG=/yol/ffmpeg python3 uret.py

Sahne sırası, süreler ve metinler SCENES listesinde. Metni değiştirip yeniden
çalıştırmak videoyu baştan üretir; başka araç gerekmez.
"""

from __future__ import annotations

import json
import math
import os
import subprocess
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
FF = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "")

W, H = 1080, 1920
FPS = 30
XF = 0.45  # sahne geçiş süresi (sn)

INK = (2, 13, 23)
SUN = (243, 200, 112)
MINT = (233, 242, 233)
WHITE = (255, 255, 255)

F700 = os.path.join(ROOT, "fontlar", "Bricolage-Birlestir-700.ttf")
F500 = os.path.join(ROOT, "fontlar", "Bricolage-Birlestir-500.ttf")

SCENES = [
    dict(
        id="01-dunya",
        dur=3.6,
        zoom=(1.00, 1.14),
        focus=(0.52, 0.46),
        kicker="atlasia",
        head=["bir yere", "dokun."],
        sub="dünya yaklaşsın.",
    ),
    dict(
        id="02-parmak",
        dur=2.6,
        zoom=(1.18, 1.04),
        focus=(0.50, 0.55),
        kicker="",
        head=["tek", "dokunuş."],
        sub="gerisi haritada.",
    ),
    dict(
        id="03-efes",
        dur=3.4,
        zoom=(1.02, 1.16),
        focus=(0.50, 0.58),
        kicker="efes · selçuk",
        head=["06:40."],
        sub="kalabalıktan önce.",
    ),
    dict(
        id="04-kulaklik",
        dur=3.0,
        zoom=(1.14, 1.03),
        focus=(0.50, 0.44),
        kicker="sesli rehber",
        head=["ses, sen", "iste."],
        sub="konum izni sende kalır.",
    ),
    dict(
        id="05-kapanis",
        dur=3.4,
        zoom=(1.06, 1.12),
        focus=(0.50, 0.50),
        kicker="",
        brand=True,
    ),
]


# --------------------------------------------------------------------------- #
# yazı katmanları
# --------------------------------------------------------------------------- #
def _ease(t: float) -> float:
    return t * t * (3 - 2 * t)


def _gradient(bottom: float = 0.90, left: float = 0.55) -> Image.Image:
    """Alt ve sol kenara doğru koyulaşan saydam katman (yazı okunurluğu)."""
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]

    t = np.clip((y - bottom) / (1 - bottom), 0, 1)
    a_bottom = 232 * np.array([_ease(float(v)) for v in t.ravel()], dtype=np.float32).reshape(-1, 1)

    a_left = 120 * np.clip(1 - x / 0.72, 0, 1) * np.clip((y - 0.25) / 0.5, 0, 1)

    # üstte çok hafif koyulaşma (logo/etiket okunurluğu)
    t_top = np.clip((0.16 - y) / 0.16, 0, 1)
    a_top = 90 * np.array([_ease(float(v)) for v in t_top.ravel()], dtype=np.float32).reshape(-1, 1)

    alpha = np.clip(a_bottom + a_left + a_top, 0, 245).astype(np.uint8)
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., :3] = INK
    rgba[..., 3] = np.broadcast_to(alpha, (H, W))
    return Image.fromarray(rgba, "RGBA")


def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def _tracked_width(text: str, font, tracking: int) -> int:
    return int(sum(font.getlength(ch) for ch in text) + tracking * max(0, len(text) - 1))


def _draw_tracked(d: ImageDraw.ImageDraw, xy, text: str, font, fill, tracking: int) -> None:
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + tracking


def _block_bottom(d, x: int, y_bottom: int, lines, font, fill, line_h: int, shadow=True) -> int:
    """Satırları alttan yukarı yerleştirir; bloğun üst y'sini döndürür."""
    y = y_bottom - line_h * len(lines)
    for line in lines:
        if shadow:
            d.text((x + 2, y + 3), line, font=font, fill=(0, 0, 0, 120))
        d.text((x, y), line, font=font, fill=fill)
        y += line_h
    return y_bottom - line_h * len(lines)


def build_overlay(scene: dict, path: str) -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if scene.get("brand"):
        img.alpha_composite(_gradient(bottom=0.55, left=0.35))
    else:
        img.alpha_composite(_gradient(bottom=0.74, left=0.50))
    d = ImageDraw.Draw(img)

    if scene.get("brand"):
        brand_font = _font(F700, 200)
        sub_font = _font(F500, 52)
        cta_font = _font(F500, 34)

        word = "atlasia"
        dot = "."
        w_word = brand_font.getlength(word)
        w_dot = brand_font.getlength(dot)
        total = w_word + w_dot
        x0 = (W - total) / 2
        y0 = H * 0.455

        d.text((x0 + 3, y0 + 4), word, font=brand_font, fill=(0, 0, 0, 130))
        d.text((x0, y0), word, font=brand_font, fill=WHITE)
        d.text((x0 + w_word, y0), dot, font=brand_font, fill=SUN)

        sub = "dünyayı merakınla keşfet."
        sw = sub_font.getlength(sub)
        d.text(((W - sw) / 2, y0 + 268), sub, font=sub_font, fill=(*MINT, 235))

        cta = "cihazına ekle"
        cw = cta_font.getlength(cta)
        cx, cy = (W - cw) / 2, y0 + 420
        pad_x, pad_y = 44, 22
        d.rectangle(
            [cx - pad_x, cy - pad_y, cx + cw + pad_x, cy + 46 + pad_y],
            outline=(*SUN, 210),
            width=2,
            fill=(10, 30, 26, 80),
        )
        d.text((cx, cy), cta, font=cta_font, fill=SUN)
        img.save(path)
        return

    x = 92
    y_bottom = int(H * 0.855)

    sub_font = _font(F500, 44)
    head_font = _font(F700, 104)
    kicker_font = _font(F500, 30)

    # alt satır
    if scene.get("sub"):
        sub_bbox = d.textbbox((0, 0), scene["sub"], font=sub_font)
        d.text((x, y_bottom - sub_bbox[3] + 6), scene["sub"], font=sub_font, fill=(*SUN, 240))
        y_bottom -= int(sub_bbox[3] * 0.72) + 40

    # başlık
    line_h = int(head_font.size * 1.02)
    top = _block_bottom(d, x, y_bottom, scene["head"], head_font, WHITE, line_h)

    # kicker
    if scene.get("kicker"):
        k_y = top - 56
        d.line([(x, k_y + 20), (x + 44, k_y + 20)], fill=(*SUN, 220), width=3)
        _draw_tracked(d, (x + 62, k_y), scene["kicker"].upper(), kicker_font, (*MINT, 225), 7)

    img.save(path)


# --------------------------------------------------------------------------- #
# ses: jingle (numpy ile sentez — dış müzik, lisans sorunu yok)
# --------------------------------------------------------------------------- #
def build_jingle(path: str, sr: int = 48000, dur: float = 4.2) -> None:
    n = int(sr * dur)
    t = np.arange(n) / sr
    out = np.zeros(n, dtype=np.float64)

    def pluck(freq: float, start: float, amp: float, decay: float = 2.4) -> None:
        i0 = int(start * sr)
        if i0 >= n:
            return
        tt = np.arange(n - i0) / sr
        env = np.exp(-tt * decay) * np.clip(tt / 0.004, 0, 1)
        sig = (
            1.00 * np.sin(2 * np.pi * freq * tt)
            + 0.30 * np.sin(2 * np.pi * freq * 2 * tt) * np.exp(-tt * 3)
            + 0.14 * np.sin(2 * np.pi * freq * 3.01 * tt) * np.exp(-tt * 5)
        )
        out[i0:] += amp * env * sig

    # yumuşak alt pedal (A2) — gerginlik
    pad_env = np.clip(t / 0.9, 0, 1) * np.exp(-np.clip(t - 1.6, 0, None) * 0.9)
    out += 0.16 * pad_env * np.sin(2 * np.pi * 110.0 * t)
    out += 0.09 * pad_env * np.sin(2 * np.pi * 164.81 * t)

    # kalimba arpej: A3 – C#4 – E4 – A4
    for k, f in enumerate((220.00, 277.18, 329.63, 440.00)):
        pluck(f, 0.05 + k * 0.22, 0.22 - k * 0.018)
    pluck(880.0, 1.02, 0.05, decay=4.0)

    # nefes/hava dokusu (yüksek frekans, çok hafif)
    rng = np.random.default_rng(7)
    air = rng.normal(0, 1, n)
    b = np.convolve(air, np.ones(48) / 48, mode="same")
    air = (air - b) * 0.012 * np.exp(-t * 1.4)
    out += air

    # yumuşak yüksek kesim + kuyruk
    kernel = np.hanning(64)
    kernel /= kernel.sum()
    out = np.convolve(out, kernel, mode="same")
    out *= np.clip((dur - t) / 1.1, 0, 1)
    out /= max(1e-9, np.abs(out).max())
    out *= 0.5

    # hafif stereo genişlik (sağ kanal 8 ms gecikmeli)
    delay = int(0.008 * sr)
    left = out
    right = np.concatenate([np.zeros(delay), out[:-delay]])
    stereo = np.stack([left, right], axis=1)
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")

    with wave.open(path, "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(sr)
        fh.writeframes(pcm.tobytes())


# --------------------------------------------------------------------------- #
# video
# --------------------------------------------------------------------------- #
def _zoom_expr(scene: dict, frames: int) -> str:
    z0, z1 = scene["zoom"]
    return f"{z0}+({z1}-{z0})*on/{max(1, frames - 1)}"


def render_scene(scene: dict) -> str:
    """Tek sahneyi (hareket + yazı) ara dosyaya yazar; xfade temiz cfр görsün diye."""
    frames = round(scene["dur"] * FPS)
    cx, cy = scene["focus"]
    fade_out_at = max(0.0, scene["dur"] - 0.55)
    out = os.path.join(ROOT, "kareler", f"_ara-{scene['id']}.mp4")
    cmd = [
        FF, "-hide_banner", "-loglevel", "error", "-y",
        "-loop", "1", "-framerate", str(FPS), "-t", f"{scene['dur'] + 0.5:.3f}",
        "-i", os.path.join(ROOT, "kareler", f"{scene['id']}.png"),
        "-loop", "1", "-framerate", str(FPS), "-t", f"{scene['dur'] + 0.5:.3f}",
        "-i", os.path.join(ROOT, "kareler", f"kaplama-{scene['id']}.png"),
        "-filter_complex",
        f"[0:v]scale=2160:3840:flags=lanczos,setsar=1,"
        f"zoompan=z='{_zoom_expr(scene, frames)}':d=1:"
        f"x='max(0,min({cx}*iw-iw/zoom/2,iw-iw/zoom))':"
        f"y='max(0,min({cy}*ih-ih/zoom/2,ih-ih/zoom))':"
        f"s={W}x{H}:fps={FPS}[bg];"
        f"[1:v]format=rgba,fade=t=in:st=0.20:d=0.40:alpha=1,"
        f"fade=t=out:st={fade_out_at:.3f}:d=0.45:alpha=1[tx];"
        f"[bg][tx]overlay=0:0:format=auto:shortest=1,"
        f"fps={FPS},trim=duration={scene['dur']:.3f},setpts=PTS-STARTPTS,format=yuv420p[v]",
        "-map", "[v]", "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16",
        "-pix_fmt", "yuv420p", "-r", str(FPS), out,
    ]
    subprocess.run(cmd, check=True)
    return out


def build_video(out_path: str, cover_path: str) -> dict:
    scenes = SCENES
    total = sum(s["dur"] for s in scenes) - XF * (len(scenes) - 1)

    clips = [render_scene(s) for s in scenes]

    inputs: list[str] = []
    for clip in clips:
        inputs += ["-i", clip]

    vo = os.path.join(ROOT, "ses", "vo-tr.mp3")
    jingle = os.path.join(ROOT, "ses", "jingle.wav")
    inputs += ["-i", vo, "-i", jingle]
    vo_idx, jingle_idx = len(scenes), len(scenes) + 1

    parts: list[str] = []
    prev = "[0:v]"
    offset = 0.0
    for i in range(1, len(scenes)):
        offset += scenes[i - 1]["dur"] - XF
        nxt = f"x{i}"
        parts.append(
            f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={offset:.3f}[{nxt}]"
        )
        prev = f"[{nxt}]"

    vo_delay = 420
    jingle_delay = 9200
    parts.append(
        f"{prev}fade=t=in:st=0:d=0.55,fade=t=out:st={total - 0.55:.3f}:d=0.55,"
        f"format=yuv420p[vout]"
    )
    parts.append(
        f"[{vo_idx}:a]adelay={vo_delay}|{vo_delay},volume=1.0,"
        f"aformat=sample_rates=48000:channel_layouts=stereo[vo]"
    )
    parts.append(
        f"[{jingle_idx}:a]volume=0.30,adelay={jingle_delay}|{jingle_delay},"
        f"aformat=sample_rates=48000:channel_layouts=stereo[jg]"
    )
    parts.append(
        f"[vo][jg]amix=inputs=2:duration=longest:normalize=0,"
        f"atrim=0:{total:.3f},afade=t=out:st={total - 0.8:.3f}:d=0.8,"
        f"loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[aout]"
    )

    cmd = [FF, "-hide_banner", "-y", *inputs,
           "-filter_complex", ";".join(parts),
           "-map", "[vout]", "-map", "[aout]",
           "-t", f"{total:.3f}",
           "-c:v", "libx264", "-preset", "medium", "-crf", "19",
           "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p",
           "-r", str(FPS), "-g", str(FPS * 2),
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-movflags", "+faststart", out_path]
    subprocess.run(cmd, check=True)

    # kapak: ilk sahnenin 1. saniyesi + yazı
    cover_frame = os.path.join(ROOT, "kareler", "_kapak-ham.mp4")
    subprocess.run([
        FF, "-hide_banner", "-y", "-loop", "1", "-framerate", str(FPS), "-t", "1.0",
        "-i", os.path.join(ROOT, "kareler", "01-dunya.png"),
        "-vf", f"scale=2160:3840:flags=lanczos,zoompan=z='1.06':d=1:"
               f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1",
        "-frames:v", "1", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", cover_frame,
    ], check=True)
    subprocess.run([
        FF, "-hide_banner", "-y", "-i", cover_frame,
        "-i", os.path.join(ROOT, "kareler", "kaplama-01-dunya.png"),
        "-filter_complex", "[0:v][1:v]overlay=0:0,format=yuvj420p[o]",
        "-map", "[o]", "-frames:v", "1", "-q:v", "2", cover_path,
    ], check=True)
    os.remove(cover_frame)

    return {"total": round(total, 2), "scenes": len(scenes), "fps": FPS}


def main() -> None:
    os.makedirs(os.path.join(ROOT, "ses"), exist_ok=True)
    for scene in SCENES:
        build_overlay(scene, os.path.join(ROOT, "kareler", f"kaplama-{scene['id']}.png"))
    build_jingle(os.path.join(ROOT, "ses", "jingle.wav"))
    info = build_video(
        os.path.join(ROOT, "reklam-dokunma.mp4"),
        os.path.join(ROOT, "kapak.jpg"),
    )
    with open(os.path.join(ROOT, "uretim-bilgi.json"), "w", encoding="utf-8") as fh:
        json.dump(info, fh, ensure_ascii=False, indent=2)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()

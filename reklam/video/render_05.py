"""Atlasia · reklam 05 — "3 saatim vardı. 40 yer vardı." (16,70 sn, sesli).

Kanca → Boşluk → Konu → Etki:
  0,0–2,7   kanca    40 kartlık kaos duvarı, sayaç 1→40
  2,7–5,6   kanca    2 saat kayboluyor (saat ibresi dönüyor, duvar çöküyor)
  5,6–8,0   boşluk   duvar tek noktaya çöküyor → "Sorun yer sayısı değildi. Sıraydı."
  8,0–11,9   konu     ürün kartı: 7 durak, saatleriyle çiziliyor
  11,9–15,3  konu     durak detayı: "Varışta 27° · yağış %10"
  15,3–16,7  etki     "7 durak. 0 karar." → logo

Çalıştırma: python3 reklam/video/render_05.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from atlasia_kit import (
    BADGE, BUILD, CARD, CREAM, FPS, GLOW, GOLD, H, INK, INK2, MUTED, OUT_DIR, STILL_NAMES,
    W, bottom_scrim, card_panel, clamp, clean_square, draw_route, ease_out, encode_video,
    font, glow_bg, paste, photo_bg, text_layer, vignette,
)

VOICE = OUT_DIR.parent / "ses" / "05-tam-pad.mp3"
OUT = OUT_DIR / "200-metre-05.mp4"

DUR = 16.70
TOTAL = int(round(DUR * FPS))

T = {
    "b1": (0.00, 2.70),
    "b2": (2.70, 5.60),
    "b3": (5.60, 8.00),
    "b4": (8.00, 11.90),
    "b5": (11.90, 15.30),
    "b6": (15.30, 16.70),
}

# ---------------------------------------------------------------- kaos duvarı (40 kart)

C_TILE, C_GAP, C_MARGIN = 190, 10, 14
C_COLS, C_ROWS = 5, 8                     # 40 kart
CARD_W = C_MARGIN * 2 + C_COLS * C_TILE + (C_COLS - 1) * C_GAP
CARD_X = (W - CARD_W) // 2
CARD_H = C_MARGIN * 2 + C_ROWS * C_TILE + (C_ROWS - 1) * C_GAP

_ORDER = [n for n in STILL_NAMES if n != "k1"] + ["k1"]
C_TILE_IMG = [clean_square(_ORDER[i % len(_ORDER)], C_TILE) for i in range(40)]


def build_chaos() -> Image.Image:
    canvas = Image.new("RGB", (CARD_W, CARD_H), INK)
    d = ImageDraw.Draw(canvas)
    for i in range(40):
        r, c = divmod(i, C_COLS)
        x = C_MARGIN + c * (C_TILE + C_GAP)
        y = C_MARGIN + r * (C_TILE + C_GAP)
        tile = ImageEnhance.Brightness(C_TILE_IMG[i]).enhance(0.8)
        tile = ImageEnhance.Color(tile).enhance(0.72)
        canvas.paste(tile, (x, y))
        d.rectangle([x, y, x + C_TILE - 1, y + C_TILE - 1], outline=(255, 255, 255, 26))
    return canvas


CHAOS = build_chaos()


def chaos_frame(offset: float, veil: float, shake: int = 0) -> Image.Image:
    off = int(clamp(offset) * (CARD_H - H))
    base = Image.new("RGB", (W, H), INK)
    base.paste(CHAOS.crop((0, off, CARD_W, min(CARD_H, off + H))), (CARD_X + shake, 0))
    if veil > 0:
        base = Image.blend(base, Image.new("RGB", (W, H), INK), veil)
    return base


# ---------------------------------------------------------------- sayaç / ibre


def draw_counter(img: Image.Image, n: int, alpha: float, color=GOLD) -> Image.Image:
    if alpha <= 0.01:
        return img
    num = text_layer(str(n), font(300), color, blur=22)
    x = (W - num.width) // 2
    y = 640
    paste(img, num, (x, y), alpha)
    lab = text_layer("YER", font(40), (210, 226, 220), tracking=14, blur=10)
    paste(img, lab, ((W - lab.width) // 2, y + 330), alpha * 0.8)
    return img


def draw_clock(img: Image.Image, alpha: float, spin: float) -> Image.Image:
    if alpha <= 0.01:
        return img
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy, r = W // 2, 980, 190
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=CREAM + (200,), width=5)
    for k in range(12):
        import math
        a = math.radians(k * 30)
        x1, y1 = cx + math.sin(a) * (r - 20), cy - math.cos(a) * (r - 20)
        x2, y2 = cx + math.sin(a) * (r - 42), cy - math.cos(a) * (r - 42)
        d.line([(x1, y1), (x2, y2)], fill=(255, 255, 255, 140), width=3)
    import math
    h = math.radians(spin)
    d.line([(cx, cy), (cx + math.sin(h) * 120, cy - math.cos(h) * 120)], fill=GOLD + (255,), width=9)
    d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=GOLD + (255,))
    img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A").point(lambda v: int(v * alpha)))
    return img


# ---------------------------------------------------------------- ürün kartı

STOP_TIMES = ["09:00", "09:35", "10:12", "10:48", "11:20", "11:52", "12:15"]


def time_chip(label: str, alpha: float, accent: bool = False) -> Image.Image:
    f = font(26)
    t = text_layer(label, f, INK if accent else CREAM, blur=6)
    pad_x, pad_y = 16, 8
    box = Image.new("RGBA", (t.width + pad_x * 2, t.height + pad_y * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(box)
    d.rounded_rectangle([0, 0, box.width - 1, box.height - 1], radius=12,
                        fill=(GOLD + (245,)) if accent else (INK + (225,)),
                        outline=None if accent else (255, 255, 255, 45), width=2)
    box.alpha_composite(t, (pad_x, pad_y))
    return box


def frame_b4(t: float) -> Image.Image:
    local = t - T["b4"][0]
    img = photo_bg("g2", blur=34, opacity=0.13, dark=0.5)
    img = card_panel(vignette(img, 70))
    prog = clamp((local - 0.15) / 2.30)
    draw_route(img, prog)

    # süre etiketleri rotada ilerledikçe belirir
    from atlasia_kit import PTS
    shown = clamp((prog - 0.08) / 0.92) * len(PTS)
    for i, (px, py) in enumerate(PTS):
        if i >= round(shown):
            continue
        chip = time_chip(STOP_TIMES[i], 1.0, accent=(i == 0))
        cx = px + 34 if px < W - 300 else px - chip.width - 34
        cy = py - chip.height // 2
        paste(img, chip, (cx, cy), 0.95)
    return img


def frame_b5(t: float) -> Image.Image:
    local = t - T["b5"][0]
    img = photo_bg("g2", blur=40, opacity=0.10, dark=0.45)
    img = card_panel(vignette(img, 70))
    draw_route(img, 1.0)
    if local > 0.9:
        a = clamp((local - 0.9) / 0.5)
        # seçili durak halkası
        from atlasia_kit import PTS
        px, py = PTS[5]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.ellipse([px - 46, py - 46, px + 46, py + 46], outline=GOLD + (255,), width=5)
        img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A").point(lambda v: int(v * a)))
    if local > 1.5:
        a = clamp((local - 1.5) / 0.45)
        x0, y0 = CARD[0] + 34, CARD[3] - 200
        w, h = CARD[2] - CARD[0] - 68, 150
        chip = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(chip)
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=26, fill=INK + (236,),
                            outline=(255, 255, 255, 45), width=2)
        d.ellipse([28, 48, 72, 92], fill=GOLD + (255,))
        d.text((92, 30), "Celsus Kütüphanesi", font=font(32), fill=CREAM + (255,))
        d.text((92, 80), "Varışta 27° · yağış %10", font=font(26, bold=False), fill=MUTED + (235,))
        paste(img, chip, (x0, y0), a)
    return img


# ---------------------------------------------------------------- yazı katmanları


def build_layers():
    L = {}
    L["b1_h"] = text_layer("3 saatim vardı.", font(96), CREAM)
    L["b1_s"] = text_layer("40 yer vardı", font(46, False), MUTED)
    L["b2_h"] = text_layer("2 saatimi", font(96), CREAM)
    L["b2_s"] = text_layer("nereye gideceğime karar vermekle geçirdim", font(38, False), MUTED)
    L["b3_a"] = text_layer("Sorun yer sayısı değildi.", font(56, False), MUTED)
    L["b3_b"] = text_layer("Sıraydı.", font(132), CREAM)
    L["b4_h"] = text_layer("7 durak", font(88), CREAM)
    L["b4_s"] = text_layer("saatiyle sıralı · yürüyerek", font(40, False), MUTED)
    L["e_big"] = text_layer("0 karar", font(120), GOLD)
    L["e_sub"] = text_layer("7 durak · 3 saat", font(52), CREAM)
    L["word"] = text_layer("atlasia.", font(112), CREAM)
    L["tag"] = text_layer("Dünyayı merakınla keşfet", font(32, False), MUTED)
    return L


LAYERS = build_layers()


# ---------------------------------------------------------------- kareler


def frame_b1(t: float) -> Image.Image:
    local = clamp(t / T["b1"][1])
    off = ease_out(local) * 0.42
    img = chaos_frame(off, 0.30, shake=0)
    n = max(1, int(round(1 + 39 * ease_out(local))))
    draw_counter(img, n, clamp((local - 0.05) / 0.18) * 0.95)
    return bottom_scrim(img, 640, 225)


def frame_b2(t: float) -> Image.Image:
    local = clamp((t - T["b2"][0]) / (T["b2"][1] - T["b2"][0]))
    off = 0.42 + local * 0.10
    img = chaos_frame(off, 0.30 + 0.35 * local)
    draw_clock(img, clamp((local - 0.05) / 0.25), 1080 * local)
    return bottom_scrim(img, 640, 228)


def frame_b3(t: float) -> Image.Image:
    local = t - T["b3"][0]
    span = T["b3"][1] - T["b3"][0]
    prev = chaos_frame(0.52, 0.65)
    if local < 0.45:
        k = ease_out(local / 0.45)
        s = 1.0 - 0.92 * k
        nw, nh = int(W * s), int(H * s)
        small = prev.resize((max(2, nw), max(2, nh)), Image.LANCZOS)
        base = Image.new("RGB", (W, H), INK)
        base.paste(small, ((W - nw) // 2, (H - nh) // 2))
        return Image.blend(base, Image.new("RGB", (W, H), INK), k * 0.55)
    return Image.new("RGB", (W, H), INK) if local > 0.6 else Image.blend(prev, Image.new("RGB", (W, H), INK), 1.0)


def frame_b6(t: float) -> Image.Image:
    local = t - T["b6"][0]
    base = GLOW.copy()
    if local > 0.85:
        fade = clamp((local - 0.85) / 0.30)
        base = Image.blend(base, Image.new("RGB", (W, H), INK), fade * 0.9)
    return vignette(base, 70)


def render_frame(i: int, t: float) -> Image.Image:
    if t < T["b2"][0]:
        img = frame_b1(t)
        a = clamp((t - 0.18) / 0.24)
        paste(img, LAYERS["b1_h"], (84, H - 470), a)
        paste(img, LAYERS["b1_s"], (92, H - 340), a * 0.95)
    elif t < T["b3"][0]:
        img = frame_b2(t)
        a = clamp((t - T["b2"][0] - 0.04) / 0.24)
        paste(img, LAYERS["b2_h"], (84, H - 540), a)
        sub = LAYERS["b2_s"]
        paste(img, sub, (92, H - 410), a * 0.95)
    elif t < T["b4"][0]:
        img = frame_b3(t)
        local = t - T["b3"][0]
        if 1.15 <= local < 1.95:
            a = min(clamp((local - 1.15) / 0.20), clamp((1.95 - local) / 0.18))
            lay = LAYERS["b3_a"]
            paste(img, lay, ((W - lay.width) // 2, H // 2 - 150), a)
        elif local >= 1.80:
            a = clamp((local - 1.80) / 0.20)
            lay = LAYERS["b3_b"]
            paste(img, lay, ((W - lay.width) // 2, H // 2 - 130), a)
    elif t < T["b5"][0]:
        img = frame_b4(t)
        carry = clamp((0.34 - (t - T["b4"][0])) / 0.34)
        if carry > 0:
            lay = LAYERS["b3_b"]
            paste(img, lay, ((W - lay.width) // 2, H // 2 - 130), carry)
        a = clamp((t - T["b4"][0] - 0.28) / 0.26)
        h, s = LAYERS["b4_h"], LAYERS["b4_s"]
        paste(img, h, ((W - h.width) // 2, CARD[1] - 300), a)
        paste(img, s, ((W - s.width) // 2, CARD[1] - 176), a * 0.92)
    elif t < T["b6"][0]:
        img = frame_b5(t)
    else:
        img = frame_b6(t)
        local = t - T["b6"][0]
        a = clamp((local - 0.04) / 0.22)
        out = clamp((local - 0.72) / 0.22)
        big, sub = LAYERS["e_big"], LAYERS["e_sub"]
        paste(img, big, ((W - big.width) // 2, H // 2 - 250), a * (1 - out))
        paste(img, sub, ((W - sub.width) // 2, H // 2 + 10), a * 0.95 * (1 - out))
        if local > 0.86:
            b = clamp((local - 0.86) / 0.18)
            word, tag = LAYERS["word"], LAYERS["tag"]
            paste(img, word, ((W - word.width) // 2, H // 2 - 150), b)
            paste(img, tag, ((W - tag.width) // 2, H // 2 + 40), b * 0.75)
    return img


def main() -> int:
    return encode_video(render_frame, OUT, VOICE, TOTAL,
                        cover_at=int(16.05 * FPS), cover_path=BUILD / "cover-05.jpg")


if __name__ == "__main__":
    raise SystemExit(main())

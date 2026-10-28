"""Atlasia · reklam 04 — "4.000 fotoğraf" (17,82 sn, sesli).

Zaman çizelgesi: reklam/reels/04-dort-bin-fotograf.md
Çalıştırma: python3 reklam/video/render_04.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from atlasia_kit import (
    BADGE, BUILD, CARD, CLEAN_SIDE, CLEAN_X0, CLEAN_Y0, CREAM, FPS, GLOW, GOLD, H, INK,
    KEEP, MUTED, OUT_DIR, STILL_NAMES, W, bottom_scrim, clean_square, draw_route,
    clamp, ease_out, encode_video, font, card_panel, paste, photo_bg, text_layer, vignette,
    stop_chip, wall_frame,
)

T = {"b1": (0.00, 2.40), "b2": (2.40, 4.20), "b3": (4.20, 8.00),
     "b4": (8.00, 14.20), "b5": (14.20, 16.60), "b6": (16.60, 17.82)}
DUR = 17.82
TOTAL = int(round(DUR * FPS))
VOICE = OUT_DIR.parent / "ses" / "04-dort-bin-fotograf.mp3"
OUT = OUT_DIR / "200-metre-04.mp4"

KEEP_TUPLES = KEEP
D_TILE, D_GAP = 246, 12
D_COLS = 4
D_X0 = (W - (D_COLS * D_TILE + (D_COLS - 1) * D_GAP)) // 2
D_Y0 = 384

# ------------------------------------------------------------------ beat kareleri


def frame_b1(t: float) -> Image.Image:
    return bottom_scrim(wall_frame(ease_out(t / 1.9) * 0.55, 0.42, False))


def frame_b2(t: float) -> Image.Image:
    img = wall_frame(0.55, 0.80, True)
    return bottom_scrim(img, 640, 225)


B3_SEQ = [("k1", "KYOTO · FUSHIMI INARI"), ("v2", "VENEDİK · CANNAREGIO"),
          ("g3", "KAPADOKYA · GÖREME"), ("p1", "PAMUKKALE · HİERAPOLİS")]
B3_PH = 940
B3_Y = 560


def frame_b3(t: float) -> Image.Image:
    local = t - T["b3"][0]
    idx = min(3, int(local / 0.95))
    name, label = B3_SEQ[idx]
    ph = clean_square(name, B3_PH)
    zoom = 1.0 + 0.10 * ((local % 0.95) / 0.95)
    side = int(B3_PH * zoom)
    tile = ph.resize((side, side), Image.LANCZOS).crop(((side - B3_PH) // 2, (side - B3_PH) // 2,
                                                       (side + B3_PH) // 2, (side + B3_PH) // 2))
    base = GLOW.copy()
    x0 = (W - B3_PH) // 2
    base.paste(ImageEnhance.Brightness(tile).enhance(0.66), (x0, B3_Y))
    cap = text_layer(label, font(28), MUTED, tracking=5, blur=8)
    paste(base, cap, (x0 + 6, B3_Y + B3_PH + 26), 0.9)
    d = ImageDraw.Draw(base)
    d.line([(x0, B3_Y - 26), (x0 + 72, B3_Y - 26)], fill=GOLD, width=4)
    return vignette(base, 90)


def frame_b4(t: float) -> Image.Image:
    local = t - T["b4"][0]
    img = photo_bg("g2", blur=34, opacity=0.13, dark=0.5)
    img = card_panel(vignette(img, 70))
    draw_route(img, clamp((local - 0.20) / 2.30))
    stop_chip(img, clamp((local - 2.65) / 0.45))
    return img




def frame_b5(t: float) -> Image.Image:
    base = photo_bg("v2", blur=40, opacity=0.10, dark=0.42)
    for i in range(12):
        appear = T["b5"][0] + 0.06 + i * 0.145
        if t + 0.001 < appear:
            continue
        r, c = divmod(i, D_COLS)
        x = D_X0 + c * (D_TILE + D_GAP)
        y = D_Y0 + r * (D_TILE + D_GAP)
        tile = clean_square(STILL_NAMES[i], D_TILE)
        k = clamp((t - appear) / 0.13)
        if k < 1:
            s = int(D_TILE * (0.84 + 0.16 * ease_out(k)))
            base.paste(tile.resize((s, s), Image.LANCZOS),
                       (x + (D_TILE - s) // 2, y + (D_TILE - s) // 2))
        else:
            base.paste(tile, (x, y))
    return vignette(base, 80)


def frame_b6(t: float) -> Image.Image:
    local = t - T["b6"][0]
    tile = clean_square("p3", 760)
    zoom = 1.0 + 0.08 * clamp(local / 1.2)
    s = int(760 * zoom)
    tile = tile.resize((s, s), Image.LANCZOS).crop(((s - 760) // 2, (s - 760) // 2,
                                                   (s + 760) // 2, (s + 760) // 2))
    tile = tile.resize((W, H), Image.LANCZOS)
    base = ImageEnhance.Brightness(tile).enhance(0.66)
    base = bottom_scrim(base, 760, 235)
    base = vignette(base, 110)
    if local >= 0.55:
        fade = clamp((local - 0.55) / 0.20)
        base = Image.blend(base, Image.new("RGB", (W, H), INK), fade)
    return base


# ------------------------------------------------------------------ yazı katmanları


def build_layers():
    L = {}
    L["b1_h"] = text_layer("4.000 fotoğraf.", font(104), CREAM)
    L["b1_s"] = text_layer("telefonumda", font(46, False), MUTED)
    L["b2_h"] = text_layer("Hatırladığım: 5", font(96), CREAM)
    L["b2_s"] = text_layer("gerisi aynı noktadan", font(46, False), MUTED)
    for i, (h, s) in enumerate([("kaç dakika", "duraklar arası sürelerle"),
                                ("hangi sıra", "3 saatin varsa 7 durak"),
                                ("ne dinleyeceksin", "vardığında · izin verirsen")]):
        L[f"c{i}_h"] = text_layer(h, font(88), CREAM)
        L[f"c{i}_s"] = text_layer(s, font(42, False), MUTED)
    L["d_big"] = text_layer("12", font(280), GOLD)
    L["d_sub"] = text_layer("fotoğraf", font(52), CREAM)
    L["e_h"] = text_layer("Hepsi aklımda.", font(88), CREAM)
    L["word"] = text_layer("atlasia.", font(126), CREAM)
    L["tag"] = text_layer("Dünyayı merakınla keşfet", font(34, False), MUTED)
    return L


LAYERS = build_layers()
TXT_SPANS = [(2.55, 3.95), (3.95, 5.25), (5.25, 6.40)]


def b4_text(img: Image.Image, local: float) -> Image.Image:
    for i, (start, end) in enumerate(TXT_SPANS):
        if start - 0.24 <= local <= end + 0.24:
            a = min(clamp((local - (start - 0.24)) / 0.24), clamp((end + 0.24 - local) / 0.24))
            h, s = LAYERS[f"c{i}_h"], LAYERS[f"c{i}_s"]
            paste(img, h, ((W - h.width) // 2, CARD[1] - 300), a)
            paste(img, s, ((W - s.width) // 2, CARD[1] - 168), a * 0.92)
    return img




# ------------------------------------------------------------------ ana döngü


def render_frame(i: int, t: float) -> Image.Image:
    if t < T["b2"][0]:
        img = frame_b1(t)
        a = clamp((t - 0.20) / 0.26)
        paste(img, LAYERS["b1_h"], (84, H - 470), a)
        paste(img, LAYERS["b1_s"], (92, H - 340), a * 0.95)
    elif t < T["b3"][0]:
        img = frame_b2(t)
        a = clamp((t - T["b2"][0] - 0.04) / 0.24)
        paste(img, LAYERS["b2_h"], (84, H - 470), a)
        paste(img, LAYERS["b2_s"], (92, H - 340), a * 0.95)
    elif t < T["b4"][0]:
        img = frame_b3(t)
    elif t < T["b5"][0]:
        img = b4_text(frame_b4(t), t - T["b4"][0])
    elif t < T["b6"][0]:
        img = frame_b5(t)
        a = clamp((t - T["b5"][0] - 1.30) / 0.22)
        if a > 0:
            big, sub = LAYERS["d_big"], LAYERS["d_sub"]
            paste(img, big, ((W - big.width) // 2, 1216), a)
            paste(img, sub, ((W - sub.width) // 2, 1508), a * 0.95)
    else:
        img = frame_b6(t)
        local = t - T["b6"][0]
        if local < 0.55:
            a = clamp((local - 0.02) / 0.18)
            e = LAYERS["e_h"]
            paste(img, e, ((W - e.width) // 2, H - 520), a)
        else:
            a = clamp((local - 0.62) / 0.16)
            word, tag = LAYERS["word"], LAYERS["tag"]
            paste(img, word, ((W - word.width) // 2, H // 2 - 180), a)
            paste(img, tag, ((W - tag.width) // 2, H // 2 - 14), a * 0.72)
    return img


def main() -> int:
    return encode_video(render_frame, OUT, VOICE, TOTAL,
                        cover_at=int(16.95 * FPS), cover_path=BUILD / "cover.jpg")


if __name__ == "__main__":
    raise SystemExit(main())

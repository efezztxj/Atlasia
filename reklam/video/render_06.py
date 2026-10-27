"""Atlasia · reklam 06 — "Sinyal yok" (15,41 sn, sesli).

KONU: çevrimdışı paket. 200 Metre kampanyasının dışında, tamamen farklı bir konu.
Görsel dil: fotoğraf yok — soyut harita döşemeleri, indirme kartı, uçak modu.

  0,00–2,46  harita döşemeleri yüklenemez, griye düşer
  2,46–2,91  (boşluk)
  2,91–5,42  ekran neredeyse kararır, geri dönüş
  5,42–6,17  (boşluk)
  6,17–9,62  indirme kartı: %0 → %100
  9,92–11,80 uçak modu anahtarı açılır
 12,35–14,81 harita net, pinler ve rota; "SİNYAL YOK" köşede
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from atlasia_kit import (
    BUILD, CREAM, FPS, GLOW, GOLD, H, INK, MINT, MUTED, OUT_DIR, STILL_NAMES, W,
    bottom_scrim, clamp, clean_square, ease_out, encode_video, font, paste, text_layer,
    vignette,
)

VOICE = OUT_DIR.parent / "ses" / "06-tam.mp3"
OUT = OUT_DIR / "200-metre-06.mp4"
DUR = 15.41
TOTAL = int(round(DUR * FPS))

T1 = (0.00, 2.46)
T2 = (2.91, 5.42)
T3 = (6.17, 9.62)
T4 = (9.92, 11.80)
T5 = (12.35, 14.81)

# ---------------------------------------------------------------- harita döşemeleri

TILE, GAP, MARGIN, COLS, ROWS = 178, 8, 12, 6, 11
GRID_W = MARGIN * 2 + COLS * TILE + (COLS - 1) * GAP
GRID_X = (W - GRID_W) // 2
GRID_H = MARGIN * 2 + ROWS * TILE + (ROWS - 1) * GAP

_NAMES = [n for n in STILL_NAMES]
TILES = []
for i in range(COLS * ROWS):
    t = clean_square(_NAMES[i % len(_NAMES)], TILE)
    t = ImageEnhance.Brightness(t).enhance(0.42)
    t = ImageEnhance.Color(t).enhance(0.35)
    TILES.append(t)


def tile_xy(i):
    r, c = divmod(i, COLS)
    return MARGIN + c * (TILE + GAP), MARGIN + r * (TILE + GAP)


def draw_grid_state(img, loaded_ratio: float, failed: bool, veil: float = 0.0) -> Image.Image:
    g = Image.new("RGB", (GRID_W, GRID_H), (7, 22, 28))
    d = ImageDraw.Draw(g)
    n_loaded = int(round(loaded_ratio * len(TILES)))
    for i in range(len(TILES)):
        x, y = tile_xy(i)
        if i < n_loaded and not failed:
            g.paste(TILES[i], (x, y))
        else:
            box = [x, y, x + TILE - 1, y + TILE - 1]
            d.rectangle(box, fill=(11, 28, 34) if not failed else (16, 22, 26))
            for lx in range(x + 14, x + TILE - 14, 26):
                d.line([(lx, y + TILE // 2), (min(lx + 14, x + TILE - 14), y + TILE // 2)],
                       fill=(255, 255, 255, 22), width=2)
    base = Image.new("RGB", (W, H), INK)
    base.paste(g, (GRID_X, (H - GRID_H) // 2))
    if veil > 0:
        base = Image.blend(base, Image.new("RGB", (W, H), INK), veil)
    return base


# ---------------------------------------------------------------- yazılar


def _t(txt, size, color=CREAM, bold=True, track=0, blur=16):
    return text_layer(txt, font(size, bold), color, tracking=track, blur=blur)


L = {
    "b1h": _t("Harita yüklenmedi.", 78),
    "b1s": _t("çünkü hiç yüklenmedi", 40, MUTED, False),
    "b2h": _t("Sinyal yoktu.", 96),
    "b2s": _t("ben de döndüm", 44, MUTED, False),
    "b3h": _t("Bölgeyi indir.", 84),
    "b3s": _t("bir kere, evdeyken", 40, MUTED, False),
    "b3p": _t("Kapadokya · 42 MB", 34, MUTED, False),
    "b4h": _t("Uçak modunda", 76),
    "b4s": _t("da açılıyor", 44, MUTED, False),
    "b5h": _t("SİNYAL YOK", 64, MUTED, True, 10),
    "b5s": _t("harita var", 52, CREAM, False),
    "word": _t("atlasia.", 100),
    "tag": _t("Dünyayı merakınla keşfet", 30, MUTED, False),
}


# ---------------------------------------------------------------- sahneler


def spinner(img, cx, cy, r, ang, alpha=1.0):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    import math
    a0 = math.radians(ang)
    d.arc([cx - r, cy - r, cx + r, cy + r], math.degrees(a0), math.degrees(a0) + 250,
          fill=GOLD + (255,), width=7)
    img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A").point(lambda v: int(v * alpha)))
    return img


def frame_1(t):
    local = t
    ratio = clamp(local / 2.0) * 0.55
    img = draw_grid_state(None, ratio, failed=(local > 1.7), veil=0.10)
    if local < 1.7:
        img = spinner(img, W // 2, H // 2 + 40, 52, local * 420, clamp(local / 0.3))
        a = clamp((local - 0.2) / 0.3)
        paste(img, L["b1h"], (84, H - 470), a)
        paste(img, L["b1s"], (92, H - 345), a * 0.9)
    else:
        label = _t("bağlantı yok", 44, (230, 120, 100), True, 2, 12)
        paste(img, label, ((W - label.width) // 2, H // 2 - 120), clamp((local - 1.75) / 0.25))
        paste(img, L["b1h"], (84, H - 470), 0.85)
    return bottom_scrim(img, 640, 220)


def frame_2(t):
    local = t - T2[0]
    img = draw_grid_state(None, 0.0, failed=True, veil=0.88)
    a = clamp((local - 0.05) / 0.3)
    paste(img, L["b2h"], (84, H - 560), a)
    paste(img, L["b2s"], (92, H - 440), a * 0.9)
    # geri dönüş oku
    if local > 0.5:
        b = clamp((local - 0.5) / 0.35)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        cx, cy = W // 2, H // 2 - 130
        d.line([(cx + 70, cy), (cx - 70, cy)], fill=CREAM + (220,), width=8)
        d.line([(cx - 70, cy), (cx - 26, cy - 44)], fill=CREAM + (220,), width=8)
        d.line([(cx - 70, cy), (cx - 26, cy + 44)], fill=CREAM + (220,), width=8)
        img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A").point(lambda v: int(v * b)))
    return bottom_scrim(img, 700, 200)


def frame_3(t):
    local = t - T3[0]
    span = T3[1] - T3[0]
    img = draw_grid_state(None, 0.0, failed=False, veil=0.20)
    img = bottom_scrim(img, 900, 230)

    prog = ease_out(clamp((local - 0.55) / 2.20))
    x0, y0 = 110, 900
    w, h = W - 220, 380
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=30, fill=(6, 24, 29, 240),
                        outline=(255, 255, 255, 45), width=2)
    d.ellipse([40, 46, 92, 98], fill=GOLD + (255,))
    d.line([(66, 60), (66, 84)], fill=INK + (255,), width=5)
    d.line([(66, 84), (84, 74)], fill=INK + (255,), width=5)
    d.text((116, 44), "Çevrimdışı paket", font=font(40), fill=CREAM + (255,))
    d.text((116, 96), "Kapadokya · 42 MB", font=font(30, False), fill=MUTED + (235,))
    bar = [40, 190, w - 40, 214]
    d.rounded_rectangle(bar, radius=12, fill=(255, 255, 255, 26))
    if prog > 0:
        d.rounded_rectangle([bar[0], bar[1], bar[0] + max(24, int((bar[2] - bar[0]) * prog)), bar[3]],
                            radius=12, fill=GOLD + (255,))
    pct = _t(f"%{int(prog * 100)}", 62, CREAM, True, 0, 8)
    card.alpha_composite(pct, (40, 236))
    hint = _t("bir kere indirilir, sonra hep cebinde", 28, MUTED, False, 0, 6)
    card.alpha_composite(hint, (44, 316))
    paste(img, card, (x0, y0), 1.0)

    a = clamp((local - 0.1) / 0.28)
    paste(img, L["b3h"], (110, 700), a)
    paste(img, L["b3s"], (116, 800), a * 0.9)
    return img


def frame_4(t):
    local = t - T4[0]
    img = draw_grid_state(None, 0.35, failed=False, veil=0.42)
    img = bottom_scrim(img, 820, 225)
    a = clamp((local - 0.05) / 0.25)
    cx, cy = W // 2, 700
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - 130, cy - 130, cx + 130, cy + 130], fill=INK + (230,),
              outline=(255, 255, 255, 60), width=3)
    # uçak ikonu
    d.polygon([(cx, cy - 76), (cx + 18, cy - 10), (cx + 78, cy + 18), (cx + 78, cy + 40),
               (cx + 16, cy + 26), (cx + 10, cy + 62), (cx + 34, cy + 80), (cx + 34, cy + 94),
               (cx, cy + 82), (cx - 34, cy + 94), (cx - 34, cy + 80), (cx - 10, cy + 62),
               (cx - 16, cy + 26), (cx - 78, cy + 40), (cx - 78, cy + 18), (cx - 18, cy - 10)],
              fill=GOLD + (255,))
    # anahtar
    on = clamp((local - 0.45) / 0.35)
    tx, ty = cx - 110, cy + 176
    d.rounded_rectangle([tx, ty, tx + 220, ty + 64], radius=32,
                        fill=INK + (240,), outline=(255, 255, 255, 70), width=3)
    d.rounded_rectangle([tx + 6, ty + 6, tx + 104 + int(110 * on), ty + 58], radius=26,
                        fill=(MINT[0], MINT[1], MINT[2], 230) if on > 0.5 else (255, 255, 255, 30))
    d.ellipse([tx + 12 + int(110 * on), ty + 12, tx + 56 + int(110 * on), ty + 56], fill=CREAM + (255,))
    img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A").point(lambda v: int(v * a)))
    paste(img, L["b4h"], (84, H - 470), a)
    paste(img, L["b4s"], (92, H - 360), a * 0.9)
    return img


def frame_5(t):
    local = t - T5[0]
    img = draw_grid_state(None, 1.0, failed=False, veil=0.22)
    img = vignette(img, 110)
    img = bottom_scrim(img, 860, 235)

    # rota + pinler
    if local > 0.35:
        k = clamp((local - 0.35) / 1.2)
        pts = [(190, 1180), (360, 1090), (330, 980), (520, 900), (700, 960), (860, 840)]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        seg = 0
        total = len(pts) - 1
        for i in range(total):
            if k * total <= i:
                break
            frac = clamp(k * total - i)
            x1, y1 = pts[i]
            x2, y2 = pts[i + 1]
            d.line([(x1, y1), (x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac)],
                   fill=GOLD + (235,), width=7)
        for i, (px, py) in enumerate(pts):
            if i > k * total:
                continue
            d.ellipse([px - 17, py - 17, px + 17, py + 17], fill=(255, 255, 255, 240))
            d.ellipse([px - 7, py - 7, px + 7, py + 7], fill=INK + (255,))
        img.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A"))

    # köşede "sinyal yok" göstergesi
    badge = _t("SİNYAL YOK", 26, (235, 130, 110), True, 6, 8)
    cap = Image.new("RGBA", (badge.width + 44, 56), (0, 0, 0, 0))
    d = ImageDraw.Draw(cap)
    d.rounded_rectangle([0, 0, cap.width - 1, cap.height - 1], radius=28,
                        fill=INK + (235,), outline=(235, 130, 110, 90), width=2)
    d.ellipse([16, 20, 32, 36], fill=(235, 130, 110))
    cap.alpha_composite(badge, (40, 8))
    paste(img, cap, (W - cap.width - 40, 96), clamp((local - 0.2) / 0.3))

    a = clamp((local - 0.10) / 0.26)
    paste(img, L["b5h"], (92, H - 560), a)
    b = clamp((local - 0.28) / 0.26)
    paste(img, L["b5s"], (92, H - 470), b * 0.95)
    c = clamp((local - 1.35) / 0.30)
    if c > 0:
        # logo gelirken zemini karart: rota çizgisi logonun arkasında kalsın
        dark = Image.blend(img, Image.new("RGB", (W, H), INK), 0.72 * c)
        img.paste(dark, (0, 0))
        word, tag = L["word"], L["tag"]
        paste(img, word, ((W - word.width) // 2, 316), c)
        paste(img, tag, ((W - tag.width) // 2, 440), c * 0.65)
    return img


def render_frame(i, t):
    if t < T2[0]:
        return frame_1(t)
    if t < T3[0]:
        return frame_2(t)
    if t < T4[0]:
        return frame_3(t)
    if t < T5[0]:
        return frame_4(t)
    return frame_5(t)


def main():
    return encode_video(render_frame, OUT, VOICE, TOTAL,
                        cover_at=int(13.2 * FPS), cover_path=BUILD / "cover-06.jpg")


if __name__ == "__main__":
    raise SystemExit(main())

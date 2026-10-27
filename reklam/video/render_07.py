"""Atlasia · reklam 07 — "Yarın Kapadokya'da yağmur var" (16,38 sn, sesli).

KONU: hava durumuna göre rota. 200 Metre dışında, bağımsız bir konu.
Görsel dil: fotoğraf yok — yağmur animasyonu, dikey durak listesi kartı,
her durakta varış saatindeki hava çipi. 05'in harita kartından tamamen farklı.

  0,00–3,11  yağmur başlar, rota kartı donuk
  3,11–3,51  (boşluk)
  3,51–5,52  "Planın hâlâ geçerli mi?" + 3. durakta kırmızı yağmur uyarısı
  5,52–5,87  (boşluk)
  5,87–10,00 her durağa varış havası eklenir
 10,00–10,35 (boşluk)
 10,35–12,52 yağmur gelince sıra değişir (duraklar yer değiştirir)
 12,52–12,97 (boşluk)
 12,97–15,61 "Hava değişince, plan da değişir."
"""

from __future__ import annotations

import math

from PIL import Image, ImageDraw, ImageFilter

from atlasia_kit import (
    BUILD, CREAM, FPS, GOLD, H, INK, INK2, MINT, MUTED, OUT_DIR, W,
    clamp, ease_out, encode_video, font, paste, text_layer, vignette,
)

VOICE = OUT_DIR.parent / "ses" / "07-tam.mp3"
OUT = OUT_DIR / "200-metre-07.mp4"
DUR = 16.38
TOTAL = int(round(DUR * FPS))

B1 = (0.00, 3.11)
B2 = (3.51, 5.52)
B3 = (5.87, 10.00)
B4 = (10.35, 12.52)
B5 = (12.97, 15.61)

RAIN = (150, 196, 232)
WARN = (232, 122, 96)

STOPS = [
    ("Göreme Açık Hava Müzesi", "09:20", "sun"),
    ("Aşk Vadisi", "10:40", "sun"),
    ("Uçhisar Kalesi", "12:05", "cloud"),
    ("Çavuşin", "13:30", "rain"),
    ("Avanos", "15:00", "cloud"),
    ("Kızılçukur", "16:45", "sun"),
    ("Ortahisar", "18:10", "sun"),
]


# ---------------------------------------------------------------- yağmur


def rain_layer(t: float, intensity: float, seed: int = 0) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    n = int(120 * intensity)
    for i in range(n):
        h = (i * 2654435761 + seed * 40503) % 100000
        x0 = (h * 37) % (W + 300) - 150
        speed = 900 + (h % 420)
        y = ((h * 13 + t * speed) % (H + 260)) - 130
        length = 60 + (h % 90)
        a = 30 + int(60 * intensity)
        d.line([(x0, y), (x0 - 26, y + length)], fill=RAIN + (a,), width=2 + (h % 2))
    return layer.filter(ImageFilter.GaussianBlur(0.6))


def apply_rain(img: Image.Image, t: float, intensity: float, seed: int = 0) -> Image.Image:
    if intensity <= 0.01:
        return img
    r = rain_layer(t, intensity, seed)
    out = img.copy()
    out.paste(r.convert("RGB"), (0, 0), r.getchannel("A"))
    return out


def storm_bg(t: float) -> Image.Image:
    base = Image.new("RGB", (W, H), (5, 14, 20))
    d = ImageDraw.Draw(base)
    for i in range(7):
        r = 420 - i * 40
        k = 0.10 + 0.05 * math.sin(t * 1.4 + i)
        col = (int(12 + 30 * k), int(22 + 34 * k), int(30 + 40 * k))
        d.ellipse([W // 2 - r, 220 - r // 2, W // 2 + r, 220 + r // 2], fill=col)
    base = base.filter(ImageFilter.GaussianBlur(40))
    return base


# ---------------------------------------------------------------- hava ikonları


def weather_icon(kind: str, size: int = 44, color=CREAM) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size // 2
    if kind == "sun":
        r = size * 0.20
        d.ellipse([c - r, c - r, c + r, c + r], fill=GOLD + (255,))
        for k in range(8):
            a = math.radians(k * 45)
            d.line([(c + math.cos(a) * r * 1.5, c + math.sin(a) * r * 1.5),
                    (c + math.cos(a) * r * 2.15, c + math.sin(a) * r * 2.15)],
                   fill=GOLD + (220,), width=3)
    elif kind == "cloud":
        d.ellipse([c - 17, c - 10, c + 3, c + 10], fill=(214, 222, 228, 255))
        d.ellipse([c - 4, c - 16, c + 16, c + 4], fill=(226, 232, 236, 255))
        d.ellipse([c - 2, c - 2, c + 20, c + 14], fill=(206, 214, 220, 255))
    else:  # rain
        d.ellipse([c - 17, c - 14, c + 5, c + 6], fill=(196, 206, 214, 255))
        d.ellipse([c - 4, c - 20, c + 16, c], fill=(208, 216, 222, 255))
        for k in range(3):
            x = c - 10 + k * 9
            d.line([(x, c + 12), (x - 4, c + 24)], fill=RAIN + (230,), width=3)
    return img


ICONS = {k: weather_icon(k) for k in ("sun", "cloud", "rain")}


# ---------------------------------------------------------------- durak kartı

CARD_X0, CARD_X1 = 76, W - 76
CARD_Y0, CARD_Y1 = 430, 1500
ROW_H = (CARD_Y1 - CARD_Y0 - 120) // len(STOPS)


def draw_card(img: Image.Image, order: list[int], weather_alpha: float,
              highlight: int | None = None, dim: float = 0.0,
              warning: int | None = None) -> Image.Image:
    panel = Image.new("RGB", (CARD_X1 - CARD_X0, CARD_Y1 - CARD_Y0), INK2)
    panel = Image.blend(panel, Image.new("RGB", panel.size, (10, 30, 36)), 0.5)
    pw, ph = panel.size
    d = ImageDraw.Draw(panel, "RGBA")
    for gy in range(0, ph, 48):
        d.line([(0, gy), (pw, gy)], fill=(255, 255, 255, 10), width=1)

    d.text((36, 34), "KAPADOKYA · 1 GÜN", font=font(26), fill=MUTED + (230,))
    d.text((36, 74), "7 durak · 3 saat", font=font(30, False), fill=(255, 255, 255, 150))

    for slot, idx in enumerate(order):
        name, clock, kind = STOPS[idx]
        y = 140 + slot * ROW_H
        if highlight is not None and idx == highlight:
            d.rounded_rectangle([18, y - 12, pw - 18, y + ROW_H - 20], radius=16,
                                fill=(255, 255, 255, 18), outline=GOLD + (140,), width=2)
        if warning is not None and idx == warning:
            d.rounded_rectangle([18, y - 12, pw - 18, y + ROW_H - 20], radius=16,
                                fill=WARN + (30,), outline=WARN + (170,), width=2)
        d.ellipse([36, y + 12, 66, y + 42], fill=GOLD + (255,))
        d.text((42, y + 18), str(slot + 1), font=font(22), fill=INK + (255,))
        d.text((86, y + 4), name, font=font(30), fill=CREAM + (255,))
        d.text((86, y + 44), clock, font=font(24, False), fill=MUTED + (220,))
        if weather_alpha > 0.02:
            ic = ICONS[kind].copy()
            a = ic.getchannel("A").point(lambda v: int(v * weather_alpha))
            ic.putalpha(a)
            panel.paste(ic.convert("RGB"), (pw - 96, y + 18), a)

    mask = Image.new("L", panel.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=34, fill=255)
    if dim > 0:
        panel = Image.blend(panel, Image.new("RGB", panel.size, INK), dim)
    img.paste(panel, (CARD_X0, CARD_Y0), mask)
    ImageDraw.Draw(img).rounded_rectangle([CARD_X0, CARD_Y0, CARD_X1 - 1, CARD_Y1 - 1],
                                          radius=34, outline=(255, 255, 255, 40), width=2)
    return img


def header_hint(img: Image.Image, alpha: float, text: str, color=WARN) -> Image.Image:
    if alpha <= 0.01:
        return img
    lay = text_layer(text, font(30), color, blur=10)
    paste(img, lay, (CARD_X0 + 4, CARD_Y0 - 58), alpha)
    return img


# ---------------------------------------------------------------- yazılar


def _t(txt, size, color=CREAM, bold=True, track=0, blur=16):
    return text_layer(txt, font(size, bold), color, tracking=track, blur=blur)


L = {
    "b1h": _t("Yarın yağmur var.", 92),
    "b1s": _t("Kapadokya · 12 mm", 42, RAIN, True, 2, 12),
    "b2h": _t("Planın hâlâ", 88),
    "b2h2": _t("geçerli mi?", 88),
    "b3h": _t("Her durağa", 76),
    "b3h2": _t("varış havası", 76),
    "b3s": _t("saat saat · durağı durağı", 38, MUTED, False),
    "b4h": _t("Yağmur geliyorsa", 68),
    "b4h2": _t("sıra değişir", 68),
    "b5h": _t("Hava değişince,", 62),
    "b5h2": _t("plan da değişir.", 62),
    "word": _t("atlasia.", 96),
    "tag": _t("Dünyayı merakınla keşfet", 30, MUTED, False),
}


# ---------------------------------------------------------------- sahneler


def frame_1(t):
    local = t
    img = storm_bg(t)
    img = draw_card(img, list(range(7)), weather_alpha=0.0, dim=0.55)
    img = apply_rain(img, t, 0.35 + 0.5 * clamp(local / 2.2))
    img = vignette(img, 95)
    a = clamp((local - 0.1) / 0.3)
    paste(img, L["b1h"], (76, 200), a)
    paste(img, L["b1s"], (82, 330), a * 0.9)
    return img


def frame_2(t):
    local = t - B2[0]
    img = storm_bg(t)
    img = draw_card(img, list(range(7)), weather_alpha=0.0, dim=0.35, warning=3)
    img = apply_rain(img, t, 0.9)
    img = vignette(img, 95)
    a = clamp((local - 0.02) / 0.26)
    paste(img, L["b2h"], (76, 200), a)
    b = clamp((local - 0.18) / 0.26)
    paste(img, L["b2h2"], (76, 300), b)
    return img


def frame_3(t):
    local = t - B3[0]
    img = storm_bg(t)
    wa = clamp((local - 0.55) / 1.6)
    img = draw_card(img, list(range(7)), weather_alpha=wa, dim=max(0.0, 0.30 * (1 - wa)))
    img = apply_rain(img, t, 0.5 * (1 - clamp(local / 3.0)))
    img = vignette(img, 95)
    a = clamp((local - 0.05) / 0.26)
    paste(img, L["b3h"], (76, 118), a)
    b = clamp((local - 0.20) / 0.26)
    paste(img, L["b3h2"], (76, 208), b)
    c = clamp((local - 1.9) / 0.4)
    paste(img, L["b3s"], (82, 316), c * 0.85)
    return img


ORDER_A = list(range(7))
ORDER_B = [0, 1, 5, 2, 4, 6, 3]


def frame_4(t):
    local = t - B4[0]
    k = ease_out(clamp((local - 0.25) / 1.15))
    order = [ORDER_A[i] if k < 0.5 else ORDER_B[i] for i in range(7)]
    img = storm_bg(t)
    if k < 0.5:
        img = draw_card(img, ORDER_A, weather_alpha=1.0, highlight=3, dim=0.22)
    else:
        img = draw_card(img, ORDER_B, weather_alpha=1.0, highlight=3, dim=0.22)
    img = vignette(img, 90)
    a = clamp((local - 0.05) / 0.24)
    paste(img, L["b4h"], (76, 150), a)
    b = clamp((local - 0.20) / 0.24)
    paste(img, L["b4h2"], (76, 236), b)
    return img


def frame_5(t):
    local = t - B5[0]
    img = storm_bg(t)
    img = draw_card(img, ORDER_B, weather_alpha=1.0, dim=0.74)
    img = apply_rain(img, t, 0.18)
    img = vignette(img, 110)
    a = clamp((local - 0.05) / 0.26)
    paste(img, L["b5h"], (76, 206), a)
    b = clamp((local - 0.22) / 0.26)
    paste(img, L["b5h2"], (76, 292), b)
    # final: güneşli durak vurgusu
    if local > 1.5:
        c = clamp((local - 1.5) / 0.4)
        word, tag = L["word"], L["tag"]
        paste(img, word, ((W - word.width) // 2, 1590), c)
        paste(img, tag, ((W - tag.width) // 2, 1706), c * 0.6)
    return img


def render_frame(i, t):
    if t < B2[0]:
        return frame_1(t)
    if t < B3[0]:
        return frame_2(t)
    if t < B4[0]:
        return frame_3(t)
    if t < B5[0]:
        return frame_4(t)
    return frame_5(t)


def main():
    return encode_video(render_frame, OUT, VOICE, TOTAL,
                        cover_at=int(8.6 * FPS), cover_path=BUILD / "cover-07.jpg")


if __name__ == "__main__":
    raise SystemExit(main())

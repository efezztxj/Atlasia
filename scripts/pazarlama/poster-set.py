#!/usr/bin/env python3
"""
Atlasia — fikir bankasından 3 hızlı poster (1080x1350).

1) "Ay'a rota çıkar"      → reddetme davranışı, mizah
2) "Anneme kullandırttım" → usability testi duyurusu, kanca
3) "Uzaklaştır / yaklaştır" → loop fikrinin tek kare özeti

Kullanım: python3 scripts/pazarlama/poster-set.py
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).with_name("ai-yapti-kreatif.py")
OUT = ROOT / "docs/pazarlama/kreatifler/posterler"

spec = importlib.util.spec_from_file_location("kreatif", BASE)
k = importlib.util.module_from_spec(spec)
spec.loader.exec_module(k)

W, H = 1080, 1350
MARGIN = 88


def shell(accent, kicker="fikir"):
    img = k.backdrop(W, H, accent, seed_shift=30)
    d = ImageDraw.Draw(img)
    word = k.f(k.BOLD, 34)
    d.text((MARGIN, 62), "atlasia", font=word, fill=k.MINT)
    d.text((MARGIN + word.getlength("atlasia"), 62), ".", font=word, fill=k.SUN)
    kf = k.f(k.REG, 22)
    d.text((W - MARGIN - kf.getlength(kicker), 72), kicker, font=kf, fill=k.DIM)
    d.line([(MARGIN, 150), (W - MARGIN, 150)], fill=(255, 255, 255, 30), width=1)
    return img, d


def footer(d, note="atlasia.pages.dev · reklam değil, fikir"):
    ff = k.f(k.REG, 23)
    d.line([(MARGIN, H - 132), (W - MARGIN, H - 132)], fill=(255, 255, 255, 26), width=1)
    d.text((MARGIN, H - 88), note, font=ff, fill=k.DIM)


def poster_ay():
    """Sohbet balonu: saçma soru, dürüst cevap."""
    img, d = shell(k.LEAF, "fikir 02")
    head = k.f(k.BOLD, 92)
    k.draw_lines(d, (MARGIN, 250), k.wrap("Atlas AI'ya\n“Ay’a rota\nçıkar” dedim.", head, W - MARGIN * 2), head, k.MINT, 104)

    bubble_font = k.f(k.REG, 40)
    user_text = k.wrap("Ay’a rota çıkar", bubble_font, 640)
    answer_text = k.wrap(
        "Bu başlangıcın yakınında seçtiğin süreye ve ulaşıma uygun yeterli iz yok. Başlangıcı seçili bir yere taşıyabilirsin.",
        k.f(k.REG, 33),
        W - MARGIN * 2 - 56,
    )

    y = 700
    # kullanıcı balonu (sağ)
    uw = max(bubble_font.getlength(t) for t in user_text) + 56
    d.rounded_rectangle([W - MARGIN - uw, y, W - MARGIN, y + 104], 26, fill=k.SUN)
    k.draw_lines(d, (W - MARGIN - uw + 28, y + 28), user_text, bubble_font, k.INK, 52)

    y += 150
    # asistan balonu (sol)
    bh = 56 + len(answer_text) * 54
    d.rounded_rectangle([MARGIN, y, W - MARGIN, y + bh], 26, fill=(20, 44, 38), outline=(255, 255, 255, 45), width=2)
    k.draw_lines(d, (MARGIN + 28, y + 28), answer_text, k.f(k.REG, 33), k.MINT, 54)

    y += bh + 44
    note = k.f(k.REG, 30)
    k.draw_lines(
        d,
        (MARGIN, y),
        k.wrap("Saçmalayana saçmalamıyor. Elinde veri yoksa söylüyor.", note, W - MARGIN * 2),
        note,
        k.SUN,
        44,
    )
    footer(d)
    return img


def poster_anne():
    img, d = shell(k.SUN, "fikir 50")
    head = k.f(k.BOLD, 120)
    k.draw_lines(d, (MARGIN, 300), k.wrap("Anneme\nkullandırttım.", head, W - MARGIN * 2), head, k.SUN, 132)

    body = k.f(k.REG, 40)
    k.draw_lines(
        d,
        (MARGIN, 700),
        k.wrap(
            "Ne olduğunu anlatmadım. Telefonu verdim, “Efes’te 3 saatim var, planla” dedim.\n\nNerede takıldığını kameraya aldım.",
            body,
            W - MARGIN * 2,
        ),
        body,
        (216, 234, 222),
        62,
    )
    footer(d, "gerçek test · kurgu yok · hatalar videoda")
    return img


def poster_zoom():
    img, d = shell(k.SUN2, "fikir 33")
    head = k.f(k.BOLD, 86)
    k.draw_lines(d, (MARGIN, 220), k.wrap("Uzaklaştır:\nboş görünüyor.", head, W - MARGIN * 2), head, k.MINT, 98)

    # iki minik "harita" kutusu
    box_y = 470
    bw = (W - MARGIN * 2 - 28) // 2
    for i, count in enumerate([0, 6]):
        x = MARGIN + i * (bw + 28)
        d.rectangle([x, box_y, x + bw, box_y + bw], fill=(10, 32, 27), outline=(255, 255, 255, 55), width=2)
        for gx in range(1, 4):
            d.line([(x + bw * gx / 4, box_y), (x + bw * gx / 4, box_y + bw)], fill=(255, 255, 255, 20))
            d.line([(x, box_y + bw * gx / 4), (x + bw, box_y + bw * gx / 4)], fill=(255, 255, 255, 20))
        spots = [(0.3, 0.35), (0.65, 0.28), (0.5, 0.55), (0.28, 0.7), (0.72, 0.66), (0.52, 0.82)]
        for px, py in spots[:count]:
            cx, cy = x + bw * px, box_y + bw * py
            d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=k.SUN)
        label = "0 nokta" if count == 0 else "6 nokta"
        d.text((x + 8, box_y + bw + 18), label, font=k.f(k.REG, 32), fill=k.DIM if count == 0 else k.SUN)

    body = k.f(k.REG, 36)
    k.draw_lines(
        d,
        (MARGIN, 470 + bw + 96),
        k.wrap("Yaklaştır: 6 nokta.\nYakınındaki izler geniş görünümde saklanır, yaklaştıkça çıkar.", body, W - MARGIN * 2),
        body,
        k.MINT,
        54,
    )
    footer(d)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("02-aya-rota", poster_ay), ("50-anneme-kullandirttim", poster_anne), ("33-uzaklastir-yaklastir", poster_zoom)):
        fn().save(OUT / f"{name}.jpg", quality=92, optimize=True)
        print(OUT / f"{name}.jpg")


if __name__ == "__main__":
    main()

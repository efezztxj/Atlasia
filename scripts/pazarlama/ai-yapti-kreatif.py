#!/usr/bin/env python3
"""
Atlasia — "Bu reklamı AI yaptı" kreatif seti üretici.

Çıktı: aynı içerikten iki ölçü (Instagram carousel 1080x1350, TikTok/Reels 1080x1920).
Tipografi (DejaVu) yalnız yer tutucudur; üretimde Bricolage Grotesque ile yeniden dizilir.
Kullanım: python3 scripts/pazarlama/ai-yapti-kreatif.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/pazarlama/kreatifler/ai-yapti"

INK = (2, 21, 18)
MINT = (228, 245, 234)
SUN = (234, 181, 79)
SUN2 = (243, 200, 112)
LEAF = (91, 224, 166)
DIM = (150, 178, 165)

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def f(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        current = ""
        for word in paragraph.split():
            trial = f"{current} {word}".strip()
            if font.getlength(trial) <= max_width or not current:
                current = trial
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def draw_lines(draw, xy, lines, font, fill, leading):
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += leading
    return y


def backdrop(w: int, h: int, accent=SUN, seed_shift=0) -> Image.Image:
    """Koyu zemin + ince harita ızgarası + altın yaylar."""
    img = Image.new("RGB", (w, h), INK)
    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = max(120, w // 7)
    for gx in range(0, w + step, step):
        gd.line([(gx, 0), (gx, h)], fill=(*accent, 9), width=1)
    for gy in range(0, h + step, step):
        gd.line([(0, gy), (w, gy)], fill=(*accent, 9), width=1)
    # sağ üstte büyük, kırpılmış eşmerkezli yaylar (pusula motifi)
    for i, r in enumerate(range(w // 2, w // 2 + 700, 110)):
        box = (w - r - 120 + seed_shift, -r + 140, w + r - 120 + seed_shift, r + 140)
        gd.arc(box, start=100, end=260, fill=(*accent, 22 - i * 3), width=2)
    img = Image.alpha_composite(img.convert("RGBA"), grid).convert("RGB")

    # köşe parıltısı
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [w - 520, -320, w + 360, 420], fill=(*accent, 26)
    )
    glow = glow.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(140))
    return Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")


SLIDES = [
    {
        "kicker": "01 / 10",
        "head": "Bu reklamı\nAI yaptı.",
        "body": "Ciddiyim. Ama anlatacağı hiçbir şeyi uydurmadı:\nhepsi uygulamada gerçekten var.",
        "head_color": MINT,
        "accent": SUN,
    },
    {
        "kicker": "02 / 10",
        "head": "Uygulamada da\n“AI” var.\nSunucuda\ndil modeli yok.",
        "body": "“Atlas AI” ürünün adı. Elindeki yerlere, senin sürene,\nhavaya ve mesafeye bakıp hesap yapıyor.\nSana bir filozof gibi cevap yazmıyor; sıra çıkarıyor.",
        "head_color": MINT,
        "accent": LEAF,
    },
    {
        "kicker": "03 / 10",
        "head": "Üç soru\nsoruyor.",
        "body": "1 · Kaç saatin var?\n2 · Neye merakın var? (tarih, doğa, fotoğraf, yemek…)\n3 · Nasıl gideceksin? (yürüyüş, bisiklet, araç)",
        "head_color": MINT,
        "accent": SUN,
    },
    {
        "kicker": "04 / 10",
        "head": "Sonra sırayı\nyazıyor.\nSebebiyle.",
        "body": "“Celsus Kütüphanesi’ni 17:10’a koydum.\nKalabalık azalıyor, ışık batıdan geliyor.\nBir sonraki durak 6 dakika yürüme mesafesinde.”",
        "head_color": SUN,
        "accent": SUN,
    },
    {
        "kicker": "05 / 10",
        "head": "Efes’te\n3 saatin varsa\nsıra şu:",
        "body": "Magnesia Kapısı → Kuretler Caddesi → Yamaç Evler\n→ Celsus Kütüphanesi → Büyük Tiyatro\n\n11 duraklık tur, site içinde. Kaydır, sebebini gör.",
        "head_color": MINT,
        "accent": SUN2,
    },
    {
        "kicker": "06 / 10",
        "head": "Bir taşa 40 metre\nkalınca\nkonuşuyor.",
        "body": "Yürürken telefon kendi açıklıyor:\n“Kuretler Caddesi’ndesin…”\nİzin vermezsen susuyor. Ekran kapalıyken çalışmıyor.\nBunu reklamda söylemem, çünkü doğru değil.",
        "head_color": MINT,
        "accent": LEAF,
    },
    {
        "kicker": "07 / 10",
        "head": "İzini çiz.\nLinke çevir.",
        "body": "Yürüdüğün yol haritada kalıyor: mesafe, süre, tempo.\nPaylaştığında arkadaşın hiçbir şey indirmiyor;\ntarayıcıda açıyor.",
        "head_color": MINT,
        "accent": SUN,
    },
    {
        "kicker": "08 / 10",
        "head": "Bilmediğini\nyazıyor.",
        "body": "Bilet ücreti: doğrulanmadı.\nAçılış saati: doğrulanmadı.\nSezon: doğrulanmadı.\n\n“Gitmeden doğrula” diyor. Çoğu uygulama bu satırı\nsilmeyi tercih eder.",
        "head_color": SUN,
        "accent": SUN,
    },
    {
        "kicker": "09 / 10",
        "head": "Ve evet,\nçevrimdışı\nda çalışıyor.",
        "body": "İndirdiğin bölgenin haritası telefonda kalıyor.\nSinyal yokken aç, rota duruyor.\nYalnız izin verilen harita katmanı iniyor:\nuydudan görüntü vaadi yok.",
        "head_color": MINT,
        "accent": LEAF,
    },
    {
        "kicker": "10 / 10",
        "head": "Uygulama yok.\nMağaza yok.\nLink var.",
        "body": "atlasia.pages.dev\n\nBu reklamı beğendiysen AI’ya teşekkür et.\nUygulamayı beğendiysen linke dokun.",
        "head_color": SUN,
        "accent": SUN,
        "cta": True,
    },
]


def render(slide: dict, index: int, w: int, h: int) -> Image.Image:
    # 9:16 karede aynı metin daha büyük okunmalı (video akışında küçük yazı ölür).
    scale = w / 1080 * (1.12 if h / w > 1.5 else 1.0)
    img = backdrop(w, h, slide["accent"], seed_shift=(index % 3) * 40)
    d = ImageDraw.Draw(img)

    margin = int(88 * scale)
    top = int(92 * scale)

    # --- üst şerit: kelime markası + sayaç
    word_font = f(BOLD, int(34 * scale))
    d.text((margin, top), "atlasia", font=word_font, fill=MINT)
    wl = word_font.getlength("atlasia")
    d.text((margin + wl, top), ".", font=word_font, fill=SUN)

    kick_font = f(REG, int(22 * scale))
    kick = slide["kicker"]
    d.text((w - margin - kick_font.getlength(kick), top + int(10 * scale)), kick, font=kick_font, fill=DIM)

    d.line(
        [(margin, top + int(78 * scale)), (w - margin, top + int(78 * scale))],
        fill=(255, 255, 255, 30),
        width=1,
    )

    # --- gövde: dikey ortalama
    head_size = int(100 * scale) if len(slide["head"]) < 60 else int(88 * scale)
    head_font = f(BOLD, head_size)
    body_font = f(REG, int(37 * scale))
    max_w = w - margin * 2 - int(20 * scale)

    head_lines = wrap(slide["head"], head_font, max_w)
    body_lines = wrap(slide["body"], body_font, max_w) if slide["body"] else []

    head_lead = int(head_size * 1.12)
    body_lead = int(37 * scale * 1.62)

    block_h = len(head_lines) * head_lead + (int(46 * scale) + len(body_lines) * body_lead if body_lines else 0)
    y = int(h * 0.5 - block_h * 0.5) + int(30 * scale)

    # sol altın çizgi (marka vurgusu)
    d.rectangle(
        [margin - int(30 * scale), y + int(10 * scale), margin - int(24 * scale), y + head_lead],
        fill=slide["accent"],
    )

    y = draw_lines(d, (margin, y), head_lines, head_font, slide["head_color"], head_lead)

    if body_lines:
        y += int(46 * scale)
        draw_lines(d, (margin, y), body_lines, body_font, (216, 234, 222), body_lead)

    # --- alt şerit
    bottom = h - int(96 * scale)
    d.line([(margin, bottom - int(46 * scale)), (w - margin, bottom - int(46 * scale))], fill=(255, 255, 255, 26), width=1)

    foot_font = f(REG, int(23 * scale))
    foot = "atlasia.pages.dev" if not slide.get("cta") else "kurulum yok · tarayıcıda açılır"
    d.text((margin, bottom), foot, font=foot_font, fill=DIM)

    if index < len(SLIDES) - 1:
        hint = "kaydır  →"
        d.text((w - margin - foot_font.getlength(hint), bottom), hint, font=foot_font, fill=SUN)

    # ilerleme noktaları
    dot_r = int(4 * scale)
    gap = int(18 * scale)
    total = len(SLIDES)
    dots_w = total * gap
    dx = (w - dots_w) / 2
    dy = bottom - int(86 * scale)
    for i in range(total):
        color = SUN if i == index else (255, 255, 255, 40)
        cx = dx + i * gap + gap / 2
        d.ellipse([cx - dot_r, dy - dot_r, cx + dot_r, dy + dot_r], fill=color)

    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in (("ig-4x5", (1080, 1350)), ("tt-9x16", (1080, 1920))):
        folder = OUT / name
        folder.mkdir(parents=True, exist_ok=True)
        for i, slide in enumerate(SLIDES):
            render(slide, i, *size).save(folder / f"{i + 1:02d}.jpg", quality=92, optimize=True)
        print(f"{folder} → {len(SLIDES)} kare")


if __name__ == "__main__":
    main()

/**
 * WCAG 2.2 kontrast hesabı (P18). Saf fonksiyonlar: renk token'larından
 * okunan değerlerle test içinde kullanılır; elle sayı yazılmaz.
 */
export type Rgb = readonly [number, number, number];

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;

export function parseHex(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new TypeError(`Geçersiz renk: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as unknown as Rgb;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Yarı saydam ön plan rengini zemine bindirir (tarayıcının sRGB alfa birleştirmesi). */
export function composite(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  const a = Math.min(1, Math.max(0, alpha));
  return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a))) as unknown as Rgb;
}

/** `text-mint/60` gibi opaklıklı metnin zemin üzerindeki kontrastı. */
export function alphaTextContrast(text: string, background: string, opacityPercent: number): number {
  const bg = parseHex(background);
  return contrastRatio(composite(parseHex(text), bg, opacityPercent / 100), bg);
}

/** AA'yı geçen en düşük opaklık (yüzde, 5'lik adımlarla). */
export function minimumAaOpacity(text: string, background: string, threshold = WCAG_AA_NORMAL): number | null {
  for (let opacity = 5; opacity <= 100; opacity += 5) {
    if (alphaTextContrast(text, background, opacity) >= threshold) return opacity;
  }
  return null;
}

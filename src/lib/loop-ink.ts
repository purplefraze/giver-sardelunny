/**
 * LOOP INK — the ONE colour formula for loop labels, applied to every seat.
 *
 *   Start from the seat's app-wide colour (--mode-*). If its WCAG contrast on
 *   white is already ≥ 3:1, keep it. Otherwise lower its OKLCH LIGHTNESS only
 *   (hue kept; chroma kept, clamped down just enough to stay inside sRGB)
 *   until the contrast on white reaches 3:1.
 *
 * Pure and deterministic: same hex in, same hex out.
 */

type RGB = [number, number, number];

const TARGET = 3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): RGB {
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHex([r, g, b]: RGB): string {
  const to = (c: number) => Math.round(clamp01(c) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** WCAG relative luminance of a gamma-encoded sRGB colour. */
function luminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast of a colour against white. */
export function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hexToRgb(hex)) + 0.05);
}

/* OKLab <-> linear sRGB (Björn Ottosson). */
function linearToOklab([r, g, b]: RGB): RGB {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (c: RGB) => c.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

/** OKLCH (L, C, h in radians) -> gamma sRGB, chroma clamped into gamut. */
function fromOklch(L: number, C: number, h: number): RGB {
  let lo = 0;
  let hi = C;
  let lin = oklabToLinear([L, C * Math.cos(h), C * Math.sin(h)]);
  if (!inGamut(lin)) {
    for (let i = 0; i < 30; i += 1) {
      const mid = (lo + hi) / 2;
      const t = oklabToLinear([L, mid * Math.cos(h), mid * Math.sin(h)]);
      if (inGamut(t)) lo = mid;
      else hi = mid;
    }
    lin = oklabToLinear([L, lo * Math.cos(h), lo * Math.sin(h)]);
  }
  return lin.map((v) => toGamma(clamp01(v))) as RGB;
}

const cache = new Map<string, string>();

/** The seat colour, darkened by OKLCH lightness only to exactly 3:1 on white. */
export function loopInk(seatHex: string): string {
  const key = seatHex.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  let out = key;
  if (contrastOnWhite(key) < TARGET) {
    const [L0, a, b] = linearToOklab(hexToRgb(key).map(toLinear) as RGB);
    const C = Math.hypot(a, b);
    const h = Math.atan2(b, a);
    /* Largest lightness that still reaches 3:1 — the smallest darkening. */
    let lo = 0;
    let hi = L0;
    for (let i = 0; i < 40; i += 1) {
      const mid = (lo + hi) / 2;
      if (1.05 / (luminance(fromOklch(mid, C, h)) + 0.05) >= TARGET) lo = mid;
      else hi = mid;
    }
    out = rgbToHex(fromOklch(lo, C, h));
    /* Rounding to 8-bit can land a hair under 3:1; step down until it holds. */
    let L = lo;
    while (contrastOnWhite(out) < TARGET && L > 0) {
      L -= 0.001;
      out = rgbToHex(fromOklch(L, C, h));
    }
  }
  cache.set(key, out);
  return out;
}

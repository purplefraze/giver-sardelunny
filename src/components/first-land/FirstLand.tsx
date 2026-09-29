import { useEffect, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import {
  LIVING_G_BOX,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  LOOP_RIM_RADIUS,
} from "@/components/living-g/g-path";
import { G_STROKE, rimRadius } from "@/components/living-g/g-weight";
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import { togglePath, type TrackPose } from "@/components/living-g/toggle-path";
import { toggleGeometry } from "@/components/living-g/EarSelector";
import { FIRST_LAND, firstLandTimeline } from "./first-land-config";
import { useSvgUnits } from "./use-svg-units";

/**
 * GIVER: FIRST LAND — THE SPARK CEREMONY (once per account, first session
 * after the magic link). Every value lives in first-land-config.ts.
 *
 *   1. The G blue, the toggle on My G (12:00). Blue sparks fall from the top
 *      of the screen through the 12:00 hole and swirl round the inside of the
 *      middle loop. "here's 100 sparks"
 *   2. "50 to wish". The toggle travels to 10:30 as the whole G tints
 *      purple; half the sparks stream into the bead turning purple, rest, poof.
 *   3. "50 to give". The toggle travels back past 12:00 to 1:30 as the
 *      G tints green; the rest stream in turning green, rest, poof.
 *   4. "are you a giver?" — it stays. Ceremony over: the living G, taps work.
 *   5. "communi-g" fades into the bottom loop and stays at 60%.
 *
 * ONE TOGGLE: while the ceremony runs, the real EarSelector is not drawn; this
 * art draws the one bead and hands it back, at give, when beat 4 settles.
 *
 * THE TINT is confined here: the ceremony sets --world-g on the Living G's own
 * <svg> for its duration only and removes it when it settles (the normal
 * per-seat colour — give green — takes over at the same colour).
 *
 * Drawn INSIDE the Living G's <svg> (World's overlay), in the G's own units.
 * Pointer-transparent: taps are swallowed by <FirstLandCatch> until beat 4.
 */

export type FirstLandPhase = "ceremony" | "settled";

export const FIRST_LAND_TIMELINE = firstLandTimeline();
const T = FIRST_LAND_TIMELINE;
const W = "middle" as const;
const GEO = toggleGeometry(W);
const PATH = togglePath(W);
const DEG = { giver: -90, give: -45, wish: -135 } as const;
const MID = LOOP_CENTRE.middle;
/** The middle loop's inner edge at the living weight (rim − stroke). */
const INNER_R = rimRadius(W) - G_STROKE[W];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const easeOut = (u: number) => 1 - (1 - u) ** 3;
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/** Opacity of a beat that fades in at `a` over `fin`, and out at `b` over `fout`. */
function beat(t: number, a: number, fin: number, b = Infinity, fout = 1) {
  if (t < a) return 0;
  if (t < a + fin) return (t - a) / fin;
  if (t < b) return 1;
  return clamp01(1 - (t - b) / fout);
}

/** #rrggbb blend → #rrggbb. */
function mix(a: string, b: string, u: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x
    .map((v, i) =>
      Math.round(lerp(v, y[i]!, clamp01(u)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** A small deterministic random, so the ceremony is the same every time. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Spark = {
  /** Fall start stagger (ms) and sideways place in the falling stream (−1..1). */
  delay: number;
  fx: number;
  /** Where the pour carries it round the loop (radians either way from 12:00). */
  phi: number;
  /** Radial scatter around the swirl line (−1..1). */
  rj: number;
  to: "wish" | "give";
  /** Resting spot inside the bead's hole (unit disc). */
  bx: number;
  by: number;
  twinkle: number;
};

function makeSparks(): Spark[] {
  const r = seeded(20260928);
  const S = FIRST_LAND.spark;
  return Array.from({ length: S.count }, (_, i) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    /* Evenly round the loop, split both ways from 12:00, with a little jitter. */
    const phi = ((i + 0.5) / S.count) * 2 * Math.PI - Math.PI + (r() - 0.5) * 0.05;
    return {
      delay: r() * FIRST_LAND.timing.fall.staggerMs,
      fx: r() * 2 - 1,
      phi,
      rj: r() * 2 - 1,
      /* Interleaved, so each half leaves from all round the loop. */
      to: i % 2 === 0 ? "wish" : "give",
      bx: Math.cos(a) * d,
      by: Math.sin(a) * d,
      twinkle: r() * Math.PI * 2,
    };
  });
}

/* ---- the timeline, as pure functions of t ---- */

function toggleDeg(t: number) {
  if (t < T.wishAt) return DEG.giver;
  if (t < T.wishToggleEnd)
    return lerp(DEG.giver, DEG.wish, easeInOut((t - T.wishAt) / (T.wishToggleEnd - T.wishAt)));
  if (t < T.giveAt) return DEG.wish;
  if (t < T.giveToggleEnd)
    return lerp(DEG.wish, DEG.give, easeInOut((t - T.giveAt) / (T.giveToggleEnd - T.giveAt)));
  return DEG.give;
}

/** The whole G's colour through the ceremony: blue → purple → green. */
export function ceremonyColour(t: number) {
  const C = FIRST_LAND.colour;
  if (t < T.wishAt) return C.blue.toLowerCase();
  if (t < T.wishToggleEnd)
    return mix(C.blue, C.wish, easeInOut((t - T.wishAt) / (T.wishToggleEnd - T.wishAt)));
  if (t < T.giveAt) return C.wish.toLowerCase();
  if (t < T.giveToggleEnd)
    return mix(C.wish, C.give, easeInOut((t - T.giveAt) / (T.giveToggleEnd - T.giveAt)));
  return C.give.toLowerCase();
}

/** One toggle piece (ring + stem), exactly as EarSelector builds it. */
function Piece({ pose, colour }: { pose: TrackPose; colour: string }) {
  return (
    <g
      transform={`translate(${pose.x} ${pose.y}) rotate(${pose.deg})`}
      data-testid="first-land-bead"
    >
      <rect
        x={GEO.STEM_FROM - GEO.TRACK_R}
        y={-GEO.STEM_HALF}
        width={GEO.STEM_TO - GEO.STEM_FROM}
        height={GEO.STEM_HALF * 2}
        rx={GEO.STEM_HALF * 0.5}
        fill={colour}
      />
      <circle r={GEO.RING_MID} fill="none" stroke={colour} strokeWidth={GEO.RING_W} />
    </g>
  );
}

/* ---- wrapping inside the middle loop ---- */

type LineKey = "hundred" | "wish" | "give" | "question";
const LINE_KEYS: LineKey[] = ["hundred", "wish", "give", "question"];

/**
 * Fewest lines first; among the splits that fit, the most even. A split fits
 * when every line's corners (half its width, its offset + half the cap height)
 * sit inside the text circle.
 */
function wrapInCircle(
  words: string[],
  widthOf: (s: string) => number,
  R: number,
  step: number,
  capH: number,
) {
  let best: { lines: string[]; over: number } | null = null;
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    let fit: { lines: string[]; widest: number } | null = null;
    const splits = (from: number, left: number): number[][] =>
      left === 1
        ? [[words.length]]
        : Array.from({ length: words.length - from - left + 1 }, (_, k) => from + k + 1).flatMap(
            (cut) => splits(cut, left - 1).map((rest) => [cut, ...rest]),
          );
    for (const cuts of splits(0, n)) {
      const lines = cuts.map((c, i) => words.slice(i ? cuts[i - 1] : 0, c).join(" "));
      let over = 0;
      let widest = 0;
      lines.forEach((line, i) => {
        const w = widthOf(line);
        widest = Math.max(widest, w);
        const d = Math.abs((i - (n - 1) / 2) * step) + capH / 2;
        over = Math.max(over, Math.hypot(w / 2, d) - R);
      });
      if (over <= 0 && (!fit || widest < fit.widest)) fit = { lines, widest };
      if (!best || over < best.over) best = { lines, over };
    }
    if (fit) return fit.lines;
  }
  return best!.lines;
}

/**
 * "communi-" and then the mini G: the real path from g-path.ts in solid red,
 * scaled so its MIDDLE LOOP is the letters' x-height, set so the point where
 * the S-curve joins the lower loop sits on the baseline (level with the foot
 * of the "i"), the lower loop below it like a descender, its ink matched to
 * the letters, 1px after the hyphen.
 */
function Communi({ size, upp, opacity }: { size: number; upp: number; opacity: number }) {
  const ty = FIRST_LAND.type;
  const M = FIRST_LAND.mark;
  const colour = FIRST_LAND.colour.communi;
  const textRef = useRef<SVGTextElement | null>(null);
  const [textW, setTextW] = useState(size * 3.9);
  /* The hyphen's own right side-bearing: "1px after the hyphen" is measured
     from its INK, not from the end of its advance. */
  const [bearing, setBearing] = useState(0);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const w = el.getComputedTextLength();
    if (w > 0) setTextW(w);
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const m = ctx.measureText(FIRST_LAND.copy.communi);
    if (m.width > 0 && m.actualBoundingBoxRight > 0) setBearing(Math.max(0, m.width - m.actualBoundingBoxRight));
  }, [size]);
  const loopU = M.middleLoopPx * upp;
  const strokeU = M.strokePx * upp;
  const RIM = LOOP_RIM_RADIUS.middle;
  /* Outer loop diameter incl. the added outline = loopU; ink = strokeU. */
  const k = (loopU - strokeU) / (2 * RIM - G_STROKE.normal);
  const add = Math.max(0, strokeU - G_STROKE.normal * k);
  const addLocal = add / (k * 0.1);
  const loopLeft = LOOP_CENTRE.middle.x - RIM;
  const markW = (LIVING_G_BOX.width - loopLeft) * k + add;
  const gap = M.gapPx * upp - bearing;
  const left = LOOP_CENTRE.bottom.x - (textW + gap + markW) / 2;
  const baseline = LOOP_CENTRE.bottom.y + (ty.xHeightEm * size) / 2;
  const x0 = left + textW + gap - loopLeft * k + add / 2;
  /* The S-curve's join with the lower loop (its bottom ink edge) sits on the
     baseline, level with the foot of the "i". */
  const y0 = baseline - M.joinBottomUnits * k - add / 2;
  return (
    <g opacity={opacity} data-testid="first-land-communi">
      <text
        ref={textRef}
        x={left}
        y={baseline}
        fill={colour}
        style={{
          fontFamily: ty.family,
          fontWeight: ty.weight.communi,
          fontSize: size,
          letterSpacing: 0,
          whiteSpace: "pre",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {FIRST_LAND.copy.communi}
      </text>
      <g transform={`translate(${x0} ${y0}) scale(${k})`} data-testid="first-land-mark">
        <g transform={LIVING_G_TRANSFORM}>
          <path
            d={LIVING_G_PATH}
            fill={colour}
            stroke={colour}
            strokeWidth={addLocal}
            strokeLinejoin="round"
            paintOrder="stroke fill"
          />
        </g>
        <MiddleLoopClose weight="normal" fill={colour} />
      </g>
    </g>
  );
}

export function FirstLandArt({
  phase,
  startedAt,
  still,
  onSettle,
}: {
  phase: FirstLandPhase;
  /** performance.now() when the ceremony began; null = waiting on its first frame. */
  startedAt: number | null;
  /** Reduced motion: straight to the settled end state. */
  still: boolean;
  /** Beat 4 has settled: hand the toggle back, taps work again. */
  onSettle: () => void;
}) {
  const root = useRef<SVGGElement | null>(null);
  const measure = useRef<SVGTextElement | null>(null);
  const { upp, edges } = useSvgUnits(root);
  const sparks = useMemo(makeSparks, []);
  const [t, setT] = useState(0);
  const settled = useRef(onSettle);
  settled.current = onSettle;

  useEffect(() => {
    if (startedAt === null || still) return;
    let raf = 0;
    let handed = false;
    const step = () => {
      const now = performance.now() - startedAt;
      setT(now);
      if (!handed && now >= T.settle) {
        handed = true;
        settled.current();
      }
      if (now >= T.end) return;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, still]);

  const at = still ? T.end : startedAt === null ? 0 : Math.min(t, T.end);
  const ceremony = phase === "ceremony" && !still;
  const gColour = ceremonyColour(at);

  /* THE TINT, on the Living G's own <svg>, for the ceremony only. */
  useLayoutEffect(() => {
    const svg = root.current?.ownerSVGElement;
    if (!svg) return;
    if (ceremony) svg.style.setProperty("--world-g", gColour);
    else svg.style.removeProperty("--world-g");
  }, [ceremony, gColour]);
  useLayoutEffect(() => {
    const svg = root.current?.ownerSVGElement;
    return () => {
      svg?.style.removeProperty("--world-g");
    };
  }, []);

  const C = FIRST_LAND.colour;
  const TY = FIRST_LAND.type;
  const S = FIRST_LAND.spark;
  const TM = FIRST_LAND.timing;
  const px = (v: number) => v * upp;
  const size = px(TY.sizePx);
  const step = size * TY.lineHeightEm;
  const capH = size * TY.capHeightEm;

  /* ---- the copy, wrapped to fit inside the middle loop ---- */
  const [lines, setLines] = useState<Record<LineKey, string[]>>(() => ({
    hundred: ["here’s 100", "sparks"],
    wish: ["50 to wish"],
    give: ["50 to give"],
    question: ["are you", "a giver?"],
  }));
  useLayoutEffect(() => {
    const el = measure.current;
    if (!el) return;
    const R = px(FIRST_LAND.place.textRadiusPx);
    const next = {} as Record<LineKey, string[]>;
    for (const key of LINE_KEYS) {
      el.style.fontWeight = String(TY.weight[key]);
      const widthOf = (s: string) => {
        el.textContent = s;
        return el.getComputedTextLength();
      };
      next[key] = wrapInCircle(FIRST_LAND.copy[key].split(" "), widthOf, R, step, capH);
    }
    el.textContent = "";
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  /* ---- the beats ---- */
  const op = {
    hundred: beat(at, T.hundredIn, TM.hundred.fadeInMs, T.wishAt, TM.crossfadeMs),
    wish: beat(at, T.wishAt, TM.crossfadeMs, T.giveAt, TM.crossfadeMs),
    give: beat(at, T.giveAt, TM.crossfadeMs, T.questionIn, TM.crossfadeMs),
    question: beat(at, T.questionIn, TM.question.fadeInMs),
  } satisfies Record<LineKey, number>;
  const communi = beat(at, T.communiIn, TM.communi.fadeInMs) * C.communiOpacity;

  /* ---- the sparks ---- */
  const bead = PATH.poseDeg(toggleDeg(at));
  const beadAt = { wish: PATH.poseDeg(DEG.wish), give: PATH.poseDeg(DEG.give) };
  const beadR = GEO.EAR.innerR * S.beadSettleOfInner;
  const noon = PATH.poseDeg(DEG.giver);
  const swirlR = INNER_R - px(S.swirlInsetPx);
  const omega = (2 * Math.PI) / S.lapMs;
  const fallMs = TM.fall.ms - TM.fall.staggerMs;
  const dotR = px(S.dotPx / 2);
  const haloR = dotR + px(S.haloPx);
  const streamAt = { wish: T.wishStream, give: T.giveStream };
  const poofAt = { wish: T.wishPoof, give: T.givePoof };
  const destColour = { wish: C.wish, give: C.give };

  const swirlAngle = (s: Spark, time: number) => {
    const tau = time - (s.delay + fallMs);
    return -Math.PI / 2 + omega * tau + s.phi * easeInOut(clamp01(tau / S.pourSpreadMs));
  };
  const swirlPos = (s: Spark, time: number) => {
    const a = swirlAngle(s, time);
    const r = swirlR + px(S.swirlScatterPx) * s.rj;
    return { x: MID.x + Math.cos(a) * r, y: MID.y + Math.sin(a) * r, a };
  };
  /** Nearest to the bead leaves first. */
  const departure = (s: Spark) => {
    const beadA = (DEG[s.to] * Math.PI) / 180;
    const a = swirlAngle(s, streamAt[s.to]);
    const d = Math.abs(Math.atan2(Math.sin(a - beadA), Math.cos(a - beadA)));
    return streamAt[s.to] + (d / Math.PI) * TM.stream.staggerMs;
  };

  type Dot = { x: number; y: number; colour: string; o: number; r: number; h: number };
  const dots: Dot[] = [];
  if (at < T.givePoofEnd) {
    for (const s of sparks) {
      const land = s.delay + fallMs;
      if (at < s.delay) continue;
      if (at < land) {
        /* THE FALL: from the top of the screen, through the 12:00 hole. */
        const u = (at - s.delay) / fallMs;
        const v = u * u;
        const entryY = MID.y - swirlR;
        const x0 = noon.x + s.fx * GEO.EAR.innerR * S.fallSpreadOfInner;
        const x1 = MID.x + s.fx * GEO.EAR.innerR * S.fallSpreadOfInner * 0.35;
        dots.push({
          x: lerp(x0, x1, v),
          y: lerp(edges.top - px(10), entryY, v),
          colour: C.blue,
          o: 1,
          r: dotR,
          h: haloR,
        });
        continue;
      }
      const leave = departure(s);
      if (at < leave) {
        const p = swirlPos(s, at);
        dots.push({
          x: p.x,
          y: p.y,
          colour: C.blue,
          o: 0.85 + 0.15 * Math.cos(at / 300 + s.twinkle),
          r: dotR,
          h: haloR,
        });
        continue;
      }
      /* THE STREAM: peel off the swirl into the bead, turning colour. */
      const b = beadAt[s.to];
      const rest = { x: b.x + s.bx * beadR, y: b.y + s.by * beadR };
      const u = clamp01((at - leave) / TM.stream.ms);
      const poof = clamp01((at - poofAt[s.to]) / TM.poofMs);
      if (poof >= 1) continue;
      if (u < 1) {
        const p0 = swirlPos(s, leave);
        const dist = Math.hypot(rest.x - p0.x, rest.y - p0.y);
        const c = {
          x: p0.x - Math.sin(p0.a) * dist * 0.35,
          y: p0.y + Math.cos(p0.a) * dist * 0.35,
        };
        const v = easeInOut(u);
        const q = (a: number, m: number, z: number) =>
          (1 - v) ** 2 * a + 2 * (1 - v) * v * m + v * v * z;
        dots.push({
          x: q(p0.x, c.x, rest.x),
          y: q(p0.y, c.y, rest.y),
          colour: mix(C.blue, destColour[s.to], u),
          o: 1,
          r: dotR,
          h: haloR,
        });
        continue;
      }
      /* RESTING in the bead, a slow drift; then THE POOF: ×1.3, fading. */
      const g = (at - leave) / 1000;
      const k = lerp(1, S.poofScale, easeOut(poof));
      const x = rest.x + Math.cos(g * 1.4 + s.twinkle) * px(1);
      const y = rest.y + Math.sin(g * 1.2 + s.twinkle) * px(1);
      dots.push({
        x: b.x + (x - b.x) * k,
        y: b.y + (y - b.y) * k,
        colour: destColour[s.to],
        o: 1 - poof,
        r: dotR * k,
        h: haloR * k,
      });
    }
  }

  const textStyle = (weight: number): React.CSSProperties => ({
    fontFamily: TY.family,
    fontWeight: weight,
    fontSize: size,
    letterSpacing: 0,
    textTransform: "lowercase",
    whiteSpace: "pre",
    WebkitFontSmoothing: "antialiased",
  });
  const lineColour: Record<LineKey, string> = {
    hundred: C.ink,
    wish: C.wish,
    give: C.give,
    question: C.ink,
  };

  return (
    <g
      ref={root}
      pointerEvents="none"
      aria-hidden="true"
      data-testid="first-land-art"
      data-phase={phase}
      data-t={Math.round(at)}
      data-g={gColour}
    >
      <defs>
        <filter id="fl-halo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={px(S.haloPx) / 2.5} />
        </filter>
      </defs>
      {/* the hidden ruler the wrapping measures with */}
      <text ref={measure} opacity={0} style={textStyle(400)} />

      {/* THE ONE TOGGLE, while the ceremony has it. */}
      {ceremony ? <Piece pose={bead} colour={gColour} /> : null}

      {dots.length ? (
        <g data-testid="first-land-sparks" data-count={dots.length}>
          <g filter="url(#fl-halo)" opacity={S.haloOpacity}>
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.h} fill={d.colour} opacity={d.o} />
            ))}
          </g>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.colour} opacity={d.o} />
          ))}
        </g>
      ) : null}

      {/* ---- THE COPY: centred in the middle loop ---- */}
      {LINE_KEYS.map((key) =>
        op[key] > 0 ? (
          <text
            key={key}
            textAnchor="middle"
            fill={lineColour[key]}
            opacity={op[key]}
            style={textStyle(TY.weight[key])}
            data-testid={`first-land-${key}`}
            data-lines={lines[key].length}
          >
            {lines[key].map((line, i) => (
              <tspan
                key={i}
                x={MID.x}
                y={MID.y + (i - (lines[key].length - 1) / 2) * step + capH / 2}
              >
                {line}
              </tspan>
            ))}
          </text>
        ) : null,
      )}
      {communi > 0 ? <Communi size={size} upp={upp} opacity={communi} /> : null}
    </g>
  );
}

/**
 * THE CATCH: a clear layer over everything while the ceremony runs. Every
 * tap is swallowed and does nothing until beat 4 settles; then it is gone.
 */
export function FirstLandCatch({ active }: { active: boolean }) {
  if (!active) return null;
  const swallow = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div
      data-testid="first-land-catch"
      className="absolute inset-0 z-[65]"
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
      onPointerDown={swallow}
      onPointerUp={swallow}
      onClick={swallow}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
      }}
    />
  );
}

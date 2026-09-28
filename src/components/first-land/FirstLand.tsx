import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import {
  LIVING_G_BOX,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
} from "@/components/living-g/g-path";
import { G_STROKE, gBottom } from "@/components/living-g/g-weight";
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import { togglePath, type TrackPose } from "@/components/living-g/toggle-path";
import { toggleGeometry } from "@/components/living-g/EarSelector";
import { FIRST_LAND, firstLandTimeline } from "./first-land-config";
import { useSvgUnits } from "./use-svg-units";

/**
 * GIVER: FIRST LAND — the one moment on the account's first land.
 *
 *   1. 100 sparks drop from the top of the screen into My G at 12:00.
 *      "here's a hundred sparks."
 *   2. They split: 50 to the give toggle (1:30), 50 to the wish toggle
 *      (10:30). "50 sparks to give" / "50 sparks to wish". My G is empty.
 *   3. For this moment only, the sparks glow in the toggles' negative space:
 *      green in give, purple in wish.
 *   4. "your sparks live in my wishes."
 *   5. the middle loop: "are you a giver?" (it stays)
 *   6. the bottom loop: "communi-" + the living G, in and out.
 *   7. free.
 *
 * Drawn INSIDE the Living G's own <svg> (World's overlay), in the G's units,
 * so every spark and line is placed by the same geometry the toggle uses.
 * Every value lives in first-land-config.ts. Pointer-transparent: taps are
 * caught by <FirstLandCatch>, never by this art.
 */

export type FirstLandPhase = "moment" | "free";

const T = firstLandTimeline();
const W = "middle" as const;
const GEO = toggleGeometry(W);
const PATH = togglePath(W);
const DEG = { giver: -90, give: -45, wish: -135 } as const;
const POSE: Record<keyof typeof DEG, TrackPose> = {
  giver: PATH.poseDeg(DEG.giver),
  give: PATH.poseDeg(DEG.give),
  wish: PATH.poseDeg(DEG.wish),
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const easeIn = (u: number) => u * u * u;
const easeOut = (u: number) => 1 - (1 - u) ** 3;
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/** Opacity of a beat that fades in at `a` over `fin`, and out at `b` over `fout`. */
function beat(t: number, a: number, fin: number, b = Infinity, fout = 1) {
  if (t < a) return 0;
  if (t < a + fin) return (t - a) / fin;
  if (t < b) return 1;
  return clamp01(1 - (t - b) / fout);
}

/** #rrggbb blend. */
function mix(a: string, b: string, u: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i]!, u))).join(",")})`;
}

/** A small deterministic random, so the cluster is the same every time. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Spark = {
  /** Fall start, as an offset from My G's centre (px, scaled at draw). */
  fx: number;
  fy: number;
  delay: number;
  /** Landing spot inside My G, as a share of the hole's radius. */
  lx: number;
  ly: number;
  /** Destination spot inside its toggle (share of the hole's radius). */
  dx: number;
  dy: number;
  to: "give" | "wish";
  lag: number;
  twinkle: number;
};

function makeSparks(): Spark[] {
  const r = seeded(20260928);
  const disc = () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    return [Math.cos(a) * d, Math.sin(a) * d] as const;
  };
  const S = FIRST_LAND.spark;
  return Array.from({ length: S.count }, (_, i) => {
    const [lx, ly] = disc();
    const [dx, dy] = disc();
    const [cx, cy] = disc();
    return {
      fx: cx * S.clusterSpreadPx,
      fy: cy * S.clusterSpreadPx - r() * S.clusterSpreadPx,
      delay: r() * S.staggerMs,
      lx,
      ly,
      dx,
      dy,
      /* Interleaved, so each half leaves from all over My G. */
      to: i % 2 === 0 ? "give" : "wish",
      lag: r() * 140,
      twinkle: r() * Math.PI * 2,
    };
  });
}

/** One toggle piece (ring + stem), exactly as EarSelector builds it, parked. */
function Piece({ pose, colour, opacity }: { pose: TrackPose; colour: string; opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.deg})`} opacity={opacity}>
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

/**
 * "communi-" and then the living G itself: the real path from g-path.ts,
 * shrunk to the letters' height, sitting on their baseline, its ink weight
 * matched to the letters' strokes by a computed outline.
 */
function Communi({
  x,
  y,
  size,
  upp,
  opacity,
}: {
  x: number;
  y: number;
  size: number;
  upp: number;
  opacity: number;
}) {
  const L = FIRST_LAND.logo;
  const ty = FIRST_LAND.type;
  const textRef = useRef<SVGTextElement | null>(null);
  const [textW, setTextW] = useState(size * 4.1);
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const w = el.getComputedTextLength();
    if (w > 0) setTextW(w);
  }, [size]);
  const h = L.heightEm * size;
  const k = h / LIVING_G_BOX.height;
  const logoW = LIVING_G_BOX.width * k;
  const gap = L.gapEm * size;
  const left = x - (textW + gap + logoW) / 2;
  /* The words are centred optically on their x-height. */
  const baseline = y + (ty.xHeightEm * size) / 2;
  /* Ink weight: the path's own stroke at this scale, topped up to the stem. */
  const pxPerUnit = 1 / upp;
  const ownPx = G_STROKE.normal * k * pxPerUnit;
  const stemPx = L.stemEm * (size * pxPerUnit);
  const addPx = Math.max(0, stemPx - ownPx);
  /* Local units: the path is drawn at scale k × 0.1 (LIVING_G_TRANSFORM). */
  const addLocal = addPx / (k * 0.1 * pxPerUnit);
  const colour = FIRST_LAND.colour.ink;
  return (
    <g opacity={opacity} data-testid="first-land-communi">
      <text
        ref={textRef}
        x={left}
        y={baseline}
        fill={colour}
        style={{
          fontFamily: ty.family,
          fontWeight: ty.regular.weight,
          fontSize: size,
          letterSpacing: 0,
          whiteSpace: "pre",
        }}
      >
        {FIRST_LAND.copy.communi}
      </text>
      <g
        transform={`translate(${left + textW + gap} ${L.onBaseline ? baseline - h : y - h / 2}) scale(${k})`}
        data-testid="first-land-g"
      >
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

/** Seen once the moment has handed over: the question alone, calm. */
export function FirstLandArt({
  phase,
  startedAt,
  onEnd,
}: {
  phase: FirstLandPhase;
  /** performance.now() when the moment began. */
  startedAt: number;
  /** The moment ran its course: hand over to "free". */
  onEnd: () => void;
}) {
  const root = useRef<SVGGElement | null>(null);
  const { upp, edges } = useSvgUnits(root);
  const sparks = useMemo(makeSparks, []);
  const [t, setT] = useState(0);
  const ended = useRef(onEnd);
  ended.current = onEnd;

  useEffect(() => {
    if (phase !== "moment") return;
    let raf = 0;
    const step = () => {
      const now = performance.now() - startedAt;
      setT(now);
      if (now >= T.end) {
        ended.current();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, startedAt]);

  const C = FIRST_LAND.colour;
  const TY = FIRST_LAND.type;
  const S = FIRST_LAND.spark;
  const TM = FIRST_LAND.timing;
  const P = FIRST_LAND.place;
  const px = (v: number) => v * upp;
  const size = px(TY.regular.sizePx);
  const inner = GEO.EAR.innerR;
  const outer = GEO.EAR.outerR;
  const moment = phase === "moment";
  const at = moment ? t : T.end;

  const textStyle = (weight: number): React.CSSProperties => ({
    fontFamily: TY.family,
    fontWeight: weight,
    fontSize: size,
    letterSpacing: 0,
    textTransform: "lowercase",
    whiteSpace: "pre",
    WebkitFontSmoothing: "antialiased",
  });

  /* ---- where things sit ---- */
  const noon = POSE.giver;
  const give = POSE.give;
  const wish = POSE.wish;
  const dropLineY = (edges.top + (noon.y - outer)) / 2;
  const sideY = give.y - outer - px(P.sideLabel.gapAbovePx);
  const closingY = (gBottom(W) + edges.bottom) / 2;
  const mid = LOOP_CENTRE.middle;
  const words = FIRST_LAND.copy.question.split(" ");
  const cut = P.question.breakAfterWords;
  const questionLines =
    cut > 0 && cut < words.length
      ? [words.slice(0, cut).join(" "), words.slice(cut).join(" ")]
      : [FIRST_LAND.copy.question];
  const lineStep = size * P.question.lineHeightEm;
  const bottom = LOOP_CENTRE.bottom;

  /* ---- beats ---- */
  const dropLine = beat(
    at,
    T.dropLineIn,
    TM.dropLine.fadeInMs,
    T.dropLineOut,
    TM.dropLine.fadeOutMs,
  );
  /* The lines arrive with the sparks, once My G's ring has cleared. */
  const sides = beat(at, T.splitEnd + TM.ringsFadeMs / 2, 400, T.glowEnd, TM.glow.fadeMs);
  const closing = beat(at, T.closingIn, TM.closing.fadeInMs, T.closingOut, TM.closing.fadeOutMs);
  const question = moment ? beat(at, T.questionIn, TM.question.fadeInMs) : 1;
  const communi = moment
    ? beat(at, T.communiIn, TM.communi.fadeInMs, T.communiOut, TM.communi.fadeOutMs)
    : 0;
  const noonRing = moment ? beat(at, 0, TM.ringsFadeMs, T.splitEnd, TM.ringsFadeMs) : 0;
  const wishRing = moment
    ? beat(at, T.splitAt - TM.ringsFadeMs, TM.ringsFadeMs, T.closingOut, TM.ringsFadeMs)
    : 0;
  const glow = moment ? beat(at, T.splitEnd - 200, 500, T.glowEnd, TM.glow.fadeMs) : 0;
  const bank = moment ? beat(at, T.glowEnd, 400, T.closingOut, TM.ringsFadeMs) : 0;

  /* ---- the sparks ---- */
  const dotR = px(S.dotPx / 2);
  const haloR = dotR + px(S.haloPx);
  const fallMs = TM.drop.ms - S.staggerMs;
  const settle = inner * S.settleOfInner;
  const sparkDots =
    moment && at < T.glowEnd + TM.glow.fadeMs
      ? sparks.map((s, i) => {
          let x: number;
          let y: number;
          let colour: string = C.falling;
          let o = 1;
          const landX = noon.x + s.lx * settle;
          const landY = noon.y + s.ly * settle;
          if (at < T.splitAt) {
            /* THE DROP: ease-in from above the screen, a soft settle in My G. */
            const u = clamp01((at - s.delay) / fallMs);
            const startX = noon.x + px(s.fx);
            const startY = edges.top - px(12) + px(s.fy);
            const over = px(S.settleOvershootPx);
            if (u < 0.82) {
              const v = easeIn(u / 0.82);
              x = lerp(startX, landX, v);
              y = lerp(startY, landY + over, v);
            } else {
              const v = easeOut((u - 0.82) / 0.18);
              x = landX;
              y = lerp(landY + over, landY, v);
            }
            if (u >= 1) o = 0.82 + 0.18 * Math.cos(at / 380 + s.twinkle);
          } else {
            /* THE SPLIT: along the toggle's own orbit, 12:00 → 1:30 / 10:30. */
            const u = easeInOut(clamp01((at - T.splitAt - s.lag) / (TM.split.ms - 140)));
            const deg = lerp(DEG.giver, DEG[s.to], u);
            const c = PATH.poseDeg(deg);
            const ox = lerp(s.lx, s.dx, u) * settle;
            const oy = lerp(s.ly, s.dy, u) * settle;
            x = c.x + ox;
            y = c.y + oy;
            colour = mix(C.falling, s.to === "give" ? C.give : C.wish, u);
            if (at > T.splitEnd) {
              /* THE GLOW: a slow drift inside the negative space, then absorbed. */
              const g = (at - T.splitEnd) / 1000;
              x += Math.cos(g * 1.3 + s.twinkle) * px(1.2);
              y += Math.sin(g * 1.1 + s.twinkle) * px(1.2);
              o = beat(at, 0, 1, T.glowEnd, TM.glow.fadeMs);
            }
          }
          return (
            <g key={i} opacity={o}>
              <circle
                cx={x}
                cy={y}
                r={haloR}
                fill={colour}
                opacity={S.haloOpacity}
                filter="url(#fl-soft)"
              />
              <circle cx={x} cy={y} r={dotR} fill={colour} />
            </g>
          );
        })
      : null;

  return (
    <g
      ref={root}
      pointerEvents="none"
      aria-hidden="true"
      data-testid="first-land-art"
      data-phase={phase}
      data-t={Math.round(at)}
    >
      <defs>
        <filter id="fl-soft" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={px(S.haloPx) / 2.2} />
        </filter>
        <radialGradient id="fl-glow-give">
          <stop offset="0%" stopColor={C.give} stopOpacity={S.glowFillOpacity} />
          <stop offset="100%" stopColor={C.give} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="fl-glow-wish">
          <stop offset="0%" stopColor={C.wish} stopOpacity={S.glowFillOpacity} />
          <stop offset="100%" stopColor={C.wish} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* My G at 12:00 and the wish toggle at 10:30, for this moment only. */}
      <Piece pose={noon} colour={C.letter} opacity={noonRing} />
      <Piece pose={wish} colour={C.letter} opacity={wishRing} />

      {/* THE GLOW in each toggle's negative space. */}
      {glow > 0 ? (
        <g opacity={glow} data-testid="first-land-glow">
          <circle cx={give.x} cy={give.y} r={inner} fill="url(#fl-glow-give)" />
          <circle cx={wish.x} cy={wish.y} r={inner} fill="url(#fl-glow-wish)" />
        </g>
      ) : null}

      {sparkDots}

      {/* THE WISH BANK, settled: 50, in wish purple, inside the wish toggle. */}
      {bank > 0 ? (
        <text
          x={wish.x}
          y={wish.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={C.wish}
          opacity={bank}
          style={textStyle(TY.strong.weight)}
        >
          50
        </text>
      ) : null}

      {/* ---- THE LINES (black: giver speaking) ---- */}
      {dropLine > 0 ? (
        <text
          x={mid.x}
          y={dropLineY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={C.ink}
          opacity={dropLine}
          style={textStyle(TY.strong.weight)}
          data-testid="first-land-drop"
        >
          {FIRST_LAND.copy.drop}
        </text>
      ) : null}
      {sides > 0 ? (
        <g opacity={sides} data-testid="first-land-split">
          <text
            x={edges.right - px(P.sideLabel.edgeMarginPx)}
            y={sideY}
            textAnchor="end"
            fill={C.ink}
            style={textStyle(TY.regular.weight)}
          >
            {FIRST_LAND.copy.give}
          </text>
          <text
            x={edges.left + px(P.sideLabel.edgeMarginPx)}
            y={sideY}
            textAnchor="start"
            fill={C.ink}
            style={textStyle(TY.regular.weight)}
          >
            {FIRST_LAND.copy.wish}
          </text>
        </g>
      ) : null}
      {closing > 0 ? (
        <text
          x={mid.x}
          y={closingY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={C.ink}
          opacity={closing}
          style={textStyle(TY.regular.weight)}
          data-testid="first-land-closing"
        >
          {FIRST_LAND.copy.closing}
        </text>
      ) : null}
      <text
        x={mid.x}
        y={mid.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={C.ink}
        opacity={question}
        style={{
          ...textStyle(TY.regular.weight),
          transition: moment ? undefined : `opacity ${TM.question.fadeInMs}ms ease`,
        }}
        data-testid="first-land-question"
      >
        {questionLines.map((line, i) => (
          <tspan
            key={i}
            x={mid.x}
            dy={i === 0 ? -((questionLines.length - 1) * lineStep) / 2 : lineStep}
          >
            {line}
          </tspan>
        ))}
      </text>
      {communi > 0 ? (
        <Communi x={bottom.x} y={bottom.y} size={size} upp={upp} opacity={communi} />
      ) : null}
    </g>
  );
}

/**
 * THE CATCH: a clear layer over everything while the moment plays. A tap
 * anywhere skips to the end, and that tap is swallowed — the layer stays a
 * beat longer so its pointerup / click never reach the G beneath.
 */
export function FirstLandCatch({ active, onSkip }: { active: boolean; onSkip: () => void }) {
  const [skipped, setSkipped] = useState(false);
  const [gone, setGone] = useState(false);
  const skip = useRef(onSkip);
  skip.current = onSkip;
  const swallow = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  useEffect(() => {
    if (!skipped) return;
    const id = window.setTimeout(() => setGone(true), FIRST_LAND.timing.swallowAfterSkipMs);
    return () => window.clearTimeout(id);
  }, [skipped]);
  if (gone || (!active && !skipped)) return null;
  return (
    <div
      data-testid="first-land-catch"
      className="absolute inset-0 z-[65]"
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
      onPointerDown={(e) => {
        swallow(e);
        if (skipped) return;
        setSkipped(true);
        skip.current();
      }}
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

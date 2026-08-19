import { useEffect, useRef, useState } from "react";
import { buzz } from "@/lib/haptics";
import { EAR_GEOMETRY, LOOP_CENTRE, LOOP_RIM_RADIUS, LOOP_SAFE_RADIUS } from "./g-path";
import { LOOP_ROLE_STYLE } from "./type-scale";

/**
 * MODE = WHERE THE SELECTOR SITS ON THE MIDDLE LOOP.
 *
 * ONE SMALL PHYSICAL PIECE CLIPPED TO THE RIM. The piece is AUTHORED geometry —
 * one ring (the circular end) plus one stem — built in local coordinates on a
 * single radial axis: the stem's root sits on the middle loop's measured rim,
 * the stem runs outward, the ring sits just beyond it. The two can never drift
 * apart, because they are defined relative to the same axis and placed by ONE
 * rotation about ONE centre with ONE angle.
 *
 * The canonical Living G is NEVER rotated, copied, deformed or cut at the
 * selector's live position. Its original ear is removed once by a tight static
 * cut in <LivingG> (see EAR_GEOMETRY), so the rim underneath stays a perfectly
 * smooth curve in every mode.
 *
 * TWO MIRRORED PAIRS:
 *   wish   ~10 o'clock  <->  give  ~2 o'clock  (canonical home)
 *   borrow ~8 o'clock   <->  trade ~4 o'clock
 *
 * The S-curve is never a mode destination.
 */

export const MODES = ["wish", "give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

/**
 * THE FIFTH SEAT: GIVER = ME. It sits at 12 o'clock, dead above the middle
 * loop's centre — the profile state, not another activity category. Screens
 * that only speak activity (other people's Gs) keep the four-seat track.
 */
export const SEATS = ["giver", "wish", "give", "trade", "borrow"] as const;
export type Seat = (typeof SEATS)[number];


type P = { x: number; y: number };

/** THE ONE TRACK — the middle loop's measured centre and outer rim. */
const TRACK_C: P = LOOP_CENTRE.middle;
const RIM_R = LOOP_RIM_RADIUS.middle;

/**
 * THE ONE RADIUS, derived from the rim — never from where the ear happens to
 * live in the artwork: rim + gap + the ring's own radius.
 */
const TRACK_R = RIM_R + EAR_GEOMETRY.gap + EAR_GEOMETRY.outerR;

/** The ring, in the assembly's local terms. */
const RING_MID = (EAR_GEOMETRY.innerR + EAR_GEOMETRY.outerR) / 2;
const RING_W = EAR_GEOMETRY.outerR - EAR_GEOMETRY.innerR;

/**
 * The stem: root tucked just UNDER the rim so the join is seamless at every
 * angle, tip buried in the ring's stroke so the two read as one solid piece.
 */
const STEM_FROM = RIM_R - 8;
const STEM_TO = TRACK_R - EAR_GEOMETRY.innerR - 6;
const STEM_HALF = EAR_GEOMETRY.stemWidth / 2;

/** Angles are measured in SVG space (0 = 3 o'clock, negative = upward). */
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Four seats on the one track. TWO MIRRORED PAIRS, and the track is CONTINUOUS:
 * there is no forbidden arc, so every seat can be reached by dragging either
 * way around the loop.
 */
const SEAT_ANGLE: Record<Seat, number> = {
  // ME — dead centre above the middle loop, between wish and give.
  giver: rad(-90), // 12 o'clock
  // UPPER PAIR — mirrored about the vertical axis through the loop's centre.
  wish: rad(-136), // ~10 o'clock
  give: rad(-44), // ~2 o'clock (canonical home)
  // LOWER PAIR — the same mirror, below the centre line.
  trade: rad(30), // ~4 o'clock
  borrow: rad(150), // ~8 o'clock
};


const TAU = Math.PI * 2;

/** Shortest signed distance from `a` to `b` on the circle: never a 358° jump. */
const shortest = (a: number, b: number) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

/**
 * WRAP-AWARE UNWRAP: express `next` as the value nearest `ref` on the
 * continuous line, so crossing +179° -> -179° reads as a 2° move.
 */
const unwrap = (ref: number, next: number) => ref + shortest(ref, next);

/** How near a seat (in radians of travel) counts as captured. */
const CAPTURE = 0.34;

/** A point on the track at a given angle, at any radius. */
const at = (angle: number, r: number): P => ({
  x: TRACK_C.x + r * Math.cos(angle),
  y: TRACK_C.y + r * Math.sin(angle),
});

/** Nearest seat measured AROUND the circle, so the ±180° seam is not a wall. */
function nearestOf(angle: number, seats: readonly Seat[]): Seat {
  let best: Seat = seats[0]!;
  let bestD = Infinity;
  for (const m of seats) {
    const d = Math.abs(shortest(angle, SEAT_ANGLE[m]));
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}


const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

/** The captured word lives in the piece's own negative space. */
const WORD_SIZE = Math.round(LOOP_SAFE_RADIUS.top * 0.5);

/** The locked seat colours, for seats that state a person's history. */
const MODE_COLOUR: Record<Seat, string> = {
  giver: "var(--giver-me)",
  wish: "var(--mode-wish)",
  give: "var(--mode-give)",
  trade: "var(--mode-trade)",
  borrow: "var(--mode-borrow)",
};


export function EarSelector({
  mode,
  onChange,
  onTap,
  locked = false,
  photo,
  history,
  seats = MODES,
  word,
  badge,
  sparks,

}: {
  mode: Seat;
  onChange: (next: Seat) => void;
  /** A simple tap on the piece opens the profile; a drag changes mode. */
  onTap?: () => void;
  /** True on a person's screen: the seat STATES their interaction type. */
  locked?: boolean;
  /** A face riding the selector, inside the ring's own negative space. */
  photo?: string;
  /** The modes this person has taken part in, told by the seats themselves. */
  history?: Seat[];
  /** Which seats this track offers. My own G offers all five (giver = me). */
  seats?: readonly Seat[];
  /** What the piece SAYS at rest, when the seat's own name is not the word. */
  word?: string;
  /**
   * PAST CONNECTIONS. A quiet count riding just outside the photo: proof that
   * completed gives, granted wishes, trades and borrows sit behind this person.
   * Never a list — the profile page tells those stories.
   */
  badge?: number;
  /**
   * MY SPARKS, AND ONLY EVER MINE. Sparks are private: this is passed on MY OWN
   * Living G and never on anybody else's. It rides ALONGSIDE the top profile
   * loop — clear of the photo, the stroke, the username and the selector's own
   * travel — so it reads as part of my identity, not as a dashboard widget.
   */
  sparks?: number;



}) {


  const [drag, setDrag] = useState<number | null>(null);
  const dragging = drag !== null;
  const last = useRef<Seat>(mode);
  /** Tap vs drag: where the gesture started, and whether it ever travelled. */
  const gesture = useRef<{ start: P; moved: boolean } | null>(null);
  /** The gesture's CONTINUOUS angle, so the ±180° seam is never a wall. */
  const dragRef = useRef<number | null>(null);

  /**
   * MY SPARKS ARE NEVER ON DISPLAY. A deliberate press and hold on MY OWN top
   * loop breathes the balance into the negative space beside it; the instant my
   * finger lifts it is gone again, and the hold does NOT open the profile.
   */
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const startPeek = () => {
    if (sparks === undefined) return;
    held.current = false;
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => {
      held.current = true;
      buzz(8);
      setPeek(true);
    }, 380);
  };
  const stopPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeek(false);
  };
  useEffect(() => () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
  }, []);

  /** ONE SOURCE OF TRUTH: the assembly's angle on the track. */
  const restAngle = SEAT_ANGLE[mode];

  const [angle, setAngle] = useState(restAngle);
  const angleRef = useRef(angle);

  // Rest and magnet targets are always the nearest equivalent angle AROUND the
  // circle, so settling takes the short way and never spins the long way.
  let target = unwrap(angleRef.current, restAngle);
  if (drag !== null) {
    const seat = unwrap(drag, SEAT_ANGLE[nearestOf(drag, seats)]);

    const pull = Math.max(0, 1 - Math.abs(seat - drag) / CAPTURE) * 0.55;
    target = drag + (seat - drag) * pull;
  }


  const targetRef = useRef(target);
  targetRef.current = target;
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (dragging) {
      angleRef.current = targetRef.current;
      setAngle(targetRef.current);
      return;
    }
    const step = () => {
      const t = targetRef.current;
      const next = angleRef.current + (t - angleRef.current) * 0.22;
      if (Math.abs(t - next) < 0.0015) {
        angleRef.current = t;
        setAngle(t);
        raf.current = null;
        return;
      }
      angleRef.current = next;
      setAngle(next);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [dragging, mode, target]);

  const deg = (angle * 180) / Math.PI;
  /** Where the ring actually is right now — text and hit area follow it. */
  const ear = at(angle, TRACK_R);

  const angleFrom = (e: React.PointerEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const local = p.matrixTransform(ctm.inverse());
    const raw = Math.atan2(local.y - TRACK_C.y, local.x - TRACK_C.x);
    return {
      point: { x: local.x, y: local.y } as P,
      // FINGER FREE, SELECTOR RAILED: only the angle is taken from the finger —
      // and it is UNWRAPPED against the gesture's own continuous angle, so the
      // ±180° seam is a 1° step, never a wall and never a 358° jump.
      angle: unwrap(dragRef.current ?? angleRef.current, raw),
    };
  };


  const commit = (next: Seat) => {
    if (next !== last.current) {
      last.current = next;
      buzz(10);
      onChange(next);
    }
  };

  /** On arrival the word speaks up, then settles back into a restrained state. */
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setReveal(true);
    const t = setTimeout(() => setReveal(false), 1400);
    return () => clearTimeout(t);
  }, [mode]);

  const end = () => {
    const g = gesture.current;
    if (drag !== null && g?.moved) commit(nearestOf(drag, seats));
    else if (g && !g.moved) onTap?.();
    gesture.current = null;
    dragRef.current = null;
    setDrag(null);
  };

  /** Seats in travel order, so the keyboard walks the track, not the array. */
  const ring = [...seats].sort((a, b) => SEAT_ANGLE[a] - SEAT_ANGLE[b]);

  return (
    <g>
      {/* Subtle destination hints, seated on the track itself. Never a drawn ring. */}
      {seats.map((m) => {

        const hint = at(SEAT_ANGLE[m], RIM_R + 16);
        const active = mode === m && !dragging;
        // On a person's screen the seats TELL THEIR STORY: a seat they have
        // taken part in reads in that mode's own colour, a little stronger.
        const told = history?.includes(m) ?? false;
        return (
          <circle
            key={m}
            cx={hint.x}
            cy={hint.y}
            r={told ? 8 : 5}
            fill={told ? MODE_COLOUR[m] : "var(--world-g)"}
            pointerEvents="none"
            style={{
              opacity:
                active || Math.abs(shortest(angle, SEAT_ANGLE[m])) < 0.22
                  ? 0
                  : told
                    ? 0.85
                    : 0.22,

              transition: "opacity 200ms ease-out",
            }}
          />
        );
      })}


      {/*
        THE WORD "GIVER" LIVES UNDERNEATH THE TOGGLE — one element, one place,
        seated at the 12 o'clock giver position. It is painted BEFORE the
        assembly, so when the toggle arrives there it physically covers it.
        Nothing moves, fades or duplicates: the layering does the work.
      */}
      {seats.includes("giver") ? (
        <text
          x={at(SEAT_ANGLE.giver, TRACK_R).x}
          y={at(SEAT_ANGLE.giver, TRACK_R).y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--world-ink)"
          className="font-black lowercase"
          pointerEvents="none"
          style={{
            fontSize: WORD_SIZE,
            letterSpacing: LOOP_ROLE_STYLE.action.tracking,
            opacity: 0.6,
          }}
        >
          giver
        </text>
      ) : null}

      {/*
        THE ONE RIGID ASSEMBLY. Authored on the +x radial axis in local terms,
        then placed by a single rotation about the track centre. Stem root under
        the rim, ring beyond it, distance between them fixed by construction.
        The solid disc makes the piece PHYSICAL: whatever it sits on is hidden.
      */}
      <g
        transform={`rotate(${deg} ${TRACK_C.x} ${TRACK_C.y})`}
        pointerEvents="none"
      >
        <circle
          cx={TRACK_C.x + TRACK_R}
          cy={TRACK_C.y}
          r={EAR_GEOMETRY.outerR}
          fill="var(--world-bg)"
        />
        <rect
          x={TRACK_C.x + STEM_FROM}
          y={TRACK_C.y - STEM_HALF}
          width={STEM_TO - STEM_FROM}
          height={STEM_HALF * 2}
          rx={STEM_HALF * 0.5}
          fill="var(--world-g)"
        />
        <circle
          cx={TRACK_C.x + TRACK_R}
          cy={TRACK_C.y}
          r={RING_MID}
          fill="none"
          stroke="var(--world-g)"
          strokeWidth={RING_W}
        />
      </g>


      {photo ? (
        <>
          <defs>
            <clipPath id={`ear-photo-${mode}`} clipPathUnits="userSpaceOnUse">
              <circle cx={ear.x} cy={ear.y} r={EAR_GEOMETRY.innerR - 3} />
            </clipPath>
          </defs>
          <image
            href={photo}
            x={ear.x - (EAR_GEOMETRY.innerR - 3)}
            y={ear.y - (EAR_GEOMETRY.innerR - 3)}
            width={(EAR_GEOMETRY.innerR - 3) * 2}
            height={(EAR_GEOMETRY.innerR - 3) * 2}
            clipPath={`url(#ear-photo-${mode})`}
            preserveAspectRatio="xMidYMid slice"
            pointerEvents="none"
          />
        </>
      ) : null}

      {/* PAST CONNECTIONS — one quiet number tucked beside the face. */}
      {badge ? (
        <g pointerEvents="none" opacity={dragging ? 0 : 0.95} style={{ transition: "opacity 180ms ease-out" }}>
          <circle
            cx={ear.x + EAR_GEOMETRY.innerR * 0.82}
            cy={ear.y + EAR_GEOMETRY.innerR * 0.82}
            r={EAR_GEOMETRY.innerR * 0.42}
            fill="var(--world-g)"
          />
          <text
            x={ear.x + EAR_GEOMETRY.innerR * 0.82}
            y={ear.y + EAR_GEOMETRY.innerR * 0.82}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--world-bg)"
            className="font-black"
            style={{ fontSize: EAR_GEOMETRY.innerR * 0.44, letterSpacing: "-0.04em" }}
          >
            {badge}
          </text>
        </g>
      ) : null}

      {/*
        MY SPARKS — part of my identity, sitting BESIDE my own profile loop.
        Placed on the tangent to the selector's track, so it travels with the
        piece and can never land on the photo, the stroke or the loop's words.
      */}
      {sparks !== undefined ? (
        <text
          x={ear.x - Math.sin(angle) * (EAR_GEOMETRY.outerR + 52)}
          y={ear.y + Math.cos(angle) * (EAR_GEOMETRY.outerR + 52)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--giver-generosity)"
          className="font-black lowercase"
          pointerEvents="none"
          style={{
            fontSize: 34,
            letterSpacing: "0.06em",
            opacity: dragging ? 0 : 0.9,
            transition: "opacity 180ms ease-out",
          }}
        >
          {sparks} sparks
        </text>
      ) : null}




      {/* dot -> word: the mode reads inside the piece that carries it */}
      <text
        x={ear.x}
        y={ear.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--world-g)"
        className="font-black lowercase"
        pointerEvents="none"
        style={{
          fontSize: WORD_SIZE,
          letterSpacing: LOOP_ROLE_STYLE.action.tracking,
          opacity: photo ? 0 : dragging ? 0 : reveal ? 0.95 : 0.4,
          transform: `scale(${dragging ? 0.3 : 1})`,
          transformOrigin: `${ear.x}px ${ear.y}px`,
          transition:
            "opacity 200ms ease-out, transform 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {word ?? mode}

      </text>

      {/* Invisible grip, travelling with the ring. */}
      <circle
        cx={ear.x}
        cy={ear.y}
        r={96}
        fill="transparent"
        className="touch-none outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
        style={{ cursor: "grab", outline: "none" }}
        role="slider"
        tabIndex={0}
        aria-label="mode"
        aria-valuemin={1}
        aria-valuemax={ring.length}
        aria-valuenow={ring.indexOf(mode) + 1}

        aria-valuetext={mode}
        onPointerDown={(e) => {
          e.stopPropagation();
          const grab = angleFrom(e);
          gesture.current = { start: grab?.point ?? ear, moved: false };
          // LOCKED: the seat only STATES the mode; it cannot be dragged.
          if (locked) return;
          (e.target as SVGElement).setPointerCapture?.(e.pointerId);
          const a = grab?.angle ?? angleRef.current;
          dragRef.current = a;
          setDrag(a);
        }}
        onPointerMove={(e) => {
          if (locked || drag === null) return;
          e.stopPropagation();
          const move = angleFrom(e);
          if (!move) return;
          const g = gesture.current;
          if (g && !g.moved && dist(move.point, g.start) > 14) g.moved = true;
          dragRef.current = move.angle;
          setDrag(move.angle);
          if (!g?.moved) return;
          const near = nearestOf(move.angle, seats);
          if (Math.abs(shortest(move.angle, SEAT_ANGLE[near])) < 0.2) commit(near);
        }}

        onPointerUp={(e) => {
          e.stopPropagation();
          end();
        }}
        onPointerCancel={end}
        onKeyDown={(e) => {
          const i = ring.indexOf(mode);
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            commit(ring[(i + 1) % ring.length]!);
          }
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            commit(ring[(i + ring.length - 1) % ring.length]!);
          }

          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTap?.();
          }
        }}
      />
    </g>
  );
}

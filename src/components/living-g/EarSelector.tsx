import { useEffect, useId, useRef, useState } from "react";
import { haptics } from "@/lib/haptics";
import { EAR_GEOMETRY, LIVING_G_PATH, LIVING_G_TRANSFORM, LOOP_CENTRE, LOOP_RIM_RADIUS } from "./g-path";
import { TOGGLE, rimRadius, trackRadius, type GWeight } from "./g-weight";
import { togglePath, type TrackPose } from "./toggle-path";

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
 * (Historic pairing notes: wish 10:30 <-> borrow 1:30, lend 9:00 <-> trade
 * 4:30. The live, spectrum-ordered layout is SEAT_ANGLE below.)
 *
 * The S-curve is never a mode destination.
 */

export const MODES = ["wish", "give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

/**
 * THE FULL TRACK, ONCE IT IS EARNED. Two destinations sit outside the four
 * activities: GIVER = ME at 6 o'clock, and LEND at 9:00 between give and wish. My G is
 * LOCKED until the person has discovered their profile, so onboarding only ever
 * offers the activity seats.
 */
export const SEATS = ["giver", "wish", "give", "trade", "borrow", "lend", "fund", "map"] as const;
export type Seat = (typeof SEATS)[number];

/**
 * Every seat on the wire, in travel order (one end of the break -> the other).
 * MAP (6:00) is a door INTO communi-g (the map / search view), never a
 * second community seat; communi-g itself is always the bottom loop.
 */
export const FULL_SEATS = [
  "map",
  "fund",
  "borrow",
  "wish",
  "giver",
  "give",
  "lend",
  "trade",
] as const;



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
 * THE WIRE, NOT A CIRCLE. The middle loop's stroke is BROKEN only where the
 * spine leaves it — the small negative-space gap between roughly 5 and 6
 * o'clock. Everywhere else the stroke is continuous, so the bead travels almost
 * the whole circumference: from the 5 o'clock lip (+60°) ANTICLOCKWISE past
 * 4:30, 3, 1:30, 12, 10:30, 9 and 7:30 to the 6 o'clock lip (-270°). Its angle
 * lives on ONE CONTINUOUS LINE with no wrap-around, so the bead can never
 * teleport across the gap or take a shortcut through empty space.
 * (The loop itself now RENDERS closed — loop-close.tsx bridges the traced
 * opening at draw time — but the bead's travel keeps these two ends.)
 *
 * THE SEATS — THE SOURCE OF TRUTH (clock positions), fixed on every Living G
 * everywhere in the app:
 *   giver  -270°   6:00, MY G at the anticlockwise end on the far lip of the
 *                  break, where the node intentionally overlaps the lower loop
 *   give   -225°   7:30, immediately to my g's left
 *   lend   -180°   9:00
 *   wish   -135°  10:30
 *   borrow  -45°   1:30
 *   trade   +45°   4:30, just inside the clockwise end
 *
 * (The table above is the original layout. The LIVE map is SEAT_ANGLE —
 * eight seats, clockwise from 6:00 (Frazer, 28 Sep 2026):
 *   map 6:00 (red) · fund 7:30 (brown) · borrow 9:00 (pinkish purple) ·
 *   wish 10:30 (bright purple) · my g 12:00 (bright blue) ·
 *   give 1:30 (bright green) · lend 3:00 (yellow-green) · trade 4:30 (orange).
 * Every ordering (drag, snapping, keyboard arrows, seat hints, the sign-in
 * conveyor) is sorted from these angles, so this table is the only place a
 * position lives.)
 */
export const SEAT_ANGLE: Record<Seat, number> = {
  map: rad(-270), // 6:00 — MAP / SEARCH, the door into communi-g
  fund: rad(-225), // 7:30 — FUND, between map and borrow
  borrow: rad(-180), // 9:00
  wish: rad(-135), // 10:30
  giver: rad(-90), // 12:00 — MY G
  give: rad(-45), // 1:30
  lend: rad(0), // 3:00
  trade: rad(45), // 4:30
};

/** The wire's two physical ends — the two lips of the break. Nothing passes. */
const TRACK_MIN = rad(-270);
const TRACK_MAX = rad(60);


const TAU = Math.PI * 2;

/** Signed travel ALONG THE WIRE from `a` to `b` — plain distance, no wrapping. */
const shortest = (a: number, b: number) => b - a;

/** The bead can only be where the stroke is. */
const clampTrack = (a: number) => Math.min(TRACK_MAX, Math.max(TRACK_MIN, a));

/**
 * A raw finger angle (-π..π] expressed as the point ON THE WIRE nearest the
 * bead's current position, then clamped to the wire's ends. A finger over the
 * physical gap simply holds the bead at the nearest lip.
 */
const onTrack = (ref: number, raw: number) => {
  let best = raw;
  let bestD = Infinity;
  for (let k = -2; k <= 2; k += 1) {
    const c = raw + k * TAU;
    const d = Math.abs(c - ref);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return clampTrack(best);
};

/** How near a seat (in radians of travel) counts as captured. */
const CAPTURE = 0.34;

/** A point on the track at a given angle, at any radius. */
const at = (angle: number, r: number): P => ({
  x: TRACK_C.x + r * Math.cos(angle),
  y: TRACK_C.y + r * Math.sin(angle),
});

/**
 * WHERE THE RING IS at a track angle (toggle-path.ts): always on the middle
 * loop's orbit, at every seat, 6:00 included. Never on the bottom loop.
 */
const poseAt = (angle: number, weight: GWeight = "normal"): TrackPose =>
  togglePath(weight).pose(angle);

/** `inset` units in from the ring's centre, towards the G (hints, stems). */
const inward = (pose: TrackPose, inset: number): P => ({
  x: pose.x - pose.nx * inset,
  y: pose.y - pose.ny * inset,
});

/**
 * THE TOGGLE IS ALWAYS NEGATIVE SPACE: a hollow ring, never filled, at every
 * seat, parked or moving. Where it lies over a stroke of the G (the waist at
 * 6:00), that stroke runs right up to the ring with no white gap and is
 * cleared inside it, so the inside always reads as background.
 */

/**
 * THE LIVE CENTRE OF THE TOP LOOP — the small circular selector itself, wherever
 * the toggle is CURRENTLY sitting. Anything that must travel "into the top loop"
 * asks for this and never for a hard-coded coordinate, so the motion follows the
 * Living G's present state instead of one seat's position.
 */
export const seatCentre = (seat: Seat): P => {
  const p = poseAt(SEAT_ANGLE[seat]);
  return { x: p.x, y: p.y };
};



/** Nearest seat measured ALONG THE WIRE — never across the break. */
function nearestOf(angle: number, seats: readonly Seat[]): Seat {
  let best: Seat = seats[0]!;
  let bestD = Infinity;
  for (const m of seats) {
    const d = Math.abs(SEAT_ANGLE[m] - angle);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}



const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * THE PIECE'S GEOMETRY at a weight — the one construction every toggle draws
 * from (this selector, and the sign-in's conveyor toggle): track centre, rim,
 * orbit, ring mid-radius and stroke, stem span and half-width.
 * Pure: the same numbers this file has always used.
 */
export function toggleGeometry(weight: GWeight = "normal") {
  const RIM_R = rimRadius(weight);
  const TRACK_R = trackRadius(weight);
  const EAR = { ...EAR_GEOMETRY, ...TOGGLE[weight] };
  return {
    centre: TRACK_C,
    EAR,
    RIM_R,
    TRACK_R,
    RING_MID: (EAR.innerR + EAR.outerR) / 2,
    RING_W: EAR.outerR - EAR.innerR,
    STEM_FROM: RIM_R - 8,
    STEM_TO: TRACK_R - EAR.innerR - 6,
    STEM_HALF: EAR.stemWidth / 2,
  };
}

/**
 * THE SEAT'S TITLE — the word set INSIDE the hollow ring, naming the mode or
 * world the toggle is in (Frazer, 28 Sep 2026). Clockwise from 12:00:
 * my g · give · lend · trade · communi-g (the 6:00 map seat) · fund ·
 * borrow · wish. The one table every toggle reads its title from.
 */
export const SEAT_TITLE: Record<Seat, string> = {
  giver: "my g",
  give: "give",
  lend: "lend",
  trade: "trade",
  map: "communi-g",
  fund: "fund",
  borrow: "borrow",
  wish: "wish",
};

/**
 * THE TITLE'S TYPE — lowercase Helvetica Neue (the loop labels' face and
 * weight) with generous tracking, ONE size for every seat, set as a share of
 * the ring's hole so it scales with the G exactly like the ring does.
 *
 *   size      0.30 × innerR. At "middle" (innerR 57.4, a 114.8-unit hole)
 *             that is 17.22 units = 9.0px at 390 (0.52279 px/unit), the
 *             largest size at which the longest title, "communi-g", still
 *             clears the stroke by ≥4px each side in iOS Helvetica Neue
 *             (~51.8px of the hole's 60px; ~50.3px in Helvetica metrics).
 *   tracking  0.08em: four times the loop labels' 0.02em, so it reads open.
 *   xHeight   Helvetica's 0.52em: the baseline sits half an x-height below
 *             the ring's centre, so the lowercase body is centred optically.
 *
 * Letter-spacing is added after EVERY glyph, the last one included, which
 * would pull a middle-anchored word left by half a space; `titleText`
 * nudges it back so the ink, not the advance box, is centred.
 */
export const TOGGLE_TITLE = {
  sizeOfInner: 0.3,
  tracking: 0.08,
  weight: 400,
  xHeight: 0.52,
} as const;

/**
 * Where and how to set a title inside a ring of hole radius `innerR`, centred
 * on (x, y). Always upright: callers place it OUTSIDE the piece's rotation.
 */
export function titleText(innerR: number) {
  const size = innerR * TOGGLE_TITLE.sizeOfInner;
  return {
    size,
    /** Add to the ring centre's x: undoes the trailing letter-space. */
    dx: (TOGGLE_TITLE.tracking * size) / 2,
    /** Add to the ring centre's y: the alphabetic baseline. */
    dy: (TOGGLE_TITLE.xHeight * size) / 2,
    style: {
      fontFamily: "var(--giver-font)",
      fontWeight: TOGGLE_TITLE.weight,
      fontSize: size,
      letterSpacing: `${TOGGLE_TITLE.tracking}em`,
      textTransform: "lowercase",
      whiteSpace: "pre",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    } as React.CSSProperties,
  };
}

/** The locked seat colours, for seats that state a person's history. */
const MODE_COLOUR: Record<Seat, string> = {
  giver: "var(--mode-giver)",
  wish: "var(--mode-wish)",
  give: "var(--mode-give)",
  trade: "var(--mode-trade)",
  borrow: "var(--mode-borrow)",
  lend: "var(--mode-lend)",
  fund: "var(--mode-fund)",
  map: "var(--mode-map)",
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
  hideWord = false,
  weight = "normal",
  title = false,
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
  /** Retired: the toggle carries no words (kept so callers still type-check). */
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
  /**
   * FIRST LANDING: hide the mode word in the bead until the person moves the
   * toggle once. Visibility only — physics and seats are untouched.
   */
  hideWord?: boolean;
  /**
   * THE G'S STROKE WEIGHT under this toggle (g-weight.tsx). At "middle" the
   * rim sits 12.5 units further in, so the orbit comes in by the same 12.5
   * (300 → 287.5): ring size and the 24.5 white gap are unchanged.
   */
  weight?: GWeight;
  /**
   * THE SEAT'S TITLE INSIDE THE RING (SEAT_TITLE), in the ring's own colour,
   * upright, pointer-transparent. It names the seat the G's colour names:
   * the committed mode, which a drag moves as the bead reaches each seat.
   * When shown it is the ONLY thing inside the ring (no photo).
   */
  title?: boolean;
  /** Stationary hold began: listen for the selected seat (call start synchronously). */
  onRecordStart?: () => void;
  /** The hold ended (release, or cancelled / lost capture). */
  onRecordEnd?: (cancelled: boolean) => void;
  /** Show the record button inside the ring instead of the seat title. */
  recording?: boolean;
}) {
  /* The track at this weight — shadows the module's canonical (normal) values. */
  /* The piece at this weight (variant A at "middle": thinner ring and stem). */
  const { RIM_R, TRACK_R, EAR, RING_MID, RING_W, STEM_FROM, STEM_TO, STEM_HALF } = toggleGeometry(weight);
  /** The seat title's size and optical offsets for this ring's hole. */
  const titleSet = titleText(EAR.innerR);


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
      haptics.selection();
      setPeek(true);
    }, 380);
  };
  const stopPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeek(false);
  };

  /**
   * HOLD TO RECORD on this same toggle: a stationary press past HOLD_MS turns
   * the ring's interior into a record button and starts listening; release
   * ends it. Any travel first makes it a drag; a quick lift stays a tap.
   */
  const recTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recHeld = useRef(false);
  const clearRecTimer = () => {
    if (recTimer.current) clearTimeout(recTimer.current);
    recTimer.current = null;
  };
  const armRecord = () => {
    clearRecTimer();
    recHeld.current = false;
    if (!onRecordStart) return;
    recTimer.current = setTimeout(() => {
      recTimer.current = null;
      if (gesture.current && !gesture.current.moved) {
        recHeld.current = true;
        dragRef.current = null;
        setDrag(null);
        onRecordStart();
      }
    }, HOLD_MS);
  };
  useEffect(() => () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
  }, []);

  /** ONE SOURCE OF TRUTH: the assembly's angle on the track. */
  const restAngle = SEAT_ANGLE[mode];

  const [angle, setAngle] = useState(restAngle);
  const angleRef = useRef(angle);

  // Rest and magnet targets live ON THE WIRE: the bead always travels the real
  // stroke between two seats, however far round the loop that is.
  let target = clampTrack(restAngle);
  if (drag !== null) {
    const seat = SEAT_ANGLE[nearestOf(drag, seats)];

    const pull = Math.max(0, 1 - Math.abs(seat - drag) / CAPTURE) * 0.55;
    target = clampTrack(drag + (seat - drag) * pull);
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

  /** Where the ring actually is right now — text and hit area follow it. */
  const pose = poseAt(angle, weight);
  const ear: P = { x: pose.x, y: pose.y };
  const knockId = useId().replace(/:/g, "");

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
      // FINGER FREE, BEAD RAILED: only the angle is taken from the finger, and
      // it is resolved onto the WIRE nearest the bead and clamped to its ends —
      // so a finger swung across the break holds the bead at the nearest lip
      // instead of teleporting it to the far side.
      angle: onTrack(dragRef.current ?? angleRef.current, raw),
    };

  };


  const commit = (next: Seat) => {
    if (next !== last.current) {
      last.current = next;
      // THE SNAP ITSELF, never the drag: felt only when a seat is truly taken.
      haptics.light();
      onChange(next);
    }
  };

  /**
   * ONE FINGER, ONE GESTURE. The pointer that started the drag is the only one
   * that can move or end it, so a second touch anywhere on the phone can never
   * hijack or freeze the selector.
   */
  const activeId = useRef<number | null>(null);

  const end = (e?: React.PointerEvent<SVGElement>, cancelled = false) => {
    if (e && activeId.current !== null && e.pointerId !== activeId.current) return;
    if (e) {
      const el = e.currentTarget as SVGElement & {
        releasePointerCapture?: (id: number) => void;
        hasPointerCapture?: (id: number) => boolean;
      };
      try {
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture?.(e.pointerId);
      } catch {
        /* the browser already dropped the capture — nothing to release */
      }
    }
    activeId.current = null;
    const g = gesture.current;
    const wasHeld = held.current;
    const wasRecording = recHeld.current;
    clearRecTimer();
    recHeld.current = false;
    stopPeek();
    held.current = false;
    if (wasRecording) onRecordEnd?.(cancelled);
    else if (drag !== null && g?.moved) commit(nearestOf(drag, seats));
    else if (g && !g.moved && !wasHeld && !cancelled) onTap?.();
    gesture.current = null;
    dragRef.current = null;
    setDrag(null);
  };


  /** Seats in travel order, so the keyboard walks the track, not the array. */
  const ring = [...seats].sort((a, b) => SEAT_ANGLE[a] - SEAT_ANGLE[b]);

  return (
    <g>
      {/* Subtle destination hints, seated on the track itself. Never a drawn ring.
          MY G IS ONE OF THEM: at 12 o'clock it is the same small, soft, close-in
          dot as every other inactive destination — nothing about it is louder.
          The moment the toggle arrives it disappears under the piece itself. */}
      {seats.map((m) => {
        const hint = inward(poseAt(SEAT_ANGLE[m], weight), TRACK_R - RIM_R - 16);
        const active = mode === m && !dragging;
        // On a person's screen the seats TELL THEIR STORY: a seat they have
        // taken part in reads in that mode's own colour, a little stronger.
        const told = m === "giver" ? false : (history?.includes(m) ?? false);
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
        THE ONE RIGID ASSEMBLY. Authored on the +x radial axis in local terms,
        then placed by a single rotation about the track centre. Stem root under
        the rim, ring beyond it, distance between them fixed by construction.
        The ring is hollow and never filled.
      */}
      {/* THE KNOCK-OUT: paper over the G's strokes inside the ring only, out
          to the ring's stroke centreline (hidden under the ring), so a stroke
          meets the ring's outer edge with no white gap. Clipped to the
          full-weight artwork, which also covers a thinned stroke's
          anti-aliased fringe, so no hairline is left. Where the ring crosses
          nothing it paints nothing. */}
      <defs>
        <clipPath id={`${knockId}-g`} clipPathUnits="userSpaceOnUse">
          <path d={LIVING_G_PATH} transform={LIVING_G_TRANSFORM} />
        </clipPath>
      </defs>
      <circle
        cx={ear.x}
        cy={ear.y}
        r={RING_MID}
        fill="var(--world-bg)"
        pointerEvents="none"
        clipPath={`url(#${knockId}-g)`}
      />
      <g
        transform={`translate(${ear.x} ${ear.y}) rotate(${pose.deg})`}
        pointerEvents="none"
      >
        <rect
          x={STEM_FROM - TRACK_R}
          y={-STEM_HALF}
          width={STEM_TO - STEM_FROM}
          height={STEM_HALF * 2}
          rx={STEM_HALF * 0.5}
          fill="var(--world-g)"
        />
        {/* The ring's inside is NEGATIVE SPACE: no fill of its own. */}
        <circle
          cx={0}
          cy={0}
          r={RING_MID}
          fill="none"
          stroke="var(--world-g)"
          strokeWidth={RING_W}
        />
      </g>

      {/* THE SEAT'S TITLE — upright (outside the piece's rotation), centred
          on the ring, in the ring's colour, and transparent to the pointer so
          a tap on a parked toggle still reaches the grip beneath. */}
      {recording ? (
        /* HOLD = RECORD: the ring's interior becomes a record button. */
        <g pointerEvents="none" data-toggle-record="" aria-hidden="true">
          <circle className="g-record-halo" cx={ear.x} cy={ear.y} r={EAR.innerR * 0.62} fill="none" stroke="var(--world-g)" strokeWidth={3} />
          <circle cx={ear.x} cy={ear.y} r={EAR.innerR * 0.42} fill="var(--world-g)" />
        </g>
      ) : title ? (
        <text
          x={ear.x + titleSet.dx}
          y={ear.y + titleSet.dy}
          textAnchor="middle"
          fill="var(--world-g)"
          pointerEvents="none"
          aria-hidden="true"
          data-toggle-title=""
          style={titleSet.style}
        >
          {SEAT_TITLE[mode]}
        </text>
      ) : null}

      {photo && !title ? (
        <>
          <defs>
            <clipPath id={`ear-photo-${mode}`} clipPathUnits="userSpaceOnUse">
              <circle cx={ear.x} cy={ear.y} r={EAR.innerR - 3} />
            </clipPath>
          </defs>
          <image
            href={photo}
            x={ear.x - (EAR.innerR - 3)}
            y={ear.y - (EAR.innerR - 3)}
            width={(EAR.innerR - 3) * 2}
            height={(EAR.innerR - 3) * 2}
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
            cx={ear.x + EAR.innerR * 0.82}
            cy={ear.y + EAR.innerR * 0.82}
            r={EAR.innerR * 0.42}
            fill="var(--world-g)"
          />
          <text
            x={ear.x + EAR.innerR * 0.82}
            y={ear.y + EAR.innerR * 0.82}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--world-bg)"
            className="font-black"
            style={{ fontSize: EAR.innerR * 0.44, letterSpacing: "-0.04em" }}
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
          x={ear.x - pose.ny * (EAR.outerR + 46)}
          y={ear.y + pose.nx * (EAR.outerR + 46)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--giver-green)"
          className="font-black lowercase"
          pointerEvents="none"
          style={{
            fontSize: 22,
            letterSpacing: "0.14em",
            opacity: peek && !dragging ? 0.7 : 0,
            transition: "opacity 160ms ease-out",
          }}
        >
          {sparks} sparks
        </text>
      ) : null}




      {/* NO OTHER WORDS ON THE TOGGLE: beside the seat's title inside the
          ring (when `title` is on), nothing names the action. */}

      {/*
        SEAT TAP TARGETS. A seat can be REACHED, not only dragged to: one
        generous invisible disc per destination, painted BEFORE the grip so the
        piece itself always wins the overlap. Same pointer events, same commit —
        no separate touch implementation anywhere.
      */}
      {!locked
        ? seats.map((m) => {
            if (m === mode) return null;
            const spot = poseAt(SEAT_ANGLE[m], weight);
            return (
              <circle
                key={`seat-${m}`}
                cx={spot.x}
                cy={spot.y}
                r={78}
                fill="transparent"
                role="button"
                aria-label={m === "giver" ? "my g" : m === "map" ? "map" : m}
                className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
                style={{ cursor: "pointer", touchAction: "none", outline: "none" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (activeId.current !== null) return;
                  activeId.current = e.pointerId;
                  (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  if (activeId.current !== e.pointerId) return;
                  activeId.current = null;
                  try {
                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                  } catch {
                    /* already released */
                  }
                  commit(m);
                }}
                onPointerCancel={(e) => {
                  if (activeId.current === e.pointerId) activeId.current = null;
                }}
              />
            );
          })
        : null}

      {/* Invisible grip, travelling with the ring. */}
      <circle
        cx={ear.x}
        cy={ear.y}
        r={110}
        fill="transparent"
        className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
        // touch-action lives in inline style, not a utility class: the browser
        // must see it on THIS element to hand the gesture over instead of
        // scrolling the page mid-drag.
        style={{ cursor: "grab", touchAction: "none", outline: "none" }}
        role="slider"
        tabIndex={0}
        aria-label="mode"
        aria-valuemin={1}
        aria-valuemax={ring.length}
        aria-valuenow={ring.indexOf(mode) + 1}

        aria-valuetext={mode}
        onPointerDown={(e) => {
          e.stopPropagation();
          // A second finger never joins an active gesture.
          if (activeId.current !== null) return;
          activeId.current = e.pointerId;
          const grab = angleFrom(e);
          gesture.current = { start: grab?.point ?? ear, moved: false };
          startPeek();
          // CAPTURE ON THE ELEMENT THAT HANDLES THE GESTURE, so the drag keeps
          // running even once the finger leaves the disc.
          (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
          // LOCKED: the seat only STATES the mode; it cannot be dragged.
          if (locked) return;
          const a = grab?.angle ?? angleRef.current;
          dragRef.current = a;
          setDrag(a);
        }}
        onPointerMove={(e) => {
          if (activeId.current !== e.pointerId) return;
          if (locked || dragRef.current === null) return;
          e.stopPropagation();
          const move = angleFrom(e);
          if (!move) return;
          const g = gesture.current;
          if (g && !g.moved && dist(move.point, g.start) > 14) {
            g.moved = true;
            /* A drag is a mode change, not a peek. */
            stopPeek();
            held.current = false;
          }
          dragRef.current = move.angle;
          setDrag(move.angle);
          if (!g?.moved) return;
          const near = nearestOf(move.angle, seats);
          if (Math.abs(shortest(move.angle, SEAT_ANGLE[near])) < 0.2) commit(near);
        }}

        onPointerUp={(e) => {
          e.stopPropagation();
          end(e);
        }}
        onPointerCancel={(e) => end(e)}
        onLostPointerCapture={(e) => {
          // Android can revoke a capture mid-gesture: settle where we are and
          // leave the control immediately usable again.
          if (activeId.current === e.pointerId) end(e);
        }}
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

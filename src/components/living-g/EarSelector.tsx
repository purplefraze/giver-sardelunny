import { useEffect, useRef, useState } from "react";
import { haptics } from "@/lib/haptics";
import {
  EAR_GEOMETRY,
  LOOP_SAFE_RADIUS,
  SATELLITE_ORBIT,
} from "./g-path";
import { LOOP_ROLE_STYLE } from "./type-scale";

/**
 * THE FIVE SATELLITES.
 *
 * The Living G is the interface. Around its middle loop sit FIVE small circular
 * rings, each joined to the loop by one short stem so every satellite reads as
 * part of the same organic object. There are exactly five — never a duplicate,
 * never a travelling bead, never a second loop.
 *
 * Each satellite is a CONTROL FOR THE WHOLE G. While a finger is down on a
 * satellite, the entire Living G — upper loop, middle connection, lower loop and
 * every satellite — takes that satellite's colour. On release the whole G
 * settles back to the resting electric orange.
 *
 * THE CLOCK MAP (source of truth):
 *   give 1:30 green · giver/my g 4:30 turquoise · trade 6:00 orange ·
 *   borrow 9:00 hot pink · wish 10:30 purple
 *
 * The canonical Living G artwork is never rotated, scaled, deformed or redrawn
 * for any state. Only colour changes.
 */

export const MODES = ["wish", "give", "trade", "borrow"] as const;
export type Mode = (typeof MODES)[number];

export const SEATS = ["giver", "give", "wish", "borrow", "trade"] as const;
export type Seat = (typeof SEATS)[number];

/** Every seat, in physical travel order around the stationary G. */
export const FULL_SEATS = SEATS;

type P = { x: number; y: number };

/**
 * THE ORBIT. The five satellites sit on one ellipse around the WHOLE object's
 * optical centre — measured once in g-path.ts — so they read as balanced around
 * the Living G rather than bunched round a single loop.
 */
const RING_MID = (EAR_GEOMETRY.innerR + EAR_GEOMETRY.outerR) / 2;
const RING_W = EAR_GEOMETRY.outerR - EAR_GEOMETRY.innerR;

/** The stem: it runs from the ring's stroke inward, toward the G's body. */
const STEM_LEN = 58;
const STEM_HALF = EAR_GEOMETRY.stemWidth / 2;

/** THE GENEROUS INVISIBLE TOUCH TARGET, one per satellite. */
const HIT_R = Math.max(EAR_GEOMETRY.gripR, 72);

const rad = (deg: number) => (deg * Math.PI) / 180;

/** SVG angles: 0 = 3 o'clock, negative = upward. */
const SEAT_ANGLE: Record<Seat, number> = {
  give: rad(-45), // 1:30
  giver: rad(45), // 4:30 — my g
  trade: rad(90), // 6:00, over the lower loop
  borrow: rad(180), // 9:00
  wish: rad(-135), // 10:30
};

const at = (angle: number): P => ({
  x: SATELLITE_ORBIT.cx + SATELLITE_ORBIT.rx * Math.cos(angle),
  y: SATELLITE_ORBIT.cy + SATELLITE_ORBIT.ry * Math.sin(angle),
});

/**
 * THE LIVE CENTRE OF A SEAT'S RING. Anything travelling "into the loop" asks
 * for this instead of hard-coding a coordinate.
 */
export const seatCentre = (seat: Seat): P => at(SEAT_ANGLE[seat]);

/** The captured word lives in the ring's own negative space. */
const WORD_SIZE = Math.round(LOOP_SAFE_RADIUS.top * 0.42);

const WORD: Record<Seat, string> = {
  giver: "my g",
  give: "give",
  wish: "wish",
  borrow: "borrow",
  trade: "trade",
};

/**
 * THE PRESS ANSWER. While a finger is down on a satellite the document root
 * carries that seat, and every world painted from --world-g answers together.
 * On release the root returns to the resting orange state.
 */
const paint = (seat: Seat | null) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (seat) root.setAttribute("data-g-press", seat);
  else root.removeAttribute("data-g-press");
  root.setAttribute("data-g-touch", seat ? "down" : "up");
};

export function EarSelector({
  mode,
  onChange,
  onTap,
  locked = false,
  photo,
  seats = SEATS,
  word,
  badge,
  sparks,
}: {
  mode: Seat;
  onChange: (next: Seat) => void;
  /** A tap on the ACTIVE satellite opens the profile. */
  onTap?: () => void;
  /** True on a person's screen: the seat only STATES their interaction type. */
  locked?: boolean;
  /** A face riding the active ring, inside its negative space. */
  photo?: string;
  /** Which seats this G offers. My own G offers all five. */
  seats?: readonly Seat[];
  /** What the active ring SAYS, when the seat's own name is not the word. */
  word?: string;
  /** Past connections — one quiet number beside the face. */
  badge?: number;
  /** MY sparks, and only ever mine: revealed by a press and hold. */
  sparks?: number;
  /** Kept for callers that describe a person's history. */
  history?: Seat[];
}) {
  /** Which satellite currently has a finger on it. */
  const [pressed, setPressed] = useState<Seat | null>(null);
  /**
   * THE G NEVER MOVES FOR A SATELLITE, and no satellite is ever nudged either:
   * the stage is sized against the whole five-satellite silhouette, so every
   * ring and every touch disc is on the glass by construction.
   */

  const activeId = useRef<number | null>(null);
  const moved = useRef(false);

  /** MY SPARKS ARE NEVER ON DISPLAY — a hold breathes the balance in. */
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const startPeek = (seat: Seat) => {
    if (sparks === undefined || seat !== mode) return;
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

  /* THE RESTING STATE IS ORANGE, from the moment the G is on screen. */
  useEffect(() => {
    paint(null);
    return () => {
      if (peekTimer.current) clearTimeout(peekTimer.current);
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-g-press");
        document.documentElement.removeAttribute("data-g-touch");
      }
    };
  }, []);

  /** On arrival the word speaks up, then settles back. */
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setReveal(true);
    const t = setTimeout(() => setReveal(false), 1400);
    return () => clearTimeout(t);
  }, [mode]);

  const down = (seat: Seat) => (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    if (activeId.current !== null) return;
    activeId.current = e.pointerId;
    moved.current = false;
    setPressed(seat);
    /* FINGER DOWN: the WHOLE G takes this satellite's colour immediately. */
    paint(seat);
    haptics.light();
    startPeek(seat);
    (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
  };

  const up = (seat: Seat) => (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    if (activeId.current !== e.pointerId) return;
    activeId.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* the browser already dropped the capture */
    }
    setPressed(null);
    /* FINGER LIFTED: the whole G returns to the resting orange. */
    paint(null);
    const wasHeld = held.current;
    stopPeek();
    held.current = false;
    if (locked) return;
    if (wasHeld) return;
    if (seat === mode) onTap?.();
    else onChange(seat);
  };

  const cancel = (e: React.PointerEvent<SVGElement>) => {
    if (activeId.current === e.pointerId) activeId.current = null;
    setPressed(null);
    stopPeek();
    held.current = false;
    paint(null);
  };

  const visible = seats.includes(mode) ? seats : ([...seats, mode] as Seat[]);

  return (
    <g data-living-g-selector="true" pointerEvents="none">
      {visible.map((seat) => {
        const a = SEAT_ANGLE[seat];
        const deg = (a * 180) / Math.PI;
        const c = at(a);
        const isActive = seat === mode;
        const isPressed = pressed === seat;
        return (
          <g key={`sat-${seat}`}>
            {/*
              ONE RIGID ASSEMBLY per satellite: ring plus one short stem running
              back toward the G's body, authored on the +x axis and rotated into
              place about the ring's own centre, so it can never drift.
            */}
            <g
              transform={`rotate(${deg + 180} ${c.x} ${c.y})`}
              pointerEvents="none"
              style={{
                transformBox: "view-box",
                transformOrigin: `${c.x}px ${c.y}px`,
                transition: "transform 180ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <g
                style={{
                  transform: `scale(${isPressed ? 1.09 : isActive ? 1.02 : 1})`,
                  transformBox: "view-box",
                  transformOrigin: `${c.x}px ${c.y}px`,
                  transition: "transform 180ms cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <circle cx={c.x} cy={c.y} r={EAR_GEOMETRY.outerR} fill="var(--world-bg)" />
                <rect
                  x={c.x + EAR_GEOMETRY.innerR}
                  y={c.y - STEM_HALF}
                  width={STEM_LEN}
                  height={STEM_HALF * 2}
                  rx={STEM_HALF * 0.5}
                  fill="var(--world-g)"
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={RING_MID}
                  fill="none"
                  stroke="var(--world-g)"
                  strokeWidth={isActive ? RING_W : RING_W * 0.72}
                />
              </g>
            </g>

            {isActive && photo ? (
              <>
                <defs>
                  <clipPath id={`ear-photo-${seat}`} clipPathUnits="userSpaceOnUse">
                    <circle cx={c.x} cy={c.y} r={EAR_GEOMETRY.innerR - 3} />
                  </clipPath>
                </defs>
                <image
                  href={photo}
                  x={c.x - (EAR_GEOMETRY.innerR - 3)}
                  y={c.y - (EAR_GEOMETRY.innerR - 3)}
                  width={(EAR_GEOMETRY.innerR - 3) * 2}
                  height={(EAR_GEOMETRY.innerR - 3) * 2}
                  clipPath={`url(#ear-photo-${seat})`}
                  preserveAspectRatio="xMidYMid slice"
                  pointerEvents="none"
                />
              </>
            ) : null}

            {isActive && badge ? (
              <g pointerEvents="none" opacity={0.95}>
                <circle
                  cx={c.x + EAR_GEOMETRY.innerR * 0.82}
                  cy={c.y + EAR_GEOMETRY.innerR * 0.82}
                  r={EAR_GEOMETRY.innerR * 0.42}
                  fill="var(--world-g)"
                />
                <text
                  x={c.x + EAR_GEOMETRY.innerR * 0.82}
                  y={c.y + EAR_GEOMETRY.innerR * 0.82}
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

            {isActive && sparks !== undefined ? (
              <text
                x={c.x - Math.sin(a) * (EAR_GEOMETRY.outerR + 46)}
                y={c.y + Math.cos(a) * (EAR_GEOMETRY.outerR + 46)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--giver-green)"
                className="font-black lowercase"
                pointerEvents="none"
                style={{
                  fontSize: 22,
                  letterSpacing: "0.14em",
                  opacity: peek ? 0.7 : 0,
                  transition: "opacity 160ms ease-out",
                }}
              >
                {sparks} sparks
              </text>
            ) : null}

            {/* The word reads inside the ring that carries it. */}
            {isActive && photo ? null : (
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--world-g)"
                className="font-black lowercase"
                pointerEvents="none"
                style={{
                  fontSize: isActive ? WORD_SIZE : WORD_SIZE * 0.82,
                  letterSpacing: LOOP_ROLE_STYLE.action.tracking,
                  opacity: isPressed ? 1 : isActive ? (reveal ? 0.95 : 0.6) : 0.34,
                  transition: "opacity 200ms ease-out",
                }}
              >
                {isActive ? (word ?? WORD[seat]) : WORD[seat]}
              </text>
            )}

            {/* GENEROUS INVISIBLE TOUCH TARGET, one per satellite. */}
            <circle
              cx={c.x}
              cy={c.y}
              r={HIT_R}
              fill="transparent"
              pointerEvents="all"
              role={isActive ? "slider" : "button"}
              tabIndex={0}
              aria-label={WORD[seat]}
              {...(isActive
                ? {
                    "aria-valuemin": 1,
                    "aria-valuemax": visible.length,
                    "aria-valuenow": visible.indexOf(seat) + 1,
                    "aria-valuetext": seat,
                  }
                : {})}
              className="outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
              style={{ cursor: "pointer", touchAction: "none", outline: "none" }}
              onPointerDown={down(seat)}
              onPointerUp={up(seat)}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (locked) return;
                  if (seat === mode) onTap?.();
                  else onChange(seat);
                }
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

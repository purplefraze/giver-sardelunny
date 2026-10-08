/**
 * THE RECORD CONTROL IN THE S-CURVE — drawn inside the Living G's own viewBox,
 * in the open pocket between the middle and lower loops. It never sits on a
 * line, never travels a curve, and never moves or reshapes the G.
 *
 * Press and hold records until release. Press, then slide slightly RIGHT —
 * deeper into the nook — and the button itself slides into its lock spot;
 * release keeps listening hands-free; tap the locked button to stop.
 * Colour is the live seat token (--record-ink).
 */
import { useRef, useState } from "react";
import { LOCK_AT, LOCK_TRAVEL, releaseOutcome } from "@/intelligence/voice-flow";
import type { Seat } from "./EarSelector";

export const MIC_CENTRE = { x: 262, y: 536 } as const;
const HIT = { x: 182, y: 510, width: 150, height: 52 } as const;

export type MicState = "idle" | "hold" | "locked";

export function VoiceMic({
  state = "idle",
  seat = "give",
  onDown,
  onRelease,
  onStop,
}: {
  state?: MicState;
  seat?: Seat;
  /** Finger down: start recording now (synchronously). */
  onDown: () => void;
  onRelease: (outcome: "stop" | "keep") => void;
  /** Tap on the locked button. */
  onStop: () => void;
}) {
  const [slid, setSlid] = useState(0);
  const grip = useRef<{ id: number; x: number; t: number; scale: number } | null>(null);
  const live = state !== "idle";
  const offset = state === "locked" ? LOCK_TRAVEL : slid;
  const x = MIC_CENTRE.x + offset;
  const { y } = MIC_CENTRE;
  const ease = { transition: "fill 320ms ease-out, stroke 320ms ease-out" };

  const end = (e: React.PointerEvent, cancelled = false) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    const out = cancelled ? "stop" : releaseOutcome(slid, performance.now() - g.t);
    setSlid(0);
    onRelease(out);
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={state === "locked" ? "recording hands-free — tap to stop" : state === "hold" ? "recording — release to stop, slide right to lock" : "hold to record, or slide right to keep recording"}
      aria-pressed={live}
      data-voice-mic=""
      data-mic-state={state}
      data-record-seat={seat}
      data-listening={live ? "" : undefined}
      className="g-record"
      style={{ cursor: "pointer", outline: "none", touchAction: "none" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (state === "locked") {
          onStop();
          return;
        }
        const svg = (e.currentTarget as SVGGElement).ownerSVGElement;
        const m = svg?.getScreenCTM();
        grip.current = { id: e.pointerId, x: e.clientX, t: performance.now(), scale: m ? 1 / m.a : 1 };
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
          /* fine */
        }
        onDown();
      }}
      onPointerMove={(e) => {
        const g = grip.current;
        if (!g || g.id !== e.pointerId) return;
        const d = Math.max(0, Math.min(LOCK_TRAVEL, (e.clientX - g.x) * g.scale));
        setSlid(d);
      }}
      onPointerUp={(e) => end(e)}
      onPointerCancel={(e) => end(e, true)}
      onLostPointerCapture={(e) => end(e)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (state === "locked") onStop();
          else {
            onDown();
            onRelease("keep");
          }
        }
      }}
    >
      <rect {...HIT} fill="transparent" />
      {/* The lock spot, deeper in the nook: a faint ring once a hold begins. */}
      {state === "hold" ? (
        <circle cx={MIC_CENTRE.x + LOCK_TRAVEL} cy={y} r={21} fill="none" stroke="var(--record-ink)" strokeWidth={1.5} strokeDasharray="3 4" opacity={slid >= LOCK_AT ? 0.9 : 0.4} />
      ) : null}
      {live ? (
        <circle className="g-record-halo" cx={x} cy={y} r={19} fill="none" stroke="var(--record-ink)" strokeWidth={2} style={ease} />
      ) : null}
      <circle cx={x} cy={y} r={19} fill="var(--world-bg)" stroke="var(--record-ink)" strokeWidth={3} style={ease} />
      {state === "locked" ? (
        <rect x={x - 7} y={y - 7} width={14} height={14} rx={2.5} fill="var(--record-ink)" style={ease} />
      ) : (
        <circle cx={x} cy={y} r={state === "hold" ? 8 : 10} fill="var(--record-ink)" style={ease} />
      )}
    </g>
  );
}

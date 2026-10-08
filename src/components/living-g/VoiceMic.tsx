/**
 * THE RECORD CONTROL IN THE S-CURVE — drawn inside the Living G's own viewBox,
 * in the open pocket between the middle and lower loops (measured paper:
 * x 125–355, y ≈505–565 at the centre line). It never moves or reshapes the G.
 *
 * Colour is the live seat token --world-g, so it follows the toggle and eases
 * between seats. The touch target is an invisible rectangle kept INSIDE the
 * pocket's paper, so it never covers the stroke or the loops' hit bands.
 */
export const MIC_CENTRE = { x: 262, y: 536 } as const;
const HIT = { x: 172, y: 510, width: 180, height: 52 } as const;

export function VoiceMic({ onPress, listening = false }: { onPress: () => void; listening?: boolean }) {
  const { x, y } = MIC_CENTRE;
  const ease = { transition: "fill 320ms ease-out, stroke 320ms ease-out" };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={listening ? "recording — tap to stop" : "record your words"}
      aria-pressed={listening}
      data-voice-mic=""
      data-listening={listening ? "" : undefined}
      className="g-record"
      style={{ cursor: "pointer", outline: "none" }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPress();
        }
      }}
    >
      <rect {...HIT} fill="transparent" />
      {/* Listening halo: a soft ring that breathes outward, still inside the pocket. */}
      {listening ? (
        <circle className="g-record-halo" cx={x} cy={y} r={19} fill="none" stroke="var(--world-g)" strokeWidth={2} style={ease} />
      ) : null}
      <circle cx={x} cy={y} r={19} fill="var(--world-bg)" stroke="var(--world-g)" strokeWidth={3} style={ease} />
      {listening ? (
        /* STOP: a rounded square replaces the dot. */
        <rect x={x - 7} y={y - 7} width={14} height={14} rx={2.5} fill="var(--world-g)" style={ease} />
      ) : (
        <circle cx={x} cy={y} r={10} fill="var(--world-g)" style={ease} />
      )}
    </g>
  );
}

/**
 * THE MICROPHONE IN THE S-CURVE — drawn inside the Living G's own viewBox, in
 * the open pocket between the middle and lower loops (measured: x 125–355,
 * y 505–565). It never moves or reshapes the G; the touch target is an
 * invisible 88-unit circle (≈44 css px at phone size).
 */
export const MIC_CENTRE = { x: 262, y: 536 } as const;

export function VoiceMic({ onPress, listening = false }: { onPress: () => void; listening?: boolean }) {
  const { x, y } = MIC_CENTRE;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={listening ? "listening — tap to stop" : "speak to create"}
      data-voice-mic=""
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
      <circle cx={x} cy={y} r={44} fill="transparent" />
      <circle
        cx={x}
        cy={y}
        r={22}
        fill={listening ? "var(--world-g, currentColor)" : "none"}
        stroke="var(--world-g, currentColor)"
        strokeWidth={3}
        opacity={listening ? 0.9 : 0.55}
      />
      <g
        stroke={listening ? "var(--world-bg)" : "var(--world-g, currentColor)"}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        opacity={listening ? 1 : 0.8}
      >
        <rect x={x - 5} y={y - 13} width={10} height={17} rx={5} />
        <path d={`M ${x - 10} ${y - 2} a 10 10 0 0 0 20 0`} />
        <line x1={x} y1={y + 8} x2={x} y2={y + 12} />
      </g>
    </g>
  );
}

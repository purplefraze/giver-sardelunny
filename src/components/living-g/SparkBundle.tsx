import { useId } from "react";

/**
 * A BUNDLE OF SPARKS — never a plain ball.
 *
 * A quiet concentration of light: a soft halo built from flat, low-opacity
 * discs (no gradients — canon), a solid core, and a slow ring of tiny spark
 * particles that shimmer as they turn. The count lives INSIDE the bundle, so
 * "100 ✨" is the object itself rather than a caption about it.
 *
 * Drawn at the origin: position it with a <g transform="translate(x,y)">, so
 * movement can be transitioned as one object.
 */
export function SparkBundle({
  r = 46,
  count,
  colour = "var(--giver-generosity)",
  opacity = 1,
}: {
  r?: number;
  count?: number;
  colour?: string;
  opacity?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const motes = 7;

  return (
    <g opacity={opacity}>
      <style>{`
        @keyframes ${uid}-turn { to { transform: rotate(360deg); } }
        @keyframes ${uid}-shimmer {
          0%, 100% { opacity: .25; transform: scale(.7); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes ${uid}-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.045); }
        }
      `}</style>

      {/* THE HALO. Flat discs, faint to fainter — light, not a gradient. */}
      <g style={{ animation: `${uid}-breathe 2600ms ease-in-out infinite` }}>
        <circle r={r * 1.9} fill={colour} opacity={0.07} />
        <circle r={r * 1.45} fill={colour} opacity={0.12} />
        <circle r={r * 1.16} fill={colour} opacity={0.2} />
        <circle r={r} fill={colour} />
      </g>

      {/* THE MOTES. Tiny sparks turning slowly around the bundle. */}
      <g style={{ animation: `${uid}-turn 14s linear infinite` }}>
        {Array.from({ length: motes }, (_, i) => {
          const a = (i / motes) * Math.PI * 2;
          const d = r * (i % 2 === 0 ? 1.62 : 1.34);
          return (
            <circle
              key={i}
              cx={Math.cos(a) * d}
              cy={Math.sin(a) * d}
              r={r * (i % 3 === 0 ? 0.12 : 0.085)}
              fill={colour}
              style={{
                transformOrigin: `${Math.cos(a) * d}px ${Math.sin(a) * d}px`,
                animation: `${uid}-shimmer ${1500 + i * 230}ms ease-in-out infinite`,
              }}
            />
          );
        })}
      </g>

      {/* THE COUNT, living inside the light. */}
      {count !== undefined ? (
        <>
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--world-bg)"
            style={{
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              fontWeight: 900,
              fontSize: r * (count >= 100 ? 0.62 : 0.8),
              letterSpacing: "-0.04em",
            }}
          >
            {count}
          </text>
          {/* The Spark symbol, riding the bundle's own edge. */}
          <text
            x={r * 0.92}
            y={-r * 0.92}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: r * 0.5 }}
          >
            ✨
          </text>
        </>
      ) : (
        <circle r={r * 0.32} fill="var(--world-bg)" opacity={0.9} />
      )}

    </g>
  );
}

import { LABEL_LIFT, type RegionKey } from "./LivingG";
import { loopOrigin, wrapLines, wrapWidth } from "./loop-layout";
import {
  ACTION_LINE_HEIGHT,
  ACTION_SIZE,
  ACTION_WRAP_FACTOR,
  LOOP_ROLE_STYLE,
  LOOP_TEXT_FILL,
} from "./type-scale";

/** How long a first-visit loop hint lives: fade in, hold, fade out. */
export const LOOP_HINT_MS = 1800;

/**
 * A FAINT, SELF-DISSOLVING LOOP HINT.
 *
 * Laid out exactly like LivingG's own action prompt (same size token, wrap,
 * lift, tracking and in-loop fill), but it plays a one-shot CSS fade
 * (`.giver-loop-hint` in styles.css) instead of being a persistent label — so
 * a press-and-hold can never bring it back, and the loop is empty again once
 * it has played. Rendered through a region's `render`; `nonce` keys the group
 * so every new toggle use remounts it and the fade replays from the start,
 * even when the seat has not changed.
 */
export function loopHint(region: RegionKey, label: string, nonce: number | string = 0) {
  if (!label) return null;
  const size = ACTION_SIZE[region];
  const lines = wrapLines(label, size, wrapWidth(region, ACTION_WRAP_FACTOR), "action");
  if (lines.length === 0) return null;
  const origin = loopOrigin(region, LABEL_LIFT[region]);
  const line = size * ACTION_LINE_HEIGHT;

  return (
    <g
      key={`hint-${region}-${nonce}`}
      className="giver-loop-hint"
      style={{ animationDuration: `${LOOP_HINT_MS}ms` }}
    >
      <text
        x={origin.x}
        y={origin.y - ((lines.length - 1) * line) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={LOOP_TEXT_FILL}
        className="font-black lowercase"
        style={{
          fontSize: size,
          letterSpacing: LOOP_ROLE_STYLE.action.tracking,
        }}
      >
        {lines.map((text, i) => (
          <tspan key={text + i} x={origin.x} dy={i === 0 ? 0 : line}>
            {text}
          </tspan>
        ))}
      </text>
    </g>
  );
}

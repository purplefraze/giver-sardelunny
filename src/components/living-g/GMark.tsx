import { useId } from "react";
import {
  EAR_CUT,
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LOOP_CENTRE,
  RIM_PATCH,
  arcPath,
  wedgePath,
} from "./g-path";

/**
 * THE SMALL G — the canonical Living G artwork drawn small and static, top
 * left on a form, an onboarding page and the sign-in screen. Same path, same
 * flip, never redrawn: only an outline stroke (220 path units, the stills'
 * weight) so it holds up at 32–46px. Decorative: the seat colour is the only
 * thing it says.
 *
 * `earless` (sign-in, where the toggle lives on the big circle instead): the
 * ear is hidden by the same static EAR_CUT mask the Living G uses and the rim
 * is closed by RIM_PATCH — the canonical path itself is never edited.
 */
export function GMark({
  colour,
  height,
  earless = false,
  className,
}: {
  colour: string;
  /** Rendered height in px (for the -12..1145 artwork box). */
  height: number;
  earless?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const c = LOOP_CENTRE.middle;
  const glyph = (
    <g transform={LIVING_G_TRANSFORM} fill={colour}>
      <path
        d={LIVING_G_PATH}
        stroke={colour}
        strokeWidth={220}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      />
    </g>
  );
  return (
    <svg
      viewBox="-12 -12 600 1157"
      height={height}
      width={(height * 600) / 1157}
      className={className}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
      focusable="false"
    >
      {earless ? (
        <>
          <defs>
            <mask id={`gm-${id}`} maskUnits="userSpaceOnUse">
              <rect x="-400" y="-400" width="1400" height="2000" fill="#fff" />
              <path d={wedgePath(c, EAR_CUT.a0, EAR_CUT.a1, EAR_CUT.r0, EAR_CUT.r1)} fill="#000" />
            </mask>
          </defs>
          <g mask={`url(#gm-${id})`}>{glyph}</g>
          <path
            d={arcPath(c, RIM_PATCH.a0, RIM_PATCH.a1, RIM_PATCH.rMid)}
            fill="none"
            stroke={colour}
            strokeWidth={RIM_PATCH.width + 22}
          />
        </>
      ) : (
        glyph
      )}
    </svg>
  );
}

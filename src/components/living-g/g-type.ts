/**
 * THE ONE LIVING G TYPOGRAPHY TREATMENT.
 *
 * This is the "kindness is currency" treatment, lifted verbatim from the intro
 * and made canonical: Helvetica Neue, black display weight with tight optical
 * tracking for statements, and a heavier-than-usual 700 with wide 0.26em
 * tracking for the small labels above them. Nothing else may be introduced.
 *
 * Hierarchy inside the Living G comes from SIZE and PLACEMENT only — never from
 * a different face, a lighter weight, or a decorative treatment.
 */

/** The single family used by every word inside the Living G. */
export const G_FONT = '"Helvetica Neue", "HelveticaNeue", Helvetica, Arial, sans-serif';

/** The two registers, exactly as "kindness is currency" renders them. */
export const G_STATEMENT = { weight: 900, tracking: "-0.045em" } as const;
export const G_LABEL = { weight: 700, tracking: "0.26em" } as const;

/**
 * Style props for one line of Living G copy.
 *
 *   statement — the thing being said ("50 sparks are yours", "chemistry teacher")
 *   label     — the small tracked word above it ("giving", "community gives")
 */
export function gType(
  register: "statement" | "label",
  size: number,
  opacity = 1,
): React.CSSProperties {
  const r = register === "label" ? G_LABEL : G_STATEMENT;
  return {
    fontFamily: G_FONT,
    fontWeight: r.weight,
    fontSize: size,
    letterSpacing: r.tracking,
    opacity,
  };
}

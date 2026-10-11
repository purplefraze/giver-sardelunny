/**
 * THE ONE LIVING G TYPOGRAPHY TREATMENT.
 *
 * Luna's authorised reconciliation retains the intended Helvetica Neue family,
 * uses 700 emphasis and zero tracking. Bundled letterforms are not assumed.
 *
 * Hierarchy inside the Living G comes from SIZE and PLACEMENT only — never from
 * a different face, a lighter weight, or a decorative treatment.
 */

/** The single family used by every word inside the Living G. */
export const G_FONT = '"Helvetica Neue", "HelveticaNeue", Helvetica, Arial, sans-serif';

/** The two registers, exactly as "kindness is currency" renders them. */
export const G_STATEMENT = { weight: 700, tracking: "0" } as const;
export const G_LABEL = { weight: 700, tracking: "0" } as const;

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
    fontSize: Math.max(12, size),
    letterSpacing: r.tracking,
    opacity,
  };
}

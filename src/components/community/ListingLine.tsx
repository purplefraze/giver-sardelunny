import { CG_INK, type MapPin } from "@/data/communigy";

/** Category is explicit; colour never substitutes for the word. */
export function ListingLine({ mode, text }: Pick<MapPin, "mode" | "text">) {
  return <span className="cg-listing-line"><span style={{ color: CG_INK[mode] }} data-cg-prefix={mode}>{mode}:</span>{" "}<span data-cg-description="">{text}</span></span>;
}
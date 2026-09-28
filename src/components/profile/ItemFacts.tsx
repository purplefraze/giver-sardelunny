import type { Item } from "@/data/items";
import { typeWord } from "@/data/items";

/**
 * THE ONE RICH READING OF AN ITEM'S PARAMETERS — used by every person's
 * profile, every list and every detail view. What · when · where · how long ·
 * availability · notes, as organised editorial pairs, never a flat string.
 *
 * Only what actually exists is ever printed: no empty labels, no placeholders.
 */

export type Fact = { label: string; value: string };

/** Every structured parameter an item carries, in one canonical order. */
export function itemFacts(item: Item): Fact[] {
  const d = item.details;
  const out: Fact[] = [];
  if (item.type === "trade") {
    if (item.offer?.trim()) out.push({ label: "offering", value: item.offer.trim() });
    if (item.want?.trim()) out.push({ label: "wants back", value: item.want.trim() });
  }
  if (!d) return out;
  if (d.days?.length) out.push({ label: "days", value: d.days.join(" + ") });
  if (d.date) out.push({ label: "date", value: d.date });
  if (d.time) out.push({ label: "time", value: d.time });
  if (d.duration) out.push({ label: "how long", value: d.duration });
  if (d.where) out.push({ label: "where", value: d.where });
  if (d.cadence) out.push({ label: "how often", value: d.cadence });
  if (d.until) out.push({ label: "available until", value: d.until });
  for (const [key, value] of Object.entries(d.extras ?? {}))
    if (value.trim()) out.push({ label: key, value: value.trim() });
  return out;
}

/** THE SCANNABLE ONE-LINER version of the same facts, for dense lists. */
export function factLine(item: Item, extra: string[] = []): string {
  return [...itemFacts(item).map((f) => f.value), ...extra].join(" · ");
}

/** The word this item calls itself, plus the side of a borrow. */
export const itemKindWord = (item: Item) =>
  item.type === "borrow" && item.side === "lend"
    ? "lending"
    : item.type === "borrow"
      ? "wants to borrow"
      : typeWord(item);

export function ItemFacts({
  item,
  accent,
}: {
  item: Item;
  /** The item's own category colour. Labels stay quiet; values carry it. */
  accent: string;
}) {
  const facts = itemFacts(item);
  if (!facts.length && !item.note) return null;
  return (
    <div className="mt-6">
      {facts.length ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          {facts.map((f) => (
            <div key={`${f.label}-${f.value}`}>
              <dt className="g-meta">{f.label}</dt>
              <dd className="g-name mt-1.5" style={{ color: accent }}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {item.note ? (
        <div className="g-rule mt-7 pt-5">
          <p className="g-meta">notes</p>
          <p className="g-body mt-2 opacity-75">{item.note}</p>
        </div>
      ) : null}
    </div>
  );
}

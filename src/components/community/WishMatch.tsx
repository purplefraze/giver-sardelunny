import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ME_ID } from "@/data/items";
import { useItems } from "@/hooks/use-items";
import type { Pin } from "@/data/give-pins";
import { suggestedConnections } from "@/lib/suggested-connections";

/** Optional discovery only: never creates a Wish or calls a paid service. */
export function WishMatch({ onOpen, centre = null, radiusKm = null }: { onOpen?: (itemId: string) => void; centre?: Pin | null; radiusKm?: number | null }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const items = useItems();
  const matches = suggestedConnections(query, items.items, { ownerId: ME_ID, centre, radiusKm });
  return <section className="cg-suggestions" data-cg-wish-match="">
    <form onSubmit={e => { e.preventDefault(); setQuery(text); }}>
      <label className="g-meta" htmlFor="wish-match-query">possible connections</label>
      <div className="flex items-center gap-2">
        <input id="wish-match-query" aria-label="find a possible connection" value={text} onChange={e=>setText(e.target.value)} placeholder="cake, dog walking, science lessons…" className="min-w-0 flex-1 border-b bg-transparent py-2 text-foreground" />
        <Button variant="ghost" className="cg-filter" type="submit" disabled={!text.trim()}>find</Button>
      </div>
    </form>
    {query ? <p className="g-meta">a possibility, not a promise. choose who to contact.</p> : null}
    {query && !matches.length ? <p className="g-meta">nothing close yet{radiusKm !== null ? " within this radius" : ""}.</p> : null}
    {matches.map(m=><div key={m.item.id} className="border-b py-2">
      <Button variant="ghost" className="h-auto w-full flex-col items-start whitespace-normal text-left" onClick={()=>onOpen?.(m.item.id)}>
        <span className="g-body">{m.item.text}</span><span className="g-meta">{m.reason} · {m.distanceKm === null ? "distance unknown" : "approximate nearby area"}</span>
      </Button>
    </div>)}
  </section>;
}

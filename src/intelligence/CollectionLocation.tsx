import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { askLocation } from "@/data/my-location";
import { collectionLabelSchema, coarseCollectionPin, type CollectionLocation as Location } from "@/lib/collection-location";
import { conversation } from "./voice-conversation";
const CollectionMap = lazy(() => import("./CollectionMap").then(m => ({ default: m.CollectionMap })));

export function CollectionLocation({ draftId, value, location }: { draftId: string; value: string; location?: Location }) {
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(!location);
  const active = useRef(draftId); active.current = draftId;
  const useLocation = async () => {
    if (busy) return;
    setBusy(true); setProblem("");
    const id = draftId; const result = await askLocation();
    if (active.current !== id || conversation.currentDraftId() !== id) return;
    setBusy(false);
    if (!result.ok) { setProblem("location isn't available or allowed; place search needs to be connected"); return; }
    conversation.setCollectionLocation({ label: "near my current location", pin: coarseCollectionPin(result.pin), source: "device" }, id);
    setExpanded(false);
  };
  return <section className="gv-collection gv-field-wide">
    <label className="gv-field"><span>collection area</span><input aria-label="collection intersection or area" maxLength={100} value={value} placeholder="intersection or area and city" onChange={e => { const text = e.target.value; conversation.edit("where", text); const check = collectionLabelSchema.safeParse(text); setProblem(text && !check.success ? "choose a real collection area on earth" : ""); }} /></label>
    <div className="gv-answer-actions"><Button variant="ghost" type="button" disabled={busy} onClick={() => void useLocation()}>{busy ? "locating…" : "use my location"}</Button><Button variant="ghost" type="button" onClick={() => setExpanded(v => !v)}>{expanded ? "close area options" : "change collection area"}</Button></div>
    {expanded ? <><label className="gv-field"><span>place search</span><input aria-label="search place or address" placeholder="place search not connected" disabled /></label><p className="g-meta">place search needs google maps connected. typed areas aren't confirmed until located.</p>{location ? <Suspense fallback={<p className="g-meta">loading map…</p>}><CollectionMap key={draftId} pin={location.pin} onChange={pin => conversation.setCollectionLocation({ ...location, pin }, draftId)} onProblem={setProblem} /></Suspense> : null}</> : null}
    {location ? <p className="g-meta">approximate area only · share precise pickup details privately by choice</p> : null}
    {problem ? <p className="gv-problem" role="status">{problem}</p> : null}
  </section>;
}
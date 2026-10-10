import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { askLocation } from "@/data/my-location";
import { collectionLabelSchema, coarseCollectionPin, type CollectionLocation as Location } from "@/lib/collection-location";
import { conversation } from "./voice-conversation";
import { searchCollectionArea } from "@/lib/collection-search";
const CollectionMap = lazy(() => import("./CollectionMap").then(m => ({ default: m.CollectionMap })));

export function CollectionLocation({ draftId, value, location }: { draftId: string; value: string; location?: Location | undefined }) {
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(!location);
  const [results, setResults] = useState<Location[]>([]);
  const request = useRef<AbortController | null>(null);
  const active = useRef(draftId); active.current = draftId;
  useEffect(() => () => request.current?.abort(), [draftId]);
  const search = async () => {
    if (busy) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const id = draftId; const query = value;
    setBusy(true); setProblem(""); setResults([]);
    try {
      const found = await searchCollectionArea(query, controller.signal);
      if (controller.signal.aborted || conversation.currentDraftId() !== id || conversation.get().session?.fields.where !== query) return;
      setResults(found);
      if (!found.length) setProblem("no matching place found; enter an intersection or area and city");
    } catch (error) {
      if (!controller.signal.aborted && active.current === id) setProblem(error instanceof Error ? error.message : "place search is unavailable");
    } finally { if (active.current === id) setBusy(false); }
  };
  const useLocation = async () => {
    if (busy) return;
    setBusy(true); setProblem("");
    const id = draftId; const result = await askLocation();
    if (active.current !== id || conversation.currentDraftId() !== id) return;
    setBusy(false);
    if (!result.ok) { setProblem("location isn't available or allowed; search an intersection or area instead"); return; }
    conversation.setCollectionLocation({ label: "near my current location", pin: coarseCollectionPin(result.pin), source: "device" }, id);
    setExpanded(false);
  };
  return <section className="gv-collection gv-field-wide">
    <label className="gv-field"><span>where can someone collect it?</span><input aria-label="collection intersection or area" maxLength={100} value={value} placeholder="intersection or area and city" onChange={e => { request.current?.abort(); setBusy(false); setResults([]); setExpanded(true); const text = e.target.value; conversation.edit("where", text); const check = collectionLabelSchema.safeParse(text); setProblem(text && !check.success ? "choose a real collection area on earth" : ""); }} /></label>
    <div className="gv-answer-actions"><Button variant="ghost" type="button" disabled={busy} onClick={() => void useLocation()}>{busy ? "locating…" : "use my location"}</Button><Button variant="ghost" type="button" onClick={() => setExpanded(v => !v)}>{expanded ? "close area options" : "change collection area"}</Button></div>
    {expanded ? <><Button variant="ghost" type="button" disabled={busy || !collectionLabelSchema.safeParse(value).success} onClick={() => void search()}>{busy ? "searching…" : "search place or address"}</Button>{results.map((result, index) => <Button variant="ghost" type="button" key={`${result.label}-${index}`} onClick={() => { conversation.setCollectionLocation(result, draftId); setResults([]); setProblem(""); }}>{result.label}</Button>)}<p className="g-meta">select a matching area · no address is shared automatically</p>{location ? <Suspense fallback={<p className="g-meta">loading map…</p>}><CollectionMap key={`${draftId}-${location.label}`} pin={location.pin} onChange={pin => conversation.setCollectionLocation({ ...location, pin }, draftId)} onProblem={setProblem} /></Suspense> : null}</> : null}
    {location ? <p className="g-meta">approximate area only · share precise pickup details privately by choice</p> : null}
    {problem ? <p className="gv-problem" role="status">{problem}</p> : null}
  </section>;
}
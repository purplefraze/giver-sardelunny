import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { askLocation } from "@/data/my-location";
import { coarseCollectionPin } from "@/lib/collection-location";
import { WHERE_MODES, searchWhere, whereQueryProblem, type WhereMode, type WherePick } from "@/lib/where-options";
import { conversation } from "./voice-conversation";

/**
 * WHERE, as options — never free text ("the moon" cannot be a where).
 * exact / approximate use the device; intersection / neighbourhood / street
 * search OpenStreetMap on tap and only a picked result becomes the where.
 */
export function WhereField({ draftId, value }: { draftId: string; value: string }) {
  const [mode, setMode] = useState<WhereMode | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WherePick[]>([]);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [draftId]);
  const still = (id: string) => conversation.currentDraftId() === id;

  const device = async (m: "exact" | "approximate") => {
    setMode(m); setResults([]); setProblem(""); setBusy(true);
    const id = draftId; const r = await askLocation();
    setBusy(false);
    if (!still(id)) return;
    if (!r.ok) { setProblem("location isn't available or allowed; pick intersection, neighbourhood or street"); return; }
    conversation.placeWhere(m === "exact" ? "my exact location" : "near my current location", m === "exact" ? r.pin : coarseCollectionPin(r.pin));
    setMode(null);
  };
  const search = async () => {
    if (!mode || mode === "exact" || mode === "approximate" || busy) return;
    const bad = whereQueryProblem(mode, query);
    if (bad) { setProblem(bad); return; }
    request.current?.abort(); const c = new AbortController(); request.current = c;
    const id = draftId; setBusy(true); setProblem(""); setResults([]);
    try {
      const found = await searchWhere(mode, query, c.signal);
      if (c.signal.aborted || !still(id)) return;
      setResults(found);
      if (!found.length) setProblem(`no matching ${mode} found — check the spelling and add the city`);
    } catch (e) { if (!c.signal.aborted) setProblem(e instanceof Error ? e.message : "place search is unavailable"); }
    finally { if (!c.signal.aborted) setBusy(false); }
  };
  const typed = WHERE_MODES.find(m => m.mode === mode && m.placeholder);

  return <section className="gv-where" data-where-mode={mode ?? ""}>
    <p className="gv-where-label">where{value ? <> · <span className="gv-where-value">{value}</span></> : null}</p>
    <div className="gv-where-modes" role="group" aria-label="where options">
      {WHERE_MODES.map(m => <button type="button" key={m.mode} className="gv-where-mode" aria-pressed={mode === m.mode} disabled={busy && mode !== m.mode}
        onClick={() => { request.current?.abort(); setBusy(false); setResults([]); setProblem(""); if (m.mode === "exact" || m.mode === "approximate") void device(m.mode); else { setMode(m.mode); setQuery(""); } }}>{m.label}</button>)}
    </div>
    {typed ? <div className="gv-where-search">
      <label className="gv-field"><span className="sr-only">{typed.label}</span>
        <input aria-label={typed.label} value={query} maxLength={100} placeholder={typed.placeholder} enterKeyHint="search" autoCapitalize="none"
          onChange={e => { setQuery(e.target.value); setResults([]); setProblem(""); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void search(); } }} /></label>
      <Button variant="ghost" type="button" disabled={busy} onClick={() => void search()}>{busy ? "searching…" : "find"}</Button>
    </div> : null}
    {busy && (mode === "exact" || mode === "approximate") ? <p className="g-meta">locating…</p> : null}
    {results.map((r, i) => <Button variant="ghost" type="button" key={`${r.label}-${i}`} className="gv-where-result"
      onClick={() => { conversation.placeWhere(r.label, r.pin); setResults([]); setMode(null); setQuery(""); }}>{r.label}</Button>)}
    {problem ? <p className="gv-problem" role="status">{problem}</p> : null}
  </section>;
}

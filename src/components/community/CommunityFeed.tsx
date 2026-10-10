import { lazy, Suspense, useMemo } from "react";
import { ListingLine } from "./ListingLine";
import { ActivityDetail } from "./ActivityDetail";
import { Button } from "@/components/ui/button";
import { askLocation, useMyLocation } from "@/data/my-location";
import { type Pin } from "@/data/give-pins";
import { kmBetween, itemMode, listingPin, DEMO_REGION, isDemoListing, CG_WORD, type MapPin } from "@/data/communigy";
const CommunigyMap = lazy(() => import("./CommunigyMap").then(m => ({ default: m.CommunigyMap })));
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { seatPlacement } from "@/intelligence/seat-placement";
const CG_CLOCK: Record<string, number> = { map: 0, mine: 0, give: 45, lend: 90, trade: 135, everything: 180, fund: 225, borrow: 270, wish: 315 };

import { PerimeterToggle, type CgStation } from "@/components/community/PerimeterToggle";
import { WishMatch } from "@/components/community/WishMatch";
import { CG_INK, inMode, modeFor } from "@/data/communigy";
import { memberById } from "@/data/giver";
import { ME_ID, itemLine, itemsStore, type BorrowSide, type Item, type ItemType } from "@/data/items";
import { useItems } from "@/hooks/use-items";
import { CG_FILTERS, communityFilterOf, type CgSelection } from "@/intelligence/community-filter";
import { voiceCapture } from "@/intelligence/voice-capture";
import { searchTerm } from "@/intelligence/voice-router";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G — the lower loop. ONE selection drives the inside toggle, the
 * filter row and feed. 12:00 = blue all-types map; 6:00 = all list.
 *
 * SECTION CHANGES DISMISS THE OPEN LISTING: any deliberate change of station
 * (toggle crossing, filter tap, voice filter, a new initialSelection) closes
 * the previous detail and nested profile UI. Reselecting the same station,
 * opening a listing, and closing a detail never do.
 */
type Scope = "everyone" | "mine";
type View = "list" | "map";

const toStation = (s: CgSelection): CgStation => (s === "mine" ? "map" : s);
const fromStation = (s: CgStation): CgSelection => (s === "back" ? "map" : s);

/** Pure: what the feed lists for one selection. Only active, published posts. */
export function feedFor(items: Item[], sel: CgSelection, term = "", keep?: string): Item[] {
  void keep;
  const t = term.trim().toLowerCase();
  return items
    .filter((i) => i.status === "active" && i.published)
    .filter((i) => sel === "mine" ? i.ownerId === ME_ID : inMode(i, sel === "map" ? "everything" : sel))
    .filter((i) => !t || itemLine(i).toLowerCase().includes(t) || (i.note ?? "").toLowerCase().includes(t))
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

/** Pure: the section a deliberate change lands on, and whether the open detail must close. */
export function sectionChange(current: CgSelection, next: CgSelection): { sel: CgSelection; dismiss: boolean } {
  return { sel: next, dismiss: next !== current };
}

/** The visible heading word for a selection (always lowercase). */
export const sectionWord = (s: CgSelection) => (s === "map" ? "map" : s === "mine" ? "mine" : s === "everything" ? "all" : CG_WORD[s]);

export function CommunityFeed({
  initialType = null,
  initialView = "map",
  initialSide,
  initialScope,
  initialSelection,
  initialTerm = "",
  highlightId,
  onOpen,
  onClose,
  onExit,
  detailId,
  onCloseDetail,
  onSectionChange,
  onOpenConnection,
  onOpenProfile,
  onNeedGive,
  onStartGive,
}: {
  initialType?: ItemType | null;
  initialScope?: Scope;
  initialView?: View;
  initialSide?: BorrowSide;
  initialSelection?: CgSelection;
  initialTerm?: string;
  highlightId?: string;
  onOpen: (itemId: string) => void;
  onOpenProfile?: (ownerId: string) => void;
  onEditMine?: (itemId: string) => void;
  onClose: () => void;
  /** The explicit back arrow: out to the full G. */
  onExit?: () => void;
  detailId?: string | null;
  onCloseDetail?: () => void;
  /** A deliberate section change: the host closes nested profile/connection UI. */
  onSectionChange?: (next: CgSelection) => void;
  onOpenConnection?: (id: string) => void;
  onNeedGive?: () => void;
  onStartGive?: () => void;
}) {
  const [sel, setSel] = useState<CgSelection>(
    initialSelection ?? (initialScope === "mine" ? "mine" : initialType ? modeFor(initialType, initialSide) : "map"),
  );
  const selRef = useRef(sel);
  selRef.current = sel;
  const [record, setRecord] = useState(false);
  const [term, setTerm] = useState(initialTerm);
  const [typed, setTyped] = useState("");
  const voice = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const items = useItems();
  const listening = voice.state === "listening";
  const ink = sel === "map" ? "var(--mode-giver)" : CG_INK[sel === "mine" ? "everything" : sel];
  const location = useMyLocation();
  /* The map exists ONLY at the lower loop's 12 o'clock seat; every other
     seat is a list. No independent view state can carry a map elsewhere. */
  void initialView;
  const view: View = sel === "map" ? "map" : "list";
  const [mapList, setMapList] = useState(false);
  const [sort, setSort] = useState<"latest" | "oldest" | "nearest">("latest");
  const [radius, setRadius] = useState<number | null>(null);
  const [manual, setManual] = useState<Pin | null>(null);
  const [area, setArea] = useState("");
  const [areaBusy, setAreaBusy] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: "", lng: "" });
  const [locationProblem, setLocationProblem] = useState("");
  const centre = manual ?? location?.pin ?? null;
  const list = arrangeFeed(feedFor(items.items, sel, term, highlightId), sort, centre, radius);
  const pinKey = list.map(i => `${i.id}:${i.updatedAt}`).join("|");
  const pins: MapPin[] = useMemo(() => list.flatMap(i => { const pin = listingPin(i); return pin ? [{ id:i.id, mode:itemMode(i), pin, text:itemLine(i), itemId:i.id, sample:isDemoListing(i), exact:false }] : []; }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the listed records
    [pinKey]);
  const samplePins = pins.some(p => p.sample);
  const selectedTab = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { selectedTab.current?.scrollIntoView({ block:"nearest", inline:"nearest" }); }, [sel]);
  useEffect(() => () => { voiceCapture.cancel(); }, []);
  const root = useRef<HTMLDivElement>(null);
  /* NORMAL DETAIL RETURN keeps the list where it was: the page stays mounted
     (hidden) under the detail, and its scroll offset is restored on return. */
  const listBox = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);
  useLayoutEffect(() => {
    const ul = listBox.current?.querySelector<HTMLElement>(".cg-list, [data-cg-results]");
    if (!ul) return;
    if (detailId) return;
    ul.scrollTop = savedScroll.current;
  }, [detailId]);
  const openItem = (id: string) => {
    const ul = listBox.current?.querySelector<HTMLElement>(".cg-list");
    savedScroll.current = ul?.scrollTop ?? 0;
    onOpen(id);
  };

  /** THE ONE WAY A SECTION CHANGES. */
  const cbs = useRef({ onCloseDetail, onSectionChange, detailId });
  cbs.current = { onCloseDetail, onSectionChange, detailId };
  const go = (next: CgSelection) => {
    const change = sectionChange(selRef.current, next);
    if (!change.dismiss) return;
    savedScroll.current = 0;
    if (cbs.current.detailId) cbs.current.onCloseDetail?.();
    cbs.current.onSectionChange?.(change.sel);
    selRef.current = change.sel;
    setSel(change.sel);
  };

  useEffect(() => { const el = root.current; if (!el) return; const leave = () => (onExit ?? onClose)(); el.addEventListener("giver:community-return", leave); return () => el.removeEventListener("giver:community-return", leave); }, [onExit, onClose]);
  /* PINCH TO RETURN: two fingers inward, both OUTSIDE the map (map pinch stays
     map zoom), contracts the expanded world; past ~45% it returns to the whole
     G, otherwise it springs back. Recording stops as the pinch begins. */
  const exitRef = useRef(onExit ?? onClose);
  exitRef.current = onExit ?? onClose;
  useEffect(() => {
    const el = root.current; if (!el) return;
    let d0 = 0, p = 0, active = false, raf = 0;
    const onMap = (t: Touch) => !!(t.target as Element | null)?.closest?.(".leaflet-container");
    const dist = (e: TouchEvent) => Math.hypot(e.touches[0]!.clientX - e.touches[1]!.clientX, e.touches[0]!.clientY - e.touches[1]!.clientY);
    const paint = (k: number) => { el.style.transform = k ? `scale(${1 - 0.55 * k})` : ""; el.style.opacity = k ? String(1 - 0.6 * k) : ""; el.dataset["cgPinch"] = k.toFixed(2); };
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 2 || active || onMap(e.touches[0]!) || onMap(e.touches[1]!)) return;
      active = true; d0 = dist(e) || 1; p = 0; cancelAnimationFrame(raf);
      voiceCapture.cancel(); setRecord(false);
    };
    const move = (e: TouchEvent) => { if (!active || e.touches.length < 2) return; e.preventDefault(); p = Math.max(0, Math.min(1, (d0 - dist(e)) / (d0 * .55))); paint(p); };
    const end = (e: TouchEvent) => {
      if (!active || e.touches.length >= 2) return; active = false;
      const to = p > .45 ? 1 : 0, from = p, t0 = performance.now(), reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches, ms = reduced ? 0 : 240;
      const step = (now: number) => { const k = ms ? Math.min(1, (now - t0) / ms) : 1; p = from + (to - from) * (1 - (1 - k) ** 3); paint(p); if (k < 1) raf = requestAnimationFrame(step); else if (to === 1) exitRef.current(); else paint(0); };
      raf = requestAnimationFrame(step);
    };
    el.addEventListener("touchstart", start, { passive: true }); el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, []);
  const allowLocation = async () => { const result = await askLocation(); if (!result.ok) setLocationProblem(result.reason === "denied" ? "location isn't allowed. choose a map centre below." : "location isn't available. choose a map centre below."); else setLocationProblem(""); };

  /* An external selection (voice from the whole G, a link) is a deliberate change too. */
  useEffect(() => {
    if (initialSelection) go(initialSelection);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the host's selection changes
  }, [initialSelection]);

  /** Words in communi-g: a filter ("show borrows") or a search in this seat. */
  const heard = (words: string) => {
    const f = communityFilterOf(words, true);
    if (f) {
      go(f);
      setTerm("");
      return;
    }
    const s = searchTerm(words.replace(/^(?:show me|find|search for|looking for|i'?m looking for)\s+/i, ""));
    setTerm(s);
  };
  const heardRef = useRef(heard);
  heardRef.current = heard;
  useEffect(() => {
    if (!record) return;
    const off = voiceCapture.onFinal((w) => heardRef.current(w));
    return () => {
      off();
    };
  }, [record]);

  const findArea = async () => {
    if (!area.trim() || areaBusy) return;
    setAreaBusy(true); setLocationProblem("");
    try {
      const response=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(area.trim())}`,{headers:{Accept:"application/json"}});
      if (!response.ok) throw new Error("area search unavailable");
      const results=await response.json() as {lat:string;lon:string}[]; const first=results[0];
      if (!first) setLocationProblem("no area found. try neighbourhood and city.");
      else setManual({lat:Number(first.lat),lng:Number(first.lon)});
    } catch { setLocationProblem("area search isn't available. allow location or enter a centre below."); }
    finally { setAreaBusy(false); }
  };
  const choose = (v: CgSelection) => {
    haptics.selection();
    go(v);
  };
  /* Seat-dependent placement: content sits away from the inside toggle. */
  const place = seatPlacement(CG_CLOCK[sel] ?? 180);

  const where = CG_FILTERS.find((f) => f.value === sel)?.word ?? "all";
  /* Only show a detail that is still a listing in the store. */
  const showDetail = !!detailId;

  return (
    <div
      ref={root}
      data-world="communigy"
      data-cg-mode={sel}
      data-cg-detail-open={showDetail ? "1" : "0"}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--world-bg)", ["--cg-ink" as string]: ink }}
    >
      <PerimeterToggle
        value={toStation(sel)}
        onChange={(st) => { if (st !== "back") go(fromStation(st)); }}
        onBack={onExit ?? onClose}
        header={showDetail ? undefined : <p className="cg-head" data-cg-head=""><span className="cg-head-cat" style={{ color: ink }}>{sectionWord(sel)}</span><span className="cg-context">communi-g</span></p>}
        backdrop={view === "map" ? <Suspense fallback={null}><CommunigyMap pins={pins} centre={centre} radiusKm={radius} onOpen={openItem} /></Suspense> : undefined}
        backdropHidden={showDetail}
        record={record}
        listening={listening}
        onHold={() => {
          if (record) voiceCapture.stop();
          else voiceCapture.prepare();
          setRecord((r) => !r);
        }}
        onTap={() => {
          if (!record) return;
          if (listening) voiceCapture.stop();
          else voiceCapture.start();
        }}
      >
        <div className="relative h-full w-full" ref={listBox}>
        {showDetail && detailId ? <div className="absolute inset-0 z-[2]"><ActivityDetail key={detailId} itemId={detailId} embedded onClose={onCloseDetail ?? onClose} onOpenConnection={onOpenConnection ?? (() => {})} onOpenProfile={onOpenProfile} onNeedGive={onNeedGive} onStartGive={onStartGive} /></div> : null}
        <div className="flex h-full w-full flex-col overflow-hidden" data-cg-interior-page="" data-cg-view={view} data-align={place.align} style={{ textAlign: place.align, ...(showDetail ? { visibility: "hidden", pointerEvents: "none" } : {}) }} aria-hidden={showDetail || undefined} {...(showDetail ? { inert: true } : {})}>
          <Button variant="ghost" type="button" className="sr-only focus:not-sr-only" onClick={() => (onExit ?? onClose)()}>back to the living g</Button>
          <div role="tablist" aria-label="community filter" className="cg-filters">
            {CG_FILTERS.map(f => <Button variant="ghost" key={f.value} ref={f.value === sel ? selectedTab : undefined} role="tab" aria-selected={f.value === sel} data-cg-filter={f.value} onClick={() => choose(f.value)} className="cg-filter">{f.word}</Button>)}
          </div>
          <div className="cg-tools">
            <select aria-label="sort listings" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="latest">latest</option><option value="oldest">oldest</option><option value="nearest">nearest</option></select>
            <select aria-label="nearby radius" value={radius ?? "all"} onChange={e => setRadius(e.target.value === "all" ? null : Number(e.target.value))}><option value="all">any distance</option>{[2,5,10,25].map(km => <option key={km} value={km}>{km} km</option>)}</select>
            <Button variant="ghost" className="cg-filter" onClick={() => void allowLocation()}>near me</Button>
          </div>
          {(radius !== null || sort === "nearest" || (view === "map" && !samplePins)) && !centre ? <div className="cg-location">
            <p>{locationProblem || "allow approximate location, or choose a map centre."}</p>
            <form onSubmit={e=>{e.preventDefault();void findArea();}}><input aria-label="neighbourhood and city" placeholder="neighbourhood and city" value={area} onChange={e=>setArea(e.target.value)} className="w-full bg-transparent border-b py-1" /><Button variant="ghost" type="submit" className="cg-filter" disabled={areaBusy}>find area</Button></form>
            <details><summary>choose coordinates instead</summary><form onSubmit={e => { e.preventDefault(); const lat = Number(coordinates.lat), lng = Number(coordinates.lng); if (!coordinates.lat || !coordinates.lng || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) { setLocationProblem("enter valid latitude and longitude for your area."); return; } setManual({lat,lng}); setLocationProblem(""); }}>
              <input aria-label="area latitude" placeholder="area latitude" inputMode="decimal" value={coordinates.lat} onChange={e => setCoordinates(c => ({...c,lat:e.target.value}))} className="w-full bg-transparent border-b py-1" />
              <input aria-label="area longitude" placeholder="area longitude" inputMode="decimal" value={coordinates.lng} onChange={e => setCoordinates(c => ({...c,lng:e.target.value}))} className="w-full bg-transparent border-b py-1" />
              <Button variant="ghost" type="submit" className="cg-filter">use this centre</Button>
            </form></details>
          </div> : null}
          {record ? (
            <form
              className="mb-2"
              onSubmit={(e) => {
                e.preventDefault();
                heard(typed);
                setTyped("");
              }}
            >
              <p className="g-body text-[15px]" style={{ color: ink }}>
                {sel === "everything" || sel === "map" ? "what are you looking for in the community?" : `what ${where} are you looking for?`}
              </p>
              <input
                aria-label="or type here"
                placeholder="or type here"
                autoCapitalize="none"
                className="w-full border-b bg-transparent py-1 text-[15px] outline-none"
                style={{ textAlign: place.align }}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
              {voice.state === "listening" ? <p className="g-meta mt-1" role="status">listening…</p> : voice.state === "error" ? <p className="g-meta mt-1" role="status">{voice.error}</p> : voice.state === "unsupported" ? <p className="g-meta mt-1" role="status">voice isn't available in this browser. type instead.</p> : null}
              {voice.transcript ? <p className="g-meta mt-1 opacity-70">{voice.transcript}</p> : null}
            </form>
          ) : null}
          {term ? (
            <Button variant="ghost" type="button" className={`g-meta mb-2 underline ${place.align === "left" ? "self-start" : place.align === "right" ? "self-end" : "self-center"}`} onClick={() => setTerm("")}>
              “{term}” · clear
            </Button>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col" data-cg-results="" style={{justifyContent: "flex-start"}}>
          {view === "map" ? <div className="cg-map-note"><span className="cg-map-count">{pins.length ? `${pins.length} on the map${samplePins ? ` · ${DEMO_REGION}` : ""}` : "no matching listings with a shared approximate location."}</span> <Button variant="ghost" type="button" className="cg-filter" aria-expanded={mapList} onClick={() => setMapList(v => !v)}>{mapList ? "hide list" : "show list"}</Button></div> : null}{view === "map" && !mapList ? null : <ul className="cg-list" data-cg-feed={sel} data-place-y={place.y}>
            {list.map((i) => (
              <li
                key={i.id}
                className="border-b py-2"
                style={{ borderColor: "var(--border)", ...(i.id === highlightId ? { color: ink } : {}) }}
                {...(i.id === highlightId ? { "data-cg-new": "", "aria-current": "true" as const } : {})}
                ref={i.id === highlightId ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
              >
                <Button variant="ghost" type="button" className="w-full" style={{ textAlign: place.align, color: "var(--foreground)" }} onClick={() => openItem(i.id)} data-cg-item={i.type} data-cg-item-id={i.id}>
                  <span className="g-body block text-[15px]"><ListingLine mode={itemMode(i)} text={itemLine(i)} /></span>
                  <span className="g-meta block text-muted-foreground">
                    {sel === "mine" ? (i.type === "borrow" && i.side === "lend" ? "lend" : i.type) : (memberById(i.ownerId)?.username ?? "")}
                  </span>
                </Button>
              </li>
            ))}
            {!list.length ? (
              <li className="g-body py-4 opacity-70">
                {term ? `nothing matching “${term}” here yet.` : sel === "mine" ? "no active posts of yours in communi-g yet." : `no active ${where} right now.`}
              </li>
            ) : null}
            {sel === "wish" ? <li className="pt-4"><WishMatch onOpen={openItem} /></li> : null}
          </ul>}
          </div>
        </div>
        </div>
      </PerimeterToggle>
    </div>
  );
}

export function arrangeFeed(items: Item[], sort: "latest" | "oldest" | "nearest", centre: Pin | null, radius: number | null, getPin: (id: string) => Pin | null = (id) => { const item = itemsStore.get().items.find(i => i.id === id); return item ? listingPin(item) : null; }): Item[] {
  const distance = (i:Item) => { const pin = getPin(i.id); return centre && pin ? kmBetween(centre, pin) : null; };
  return items.filter(i => radius === null || (distance(i) !== null && (distance(i) ?? Infinity) <= radius))
    .sort((a,b) => sort === "oldest" ? a.createdAt-b.createdAt || a.id.localeCompare(b.id) : sort === "nearest" ? (distance(a) ?? Infinity)-(distance(b) ?? Infinity) || b.createdAt-a.createdAt || a.id.localeCompare(b.id) : b.createdAt-a.createdAt || a.id.localeCompare(b.id));
}

import { lazy, Suspense } from "react";
import { ListingLine } from "./ListingLine";
import { Button } from "@/components/ui/button";
import { askLocation, useMyLocation } from "@/data/my-location";
import { pinFor, type Pin } from "@/data/give-pins";
import { kmBetween, itemMode, CG_WORD, type MapPin } from "@/data/communigy";
const CommunigyMap = lazy(() => import("./CommunigyMap").then(m => ({ default: m.CommunigyMap })));
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { seatPlacement } from "@/intelligence/seat-placement";
const CG_CLOCK: Record<string, number> = { map: 0, mine: 0, give: 45, lend: 90, trade: 135, everything: 180, fund: 225, borrow: 270, wish: 315 };

import { BackArrow } from "@/components/BackArrow";
import { PerimeterToggle, type CgStation } from "@/components/community/PerimeterToggle";
import { WishMatch } from "@/components/community/WishMatch";
import { CG_INK, inMode, modeFor } from "@/data/communigy";
import { memberById } from "@/data/giver";
import { ME_ID, itemLine, type BorrowSide, type Item, type ItemType } from "@/data/items";
import { useItems } from "@/hooks/use-items";
import { CG_FILTERS, communityFilterOf, type CgSelection } from "@/intelligence/community-filter";
import { voiceCapture } from "@/intelligence/voice-capture";
import { searchTerm } from "@/intelligence/voice-router";
import { haptics } from "@/lib/haptics";

/**
 * COMMUNI-G — the lower loop. ONE selection drives the inside toggle, the
 * filter row and feed. 12:00 = blue all-types map; 6:00 = all list.
 * The explicit return remains available until real S-curve routing is defined.
 * Hold the toggle for voice (record icon), tap it to listen.
 */
type Scope = "everyone" | "mine";
type View = "list" | "map";

const toStation = (s: CgSelection): CgStation => (s === "mine" ? "map" : s);
const fromStation = (s: CgStation): CgSelection => (s === "back" ? "map" : s);

/** Pure: what the feed lists for one selection. Only active, published posts. */
export function feedFor(items: Item[], sel: CgSelection, term = "", keep?: string): Item[] {
  const t = term.trim().toLowerCase();
  return items
    .filter((i) => i.status === "active" && i.published)
    .filter((i) => sel === "mine" ? i.ownerId === ME_ID : inMode(i, sel === "map" ? "everything" : sel))
    .filter((i) => !t || itemLine(i).toLowerCase().includes(t) || (i.note ?? "").toLowerCase().includes(t))
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

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
}) {
  const [sel, setSel] = useState<CgSelection>(
    initialSelection ?? (initialScope === "mine" ? "mine" : initialType ? modeFor(initialType, initialSide) : "map"),
  );
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
  const pins: MapPin[] = list.flatMap(i => { const pin = pinFor(i.id); return pin ? [{ id:i.id, mode:itemMode(i), pin, text:itemLine(i), itemId:i.id, sample:i.id.startsWith("seed-"), exact:false }] : []; });
  const selectedTab = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { selectedTab.current?.scrollIntoView({ block:"nearest", inline:"nearest" }); }, [sel]);
  useEffect(() => () => { voiceCapture.cancel(); }, []);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = root.current; if (!el) return; const leave = () => (onExit ?? onClose)(); el.addEventListener("giver:community-return", leave); return () => el.removeEventListener("giver:community-return", leave); }, [onExit, onClose]);
  const allowLocation = async () => { const result = await askLocation(); if (!result.ok) setLocationProblem(result.reason === "denied" ? "location isn't allowed. choose a map centre below." : "location isn't available. choose a map centre below."); else setLocationProblem(""); };


  useEffect(() => {
    if (initialSelection) setSel(initialSelection);
  }, [initialSelection]);

  /** Words in communi-g: a filter ("show borrows") or a search in this seat. */
  const heard = (words: string) => {
    const f = communityFilterOf(words, true);
    if (f) {
      setSel(f);
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
    setSel(v);
  };
  /* Seat-dependent placement: content sits away from the inside toggle. */
  const place = seatPlacement(CG_CLOCK[sel] ?? 180);
  
  const where = CG_FILTERS.find((f) => f.value === sel)?.word ?? "all";

  return (
    <div
      ref={root}
      data-world="communigy"
      data-cg-mode={sel}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--world-bg)", ["--cg-ink" as string]: ink }}
    >
      <p className="cg-context">{"communi-g"}</p>
      <PerimeterToggle
        value={toStation(sel)}
        onChange={(st) => { if (st !== "back") setSel(fromStation(st)); }}
        onBack={onExit ?? onClose}
        backdrop={view === "map" ? <Suspense fallback={null}><CommunigyMap pins={pins} centre={centre} radiusKm={radius} onOpen={onOpen} /></Suspense> : undefined}
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
        <div className="flex h-full w-full flex-col overflow-hidden" data-cg-interior-page="" data-cg-view={view} data-align={place.align} style={{ textAlign: place.align }}>
          <div className="relative h-10 shrink-0">
            <BackArrow onClick={onExit ?? onClose} label="back to the living g" />
          </div>
          <div role="tablist" aria-label="community filter" className="cg-filters">
            {CG_FILTERS.map(f => <Button variant="ghost" key={f.value} ref={f.value === sel ? selectedTab : undefined} role="tab" aria-selected={f.value === sel} data-cg-filter={f.value} onClick={() => choose(f.value)} className="cg-filter">{f.word}</Button>)}
          </div>
          <div className="cg-tools">
            <select aria-label="sort listings" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="latest">Latest</option><option value="oldest">Oldest</option><option value="nearest">Nearest</option></select>
            <select aria-label="nearby radius" value={radius ?? "all"} onChange={e => setRadius(e.target.value === "all" ? null : Number(e.target.value))}><option value="all">Any distance</option>{[2,5,10,25].map(km => <option key={km} value={km}>{km} km</option>)}</select>
            <Button variant="ghost" className="cg-filter" onClick={() => void allowLocation()}>near me</Button>
          </div>
          {(view === "map" || radius !== null || sort === "nearest") && !centre ? <div className="cg-location">
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
                className="w-full border-b bg-transparent py-1 text-[15px] outline-none"
                style={{ textAlign: place.align }}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
              {voice.transcript ? <p className="g-meta mt-1 opacity-70">{voice.transcript}</p> : null}
            </form>
          ) : null}
          {term ? (
            <Button variant="ghost" type="button" className={`g-meta mb-2 underline ${place.align === "left" ? "self-start" : place.align === "right" ? "self-end" : "self-center"}`} onClick={() => setTerm("")}>
              “{term}” · clear
            </Button>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col" data-cg-results="" style={{justifyContent: view === "map" ? "flex-start" : sel === "wish" || sel === "give" || sel === "mine" ? "flex-start" : place.y < 0 ? "flex-start" : place.y > 0 ? "flex-end" : "center"}}>
          {view === "map" ? <div className="cg-map-note"><span className="g-meta">{pins.length ? `${pins.length} on the map` : "no matching listings with a shared approximate location."}</span> <Button variant="ghost" type="button" className="cg-filter" aria-expanded={mapList} onClick={() => setMapList(v => !v)}>{mapList ? "hide list" : "show list"}</Button></div> : null}{view === "map" && !mapList ? null : <ul className={sel === "wish" || sel === "give" || sel === "mine" ? "cg-list cg-list-fill" : "cg-list"} data-cg-feed={sel} data-place-y={place.y}>
            {list.map((i) => (
              <li
                key={i.id}
                className="border-b py-2"
                style={{ borderColor: "var(--border)", ...(i.id === highlightId ? { color: ink } : {}) }}
                {...(i.id === highlightId ? { "data-cg-new": "", "aria-current": "true" as const } : {})}
                ref={i.id === highlightId ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
              >
                <Button variant="ghost" type="button" className="w-full" style={{ textAlign: place.align, color: "var(--foreground)" }} onClick={() => onOpen(i.id)} data-cg-item={i.type}>
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
            {sel === "wish" ? <li className="pt-4"><WishMatch onOpen={onOpen} /></li> : null}
          </ul>}
          </div>
        </div>
      </PerimeterToggle>
    </div>
  );
}

export function arrangeFeed(items: Item[], sort: "latest" | "oldest" | "nearest", centre: Pin | null, radius: number | null, getPin: (id:string) => Pin | null = pinFor): Item[] {
  const distance = (i:Item) => { const pin = getPin(i.id); return centre && pin ? kmBetween(centre, pin) : null; };
  return items.filter(i => radius === null || (distance(i) !== null && (distance(i) ?? Infinity) <= radius))
    .sort((a,b) => sort === "oldest" ? a.createdAt-b.createdAt || a.id.localeCompare(b.id) : sort === "nearest" ? (distance(a) ?? Infinity)-(distance(b) ?? Infinity) || b.createdAt-a.createdAt || a.id.localeCompare(b.id) : b.createdAt-a.createdAt || a.id.localeCompare(b.id));
}

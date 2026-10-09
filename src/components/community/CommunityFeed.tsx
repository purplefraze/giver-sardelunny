import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { seatPlacement } from "@/intelligence/seat-placement";
const CG_CLOCK: Record<string, number> = { mine: 0, give: 45, lend: 90, trade: 135, everything: 180, fund: 225, borrow: 270, wish: 315 };

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
 * filter row and the feed. 6:00 = all community posts · 12:00 = my g (my own
 * active community posts; never an exit) · the back arrow returns to the G.
 * Hold the toggle for voice (record icon), tap it to listen.
 */
type Scope = "everyone" | "mine";
type View = "list" | "map";

const toStation = (s: CgSelection): CgStation => (s === "mine" ? "exit" : s);
const fromStation = (s: CgStation): CgSelection => (s === "exit" ? "mine" : s);

/** Pure: what the feed lists for one selection. Only active, published posts. */
export function feedFor(items: Item[], sel: CgSelection, term = ""): Item[] {
  const t = term.trim().toLowerCase();
  return items
    .filter((i) => i.status === "active" && i.published)
    .filter((i) => (sel === "mine" ? i.ownerId === ME_ID : i.ownerId !== ME_ID && inMode(i, sel)))
    .filter((i) => !t || itemLine(i).toLowerCase().includes(t) || (i.note ?? "").toLowerCase().includes(t))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function CommunityFeed({
  initialType = null,
  initialSide,
  initialScope,
  initialSelection,
  onOpen,
  onClose,
  onExit,
}: {
  initialType?: ItemType | null;
  initialScope?: Scope;
  initialView?: View;
  initialSide?: BorrowSide;
  initialSelection?: CgSelection;
  onOpen: (itemId: string) => void;
  onOpenProfile?: (ownerId: string) => void;
  onEditMine?: (itemId: string) => void;
  onClose: () => void;
  /** The explicit back arrow: out to the full G. */
  onExit?: () => void;
}) {
  const [sel, setSel] = useState<CgSelection>(
    initialSelection ?? (initialScope === "mine" ? "mine" : modeFor(initialType, initialSide)),
  );
  const [record, setRecord] = useState(false);
  const [term, setTerm] = useState("");
  const [typed, setTyped] = useState("");
  const voice = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const items = useItems();
  const listening = voice.state === "listening";
  const ink = CG_INK[sel === "mine" ? "everything" : sel];
  const list = feedFor(items.items, sel, term);

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

  const choose = (v: CgSelection) => {
    haptics.selection();
    setSel(v);
  };
  /* Seat-dependent placement: content sits away from the inside toggle. */
  const place = seatPlacement(CG_CLOCK[sel] ?? 180);
  const rowJustify = place.align === "left" ? "justify-start" : place.align === "right" ? "justify-end" : "justify-center";
  const where = CG_FILTERS.find((f) => f.value === sel)?.word ?? "all";

  return (
    <div
      data-world="communigy"
      data-cg-mode={sel}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--world-bg)", ["--cg-ink" as string]: ink }}
    >
      <PerimeterToggle
        value={toStation(sel)}
        onChange={(st) => setSel(fromStation(st))}
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
        <div className="flex h-full w-full flex-col overflow-hidden" data-cg-interior-page="" data-align={place.align} style={{ textAlign: place.align }}>
          <div className="relative h-12 shrink-0">
            <BackArrow onClick={onExit ?? onClose} label="back to the living g" />
          </div>
          <div role="tablist" aria-label="community filter" className={`flex flex-wrap gap-x-3 gap-y-1 py-2 ${rowJustify}`}>
            {CG_FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={f.value === sel}
                data-cg-filter={f.value}
                type="button"
                onClick={() => choose(f.value)}
                className="g-name text-[14px]"
                style={{ color: f.value === sel ? ink : "var(--muted-foreground)", letterSpacing: 0, textDecoration: f.value === sel ? "underline" : "none", textUnderlineOffset: 4 }}
              >
                {f.word}
              </button>
            ))}
          </div>
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
                {sel === "everything" ? "what are you looking for in the community?" : `what ${where} are you looking for?`}
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
            <button type="button" className={`g-meta mb-2 underline ${place.align === "left" ? "self-start" : place.align === "right" ? "self-end" : "self-center"}`} onClick={() => setTerm("")}>
              “{term}” · clear
            </button>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col" style={{ justifyContent: place.y < 0 ? "flex-start" : place.y > 0 ? "flex-end" : "center" }}>
          <ul className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y" data-cg-feed={sel} data-place-y={place.y}>
            {list.map((i) => (
              <li key={i.id} className="border-b py-2" style={{ borderColor: "var(--border)" }}>
                <button type="button" className="w-full" style={{ textAlign: place.align }} onClick={() => onOpen(i.id)} data-cg-item={i.type}>
                  <span className="g-body block text-[15px]">{itemLine(i)}</span>
                  <span className="g-meta block opacity-60">
                    {sel === "mine" ? (i.type === "borrow" && i.side === "lend" ? "lend" : i.type) : (memberById(i.ownerId)?.username ?? "")}
                  </span>
                </button>
              </li>
            ))}
            {!list.length ? (
              <li className="g-body py-4 opacity-70">
                {term ? `nothing matching “${term}” here yet.` : sel === "mine" ? "you have no active posts in the community." : `no active ${where} right now.`}
              </li>
            ) : null}
            {sel === "wish" ? <li className="pt-4"><WishMatch onOpen={onOpen} /></li> : null}
          </ul>
          </div>
        </div>
      </PerimeterToggle>
    </div>
  );
}

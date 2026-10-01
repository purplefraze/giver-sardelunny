import { useState } from "react";

import { ME_ID, itemsStore } from "@/data/items";
import { supabase } from "@/integrations/supabase/client";

/**
 * WISH SEAT — describe a wish, match it to open community offers.
 * The model runs in match-wish (Lovable AI Gateway). The browser never sees the key.
 * A wish is one short human line. Offers shown are real items only.
 */
type Match = {
  itemId: string;
  text: string;
  kind: string;
  why: string;
  fit: number;
};

const TITLE_MAX = 40;

export function WishMatch({ onOpen }: { onOpen?: (itemId: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);

  const find = async () => {
    const wish = text.trim().slice(0, TITLE_MAX);
    if (!wish || busy) return;
    setBusy(true);
    setNote("");
    setMatches(null);
    itemsStore.add(ME_ID, "wish", wish);
    const { data, error } = await supabase.functions.invoke("match-wish", {
      body: { wish },
    });
    setBusy(false);
    if (error || data?.error) {
      setNote(data?.error || "matching is quiet right now. the wish still stands.");
      setMatches(data?.matches ?? []);
      return;
    }
    const found = (data?.matches ?? []) as Match[];
    setMatches(found);
    if (!found.length) setNote("nothing close yet. the wish still stands.");
  };

  return (
    <div
      className="flex h-full w-full flex-col gap-4 px-6 pt-16"
      data-cg-wish-match=""
      style={{ color: "var(--cg-ink, #9D00FF)" }}
    >
      <label className="flex flex-col gap-2 text-sm lowercase">
        <span className="opacity-70">what do you wish for?</span>
        <input
          value={text}
          maxLength={TITLE_MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void find();
            }
          }}
          placeholder="keep it small and human"
          className="rounded-full border bg-transparent px-4 py-3 text-base outline-none"
          style={{ borderColor: "var(--cg-ink, #9D00FF)" }}
        />
      </label>
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => void find()}
        className="self-start rounded-full px-4 py-2 text-sm lowercase text-white disabled:opacity-40"
        style={{ background: "var(--cg-ink, #9D00FF)" }}
      >
        {busy ? "looking\u2026" : "find offers"}
      </button>
      {note ? <p className="text-sm lowercase opacity-70">{note}</p> : null}
      {matches && matches.length > 0 ? (
        <ul className="flex flex-col gap-3 overflow-auto pb-8">
          {matches.map((m) => (
            <li key={m.itemId}>
              <button
                type="button"
                onClick={() => onOpen?.(`cloud:${m.itemId}`)}
                className="w-full rounded-2xl border px-4 py-3 text-left"
                style={{ borderColor: "var(--cg-ink, #9D00FF)" }}
              >
                <span className="block text-xs uppercase tracking-wide opacity-60">{m.kind}</span>
                <span className="block text-base lowercase">{m.text}</span>
                {m.why ? <span className="mt-1 block text-sm opacity-70">{m.why}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

import { useEffect, useState, useSyncExternalStore } from "react";
import { FormQuestion } from "@/components/forms/UnifiedForm";
import { type ActionDraft } from "@/intelligence/action-draft";
import { bindUtterance, resolveChoice } from "@/intelligence/bind";
import { handoffOf } from "@/intelligence/handoff";
import { voiceCapture } from "@/intelligence/voice-capture";
import { routeVoice, type SearchSpec } from "@/intelligence/voice-router";
import { ME_ID, communityItems, detailBits, itemLine, ACTIVITY_FILL } from "@/data/items";
import { useItems } from "@/hooks/use-items";
import { haptics } from "@/lib/haptics";

/**
 * VOICE → DRAFT. Listening was started by the mic tap itself. The words stay
 * editable; reading them is local (no network). Nothing publishes here —
 * a resolved draft opens the existing form, which asks for what's missing.
 */
const LABEL: Record<string, string> = {
  give: "give",
  wish: "wish",
  borrow: "borrow",
  lend: "lend",
  trade: "trade",
  fund: "fund",
};

export function VoiceIntake({
  onResolved,
  onBack,
  onOpen,
}: {
  onResolved: (draft: ActionDraft) => void;
  /** Open one existing community listing (the same detail view browse uses). */
  onOpen: (itemId: string) => void;
  onBack: () => void;
}) {
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [asking, setAsking] = useState<ActionDraft | null>(null);
  const [search, setSearch] = useState<SearchSpec | null>(null);
  const items = useItems();

  /* Live transcript flows into the box until the person edits it. */
  useEffect(() => {
    if (!edited) setText(v.transcript);
  }, [v.transcript, edited]);

  useEffect(() => () => voiceCapture.cancel(), []);

  const reading = text.trim().length >= 2 ? bindUtterance(text) : null;
  const preview = text.trim().length >= 2 ? routeVoice(text) : null;
  const listening = v.state === "listening";

  const go = () => {
    if (!reading) return;
    voiceCapture.cancel();
    const route = routeVoice(text);
    if (route.intent === "search") {
      haptics.light();
      setSearch(route.search);
      return;
    }
    if (reading.action && handoffOf(reading)) {
      haptics.light();
      onResolved(reading);
    } else if (reading.clarification) setAsking(reading);
  };

  if (search) {
    const words = search.term.split(" ");
    const hits = communityItems(items, { excludeOwnerId: ME_ID })
      .filter((i) => (search.types.length ? search.types.includes(i.type) : true))
      .filter((i) => (i.type === "borrow" && search.side ? (i.side ?? "borrow") === search.side : true))
      .filter((i) => {
        const hay = `${itemLine(i)} ${i.text} ${detailBits(i).join(" ")}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => (search.nearby ? (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) : b.createdAt - a.createdAt));
    const alt = search.fallback.action === "borrow" ? "ask to borrow one" : "post a wish for one";
    return (
      <div className="g-page flex h-full flex-col gap-4 pt-16" data-voice-search={search.term}>
        <p className="g-meta" role="status" aria-live="polite">
          {hits.length
            ? `${hits.length} ${hits.length === 1 ? "match" : "matches"} for “${search.term}”${search.nearby ? ", nearest first" : ""}`
            : `nothing matches “${search.term}” yet`}
        </p>
        <ul className="flex-1 overflow-y-auto">
          {hits.map((i) => (
            <li key={i.id} className="g-rule py-3">
              <button
                type="button"
                className="g-heading block w-full text-left"
                style={{ color: ACTIVITY_FILL[i.type] }}
                onClick={() => {
                  haptics.selection();
                  onOpen(i.id);
                }}
              >
                {itemLine(i)}
              </button>
              <p className="g-meta opacity-60">
                {[i.distanceKm === undefined ? null : `${i.distanceKm} km`, ...detailBits(i)].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-6 pb-8">
          <button type="button" className="g-heading" onClick={() => onResolved(search.fallback)}>
            {alt}
          </button>
          <button type="button" className="g-meta" onClick={() => setSearch(null)}>
            change words
          </button>
          <button type="button" className="g-meta" onClick={onBack}>
            cancel
          </button>
        </div>
      </div>
    );
  }

  if (asking?.clarification) {
    return (
      <FormQuestion
        heading={asking.clarification.ask}
        options={asking.clarification.choices}
        selected={undefined}
        onPick={(say) => {
          const resolved = resolveChoice(asking, say);
          if (!resolved) {
            setAsking(null);
            return;
          }
          onResolved(resolved);
        }}
        onBack={() => setAsking(null)}
      />
    );
  }

  const status =
    v.state === "listening"
      ? "listening…"
      : v.state === "processing"
        ? "finishing…"
        : v.state === "unsupported"
          ? "speaking isn't available in this browser. type it instead."
          : v.state === "error"
            ? v.error
            : text
              ? "check your words, then continue."
              : "say or type what you have, or what you need.";

  return (
    <form
      className="g-page flex h-full flex-col gap-6 pt-16"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <p className="g-meta" role="status" aria-live="polite" data-voice-state={v.state}>
        {status}
      </p>
      <label className="flex flex-col gap-2">
        <span className="sr-only">your words</span>
        <textarea
          className="g-heading min-h-32 w-full resize-none bg-transparent outline-none"
          value={text}
          maxLength={300}
          placeholder="i'm getting rid of a fridge"
          onChange={(e) => {
            setEdited(true);
            if (listening) voiceCapture.stop();
            setText(e.target.value);
          }}
          autoFocus={v.state === "unsupported" || v.state === "error"}
        />
      </label>
      {preview?.intent === "search" ? (
        <p className="g-body" data-voice-reading="search">
          search · {preview.search.term}
        </p>
      ) : reading?.action ? (
        <p className="g-body" data-voice-reading={reading.action}>
          {LABEL[reading.action]}
          {reading.entities.item ? ` · ${reading.entities.item}` : ""}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-6 pb-8">
        {listening ? (
          <button type="button" className="g-heading" onClick={() => voiceCapture.stop()}>
            stop
          </button>
        ) : v.state !== "unsupported" ? (
          <button
            type="button"
            className="g-meta"
            onClick={() => {
              setEdited(false);
              voiceCapture.start();
            }}
          >
            speak again
          </button>
        ) : null}
        <button type="submit" className="g-heading" disabled={!reading}>
          continue
        </button>
        <button
          type="button"
          className="g-meta"
          onClick={() => {
            voiceCapture.cancel();
            onBack();
          }}
        >
          cancel
        </button>
      </div>
      <p className="g-meta opacity-60">
        your browser's own speech service turns your voice into words. giver doesn't record or keep audio.
      </p>
    </form>
  );
}

import { useEffect, useState, useSyncExternalStore } from "react";
import { FormQuestion } from "@/components/forms/UnifiedForm";
import { type ActionDraft } from "@/intelligence/action-draft";
import { bindUtterance, resolveChoice } from "@/intelligence/bind";
import { handoffOf } from "@/intelligence/handoff";
import { voiceCapture } from "@/intelligence/voice-capture";
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
}: {
  onResolved: (draft: ActionDraft) => void;
  onBack: () => void;
}) {
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [asking, setAsking] = useState<ActionDraft | null>(null);

  /* Live transcript flows into the box until the person edits it. */
  useEffect(() => {
    if (!edited) setText(v.transcript);
  }, [v.transcript, edited]);

  useEffect(() => () => voiceCapture.cancel(), []);

  const reading = text.trim().length >= 2 ? bindUtterance(text) : null;
  const listening = v.state === "listening";

  const go = () => {
    if (!reading) return;
    voiceCapture.cancel();
    if (reading.action && handoffOf(reading)) {
      haptics.light();
      onResolved(reading);
    } else if (reading.clarification) setAsking(reading);
  };

  if (asking?.clarification) {
    return (
      <FormQuestion
        heading={asking.clarification.ask}
        options={asking.clarification.choices}
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
      {reading?.action ? (
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

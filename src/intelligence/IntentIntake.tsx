import { useState } from "react";
import { FormQuestion } from "@/components/forms/UnifiedForm";
import { bandOf, type ActionDraft } from "@/intelligence/action-draft";
import { bindUtterance, resolveChoice } from "@/intelligence/bind";
import { handoffOf } from "@/intelligence/handoff";
import { interpret } from "@/intelligence/interpret";

/**
 * Quiet intake. Not a chat thread, and not a publish path.
 * A choice resolves the draft. onResolved receives a draft the existing
 * form can open. "Something else" returns here without inventing an action.
 */

export function IntentIntake({
  onResolved,
  onBack,
}: {
  onResolved: (draft: ActionDraft) => void;
  onBack: () => void;
}) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<ActionDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const local = bindUtterance(text);
    setDraft(local);
    setBusy(true);
    try {
      const read = await interpret({ text });
      setDraft(read);
      if (read.action && bandOf(read.confidence) === "high" && handoffOf(read)) onResolved(read);
    } finally {
      setBusy(false);
    }
  };

  if (draft?.clarification && bandOf(draft.confidence) !== "high") {
    return (
      <FormQuestion
        heading={draft.clarification.ask}
        options={draft.clarification.choices}
        selected={undefined}
        onPick={(say) => {
          const resolved = resolveChoice(draft, say);
          if (!resolved) {
            setDraft(null);
            return;
          }
          setDraft(resolved);
          onResolved(resolved);
        }}
        onBack={() => setDraft(null)}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <label>
        what do you have, or what do you need?
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} autoFocus />
      </label>
      <button type="submit" disabled={busy || text.trim().length < 2}>
        {busy ? "reading…" : "continue"}
      </button>
      <button type="button" onClick={onBack}>
        back
      </button>
    </form>
  );
}

import { useState } from "react";
import { FormQuestion } from "@/components/forms/UnifiedForm";
import { bandOf, exchangeOf, type ActionDraft } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";
import { interpret } from "@/intelligence/interpret";

/**
 * Quiet intake. Not a chat thread.
 * Not mounted on the Living G — geometry, toggle, and styling stay untouched.
 * Call onDraft with the structured reading; the existing seat form still edits
 * and the existing publish path still confirms.
 */

export function IntentIntake({
  onDraft,
  onBack,
}: {
  onDraft: (draft: ActionDraft) => void;
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
      setDraft(await interpret({ text }));
    } finally {
      setBusy(false);
    }
  };

  if (draft?.clarification && bandOf(draft.confidence) !== "high") {
    return (
      <FormQuestion
        heading={draft.clarification.ask}
        options={draft.clarification.choices}
        onPick={() => onDraft(draft)}
        onBack={() => setDraft(null)}
      />
    );
  }

  if (draft?.action && bandOf(draft.confidence) === "high") {
    onDraft(draft);
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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </label>
      <button type="submit" disabled={busy || text.trim().length < 2}>
        {busy ? "reading…" : "continue"}
      </button>
      <button type="button" onBack={undefined} onClick={onBack}>
        back
      </button>
      {draft?.action ? (
        <p>
          reading this as {exchangeOf(draft.action).category}
          {draft.missingRequired.length
            ? ` — still need ${draft.missingRequired.join(", ")}`
            : ""}
        </p>
      ) : null}
    </form>
  );
}

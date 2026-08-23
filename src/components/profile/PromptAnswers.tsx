import { useEffect, useRef, useState } from "react";
import { PROMPTS } from "@/data/prompts";
import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { haptics } from "@/lib/haptics";

/**
 * A PERSON REVEALING PIECES OF THEMSELVES.
 *
 * Every question here is optional. While it is unanswered it is a quiet
 * invitation; the moment something is typed the question disappears and what
 * remains is a sentence about the person. Touching that sentence opens it again.
 * It saves itself as it is typed — there is nothing to submit.
 */
export function PromptAnswers({ onTouched }: { onTouched?: () => void }) {
  const me = useMyProfile();
  const answers = me.answers ?? {};
  const [open, setOpen] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const node = field.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    try {
      node.setSelectionRange(end, end);
    } catch {
      /* focus is enough */
    }
  }, [open]);

  const write = (id: string, value: string) => {
    onTouched?.();
    myProfileStore.patch({ answers: { ...answers, [id]: value.slice(0, 140) } });
  };

  const answered = PROMPTS.filter((p) => (answers[p.id] ?? "").trim());
  const waiting = PROMPTS.filter((p) => !(answers[p.id] ?? "").trim());

  return (
    <div className="mt-12">
      <p className="g-body" style={{ opacity: 0.62 }}>
        answer a few fun questions so people get a little idea about who you are.
      </p>

      {/* WHAT HAS BEEN SAID — sentences, not fields. */}
      {answered.length ? (
        <div className="mt-9 space-y-8">
          {answered.map((p) => {
            const said = (answers[p.id] ?? "").trim();
            return open === p.id ? (
              <div key={p.id}>
                <p className="g-meta" style={{ color: "var(--giver-me)" }}>
                  {p.question}
                </p>
                <textarea
                  ref={field}
                  rows={2}
                  value={answers[p.id] ?? ""}
                  onChange={(e) => write(p.id, e.target.value)}
                  onBlur={() => setOpen(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(null);
                  }}
                  className="g-lede mt-1 w-full resize-none bg-transparent outline-none"
                />
              </div>
            ) : (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setOpen(p.id);
                }}
                className="g-lede block w-full text-left transition-opacity active:opacity-60"
              >
                {p.mine(said)}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* WHAT IS STILL UNASKED — quiet invitations, never obligations. */}
      {waiting.length ? (
        <div className="mt-12 space-y-7">
          {waiting.map((p) =>
            open === p.id ? (
              <div key={p.id}>
                <p className="g-meta" style={{ color: "var(--giver-me)" }}>
                  {p.question}
                </p>
                <textarea
                  ref={field}
                  rows={2}
                  value={answers[p.id] ?? ""}
                  onChange={(e) => write(p.id, e.target.value)}
                  onBlur={() => setOpen(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(null);
                  }}
                  placeholder="say it however you like"
                  className="g-lede mt-1 w-full resize-none bg-transparent outline-none placeholder:opacity-30"
                />
              </div>
            ) : (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setOpen(p.id);
                }}
                className="g-name block w-full text-left transition-opacity active:opacity-60"
                style={{ opacity: 0.42 }}
              >
                {p.question}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

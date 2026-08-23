import { useEffect, useRef, useState } from "react";
import { PROMPTS, mineStatement, type Prompt } from "@/data/prompts";

import { myProfileStore } from "@/data/my-profile";
import { useMyProfile } from "@/hooks/use-my-profile";
import { haptics } from "@/lib/haptics";

/**
 * A PERSON REVEALING PIECES OF THEMSELVES.
 *
 * Every question here is optional. While it is unanswered it is a quiet
 * invitation; the moment something is said the question disappears and what
 * remains is a sentence about the person. Touching that sentence opens it again.
 * It saves itself as it is typed — there is nothing to submit.
 *
 * NOTHING MOVES WHILE YOU ARE TALKING. The said sentences rise to the top only
 * once the writing is finished, so the line under the finger never jumps away.
 */

const said = (answers: Record<string, string>, p: Prompt) => (answers[p.id] ?? "").trim();

export function PromptAnswers({ onTouched }: { onTouched?: () => void }) {
  const me = useMyProfile();
  const answers = me.answers ?? {};
  const [open, setOpen] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement | null>(null);

  /** The reading order: answered first, then the invitations. Settled, not live. */
  const [order, setOrder] = useState<string[]>(() =>
    [...PROMPTS].sort((a, b) => Number(Boolean(said(answers, b))) - Number(Boolean(said(answers, a)))).map((p) => p.id),
  );

  useEffect(() => {
    if (open) return;
    setOrder(
      [...PROMPTS]
        .sort((a, b) => Number(Boolean(said(answers, b))) - Number(Boolean(said(answers, a))))
        .map((p) => p.id),
    );
    /* Re-settles only when nothing is being written. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const list = order
    .map((id) => PROMPTS.find((p) => p.id === id))
    .filter((p): p is Prompt => Boolean(p));

  return (
    <div className="mt-12">
      <p className="g-body" style={{ opacity: 0.62 }}>
        answer a few fun questions so people get a little idea about who you are.
      </p>

      <div className="mt-9 space-y-8">
        {list.map((p) => {
          const answer = said(answers, p);

          if (open === p.id)
            return (
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
            );

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                haptics.selection();
                setOpen(p.id);
              }}
              className={`block w-full text-left transition-opacity active:opacity-60 ${
                answer ? "g-lede" : "g-name"
              }`}
              {...(answer ? {} : { style: { opacity: 0.42 } })}
            >
              {answer ? mineStatement(p, answer) : p.question}
            </button>
          );
        })}
      </div>
    </div>
  );
}

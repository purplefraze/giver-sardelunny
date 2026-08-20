import { BackArrow } from "@/components/BackArrow";
import type { IntroTopic } from "@/components/WorldIntro";
import { buzz } from "@/lib/haptics";

/**
 * THE VOLUNTARY WAY BACK TO EVERY EXPLANATION.
 *
 * Opening one of these never touches a first-time flag and never leads into a
 * form — it explains, then hands the G straight back.
 */
const TOPICS: { topic: IntroTopic; label: string; colour: string }[] = [
  { topic: "wish", label: "how wishes work", colour: "var(--me-wish)" },
  { topic: "give", label: "how gives work", colour: "var(--me-give)" },
  { topic: "trade", label: "how trades work", colour: "var(--me-trade)" },
  { topic: "borrow", label: "how borrowing works", colour: "var(--me-borrow)" },
  { topic: "sparks", label: "how sparks work", colour: "var(--giver-me)" },
];

export function HelpIndex({
  onOpen,
  onClose,
}: {
  onOpen: (topic: IntroTopic) => void;
  onClose: () => void;
}) {
  return (
    <div
      data-world="profile"
      className="g-page g-page-bottom relative flex h-full w-full flex-col justify-center"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      <h1 className="g-display">how giver works</h1>

      <div className="mt-10 flex flex-col items-start gap-4">
        {TOPICS.map(({ topic, label, colour }) => (
          <button
            key={topic}
            type="button"
            onClick={() => {
              buzz();
              onOpen(topic);
            }}
            className="g-display-sm text-left"
            style={{ color: colour }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

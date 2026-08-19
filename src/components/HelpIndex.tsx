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
      className="relative flex h-full w-full flex-col justify-center px-7 pb-16 pt-20"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      <h1 className="text-[12vw] font-black lowercase leading-[0.88] tracking-[-0.055em]">
        how giver works
      </h1>

      <div className="mt-10 flex flex-col items-start gap-4">
        {TOPICS.map(({ topic, label, colour }) => (
          <button
            key={topic}
            type="button"
            onClick={() => {
              buzz();
              onOpen(topic);
            }}
            className="text-left text-[7.4vw] font-black lowercase leading-[0.98] tracking-[-0.045em]"
            style={{ color: colour }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

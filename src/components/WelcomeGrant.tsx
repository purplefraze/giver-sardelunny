import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { WELCOME_TO_GIVE, WELCOME_TO_WISH } from "@/data/welcome-grant";

/**
 * TWO LINES OVER THE G, THEN GONE (welcome-grant.ts).
 *
 * No welcome, no question, no spark page. A tap anywhere skips — and that tap
 * is swallowed here: the layer stays on top, catching it, until it has faded,
 * so the first tap never opens anything underneath.
 */
export function WelcomeGrant({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  /* The parent re-renders freely; the fade must not restart with it. */
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const show = window.setTimeout(() => setPhase("hold"), 40);
    const fade = window.setTimeout(() => setPhase("out"), 3800);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(fade);
    };
  }, []);
  useEffect(() => {
    if (phase !== "out") return;
    const t = window.setTimeout(() => done.current(), 650);
    return () => window.clearTimeout(t);
  }, [phase]);

  const swallow = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const skip = (e: SyntheticEvent) => {
    swallow(e);
    setPhase("out");
  };

  return (
    <div
      data-testid="welcome-grant"
      role="status"
      className="absolute inset-0 z-[65] flex items-center justify-center px-8 text-center"
      style={{ touchAction: "none" }}
      onPointerDown={skip}
      onPointerUp={swallow}
      onTouchStart={swallow}
      onTouchEnd={swallow}
      onClick={swallow}
    >
      <div
        style={{
          opacity: phase === "hold" ? 1 : 0,
          transition: `opacity ${phase === "out" ? 600 : 700}ms ease-out`,
          color: "var(--giver-ink)",
          textShadow: "0 0 18px var(--giver-paper, #fff), 0 0 6px var(--giver-paper, #fff)",
        }}
      >
        <p className="g-name">
          {WELCOME_TO_GIVE} to give · {WELCOME_TO_WISH} to wish
        </p>
        <p className="g-meta mt-2 opacity-70">your sparks live in my g</p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { IntroG } from "@/components/onboarding/IntroG";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";

/**
 * The opening of Giver, told entirely through the canonical Living G.
 * Colour is the chapter marker: orange welcome -> purple possibility ->
 * the community's own colours -> arrival at the green Home G.
 */
type Stage =
  | "welcome"
  | "sparks"
  | "use"
  | "giveaway"
  | "invite"
  | "before"
  | "meet"
  | "choose"
  | "celebrate";

/** appear -> breathe -> read -> respond -> move. */
const BEAT: Partial<Record<Stage, { ms: number; next: Stage }>> = {
  welcome: { ms: 3400, next: "sparks" },
  sparks: { ms: 2600, next: "use" },
  use: { ms: 2600, next: "giveaway" },
  giveaway: { ms: 3600, next: "invite" },
};

const NAME_COLOUR: Record<Member["world"], string> = {
  give: "var(--giver-yellow)",
  wish: "var(--giver-blue)",
  trade: "var(--giver-trade)",
};

export function Onboarding({ onDone }: { onDone: (gaveTo: string | null) => void }) {
  const [stage, setStage] = useState<Stage>("welcome");
  const [who, setWho] = useState(0);
  const [chosen, setChosen] = useState<Member | null>(null);
  const [inviteReady, setInviteReady] = useState(false);

  useEffect(() => {
    const beat = BEAT[stage];
    if (!beat) return;
    const t = setTimeout(() => setStage(beat.next), beat.ms);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "invite") return;
    setInviteReady(false);
    const t = setTimeout(() => setInviteReady(true), 900);
    return () => clearTimeout(t);
  }, [stage]);

  const advance = (next: Stage) => () => {
    buzz();
    setStage(next);
  };

  if (stage === "welcome") {
    return (
      <IntroG
        world="welcome"
        middle={{ lines: ["Welcome to", "Giver."] }}
        bottom={{ lines: ["Kindness is", "currency."] }}
        onAdvance={advance("sparks")}
      />
    );
  }

  if (stage === "sparks") {
    return (
      <IntroG
        world="sparks"
        middle={{ lines: ["100", "Sparks"] }}
        onAdvance={advance("use")}
      />
    );
  }

  if (stage === "use") {
    return (
      <IntroG
        world="sparks"
        middle={{ lines: ["50 are yours", "to use."] }}
        onAdvance={advance("giveaway")}
      />
    );
  }

  if (stage === "giveaway") {
    return (
      <IntroG
        world="sparks"
        middle={{ lines: ["50 are yours", "to use."] }}
        bottom={{ lines: ["50 are yours", "to give away."] }}
        onAdvance={advance("invite")}
      />
    );
  }

  if (stage === "invite") {
    return (
      <IntroG
        world="sparks"
        middle={{ lines: ["Are you", "a Giver?"] }}
        onAdvance={inviteReady ? advance("before") : undefined}
      >
        <ForwardCue
          show={inviteReady}
          label="Yes — meet the community"
          onClick={advance("before")}
        />
      </IntroG>
    );
  }

  if (stage === "before") {
    return (
      <IntroG
        world="sparks"
        middle={{ lines: ["Meet three", "people."] }}
        bottom={{ lines: ["Giving.", "Wishing.", "Trading."] }}
        onAdvance={advance("meet")}
      >
        <BackArrow onClick={() => setStage("invite")} />
        <ForwardCue show label="Meet them" onClick={advance("meet")} />
      </IntroG>
    );
  }

  if (stage === "meet") {
    const member = MEMBERS[who]!;
    return (
      <MemberExample
        member={member}
        first={who === 0}
        last={who === MEMBERS.length - 1}
        onBack={() => setStage("before")}
        onPrev={() => setWho((w) => Math.max(0, w - 1))}
        onNext={() => setWho((w) => Math.min(MEMBERS.length - 1, w + 1))}
        onDone={() => setStage("choose")}
      />
    );
  }

  if (stage === "celebrate" && chosen) {
    return <Celebration name={chosen.name} onDone={() => onDone(chosen.name)} />;
  }

  // Give your 50 — the first act of generosity. Not optional.
  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-7"
      style={{ background: "var(--giver-accent)", color: "var(--giver-ink)" }}
    >
      <BackArrow
        onClick={() => {
          setWho(MEMBERS.length - 1);
          setStage("meet");
        }}
      />
      <h1 className="text-[13vw] font-black uppercase leading-[0.8] tracking-[-0.06em] animate-[fade-up_500ms_ease-out]">
        Give your
        <br />
        50.
      </h1>
      <div className="mt-10 flex flex-col items-start gap-5">
        {MEMBERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              buzz([10, 40, 18]);
              setChosen(m);
              setStage("celebrate");
            }}
            className="text-[15vw] font-black uppercase leading-[0.88] tracking-[-0.05em] transition-transform active:scale-95"
            style={{ color: NAME_COLOUR[m.world] }}
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The only forward affordance in onboarding: one small arrow, safe area kept. */
function ForwardCue({
  show,
  label,
  onClick,
}: {
  show: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex justify-end px-7"
      style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={label}
        className="flex h-10 w-10 items-center justify-center text-3xl font-bold leading-none transition-opacity duration-500 active:scale-90"
        style={{ opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none" }}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function Celebration({ name, onDone }: { name: string; onDone: () => void }) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-7 pt-20"
      style={{ background: "var(--giver-accent)", color: "var(--giver-ink)" }}
    >
      <h1 className="text-[19vw] font-black uppercase leading-[0.78] tracking-[-0.06em] animate-[fade-up_500ms_ease-out]">
        Yippee!
      </h1>
      <p className="mt-8 max-w-[15ch] text-[7.5vw] font-black uppercase leading-[0.92] tracking-[-0.04em] animate-[fade-up_600ms_250ms_ease-out_both]">
        You just made your first act of generosity on Giver.
      </p>
      <p className="mt-6 max-w-[16ch] text-[5.5vw] font-black uppercase leading-[0.95] tracking-[-0.03em] opacity-60 animate-[fade-up_600ms_500ms_ease-out_both]">
        50 Sparks have been gifted to {name}.
      </p>
      <button
        type="button"
        onClick={() => {
          buzz();
          onDone();
        }}
        className="mt-auto mb-10 self-start text-[8vw] font-black uppercase leading-none tracking-[-0.04em] underline decoration-[0.12em] underline-offset-[0.18em] transition-transform active:scale-95 animate-[fade-up_600ms_750ms_ease-out_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        Enter Giver →
      </button>
    </div>
  );
}

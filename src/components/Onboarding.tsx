import { useEffect, useState } from "react";
import { MemberExample } from "@/components/onboarding/MemberExample";
import { MEMBERS, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";

type Step = "welcome" | "sparks" | "before" | "meet" | "choose" | "celebrate";

export function Onboarding({ onDone }: { onDone: (gaveTo: string | null) => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [who, setWho] = useState(0);
  const [chosen, setChosen] = useState<Member | null>(null);

  useEffect(() => {
    if (step !== "welcome") return;
    const t = setTimeout(() => setStep("sparks"), 2200);
    return () => clearTimeout(t);
  }, [step]);

  if (step === "meet") {
    const member = MEMBERS[who]!;
    return (
      <MemberExample
        member={member}
        first={who === 0}
        last={who === MEMBERS.length - 1}
        onPrev={() => setWho((w) => Math.max(0, w - 1))}
        onNext={() => setWho((w) => Math.min(MEMBERS.length - 1, w + 1))}
        onDone={() => setStep("choose")}
      />
    );
  }

  return (
    <div
      data-world="home"
      className="relative flex h-full w-full flex-col overflow-hidden px-7"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      {step === "welcome" && (
        <div className="flex flex-1 flex-col justify-center animate-[fade-up_700ms_ease-out]">
          <h1 className="text-[17vw] font-black uppercase leading-[0.8] tracking-[-0.06em]">
            Welcome
            <br />
            to
            <br />
            Giver.
          </h1>
          <p className="mt-8 text-base font-bold uppercase tracking-[0.24em] opacity-60">
            Kindness is currency
          </p>
        </div>
      )}

      {step === "sparks" && (
        <div className="flex flex-1 flex-col justify-center gap-7 animate-[fade-up_500ms_ease-out]">
          <h1 className="text-[15vw] font-black uppercase leading-[0.8] tracking-[-0.06em]">
            100
            <br />
            Sparks.
          </h1>
          <div className="space-y-3 text-2xl font-medium leading-tight">
            <p>
              <span className="font-black">50</span> are yours to use.
            </p>
            <p>
              <span className="font-black">50</span> are yours to give away.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              buzz();
              setStep("before");
            }}
            className="mt-4 self-start rounded-full px-9 py-5 text-2xl font-black uppercase tracking-[-0.03em] transition-transform active:scale-95"
            style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
          >
            Next
          </button>
        </div>
      )}

      {step === "before" && (
        <div className="flex flex-1 flex-col justify-center gap-8 animate-[fade-up_500ms_ease-out]">
          <h1 className="text-[15vw] font-black uppercase leading-[0.8] tracking-[-0.06em]">
            Before
            <br />
            you
            <br />
            start.
          </h1>
          <p className="text-2xl font-medium leading-tight">
            Meet three people.
            <br />
            One giving. One wishing. One trading.
          </p>
          <button
            type="button"
            onClick={() => {
              buzz();
              setStep("meet");
            }}
            className="self-start rounded-full px-9 py-5 text-2xl font-black uppercase tracking-[-0.03em] transition-transform active:scale-95"
            style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
          >
            Meet them
          </button>
        </div>
      )}

      {step === "choose" && (
        <div className="flex flex-1 flex-col justify-center gap-10 animate-[fade-up_500ms_ease-out]">
          <h1 className="text-[13vw] font-black uppercase leading-[0.8] tracking-[-0.06em]">
            Give your
            <br />
            50.
          </h1>
          <div className="flex flex-col items-start gap-6">
            {MEMBERS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  buzz([10, 40, 18]);
                  setChosen(m);
                  setStep("celebrate");
                }}
                className="text-[13vw] font-black uppercase leading-[0.9] tracking-[-0.05em] transition-transform active:scale-95"
              >
                {m.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onDone(null)}
            className="self-start text-sm font-medium underline opacity-50"
          >
            Maybe later
          </button>
        </div>
      )}

      {step === "celebrate" && chosen && (
        <Celebration name={chosen.name} onDone={() => onDone(chosen.name)} />
      )}
    </div>
  );
}

function Celebration({ name, onDone }: { name: string; onDone: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="relative mx-auto mb-10 h-40 w-40">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{
              background: i % 2 ? "var(--world-g)" : "var(--world-accent)",
              animation: `spark-burst 1100ms ${i * 35}ms cubic-bezier(0.2,0.9,0.3,1) forwards`,
              // @ts-expect-error custom property
              "--a": `${(360 / 14) * i}deg`,
            }}
          />
        ))}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "var(--world-g)",
            animation: "spark-swell 900ms cubic-bezier(0.2,0.9,0.3,1) forwards",
          }}
        />
      </div>
      <h1 className="text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.06em] animate-[fade-up_600ms_200ms_ease-out_both]">
        Yippee.
      </h1>
      <p className="mt-6 text-xl font-medium leading-tight animate-[fade-up_600ms_400ms_ease-out_both]">
        You just made your first act of generosity on Giver. 50 Sparks are now
        with {name}.
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-10 self-start rounded-full px-8 py-5 text-xl font-black uppercase transition-transform active:scale-95 animate-[fade-up_600ms_700ms_ease-out_both]"
        style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
      >
        Enter Giver
      </button>
    </div>
  );
}

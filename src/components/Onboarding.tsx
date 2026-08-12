import { useEffect, useState } from "react";
import { LivingG } from "@/components/living-g/LivingG";
import { ringPhoto } from "@/components/World";
import { MEMBERS, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Step = "welcome" | "sparks" | "members" | "celebrate";

export function Onboarding({ onDone }: { onDone: (gaveTo: string | null) => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [who, setWho] = useState(0);
  const [chosen, setChosen] = useState<Member | null>(null);
  const [reveal, setReveal] = useState<"activity" | "me" | "about" | null>(null);

  useEffect(() => {
    if (step !== "welcome") return;
    const t = setTimeout(() => setStep("sparks"), 2200);
    return () => clearTimeout(t);
  }, [step]);

  const member = MEMBERS[who]!;

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
            Lucky
            <br />
            you.
          </h1>
          <div className="space-y-4 text-xl font-medium leading-tight">
            <p>Thanks for joining the Giver community.</p>
            <p className="text-2xl font-black">
              You&apos;ve got 100 Sparks to start.
            </p>
            <p className="opacity-70">But here&apos;s the catch:</p>
            <p>
              <span className="font-black">50</span> are yours to use.
              <br />
              <span className="font-black">50</span> are yours to give away.
            </p>
          </div>
          <p className="text-lg font-bold">
            Want to make your first act of generosity now?
          </p>
          <div className="flex flex-col items-start gap-4 pb-6">
            <button
              type="button"
              onClick={() => {
                buzz();
                setStep("members");
              }}
              className="rounded-full px-9 py-5 text-2xl font-black uppercase tracking-[-0.03em] transition-transform active:scale-95"
              style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
            >
              Let&apos;s give
            </button>
            <button
              type="button"
              onClick={() => onDone(null)}
              className="text-sm font-medium underline opacity-50"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {step === "members" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="pt-6">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-55">
              Meet {who + 1} of {MEMBERS.length}
            </p>
            <h2 className="mt-1 text-[13vw] font-black uppercase leading-[0.8] tracking-[-0.05em]">
              {member.name}
            </h2>
            <p className="mt-1 text-sm font-medium opacity-70">{member.blurb}</p>
          </div>

          <div className="relative min-h-0 flex-1">
            <LivingG
              key={member.id}
              regions={{
                top: {
                  label: member.mode,
                  onPress: () => setReveal("activity"),
                },
                middle: {
                  label: "",
                  onPress: () => setReveal("me"),
                  render: ringPhoto(member.photo, member.id, 92),
                },
                bottom: {
                  label: "About\nme".replace("\n", " "),
                  onPress: () => setReveal("about"),
                },
              }}
            />
          </div>

          <div className="min-h-[92px] pb-2">
            <p className="text-lg font-medium leading-tight">
              {reveal === "activity" && member.activity}
              {reveal === "me" && `${member.name} — ${member.blurb}`}
              {reveal === "about" && member.about}
              {reveal === null && (
                <span className="opacity-45">
                  Tap their {member.mode.toLowerCase()}, their picture, or their about me.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pb-8">
            <button
              type="button"
              disabled={who === 0}
              onClick={() => {
                setReveal(null);
                setWho((w) => Math.max(0, w - 1));
              }}
              className={cn(
                "text-3xl font-black transition-opacity",
                who === 0 && "opacity-20",
              )}
              aria-label="Previous person"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                buzz([10, 40, 18]);
                setChosen(member);
                setStep("celebrate");
              }}
              className="rounded-full px-6 py-4 text-base font-black uppercase tracking-[-0.02em] transition-transform active:scale-95"
              style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
            >
              Give 50 to {member.name}
            </button>
            <button
              type="button"
              disabled={who === MEMBERS.length - 1}
              onClick={() => {
                setReveal(null);
                setWho((w) => Math.min(MEMBERS.length - 1, w + 1));
              }}
              className={cn(
                "text-3xl font-black transition-opacity",
                who === MEMBERS.length - 1 && "opacity-20",
              )}
              aria-label="Next person"
            >
              →
            </button>
          </div>
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

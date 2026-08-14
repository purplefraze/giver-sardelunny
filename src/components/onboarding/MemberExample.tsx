import { useEffect, useState } from "react";
import { LivingG } from "@/components/living-g/LivingG";
import type { Anchor } from "@/components/living-g/LivingG";
import type { Member } from "@/data/giver";
import { cn } from "@/lib/utils";

/**
 * One community member, shown through the approved full-size Living G.
 * Same layout for every person: identity cue on top, G below, their About in
 * the middle loop, what they're doing in the bottom loop. Only the person,
 * their words and the colour change.
 */
export function MemberExample({
  member,
  first,
  last,
  onPrev,
  onNext,
  onDone,
}: {
  member: Member;
  first: boolean;
  last: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDone: () => void;
}) {
  const [profile, setProfile] = useState(false);
  const [cues, setCues] = useState(true);

  useEffect(() => {
    if (!cues) return;
    const t = setTimeout(() => setCues(false), 4200);
    return () => clearTimeout(t);
  }, [cues]);

  return (
    <div
      data-world={member.world}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      {/* Identity cue — small, outside the G. */}
      <button
        type="button"
        onClick={() => setProfile(true)}
        className="relative z-10 flex items-center gap-3 px-7 pt-7 text-left active:scale-95"
      >
        <img
          src={member.photo}
          alt={member.name}
          className="h-11 w-11 rounded-full object-cover"
        />
        <span className="text-xl font-black uppercase tracking-[-0.03em]">
          {member.name}
        </span>
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.22em] transition-opacity duration-500",
            cues ? "opacity-45" : "opacity-0",
          )}
        >
          Tap to meet {member.name}
        </span>
      </button>

      <div className="flex flex-1 items-center justify-center">
        <LivingG
          key={member.id}
          className="h-[80%] max-w-[86%]"
          showLabels
          regions={{
            middle: {
              render: (a) =>
                blockText(a, `About ${member.name}`, member.aboutLines, -46),
            },
            bottom: {
              render: (a) =>
                blockText(a, member.mode, [member.headline], -40),
            },
          }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-7 pb-9">
        <button
          type="button"
          disabled={first}
          onClick={onPrev}
          aria-label="Previous person"
          className={cn("text-3xl font-black", first && "opacity-20")}
        >
          ←
        </button>
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.22em] transition-opacity duration-500",
            cues ? "opacity-40" : "opacity-0",
          )}
        >
          See what {member.name} is {member.mode.toLowerCase()}
        </span>
        {last ? (
          <button
            type="button"
            onClick={onDone}
            className="rounded-full px-6 py-4 text-base font-black uppercase tracking-[-0.02em] active:scale-95"
            style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next person"
            className="text-3xl font-black"
          >
            →
          </button>
        )}
      </div>

      {/* Temporary full profile view. */}
      <div
        className={cn(
          "absolute inset-0 z-30 flex flex-col px-7 pb-10 pt-14 transition-transform duration-300 ease-out",
          profile ? "translate-y-0" : "invisible pointer-events-none translate-y-full",
        )}
        style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
        aria-hidden={!profile}
      >
        <button
          type="button"
          onClick={() => setProfile(false)}
          className="self-start text-sm font-bold uppercase tracking-[0.18em] opacity-60"
        >
          Close
        </button>
        <h2 className="mt-10 text-[16vw] font-black uppercase leading-[0.82] tracking-[-0.05em]">
          {member.name}
        </h2>
        <p className="mt-8 text-2xl font-medium leading-tight">{member.about}</p>
        <p className="mt-6 text-2xl font-medium leading-tight opacity-70">
          {member.activity}
        </p>
      </div>
    </div>
  );
}

/** A tiny stack of words living in the negative space of a loop — no container. */
function blockText(a: Anchor, kicker: string, lines: string[], offsetY: number) {
  return (
    <>
      <text
        x={a.x}
        y={a.y + offsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--world-ink)"
        className="font-black uppercase"
        style={{ fontSize: 22, letterSpacing: "0.16em", opacity: 0.55 }}
      >
        {kicker}
      </text>
      <text
        x={a.x}
        y={a.y + offsetY + 42}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--world-ink)"
        className="font-black"
        style={{ fontSize: 29, letterSpacing: "-0.03em" }}
      >
        {lines.map((line, i) => (
          <tspan key={line} x={a.x} dy={i === 0 ? 0 : 34}>
            {line}
          </tspan>
        ))}
      </text>
    </>
  );
}

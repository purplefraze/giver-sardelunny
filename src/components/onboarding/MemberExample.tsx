import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { loopText } from "@/components/living-g/loop-text";
import type { Member } from "@/data/giver";
import { cn } from "@/lib/utils";

/**
 * One community member, shown through the approved full-size Living G.
 * The G is identical to Home/Wish/Give: same geometry, scale and anchor.
 * Their words are fitted INSIDE the loops — the G never adapts to the content.
 */
export function MemberExample({
  member,
  first,
  last,
  onBack,
  onPrev,
  onNext,
  onDone,
}: {
  member: Member;
  first: boolean;
  last: boolean;
  onBack: () => void;
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
      <BackArrow onClick={first ? onBack : onPrev} label="Back" />

      {/* Identity cue — small, outside the G. */}
      <button
        type="button"
        onClick={() => setProfile(true)}
        className="relative z-10 mx-auto flex items-center gap-3 px-7 pt-6 text-left active:scale-95"
      >
        <img
          src={member.photo}
          alt={member.name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="text-base font-black uppercase tracking-[0.16em]">
          {member.name}
        </span>
      </button>

      <GStage>
        <LivingG
          key={member.id}
          className={G_PRESENCE}
          showLabels
          regions={{
            middle: {
              render: (anchor) =>
                loopText({
                  anchor,
                  region: "middle",
                  kicker: `About ${member.name}`,
                  lines: member.aboutLines,
                }),
            },
            bottom: {
              render: (anchor) =>
                loopText({
                  anchor,
                  region: "bottom",
                  kicker: member.mode,
                  lines: [member.headline],
                }),
            },
          }}
        />
      </GStage>

      <div
        className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-7 pb-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <span
          className={cn(
            "max-w-[55%] text-[11px] font-bold uppercase leading-tight tracking-[0.2em] transition-opacity duration-500",
            cues ? "opacity-40" : "opacity-0",
          )}
        >
          {member.mode} — tap {member.name} to read more
        </span>
        <button
          type="button"
          onClick={last ? onDone : onNext}
          className="rounded-full px-6 py-4 text-base font-black uppercase tracking-[-0.02em] active:scale-95"
          style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
        >
          Next
        </button>
      </div>

      {/* Temporary full profile view — always a way back. */}
      <div
        className={cn(
          "absolute inset-0 z-30 flex flex-col px-7 pb-10 pt-16 transition-opacity duration-200 ease-out",
          profile ? "opacity-100" : "invisible pointer-events-none opacity-0",
        )}
        style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
        aria-hidden={!profile}
      >
        {profile ? <BackArrow onClick={() => setProfile(false)} /> : null}
        <h2 className="mt-6 text-[16vw] font-black uppercase leading-[0.82] tracking-[-0.05em]">
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

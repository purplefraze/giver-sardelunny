import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { loopText } from "@/components/living-g/loop-text";
import type { Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * One community member, shown through the approved full-size Living G.
 * The G is identical to Home/Wish/Give: same geometry, scale and anchor.
 * Their words are fitted INSIDE the loops — the G never adapts to the content.
 * Each loop opens a deeper preview, and every deeper page comes back here.
 */
type Deep = "profile" | "about" | "activity" | null;

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
  const [deep, setDeep] = useState<Deep>(null);

  useEffect(() => {
    setDeep(null);
  }, [member.id]);


  const open = (d: Exclude<Deep, null>) => () => {
    buzz();
    setDeep(d);
  };

  return (
    <div
      data-world={member.world}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow
        onClick={first ? onBack : onPrev}
        label={first ? "Back" : `Back to the person before ${member.name}`}
      />

      <GStage>
        <LivingG
          key={member.id}
          className={G_PRESENCE}
          showLabels
          regions={{
            top: {
              onPress: open("profile"),
              render: (anchor) => {
                const clipId = `member-photo-${member.id}`;
                const r = 45;
                return (
                  <>
                    <defs>
                      <clipPath id={clipId}>
                        <circle cx={anchor.x} cy={anchor.y} r={r} />
                      </clipPath>
                    </defs>
                    <image
                      href={member.photo}
                      x={anchor.x - r}
                      y={anchor.y - r}
                      width={r * 2}
                      height={r * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${clipId})`}
                    />
                    <text
                      x={anchor.x}
                      y={anchor.y + r + 26}
                      textAnchor="middle"
                      fill="var(--world-ink)"
                      className="font-black uppercase"
                      style={{ fontSize: 20, letterSpacing: "-0.02em", opacity: 0.85 }}
                    >
                      {member.username}
                    </text>
                  </>
                );
              },
            },
            middle: {
              onPress: open("about"),
              render: (anchor) =>
                loopText({
                  anchor,
                  region: "middle",
                  lines: member.aboutLines,
                }),
            },
            bottom: {
              onPress: open("activity"),
              render: (anchor) =>
                loopText({
                  anchor,
                  region: "bottom",
                  kicker: member.bottomKicker,
                  lines: member.bottomLines,
                }),
            },
          }}
        />
      </GStage>

      <div
        className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-end px-7"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={last ? onDone : onNext}
          aria-label={last ? "Continue" : `Meet the next person after ${member.name}`}
          className="flex h-9 w-9 items-center justify-center text-3xl font-bold leading-none transition-transform active:scale-90"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>


      {/* Deeper previews — always a way back to this exact person. */}
      <div
        className={cn(
          "absolute inset-0 z-50 flex flex-col px-7 pb-10 pt-16 transition-opacity duration-200 ease-out",
          deep ? "opacity-100" : "invisible pointer-events-none opacity-0",
        )}
        style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
        aria-hidden={!deep}
      >
        {deep ? (
          <>
            <BackArrow onClick={() => setDeep(null)} label={`Back to ${member.name}`} />
            <h2 className="mt-6 text-[16vw] font-black uppercase leading-[0.82] tracking-[-0.05em]">
              {deep === "activity" ? member.bottomKicker : member.username}
            </h2>
            {deep === "profile" ? (
              <>
                <p className="mt-8 text-2xl font-medium leading-tight">{member.about}</p>
                <p className="mt-6 text-2xl font-medium leading-tight opacity-70">
                  {member.activity}
                </p>
              </>
            ) : null}
            {deep === "about" ? (
              <p className="mt-8 text-2xl font-medium leading-tight">{member.about}</p>
            ) : null}
            {deep === "activity" ? (
              <>
                <p className="mt-8 text-2xl font-medium leading-tight">
                  {member.headline}
                </p>
                <p className="mt-6 text-2xl font-medium leading-tight opacity-70">
                  {member.activity}
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

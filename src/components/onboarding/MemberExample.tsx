import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { loopText } from "@/components/living-g/loop-text";
import {
  TopLoopSelector,
  topLoopContent,
  type TopLoopPosition,
} from "@/components/living-g/TopLoopSelector";
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
  /** Prototype top-loop selector state: stays where the user leaves it. */
  const [topPos, setTopPos] = useState<TopLoopPosition>(0);

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

      {/* Same identity position as GIVER on Home: quiet, centred, small. */}
      <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center gap-1 px-8">
        <span className="text-[12px] font-black uppercase tracking-[0.42em] opacity-65">
          {member.username}
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.34em] opacity-40">
          {member.distance}
        </span>
      </div>

      <GStage>
        <LivingG
          key={member.id}
          className={G_PRESENCE}
          showLabels
          overlay={
            <TopLoopSelector
              position={topPos}
              onChange={setTopPos}
              states={[
                topLoopContent.photo(member.photo, member.id),
                topLoopContent.sparks(100),
                topLoopContent.placeholder(),
              ]}
            />
          }
          regions={{
            top: {
              onPress: open("profile"),
            },

            middle: {
              onPress: open("about"),
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "middle",
                  blocks: [
                    { text: member.age, role: "primary" },
                    { text: "By day", role: "secondary", lead: true },
                    { text: clampField(member.byDay), role: "primary" },
                    { text: "By night", role: "secondary", lead: true },
                    { text: clampField(member.byNight), role: "primary" },
                    { text: "On the weekends", role: "secondary", lead: true },
                    { text: clampField(member.weekend), role: "primary" },
                  ],
                }),
            },
            bottom: {
              onPress: open("activity"),
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "bottom",
                  blocks: member.bottom,
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

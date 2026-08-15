import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { clampField, profileLoop } from "@/components/living-g/profile-loop";
import {
  HISTORY_STATES,
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
type Deep = "history" | "about" | "activity" | null;

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
  /** Top-loop history selector: stays where the user leaves it. */
  const [topPos, setTopPos] = useState<TopLoopPosition>(0);

  useEffect(() => {
    setDeep(null);
  }, [member.id]);

  // Fail loudly in dev if a profile has no words for its loops, instead of
  // silently rendering an empty Living G.
  if (import.meta.env.DEV && (!member.bottom?.length || !member.byDay)) {
    console.error(`[giver] profile "${member.id}" is missing loop content`, member);
  }


  const historyLines = [
    member.history.wishes,
    member.history.gives,
    member.history.trades,
  ][topPos]!;

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
        label={first ? "back" : `back to the person before ${member.name}`}
      />

      {/* Same identity position as giver on Home: quiet, centred, small. */}
      <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center gap-1 px-8">
        <span className="text-[13px] font-black lowercase tracking-[0.34em] opacity-70">
          {member.username}
        </span>
        <span className="text-[10px] font-black lowercase tracking-[0.28em] opacity-45">
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
              content={
                <>
                  {topLoopContent.photo(member.photo, member.id)}
                  {topLoopContent.stateLabel(HISTORY_STATES[topPos])}
                </>
              }
            />
          }
          regions={{
            top: {
              onPress: open("history"),
            },

            middle: {
              onPress: open("about"),
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "middle",
                  blocks: [
                    { text: "by day", role: "secondary" },

                    { text: clampField(member.byDay), role: "primary" },
                    { text: "by night", role: "secondary", lead: true },
                    { text: clampField(member.byNight), role: "primary" },
                    { text: "on the weekends", role: "secondary", lead: true },
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
          aria-label={last ? "continue" : `meet the next person after ${member.name}`}
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
            <BackArrow onClick={() => setDeep(null)} label={`back to ${member.name}`} />
            <h2 className="mt-6 text-[16vw] font-black lowercase leading-[0.82] tracking-[-0.05em]">
              {deep === "activity"
                ? member.action
                : deep === "history"
                  ? HISTORY_STATES[topPos]
                  : member.username}
            </h2>
            {deep === "history" ? (
              <div className="mt-8 space-y-5">
                {historyLines.map((line) => (
                  <p key={line} className="text-2xl font-medium lowercase leading-tight">
                    {line}
                  </p>
                ))}
              </div>
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
                {member.alsoGiving?.map((item) => (
                  <p key={item} className="mt-6 text-2xl font-medium leading-tight opacity-70">
                    {item}
                  </p>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

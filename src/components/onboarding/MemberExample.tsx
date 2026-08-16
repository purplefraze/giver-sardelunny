import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { clampField, profileLoop } from "@/components/living-g/profile-loop";
import {
  HISTORY_STATES,
  type TopLoopPosition,
} from "@/components/living-g/TopLoopSelector";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";
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

/**
 * Where a person's history selector RESTS when you first meet them: the state
 * they are an example of. Borrow has no history seat in the prototype, so a
 * borrower simply rests on wishes.
 */
/**
 * THE SELECTOR STATES THE INTERACTION TYPE. A person's screen keeps the mode
 * selector sitting at the seat that matches what they are doing, so the seat
 * alone tells you: trade at ~4 o'clock, borrow at ~8 o'clock.
 */
const MEMBER_MODE: Record<Member["world"], Mode> = {
  wishing: "wish",
  giving: "give",
  trading: "trade",
  borrowing: "borrow",
};

const HISTORY_START: Record<Member["world"], TopLoopPosition> = {
  wishing: 0,
  giving: 1,
  trading: 2,
  borrowing: 0,
};

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
  /** Top-loop history selector: starts on this person's own state. */
  const [topPos, setTopPos] = useState<TopLoopPosition>(HISTORY_START[member.world]);

  useEffect(() => {
    setTopPos(HISTORY_START[member.world]);
  }, [member.world]);


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
      {/* Navigation lives together, at the bottom. Nothing sits up top. */}


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
          earCut
          overlay={
            <EarSelector
              mode={MEMBER_MODE[member.world]}
              onChange={() => {}}
              locked
              photo={member.photo}
              onTap={open("history")}
              history={[
                ...(member.history.wishes.length ? (["wish"] as const) : []),
                ...(member.history.gives.length ? (["give"] as const) : []),
                ...(member.history.trades.length ? (["trade"] as const) : []),
              ]}
            />
          }
          regions={{
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

      {/*
        BOTH directions, together, in the thumb zone. Same placement for every
        person, so nothing ever jumps from top to bottom between profiles.
      */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-9"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={first ? onBack : onPrev}
          aria-label={first ? "back" : `back to the person before ${member.name}`}
          className="flex h-11 w-11 items-center justify-center text-3xl font-bold leading-none transition-transform active:scale-90"
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          onClick={last ? onDone : onNext}
          aria-label={last ? "continue" : `meet the next person after ${member.name}`}
          className="flex h-11 w-11 items-center justify-center text-3xl font-bold leading-none transition-transform active:scale-90"
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

import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { FullProfile } from "@/components/FullProfile";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { profileLoop } from "@/components/living-g/profile-loop";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";
import type { LoopBlock } from "@/components/living-g/profile-loop";
import { memberById, type Member } from "@/data/giver";
import { buzz } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * One community member, shown through the approved full-size Living G.
 *
 * THE LIVING G SHOWS WHAT'S HAPPENING — never who the person is. The middle
 * loop carries their current WISH (what they need), the bottom loop carries
 * what they are currently OFFERING. Biography lives on the full profile page,
 * reached by tapping their photo. Those two jobs never mix again.
 */
type Deep = "wish" | "activity" | null;

/** How each category reads when the selector rests on it. */
const OFFER_LABEL: Record<Mode, string> = {
  wish: "wish",
  give: "currently offering",
  trade: "trading",
  borrow: "wants to borrow",
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
  /**
   * THE PROFILE TOGGLE. It rests on give — what this person is offering — but
   * it MOVES: dragging it shows what else they have going on right now.
   */
  const [seat, setSeat] = useState<Mode>("give");
  /** Tapping the photo opens a real, scrollable profile page. */
  const [profile, setProfile] = useState<string | null>(null);

  useEffect(() => {
    setDeep(null);
    setProfile(null);
    setSeat("give");
  }, [member.id]);

  /** THE MIDDLE LOOP: what do they need right now? */
  const wishes = member.active.wish;
  const wish: LoopBlock[] = wishes.length
    ? [
        { text: "wish", role: "secondary" },
        { text: wishes[0]!, role: "primary" },
        ...(wishes.length > 1
          ? [
              {
                text: `+${wishes.length - 1} more`,
                role: "tertiary" as const,
                lead: true,
              },
            ]
          : []),
      ]
    : [
        { text: "wish", role: "secondary" },
        { text: "nothing right now", role: "tertiary" },
      ];

  /**
   * THE BOTTOM LOOP: what are they offering? The selector's seat picks the
   * category; the loop shows the primary item plus a quiet count. Zero items
   * stays quiet — no "0", no empty count.
   */
  const activity: LoopBlock[] = (() => {
    const items = member.active[seat];
    const label = OFFER_LABEL[seat];
    if (!items.length) {
      return [
        { text: label, role: "secondary" as const },
        { text: "nothing right now", role: "tertiary" as const },
      ];
    }
    const blocks: LoopBlock[] = [
      { text: label, role: "secondary" },
      { text: items[0]!, role: "primary" },
    ];
    if (items.length > 1) {
      blocks.push({
        text: `+${items.length - 1} more`,
        role: "tertiary",
        lead: true,
      });
    }
    return blocks;
  })();

  const open = (d: Exclude<Deep, null>) => () => {
    buzz();
    setDeep(d);
  };

  const shown = profile ? memberById(profile) : null;
  if (shown) {
    return (
      <FullProfile
        member={shown}
        onBack={() => setProfile(shown.id === member.id ? null : member.id)}
        onOpen={(id) => setProfile(id)}
      />
    );
  }


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
          /* ONE SEAT = ONE MODE = ONE SET OF WORDS in the loops. */
          contentKey={`${member.id}-${seat}`}
          earCut
          overlay={
            <EarSelector
              mode={seat}
              /* Other people's Gs keep the four activity seats only. */
              onChange={(next) => setSeat(next as Mode)}

              photo={member.photo}
              // THE PHOTO IS THE GATEWAY: a tap opens their full profile.
              onTap={() => {
                buzz();
                setProfile(member.id);
              }}
              // The seats a person has taken part in, told in their colours.
              history={["wish", "give", "trade"]}
            />
          }
          regions={{
            middle: {
              onPress: open("wish"),
              render: (anchor) =>
                profileLoop({ anchor, region: "middle", blocks: wish }),
            },
            bottom: {
              onPress: open("activity"),
              render: (anchor) =>
                profileLoop({
                  anchor,
                  region: "bottom",
                  blocks: activity,
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
        {/*
          THE INTRODUCTION. One reusable, quiet line centred in the clean bottom
          band the artwork never enters — identical relative placement for every
          person, so it can never touch the stroke, photo, loops or toggle path.
        */}
        <span className="pointer-events-none absolute inset-x-0 text-center text-[12px] font-black lowercase tracking-[0.3em] opacity-55">
          meet {member.name.toLowerCase()}
        </span>


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
              {deep === "wish" ? "wish" : member.action}
            </h2>
            <div className="mt-8 space-y-5">
              {(deep === "wish" ? member.active.wish : member.active[seat]).map(
                (line) => (
                  <p key={line} className="text-2xl font-medium lowercase leading-tight">
                    {line}
                  </p>
                ),
              )}
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}

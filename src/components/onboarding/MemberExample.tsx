import { useEffect, useState } from "react";
import { FullProfile } from "@/components/FullProfile";
import { ActivityDetail } from "@/components/community/ActivityDetail";
import { Conversation } from "@/components/connection/Conversation";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { profileLoop } from "@/components/living-g/profile-loop";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";
import { SparkJourney } from "@/components/living-g/SparkJourney";
import type { LoopBlock } from "@/components/living-g/profile-loop";
import { memberById, pastConnectionCount, type Member } from "@/data/giver";
import { ACTIVITY_FILL, itemLine, myItems, splitTrade, tradeText } from "@/data/items";
import { useItems } from "@/hooks/use-items";
import { buzz } from "@/lib/haptics";


/**
 * ONE SAMPLE GIVER, SHOWN THROUGH THE APPROVED FULL-SIZE LIVING G.
 *
 * The mental model is fixed for all four onboarding people, in every world:
 *
 *   TOP LOOP     their photo + a quiet PAST CONNECTIONS count  (identity/history)
 *   MIDDLE LOOP  the SELECTED activity world: one primary item + "+N"  (now)
 *   BOTTOM LOOP  by day / by night / weekends                  (who they are)
 *
 * Only the MIDDLE loop changes when the toggle moves. The "+N" is a discovery
 * mechanic, not a report: tapping it reveals everything they have in that world.
 */
type Deep = Mode | "about" | null;

/** The lower personal-profile loop is always black — never an activity colour. */
const INK = "var(--giver-ink)";

/** How each world reads when the selector rests on it. */
const WORLD_LABEL: Record<Mode, string> = {
  wish: "wish",
  give: "giving",
  trade: "trading",
  borrow: "borrowing",
};

/** Trades always read as both sides, everywhere they appear. */
const line = (seat: Mode, text: string) => {
  if (seat !== "trade") return text;
  const { offer, want } = splitTrade(text);
  return tradeText(offer, want);
};

/**
 * EACH PERSON OPENS ON THEIR OWN WORLD, never all four on "give": the toggle's
 * resting seat comes from the person themselves.
 */
const START_SEAT: Record<Member["world"], Mode> = {
  giving: "give",
  wishing: "wish",
  trading: "trade",
  borrowing: "borrow",
};

export function MemberExample({
  member,
  first,
  last,
  sparks,
  onGive,
  onBack,
  onPrev,
  onNext,
  onDone,
}: {
  member: Member;
  first: boolean;
  last: boolean;
  /**
   * THE USER'S OWN SPARKS — the same single bundle carried from the intro. It
   * rides the yellow STROKE, never the white interior. Undefined once given.
   */
  sparks?: number;
  /** The user walked their sparks up this person's rail: they chose them. */
  onGive?: (mode: Mode) => void;
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
  const [seat, setSeat] = useState<Mode>(START_SEAT[member.world]);
  /** Tapping the photo opens a real, scrollable profile page. */
  const [profile, setProfile] = useState<string | null>(null);
  const itemState = useItems();

  useEffect(() => {
    setDeep(null);
    setProfile(null);
    setSeat(START_SEAT[member.world]);
  }, [member.id, member.world]);

  /**
   * THE MIDDLE LOOP: the SELECTED world only. One primary item in that world's
   * own colour, then a quiet "+N" that promises there is more behind it.
   */
/* ONE COLLECTION FOR EVERYONE: a sample person's activity is read from the
     same item store as mine, never from a second hard-coded copy. */
  const items = myItems(itemState, seat, member.id).map(itemLine);
  const activity: LoopBlock[] = items.length
    ? [
        /* EVERY element of the activity — label, item and "+N" — reads from the
           ONE activity colour map, so the label can never default to purple. */
        { text: WORLD_LABEL[seat], role: "secondary", fill: ACTIVITY_FILL[seat] },
        { text: items[0]!, role: "primary", fill: ACTIVITY_FILL[seat] },
        ...(items.length > 1
          ? [
              {
                text: `+${items.length - 1}`,
                role: "tertiary" as const,
                lead: true,
                fill: ACTIVITY_FILL[seat],
              },
            ]
          : []),
      ]
    : [
        { text: WORLD_LABEL[seat], role: "secondary", fill: ACTIVITY_FILL[seat] },
        { text: "nothing right now", role: "tertiary", fill: ACTIVITY_FILL[seat] },
      ];

  /**
   * THE BOTTOM LOOP: the person, never their activity. Stable in every world —
   * and always BLACK. The personal description never borrows the activity
   * colour: upper loop = activity colour, lower loop = ink.
   */
  const about: LoopBlock[] = [
    { text: "by day", role: "secondary", fill: INK },
    { text: member.byDay, role: "primary", fill: INK },
    { text: "by night", role: "secondary", lead: true, fill: INK },
    { text: member.byNight, role: "primary", fill: INK },
    { text: "weekends", role: "secondary", lead: true, fill: INK },
    { text: member.weekend, role: "primary", fill: INK },
  ];

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

  const revealed = deep && deep !== "about" ? deep : null;

  return (
    <div
      /* EVERY SAMPLE PROFILE IS THE COMMUNITY MEETING ME: yellow, all four. */
      data-world="community"
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      {/* Same identity position as giver on Home: quiet, centred, small. */}
      <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center gap-1 px-8">
        {/*
          ONE INTRODUCTION, ONE LINE, AT THE TOP: "meet @handle". The word and
          the handle are a single centred group — never split, never separately
          centred, never inside a loop.
        */}
        <span className="text-[12px] font-bold lowercase tracking-[0.26em] opacity-70">
          meet {member.username}
        </span>
        <span className="text-[10px] font-bold lowercase tracking-[0.26em] opacity-40">
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
            <>
              {/* THE RAIL LAYER. The user's one bundle of sparks rests ON the
                  yellow stroke of the bottom loop and can only travel along it,
                  up through the S-curve toward this person's top loop. */}
              {sparks !== undefined ? (
                <SparkJourney
                  key={member.id}
                  mode="gift"
                  count={sparks}
                  colour="var(--giver-connection)"
                  onArrive={() => onGive?.(seat)}
                />
              ) : null}
              <EarSelector
              mode={seat}
              /* Other people's Gs keep the four activity seats only. */
              onChange={(next) => setSeat(next as Mode)}
              {...(member.photo ? { photo: member.photo } : {})}
              /* PAST CONNECTIONS live with the photo, as one quiet number. */
              badge={pastConnectionCount(member)}
              // THE PHOTO IS THE GATEWAY: a tap opens their full profile.
              onTap={() => {
                buzz();
                setProfile(member.id);
              }}
              // The seats a person has taken part in, told in their colours.
              history={["wish", "give", "trade", "borrow"]}
              />
            </>
          }
          regions={{
            middle: {
              onPress: open(seat),
              render: (anchor) =>
                profileLoop({ anchor, region: "middle", blocks: activity }),
            },
            bottom: {
              onPress: open("about"),
              render: (anchor) =>
                profileLoop({ anchor, region: "bottom", blocks: about }),
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

      {/* WHAT WAS BEHIND THE "+N" — always a way back to this exact person. */}
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
            <h2
              className="mt-6 text-[15vw] font-black lowercase leading-[0.82] tracking-[-0.05em]"
              style={revealed ? { color: ACTIVITY_FILL[revealed] } : undefined}
            >
              {revealed ? WORLD_LABEL[revealed] : "about them"}
            </h2>
            {revealed ? (
              <div className="mt-8 space-y-5">
                {myItems(itemState, revealed, member.id).map((it) => (
                  <p
                    key={it.id}
                    className="text-2xl font-medium lowercase leading-tight"
                    style={{ color: ACTIVITY_FILL[revealed] }}
                  >
                    {itemLine(it)}
                  </p>
                ))}
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                <p className="text-2xl font-medium lowercase leading-tight">
                  {member.byDay} by day
                </p>
                <p className="text-2xl font-medium lowercase leading-tight">
                  {member.byNight} by night
                </p>
                <p className="text-2xl font-medium lowercase leading-tight">
                  {member.weekend} at weekends
                </p>
                <p className="text-xl font-medium lowercase leading-snug opacity-70">
                  {member.aboutMe}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    buzz();
                    setProfile(member.id);
                  }}
                  className="text-[12px] font-black lowercase tracking-[0.3em] underline underline-offset-8 opacity-70"
                >
                  see their whole profile
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

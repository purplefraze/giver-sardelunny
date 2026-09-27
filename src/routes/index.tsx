import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GDepthStack } from "@/components/living-g/GDepthStack";
import { GStage } from "@/components/living-g/GStage";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
} from "@/components/living-g/g-path";
import { useAppHeight } from "@/hooks/use-app-height";


import { Onboarding } from "@/components/Onboarding";
import { LaunchScreen } from "@/components/onboarding/LaunchScreen";
import { useSession } from "@/hooks/use-session";
import { clearOpening, openingPending } from "@/data/opening";
import { AboutForm } from "@/components/profile/AboutForm";
import { CategoryForm } from "@/components/profile/CategoryForm";
import { WorldIntro, type IntroTopic } from "@/components/WorldIntro";
import { ChooseWorld } from "@/components/ChooseWorld";
import { HelpIndex } from "@/components/HelpIndex";

import { introSeenStore } from "@/data/intro-seen";
import { useIntroSeen } from "@/hooks/use-intro-seen";

import { CommunityFeed } from "@/components/community/CommunityFeed";

import { CommunityLocked } from "@/components/community/CommunityLocked";
import { claimUnlockMoment, canEngageCommunity } from "@/data/community-access";
import { publishEligibility } from "@/data/account";
import { sparkFlashStore } from "@/data/spark-flash";
import { haptics } from "@/lib/haptics";
import { FullProfile } from "@/components/FullProfile";
import { FundForm } from "@/components/fund/FundForm";
import { useFund } from "@/hooks/use-fund";
import { fundableWishes, myContributions } from "@/data/fund";
import { formatCents } from "@/data/fund-rules";
import { memberById } from "@/data/giver";
import { ActivityDetail } from "@/components/community/ActivityDetail";
import { Conversation } from "@/components/connection/Conversation";
import { ConnectionsList } from "@/components/connection/ConnectionsList";
import { tutorialSeenStore } from "@/data/tutorial-seen";
import { useTutorialSeen } from "@/hooks/use-tutorial-seen";
import { useMemberEdits } from "@/hooks/use-member-edits";


import { unreadCount } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { clampField } from "@/components/living-g/profile-loop";
import { useMyProfile } from "@/hooks/use-my-profile";
import type { Category } from "@/data/my-profile";
import { myAsMember, myProfileStore } from "@/data/my-profile";
import { SparkFlash } from "@/components/SparkFlash";

import { EarSelector, MODES, type Mode, type Seat } from "@/components/living-g/EarSelector";

/**
 * THE TOGGLE ANSWERS "WHAT?" — wish / give / trade / borrow, and nothing else.
 * MY G and COMMUNI-G are not content types: they are the top and bottom loops.
 */
const MODES_ONLY = MODES;

/**
 * THE SIX POSITIONS, FIXED: my g (12) · give · wish · borrow · lend (9) ·
 * trade (3). LEND is its own seat; underneath it is the lending side of the
 * borrow world, so it keeps one content model and its own colour.
 */
const ACTIVITY_SEATS = [...MODES, "lend", "fund"] as const;
type ActivitySeat = (typeof ACTIVITY_SEATS)[number];

/**
 * The item world a seat reads from. Lend shares borrow's records. FUND (7:30)
 * has no items of its own: it attaches money pledges TO other people's
 * Wishes, so it reads the wish world (and its own contributions store).
 */
const seatMode = (s: ActivitySeat): Mode =>
  s === "lend" ? "borrow" : s === "fund" ? "wish" : s;

const FIRST_USE_SEAT_KEY = "giver.first-use.seat";
const TOGGLE_WORDS_KEY = "giver.toggleWordsUnlocked";

function readToggleWordsUnlocked(): boolean {
  try {
    return window.localStorage.getItem(TOGGLE_WORDS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberToggleWordsUnlocked() {
  try {
    window.localStorage.setItem(TOGGLE_WORDS_KEY, "1");
  } catch {
    /* private mode */
  }
}

function rememberFirstUseSeat(seat: ActivitySeat) {
  try {
    window.localStorage.setItem(FIRST_USE_SEAT_KEY, seat);
  } catch {
    /* private mode: the mode simply does not survive the refresh */
  }
}

function readFirstUseSeat(): ActivitySeat | null {
  try {
    const raw = window.localStorage.getItem(FIRST_USE_SEAT_KEY);
    return raw && (ACTIVITY_SEATS as readonly string[]).includes(raw)
      ? (raw as ActivitySeat)
      : null;
  } catch {
    return null;
  }
}
import { useItems } from "@/hooks/use-items";
import {
  ME_ID,
  communityItems,
  itemLine,
  itemsStore,
  type BorrowSide,
  type ItemType,
} from "@/data/items";

import { LedgerHistory } from "@/components/history/LedgerHistory";
import type { Currency } from "@/data/ledger";


import { World } from "@/components/World";
import { DevControls } from "@/components/DevControls";
import { DevSeal } from "@/components/DevSeal";
import { lifecycleStore } from "@/data/lifecycle";
import { removeLegacyAutomaticProfile } from "@/data/dev-fixture";
import { initializeFirstUse } from "@/data/first-use";
import { hasLoopCopy, loopCopyFor, seatHintRetired } from "@/data/loop-copy";
import { LOOP_HINT_MS, loopHint, loopLine } from "@/components/living-g/loop-hint";
import { LOOP_TEXT_FILL } from "@/components/living-g/type-scale";
import { useLifecycle } from "@/hooks/use-lifecycle";

/**
 * ONE LIVING G, FIVE TOGGLE STATES.
 *
 * GIVER = ME (my profile):        top = more information
 *                                 middle = latest activity
 *                                 bottom = my gives
 *
 * WISH / GIVE / TRADE / BORROW = ACTIVITY WORLDS, always the same shape:
 *                                 middle = MY <type>
 *                                 bottom = COMMUNITY <type>
 *
 * The toggle never navigates: it only changes what the same persistent G holds.
 */
const MODE_CONTENT: Record<
  Mode,
  {
    mine: { title: string; body: React.ReactNode };
    community: { title: string };
  }
> = {
  wish: {
    mine: {
      title: "my wishes",
      body: <p className="opacity-70">make a wish. keep it small and human.</p>,
    },
    community: { title: "communi-g wishes" },
  },
  give: {
    mine: {
      title: "my gives",
      body: <p className="opacity-70">share something you have, know, or can do.</p>,
    },
    community: { title: "communi-g gives" },
  },
  trade: {
    mine: {
      title: "my trades",
      body: <p className="opacity-70">offer something, ask for something back.</p>,
    },
    community: { title: "communi-g trades" },
  },
  borrow: {
    mine: {
      title: "my borrows",
      body: <p className="opacity-70">ask to borrow something for a while.</p>,
    },
    community: { title: "communi-g borrows" },
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Giver — Wishing. Giving. Trading." },
      {
        name: "description",
        content:
          "Giver is a community built on wishing, giving and trading. Kindness is currency, and Sparks are the energy that moves it.",
      },
      { property: "og:title", content: "Giver — Kindness is currency" },
      {
        property: "og:description",
        content:
          "One shape. One Living G. Wish, give, trade and borrow with the people around you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  /* A populated current-user fixture used to be injected here automatically.
     Remove that legacy state once; development profiles are now explicit only. */
  removeLegacyAutomaticProfile();
  /* The canvas measures the real viewport itself — see use-app-height. */
  useAppHeight();
  const lifecycle = useLifecycle();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    /* Restore the inherited first-use mode before the empty G is first shown. */
    const remembered = readFirstUseSeat();
    if (remembered && !lifecycleStore.get().profileSetupCompletedAt) {
      setSeatState(remembered);
    }
  }, []);


  const [sessionEntered, setSessionEntered] = useState(false);
  /** True for one crossfade right after the launch screen hands over. */
  const [launchVeil, setLaunchVeil] = useState(false);
  const entered = Boolean(lifecycle.onboardingCompletedAt) || sessionEntered;
  /**
   * THE OPENING, OWED (src/data/opening.ts): the /auth magic-link success and
   * the dev skip land here already "entered", so the post-sign-in opening plays
   * over the G once (magic link: only once a session is ready; dev skip: once
   * the session has answered either way). While the session is
   * still answering, a plain white cover keeps the G from flashing first.
   */
  const session = useSession();
  const [opening, setOpening] = useState(false);
  const owed = hydrated && entered && !opening ? openingPending() : null;
  const openingCover = owed !== null && session.status === "loading";
  useEffect(() => {
    if (owed === null || session.status === "loading") return;
    /* A magic-link opening waits for a real session; the dev skip does not. */
    if (owed === "auth" && session.status !== "ready") return;
    clearOpening();
    /* The wheel the opening hands over to starts at Give (1:30). */
    setSeatState("give");
    setOpening(true);
  }, [owed, session.status]);
  /** No corner chrome ("sign in" / @name, "dev") while the opening owns the screen. */
  const chromeQuiet = opening || openingCover || launchVeil;
  /**
   * THE ONE EDITOR DESTINATION. Tapping a loop opens the editor for that part of
   * the G; closing it returns to the SAME seat, with the saved data already
   * alive inside the loop. Forms are never appended beneath the G.
   */
  const [editor, setEditor] = useState<
    | { kind: "about" }
    | { kind: "category"; category: Category; side?: BorrowSide }
    /* FUND'S SHEET — same middle-loop chamber, its own content. */
    | { kind: "fund" }
    | null
  >(null);


  /**
   * THE ONE SOURCE OF TRUTH for the toggle: wish | give | trade | borrow.
   * THE TOGGLE ANSWERS "WHAT?" — the loops answer "WHOSE?" (top = me,
   * middle = mine, bottom = everyone).
   */
    /* THE SIX FIXED SEATS: my g (12) · give · wish · borrow · lend (9) ·
     trade (3). */
  const [seat, setSeatState] = useState<ActivitySeat | "giver">("give");
  /**
   * TOGGLE WORDS STAY SILENT until the first successful seat change away from
   * the initial landing. Persisted so a refresh does not re-mute the bead.
   */
  const [toggleWordsUnlocked, setToggleWordsUnlocked] = useState(false);
  useEffect(() => {
    setToggleWordsUnlocked(readToggleWordsUnlocked());
  }, []);
  /**
   * TOGGLE HINT. Set on EVERY toggle use (seat change or tap on the toggle):
   * the seat whose pair is fading through the loops right now, plus a nonce
   * so a repeat use replays the fade from the start. Loops carry NO words
   * otherwise — before the first toggle use and after each fade.
   */
  const [hint, setHint] = useState<{ seat: Seat; nonce: number } | null>(null);
  const hintNonce = useRef(0);
  useEffect(() => {
    if (hint === null) return;
    /* The hint dissolves on its own (CSS); this only unmounts it afterwards.
       Scoped to the hint — toggle responses never wait on this timer. */
    const t = window.setTimeout(() => setHint(null), LOOP_HINT_MS);
    return () => window.clearTimeout(t);
  }, [hint]);
  /* THE INHERITED FIRST-USE MODE SURVIVES A REFRESH: it is a real state, not a
     transient default, so the empty G never falls back to red or green. */
  const setSeat = (next: Seat) => {
    setSeatState(next);
    /* MY G IS A DESTINATION, NOT AN INHERITED MODE: only activity seats are
       remembered as the first-use mode. */
    if (next !== "giver") rememberFirstUseSeat(next);
  };

  /**
   * ANY USE OF THE TOGGLE. Unlocks the bead word on the very first use
   * (persisted) and fades the seat's middle/bottom pair through the loops
   * (~1.8s, see LOOP_HINT_MS) on every use — PER SEAT, until I have done
   * that seat's action (see `retiredAt` / seatHintRetired in loop-copy.ts).
   * Then only that seat goes silent; other seats keep hinting. My G (and
   * its communi-g side) hints until my profile is filled out.
   */
  const noteToggleUse = (at: Seat) => {
    if (!toggleWordsUnlocked) {
      rememberToggleWordsUnlocked();
      setToggleWordsUnlocked(true);
      tutorialSeenStore.markSeen();
    }
    hintNonce.current += 1;
    setHint(
      !retiredAt(at) && hasLoopCopy(at) ? { seat: at, nonce: hintNonce.current } : null,
    );
  };

  /**
   * A REAL SEAT CHANGE (drag or seat-tap on the track). EarSelector's commit
   * already fires haptics.light on every snap — that is the seat-change haptic.
   */
  const moveToggle = (next: Seat) => {
    if (next === seat) return;
    setSeat(next);
    noteToggleUse(next);
  };

  /**
   * FIRST-TIME WORLD EXPLANATION. Giver explains wish / give / trade / borrow
   * once each, from four PERSISTED flags — never component state — then gets
   * out of the way. It is UI only: it creates no items and touches no profile.
   *
   * `help` marks an explanation the user asked for on purpose: it sets no flag
   * and leads nowhere — it explains, then hands the G straight back.
   */
  const [intro, setIntro] = useState<{ topic: IntroTopic; help: boolean } | null>(null);
  const introSeen = useIntroSeen();

  /** THE EMPTY MIDDLE LOOP'S QUESTION: what would you like to do? */
  const [choose, setChoose] = useState(false);
  /** The voluntary help area — every explanation, on demand. */
  const [help, setHelp] = useState(false);

  /**
   * DISCOVER -> INTENT -> CONNECT -> COORDINATE -> COMPLETE -> VERIFY.
   * Each step is its own destination, and none of them ever skips ahead:
   * browsing opens an activity, an activity opens a conversation, and only a
   * conversation both people verify ever settles sparks.
   */
  const [browse, setBrowse] = useState<{
    type: ItemType | null;
    /** MINE FIRST when arriving straight from publishing my own. */
    mine?: boolean;
  } | null>(null);

  /**
   * SEARCH IS THE TOP LOOP, AND ONLY ON MY OWN G. It opens already scoped to the
   * toggle's world, so the content type is never asked for twice.
   */
  const [detail, setDetail] = useState<string | null>(null);

  const [talking, setTalking] = useState<string | null>(null);
  const [threads, setThreads] = useState(false);
  /** SPARKS AND SPARKLES ARE HISTORIES, opened from my own photo's toggle. */
  const [history, setHistory] = useState<Currency | null>(null);

  /** THE PERSON IS THEIR OWN DESTINATION: @username opens who they are. */
  const [person, setPerson] = useState<string | null>(null);
  /** WHICH SECTION a profile opens on when it was reached from an activity. */
  const [personFocus, setPersonFocus] = useState<ItemType | null>(null);

  /* MY OWN PROFILE IS ALSO INSIDE THE G: it unfurls, it never opens a page. */
  const aboutOpen = editor?.kind === "about";




  /**
   * THE COMMUNITY DOOR, WHEN IT IS STILL SHUT. Not an error and not a warning —
   * one question, asked once, with the way to open it right underneath.
   */
  const [locked, setLocked] = useState(false);

  /**
   * WHICH SIDE OF BORROWING THE DOOR ALREADY ANSWERED. The three-intent door
   * has already asked "keeping or borrowing?" / "giving or lending?", so the
   * form must never ask the same question a second time.
   */
  const [pendingSide, setPendingSide] = useState<BorrowSide | undefined>(undefined);

  /**
   * ONE DOOR INTO A WORLD. First time: explain, then the form. Every time after:
   * straight to the form. The flag decides, never the caller.
   */
  const openWorld = (category: Category, side?: BorrowSide) => {
    setChoose(false);
    setPendingSide(side);
    if (introSeen[category]) setEditor({ kind: "category", category, ...(side ? { side } : {}) });
    else showIntro(category);
  };


  /**
   * ENTERING THE INSTRUCTIONS IS SEEING THEM. The persisted flag is written the
   * instant they open — not on continue, not on save — so pressing back, using
   * a different door, remounting or reloading can never replay them.
   */
  const showIntro = (category: Category) => {
    introSeenStore.markSeen(category);
    setIntro({ topic: category, help: false });
  };

  useEffect(() => {
    /* FIRST ARRIVAL IS PURE PLAY: moving the toggle explains nothing and
       navigates nowhere until the person has built their profile. */
    if (!entered || !myProfileStore.get().built) return;
    if (seat === "giver") return;
    /* Fund has no world explanation (yet); it must never replay Wish's. */
    if (seat === "fund") return;
    const topic = seatMode(seat);
    if (introSeenStore.get()[topic]) return;
    showIntro(topic);
  }, [entered, seat]);

  /** A PERSISTED fact about this person: the G has already taught itself. */
  const tutorialSeen = useTutorialSeen();

  /**
   * INSTRUCTIONAL COPY IS A CUE, NEVER FURNITURE — AND NEVER MODE CONTENT.
   * Testing phase: the old "teach the G on entry" labels (and press-and-hold
   * label recall) are retired. Loop words only ever appear as the faint toggle
   * hint, on every toggle use (see noteToggleUse / loop-copy.ts).
   */

  /** ONE source of truth for who I am and what I have going on. */
  const me = useMyProfile();
  const items = useItems();
  /* ADMIN PEOPLE EDITS re-render every screen below, so a corrected person is
     immediately true in the feed, on their profile and on every item. */
  useMemberEdits();

  const links = useConnections();
  /** Fund pledges — their own store; they never touch items or sparks. */
  const funds = useFund();
  /** Per-seat hint retirement — derived, reactive, from items + connections
      (+ pledges, read by the fund seat only). */
  const retiredAt = (at: Seat) => seatHintRetired(at, items, links, me, funds);
  /** The CURRENT seat's hint has been retired (always true on My G). */
  const retired = retiredAt(seat);

  /* SEVEN DAYS AND THE SPARKS COME HOME: expire stale wishes on every entry. */
  useEffect(() => {
    myProfileStore.sweepWishes();
    /* AND ANY OFFER WHOSE DAY HAS PASSED LEAVES CIRCULATION BY ITSELF. */
    itemsStore.sweepAvailability();
  }, []);


  /* Migrate an existing completed prototype profile into the explicit lifecycle. */
  useEffect(() => {
    if (!lifecycle.profileSetupCompletedAt && me.built) {
      lifecycleStore.migrateCompletedProfile();
    }
  }, [lifecycle.profileSetupCompletedAt, me.built]);

  /**
   * THE CARDINAL GIVER RULE: Communi-g is visible to everyone; engaging
   * (respond / message / sparkle) needs one active give of my own. Permanent,
   * re-checked here on every render — never a flag set once during onboarding.
   */
  const canEngage = canEngageCommunity(items);
  const canCommunity = canEngage; // unlock celebration + locked overlay dismiss

  /**
   * WHY A GIVE CANNOT BECOME REAL YET — named plainly, so the locked door never
   * asks for a give the account is not yet allowed to publish.
   */
  const accountEligibility = publishEligibility({
    username: me.username,
    birthday: me.birthday,
  });
  const accountProblem = accountEligibility.ok ? null : accountEligibility.say;


  /* THE KEY TURNING is worth exactly one moment, and never repeats. */
  useEffect(() => {
    if (!canCommunity) return;
    if (!claimUnlockMoment()) return;
    haptics.success();
    sparkFlashStore.show("community unlocked ✨");
  }, [canCommunity]);

  useEffect(() => {
    if (canCommunity && locked) setLocked(false);
  }, [canCommunity, locked]);

  /** PRIVATE TO ME: how many conversations have something waiting inside. */
  const unread = unreadCount(links, ME_ID);

  /**
   * THE TOGGLE IS THE WORLD: wish | give | trade | borrow — plus MY G, the one
   * destination seat at 12 o'clock. `mode` is the activity world, and it is
   * null while the toggle is sitting on My G.
   */
  const activity: ActivitySeat | null = seat === "giver" ? null : seat;
  /* The last activity world still owns the loops' grammar when My G is held. */
  const mode: Mode = seatMode(activity ?? "give");
  const content = MODE_CONTENT[mode];
  /** FUND IS ITS OWN SEAT: it borrows the wish world's items, never its forms. */
  const funding = activity === "fund";
  /** The toggle hint for THIS seat, only while it is fading through. */
  const hintNow = !retired && hint !== null && hint.seat === seat ? hint : null;
  const hintCopy = hintNow ? loopCopyFor(seat) : null;

  /**
   * FIRST ARRIVAL — THE EMPTY LIVING G, JUST HANDED OVER.
   *
   * Until the profile exists the G holds NOTHING: no photo, no latest, no
   * community, no placeholder. Only the toggle, free to travel every mode and
   * recolour the whole G. Any tap on the G leads to one place: set up your
   * profile.
   */
  const firstArrival =
    Boolean(lifecycle.onboardingCompletedAt) && !lifecycle.profileSetupCompletedAt;
  const setup = () => {
    /* DISCOVERY UNLOCKS MY G — the moment profile setup opens, and forever. */
    lifecycleStore.discoverProfile();
    setEditor({ kind: "about" });
  };

  /**
   * MY G AT 12 O'CLOCK, ONCE IT HAS BEEN FOUND. Before the discovery there is
   * nothing there; afterwards the seat exists permanently, whether or not a
   * single field was ever filled in. LEND sits at 9 o'clock, TRADE at 3.
   */
  const myGSeats: readonly Seat[] = ["giver", ...ACTIVITY_SEATS] as const;

  /**
   * TOP = ME. MY G is not a content type and never a toggle seat: it is the
   * top loop, and it opens my own profile — or, before it exists, its setup.
   */
  const openMyG = () => {
    setup();
  };

  /**
   * THE TOGGLE LOOP AND THE MIDDLE LOOP ARE THE SAME DOOR. At an activity seat
   * they enter that selected world; at My G they enter the person's profile.
   */
  const enterSelectedWorld = () => {
    if (activity === null) {
      openMyG();
      return;
    }
    /* FUND opens its own pledge sheet, in the same middle-loop chamber. */
    if (activity === "fund") {
      setEditor({ kind: "fund" });
      return;
    }
    /* TAP TO ENTER (testing phase): the seat's own action screen — the
       existing CategoryForm ("what can you give today?" for Give) — opens
       even before the profile exists. It used to route first-arrival taps to
       profile setup; that detour is removed for testing. */
    setEditor({
      kind: "category",
      category: mode,
      ...(seat === "lend" ? { side: "lend" as BorrowSide } : {}),
    });
  };

  /**
   * TAP ON THE TOGGLE CIRCLE (a tap without drag — EarSelector's existing
   * onTap). Tapping is a toggle use, so it shows the hint; tapping AGAIN while
   * that hint is still on screen is the confirmation and enters the seat
   * (Give → the existing "give something" CategoryForm). So: tap = "what is
   * this?", tap-tap = "do it" (My G included, while its hint is active).
   * Once the CURRENT seat's hint is retired there is nothing to show, so a
   * single tap goes straight in. The middle loop always enters on one tap.
   */
  const tapToggle = () => {
    if (retired || hintNow !== null) {
      enterSelectedWorld();
      return;
    }
    haptics.light();
    noteToggleUse(seat);
  };

  /**
   * MY MOST RECENT <type> — the middle loop is MINE in the toggle's world, and
   * "mine" means the one I touched last, not a ranked list.
   */
  const myRecent = [...me.records[mode]].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

  /* FUND'S TICKERS: middle = my latest pledge ("$25 to …"), bottom = wishes I
     could fund. Same one-line ticker rules as every other seat. */
  const myPledges = funding ? myContributions(funds, ME_ID) : [];
  const latestPledge = myPledges[0];
  const latestPledgeWish = latestPledge
    ? items.items.find((i) => i.id === latestPledge.wishId)
    : undefined;
  const myMode = funding
    ? latestPledge
      ? `${formatCents(latestPledge.amountCents)} to ${latestPledgeWish ? itemLine(latestPledgeWish) : "a wish"}`
      : null
    : myRecent
      ? itemLine(myRecent)
      : null;
  const myCount = funding ? myPledges.length : me.items[mode].length;

  /** COMMUNI-G <type> — the same item collection, queried by everyone else. */
  const theirs = funding
    ? fundableWishes(items, ME_ID)
    : communityItems(items, { type: mode as ItemType, excludeOwnerId: ME_ID });
  const firstTheirs = theirs[0];
  const community = firstTheirs ? itemLine(firstTheirs) : null;
  /** The ticker's ink: the seat's own colour — the G's (--world-g via
      LOOP_TEXT_FILL), so Lend reads lend, Fund reads hot pink, My G reads blue. */
  const tickerFill = LOOP_TEXT_FILL;

  /**
   * NEVER A LIST INSIDE THE G: one item, then how much more there is — as
   * ONE tidy line ("science tutoring +15 more"), lowercased by loopLine.
   */
  const tickerText = (item: string, count: number) =>
    `${clampField(item)}${count > 1 ? ` +${count - 1}\u00a0more` : ""}`;

  /* Persisted lifecycle/profile state is browser-owned. Render neither the
     onboarding nor My G until it is hydrated, preventing a stale server frame
     from flashing or surviving as the first post-onboarding screen. */
  if (!hydrated) {
    /* NEVER A BLANK, NEVER AN OVERFLOWING FIRST FRAME: the canvas is already
       the right size and the G is already there, simply not yet awake. */
    return (
      <main
        className="g-canvas-h g-canvas-w relative mx-auto overflow-hidden"
        style={{ background: "var(--giver-paper)" }}
        aria-busy="true"
      >
        <div className="absolute inset-0 opacity-[0.07]">
          <GStage>
            <svg viewBox={LIVING_G_VIEWBOX} className="h-full w-full overflow-visible">
              <g transform={LIVING_G_TRANSFORM} fill="var(--giver-ink)">
                <path d={LIVING_G_PATH} />
              </g>
            </svg>
          </GStage>
        </div>
      </main>
    );
  }

  return (
    <main className="g-canvas-h g-canvas-w relative mx-auto overflow-hidden">

      {/* COLD OPEN IS ONLY THE WORDMARK: no dev corner or @name/sign-in seal
         over the launch/auth screens. Both return once the G is showing.
         (DevControls is also DEV-build-only; its "replay onboarding" now
         replays AuthGate → the opening (LaunchScreen), never PlayIntro.) */}
      {entered && !chromeQuiet ? <DevControls /> : null}
      {entered && !chromeQuiet ? <DevSeal /> : null}
      {!entered ? (
        /* ONBOARDING ENDS AT MY G. No profile flow, no reward screen. */
        <Onboarding
          onDone={({ earned, mode: gifted, fromLaunch }) => {
            /* CROSSFADE: the still wordmark is laid over the G and fades out. */
            if (fromLaunch) setLaunchVeil(true);
            /* CONTINUITY: my first G opens in the exact mode I just gave in —
               otherwise at GIVE (1:30), where the opening's toggle rests. */
            setSeat(gifted ?? "give");
            /* A NEW PERSON GETS A CLEAN, IDEMPOTENT HANDOVER. Sample people and
               their community records are never projected into this profile. */
            initializeFirstUse(earned);
            setSessionEntered(true);
          }}
        />
      ) : (
        <>
          {/*
            THE WORKSPACE — one Living G, always yours.
            TOP = ME (my g) · MIDDLE = MINE · BOTTOM = EVERYONE (communi-g).
            The toggle answers WHAT; the loops answer WHOSE.
          */}
          <World
            /* THE TOGGLE'S WORLD OWNS THE COLOUR. My G is a destination, not a seat. */
            world={activity ?? "profile"}
            /* ONE ACTIVE SEAT = ONE CLEAN SET OF IN-LOOP TEXT. */
            contentKey={seat}
            active={
              editor === null &&
              intro === null &&
              !choose &&
              !help &&
              browse === null &&
              !locked &&
              detail === null &&
              talking === null &&
              !threads
            }
            earCut
            overlay={
              <EarSelector
                mode={seat}
                onChange={moveToggle}
                seats={myGSeats}
                hideWord={!toggleWordsUnlocked}
                {...(!firstArrival && me.built && me.photo ? { photo: me.photo } : {})}
                {...(!firstArrival && me.built && unread ? { badge: unread } : {})}
                /* FIRST USE HAS NO ACCOUNT FURNITURE — not even hidden peek data. */
                {...(!firstArrival ? { sparks: me.sparks } : {})}

                /* TAP ON THE TOGGLE: first tap shows the seat's hint; a second
                   tap while the hint is still showing enters the seat's action
                   screen (see tapToggle). */
                onTap={tapToggle}
              />
            }

            regions={{
              /* TOP LOOP = MY G. Sacred, permanent, mine — or its setup. */
              top: {
                label: "",
                panelTitle: "my g",
                panelBody: null,
                onPress: openMyG,
              },

              /*
                MIDDLE LOOP = MINE, in the toggle's world. Tapping opens that
                item's own editor; saving returns to this exact seat with the
                loop already showing the new content.
              */
              middle: {
                label: "",
                panelTitle: content.mine.title,
                panelBody: null,
                onPress: enterSelectedWorld,

                /* ONE LOOP LINE AT A TIME. While this seat's hint is active
                   ("give something"…) the hint owns the loop; once the seat's
                   hint is retired, the ticker (my latest, same type rules)
                   shows. EMPTY MEANS VISUALLY EMPTY — nothing invented. */
                render: () =>
                  hintCopy?.middle && hintNow
                    ? loopHint("middle", hintCopy.middle, hintNow.nonce)
                    : retired && activity !== null && myMode
                      ? loopLine("middle", tickerText(myMode, myCount), tickerFill)
                      : null,
              },
              /*
                BOTTOM LOOP = EVERYONE. COMMUNI-G, already filtered to the
                toggle's world; the mixed community lives one word away inside.
              */
              bottom: {
                label: "",
                panelTitle: content.community.title,
                panelBody: null,
                onPress:
                  activity === null
                    ? openMyG
                    : firstArrival
                      ? /* NOTHING EXISTS YET: the one action is building my g. */ setup
                      : funding
                        ? /* FUND'S COMMUNI-G = wishes to fund, in its own sheet. */
                          () => setEditor({ kind: "fund" })
                        : () => {
                          /* VISIBLE TO EVERYONE. Interaction locks live inside the detail. */
                          setBrowse({ type: mode as ItemType });
                        },

                /* COMMUNI-G TICKER: the latest community line for this
                   world, same type rules as the hint. The hint wins while it
                   is active; the ticker only shows once the seat is retired. */
                render: () =>
                  hintCopy?.bottom && hintNow
                    ? loopHint("bottom", hintCopy.bottom, hintNow.nonce)
                    : retired && activity !== null && community
                      ? loopLine("bottom", tickerText(community, theirs.length), tickerFill)
                      : null,
              },
            }}
          />

          {/* "+10 SPARKS ✨" — quick recognition, never a reward screen. */}
          <SparkFlash />

          {/*
            THE FIRST-USE LEGEND, AND ONLY THE FIRST USE. Once the Living G has
            taught itself, this corner clears for good — help then lives inside
            the profile, where it belongs. Sparks are no longer printed here:
            they ride my own top profile loop (see EarSelector).
          */}
          {!firstArrival &&
          activity !== null &&
          !funding &&
          !tutorialSeen &&
          intro === null &&
          editor === null &&
          !choose &&
          !help ? (
            <button
              type="button"
              onClick={() => setIntro({ topic: mode, help: true })}
              className="absolute bottom-1 left-3 z-20 p-3 text-[11px] font-black lowercase tracking-[0.28em] opacity-40"
            >
              {`what’s ${mode}?`}
            </button>
          ) : null}

          {/*
            MY G STAYS CLEAN. There is NO permanent messages control anywhere
            around the Living G: messages are private account information and
            live inside my full profile, beside sparks and sparkles. The only
            messaging mark permitted out here is a tiny unread badge on my own
            top profile loop (see EarSelector), which simply says something is
            waiting inside.
            NO SEPARATE "COMMUNITY" WORD either — the bottom loop is that door.
          */}

          {/*
            EVERY DESTINATION IS A DEPTH OF THIS SAME LIVING G.
            The list is in canonical depth order: the camera moves inward toward
            the region each destination belongs to, the artwork unfurls into the
            frame around it, and the depth behind stays exactly where it was.
            Leaving — by a back control or by pinching outward — runs the
            identical movement in reverse. No screen ever simply replaces the G.
          */}
          <GDepthStack
            onPop={(id) => {
              if (id === "talking") setTalking(null);
              else if (id === "detail") setDetail(null);
              else if (id === "person") {
                setPersonFocus(null);
                setPerson(null);
              } else if (id === "browse") setBrowse(null);
              else if (id === "threads") setThreads(false);
              else if (id === "history") setHistory(null);
              else if (id === "about" || id === "category" || id === "fund") setEditor(null);
              else if (id === "help") setHelp(false);
              else if (id === "choose") setChoose(false);
              else if (id === "intro") setIntro(null);
              else if (id === "locked") setLocked(false);
            }}
            slots={[
              /* LOOKING IS OPEN; ENGAGING IS NOT. The door asks the one question. */
              {
                id: "locked",
                open: locked,
                anchor: "bottom",
                world: "community",
                children: locked ? (
                  <CommunityLocked
                    problem={accountProblem}
                    onFix={() => {
                      setLocked(false);
                      setup();
                    }}
                    onGive={() => {
                      setLocked(false);
                      setSeat("give");
                      setEditor({ kind: "category", category: "give" });
                    }}
                    onClose={() => setLocked(false)}
                  />
                ) : null,

              },

              /* FIRST-TIME EXPLANATION -> straight into my <type>. */
              {
                id: "intro",
                open: intro !== null,
                anchor: "middle",
                world: activity ?? "profile",
                children: intro ? (
                  <WorldIntro
                    category={intro.topic}
                    help={intro.help}
                    onDone={() => {
                      const { topic, help: voluntary } = intro;
                      setIntro(null);
                      if (voluntary || topic === "sparks") return;
                      /* Already marked seen on entry — this just opens the form. */
                      setEditor({
                        kind: "category",
                        category: topic,
                        ...(pendingSide ? { side: pendingSide } : {}),
                      });

                    }}
                  />
                ) : null,
              },

              /* THE EMPTY MIDDLE LOOP'S QUESTION -> the chosen world's door. */
              {
                id: "choose",
                open: choose,
                anchor: "middle",
                world: activity ?? "profile",
                children: choose ? (
                  <ChooseWorld onChoose={openWorld} onCancel={() => setChoose(false)} />
                ) : null,
              },

              /* THE VOLUNTARY HELP AREA — explanations only, no flags, no forms. */
              {
                id: "help",
                open: help,
                anchor: "top",
                world: "me",
                children: help ? (
                  <HelpIndex
                    onOpen={(topic) => setIntro({ topic, help: true })}
                    onClose={() => setHelp(false)}
                  />
                ) : null,
              },

              /*
                A FORM IS A DEEPER CHAMBER INSIDE THE G, never a separate page:
                the middle loop it belongs to becomes the room it is written in.
              */
              {
                id: "category",
                open: editor?.kind === "category",
                anchor: "middle",
                world: editor?.kind === "category" ? editor.category : (activity ?? "profile"),
                children:
                  editor?.kind === "category" ? (
                    <CategoryForm
                      category={editor.category}
                      {...(editor.side ? { side: editor.side } : {})}
                      onDone={() => setEditor(null)}
                      onSeeInCommunity={() => {
                        const type = editor.category as ItemType;
                        setEditor(null);
                        setBrowse({ type, mine: true });
                      }}
                    />


                  ) : null,
              },

              /* FUND'S PLEDGE SHEET — the same middle-loop chamber as a form. */
              {
                id: "fund",
                open: editor?.kind === "fund",
                anchor: "middle",
                world: "fund",
                children:
                  editor?.kind === "fund" ? <FundForm onDone={() => setEditor(null)} /> : null,
              },

              /*
                MY OWN PROFILE UNFURLS OUT OF THE G ITSELF — the same artwork
                becomes the frame, and the person appears inside it.
              */
              {
                id: "about",
                open: aboutOpen,
                anchor: "top",
                world: "me",
                children: aboutOpen ? (
                  <AboutForm
                    unread={unread}
                    firstSetup={firstArrival}
                    onMessages={() => {
                      setEditor(null);
                      setThreads(true);
                    }}
                    onSparks={() => {
                      setEditor(null);
                      setHistory("spark");
                    }}
                    onSparkles={() => {
                      setEditor(null);
                      setHistory("sparkle");
                    }}
                    onDone={() => {
                      lifecycleStore.completeProfileSetup();
                      setEditor(null);
                    }}
                    onViewProfile={() => {
                      setEditor(null);
                      setPerson(ME_ID);
                    }}
                    onHelp={() => {
                      setEditor(null);
                      setHelp(true);
                    }}
                  />
                ) : null,
              },

              /*
                SPARKS AND SPARKLES ARE STORIES, NOT COUNTERS. Each is its own
                history, one depth further inside my own G.
              */
              {
                id: "history",
                open: history !== null,
                anchor: "top",
                world: "me",
                children: history ? (
                  <LedgerHistory currency={history} onClose={() => setHistory(null)} />
                ) : null,
              },

              {
                id: "threads",
                open: threads,
                anchor: "top",
                world: "me",
                children: threads ? (
                  <ConnectionsList
                    onOpen={(id) => setTalking(id)}
                    onClose={() => setThreads(false)}
                  />
                ) : null,
              },

              /* BROWSE -> ONE ACTIVITY -> A CONVERSATION. Never a shortcut. */
              {
                id: "browse",
                open: browse !== null,
                anchor: "bottom",
                world: activity ?? "community",
                children: browse ? (
                  <CommunityFeed
                    initialType={browse.type}
                    initialScope={browse.mine ? "mine" : "everyone"}

                    onOpen={(itemId) => setDetail(itemId)}
                    onOpenProfile={(ownerId) => {
                      setPersonFocus(null);
                      setPerson(ownerId);
                    }}
                    /* MY OWN GIVE REOPENS WHERE IT WAS WRITTEN. */
                    onEditMine={(itemId) => {
                      const mine = items.items.find((i) => i.id === itemId);
                      if (!mine) return;
                      setBrowse(null);
                      setEditor({
                        kind: "category",
                        category: mine.type,
                        ...(mine.side ? { side: mine.side } : {}),
                      });
                    }}
                    onClose={() => setBrowse(null)}
                  />

                ) : null,
              },

              /*
                @USERNAME -> DEEPER INSIDE THAT PERSON'S LIVING G. Not a page:
                the same artwork unfurls until its curves frame the screen.
              */
              {
                id: "person",
                open: person !== null,
                anchor: "middle",
                world: person === ME_ID ? "me" : "others",
                children: person
                  ? (() => {
                      const member = person === ME_ID ? myAsMember(me) : memberById(person);
                      return member ? (
                        <FullProfile
                          member={member}
                          world={person === ME_ID ? "me" : "others"}
                          focus={personFocus}
                          onBack={() => {
                            setPersonFocus(null);
                            setPerson(null);
                          }}
                          onOpen={(id) => {
                            setPersonFocus(null);
                            setPerson(id);
                          }}
                          /* MY WHOLE PROFILE IS ALSO THE EDITOR: touching me
                             opens the very same state, never a second screen. */
                          {...(person === ME_ID
                            ? {
                                onEdit: () => {
                                  setPerson(null);
                                  setEditor({ kind: "about" });
                                },
                              }
                            : {})}
                          /* EVERY ITEM ON EVERY PROFILE OPENS ITS OWN RICH DETAIL. */
                          onOpenItem={(itemId) => setDetail(itemId)}
                        />
                      ) : null;
                    })()
                  : null,
              },

              /* AN ITEM IS MORE OF THE SAME G: only the interior changes. */
              {
                id: "detail",
                open: detail !== null,
                anchor: "middle",
                world: activity ?? "others",
                children: detail ? (
                  <ActivityDetail
                    itemId={detail}
                    onOpenConnection={(id) => setTalking(id)}
                    onOpenProfile={(ownerId) => setPerson(ownerId)}
                    onNeedGive={() => {
                      setDetail(null);
                      setBrowse(null);
                      setLocked(true);
                    }}
                    onClose={() => setDetail(null)}
                  />
                ) : null,
              },

              /* THE CONVERSATION IS THE DEEPEST CHAMBER OF A CONNECTION. */
              {
                id: "talking",
                open: talking !== null,
                anchor: "bottom",
                world: "connection",
                children: talking ? (
                  <Conversation connectionId={talking} onClose={() => setTalking(null)} />
                ) : null,
              },
            ]}
          />


        </>
      )}
      {/* LAUNCH → G CROSSFADE: the settled wordmark over the fresh G, fading. */}
      {entered && launchVeil ? <LaunchScreen veil onDone={() => setLaunchVeil(false)} /> : null}
      {/* THE OWED OPENING (after /auth or the dev skip), over the G, then the
          same veil crossfade into the wheel. */}
      {entered && opening ? (
        <div className="absolute inset-0 z-[70]">
          <LaunchScreen
            onDone={() => {
              setLaunchVeil(true);
              setOpening(false);
            }}
          />
        </div>
      ) : null}
      {openingCover ? (
        <div className="absolute inset-0 z-[70]" style={{ background: "var(--seat-bg)" }} />
      ) : null}
    </main>
  );
}

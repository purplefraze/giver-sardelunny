import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GDepthStack } from "@/components/living-g/GDepthStack";
import { GStage } from "@/components/living-g/GStage";
import { GThinMask } from "@/components/living-g/g-weight";
import { MiddleLoopClose } from "@/components/living-g/loop-close";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
} from "@/components/living-g/g-path";
import { useAppHeight } from "@/hooks/use-app-height";


import { Onboarding } from "@/components/Onboarding";
import { LaunchScreen } from "@/components/onboarding/LaunchScreen";
import { useSession } from "@/hooks/use-session";
import { sessionEndedPending } from "@/data/cloud/session";
import { clearOpening, openingPending } from "@/data/opening";
import { AboutForm } from "@/components/profile/AboutForm";
import { MyGRing } from "@/components/profile/MyGRing";
import { CategoryForm } from "@/components/profile/CategoryForm";
import { GiveFlow } from "@/components/give/GiveFlow";
import { IntentIntake } from "@/intelligence/IntentIntake";
import { handoffOf, type FormSeed } from "@/intelligence/handoff";
import type { ActionDraft } from "@/intelligence/action-draft";
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
import { memberById } from "@/data/giver";
import { ActivityDetail } from "@/components/community/ActivityDetail";
import { Conversation } from "@/components/connection/Conversation";
import { ConnectionsList } from "@/components/connection/ConnectionsList";
import { tutorialSeenStore } from "@/data/tutorial-seen";
import { useTutorialSeen } from "@/hooks/use-tutorial-seen";
import { useMemberEdits } from "@/hooks/use-member-edits";


import { unreadCount } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
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
 * THE EIGHT POSITIONS, FIXED (EarSelector SEAT_ANGLE, spectrum order): my g
 * (12) · give · lend (3) · trade · map (6) · fund · borrow (9) · wish. LEND is
 * its own seat; underneath it is the lending side of the borrow world, so it
 * keeps one content model and its own colour. MAP is not an activity: it is
 * the door into communi-g's map / search view.
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
import { LoopLabels } from "@/components/living-g/LoopLabel";
import { useLifecycle } from "@/hooks/use-lifecycle";
import { FirstLandArt, FirstLandCatch, type FirstLandPhase } from "@/components/first-land/FirstLand";
import { GiveClosed } from "@/components/GiveClosed";
import { claimWelcome, welcomeOwed } from "@/data/welcome-grant";
import { markAsked, noteLiveGives } from "@/data/give-close";
import { hasLiveGive, type Item } from "@/data/items";


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
  /* A SESSION THAT ENDED ON ITS OWN (refresh failed, a write came back 401)
     returns to the G sign-in, which says so. No email is ever sent for it. */
  const navigate = useNavigate();
  useEffect(() => {
    if (entered && session.status === "signed-out" && sessionEndedPending()) {
      void navigate({ to: "/auth", search: {} });
    }
  }, [entered, session, navigate]);
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
    | { kind: "category"; category: Category; side?: BorrowSide; prefillId?: string; seed?: FormSeed }
    /* FUND'S SHEET — same middle-loop chamber, its own content. */
    | { kind: "fund" }
    | { kind: "ask-fund"; seed?: FormSeed }
    | { kind: "intent" }
    | null
  >(null);

  const openDraft = (draft: ActionDraft) => {
    const hand = handoffOf(draft);
    if (!hand) return;
    if (hand.kind === "give") setEditor({ kind: "category", category: "give", seed: hand.seed });
    else if (hand.kind === "ask-fund") setEditor({ kind: "ask-fund", seed: hand.seed });
    else setEditor({ kind: "category", category: hand.category, ...(hand.side ? { side: hand.side } : {}), seed: hand.seed });
  };

  /* "POST AGAIN" on an ended give (my history) reopens the Give flow prefilled. */
  useEffect(() => {
    const again = (e: Event) => {
      const itemId = (e as CustomEvent<string>).detail;
      setPerson(null);
      setPersonFocus(null);
      setDetail(null);
      setBrowse(null);
      setSeat("give");
      setEditor({ kind: "category", category: "give", prefillId: itemId });
    };
    window.addEventListener("giver:post-again", again);
    const intent = () => setEditor({ kind: "intent" });
    window.addEventListener("giver:intent", intent);
    return () => { window.removeEventListener("giver:post-again", again); window.removeEventListener("giver:intent", intent); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /**
   * THE ONE SOURCE OF TRUTH for the toggle: wish | give | trade | borrow.
   * THE TOGGLE ANSWERS "WHAT?" — the loops answer "WHOSE?" (top = me,
   * middle = mine, bottom = everyone).
   */
    /* THE EIGHT FIXED SEATS (spectrum order, clockwise from my g at 12). */
  const [seat, setSeatState] = useState<ActivitySeat | "giver" | "map">("give");
  /**
   * TOGGLE WORDS STAY SILENT until the first successful seat change away from
   * the initial landing. Persisted so a refresh does not re-mute the bead.
   */
  const [toggleWordsUnlocked, setToggleWordsUnlocked] = useState(false);
  useEffect(() => {
    setToggleWordsUnlocked(readToggleWordsUnlocked());
  }, []);
  /* THE INHERITED FIRST-USE MODE SURVIVES A REFRESH: it is a real state, not a
     transient default, so the empty G never falls back to red or green. */
  const setSeat = (next: Seat) => {
    setSeatState(next);
    /* MY G IS A DESTINATION, NOT AN INHERITED MODE: only activity seats are
       remembered as the first-use mode. */
    if (next !== "giver" && next !== "map") rememberFirstUseSeat(next);
  };

  /**
   * ANY USE OF THE TOGGLE. Unlocks the bead word on the very first use
   * (persisted). The loops no longer carry a fading hint: their labels are
   * always shown (<LoopLabels>, loop-copy.ts).
   */
  const noteToggleUse = () => {
    if (!toggleWordsUnlocked) {
      rememberToggleWordsUnlocked();
      setToggleWordsUnlocked(true);
      tutorialSeenStore.markSeen();
    }
  };

  /**
   * A REAL SEAT CHANGE (drag or seat-tap on the track). EarSelector's commit
   * already fires haptics.light on every snap — that is the seat-change haptic.
   */
  const moveToggle = (next: Seat) => {
    if (next === seat) return;
    setSeat(next);
    noteToggleUse();
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
  const [myG, setMyG] = useState(false);
  const lastToggleTap = useRef(0);
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
    /** Which communi-g view opens: the list, or the map (the 6:00 door). */
    view?: "list" | "map";
    /** The lending side of borrow (lend is a borrow record with side lend). */
    side?: BorrowSide;
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

  /** The first land's own hand-over to give explains nothing (FirstLand.tsx). */
  const quietSeat = useRef<Seat | null>(null);
  useEffect(() => {
    if (quietSeat.current === seat) {
      quietSeat.current = null;
      return;
    }
    /* FIRST ARRIVAL IS PURE PLAY: moving the toggle explains nothing and
       navigates nowhere until the person has built their profile. */
    if (!entered || !myProfileStore.get().built) return;
    if (seat === "giver" || seat === "map") return;
    /* Fund has its OWN two-page explanation; it never replays Wish's. */
    if (seat === "fund") {
      if (introSeenStore.get().fund) return;
      introSeenStore.markSeen("fund");
      setIntro({ topic: "fund", help: false });
      return;
    }
    const topic = seatMode(seat);
    if (introSeenStore.get()[topic]) return;
    showIntro(topic);
  }, [entered, seat]);

  /** A PERSISTED fact about this person: the G has already taught itself. */
  const tutorialSeen = useTutorialSeen();

  /**
   * INSTRUCTIONAL COPY IS A CUE, NEVER FURNITURE — AND NEVER MODE CONTENT.
   * Testing phase: the old "teach the G on entry" labels (and press-and-hold
   * label recall) are retired. The loops carry one always-on label each
   * (<LoopLabels>, copy in loop-copy.ts).
   */

  /** ONE source of truth for who I am and what I have going on. */
  const me = useMyProfile();
  const items = useItems();
  /* ADMIN PEOPLE EDITS re-render every screen below, so a corrected person is
     immediately true in the feed, on their profile and on every item. */
  useMemberEdits();

  const links = useConnections();

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
   * THE CARDINAL GIVER RULE: communi-g is visible to everyone; engaging
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

  /*
   * GIVER: FIRST LAND — THE SPARK CEREMONY (first-land/FirstLand.tsx,
   * welcome-grant.ts). Once per account (device + account metadata), in the
   * first session after the magic link. It opens with the toggle on My G
   * (12:00) — the only time the app ever opens there — and cannot be skipped:
   * every tap is swallowed until beat 4 ("are you a giver?") settles, when the
   * toggle is handed back at give (1:30). Reduced motion lands straight on
   * the settled end state. "settled" = the question (and communi-g) stay
   * until the first move.
   *
   * The account is known to be owed as soon as the session is ready, so the
   * G is already blue with the bead at 12:00 while the opening hands over;
   * the clock starts once the G is actually landed on.
   */
  const [firstLand, setFirstLand] = useState<{
    phase: FirstLandPhase;
    startedAt: number | null;
    still: boolean;
  } | null>(null);
  const grantChecked = useRef(false);
  const landed =
    hydrated &&
    entered &&
    !opening &&
    !openingCover &&
    !launchVeil &&
    session.status === "ready" &&
    editor === null &&
    browse === null &&
    detail === null &&
    talking === null;
  useEffect(() => {
    if (!hydrated || !entered || session.status !== "ready" || grantChecked.current) return;
    grantChecked.current = true;
    void welcomeOwed().then((owed) => {
      if (!owed) return;
      const still =
        typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
      setSeatState((prev) => {
        if (still && prev !== "give") quietSeat.current = "give";
        return still ? "give" : "giver";
      });
      setFirstLand({ phase: still ? "settled" : "ceremony", startedAt: null, still });
    });
  }, [hydrated, entered, session.status]);
  /* THE CLOCK starts once the G is landed on; the grant is claimed then. */
  useEffect(() => {
    if (!landed || !firstLand || firstLand.startedAt !== null) return;
    claimWelcome();
    setFirstLand({ ...firstLand, startedAt: performance.now() });
  }, [landed, firstLand]);
  /* BEAT 4 SETTLED: the toggle is handed back at give; taps work again. */
  const settleFirstLand = () => {
    quietSeat.current = "give";
    setSeatState("give");
    setFirstLand((f) => (f ? { ...f, phase: "settled" } : f));
  };
  /* FREE: the first move anywhere (another seat, any world) and it is gone. */
  useEffect(() => {
    if (
      firstLand?.phase === "settled" &&
      firstLand.startedAt !== null &&
      (!landed || seat !== "give")
    )
      setFirstLand(null);
  }, [firstLand, landed, seat]);
  const ceremony = firstLand?.phase === "ceremony";

  /*
   * THE WISH BANK SETS 10 ASIDE WHEN A WISH BEGINS (my-profile.ts): opening
   * the wish composer (or ask for funding, which publishes a wish) holds 10;
   * closing it before it publishes gives them back. Also clears a hold left
   * behind by a reload.
   */
  const composingWish =
    (editor?.kind === "category" && editor.category === "wish") || editor?.kind === "ask-fund";
  useEffect(() => {
    if (!hydrated) return;
    if (composingWish) myProfileStore.holdWishCompose();
    else myProfileStore.releaseWishCompose();
  }, [composingWish, hydrated, session.status]);

  /*
   * A GIVE OF MINE JUST CLOSED (give-close.ts): taken, done or past its day.
   * Ask once — offer that again, or something else. No sparks, no "+10".
   */
  const [closedGive, setClosedGive] = useState<Item | null>(null);
  useEffect(() => {
    if (!hydrated || !entered) return;
    const closed = noteLiveGives(items);
    if (closed && !closedGive) {
      markAsked(closed.id);
      setClosedGive(closed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items drive it
  }, [items, hydrated, entered]);

  /**
   * THE TOGGLE IS THE WORLD: wish | give | trade | borrow — plus MY G, the one
   * destination seat at 12 o'clock. `mode` is the activity world, and it is
   * null while the toggle is sitting on My G.
   */
  const activity: ActivitySeat | null = seat === "giver" || seat === "map" ? null : seat;
  /** THE 6:00 DOOR: map / search opens communi-g's map, never a form. */
  const atMap = seat === "map";
  const openMap = () => setBrowse({ type: null, view: "map" });
  /* The last activity world still owns the loops' grammar when My G is held. */
  const mode: Mode = seatMode(activity ?? "give");
  const content = MODE_CONTENT[mode];
  /** FUND IS ITS OWN SEAT: it borrows the wish world's items, never its forms. */
  const funding = activity === "fund";

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
  const myGSeats: readonly Seat[] = ["giver", ...ACTIVITY_SEATS, "map"] as const;

  /**
   * TOP = ME. MY G is not a content type and never a toggle seat: it is the
   * top loop, and it opens my own profile — or, before it exists, its setup.
   */
  const openMyG = () => {
    lifecycleStore.discoverProfile();
    setMyG(true);
  };

  /**
   * THE TOGGLE LOOP AND THE MIDDLE LOOP ARE THE SAME DOOR. At an activity seat
   * they enter that selected world; at My G they enter the person's profile.
   */
  const enterSelectedWorld = () => {
    if (atMap) {
      openMap();
      return;
    }
    if (activity === null) {
      openMyG();
      return;
    }
    /* FUND opens its own form — "ask for funding" — in the same chamber.
       (The pledge sheet stays one loop down: Fund's communi-g.) */
    if (activity === "fund") {
      setEditor({ kind: "ask-fund" });
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
   * onTap). One tap enters the seat, exactly like the middle loop.
   */
  const tapToggle = () => {
    const now = Date.now();
    /* A double tap from any seat is my g. A single tap on the blue 12 is too. */
    if (now - lastToggleTap.current < 320) {
      lastToggleTap.current = 0;
      openMyG();
      return;
    }
    lastToggleTap.current = now;
    noteToggleUse();
    enterSelectedWorld();
  };


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
              <defs>
                <GThinMask id="g-wake-thin" weight="middle" />
              </defs>
              <g transform={LIVING_G_TRANSFORM} fill="var(--giver-ink)">
                <path d={LIVING_G_PATH} mask="url(#g-wake-thin)" />
              </g>
              <MiddleLoopClose weight="middle" fill="var(--giver-ink)" />
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
            /* THE CEREMONY starts from My G blue; its purple → green tint is
               applied by the ceremony itself (FirstLand.tsx), never here. */
            world={ceremony ? "home" : atMap ? "map" : (activity ?? "profile")}
            /* Seat change: LoopLabels crossfade; LivingG surface stays (no remount). */
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
              <>
              {/* THE LOOP LABELS — always shown, one component for every seat. */}
              <LoopLabels
                seat={seat}
                quiet={
                  firstLand ? ["top", "bottom"] : []
                }
              />
              {/* ONE TOGGLE: while the ceremony runs, it draws the only bead. */}
              {ceremony ? null : (
                <EarSelector
                  mode={seat}
                  weight="middle"
                  /* THE SEAT'S TITLE sits inside the hollow ring. */
                  title
                  onChange={moveToggle}
                  seats={myGSeats}
                  hideWord={!toggleWordsUnlocked}
                  {...(!firstArrival && me.built && me.photo ? { photo: me.photo } : {})}
                  {...(!firstArrival && me.built && unread ? { badge: unread } : {})}
                  /* TAP ON THE TOGGLE: enters the seat's action screen. */
                  onTap={tapToggle}
                />
              )}
              {firstLand ? (
                <FirstLandArt
                  phase={firstLand.phase}
                  startedAt={firstLand.startedAt}
                  still={firstLand.still}
                  onSettle={settleFirstLand}
                />
              ) : null}
              </>
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
                /* The label is drawn by <LoopLabels> in the overlay. */
              },
              /*
                BOTTOM LOOP = EVERYONE. COMMUNI-G, already filtered to the
                toggle's world; the mixed community lives one word away inside.
                At the map seat it opens communi-g's map.
              */
              bottom: {
                label: "",
                panelTitle: content.community.title,
                panelBody: null,
                onPress: atMap
                  ? openMap
                  : activity === null
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
                /* The label is drawn by <LoopLabels> in the overlay. */
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
          !firstLand &&
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
              else if (id === "about" || id === "category" || id === "fund" || id === "ask-fund")
                setEditor(null);
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
                /* The new wish + fund pages are plain white, like their stills. */
                bare: intro?.topic === "wish" || intro?.topic === "fund",
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
                      /* FUND'S explanation leads into "ask for funding". */
                      if (topic === "fund") {
                        setEditor({ kind: "ask-fund" });
                        return;
                      }
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
                bare: true,
                world:
                  editor?.kind === "category"
                    ? editor.category === "borrow" && editor.side === "lend"
                      ? "lend"
                      : editor.category
                    : (activity ?? "profile"),
                children:
                  editor?.kind === "category" && editor.category === "give" ? (
                    /* GIVE, ONE LINE AT A TIME — the other seats keep the unified form. */
                    <div data-world="give" className="g-form relative h-full w-full overflow-y-auto">
                      <GiveFlow
                        onDone={() => setEditor(null)}
                        prefill={
                          editor.prefillId
                            ? (items.items.find((i) => i.id === editor.prefillId) ?? null)
                            : editor.seed
                              ? { text: editor.seed.text, details: editor.seed.details }
                              : null
                        }
                      />
                    </div>
                  ) : editor?.kind === "category" ? (
                    <CategoryForm
                      category={editor.category}
                      {...(editor.side ? { side: editor.side } : {})}
                      {...(editor.seed ? { seed: editor.seed } : {})}
                      onDone={() => setEditor(null)}
                      onSeeInCommunity={() => {
                        const type = editor.category as ItemType;
                        const side = editor.side;
                        setEditor(null);
                        setBrowse({ type, mine: true, ...(side ? { side } : {}) });
                      }}
                    />


                  ) : null,
              },

              /* FUND'S FORM — "ask for funding": the unified form over a Wish. */
              {
                id: "ask-fund",
                open: editor?.kind === "ask-fund",
                anchor: "middle",
                bare: true,
                world: "fund",
                children:
                  editor?.kind === "ask-fund" ? (
                    <CategoryForm category="wish" asksFunding {...(editor.seed ? { seed: editor.seed } : {})} onDone={() => setEditor(null)} />
                  ) : null,
              },

              {
                id: "intent",
                open: editor?.kind === "intent",
                anchor: "middle",
                bare: true,
                world: activity ?? "profile",
                children:
                  editor?.kind === "intent" ? (
                    <IntentIntake onResolved={openDraft} onBack={() => setEditor(null)} />
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

              {
                id: "my-g",
                open: myG,
                anchor: "top",
                bare: true,
                world: "me",
                children: myG ? (
                  <MyGRing
                    onClose={() => setMyG(false)}
                    onMessages={() => {
                      setMyG(false);
                      setThreads(true);
                    }}
                  />
                ) : null,
              },

              /* BROWSE -> ONE ACTIVITY -> A CONVERSATION. Never a shortcut. */
              {
                id: "browse",
                open: browse !== null,
                anchor: "bottom",
                /* INSIDE COMMUNI-G THE LOOP LOCKS TO RED, whatever the seat. */
                world: "communigy",
                /* The unfurl carries the camera in; once arrived the room is
                   the still page inside its red perimeter track (PerimeterToggle), not the G. */
                bare: true,
                children: browse ? (
                  <CommunityFeed
                    initialType={browse.type}
                    initialScope={browse.mine ? "mine" : "everyone"}
                    {...(browse.view ? { initialView: browse.view } : {})}
                    {...(browse.side ? { initialSide: browse.side } : {})}

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
                    /* 12:00 ON THE LOWER LOOP IS THE EXIT: back to the full
                       G with the toggle at 6:00 (communi-g), the G red. */
                    onExit={() => {
                      setBrowse(null);
                      setSeat("map");
                    }}
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
                    /* THE THREE-GIVES PROMPT'S GREEN CIRCLE: straight into a give. */
                    onStartGive={() => {
                      setDetail(null);
                      setBrowse(null);
                      setSeat("give");
                      setEditor({ kind: "category", category: "give" });
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
      {/* THE CEREMONY: every tap is swallowed until beat 4 settles. */}
      {entered && ceremony && firstLand?.startedAt !== null ? <FirstLandCatch active /> : null}
      {/* A GIVE JUST CLOSED: offer that again, or something else. */}
      {entered && closedGive && !opening && !ceremony ? (
        <GiveClosed
          item={closedGive}
          stillLive={hasLiveGive(items, ME_ID)}
          onClose={() => setClosedGive(null)}
          onAgain={() => {
            const id = closedGive.id;
            setClosedGive(null);
            /* Three already live: reopen the give flow with it instead. */
            if (!itemsStore.republish(id))
              window.dispatchEvent(new CustomEvent("giver:post-again", { detail: id }));
          }}
          onSomethingElse={() => {
            setClosedGive(null);
            setDetail(null);
            setBrowse(null);
            setSeat("give");
            setEditor({ kind: "category", category: "give" });
          }}
        />
      ) : null}
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

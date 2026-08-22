import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GEnclosure } from "@/components/living-g/GEnclosure";
import { GStage } from "@/components/living-g/GStage";
import {
  LIVING_G_PATH,
  LIVING_G_TRANSFORM,
  LIVING_G_VIEWBOX,
} from "@/components/living-g/g-path";
import { useAppHeight } from "@/hooks/use-app-height";


import { Onboarding } from "@/components/Onboarding";
import { AboutForm } from "@/components/profile/AboutForm";
import { CategoryForm } from "@/components/profile/CategoryForm";
import { WorldIntro, type IntroTopic } from "@/components/WorldIntro";
import { ChooseWorld } from "@/components/ChooseWorld";
import { HelpIndex } from "@/components/HelpIndex";

import { introSeenStore } from "@/data/intro-seen";
import { useIntroSeen } from "@/hooks/use-intro-seen";

import { CommunityFeed } from "@/components/community/CommunityFeed";

import { CommunityLocked } from "@/components/community/CommunityLocked";
import { claimUnlockMoment, hasActiveGive } from "@/data/community-access";
import { sparkFlashStore } from "@/data/spark-flash";
import { haptics } from "@/lib/haptics";
import { FullProfile } from "@/components/FullProfile";
import { memberById } from "@/data/giver";
import { ActivityDetail } from "@/components/community/ActivityDetail";
import { Conversation } from "@/components/connection/Conversation";
import { ConnectionsList } from "@/components/connection/ConnectionsList";
import { tutorialSeenStore } from "@/data/tutorial-seen";
import { useTutorialSeen } from "@/hooks/use-tutorial-seen";
import { useMemberEdits } from "@/hooks/use-member-edits";


import { unreadCount } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { profileLoop, clampField } from "@/components/living-g/profile-loop";
import { useMyProfile } from "@/hooks/use-my-profile";
import type { Category } from "@/data/my-profile";
import { CATEGORY_PLURAL, myAsMember, myProfileStore } from "@/data/my-profile";
import { SparkFlash } from "@/components/SparkFlash";

import { EarSelector, MODES, type Mode, type Seat } from "@/components/living-g/EarSelector";

/**
 * THE TOGGLE ANSWERS "WHAT?" — wish / give / trade / borrow, and nothing else.
 * MY G and COMMUNI-G are not content types: they are the top and bottom loops.
 */
const MODES_ONLY = MODES;

const FIRST_USE_SEAT_KEY = "giver.first-use.seat";

function rememberFirstUseSeat(seat: Mode) {
  try {
    window.localStorage.setItem(FIRST_USE_SEAT_KEY, seat);
  } catch {
    /* private mode: the mode simply does not survive the refresh */
  }
}

function readFirstUseSeat(): Mode | null {
  try {
    const raw = window.localStorage.getItem(FIRST_USE_SEAT_KEY);
    return raw && (MODES_ONLY as readonly string[]).includes(raw) ? (raw as Mode) : null;
  } catch {
    return null;
  }
}
import { useItems } from "@/hooks/use-items";
import {
  ACTIVITY_FILL,
  ME_ID,
  communityItems,
  itemLine,
  itemsStore,
  type ItemType,
} from "@/data/items";
import { LedgerHistory } from "@/components/history/LedgerHistory";
import type { Currency } from "@/data/ledger";


import { World } from "@/components/World";
import { cn } from "@/lib/utils";
import { DevControls } from "@/components/DevControls";
import { lifecycleStore } from "@/data/lifecycle";
import { removeLegacyAutomaticProfile } from "@/data/dev-fixture";
import { initializeFirstUse } from "@/data/first-use";
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
  const entered = Boolean(lifecycle.onboardingCompletedAt) || sessionEntered;
  /**
   * THE ONE EDITOR DESTINATION. Tapping a loop opens the editor for that part of
   * the G; closing it returns to the SAME seat, with the saved data already
   * alive inside the loop. Forms are never appended beneath the G.
   */
  const [editor, setEditor] = useState<
    { kind: "about" } | { kind: "category"; category: Category } | null
  >(null);

  /**
   * THE ONE SOURCE OF TRUTH for the toggle: wish | give | trade | borrow.
   * THE TOGGLE ANSWERS "WHAT?" — the loops answer "WHOSE?" (top = me,
   * middle = mine, bottom = everyone).
   */
    /* MY G IS A SEAT; SEARCH IS RESERVED AND UNREACHABLE, so it can never be
     held here. */
  const [seat, setSeatState] = useState<Mode | "giver">("give");
  /* THE INHERITED FIRST-USE MODE SURVIVES A REFRESH: it is a real state, not a
     transient default, so the empty G never falls back to red or green. */
  const setSeat = (next: Seat) => {
    /* SEARCH IS RESERVED, NOT BUILT: the toggle cannot come to rest there. */
    if (next === "search") return;
    setSeatState(next);
    /* MY G IS A DESTINATION, NOT AN INHERITED MODE: only activity seats are
       remembered as the first-use mode. */
    if (next !== "giver") rememberFirstUseSeat(next);
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
  const [browse, setBrowse] = useState<{ type: ItemType | null } | null>(null);
  /**
   * SEARCH IS THE TOP LOOP, AND ONLY ON MY OWN G. It opens already scoped to the
   * toggle's world, so the content type is never asked for twice.
   */
  const [detail, setDetail] = useState<string | null>(null);
  const detailShown = useLinger(detail);

  const [talking, setTalking] = useState<string | null>(null);
  const [threads, setThreads] = useState(false);
  /** SPARKS AND SPARKLES ARE HISTORIES, opened from my own photo's toggle. */
  const [history, setHistory] = useState<Currency | null>(null);

  /** THE PERSON IS THEIR OWN DESTINATION: @username opens who they are. */
  const [person, setPerson] = useState<string | null>(null);
  /** WHICH SECTION a profile opens on when it was reached from an activity. */
  const [personFocus, setPersonFocus] = useState<ItemType | null>(null);
  /* WHILE THE G FOLDS BACK, what was inside it is still inside it. */
  const personShown = useLinger(person);

  /* MY OWN PROFILE IS ALSO INSIDE THE G: it unfurls, it never opens a page. */
  const aboutOpen = editor?.kind === "about";
  const aboutShown = useLinger(aboutOpen ? true : null);



  /**
   * THE COMMUNITY DOOR, WHEN IT IS STILL SHUT. Not an error and not a warning —
   * one question, asked once, with the way to open it right underneath.
   */
  const [locked, setLocked] = useState(false);

  /**
   * ONE DOOR INTO A WORLD. First time: explain, then the form. Every time after:
   * straight to the form. The flag decides, never the caller.
   */
  const openWorld = (category: Category) => {
    setChoose(false);
    if (introSeen[category]) setEditor({ kind: "category", category });
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
    if (introSeenStore.get()[seat]) return;
    showIntro(seat);
  }, [entered, seat]);

  /**
   * TEACH THE G ONCE. On first entry the action labels show themselves, then
   * the G goes quiet for good — a press-and-hold brings a label back.
   */
  const [teach, setTeach] = useState(true);
  /** A PERSISTED fact about this person: the G has already taught itself. */
  const tutorialSeen = useTutorialSeen();

  /**
   * INSTRUCTIONAL COPY IS A CUE, NEVER FURNITURE — AND NEVER MODE CONTENT.
   * The action words teach the G ONCE, on first entry, then leave it clean for
   * good; a press-and-hold brings one back. Switching mode NEVER re-fires them,
   * so a mode prompt can never arrive on top of the loops' own words.
   */
  useEffect(() => {
    if (!entered) return;
    if (tutorialSeenStore.get()) {
      setTeach(false);
      return;
    }
    setTeach(true);
    const t = setTimeout(() => {
      setTeach(false);
      tutorialSeenStore.markSeen();
    }, 4200);
    return () => clearTimeout(t);
  }, [entered]);

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
   * THE CARDINAL GIVER RULE: one active give of my own is the key to the
   * community. Permanent, re-checked here on every render — never a flag set
   * once during onboarding.
   */
  const canCommunity = hasActiveGive(items);

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
  const activity: Mode | null = seat === "giver" ? null : seat;
  /* The last activity world still owns the loops' grammar when My G is held. */
  const mode: Mode = activity ?? "give";
  const content = MODE_CONTENT[mode];

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
   * single field was ever filled in. SEARCH (6 o'clock) stays unbuilt.
   */
  const myGSeats: readonly Seat[] = lifecycle.profileDiscoveredAt
    ? (["giver", ...MODES_ONLY] as const)
    : MODES_ONLY;

  /**
   * TOP = ME. MY G is not a content type and never a toggle seat: it is the
   * top loop, and it opens my own profile — or, before it exists, its setup.
   */
  const openMyG = () => {
    setup();
  };

  /**
   * MY MOST RECENT <type> — the middle loop is MINE in the toggle's world, and
   * "mine" means the one I touched last, not a ranked list.
   */
  const myRecent = [...me.records[mode]].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  const myMode = myRecent ? itemLine(myRecent) : null;

  /** COMMUNI-G <type> — the same item collection, queried by everyone else. */
  const theirs = communityItems(items, { type: mode as ItemType, excludeOwnerId: ME_ID });
  const firstTheirs = theirs[0];
  const community = firstTheirs ? itemLine(firstTheirs) : null;

  /** NEVER A LIST INSIDE THE G: one item, then how much more there is. */
  const more = (count: number) =>
    count > 1 ? [{ text: `+${count - 1} more`, role: "tertiary" as const }] : [];

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

      <DevControls />
      {!entered ? (
        /* ONBOARDING ENDS AT MY G. No profile flow, no reward screen. */
        <Onboarding
          onDone={({ earned, mode: gifted }) => {
            /* CONTINUITY: my first G opens in the exact mode I just gave in. */
            if (gifted) setSeat(gifted);
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
                onChange={(next) => setSeat(next)}
                seats={myGSeats}
                {...(!firstArrival && me.built && me.photo ? { photo: me.photo } : {})}
                {...(!firstArrival && me.built && unread ? { badge: unread } : {})}
                /* FIRST USE HAS NO ACCOUNT FURNITURE — not even hidden peek data. */
                {...(!firstArrival ? { sparks: me.sparks } : {})}

                /* TOP = ME. The small loop is MY G — never search, in any mode. */
                onTap={openMyG}
              />
            }

            teach={firstArrival ? false : teach}
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
                onPress: () => {
                  if (activity === null) {
                    openMyG();
                    return;
                  }
                  if (firstArrival) {
                    setup();
                    return;
                  }
                  setEditor({ kind: "category", category: mode });
                },

                render: (anchor) =>
                  profileLoop({
                    anchor,
                    region: "middle",
                    /*
                      EMPTY MEANS VISUALLY EMPTY. With nothing of mine in this
                      world, the loop holds NOTHING: no label, no "add a …", no
                      prompt, no invented content. The words only ever describe
                      something that actually exists.
                    */
                    blocks:
                      activity === null || !myMode
                        ? []
                        : [
                            { text: `my ${CATEGORY_PLURAL[mode]}`, role: "secondary" as const },
                            {
                              text: clampField(myMode),
                              role: "primary" as const,
                              fill: ACTIVITY_FILL[mode as ItemType],
                            },
                            ...more(me.items[mode].length),
                          ],
                  }),
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
                      : () => {
                          if (!canCommunity) {
                            setLocked(true);
                            return;
                          }
                          setBrowse({ type: mode as ItemType });
                        },

                render: (anchor) =>
                  profileLoop({
                    anchor,
                    region: "bottom",
                    /*
                      COMMUNITY CONTENT OR NOTHING. Until the community is truly
                      open AND there is something in this world to show, the
                      bottom loop stays empty — never a question, never filler.
                      The label itself carries the activity's own colour.
                    */
                    blocks:
                      activity === null || !canCommunity || !community
                        ? []
                        : [
                            {
                              text: `communi-g ${CATEGORY_PLURAL[mode]}`,
                              role: "secondary" as const,
                              fill: ACTIVITY_FILL[mode as ItemType],
                            },
                            {
                              text: clampField(community),
                              role: "primary" as const,
                              fill: ACTIVITY_FILL[mode as ItemType],
                            },
                            ...more(theirs.length),
                          ],
                  }),
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

          {/* NO ACTIVE GIVE, NO COMMUNITY. The door asks the one question. */}
          <Screen open={locked}>
            {locked ? (
              <CommunityLocked
                onGive={() => {
                  setLocked(false);
                  setSeat("give");
                  setEditor({ kind: "category", category: "give" });
                }}
                onClose={() => setLocked(false)}
              />
            ) : null}
          </Screen>

          {/* BROWSE -> ONE ACTIVITY -> A CONVERSATION. Never a shortcut. */}
          <Screen open={browse !== null}>
            {browse ? (
              <CommunityFeed
                initialType={browse.type}
                onOpen={(itemId) => setDetail(itemId)}
                onOpenProfile={(ownerId) => {
                  setPersonFocus(null);
                  setPerson(ownerId);
                }}
                onClose={() => setBrowse(null)}
              />
            ) : null}
          </Screen>

          {/*
            SEARCH IS NOT A LOOP AND NEVER A BAR ON THE LIVING G: it lives inside
            the expanded Communi-G, where the whole community already is.
          */}

          {/*
            @USERNAME -> INSIDE THAT PERSON'S LIVING G. Not a page: the same
            artwork unfurls until its curves frame the screen, and their profile
            appears within it. Backing out contracts it to exactly where it was.
          */}
          <GEnclosure
            open={person !== null}
            world={personShown === ME_ID ? "me" : "others"}
          >
            {personShown
              ? (() => {
                  const member =
                    personShown === ME_ID ? myAsMember(me) : memberById(personShown);
                  return member ? (
                    <FullProfile
                      member={member}
                      world={personShown === ME_ID ? "me" : "others"}
                      focus={personFocus}
                      onBack={() => {
                        setPersonFocus(null);
                        setPerson(null);
                      }}
                      onOpen={(id) => {
                        setPersonFocus(null);
                        setPerson(id);
                      }}
                      /* EVERY ITEM ON EVERY PROFILE OPENS ITS OWN RICH DETAIL. */
                      onOpenItem={(itemId) => setDetail(itemId)}
                    />
                  ) : null;
                })()
              : null}
          </GEnclosure>

          {/* AN ITEM IS MORE OF THE SAME G: only the interior content changes. */}
          <GEnclosure open={detail !== null}>
            {detailShown ? (
              <ActivityDetail
                itemId={detailShown}
                onOpenConnection={(id) => {
                  setDetail(null);
                  setTalking(id);
                }}
                onOpenProfile={(ownerId) => {
                  setDetail(null);
                  setPerson(ownerId);
                }}
                onClose={() => setDetail(null)}
              />
            ) : null}
          </GEnclosure>


          <Screen open={talking !== null}>
            {talking ? (
              <Conversation connectionId={talking} onClose={() => setTalking(null)} />
            ) : null}
          </Screen>

          <Screen open={threads}>
            {threads ? (
              <ConnectionsList onOpen={(id) => setTalking(id)} onClose={() => setThreads(false)} />
            ) : null}
          </Screen>

          {/*
            SPARKS AND SPARKLES ARE STORIES, NOT COUNTERS. Each is its own
            history portal, reached from the toggle on my own photo.
          */}
          <Screen open={history !== null}>
            {history ? (
              <LedgerHistory currency={history} onClose={() => setHistory(null)} />
            ) : null}
          </Screen>



          {/* THE EMPTY MIDDLE LOOP'S QUESTION -> the chosen world's door. */}
          <Screen open={choose}>
            {choose ? <ChooseWorld onChoose={openWorld} onCancel={() => setChoose(false)} /> : null}
          </Screen>

          {/* THE VOLUNTARY HELP AREA — explanations only, no flags, no forms. */}
          <Screen open={help}>
            {help ? (
              <HelpIndex
                onOpen={(topic) => setIntro({ topic, help: true })}
                onClose={() => setHelp(false)}
              />
            ) : null}
          </Screen>

          {/* FIRST-TIME EXPLANATION -> straight into my <type>. */}
          <Screen open={intro !== null}>
            {intro ? (
              <WorldIntro
                category={intro.topic}
                help={intro.help}
                onDone={() => {
                  const { topic, help: voluntary } = intro;
                  setIntro(null);
                  if (voluntary || topic === "sparks") return;
                  /* Already marked seen on entry — this just opens the form. */
                  setEditor({ kind: "category", category: topic });
                }}
              />
            ) : null}
          </Screen>

          {/*
            THE EDITOR DESTINATIONS. One screen at a time, above the G — never
            beneath it. Leaving returns to the same seat, already updated.
          */}
          {/*
            MY OWN PROFILE UNFURLS OUT OF THE G ITSELF — the same artwork becomes
            the frame, and the person appears inside it. Never a separate page.
          */}
          <GEnclosure open={aboutOpen} world="me">
            {aboutShown ? (
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
            ) : null}
          </GEnclosure>

          {/*
            THE OTHER EDITOR DESTINATION. One screen at a time, above the G —
            never beneath it. Leaving returns to the same seat, already updated.
          */}
          <Screen open={editor?.kind === "category"}>
            {editor?.kind === "category" ? (
              <CategoryForm category={editor.category} onDone={() => setEditor(null)} />
            ) : null}
          </Screen>

        </>
      )}
    </main>
  );
}

/** Restrained, fast screen change: no slides, no bounce. Touch, breathe, move. */
function Screen({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 transition-opacity duration-200 ease-out",
        open ? "opacity-100" : "pointer-events-none invisible opacity-0",
      )}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

/**
 * CONTEXT IS NEVER RESET. A value that has just been cleared is kept one beat
 * longer, so what the user was looking at is still there while the Living G
 * folds back around it.
 */
function useLinger<T>(value: T | null) {
  const held = useRef<T | null>(value);
  if (value !== null) held.current = value;
  return value ?? held.current;
}

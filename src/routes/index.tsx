import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { AboutForm } from "@/components/profile/AboutForm";
import { CategoryForm } from "@/components/profile/CategoryForm";
import { WorldIntro, type IntroTopic } from "@/components/WorldIntro";
import { ChooseWorld } from "@/components/ChooseWorld";
import { HelpIndex } from "@/components/HelpIndex";

import { introSeenStore } from "@/data/intro-seen";
import { useIntroSeen } from "@/hooks/use-intro-seen";


import { CommunityFeed } from "@/components/community/CommunityFeed";
import { ActivityDetail } from "@/components/community/ActivityDetail";
import { Conversation } from "@/components/connection/Conversation";
import { ConnectionsList } from "@/components/connection/ConnectionsList";
import { tutorialSeenStore } from "@/data/tutorial-seen";
import { useTutorialSeen } from "@/hooks/use-tutorial-seen";

import { isOpen, myConnections, needsMyAnswer } from "@/data/connections";
import { useConnections } from "@/hooks/use-connections";
import { profileLoop, clampField } from "@/components/living-g/profile-loop";
import { useMyProfile } from "@/hooks/use-my-profile";
import type { Category } from "@/data/my-profile";
import { primaryGive, CATEGORY_PLURAL, CATEGORIES, myProfileStore } from "@/data/my-profile";
import { SparkFlash } from "@/components/SparkFlash";

import { EarSelector, SEATS, type Mode, type Seat } from "@/components/living-g/EarSelector";
import { useItems } from "@/hooks/use-items";
import { ACTIVITY_FILL, ME_ID, communityItems, itemLine, type ItemType } from "@/data/items";



import { World } from "@/components/World";
import { cn } from "@/lib/utils";
import { DevControls } from "@/components/DevControls";
import { lifecycleStore } from "@/data/lifecycle";
import { seedDevelopmentProfileOnce } from "@/data/dev-fixture";
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
    community: { title: "community wishes" },

  },
  give: {
    mine: {
      title: "my gives",
      body: (
        <p className="opacity-70">
          share something you have, know, or can do.
        </p>
      ),
    },
    community: { title: "community gives" },
  },
  trade: {
    mine: {
      title: "my trades",
      body: (
        <p className="opacity-70">offer something, ask for something back.</p>
      ),
    },
    community: { title: "community trades" },
  },
  borrow: {
    mine: {
      title: "my borrows",
      body: <p className="opacity-70">ask to borrow something for a while.</p>,
    },
    community: { title: "community borrows" },
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
  /* Preview fixtures must exist before the first store snapshots are read;
     seeding in an effect briefly rendered an obsolete blank/onboarding state. */
  seedDevelopmentProfileOnce();
  const lifecycle = useLifecycle();
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
   * THE ONE SOURCE OF TRUTH for the toggle: giver | wish | give | trade | borrow.
   * "giver" is ME (profile); the other four are activity worlds.
   */
  const [seat, setSeat] = useState<Seat>("giver");

  /**
   * FIRST-TIME WORLD EXPLANATION. Giver explains wish / give / trade / borrow
   * once each, from four PERSISTED flags — never component state — then gets
   * out of the way. It is UI only: it creates no items and touches no profile.
   *
   * `help` marks an explanation the user asked for on purpose: it sets no flag
   * and leads nowhere — it explains, then hands the G straight back.
   */
  const [intro, setIntro] = useState<{ topic: IntroTopic; help: boolean } | null>(
    null,
  );
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
  const [detail, setDetail] = useState<string | null>(null);
  const [talking, setTalking] = useState<string | null>(null);
  const [threads, setThreads] = useState(false);

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
    if (!entered || seat === "giver") return;
    if (introSeenStore.get()[seat]) return;
    showIntro(seat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const links = useConnections();

  /* Migrate an existing completed prototype profile into the explicit lifecycle. */
  useEffect(() => {
    if (!lifecycle.onboardingCompletedAt && me.built && !import.meta.env.DEV) {
      lifecycleStore.complete();
    }
  }, [lifecycle.onboardingCompletedAt, me.built]);

  /** Conversations in motion, and the ones politely waiting on my answer. */
  const openCount = myConnections(links, ME_ID).filter(isOpen).length;
  const waitingOnMe = needsMyAnswer(links, ME_ID).length;

  /** GIVER = ME. The other four seats are activity worlds. */
  const isProfile = seat === "giver";
  const mode: Mode = isProfile ? "give" : (seat as Mode);
  const content = MODE_CONTENT[mode];

  /** MY <type> — the active world's #1 item, in my own priority order. */
  const myMode = me.items[mode][0] ?? null;
  /** COMMUNITY <type> — the same item collection, queried by everyone else. */
  const theirs = communityItems(items, { type: mode as ItemType, excludeOwnerId: ME_ID });
  const firstTheirs = theirs[0];
  const community = firstTheirs ? itemLine(firstTheirs) : null;
  /** MY GIVE — what I offer the community, the profile's bottom loop. */
  const myGive = primaryGive(me);

  /** NEVER A LIST INSIDE THE G: one item, then how much more there is. */
  const more = (count: number) =>
    count > 1 ? [{ text: `+${count - 1} more`, role: "tertiary" as const }] : [];

  /** MY LATEST ACTIVITY of ANY type — the profile's middle loop snapshot. */
  const latest = CATEGORIES.flatMap((c) =>
    me.records[c].map((i) => ({ type: c, item: i })),
  ).sort((a, b) => b.item.updatedAt - a.item.updatedAt)[0] ?? null;



  return (
    <main className="relative mx-auto h-[100dvh] w-full max-w-[520px] overflow-hidden">
      <DevControls />
      {!entered ? (
        /* ONBOARDING ENDS AT MY G. No profile flow, no reward screen. */
        <Onboarding
          onDone={() => {
            /* The 50 sparks kept from onboarding become a REAL balance, once. */
            myProfileStore.seedSparks();
            setSessionEntered(true);
            setEditor({ kind: "about" });
          }}
        />
      ) : (



        <>
          {/* THE WORKSPACE — one Living G, always yours. The seat is its state. */}
          <World
            /* GIVER = my profile (red); the four modes keep their own colours. */
            world={isProfile ? "profile" : mode}
            /* ONE ACTIVE SEAT = ONE CLEAN SET OF IN-LOOP TEXT. */
            contentKey={seat}
            /* "giver" is drawn inside the G, under the toggle — see EarSelector. */
            active={
              editor === null &&
              intro === null &&
              !choose &&
              !help &&
              browse === null &&
              detail === null &&
              talking === null &&
              !threads
            }
            earCut
            overlay={
              <EarSelector
                mode={seat}
                onChange={setSeat}
                seats={SEATS}
                {...(isProfile && me.photo ? { photo: me.photo } : {})}
                {...(isProfile ? { word: "my g" } : {})}
                /* MY SPARKS RIDE MY OWN TOP LOOP — never shown on anyone else's G. */
                sparks={me.sparks}

                onTap={() => setEditor({ kind: "about" })}
              />
            }

            teach={teach}
            regions={{
              top: {
                label: "",
                panelTitle: isProfile ? "more information" : "you",
                panelBody: null,
                /* TAP -> the profile information screen; back returns here. */
                onPress: () => setEditor({ kind: "about" }),
              },
              /*
                MIDDLE LOOP:
                  giver = MY LATEST ACTIVITY of any type
                  mode  = MY <type>
                Tapping opens that item's own editor screen; saving returns to
                this exact seat with the loop already showing the new content.
              */
              middle: {
                label: "",
                panelTitle: isProfile ? "latest activity" : content.mine.title,
                panelBody: null,
                /*
                  AN EMPTY MIDDLE LOOP NEVER ASSUMES A WISH. With no activity
                  yet, it asks the question and offers the four worlds.
                */
                onPress: () => {
                  if (isProfile && !latest) {
                    setChoose(true);
                    return;
                  }
                  if (isProfile) {
                    openWorld(latest!.type);
                    return;
                  }
                  setEditor({ kind: "category", category: mode });
                },

                render: (anchor) =>
                  profileLoop({
                    anchor,
                    region: "middle",
                    blocks: isProfile
                      ? latest
                        ? [
                            { text: "latest", role: "secondary" as const },
                            {
                              /* THE ACTIVITY SPEAKS ITS WORLD'S COLOUR. */
                              text: clampField(itemLine(latest.item)),
                              role: "primary" as const,
                              fill: ACTIVITY_FILL[latest.type],
                            },
                            { text: latest.type, role: "tertiary" as const },
                          ]
                      : /* TRULY EMPTY until real activity exists. */ []
                      : [
                          { text: `my ${CATEGORY_PLURAL[mode]}`, role: "secondary" as const },
                          myMode
                            ? {
                                text: clampField(myMode),
                                role: "primary" as const,
                                fill: ACTIVITY_FILL[mode as ItemType],
                              }
                            : { text: `add a ${mode}`, role: "primary" as const },
                          ...(myMode ? more(me.items[mode].length) : []),
                        ],

                  }),
              },
              /*
                BOTTOM LOOP:
                  giver = MY GIVES — what I offer the community (tap to edit)
                  mode  = COMMUNITY <type> (tap to browse)
              */
              bottom: {
                label: "",
                panelTitle: isProfile ? "my gives" : content.community.title,
                panelBody: null,
                onPress: isProfile
                  ? /* BOTTOM = WHAT I GIVE. First time, giver explains it. */
                    () => openWorld("give")
                  : /* BOTTOM = THE COMMUNITY, browsed for real. */
                    () => setBrowse({ type: mode as ItemType }),

                render: (anchor) =>
                  profileLoop({
                    anchor,
                    region: "bottom",
                    blocks: isProfile
                      ? myGive
                        ? [
                            { text: "gives", role: "secondary" as const },
                            {
                              /* MY GIVES ARE ALWAYS GREEN. */
                              text: clampField(myGive),
                              role: "primary" as const,
                              fill: ACTIVITY_FILL.give,
                            },
                            ...more(me.items.give.length),
                          ]
                        : /* TRULY EMPTY until a give exists. */ []
                      : [
                          {
                            text: `community ${CATEGORY_PLURAL[mode]}`,
                            role: "secondary" as const,
                          },
                          community
                            ? {
                                text: clampField(community),
                                role: "primary" as const,
                                fill: ACTIVITY_FILL[mode as ItemType],
                              }
                            : { text: "nothing yet", role: "tertiary" as const },
                          ...(community ? more(theirs.length) : []),
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
          {!tutorialSeen && intro === null && editor === null && !choose && !help ? (
            <button
              type="button"
              onClick={() =>
                isProfile ? setHelp(true) : setIntro({ topic: mode, help: true })
              }
              className="absolute bottom-4 left-6 z-20 text-[11px] font-black lowercase tracking-[0.28em] opacity-40"
            >
              {isProfile ? "how giver works" : `what’s ${mode}?`}
            </button>
          ) : null}


          {/*
            THE S-CURVE IS WHERE PEOPLE MEET. It is the part of the G that joins
            two loops, so every CONVERSATION lives behind this one quiet word.
            THIS IS NOT A CONNECTIONS CONTROL: connections are earned by
            completed acts and live in the full profile only. Nothing permanent
            about them ever sits on the Living G, so this word appears only when
            a conversation is actually in motion.
          */}
          {intro === null &&
          editor === null &&
          !choose &&
          !help &&
          browse === null &&
          detail === null &&
          talking === null &&
          !threads &&
          (openCount > 0 || waitingOnMe > 0) ? (
            <div className="absolute bottom-4 right-6 z-20 flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => setThreads(true)}
                className="text-[11px] font-black lowercase tracking-[0.28em]"
                style={{
                  color: waitingOnMe
                    ? "var(--giver-connection)"
                    : "var(--world-ink)",
                  opacity: 0.9,
                }}
              >
                {waitingOnMe
                  ? `${waitingOnMe} to confirm`
                  : `conversations · ${openCount}`}
              </button>
              {/*
                NO SEPARATE "COMMUNITY" WORD. Tapping the bottom loop already
                walks into the community, so a second door would be clutter.
              */}

            </div>
          ) : null}

          {/* BROWSE -> ONE ACTIVITY -> A CONVERSATION. Never a shortcut. */}
          <Screen open={browse !== null}>
            {browse ? (
              <CommunityFeed
                initialType={browse.type}
                onOpen={(itemId) => setDetail(itemId)}
                onClose={() => setBrowse(null)}
              />
            ) : null}
          </Screen>

          <Screen open={detail !== null}>
            {detail ? (
              <ActivityDetail
                itemId={detail}
                onOpenConnection={(id) => {
                  setDetail(null);
                  setTalking(id);
                }}
                onClose={() => setDetail(null)}
              />
            ) : null}
          </Screen>

          <Screen open={talking !== null}>
            {talking ? (
              <Conversation
                connectionId={talking}
                onClose={() => setTalking(null)}
              />
            ) : null}
          </Screen>

          <Screen open={threads}>
            {threads ? (
              <ConnectionsList
                onOpen={(id) => setTalking(id)}
                onClose={() => setThreads(false)}
              />
            ) : null}
          </Screen>

          {/* THE EMPTY MIDDLE LOOP'S QUESTION -> the chosen world's door. */}
          <Screen open={choose}>
            {choose ? (
              <ChooseWorld
                onChoose={openWorld}
                onCancel={() => setChoose(false)}
              />
            ) : null}
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
          <Screen open={editor !== null}>
            {editor?.kind === "about" ? (
              <AboutForm
                onDone={() => {
                  if (!lifecycle.onboardingCompletedAt) lifecycleStore.complete();
                  setEditor(null);
                }}
                onHelp={() => {
                  setEditor(null);
                  setHelp(true);
                }}
              />

            ) : editor?.kind === "category" ? (
              <CategoryForm
                category={editor.category}
                onDone={() => setEditor(null)}
              />
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

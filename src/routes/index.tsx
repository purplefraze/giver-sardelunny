import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { FullProfile } from "@/components/FullProfile";
import { ProfileBuilder } from "@/components/ProfileBuilder";
import { SparklesReward } from "@/components/SparklesReward";
import { CommunityList } from "@/components/CommunityList";
import { profileLoop, clampField } from "@/components/living-g/profile-loop";
import { useMyProfile } from "@/hooks/use-my-profile";
import type { MyProfile } from "@/data/my-profile";
import { myProfileStore, myAsMember, myPhoto, primaryGive, CATEGORY_PLURAL, CATEGORIES } from "@/data/my-profile";

import {
  HISTORY_STATES,
  TopLoopSelector,
  topLoopContent,
  type TopLoopPosition,
} from "@/components/living-g/TopLoopSelector";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";


import { World, ringPhoto } from "@/components/World";
import { ME } from "@/data/giver";
import { cn } from "@/lib/utils";

/** The only place you ever go: your own profile. Everything else is a mode. */
type Screen = "profile";

const SCREENS: Screen[] = ["profile"];

/** My own history, in the toggle's order: past wishes, gives, trades. */
/** My REAL completed items, same order as the toggle: wishes, gives, trades. */
const MY_COMPLETED: ((p: MyProfile) => string[])[] = [
  (p) => p.completed.wish.map((i) => i.text),
  (p) => p.completed.give.map((i) => i.text),
  (p) => p.completed.trade.map((i) => i.text),
];

const MY_HISTORY: string[][] = [
  ME.history.wishes,
  ME.history.gives,
  ME.history.trades,
];

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
    community: { title: string; body: React.ReactNode };
  }
> = {
  wish: {
    mine: {
      title: "my wishes",
      body: <p className="opacity-70">make a wish. keep it small and human.</p>,
    },
    community: {
      title: "community wishes",
      body: <CommunityList type="wish" />,
    },
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
    community: {
      title: "community gives",
      body: <CommunityList type="give" />,
    },
  },
  trade: {
    mine: {
      title: "my trades",
      body: (
        <p className="opacity-70">offer something, ask for something back.</p>
      ),
    },
    community: {
      title: "community trades",
      body: <CommunityList type="trade" />,
    },
  },
  borrow: {
    mine: {
      title: "my borrows",
      body: <p className="opacity-70">ask to borrow something for a while.</p>,
    },
    community: {
      title: "community borrows",
      body: <CommunityList type="borrow" />,
    },
  },
};




export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { w?: Screen } => {
    const w = search["w"];
    return typeof w === "string" && SCREENS.includes(w as Screen)
      ? { w: w as Screen }
      : {};
  },
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
  const [entered, setEntered] = useState(false);
  /** First run only: set up your own profile before the workspace opens. */
  const [setup, setSetup] = useState(false);
  /** Profile complete — the one-time sparkle reward. */
  const [reward, setReward] = useState(false);
  const [gaveTo, setGaveTo] = useState<string | null>(null);
  /** My deeper, conventional profile page — same data, browsable form. */
  const [fullMe, setFullMe] = useState(false);


  /** Prototype top-loop selector on my own profile; stays where I leave it. */
  const [myTopPos, setMyTopPos] = useState<TopLoopPosition>(0);
  /** Which mode the one persistent Living G is currently working in. */
  const [mode, setMode] = useState<Mode>("give");
  /**
   * TEACH THE G ONCE. On first entry the action labels show themselves, then
   * the G goes quiet for good — a press-and-hold brings a label back.
   */
  const [teach, setTeach] = useState(true);

  /**
   * INSTRUCTIONAL COPY IS A CUE, NEVER FURNITURE — AND NEVER MODE CONTENT.
   * The action words teach the G ONCE, on first entry, then leave it clean for
   * good; a press-and-hold brings one back. Switching mode NEVER re-fires them,
   * so a mode prompt can never arrive on top of the loops' own words.
   */
  useEffect(() => {
    if (!entered) return;
    setTeach(true);
    const t = setTimeout(() => setTeach(false), 4200);
    return () => clearTimeout(t);
  }, [entered]);

  /**
   * ONE source of truth for the only depth that exists: the router.
   * Modes are state; profile is the single pushed screen.
   */
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const { w } = Route.useSearch();
  const top = w ?? null;

  const depth = useRef(0);

  const push = useCallback(
    (s: Screen) => {
      depth.current += 1;
      navigate({ search: { w: s } });
    },
    [navigate],
  );

  const pop = useCallback(() => {
    if (depth.current > 0) {
      depth.current -= 1;
      router.history.back();
      return;
    }
    navigate({ search: {}, replace: true });
  }, [navigate, router]);

  const content = MODE_CONTENT[mode];

  /** ONE source of truth for who I am and what I have going on. */
  const me = useMyProfile();
  /** THE ACTIVE MODE'S OWN #1 ITEM — the only mode content the G ever holds. */
  const myMode = me.items[mode][0] ?? null;
  /** MY GIVE — the bottom loop's permanent content, whatever the mode. */
  const myGive = primaryGive(me);

  return (
    <main className="relative mx-auto h-[100dvh] w-full max-w-[520px] overflow-hidden">
      {!entered ? (
        <Onboarding
          onDone={(name) => {
            setGaveTo(name);
            setEntered(true);
            /* Already built once? Never show the first-time builder again. */
            setSetup(!myProfileStore.get().built);
          }}
        />
      ) : setup ? (
        /* THE PROFILE BUILDER — writes straight to the real profile. */
        <ProfileBuilder
          onDone={() => {
            /* Awarded exactly once, however often the profile is edited. */
            const awarded = myProfileStore.awardProfileSparkles();
            setSetup(false);
            if (awarded) setReward(true);
          }}
          firstTime={!me.built}
        />
      ) : reward ? (
        <SparklesReward onDone={() => setReward(false)} />
      ) : (


        <>
          {/* THE WORKSPACE — one Living G, always yours. Mode is a state of it. */}
          <World
            world={mode}
            /* ONE ACTIVE MODE = ONE CLEAN SET OF IN-LOOP TEXT. */
            contentKey={mode}
            identity="giver"
            active={top === null}
            earCut
            overlay={
              <EarSelector
                mode={mode}
                onChange={setMode}
                onTap={() => push("profile")}
              />
            }
            teach={teach}
            regions={{
              top: {
                label: "",
                panelTitle: "you",
                panelBody: null,
                onPress: () => push("profile"),
              },
              /*
                MIDDLE LOOP = THE ACTIVE MODE. It holds exactly one mode's item —
                the mode the toggle is sitting on — and nothing else. Changing
                mode replaces this content outright (see contentKey above).
              */
              middle: {
                label: "",
                panelTitle: content.mine.title,
                panelBody: content.mine.body,
                ...(myMode
                  ? {
                      render: (anchor) =>
                        profileLoop({
                          anchor,
                          region: "middle",
                          blocks: [
                            { text: mode, role: "secondary" as const },
                            { text: clampField(myMode), role: "primary" as const },
                          ],
                        }),
                    }
                  : {
                      render: (anchor) =>
                        profileLoop({
                          anchor,
                          region: "middle",
                          blocks: [
                            { text: mode, role: "secondary" as const },
                            { text: "nothing yet", role: "tertiary" as const },
                          ],
                        }),
                    }),
              },
              /*
                BOTTOM LOOP = ALWAYS WHAT I AM GIVING. Permanent structural rule:
                the toggle never changes this loop's meaning or its content.
              */
              bottom: {
                label: "",
                panelTitle: content.community.title,
                panelBody: content.community.body,
                ...(myGive
                  ? {
                      render: (anchor) =>
                        profileLoop({
                          anchor,
                          region: "bottom",
                          blocks: [
                            { text: "give", role: "secondary" as const },
                            { text: clampField(myGive), role: "primary" as const },
                          ],
                        }),
                    }
                  : {}),
              },
            }}

          />


          <Screen open={top === "profile"}>
            <World
              world="profile"
              active={top === "profile"}
              identity="you"
              onBack={pop}
              overlay={
                <TopLoopSelector
                  position={myTopPos}
                  onChange={setMyTopPos}
                  content={
                    <>
                      {topLoopContent.photo(myPhoto(me), "me-top")}
                      {topLoopContent.stateLabel(HISTORY_STATES[myTopPos])}
                    </>
                  }
                />
              }
              regions={{
                top: {
                  label: "",
                  panelTitle: HISTORY_STATES[myTopPos],
                  panelBody: (
                    <>
                      {(MY_COMPLETED[myTopPos]!(me).length
                        ? MY_COMPLETED[myTopPos]!(me)
                        : MY_HISTORY[myTopPos]!
                      ).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      <p className="opacity-70">
                        {gaveTo
                          ? `you gave 50 sparks to ${gaveTo}.`
                          : "you still have 50 sparks to give away."}
                      </p>
                      <p style={{ color: "var(--giver-participation)" }}>
                        {me.sparkles} sparkles to help someone get seen.
                      </p>
                    </>
                  ),

                },
                middle: {
                  label: "",
                  panelTitle: "me",
                  panelBody: (
                    <>
                      {CATEGORIES.filter((c) => me.items[c].length).map((c) => (
                        <p key={c}>
                          {CATEGORY_PLURAL[c]}: {me.items[c].join(", ")}
                        </p>
                      ))}
                      <p className="opacity-70">{me.aboutMe || ME.about}</p>
                    </>
                  ),
                  render: ringPhoto(myPhoto(me), "me", 66),
                  onPress: () => setFullMe(true),
                },
                bottom: {
                  label: "edit profile",
                  panelTitle: "about me",
                  panelBody: null,
                  onPress: () => setSetup(true),
                },
              }}
            />
          </Screen>

          <Screen open={fullMe}>
            <FullProfile
              member={myAsMember(me)}
              world="me"
              onBack={() => setFullMe(false)}
            />
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

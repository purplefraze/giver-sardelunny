import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { FullProfile } from "@/components/FullProfile";
import { ProfileBuilder } from "@/components/ProfileBuilder";
import { profileLoop, clampField } from "@/components/living-g/profile-loop";
import { useMyProfile } from "@/hooks/use-my-profile";
import { myProfileStore, myAsMember, myPhoto, primaryAsk, primaryGive, CATEGORY_PLURAL, CATEGORIES } from "@/data/my-profile";

import {
  HISTORY_STATES,
  TopLoopSelector,
  topLoopContent,
  type TopLoopPosition,
} from "@/components/living-g/TopLoopSelector";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";


import { World, ringPhoto } from "@/components/World";
import { COMMUNITY_GIVES, COMMUNITY_WISHES, ME } from "@/data/giver";
import { cn } from "@/lib/utils";

/** The only place you ever go: your own profile. Everything else is a mode. */
type Screen = "profile";

const SCREENS: Screen[] = ["profile"];

/** My own history, in the toggle's order: past wishes, gives, trades. */
const MY_HISTORY: string[][] = [
  ME.history.wishes,
  ME.history.gives,
  ME.history.trades,
];

/**
 * ONE LIVING G, FOUR MODES.
 * Mode never navigates: it only changes what the same persistent G holds.
 *
 * The prompts are QUESTIONS, always — the G asks you something, it never files
 * anything away:
 *   middle loop = what I am putting into the world
 *   bottom loop = what the community is asking of me
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
      title: "what are you wishing for?",
      body: <p className="opacity-70">make a wish. keep it small and human.</p>,
    },
    community: {
      title: "what can you help with?",
      body: <>{COMMUNITY_WISHES.map((w) => <p key={w}>{w}</p>)}</>,
    },
  },
  give: {
    mine: {
      title: "what are you offering?",
      body: (
        <p className="opacity-70">
          share something you have, know, or can do.
        </p>
      ),
    },
    community: {
      title: "what are you looking for?",
      body: <>{COMMUNITY_GIVES.map((g) => <p key={g}>{g}</p>)}</>,
    },
  },
  trade: {
    mine: {
      title: "what are you trading?",
      body: (
        <p className="opacity-70">offer something, ask for something back.</p>
      ),
    },
    community: {
      title: "what trades are out there?",
      body: (
        <p className="opacity-70">
          open trades from the people nearby. coming next.
        </p>
      ),
    },
  },
  borrow: {
    mine: {
      title: "what would you like to borrow?",
      body: <p className="opacity-70">ask to borrow something for a while.</p>,
    },
    community: {
      title: "what can you lend?",
      body: (
        <p className="opacity-70">
          what people nearby are happy to lend. coming next.
        </p>
      ),
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
   * INSTRUCTIONAL COPY IS A CUE, NEVER FURNITURE. Entering, and every time the
   * mode changes, the action words fade in, stay long enough to read
   * comfortably, then fade away and leave the G clean again. Press and hold
   * brings one back.
   */
  useEffect(() => {
    if (!entered) return;
    setTeach(true);
    const t = setTimeout(() => setTeach(false), 4200);
    return () => clearTimeout(t);
  }, [entered, mode]);

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
  const myAsk = primaryAsk(me);
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
        <ProfileBuilder onDone={() => setSetup(false)} firstTime={!me.built} />
      ) : (

        <>
          {/* THE WORKSPACE — one Living G, always yours. Mode is a state of it. */}
          <World
            world={mode}
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
              middle: {
                // MY PRIORITY ASK — wish, trade or borrow, whichever is #1.
                label: content.mine.title,
                panelTitle: content.mine.title,
                panelBody: content.mine.body,
                ...(myAsk
                  ? {
                      render: (anchor) =>
                        profileLoop({
                          anchor,
                          region: "middle",
                          blocks: [
                            { text: myAsk.category, role: "secondary" as const },
                            { text: clampField(myAsk.text), role: "primary" as const },
                          ],
                        }),
                    }
                  : {}),
              },
              bottom: {
                // MY PRIORITY GIVE — always what I decided matters most.
                label: content.community.title,
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
                      {MY_HISTORY[myTopPos]!.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      <p className="opacity-70">
                        {gaveTo
                          ? `you gave 50 sparks to ${gaveTo}.`
                          : "you still have 50 sparks to give away."}
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

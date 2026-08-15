import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import {
  HISTORY_STATES,
  TopLoopSelector,
  topLoopContent,
  type TopLoopPosition,
} from "@/components/living-g/TopLoopSelector";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";
import { loopText } from "@/components/living-g/loop-text";

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
 * ACTION GRAMMAR is the primary rule — the G reads as things you can DO, never
 * as a filing system:
 *   middle loop = what I initiate for myself   (make / offer / propose / borrow)
 *   bottom loop = what I do for someone else   (grant / find / accept / lend)
 */
const MODE_CONTENT: Record<
  Mode,
  {
    /** The action lines that live inside each loop. */
    mine: { action: string[]; title: string; body: React.ReactNode };
    community: { action: string[]; title: string; body: React.ReactNode };
  }
> = {
  wish: {
    mine: {
      action: ["make", "a wish"],
      title: "make a wish",
      body: <p className="opacity-70">make a wish. keep it small and human.</p>,
    },
    community: {
      action: ["grant", "a wish"],
      title: "grant a wish",
      body: <>{COMMUNITY_WISHES.map((w) => <p key={w}>{w}</p>)}</>,
    },
  },
  give: {
    mine: {
      action: ["offer", "something"],
      title: "offer something",
      body: (
        <p className="opacity-70">
          share something you have, know, or can do.
        </p>
      ),
    },
    community: {
      action: ["find", "something"],
      title: "find something",
      body: <>{COMMUNITY_GIVES.map((g) => <p key={g}>{g}</p>)}</>,
    },
  },
  trade: {
    mine: {
      action: ["propose", "a trade"],
      title: "propose a trade",
      body: (
        <p className="opacity-70">offer something, ask for something back.</p>
      ),
    },
    community: {
      action: ["accept", "a trade"],
      title: "accept a trade",
      body: (
        <p className="opacity-70">
          open trades from the people nearby. coming next.
        </p>
      ),
    },
  },
  borrow: {
    mine: {
      action: ["borrow", "something"],
      title: "borrow something",
      body: <p className="opacity-70">ask to borrow something for a while.</p>,
    },
    community: {
      action: ["lend", "something"],
      title: "lend something",
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
  const [gaveTo, setGaveTo] = useState<string | null>(null);
  /** Prototype top-loop selector on my own profile; stays where I leave it. */
  const [myTopPos, setMyTopPos] = useState<TopLoopPosition>(0);
  /** Which mode the one persistent Living G is currently working in. */
  const [mode, setMode] = useState<Mode>("give");

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

  return (
    <main className="relative mx-auto h-[100dvh] w-full max-w-[520px] overflow-hidden">
      {!entered ? (
        <Onboarding
          onDone={(name) => {
            setGaveTo(name);
            setEntered(true);
          }}
        />
      ) : (
        <>
          {/* THE WORKSPACE — one Living G, always yours. Mode is a state of it. */}
          <World
            world={mode}
            identity="giver"
            active={top === null}
            overlay={
              <EarSelector
                mode={mode}
                onChange={setMode}
                onTap={() => push("profile")}
              />
            }
            regions={{
              top: {
                label: "",
                panelTitle: "you",
                panelBody: null,
                onPress: () => push("profile"),
              },
              middle: {
                label: "",
                panelTitle: content.mine.title,
                panelBody: content.mine.body,
                // WHAT I INITIATE — always inside the middle loop.
                render: () => loopText({ region: "middle", lines: content.mine.action }),
              },
              bottom: {
                label: "",
                panelTitle: content.community.title,
                panelBody: content.community.body,
                // WHAT I CAN DO FOR SOMEONE ELSE — inside the bottom loop.
                render: () =>
                  loopText({ region: "bottom", lines: content.community.action }),
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
                      {topLoopContent.photo(ME.photo, "me-top")}
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
                  panelBody: <p>{ME.name} — new to giver.</p>,
                  render: ringPhoto(ME.photo, "me", 92),
                },
                bottom: {
                  label: "about",
                  panelTitle: "about me",
                  panelBody: <p>{ME.about}</p>,
                },
              }}
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

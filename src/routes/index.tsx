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
 *   middle loop = mine in this mode
 *   bottom loop = the community in this mode
 */
const MODE_CONTENT: Record<
  Mode,
  {
    /** What this mode is called in the plural: gives, wishes, trades, borrows. */
    noun: string;
    mine: { title: string; body: React.ReactNode };
    community: { title: string; body: React.ReactNode };
  }
> = {
  wish: {
    noun: "wishes",
    mine: {
      title: "my wishes",
      body: <p className="opacity-70">make a wish. keep it small and human.</p>,
    },
    community: {
      title: "community wishes",
      body: <>{COMMUNITY_WISHES.map((w) => <p key={w}>{w}</p>)}</>,
    },
  },
  give: {
    noun: "gives",
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
      body: <>{COMMUNITY_GIVES.map((g) => <p key={g}>{g}</p>)}</>,
    },
  },
  trade: {
    noun: "trades",
    mine: {
      title: "my trades",
      body: (
        <p className="opacity-70">offer something, ask for something back.</p>
      ),
    },
    community: {
      title: "community trades",
      body: (
        <p className="opacity-70">
          open trades from the people nearby. coming next.
        </p>
      ),
    },
  },
  borrow: {
    noun: "borrows",
    mine: {
      title: "my borrows",
      body: <p className="opacity-70">ask to borrow something for a while.</p>,
    },
    community: {
      title: "community borrows",
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
                // MINE, for this mode — always inside the middle loop.
                render: () => loopText({ region: "middle", lines: ["my", content.noun] }),
              },
              bottom: {
                label: "",
                panelTitle: content.community.title,
                panelBody: content.community.body,
                // COMMUNITY, for this mode — always inside the bottom loop.
                render: () =>
                  loopText({ region: "bottom", lines: ["community", content.noun] }),
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

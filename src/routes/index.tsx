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
import { World, ringPhoto } from "@/components/World";
import { COMMUNITY_GIVES, COMMUNITY_WISHES, ME } from "@/data/giver";
import { cn } from "@/lib/utils";

type Screen = "profile" | "community" | "wish" | "give";

const SCREENS: Screen[] = ["profile", "community", "wish", "give"];

/** My own history, in the toggle's order: past wishes, gives, trades. */
const MY_HISTORY: string[][] = [
  ME.history.wishes,
  ME.history.gives,
  ME.history.trades,
];

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
          "One shape. Three Gs. Wish, give and trade with the people around you.",
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
  /** Which outward exchange mode the give side is working in. */
  const [mode, setMode] = useState<Mode>("give");

  /**
   * ONE source of truth for which world is open: the router.
   * The visible back arrow and the device/browser back gesture therefore
   * operate on exactly the same history model — no manual pushState.
   */
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const { w } = Route.useSearch();
  const top = w ?? null;

  /** How many world entries this session pushed, so back() never leaves Giver. */
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
          {/* HOME — the root. The G is the navigation. */}
          <World
            world="home"
            identity="giver"
            active={top === null}
            regions={{
              top: {
                label: "profile",
                panelTitle: "profile",
                panelBody: null,
                onPress: () => push("profile"),
              },
              middle: {
                label: "wish",
                panelTitle: "wish",
                panelBody: null,
                onPress: () => push("wish"),
              },
              bottom: {
                label: "give",
                panelTitle: "give",
                panelBody: null,
                onPress: () => push("give"),
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

          <Screen open={top === "community"}>
            <World
              world="community"
              active={top === "community"}
              identity="community"
              onBack={pop}
              regions={{
                top: {
                  label: "map",
                  panelTitle: "nearby",
                  panelBody: (
                    <p className="opacity-70">
                      the map lands here — who is wishing and giving around you,
                      right now.
                    </p>
                  ),
                },
                middle: {
                  label: "wishes",
                  panelTitle: "wishes",
                  panelBody: COMMUNITY_WISHES.map((w) => <p key={w}>{w}</p>),
                },
                bottom: {
                  label: "gives",
                  panelTitle: "gives",
                  panelBody: COMMUNITY_GIVES.map((g) => <p key={g}>{g}</p>),
                },
              }}
            />
          </Screen>

          {/* Wish world — the same Living G, in purple. */}
          <Screen open={top === "wish"}>
            <World
              world="wish"
              active={top === "wish"}
              identity="wish"
              onBack={pop}
              regions={{
                top: {
                  label: "search",
                  panelTitle: "search wishes",
                  panelBody: (
                    <p className="opacity-70">
                      search inside wishes. coming next.
                    </p>
                  ),
                },
                middle: {
                  label: "make",
                  panelTitle: "make a wish",
                  panelBody: (
                    <p className="opacity-70">
                      your own wish space — make a wish, see your wishes. coming
                      next.
                    </p>
                  ),
                },
                bottom: {
                  label: "grant",
                  panelTitle: "grant a wish",
                  panelBody: (
                    <p className="opacity-70">
                      wishes from other people you could fulfil. coming next.
                    </p>
                  ),
                },
              }}
            />
          </Screen>

          {/* Give world — the same Living G, in orange. */}
          <Screen open={top === "give"}>
            <World
              world="give"
              active={top === "give"}
              onBack={pop}
              overlay={<EarSelector mode={mode} onChange={setMode} />}
              regions={{
                top: {
                  label: "search",
                  panelTitle: "search gives",
                  panelBody: (
                    <p className="opacity-70">
                      search inside gives — things, skills, time, knowledge,
                      help. coming next.
                    </p>
                  ),
                },
                middle: {
                  label: "share",
                  panelTitle:
                    mode === "give"
                      ? "what are you sharing?"
                      : mode === "trade"
                        ? "what are you trading?"
                        : "what do you need to borrow?",
                  panelBody: (
                    <p className="opacity-70">
                      {mode === "give"
                        ? "share something you have, know, or can do."
                        : mode === "trade"
                          ? "offer something, ask for something back."
                          : "ask to borrow something for a while."}
                    </p>
                  ),
                },
                bottom: {
                  label: "discover",
                  panelTitle: "community gives",
                  panelBody: (
                    <p className="opacity-70">
                      what other people are sharing with the community. coming
                      next.
                    </p>
                  ),
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

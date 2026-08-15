import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { World, ringPhoto } from "@/components/World";
import { COMMUNITY_GIVES, COMMUNITY_WISHES, ME } from "@/data/giver";
import { cn } from "@/lib/utils";

type Screen = "profile" | "community" | "wish" | "give";

const SCREENS: Screen[] = ["profile", "community", "wish", "give"];

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
            identity="Giver"
            active={top === null}
            regions={{
              top: {
                label: "Profile",
                panelTitle: "Profile",
                panelBody: null,
                onPress: () => push("profile"),
              },
              middle: {
                label: "Wish",
                panelTitle: "Wish",
                panelBody: null,
                onPress: () => push("wish"),
              },
              bottom: {
                label: "Give",
                panelTitle: "Give",
                panelBody: null,
                onPress: () => push("give"),
              },
            }}
          />


          <Screen open={top === "profile"}>
            <World
              world="profile"
              active={top === "profile"}
              identity="You"
              onBack={pop}
              regions={{
                top: {
                  label: "Activity",
                  panelTitle: "My activity",
                  panelBody: (
                    <>
                      <p>
                        {gaveTo
                          ? `You gave 50 Sparks to ${gaveTo}.`
                          : "You still have 50 Sparks to give away."}
                      </p>
                      <p className="opacity-70">No wishes yet. No gives yet.</p>
                      <p className="text-3xl font-black">
                        {gaveTo ? "50" : "100"} Sparks of energy left
                      </p>
                    </>
                  ),
                },
                middle: {
                  label: "",
                  panelTitle: "Me",
                  panelBody: <p>{ME.name} — new to Giver.</p>,
                  render: ringPhoto(ME.photo, "me", 92),
                },
                bottom: {
                  label: "About",
                  panelTitle: "About me",
                  panelBody: <p>{ME.about}</p>,
                },
              }}
            />
          </Screen>

          <Screen open={top === "community"}>
            <World
              world="community"
              active={top === "community"}
              identity="Community"
              onBack={pop}
              regions={{
                top: {
                  label: "Map",
                  panelTitle: "Nearby",
                  panelBody: (
                    <p className="opacity-70">
                      The map lands here — who is wishing and giving around you,
                      right now.
                    </p>
                  ),
                },
                middle: {
                  label: "Wishes",
                  panelTitle: "Wishes",
                  panelBody: COMMUNITY_WISHES.map((w) => <p key={w}>{w}</p>),
                },
                bottom: {
                  label: "Gives",
                  panelTitle: "Gives",
                  panelBody: COMMUNITY_GIVES.map((g) => <p key={g}>{g}</p>),
                },
              }}
            />
          </Screen>

          {/* Wish world — the same Living G, in blue. */}
          <Screen open={top === "wish"}>
            <World
              world="wish"
              active={top === "wish"}
              identity="Wish"
              onBack={pop}
              regions={{
                top: {
                  label: "Search",
                  panelTitle: "Search wishes",
                  panelBody: (
                    <p className="opacity-70">
                      Search inside Wishes. Coming next.
                    </p>
                  ),
                },
                middle: {
                  label: "Make",
                  panelTitle: "Make a wish",
                  panelBody: (
                    <p className="opacity-70">
                      Your own Wish space — make a wish, see your wishes. Coming
                      next.
                    </p>
                  ),
                },
                bottom: {
                  label: "Grant",
                  panelTitle: "Grant a wish",
                  panelBody: (
                    <p className="opacity-70">
                      Wishes from other people you could fulfil. Coming next.
                    </p>
                  ),
                },
              }}
            />
          </Screen>

          {/* Give world — the same Living G, in yellow. */}
          <Screen open={top === "give"}>
            <World
              world="give"
              active={top === "give"}
              identity="Give"
              onBack={pop}
              regions={{
                top: {
                  label: "Search",
                  panelTitle: "Search gives",
                  panelBody: (
                    <p className="opacity-70">
                      Search inside Gives — things, skills, time, knowledge,
                      help. Coming next.
                    </p>
                  ),
                },
                middle: {
                  label: "Share",
                  panelTitle: "What are you sharing?",
                  panelBody: (
                    <p className="opacity-70">
                      Share something you have, know, or can do.
                    </p>
                  ),
                },
                bottom: {
                  label: "Discover",
                  panelTitle: "Community gives",
                  panelBody: (
                    <p className="opacity-70">
                      What other people are sharing with the community. Coming
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

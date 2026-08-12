import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { Pager } from "@/components/Pager";
import { World, ringPhoto } from "@/components/World";
import { COMMUNITY_GIVES, COMMUNITY_WISHES, ME } from "@/data/giver";

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
  const [pane, setPane] = useState(1);
  const [locked, setLocked] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [giveOpen, setGiveOpen] = useState(false);

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
          <Pager index={pane} onIndexChange={setPane} locked={locked}>
            <World
              world="community"
              word="Community"
              onLocked={setLocked}
              regions={{
                top: {
                  label: "Community Map",
                  panelTitle: "Nearby",
                  panelBody: (
                    <p className="opacity-70">
                      The map lands here — who is wishing and giving around you,
                      right now.
                    </p>
                  ),
                },
                middle: {
                  label: "Community Wishes",
                  panelTitle: "Wishes",
                  panelBody: COMMUNITY_WISHES.map((w) => <p key={w}>{w}</p>),
                },
                bottom: {
                  label: "Community Gives",
                  panelTitle: "Gives",
                  panelBody: COMMUNITY_GIVES.map((g) => <p key={g}>{g}</p>),
                },
              }}
            />

            <World
              world="home"
              word="Giver"
              onLocked={setLocked}
              regions={{
                top: {
                  label: "Profile",
                  panelTitle: "Profile",
                  panelBody: null,
                  onPress: () => setPane(2),
                },
                middle: {
                  label: "Wish",
                  panelTitle: "Wish",
                  panelBody: null,
                  onPress: () => setWishOpen(true),
                },
                bottom: {
                  label: "Give",
                  panelTitle: "Give",
                  panelBody: null,
                  onPress: () => setGiveOpen(true),
                },
              }}
            />

            <World
              world="profile"
              word="My G"
              onLocked={setLocked}
              regions={{
                top: {
                  label: "My Activity",
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
                  label: "About Me",
                  panelTitle: "About me",
                  panelBody: <p>{ME.about}</p>,
                },
              }}
            />
          </Pager>

          {/* Wish world — the same Living G, in blue. */}
          <div
            className={`absolute inset-0 z-40 transition-transform duration-300 ease-out ${
              wishOpen ? "translate-x-0" : "pointer-events-none invisible translate-x-full"
            }`}
            aria-hidden={!wishOpen}
          >
            <World
              world="wish"
              regions={{
                top: {
                  label: "Search Wishes",
                  panelTitle: "Search wishes",
                  panelBody: (
                    <p className="opacity-70">
                      Search inside Wishes. Coming next.
                    </p>
                  ),
                },
                middle: {
                  label: "My Wishes",
                  panelTitle: "Make a wish",
                  panelBody: (
                    <p className="opacity-70">
                      Your own Wish space — make a wish, see your wishes. Coming
                      next.
                    </p>
                  ),
                },
                bottom: {
                  label: "Grant a Wish",
                  panelTitle: "Grant a wish",
                  panelBody: (
                    <p className="opacity-70">
                      Wishes from other people you could fulfil. Coming next.
                    </p>
                  ),
                },
              }}
            >
              <BackArrow onClick={() => setWishOpen(false)} />
            </World>
          </div>

          {/* Give world — the same Living G, in yellow. */}
          <div
            className={`absolute inset-0 z-40 transition-transform duration-300 ease-out ${
              giveOpen ? "translate-x-0" : "pointer-events-none invisible translate-x-full"
            }`}
            aria-hidden={!giveOpen}
          >
            <World
              world="give"
              regions={{
                top: {
                  label: "Search Gives",
                  panelTitle: "Search gives",
                  panelBody: (
                    <p className="opacity-70">
                      Search inside Gives — things, skills, time, knowledge,
                      help. Coming next.
                    </p>
                  ),
                },
                middle: {
                  label: "My Gives",
                  panelTitle: "Make a give",
                  panelBody: (
                    <p className="opacity-70">
                      Your own Give space — offer something you have or
                      something you can do. Coming next.
                    </p>
                  ),
                },
                bottom: {
                  label: "Community Gives",
                  panelTitle: "Community gives",
                  panelBody: (
                    <p className="opacity-70">
                      What other people are offering the community. Coming next.
                    </p>
                  ),
                },
              }}
            >
              <BackArrow onClick={() => setGiveOpen(false)} />
            </World>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-current transition-opacity"
                style={{ opacity: i === pane ? 0.9 : 0.25, color: "var(--world-ink)" }}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function Composer({ prompt, verb }: { prompt: string; verb: string }) {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);

  if (done) return <p className="text-3xl font-black">Out in the world.</p>;

  return (
    <>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={prompt}
        className="w-full border-b-2 border-current bg-transparent pb-3 text-2xl font-bold outline-none placeholder:opacity-40"
      />
      <button
        type="button"
        onClick={() => value.trim() && setDone(true)}
        className="rounded-full px-7 py-4 text-lg font-black uppercase active:scale-95"
        style={{ background: "var(--world-g)", color: "var(--world-bg)" }}
      >
        {verb}
      </button>
    </>
  );
}

/** Minimal back affordance: a single arrow in the upper-left safe area. */
function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="absolute left-3 top-3 z-20 p-3 opacity-60 active:scale-90"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5 8 12l7 7" />
      </svg>
    </button>
  );
}

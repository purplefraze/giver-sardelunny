import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { Pager } from "@/components/Pager";
import { World, ringPhoto } from "@/components/World";
import {
  COMMUNITY_GIVES,
  COMMUNITY_WISHES,
  ME,
  SEARCH_RESULTS,
} from "@/data/giver";

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
                  label: "Search",
                  panelTitle: "Search",
                  panelBody: (
                    <>
                      <input
                        placeholder="What are you looking for?"
                        className="w-full border-b-2 border-current bg-transparent pb-3 text-2xl font-bold outline-none placeholder:opacity-40"
                      />
                      {SEARCH_RESULTS.map((r) => (
                        <p key={r} className="opacity-70">
                          {r}
                        </p>
                      ))}
                    </>
                  ),
                },
                middle: {
                  label: "Wish",
                  panelTitle: "Wish",
                  panelBody: <Composer prompt="What do you wish for?" verb="Make a wish" />,
                },
                bottom: {
                  label: "Give",
                  panelTitle: "Give",
                  panelBody: <Composer prompt="What are you giving?" verb="Give it" />,
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

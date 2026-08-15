import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { World } from "@/components/World";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";

export const Route = createFileRoute("/geo-check")({
  head: () => ({
    meta: [
      { title: "Giver — geometry check" },
      { name: "description", content: "Internal Living G geometry check." },
      { property: "og:title", content: "Giver — geometry check" },
      { property: "og:description", content: "Internal Living G geometry check." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => {
    const [mode, setMode] = useState<Mode>("give");
    return (
      <main className="relative mx-auto h-[100dvh] w-full max-w-[520px] overflow-hidden">
        <World
          world={mode}
          identity="giver"
          earCut
          overlay={<EarSelector mode={mode} onChange={setMode} />}
          regions={{
            top: { label: "", panelTitle: "you", panelBody: null },
            middle: { label: "make a wish", panelTitle: "a", panelBody: null },
            bottom: { label: "grant a wish", panelTitle: "b", panelBody: null },
          }}
        />
      </main>
    );
  },
});

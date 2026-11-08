import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { devOnlyRoute } from "@/lib/dev-routes";
import { World } from "@/components/World";
import { EarSelector } from "@/components/living-g/EarSelector";
import { VoiceEnclosure } from "@/components/living-g/GEnclosure";
import { WishJourney } from "@/intelligence/WishJourney";

export const Route = createFileRoute("/dev/wish")({
  beforeLoad: devOnlyRoute,
  head: () => ({ meta: [
    { title: "Wish journey · Giver Dev" },
    { name: "description", content: "Review page for the approved Wish guided journey (phase 1)." },
    { property: "og:title", content: "Wish journey · Giver Dev" },
    { property: "og:description", content: "The Wish guided journey, isolated for review with no writes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Review,
});

/* Production World + VoiceEnclosure + WishJourney; no cloud, no share. */
function Review() {
  const [open, setOpen] = useState(true);
  const region = { label: "", panelTitle: "", panelBody: null };
  return (
    <main className="g-canvas-h g-canvas-w relative mx-auto overflow-hidden" data-wish-review="">
      <World world="wish" earCut regions={{ top: region, middle: { ...region, onPress: () => setOpen(true) }, bottom: region }} overlay={<EarSelector mode="wish" onChange={() => {}} onTap={() => setOpen(true)} />} />
      {open ? (
        <VoiceEnclosure seat="wish" onFold={() => setOpen(false)}>
          <WishJourney onExit={() => document.querySelector("[data-voice-frame]")?.dispatchEvent(new Event("giver:fold"))} />
        </VoiceEnclosure>
      ) : null}
    </main>
  );
}

import { useState } from "react";
import { World } from "@/components/World";
import { EarSelector } from "@/components/living-g/EarSelector";
import { VoiceEnclosure } from "@/components/living-g/GEnclosure";
import { WishJourney } from "@/intelligence/WishJourney";

/** No account, cloud stores, recorder, Share handler or lifecycle onboarding. */
export function WishPreviewReview() {
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
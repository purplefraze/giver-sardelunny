import { useState } from "react";
import { World } from "@/components/World";
import { EarSelector } from "@/components/living-g/EarSelector";
import { VoiceEnclosure } from "@/components/living-g/GEnclosure";
import { GiveJourney } from "@/intelligence/GiveJourney";

/** No account, cloud stores, recorder, Share handler or lifecycle onboarding. */
export function GivePreviewReview() {
  const [open, setOpen] = useState(true);
  const region = { label: "", panelTitle: "", panelBody: null };
  return (
    <main className="g-canvas-h g-canvas-w relative mx-auto overflow-hidden" data-give-review-page="">
      <World world="give" earCut regions={{ top: region, middle: { ...region, onPress: () => setOpen(true) }, bottom: region }} overlay={<EarSelector mode="give" onChange={() => {}} onTap={() => setOpen(true)} />} />
      {open ? (
        <VoiceEnclosure seat="give" onFold={() => setOpen(false)}>
          <GiveJourney onExit={() => document.querySelector("[data-voice-frame]")?.dispatchEvent(new Event("giver:fold"))} />
        </VoiceEnclosure>
      ) : null}
    </main>
  );
}
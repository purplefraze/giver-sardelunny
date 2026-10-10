import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VoiceEnclosure } from "@/components/living-g/GEnclosure";

/* TEMPORARY visual harness for the unfold/fold frames. */
export const Route = createFileRoute("/dev/morph-check")({ component: Check });

function Check() {
  const [open, setOpen] = useState(true);
  return open ? (
    <VoiceEnclosure seat="give" onFold={() => setOpen(false)}>
      <div className="gv-sheet"><div className="gv-title">give</div><p>offer · details · photo</p></div>
    </VoiceEnclosure>
  ) : <p data-folded="1">folded</p>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { World } from "@/components/World";
import { EarSelector, type Mode } from "@/components/living-g/EarSelector";

export const Route = createFileRoute("/eartest")({ component: T });

function T() {
  const [mode, setMode] = useState<Mode>("give");
  return (
    <main className="relative mx-auto h-[100dvh] w-full max-w-[520px] overflow-hidden">
      <World world="give" active overlay={<EarSelector mode={mode} onChange={setMode} />} regions={{ top: { label: "search" }, middle: { label: "share" }, bottom: { label: "discover" } }} />
    </main>
  );
}

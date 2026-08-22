import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GEnclosure } from "@/components/living-g/GEnclosure";
import { FullProfile } from "@/components/FullProfile";
import { memberById } from "@/data/giver";

export const Route = createFileRoute("/gtest")({
  head: () => ({
    meta: [
      { title: "Enclosure test — Giver" },
      { name: "description", content: "Temporary harness for the Living G enclosure." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Test,
});

function Test() {
  const [open, setOpen] = useState(false);
  const member = memberById("giulia");
  return (
    <main className="relative h-dvh w-full bg-white">
      <button type="button" onClick={() => setOpen(true)} className="absolute left-4 top-4 z-40">
        open
      </button>
      <GEnclosure open={open}>
        {member ? <FullProfile member={member} onBack={() => setOpen(false)} /> : null}
      </GEnclosure>
    </main>
  );
}

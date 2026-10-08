import { createFileRoute } from "@tanstack/react-router";
import { MiddleSpatialPrototype } from "@/components/living-g/MiddleSpatialPrototype";

export const Route = createFileRoute("/dev/middle-loop")({
  head: () => ({ meta: [
    { title: "Middle-loop spatial study · Giver Dev" },
    { name: "description", content: "An isolated Wish-first Living G spatial navigation study." },
    { property: "og:title", content: "Middle-loop spatial study · Giver Dev" },
    { property: "og:description", content: "An isolated eight-seat Living G spatial prototype." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: MiddleSpatialPrototype,
});
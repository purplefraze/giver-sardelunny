import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { wishReviewOnlyRoute } from "@/lib/wish-review-route";
import { GivePreviewReview } from "@/components/GivePreviewReview";

export const Route = createFileRoute("/review/give")({
  beforeLoad: wishReviewOnlyRoute,
  head: () => ({ meta: [
    { title: "Give preview review · Giver" },
    { name: "description", content: "Isolated local-only review of all seven Giver Give journeys." },
    { property: "og:title", content: "Give preview review · Giver" },
    { property: "og:description", content: "Preview every Give journey without signing in or sharing anything." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow, noarchive" },
  ] }),
  // The existing journey reads local drafts: mount only after hydration.
  component: () => <ClientOnly><GivePreviewReview /></ClientOnly>,
});
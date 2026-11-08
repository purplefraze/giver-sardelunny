import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { wishReviewOnlyRoute } from "@/lib/wish-review-route";
import { WishPreviewReview } from "@/components/WishPreviewReview";

export const Route = createFileRoute("/review/wish")({
  beforeLoad: wishReviewOnlyRoute,
  head: () => ({ meta: [
    { title: "Wish preview review · Giver" },
    { name: "description", content: "Isolated local-only review of Giver’s Wish entry, item and food questions." },
    { property: "og:title", content: "Wish preview review · Giver" },
    { property: "og:description", content: "Preview the Wish journey without signing in or sharing anything." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow, noarchive" },
  ] }),
  // The existing journey reads local drafts: mount only after hydration.
  component: () => <ClientOnly><WishPreviewReview /></ClientOnly>,
});
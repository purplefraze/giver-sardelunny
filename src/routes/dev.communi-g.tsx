import { createFileRoute } from "@tanstack/react-router";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export const Route = createFileRoute("/dev/communi-g")({
  head: () => ({ meta: [
    { title: "Communi-G lower loop · Giver Dev" },
    { name: "description", content: "Review page for the eight-area Communi-G lower loop." },
    { property: "og:title", content: "Communi-G lower loop · Giver Dev" },
    { property: "og:description", content: "The Communi-G lower loop, isolated for review." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <div className="fixed inset-0">
      <CommunityFeed onOpen={() => {}} onClose={() => history.back()} />
    </div>
  ),
});

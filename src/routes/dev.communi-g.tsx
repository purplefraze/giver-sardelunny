import { createFileRoute } from "@tanstack/react-router";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { useState } from "react";
import { ActivityDetail } from "@/components/community/ActivityDetail";

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
  component: LowerReview,
});

function LowerReview() {
  const [detail, setDetail] = useState<string | null>(null);
  return <div className="fixed inset-0">
    <CommunityFeed detailId={detail} onCloseDetail={() => setDetail(null)} onOpen={setDetail} onClose={() => history.back()} />
  </div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { MyGRing } from "@/components/profile/MyGRing";

export const Route = createFileRoute("/dev/my-g")({
  head: () => ({ meta: [
    { title: "My G profile loop · Giver Dev" },
    { name: "description", content: "Review page for the eight-area My G profile loop." },
    { property: "og:title", content: "My G profile loop · Giver Dev" },
    { property: "og:description", content: "The My G profile loop, isolated for review." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <div className="fixed inset-0">
      <MyGRing onClose={() => history.back()} />
    </div>
  ),
});

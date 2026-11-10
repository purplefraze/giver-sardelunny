import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { wishReviewOnlyRoute } from "@/lib/wish-review-route";
import { NovemberPreviewReview } from "@/components/NovemberPreviewReview";

export const Route = createFileRoute("/review/november")({
  beforeLoad: wishReviewOnlyRoute,
  head: () => ({meta:[
    {title:"November preview · Giver"},
    {name:"description",content:"Isolated Giver community, spatial navigation and private conversation preview."},
    {property:"og:title",content:"November preview · Giver"},
    {property:"og:description",content:"Review the November Giver changes without account or shared-data writes."},
    {property:"og:type",content:"website"},
    {name:"twitter:card",content:"summary"},
    {name:"robots",content:"noindex, nofollow, noarchive"},
  ]}),
  component:()=> <ClientOnly><NovemberPreviewReview /></ClientOnly>,
});
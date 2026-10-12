import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { World } from "@/components/World";
import { EarSelector } from "@/components/living-g/EarSelector";
import { SignInView } from "@/components/onboarding/SignInView";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { MyGRing } from "@/components/profile/MyGRing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dev/luna")({
  head: () => ({ meta: [
    {title:"Giver · isolated design review"},
    {name:"description",content:"Isolated Giver production-component design review without account writes."},
    {property:"og:title",content:"Giver · isolated design review"},
    {property:"og:description",content:"Living G, sign-in, profile and community design review."},
    {property:"og:type",content:"website"}, {name:"twitter:card",content:"summary"},
    {name:"robots",content:"noindex, nofollow"},
  ]}),
  component: Review,
});
function Review() {
  const [view,setView]=useState("full");
  const [seat,setSeat]=useState<"give"|"lend"|"trade"|"wish"|"borrow"|"fund"|"giver"|"map">("give");
  const [detail,setDetail]=useState<string|null>(null);
  const [email,setEmail]=useState("");
  const otp={step:"email" as const,email,setEmail,busy:false,error:null,notice:null,cooldown:0,code:"",setCode:()=>{},submitEmail:async(e?:React.FormEvent)=>{e?.preventDefault();},submitCode:async(e?:React.FormEvent)=>{e?.preventDefault();},resend:async()=>{},changeEmail:()=>{}};
  const region={label:"",panelTitle:"",panelBody:null};
  return <main className="fixed inset-0" data-luna-review="">
    {view==="full" ? <World world={seat==="giver"?"profile":seat} earCut regions={{top:region,middle:region,bottom:region}} overlay={<EarSelector seats={["giver","give","lend","trade","map","fund","borrow","wish"]} mode={seat} onChange={setSeat} onTap={()=>setView(seat==="giver"?"profile":seat==="map"?"community":"signin")} />} /> : null}
    {view==="signin" ? <SignInView otp={otp} /> : null}
    {view==="community" ? <CommunityFeed detailId={detail} onOpen={setDetail} onCloseDetail={()=>setDetail(null)} onClose={()=>setView("full")} /> : null}
    {view==="profile" ? <MyGRing onClose={()=>setView("full")} /> : null}
    <div className="sr-only focus-within:not-sr-only absolute bottom-0 z-50" aria-label="isolated review views">
      {["full","signin","community","profile"].map(v=><Button key={v} variant="ghost" onClick={()=>setView(v)}>{v}</Button>)}
    </div>
  </main>;
}
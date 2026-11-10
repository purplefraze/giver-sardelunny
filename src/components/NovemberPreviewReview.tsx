import { useState } from "react";
import { World } from "./World";
import { EarSelector, type Seat } from "./living-g/EarSelector";
import { GDepthStack } from "./living-g/GDepthStack";
import { SpatialCamera, type CameraTravel } from "./living-g/SpatialCamera";
import { VoiceEnclosure } from "./living-g/GEnclosure";
import { CommunityFeed } from "./community/CommunityFeed";
import { WishJourney } from "@/intelligence/WishJourney";
import { Button } from "./ui/button";
import { itemsStore, itemLine } from "@/data/items";
import { memberById } from "@/data/giver";
import { BackArrow } from "./BackArrow";

/** Hosted zero-write demonstration: no cloud startup, post/share or store sends. */
export function NovemberPreviewReview() {
  const [seat, setSeat] = useState<Seat>("map");
  const [browse, setBrowse] = useState(true);
  const [detail, setDetail] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [thread, setThread] = useState<string | null>(null);
  const [wish, setWish] = useState(false);
  const [travel, setTravel] = useState<CameraTravel | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [summary, setSummary] = useState(false);
  const item = itemsStore.get().items.find(i=>i.id===thread);
  const owner = person ? memberById(person) : null;
  const region = {label:"",panelTitle:"",panelBody:null};
  const openHome = () => setBrowse(true);
  return <main className="g-canvas-h g-canvas-w relative mx-auto overflow-hidden" data-november-review="">
    <World world={seat === "giver" ? "profile" : seat === "map" ? "communigy" : seat} home earCut regions={{top:{...region,onPress:()=>setPerson("me")},middle:{...region,onPress:()=>seat === "wish" ? setWish(true) : openHome()},bottom:{...region,onPress:openHome}}} overlay={<EarSelector mode={seat} onChange={setSeat} onTap={()=>seat === "wish" ? setWish(true) : openHome()} />} />
    <GDepthStack onPop={id=>{if(id==="thread")setThread(null);else if(id==="person")setPerson(null);else setBrowse(false);}} slots={[
      {id:"browse",open:browse,anchor:"bottom",world:"communigy",bare:true,children:<CommunityFeed previewOnly detailId={detail} onOpen={setDetail} onCloseDetail={()=>setDetail(null)} onClose={()=>setBrowse(false)} onExit={()=>setBrowse(false)} onOpenProfile={setPerson} onPreviewContact={id=>{setThread(id);setMessages([]);setDraft("");}} onCreate={mode=>{if(mode === "wish"){setSeat("wish");setTravel({from:"bottom",to:"middle",key:performance.now(),colour:"var(--mode-wish)"});}}} />},
      {id:"person",open:person !== null,anchor:"top",world:"me",children:<div className="g-page g-page-top h-full"><BackArrow onClick={()=>setPerson(null)} /><h1 className="g-heading">{owner?.username ?? "my g"}</h1>{owner?.photo ? <img src={owner.photo} alt={owner.username} className="mt-4 h-24 w-24 rounded-full object-cover" /> : null}<p className="g-body mt-4">{owner?.about}</p></div>},
      {id:"thread",open:thread !== null,anchor:"top",bare:true,world:"me",children:<div className="flex h-full flex-col gap-3 px-4 pt-14 pb-4" data-preview-thread=""><BackArrow onClick={()=>setThread(null)} /><h1 className="g-heading">{item ? memberById(item.ownerId)?.username : "messages"}</h1><Button variant="ghost" className="h-auto whitespace-normal justify-start p-0 text-left g-body" aria-expanded={summary} onClick={()=>setSummary(v=>!v)}>{item ? itemLine(item) : "listing"}</Button>{summary ? <p className="g-meta" data-linked-listing="">{item?.note} · {item?.status} · owner chooses recipient</p> : null}<ul className="min-h-0 flex-1 overflow-y-auto">{messages.map((m,i)=><li key={i} className="g-body text-right py-2 text-primary">{m}</li>)}</ul><form className="flex gap-2" onSubmit={e=>{e.preventDefault();if(draft.trim()){setMessages(m=>[...m,draft.trim()]);setDraft("");}}}><input aria-label="preview message" placeholder="type your message" className="min-w-0 flex-1 border-b bg-transparent text-foreground" value={draft} onChange={e=>setDraft(e.target.value)} /><Button variant="ghost" type="submit" disabled={!draft.trim()}>send</Button></form></div>},
    ]} />
    {wish ? <VoiceEnclosure seat="wish" onFold={()=>{setWish(false);setTravel({from:"middle",to:"bottom",key:performance.now(),colour:"var(--mode-communigy)"});}}><WishJourney onExit={()=>document.querySelector("[data-voice-frame]")?.dispatchEvent(new Event("giver:fold"))} /></VoiceEnclosure> : null}
    <SpatialCamera travel={travel} onFinish={()=>{if(travel?.to === "middle")setWish(true);setTravel(null);}} />
  </main>;
}
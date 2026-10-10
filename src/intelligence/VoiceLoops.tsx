import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { conversation } from "@/intelligence/voice-conversation";
import { voiceCapture } from "@/intelligence/voice-capture";
import { sessionForSeat } from "@/intelligence/voice-session";
import { haptics } from "@/lib/haptics";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();
/** Full G voice is deliberately centred; expanded profile/community remain spatial. */
export function VoiceLoops({ onReview, onNavigate, seat = "wish" }: { onReview: () => void; onNavigate?: () => void; seat?: string }) {
  const c = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.getServer);
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const [typing, setTyping] = useState("");
  const s = c.session ?? sessionForSeat(seat);
  if (s.stage === "review" || s.stage === "live") return null;
  const m = LOOP_CENTRE.middle, b = LOOP_CENTRE.bottom;
  const heard = v.transcript || s.heard;
  const status = v.state === "listening" ? "listening · tap the toggle to stop" : v.state === "speaking" ? "giver is asking" : v.state === "processing" ? "finishing your words" : v.state === "error" ? v.error : v.state === "unsupported" ? "speech isn't available here · type instead" : "tap the record dot, or type";
  return <g data-voice-loops="" onPointerDown={stop} onClick={stop}>
    <foreignObject x={m.x - 112} y={m.y - 110} width={224} height={220}>
      <div className="gv-loop gv-loop-main" data-voice-ask={s.asking ?? s.stage}>
        <p className="gv-ask" aria-live="polite">{s.prompt}</p>
        {(seat === "giver" || seat === "map") && !c.session ? <Button variant="ghost" className="gv-tap" onClick={onNavigate}>{seat === "giver" ? "open my g" : "open communi-g"}</Button> : null}
        {s.choices.length ? <div className="gv-taps">{s.choices.map(ch => <Button variant="ghost" key={ch} className="gv-tap" onClick={() => conversation.choose(ch)}>{ch}</Button>)}</div> : null}
        {s.asking === "where" && !c.pin ? <Button variant="ghost" className="gv-tap" onClick={() => conversation.useLocation()}>use my location</Button> : null}
        {s.wantsPhoto || c.photo ? <Button variant="ghost" className="gv-plus" aria-label={c.photo ? "change photo" : "add a photo"} onClick={() => { haptics.selection(); void conversation.addPhoto(); }}>{c.photo ? <img src={c.photo.url} alt="your photo" /> : <span aria-hidden>+</span>}</Button> : null}
        {s.stage === "ready" || (s.action && s.asking === null) ? <Button variant="ghost" className="gv-tap" onClick={onReview}>review</Button> : null}
      </div>
    </foreignObject>
    <foreignObject x={b.x - 144} y={b.y - 124} width={288} height={248}>
      <div className="gv-loop gv-loop-low">
        <p className="gv-status" role="status" data-voice-state={v.state}>{status}</p>
        <p className="gv-heard" data-voice-heard="" aria-live="polite">{heard || "your words belong here"}</p>
        <form className="gv-type" onSubmit={e => { e.preventDefault(); if (!typing.trim()) return; if (!c.session) conversation.selectSeat(seat); conversation.type(typing); setTyping(""); }}>
          <input aria-label="type your answer" placeholder="or type here" value={typing} maxLength={400} onChange={e => setTyping(e.target.value)} />
        </form>
        {c.session ? <div className="gv-taps"><Button variant="ghost" className="gv-tap" onClick={() => conversation.close()}>cancel conversation</Button></div> : null}
      </div>
    </foreignObject>
  </g>;
}

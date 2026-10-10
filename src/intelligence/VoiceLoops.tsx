import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { conversation } from "@/intelligence/voice-conversation";
import { voiceCapture } from "@/intelligence/voice-capture";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();
/** Full G voice is deliberately centred; expanded profile/community remain spatial. */
export function VoiceLoops({ onReview, onNavigate, seat = "wish" }: { onReview: () => void; onNavigate?: () => void; seat?: string }) {
  const c = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.getServer);
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const m = LOOP_CENTRE.middle, b = LOOP_CENTRE.bottom;
  const words: Record<string,string> = {give:"Give",wish:"Wish",trade:"Trade",borrow:"Borrow",lend:"Lend",fund:"Fund",giver:"Profile",map:"communi-g"};
  const heard = v.transcript || c.session?.heard;
  return <g data-voice-loops="" onPointerDown={stop} onClick={stop}>
    <foreignObject x={m.x-132} y={m.y-90} width={264} height={180}>
      <div className="gv-loop gv-loop-main">
        <Button variant="ghost" className="gv-mode-word" onClick={onNavigate}>{words[seat] ?? "Give"}</Button>
      </div>
    </foreignObject>
    {heard || v.state === "listening" || v.state === "error" ? <foreignObject x={b.x-144} y={b.y-110} width={288} height={220}>
      <div className="gv-loop gv-loop-low"><p className="gv-status" role="status" data-voice-state={v.state}>{v.state === "listening" ? "listening" : v.state === "error" ? v.error : ""}</p><p className="gv-heard" data-voice-heard="" aria-live="polite">{heard}</p></div>
    </foreignObject> : null}
  </g>;
}

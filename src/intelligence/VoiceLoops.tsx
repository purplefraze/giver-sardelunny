import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { conversation } from "@/intelligence/voice-conversation";
import { voiceCapture, type VoiceSnapshot } from "@/intelligence/voice-capture";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** Every authored word here is lowercase — never a capital. */
export const MODE_WORD: Record<string, string> = { give: "give", wish: "wish", trade: "trade", borrow: "borrow", lend: "lend", fund: "fund", giver: "profile", map: "communi-g" };

/** Pure: what the bottom hollow says while recording (or after). */
export function lowerHollow(v: VoiceSnapshot, recording: boolean, heard: string): { status: string; words: string; show: boolean } {
  const status =
    v.state === "listening" ? "listening…" :
    v.state === "processing" ? "got it…" :
    v.state === "speaking" ? "" :
    v.state === "error" ? (v.error ?? "listening stopped. type instead, or try again.") :
    v.state === "unsupported" && recording ? "voice isn't available in this browser. tap the word to type instead." :
    recording ? "starting…" : "";
  const words = v.transcript || heard;
  return { status, words, show: recording || !!words || v.state === "error" || (v.state === "unsupported" && recording) || v.state === "listening" || v.state === "processing" };
}

/** Full G voice is deliberately centred; expanded profile/community remain spatial. */
export function VoiceLoops({ onReview, onNavigate, seat = "wish", quietMiddle = false }: { onReview: () => void; onNavigate?: () => void; seat?: string; quietMiddle?: boolean }) {
  void onReview;
  const c = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.getServer);
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const m = LOOP_CENTRE.middle, b = LOOP_CENTRE.bottom;
  const recording = c.mode !== "off";
  const low = lowerHollow(v, recording, c.session?.heard ?? "");
  const prompt = (recording || low.words) && c.session?.prompt && c.session.stage !== "review" ? c.session.prompt : "";
  return <g data-voice-loops="" onPointerDown={stop} onClick={stop}>
    {quietMiddle && !recording && !low.words ? null : <foreignObject x={m.x-132} y={m.y-90} width={264} height={180}>
      <div className="gv-loop gv-loop-main">
        <Button variant="ghost" className="gv-mode-word" onClick={onNavigate} data-mode-word="">{MODE_WORD[seat] ?? "give"}</Button>
        {prompt ? <p className="gv-prompt" data-voice-prompt="">{prompt.toLowerCase()}</p> : null}
      </div>
    </foreignObject>}
    {low.show ? <foreignObject x={b.x-144} y={b.y-110} width={288} height={220}>
      <div className="gv-loop gv-loop-low"><p className="gv-status" role="status" data-voice-state={v.state}>{low.status}</p><p className="gv-heard" data-voice-heard="" aria-live="polite">{low.words}</p></div>
    </foreignObject> : null}
  </g>;
}

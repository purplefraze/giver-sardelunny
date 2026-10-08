import { useState, useSyncExternalStore } from "react";
import { LOOP_CENTRE } from "@/components/living-g/g-path";
import { conversation } from "@/intelligence/voice-conversation";
import { voiceCapture } from "@/intelligence/voice-capture";
import { haptics } from "@/lib/haptics";

/**
 * THE CONVERSATION'S WORDS, DRAWN INSIDE THE INTACT G.
 * Middle loop: the one short question (plus its few taps).
 * Bottom loop: the live words being heard, and a way to type.
 */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function VoiceLoops({ onReview }: { onReview: () => void }) {
  const c = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.getServer);
  const v = useSyncExternalStore(voiceCapture.subscribe, voiceCapture.get, voiceCapture.getServer);
  const [typing, setTyping] = useState("");
  const s = c.session;
  if (!s || s.stage === "review" || s.stage === "live") return null;
  const m = LOOP_CENTRE.middle;
  const b = LOOP_CENTRE.bottom;
  const heard = v.state === "listening" && v.transcript ? v.transcript : s.heard;
  const status =
    v.state === "listening"
      ? c.mode === "locked"
        ? "listening · hands-free"
        : "listening"
      : v.state === "speaking"
        ? "giver is asking"
        : v.state === "error"
          ? v.error
          : v.state === "unsupported"
            ? "speaking isn't available here — type below"
            : "hold the record button to answer";

  return (
    <g data-voice-loops="" onPointerDown={stop} onClick={stop}>
      <foreignObject x={m.x - 108} y={m.y - 104} width={216} height={208}>
        <div className="gv-loop" data-voice-ask={s.asking ?? s.stage}>
          <p className="gv-ask" aria-live="polite">{s.prompt}</p>
          {s.stage === "ready" ? (
            <div className="gv-taps">
              <button type="button" className="gv-tap gv-tap-strong" onClick={() => { haptics.selection(); onReview(); }}>review</button>
              <button type="button" className="gv-tap" onClick={() => conversation.choose("not yet")}>keep talking</button>
            </div>
          ) : s.asking === "intent" && s.choices.length ? (
            <div className="gv-taps">
              {s.choices.map((ch) => (
                <button key={ch} type="button" className="gv-tap" onClick={() => conversation.choose(ch)}>{ch}</button>
              ))}
            </div>
          ) : s.asking === "where" && !c.pin ? (
            <div className="gv-taps">
              <button type="button" className="gv-tap" onClick={() => conversation.useLocation()}>use my location</button>
            </div>
          ) : s.stage === "anything" && s.action ? (
            <div className="gv-taps">
              <button type="button" className="gv-tap" onClick={() => conversation.choose("that's it")}>that's it</button>
            </div>
          ) : null}
          {s.wantsPhoto || c.photo ? (
            <button
              type="button"
              className="gv-plus"
              aria-label={c.photo ? "change photo" : "add a photo"}
              onClick={() => { haptics.selection(); void conversation.addPhoto(); }}
            >
              {c.photo ? <img src={c.photo.url} alt="your photo" /> : <span aria-hidden>+</span>}
            </button>
          ) : null}
        </div>
      </foreignObject>
      <foreignObject x={b.x - 140} y={b.y - 120} width={280} height={240}>
        <div className="gv-loop gv-loop-low">
          <p className="gv-status" role="status" data-voice-state={v.state}>{status}</p>
          <p className="gv-heard" data-voice-heard="">{heard || "…"}</p>
          <form
            className="gv-type"
            onSubmit={(e) => {
              e.preventDefault();
              if (!typing.trim()) return;
              conversation.type(typing);
              setTyping("");
            }}
          >
            <input
              aria-label="type your answer"
              placeholder="or type here"
              value={typing}
              maxLength={200}
              onChange={(e) => setTyping(e.target.value)}
            />
          </form>
          <div className="gv-taps">
            <details className="gv-privacy">
              <summary>privacy</summary>
              your browser's speech service may process audio on its servers. giver never stores audio; typing stays on this device.
            </details>
            <button type="button" className="gv-tap" onClick={() => conversation.close()}>cancel</button>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

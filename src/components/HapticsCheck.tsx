import { useState } from "react";
import { hapticsReport, haptics, refreshHapticBridge, type HapticLevel } from "@/lib/haptics";

/**
 * HAPTICS DIAGNOSTIC — DEV ONLY.
 *
 * "I can't feel anything" is not a bug report until we know whether the device
 * can answer at all. This says plainly which channel resolved, whether we are
 * trapped in a preview frame, and lets every intensity be fired by hand.
 *
 * It never fakes feedback: no flash, no sound, no animation standing in for a
 * vibration. Silence here means silence in the product.
 */
const LEVELS: HapticLevel[] = [
  "selection",
  "light",
  "medium",
  "heavy",
  "success",
  "warning",
  "error",
  "enter",
  "exit",
];


export function HapticsCheck({ onClose }: { onClose: () => void }) {
  const [, bump] = useState(0);
  const report = hapticsReport();
  const [fired, setFired] = useState<HapticLevel | null>(null);

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-giver-paper px-6 py-8 font-sans text-giver-ink">
      <button
        type="button"
        onClick={onClose}
        className="text-[11px] font-black lowercase tracking-[0.28em] opacity-55"
      >
        close
      </button>

      <h1 className="mt-6 text-[9vw] font-black lowercase leading-[0.9] tracking-[-0.04em]">
        haptics
      </h1>

      <dl className="mt-6 space-y-2 text-[13px] font-medium lowercase">
        <div className="flex justify-between gap-4">
          <dt className="opacity-50">channel</dt>
          <dd className="font-black">{report.route}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="opacity-50">native</dt>
          <dd className="font-black">{haptics.isNative() ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="opacity-50">in a frame</dt>
          <dd className="font-black">{report.frame ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="opacity-50">home screen</dt>
          <dd className="font-black">{report.standalone ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="opacity-50">ios</dt>
          <dd className="font-black">{report.ios ? "yes" : "no"}</dd>
        </div>
      </dl>

      <p className="mt-6 text-[5.5vw] font-black lowercase leading-[1.02] tracking-[-0.03em]">
        {report.verdict}
      </p>

      <div className="mt-8 flex flex-col gap-1">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onPointerUp={() => {
              haptics[level]();
              setFired(level);
            }}
            className="flex items-baseline justify-between border-b border-current/10 py-3 text-left text-[15px] font-black lowercase tracking-[0.16em]"
          >
            <span>{level}</span>
            <span className="text-[11px] opacity-40">
              {fired === level ? "fired" : "tap"}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          refreshHapticBridge();
          bump((n) => n + 1);
        }}
        className="mt-8 text-[11px] font-black lowercase tracking-[0.28em] opacity-55"
      >
        look again
      </button>
    </div>
  );
}

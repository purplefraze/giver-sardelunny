import { useEffect, useRef, useState } from "react";
import { CanonicalPaint } from "./CanonicalPaint";
import { GStage } from "./GStage";
import type { GAnchorKey } from "./g-depth";
import { spatialCameraPose, SPATIAL_CAMERA_MS } from "./spatial-camera";

export type CameraTravel = { from: GAnchorKey | null; to: GAnchorKey | null; key: number; colour: string };

export function SpatialCamera({ travel, onFinish }: { travel: CameraTravel | null; onFinish?: () => void }) {
  const [progress, setProgress] = useState(0);
  const finish = useRef(onFinish); finish.current = onFinish;
  useEffect(() => {
    if (!travel) return;
    setProgress(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish.current?.(); return; }
    let raf = 0; const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SPATIAL_CAMERA_MS);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(step); else finish.current?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [travel?.key]);
  if (!travel) return null;
  const pose = spatialCameraPose(travel.from, travel.to, progress);
  return <div className="spatial-camera" data-spatial-camera="" data-camera-from={travel.from ?? "whole"} data-camera-to={travel.to ?? "whole"} data-camera-progress={progress.toFixed(3)} aria-hidden="true">
    <div className="absolute inset-0" style={{ transform: `translate(${(50-pose.x)*(pose.scale-1)}%, ${(50-pose.y)*(pose.scale-1)}%) scale(${pose.scale})`, transformOrigin: "50% 50%" }}>
      <GStage><CanonicalPaint colour={travel.colour} /></GStage>
    </div>
  </div>;
}
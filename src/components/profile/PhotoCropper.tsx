import { useEffect, useRef, useState } from "react";
import { haptics } from "@/lib/haptics";
import type { PhotoCrop } from "@/data/my-profile";

/**
 * THE PHOTO IS CHOSEN, NOT CROPPED BY ACCIDENT.
 *
 * Giver never squashes a face into a circle. The picture is shown inside the
 * exact circle it will live in, and the person moves and scales it until it is
 * right. What is confirmed here is the ONE crop used everywhere in Giver — the
 * original is kept alongside it so this screen can always be reopened.
 */

const BOX = 288;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function PhotoCropper({
  source,
  initial,
  colour = "var(--giver-me)",
  onCancel,
  onConfirm,
}: {
  /** The untouched picture. */
  source: string;
  initial?: PhotoCrop | null;
  colour?: string;
  onCancel: () => void;
  onConfirm: (cropped: string, crop: PhotoCrop) => void;
}) {
  const [zoom, setZoom] = useState(initial?.zoom ?? 1);
  const [offset, setOffset] = useState({
    x: initial?.x ?? 0,
    y: initial?.y ?? 0,
  });
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  /** Live pointers, so one finger drags and two fingers pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ dist: 0, zoom: 1, x: 0, y: 0, cx: 0, cy: 0 });

  /* THE PICTURE'S OWN SHAPE DECIDES HOW IT FILLS THE CIRCLE. */
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = source;
  }, [source]);

  /* Cover scale: the smaller side always fills the circle. */
  const cover = size ? Math.max(BOX / size.w, BOX / size.h) : 1;
  const drawW = size ? size.w * cover * zoom : BOX;
  const drawH = size ? size.h * cover * zoom : BOX;
  const limitX = Math.max(0, (drawW - BOX) / 2);
  const limitY = Math.max(0, (drawH - BOX) / 2);

  /* MOVEMENT CAN NEVER REVEAL AN EDGE. */
  const settle = (next: { x: number; y: number }) => ({
    x: clamp(next.x, -limitX, limitX),
    y: clamp(next.y, -limitY, limitY),
  });

  useEffect(() => {
    setOffset((o) => settle(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, size]);

  const centreOf = () => {
    const points = [...pointers.current.values()];
    if (!points.length) return { x: 0, y: 0 };
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  };

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = centreOf();
    start.current = {
      dist: spread(),
      zoom,
      x: offset.x,
      y: offset.y,
      cx: c.x,
      cy: c.y,
    };
  };

  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const count = pointers.current.size;
    const c = centreOf();
    if (count >= 2 && start.current.dist > 0) {
      /* PINCH TO ZOOM, anchored on the fingers' own centre. */
      const next = clamp(
        (start.current.zoom * spread()) / start.current.dist,
        MIN_ZOOM,
        MAX_ZOOM,
      );
      setZoom(next);
    }
    setOffset(
      settle({
        x: start.current.x + (c.x - start.current.cx),
        y: start.current.y + (c.y - start.current.cy),
      }),
    );
  };

  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) {
      const c = centreOf();
      start.current = { dist: spread(), zoom, x: offset.x, y: offset.y, cx: c.x, cy: c.y };
    }
  };

  /** WHAT YOU SEE IS WHAT IS SAVED: the circle, redrawn exactly. */
  async function confirm() {
    haptics.success();
    const crop: PhotoCrop = { x: offset.x, y: offset.y, zoom };
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("bad image"));
        img.src = source;
      });
      const out = 480;
      const k = out / BOX;
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) return onConfirm(source, crop);
      const w = img.naturalWidth * Math.max(BOX / img.naturalWidth, BOX / img.naturalHeight) * zoom * k;
      const h = img.naturalHeight * Math.max(BOX / img.naturalWidth, BOX / img.naturalHeight) * zoom * k;
      ctx.drawImage(img, out / 2 - w / 2 + offset.x * k, out / 2 - h / 2 + offset.y * k, w, h);
      onConfirm(canvas.toDataURL("image/jpeg", 0.85), crop);
    } catch {
      onConfirm(source, crop);
    }
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center"
      style={{ background: "var(--giver-paper, #fff)", color: "var(--world-ink)" }}
    >
      <p className="g-heading" style={{ color: colour }}>
        your photo
      </p>
      <p className="g-meta mt-2 opacity-45">drag to move · pinch to zoom</p>

      {/* THE ACTUAL CIRCLE — never a square with a promise. */}
      <div
        ref={stage}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative mt-8 overflow-hidden rounded-full"
        style={{ width: BOX, height: BOX, touchAction: "none", background: "var(--edit-rule)" }}
      >
        <img
          src={source}
          alt="your photo, being positioned"
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 select-none"
          style={{
            width: drawW,
            height: drawH,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            maxWidth: "none",
          }}
        />
      </div>

      {/* A SLIDER FOR THE HANDS THAT WOULD RATHER NOT PINCH. */}
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.01}
        value={zoom}
        aria-label="zoom"
        onChange={(e) => setZoom(Number(e.target.value))}
        className="mt-8 w-56"
        style={{ accentColor: colour }}
      />

      <div className="mt-10 flex items-center gap-8">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onCancel();
          }}
          className="g-heading opacity-45"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          className="text-xl font-black lowercase"
          style={{ color: colour }}
        >
          use this photo
        </button>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";

type Props = {
  index: number;
  onIndexChange: (i: number) => void;
  /** Disable dragging while a panel is open. */
  locked?: boolean;
  children: React.ReactNode[];
};

const SNAP_RATIO = 0.22;

/** Three full-viewport panes with hard snapping. Never rests halfway. */
export function Pager({ index, onIndexChange, locked, children }: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const axis = useRef<"none" | "x" | "y">("none");
  const width = useRef(1);
  const host = useRef<HTMLDivElement | null>(null);

  const count = children.length;

  const end = () => {
    if (!start.current) return;
    const w = width.current || 1;
    let next = index;
    if (dx <= -w * SNAP_RATIO) next = Math.min(count - 1, index + 1);
    else if (dx >= w * SNAP_RATIO) next = Math.max(0, index - 1);
    start.current = null;
    axis.current = "none";
    setDragging(false);
    setDx(0);
    if (next !== index) onIndexChange(next);
  };

  return (
    <div
      ref={host}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: "pan-y", overscrollBehaviorX: "contain" }}
      onPointerDown={(e) => {
        if (locked) return;
        width.current = host.current?.clientWidth ?? 1;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        axis.current = "none";
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const mx = e.clientX - s.x;
        const my = e.clientY - s.y;
        if (axis.current === "none") {
          if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
          axis.current = Math.abs(mx) > Math.abs(my) ? "x" : "y";
          if (axis.current === "x") setDragging(true);
        }
        if (axis.current !== "x") return;
        const atEdge =
          (index === 0 && mx > 0) || (index === count - 1 && mx < 0);
        setDx(atEdge ? mx * 0.25 : mx);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
    >
      <div
        className="flex h-full"
        style={{
          width: `${count * 100}%`,
          transform: `translate3d(calc(${(-index * 100) / count}% + ${dx}px), 0, 0)`,
          transition: dragging ? "none" : "transform 360ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="relative h-full overflow-hidden"
            style={{ width: `${100 / count}%` }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

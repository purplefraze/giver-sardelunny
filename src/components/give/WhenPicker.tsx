import { useEffect, useMemo, useState } from "react";
import { FormG } from "@/components/forms/UnifiedForm";
import { MONTH_NAMES, isoDay, monthGrid, type WhenPick } from "@/data/give-when";
import { haptics } from "@/lib/haptics";

/**
 * WHEN — a clean full-screen month grid (built here; no date-picker
 * dependency). Past days are disabled, the chosen day sits in a green circle,
 * then a start time and an optional "until". No recurring options.
 * `dateOnly` (the expiry line's "pick a date") hides the times.
 */
export function WhenPicker({
  heading,
  initial,
  dateOnly = false,
  onDone,
  onBack,
}: {
  heading: string;
  initial?: WhenPick | null;
  dateOnly?: boolean;
  onDone: (pick: WhenPick) => void;
  onBack: () => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const first = initial?.date ? new Date(`${initial.date}T12:00`) : today;
  const [view, setView] = useState({ y: first.getFullYear(), m: first.getMonth() });
  const [date, setDate] = useState<string | null>(initial?.date ?? null);
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onBack]);

  const cells = monthGrid(view.y, view.m);
  const canPrev = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth());
  const shift = (delta: number) => {
    haptics.selection();
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="uf-question gf-when" data-testid="give-when">
      <div className="uf-screen gf-when-screen">
        <FormG onBack={onBack} />
        <h1 className="uf-heading">{heading}</h1>
        <div className="gf-month">
          <button type="button" className="gf-month-nav" disabled={!canPrev} onClick={() => shift(-1)} aria-label="previous month">
            ‹
          </button>
          <span>
            {MONTH_NAMES[view.m]} {view.y}
          </span>
          <button type="button" className="gf-month-nav" onClick={() => shift(1)} aria-label="next month">
            ›
          </button>
        </div>
        <div className="gf-grid" role="grid" aria-label="choose a day">
          {["m", "t", "w", "t", "f", "s", "s"].map((d, i) => (
            <span key={`h${i}`} className="gf-dow" aria-hidden="true">
              {d}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const iso = isoDay(d);
            const past = d < today;
            const on = iso === date;
            return (
              <button
                key={i}
                type="button"
                className="gf-day"
                aria-pressed={on}
                disabled={past}
                onClick={() => {
                  haptics.selection();
                  setDate(iso);
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        {!dateOnly ? (
          <div className="gf-times">
            <label className="gf-time">
              <span className="uf-label">from</span>
              <input type="time" className="uf-input" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="gf-time">
              <span className="uf-label">until</span>
              <input type="time" className="uf-input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
        ) : null}
        {date ? (
          <button
            type="button"
            className="uf-send gf-done-fixed"
            aria-label="done"
            onClick={() => {
              haptics.light();
              onDone({ date, ...(start && !dateOnly ? { start } : {}), ...(end && start && !dateOnly ? { end } : {}) });
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12.5 10.2 16.5 18 8" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { ageFrom, birthdayLabel } from "@/data/account";
import { toDateOnly, parseDateOnly } from "@/lib/date-only";
import { haptics } from "@/lib/haptics";

/**
 * A BIRTHDAY IS TYPED, NOT HUNTED FOR.
 *
 * Nobody born fifty years ago should have to swipe through six hundred months.
 * The day is printed where it belongs beside the photo; touching it opens three
 * plain numeric places — day, month, year — that move on by themselves and
 * accept a two-digit year kindly. The moment the three make a real day, it is
 * saved. There is no calendar, and no picker to fight with.
 */

const clampInt = (raw: string) => raw.replace(/\D/g, "");

function fullYear(raw: string): number | null {
  if (raw.length === 4) return Number(raw);
  if (raw.length === 2) {
    const n = Number(raw);
    const short = new Date().getFullYear() % 100;
    /* 27 -> 1927 while 05 -> 2005: a birthday is never in the future. */
    return n > short ? 1900 + n : 2000 + n;
  }
  return null;
}

export function BirthdayInput({
  birthday,
  onChange,
}: {
  birthday: string | null | undefined;
  onChange: (day: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const existing = parseDateOnly(birthday);
  const [d, setD] = useState(existing ? String(existing.getDate()) : "");
  const [m, setM] = useState(existing ? String(existing.getMonth() + 1) : "");
  const [y, setY] = useState(existing ? String(existing.getFullYear()) : "");

  const dayRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) dayRef.current?.focus();
  }, [editing]);

  /* The saver is read through a ref: a fresh inline callback from the profile
     must never count as "the birthday changed". */
  const save = useRef(onChange);
  save.current = onChange;

  /* SAVED THE INSTANT IT IS REAL, and only when it is actually different.
     Nothing to confirm, nothing to submit. */
  const stored = existing ? toDateOnly(existing) : "";
  useEffect(() => {
    const year = fullYear(y);
    const day = Number(d);
    const month = Number(m);
    if (!year || !day || !month) return;
    const date = parseDateOnly(
      `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
    if (!date || date > new Date()) return;
    const next = toDateOnly(date);
    if (next === stored) return;
    save.current(next);
  }, [d, m, y, stored]);


  const age = ageFrom(birthday);
  const label = birthdayLabel(birthday);

  if (!editing)
    return (
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          setEditing(true);
        }}
        className="block w-full text-left"
      >
        {/* ONCE A BIRTHDAY IS THERE, THE WORD GOES: the date says it. */}
        {label ? null : (
          <span className="g-meta" style={{ color: "var(--giver-me)" }}>
            birthday
          </span>
        )}
        <span className="g-name block" style={label ? undefined : { opacity: 0.32, marginTop: 4 }}>
          {label ? `${label}${age !== null ? ` · ${age}` : ""}` : "tap to type your birthday"}
        </span>
      </button>
    );

  return (
    <div>
      {/* ONCE A BIRTHDAY EXISTS THE HELPER GOES: the places speak for themselves. */}
      {label ? null : (
        <p className="g-meta" style={{ color: "var(--giver-me)" }}>
          birthday
        </p>
      )}
      <div className="mt-1 flex items-baseline gap-2">
        <Place
          ref={dayRef}
          value={d}
          width="2.1em"
          hint="dd"
          onValue={(v) => {
            setD(v);
            if (v.length === 2) monthRef.current?.focus();
          }}
          max={2}
        />
        <span className="g-name opacity-30">/</span>
        <Place
          ref={monthRef}
          value={m}
          width="2.1em"
          hint="mm"
          onValue={(v) => {
            setM(v);
            if (v.length === 2) yearRef.current?.focus();
          }}
          max={2}
        />
        <span className="g-name opacity-30">/</span>
        <Place
          ref={yearRef}
          value={y}
          width="3.6em"
          hint="yyyy"
          onValue={setY}
          max={4}
          onDone={() => setEditing(false)}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="g-meta ml-1"
          style={{ color: "var(--giver-me)", opacity: 0.9 }}
        >
          done
        </button>
      </div>
      {label ? (
        <p className="g-meta mt-1.5">{`${label}${age !== null ? ` · ${age}` : ""}`}</p>
      ) : null}
    </div>
  );
}

/** One numeric place. A keypad on a phone, and nothing that looks like a form. */
const Place = ({
  ref,
  value,
  onValue,
  max,
  hint,
  width,
  onDone,
}: {
  ref: React.Ref<HTMLInputElement>;
  value: string;
  onValue: (v: string) => void;
  max: number;
  hint: string;
  width: string;
  onDone?: () => void;
}) => (
  <input
    ref={ref}
    value={value}
    inputMode="numeric"
    autoComplete="off"
    placeholder={hint}
    enterKeyHint="done"
    onKeyDown={(e) => {
      if (e.key === "Enter") onDone?.();
    }}
    onChange={(e) => onValue(clampInt(e.target.value).slice(0, max))}
    className="g-name bg-transparent text-center tabular-nums outline-none placeholder:opacity-25"
    style={{ width }}
    aria-label={hint}
  />
);

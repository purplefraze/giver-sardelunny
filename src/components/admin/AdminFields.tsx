/**
 * THE ADMIN FIELD KIT.
 *
 * The developer editors are still Giver: lowercase words, hairlines, no cards,
 * no shadows, no chrome. These are the only inputs the admin surfaces use, so
 * every editor reads and behaves identically however many fields it has.
 */

export function AdminRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="g-rule block pt-3">
      <span className="g-meta">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

const INPUT =
  "w-full border-0 bg-transparent pb-1 text-[16px] font-black lowercase tracking-[-0.01em] outline-none placeholder:opacity-25";

export function AdminText({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <AdminRow label={label}>
      <input
        value={value}
        placeholder={placeholder ?? "—"}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
        style={{ color: "var(--giver-ink)" }}
      />
    </AdminRow>
  );
}

export function AdminArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <AdminRow label={label}>
      <textarea
        value={value}
        rows={4}
        placeholder="—"
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} resize-none leading-snug`}
        style={{ color: "var(--giver-ink)" }}
      />
    </AdminRow>
  );
}

export function AdminNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <AdminRow label={label}>
      <input
        value={value === undefined ? "" : String(value)}
        inputMode="decimal"
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className={`${INPUT} tabular-nums`}
        style={{ color: "var(--giver-ink)" }}
      />
    </AdminRow>
  );
}

/** WORDS, NEVER A DROPDOWN. Tap the one that is true; tap again to clear it. */
export function AdminChoice({
  label,
  value,
  options,
  accent,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: readonly string[];
  accent: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="g-rule pt-3">
      <span className="g-meta">{label}</span>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[13px] font-black lowercase tracking-[0.14em]">
        {options.map((option) => {
          const on = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(on ? undefined : option)}
              className={on ? "opacity-100" : "opacity-35"}
              style={on ? { color: accent } : { color: "var(--giver-ink)" }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** MANY OF THESE CAN BE TRUE AT ONCE — days of the week, and nothing else. */
export function AdminMulti({
  label,
  values,
  options,
  accent,
  onChange,
}: {
  label: string;
  values: string[];
  options: readonly string[];
  accent: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="g-rule pt-3">
      <span className="g-meta">{label}</span>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[13px] font-black lowercase tracking-[0.14em]">
        {options.map((option) => {
          const on = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onChange(
                  on
                    ? values.filter((v) => v !== option)
                    : options.filter((o) => o === option || values.includes(o)),
                )
              }
              className={on ? "opacity-100" : "opacity-35"}
              style={on ? { color: accent } : { color: "var(--giver-ink)" }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

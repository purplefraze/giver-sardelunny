import { useEffect, useRef } from "react";
import { GMark } from "@/components/living-g/GMark";
import { haptics } from "@/lib/haptics";

/**
 * ONE FORM, SIX SEATS (/workspace/giver-forms-unified). Presentation only —
 * every form keeps its own state, saving and validation; these pieces are the
 * one skeleton they all wear:
 *
 *   the G top left in the seat colour (tapping it is the way back)
 *   one light lowercase heading in the seat colour
 *   two lines only: the thing, then when — tiny grey labels, hairlines
 *   2–3 quiet tags under line 1; the last one asks
 *   a tag that asks opens ONE question, full screen, 3–4 big stacked answers
 *   one solid seat-colour send circle, bottom right, heavier white arrow
 *
 * Colours come from the form tokens (--form-heading = seat colour or its
 * deeper text tint on the pale seats; --form-seat = the true seat colour).
 */

export function SendArrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h13.5M13 6.5 18.5 12 13 17.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The small G, top left — the seat's own colour; a tap goes back. */
export function FormG({
  onBack,
  label = "back",
  colour = "var(--form-seat)",
  height = 32,
}: {
  onBack: () => void;
  label?: string;
  /** The give surface keeps its G My G blue (#1E7BFF), whatever the seat. */
  colour?: string;
  height?: number;
}) {
  return (
    <button
      type="button"
      className="uf-g"
      aria-label={label}
      onClick={() => {
        haptics.exit();
        onBack();
      }}
    >
      <GMark colour={colour} height={height} />
    </button>
  );
}

export function FormSend({
  label,
  onSend,
  disabled = false,
}: {
  label: string;
  onSend: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="uf-send"
      aria-label={label}
      disabled={disabled}
      onClick={onSend}
    >
      <SendArrow />
    </button>
  );
}

export type FormTag = {
  key: string;
  text: string;
  /** Present only on the tag that asks: opens that question. */
  onAsk?: () => void;
};

export function FormTags({ tags }: { tags: FormTag[] }) {
  if (!tags.length) return <div className="uf-tags" aria-hidden="true" />;
  return (
    <div className="uf-tags">
      {tags.map((t) =>
        t.onAsk ? (
          <button
            key={t.key}
            type="button"
            className="uf-tag"
            onClick={() => {
              haptics.selection();
              t.onAsk?.();
            }}
          >
            {t.text}
          </button>
        ) : (
          <span key={t.key} className="uf-tag">
            {t.text}
          </span>
        ),
      )}
    </div>
  );
}

/** ONE LINE: tiny grey label over one hairline field. */
export function FormLine({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoFocus = false,
  onEnter,
  tags,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
  autoFocus?: boolean;
  onEnter?: () => void;
  tags?: FormTag[];
}) {
  return (
    <label className={`uf-field block ${tags ? "uf-field--tags" : ""}`}>
      <span className="uf-label">{label}</span>
      <input
        className="uf-input"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        placeholder={placeholder}
        aria-label={label}
      />
      {tags ? <FormTags tags={tags} /> : null}
    </label>
  );
}

/**
 * A LINE YOU TAP, NOT TYPE — same label, same underline, same type as
 * FormLine, but the value is a button that opens a picker (the calendar for
 * "when"). Grey placeholder until answered.
 */
export function FormPickLine({
  label,
  value,
  placeholder,
  onPick,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPick: () => void;
}) {
  return (
    <div className="uf-field block">
      <span className="uf-label">{label}</span>
      <button
        type="button"
        className={`uf-input uf-pick ${value ? "" : "uf-pick--empty"}`}
        onClick={onPick}
        aria-label={`${label}: ${value || placeholder}`}
      >
        {value || placeholder}
      </button>
    </div>
  );
}

/** One question, full screen: the heading asks, the answers are big words. */
export function FormQuestion({
  heading,
  options,
  selected,
  onPick,
  onBack,
}: {
  heading: string;
  options: readonly string[];
  selected: string | undefined;
  onPick: (option: string) => void;
  onBack: () => void;
}) {
  useEscape(onBack);
  return (
    <div className="uf-question">
      <div className="uf-screen">
        <FormG onBack={onBack} />
        <h1 className="uf-heading">{heading}</h1>
        <div className="uf-options" role="radiogroup" aria-label={heading}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={selected === o}
              className="uf-option"
              onClick={() => {
                haptics.selection();
                onPick(o);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Fund only: the one money question — a single big amount and send. */
export function FormAmount({
  heading,
  value,
  onChange,
  onDone,
  onBack,
  say,
}: {
  heading: string;
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
  onBack: () => void;
  say?: string | null;
}) {
  useEscape(onBack);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="uf-question">
      <div className="uf-screen">
        <FormG onBack={onBack} />
        <h1 className="uf-heading">{heading}</h1>
        <input
          ref={ref}
          className="uf-amount"
          inputMode="decimal"
          value={value ? `$${value.replace(/^\$/, "")}` : ""}
          onChange={(e) => onChange(e.target.value.replace(/^\$/, "").slice(0, 12))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDone();
          }}
          placeholder="$0"
          aria-label={heading}
        />
        {say ? <p className="uf-say mt-6">{say}</p> : null}
        <FormSend label="done" onSend={onDone} />
      </div>
    </div>
  );
}

function useEscape(onBack: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onBack]);
}

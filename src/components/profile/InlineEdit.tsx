import { useEffect, useRef, useState } from "react";
import { haptics } from "@/lib/haptics";

/**
 * TAP THE THING ITSELF.
 *
 * There is no form in Giver. A piece of a profile is printed where it belongs,
 * and touching it turns THAT PLACE into its own input. Leaving it leaves the
 * value exactly where it was printed. No boxes, no field lines, no second copy
 * of the same question lower down the page.
 */
export function InlineEdit({
  label,
  value,
  onChange,
  placeholder,
  limit = 80,
  multiline = false,
  prefix,
  register = "name",
  note,
  autoEdit = false,
  onEditingChange,
}: {
  /** The one quiet word that says what this is. Never repeated elsewhere. */
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  limit?: number;
  multiline?: boolean;
  prefix?: string;
  /** How loudly this piece of the person speaks. */
  register?: "name" | "lede" | "display-sm";
  note?: string;
  autoEdit?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const field = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const node = field.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    try {
      node.setSelectionRange(end, end);
    } catch {
      /* number-ish inputs refuse selection; focus is enough */
    }
  }, [editing]);

  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  const typeClass =
    register === "display-sm" ? "g-display-sm" : register === "lede" ? "g-lede" : "g-name";

  const commonProps = {
    value,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value.slice(0, limit)),
    onBlur: () => setEditing(false),
    className: `w-full resize-none bg-transparent outline-none placeholder:opacity-30 ${typeClass}`,
  };

  return (
    <div>
      <p className="g-meta" style={{ color: "var(--giver-me)" }}>
        {label}
      </p>

      {editing ? (
        <div className="mt-1">
          {multiline ? (
            <textarea
              {...commonProps}
              ref={field as React.Ref<HTMLTextAreaElement>}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <input
              {...commonProps}
              ref={field as React.Ref<HTMLInputElement>}
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setEditing(false);
              }}
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setEditing(true);
          }}
          className={`mt-1 block w-full text-left ${typeClass} transition-opacity active:opacity-60`}
          style={value ? undefined : { opacity: 0.32 }}
        >
          {value ? `${prefix ?? ""}${value}` : placeholder}
        </button>
      )}

      {note ? <p className="g-meta mt-1.5">{note}</p> : null}
    </div>
  );
}

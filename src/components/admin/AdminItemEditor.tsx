import { useState } from "react";
import {
  CADENCE_OPTIONS,
  DAY_NAMES,
  DURATION_OPTIONS,
  ITEM_TYPES,
  TIME_OPTIONS,
  WHERE_OPTIONS,
  itemLine,
  itemsStore,
  tradeText,
  splitTrade,
  type Item,
  type ItemDetails,
  type ItemStatus,
  type ItemType,
  ACTIVITY_FILL,
} from "@/data/items";
import { useItems } from "@/hooks/use-items";
import {
  AdminArea,
  AdminChoice,
  AdminMulti,
  AdminNumber,
  AdminText,
} from "@/components/admin/AdminFields";
import { AdminShell } from "@/components/admin/AdminShell";
import { itemKindWord } from "@/components/profile/ItemFacts";

/**
 * EDIT ONE ACTIVITY — a give, a wish, a trade, a lend or a borrow, whoever owns
 * it, sample or real. It writes to the SAME single item record every screen in
 * the app already reads, so a corrected duration or location is instantly true
 * in the feed, on the detail page, on the owner's profile and in search.
 */

const STATUSES: ItemStatus[] = ["active", "paused", "completed", "archived"];
const SIDES = ["borrow", "lend"] as const;

/** Places a real thing can be. The admin may also just type its own. */
const WHERE_ALL = ["nearby pickup", "in person", ...WHERE_OPTIONS];

export function AdminItemEditor({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const state = useItems();
  const item = state.items.find((i) => i.id === itemId);
  /** A new extra key being named, before it has a value. */
  const [newExtra, setNewExtra] = useState("");

  if (!item) {
    return (
      <AdminShell title="this one is gone" kind="activity" edited={false} onClose={onClose}>
        <p className="g-body opacity-55">the record no longer exists.</p>
      </AdminShell>
    );
  }

  const accent = ACTIVITY_FILL[item.type];
  const sides = splitTrade(item.text);
  const offer = item.offer ?? sides.offer;
  const want = item.want ?? sides.want;
  const details: ItemDetails = item.details ?? {};

  const set = (fields: Partial<Omit<Item, "id" | "ownerId">>) =>
    itemsStore.adminPatch(item.id, fields);

  const setDetails = (patch: Partial<ItemDetails>) =>
    set({ details: { ...details, ...patch } });

  const setExtra = (key: string, value: string) => {
    const extras = { ...(details.extras ?? {}) };
    if (value.trim()) extras[key] = value;
    else delete extras[key];
    setDetails({ extras });
  };

  return (
    <AdminShell
      title={itemLine(item)}
      kind={itemKindWord(item)}
      edited={Boolean(item.edited)}
      onClose={onClose}
    >
      {/* WHAT IT IS. A trade always keeps both of its sides. */}
      {item.type === "trade" ? (
        <>
          <AdminText
            label="offering"
            value={offer}
            onChange={(value) =>
              set({ offer: value, want, text: tradeText(value, want) })
            }
          />
          <AdminText
            label="wants back"
            value={want}
            onChange={(value) =>
              set({ offer, want: value, text: tradeText(offer, value) })
            }
          />
        </>
      ) : (
        <AdminText label="title" value={item.text} onChange={(value) => set({ text: value })} />
      )}

      <AdminArea label="notes" value={item.note ?? ""} onChange={(value) => set({ note: value })} />

      <AdminChoice
        label="type"
        value={item.type}
        options={ITEM_TYPES}
        accent={accent}
        onChange={(value) => value && set({ type: value as ItemType })}
      />

      {item.type === "borrow" ? (
        <AdminChoice
          label="side"
          value={item.side ?? "borrow"}
          options={SIDES}
          accent={accent}
          onChange={(value) => value && set({ side: value as "borrow" | "lend" })}
        />
      ) : null}

      {/* WHEN, WHERE, HOW LONG — the facts people decide on. */}
      <AdminMulti
        label="days"
        values={details.days ?? []}
        options={DAY_NAMES}
        accent={accent}
        onChange={(values) => setDetails({ days: values })}
      />
      <AdminText label="date" value={details.date ?? ""} onChange={(v) => setDetails({ date: v })} />
      <AdminText
        label="available until"
        value={details.until ?? ""}
        onChange={(v) => setDetails({ until: v })}
      />
      <AdminText label="time" value={details.time ?? ""} onChange={(v) => setDetails({ time: v })} />
      <AdminChoice
        label="time of day"
        value={details.time}
        options={TIME_OPTIONS}
        accent={accent}
        onChange={(v) => setDetails({ time: v })}
      />
      <AdminText
        label="how long"
        value={details.duration ?? ""}
        onChange={(v) => setDetails({ duration: v })}
      />
      <AdminChoice
        label="duration"
        value={details.duration}
        options={DURATION_OPTIONS}
        accent={accent}
        onChange={(v) => setDetails({ duration: v })}
      />
      <AdminText
        label="where"
        value={details.where ?? ""}
        onChange={(v) => setDetails({ where: v })}
      />
      <AdminChoice
        label="where (common)"
        value={details.where}
        options={WHERE_ALL}
        accent={accent}
        onChange={(v) => setDetails({ where: v })}
      />
      <AdminChoice
        label="how often"
        value={details.cadence}
        options={CADENCE_OPTIONS}
        accent={accent}
        onChange={(v) => setDetails({ cadence: v })}
      />

      {/* CATEGORY-SPECIFIC ANSWERS — subject, level, from, to, diet, anything. */}
      <p className="g-heading mt-6">category details</p>
      {Object.entries(details.extras ?? {}).map(([key, value]) => (
        <AdminText
          key={key}
          label={key}
          value={value}
          onChange={(next) => setExtra(key, next)}
        />
      ))}
      <div className="g-rule flex items-end gap-4 pt-3">
        <label className="min-w-0 flex-1">
          <span className="g-meta">add a detail</span>
          <input
            value={newExtra}
            placeholder="subject, level, from…"
            onChange={(e) => setNewExtra(e.target.value)}
            className="w-full border-0 bg-transparent pb-1 text-[16px] font-black lowercase outline-none placeholder:opacity-25"
            style={{ color: "var(--giver-ink)" }}
          />
        </label>
        <button
          type="button"
          disabled={!newExtra.trim()}
          onClick={() => {
            setExtra(newExtra.trim(), "—");
            setNewExtra("");
          }}
          className="pb-1 text-[12px] font-black lowercase tracking-[0.26em] disabled:opacity-25"
          style={{ color: "var(--giver-action)" }}
        >
          add
        </button>
      </div>

      {/* WHERE IT SITS IN THE WORLD. */}
      <p className="g-heading mt-6">availability</p>
      <AdminChoice
        label="status"
        value={item.status}
        options={STATUSES}
        accent={accent}
        onChange={(value) => value && set({ status: value as ItemStatus })}
      />
      <AdminChoice
        label="discoverable"
        value={item.published ? "published" : "hidden"}
        options={["published", "hidden"]}
        accent={accent}
        onChange={(value) => set({ published: value !== "hidden" })}
      />
      <AdminNumber
        label="distance (km)"
        value={item.distanceKm}
        onChange={(value) => set({ distanceKm: value ?? 0 })}
      />
      <AdminNumber
        label="priority"
        value={item.priority}
        onChange={(value) => set({ priority: value ?? 0 })}
      />
    </AdminShell>
  );
}

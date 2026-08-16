import { useState } from "react";
import { GStage } from "@/components/living-g/GStage";
import { G_PRESENCE, LivingG } from "@/components/living-g/LivingG";
import { profileLoop, clampField } from "@/components/living-g/profile-loop";
import { useMyProfile } from "@/hooks/use-my-profile";
import {
  CATEGORIES,
  CATEGORY_PLURAL,
  MAX_PER_CATEGORY,
  SETUP_PER_CATEGORY,
  myProfileStore,
  primaryAsk,
  primaryGive,
  type Category,
} from "@/data/my-profile";
import { buzz } from "@/lib/haptics";

/**
 * THE PROFILE BUILDER — one personal canvas, not paperwork.
 *
 * It edits the REAL profile: every keystroke, photo, add, reorder and delete is
 * committed to the single source of truth immediately (myProfileStore). There is
 * no save button, and no temporary onboarding copy of the profile.
 *
 * The page opens with the person's OWN Living G, in RED, so the very first thing
 * they understand is: this is my G. Below it, the same canvas continues.
 */

const CATEGORY_ASK: Record<Category, string> = {
  wish: "what do you wish for?",
  give: "what can you give?",
  trade: "what would you trade?",
  borrow: "what would you borrow?",
};

const ASK_WORD: Record<Category, string> = {
  wish: "wish",
  give: "give",
  trade: "trade",
  borrow: "borrow",
};

export function ProfileBuilder({
  onDone,
  /** First run encourages three per category; later management allows five. */
  firstTime = true,
}: {
  onDone: () => void;
  firstTime?: boolean;
}) {
  const me = useMyProfile();
  const limit = firstTime ? SETUP_PER_CATEGORY : MAX_PER_CATEGORY;

  const pickPhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      // Stored as a data URL so the photo survives a reload.
      reader.onload = () => myProfileStore.patch({ photo: String(reader.result) });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const ask = primaryAsk(me);
  const give = primaryGive(me);

  return (
    <div
      data-world="profile"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      {/* ---- MY LIVING G — live, and always showing my priority items. ---- */}
      <section className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-7 z-10 flex justify-center px-8">
          <span className="text-[13px] font-black lowercase tracking-[0.34em] opacity-70">
            this is my g
          </span>
        </div>

        <GStage>
          <LivingG
            className={G_PRESENCE}
            showLabels={false}
            regions={{
              top: {
                label: "",
                onPress: () => {
                  buzz();
                  pickPhoto();
                },
                render: (a) =>
                  me.photo ? (
                    <>
                      <defs>
                        <clipPath id="builder-photo">
                          <circle cx={a.x} cy={a.y} r={40} />
                        </clipPath>
                      </defs>
                      <image
                        href={me.photo}
                        x={a.x - 40}
                        y={a.y - 40}
                        width={80}
                        height={80}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="url(#builder-photo)"
                      />
                    </>
                  ) : (
                    <text
                      x={a.x}
                      y={a.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--world-text)"
                      className="font-black"
                      style={{ fontSize: 44 }}
                    >
                      +
                    </text>
                  ),
              },
              middle: {
                label: "",
                onPress: () => buzz(),
                render: (anchor) =>
                  profileLoop({
                    anchor,
                    region: "middle",
                    blocks: ask
                      ? [
                          { text: ASK_WORD[ask.category], role: "secondary" },
                          { text: clampField(ask.text), role: "primary" },
                        ]
                      : [{ text: "add a wish", role: "primary" }],
                  }),
              },
              bottom: {
                label: "",
                onPress: () => buzz(),
                render: (anchor) =>
                  profileLoop({
                    anchor,
                    region: "bottom",
                    blocks: give
                      ? [
                          { text: "give", role: "secondary" },
                          { text: clampField(give), role: "primary" },
                        ]
                      : [{ text: "add a give", role: "primary" }],
                  }),
              },
            }}
          />
        </GStage>
      </section>

      {/* ---- THE CANVAS ---- */}
      <div className="px-7 pb-16">
        <button
          type="button"
          onClick={() => {
            buzz();
            pickPhoto();
          }}
          className="flex items-center gap-5 text-left transition-transform active:scale-[0.98]"
        >
          {me.photo ? (
            <img
              src={me.photo}
              alt="my profile photo"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-24 w-24 items-center justify-center rounded-full text-5xl font-black"
              style={{ border: "2px solid currentColor", opacity: 0.55 }}
            >
              +
            </span>
          )}
          <span className="text-2xl font-black lowercase tracking-[-0.02em]">
            {me.photo ? "change photo" : "add a photo"}
          </span>
        </button>

        <h1 className="mt-14 text-[12vw] font-black lowercase leading-[0.86] tracking-[-0.05em]">
          let's give 'em
          <br />
          something
          <br />
          to talk about
        </h1>

        <Field
          label="about me"
          value={me.aboutMe}
          onChange={(v) => myProfileStore.patch({ aboutMe: v })}
          placeholder="a couple of honest lines"
          multiline
        />

        <div className="mt-10 space-y-8">
          <Field
            label="by day"
            value={me.byDay}
            onChange={(v) => myProfileStore.patch({ byDay: v })}
          />
          <Field
            label="by night"
            value={me.byNight}
            onChange={(v) => myProfileStore.patch({ byNight: v })}
          />
          <Field
            label="by weekend"
            value={me.weekend}
            onChange={(v) => myProfileStore.patch({ weekend: v })}
          />
        </div>

        {CATEGORIES.map((category) => (
          <CategoryBlock
            key={category}
            category={category}
            items={me.items[category]}
            limit={limit}
          />
        ))}

        {/* Nothing to submit — it is already saved. This just opens the door. */}
        <button
          type="button"
          onClick={() => {
            buzz();
            myProfileStore.patch({ built: true });
            onDone();
          }}
          className="mt-20 text-left text-[13vw] font-black lowercase leading-[0.85] tracking-[-0.055em] transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-participation)" }}
        >
          let's meet
          <br />
          the community
        </button>
        <p className="mt-6 text-[11px] font-black lowercase tracking-[0.3em] opacity-40">
          everything saves as you go
        </p>
      </div>
    </div>
  );
}

/** One short-form field. Auto-saves on every keystroke. */
function Field({
  label,
  value,
  onChange,
  placeholder = "—",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className={multiline ? "mt-10 flex flex-col gap-2" : "flex flex-col gap-2"}>
      <span className="text-[11px] font-black lowercase tracking-[0.3em] opacity-50">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 240))}
          placeholder={placeholder}
          rows={3}
          className="resize-none border-b border-current/25 bg-transparent pb-2 text-xl font-medium lowercase leading-snug outline-none placeholder:opacity-30"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 26))}
          placeholder={placeholder}
          className="border-b border-current/25 bg-transparent pb-2 text-[7vw] font-black lowercase leading-none tracking-[-0.04em] outline-none placeholder:opacity-30"
        />
      )}
    </label>
  );
}

/** My items in one category: ordered, editable, reorderable, auto-saved. */
function CategoryBlock({
  category,
  items,
  limit,
}: {
  category: Category;
  items: string[];
  limit: number;
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const colour = `var(--me-${category})`;
  const full = items.length >= limit;

  const add = () => {
    if (!draft.trim()) return;
    myProfileStore.addItem(category, draft);
    setDraft("");
    setAdding(false);
    buzz();
  };

  return (
    <section className="mt-16">
      <h2
        className="text-[9vw] font-black lowercase leading-none tracking-[-0.05em]"
        style={{ color: colour }}
      >
        my {CATEGORY_PLURAL[category]}
      </h2>

      <ul className="mt-5 space-y-4">
        {items.map((item, i) => (
          <li key={`${category}-${i}`} className="flex items-center gap-3">
            <span
              className="w-6 shrink-0 text-[11px] font-black tracking-[0.2em]"
              style={{ color: colour, opacity: i === 0 ? 1 : 0.45 }}
            >
              {i + 1}
            </span>
            <input
              value={item}
              onChange={(e) =>
                myProfileStore.editItem(category, i, e.target.value.slice(0, 40))
              }
              className="min-w-0 flex-1 border-b border-current/20 bg-transparent pb-1 text-xl font-medium lowercase outline-none"
            />
            <button
              type="button"
              aria-label={`move ${item} up`}
              onClick={() => {
                buzz();
                myProfileStore.moveItem(category, i, -1);
              }}
              disabled={i === 0}
              className="px-2 text-xl font-black disabled:opacity-20"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`move ${item} down`}
              onClick={() => {
                buzz();
                myProfileStore.moveItem(category, i, 1);
              }}
              disabled={i === items.length - 1}
              className="px-2 text-xl font-black disabled:opacity-20"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`remove ${item}`}
              onClick={() => {
                buzz();
                myProfileStore.removeItem(category, i);
              }}
              className="px-2 text-xl font-black opacity-45"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {items.length ? (
        <p className="mt-3 text-[11px] font-black lowercase tracking-[0.28em] opacity-40">
          #1 is your priority
        </p>
      ) : null}

      {full ? null : adding || items.length === 0 ? (
        <div className="mt-5 flex items-end gap-4">
          <input
            autoFocus={adding}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 40))}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder={CATEGORY_ASK[category]}
            className="min-w-0 flex-1 border-b border-current/25 bg-transparent pb-1 text-xl font-medium lowercase outline-none placeholder:opacity-35"
          />
          <button
            type="button"
            onClick={add}
            className="text-xl font-black lowercase"
            style={{ color: colour }}
          >
            add
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-5 text-xl font-black lowercase tracking-[-0.02em]"
          style={{ color: colour }}
        >
          + add another
        </button>
      )}
    </section>
  );
}

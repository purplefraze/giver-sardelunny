import { useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { useMyProfile } from "@/hooks/use-my-profile";
import { myProfileStore } from "@/data/my-profile";
import { buzz } from "@/lib/haptics";
import { haptics } from "@/lib/haptics";

/**
 * DESTINATION SCREEN — the deeper profile information behind the TOP LOOP.
 * You arrive here from the Living G, edit, and leave again.
 *
 * ONE COMPACT PAGE, NOT A LONG FORM. Every keystroke commits to the single
 * source of truth immediately, so there is no save step and no dead space
 * between sections: photo, about, birthday, gender, by day, by night, anything
 * else. Nothing more.
 *
 * THE PRIVATE UTILITIES LIVE ON THE PHOTO. Sparks, sparkles and messages used
 * to be three large counters lengthening the page; they are now one miniature
 * toggle attached to the photo circle — a quiet echo of the Living G's own
 * control. Sparks are PURPLE, sparkles PINK, messages RED.
 */

const UTILITIES = ["sparks", "sparkles", "messages"] as const;
type Utility = (typeof UTILITIES)[number];

const UTILITY_COLOUR: Record<Utility, string> = {
  sparks: "var(--giver-sparks)",
  sparkles: "var(--giver-sparkles)",
  messages: "var(--giver-messages)",
};

const GENDERS = ["male", "female", "prefer not to say"] as const;

export function AboutForm({
  onDone,
  onHelp,
  onMessages,
  unread = 0,
  firstSetup = false,
}: {
  onDone: () => void;
  /** HELP IS ALWAYS AVAILABLE — quietly, from inside my own profile. */
  onHelp?: () => void;
  /** MY INBOX LIVES HERE, beside my balances — private account information. */
  onMessages?: () => void;
  unread?: number;
  /** A new person's setup is identity only; account furniture comes afterwards. */
  firstSetup?: boolean;
}) {
  const me = useMyProfile();
  const [utility, setUtility] = useState<Utility>("sparks");

  const value: Record<Utility, string> = {
    sparks: String(me.sparks),
    sparkles: String(me.sparkles),
    messages: unread ? String(unread) : "—",
  };

  const cycleUtility = () => {
    haptics.selection();
    setUtility(UTILITIES[(UTILITIES.indexOf(utility) + 1) % UTILITIES.length]);
  };

  const pickPhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        /* Shrunk before saving so the photo always fits alongside the words. */
        const photo = await shrink(String(reader.result));
        myProfileStore.patch({ photo });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const save = () => {
    buzz();
    myProfileStore.patch({ built: true });
    onDone();
  };

  return (
    <div
      data-world="profile"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={save} label="back to my g" />

      <div className="px-7 pb-14 pt-16">
        {/* PHOTO + ITS ONE TINY UTILITY TOGGLE. */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              buzz();
              pickPhoto();
            }}
            className="relative shrink-0 transition-transform active:scale-[0.98]"
            aria-label={me.photo ? "change photo" : "add a photo"}
          >
            {me.photo ? (
              <img
                src={me.photo}
                alt="my profile photo"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              /* MATHEMATICALLY CENTRED PLUS: a flex box with no line-height of
                 its own, so the glyph sits on the exact centre of the circle. */
              <span
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ border: "2px solid var(--giver-me)" }}
              >
                <span
                  className="block text-[2rem] font-black leading-none"
                  style={{ color: "var(--giver-me)", transform: "translateY(-0.03em)" }}
                >
                  +
                </span>
              </span>
            )}
          </button>

          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                buzz();
                pickPhoto();
              }}
              className="block text-left text-lg font-black lowercase leading-none tracking-[-0.02em]"
              style={{ color: "var(--giver-me)" }}
            >
              {me.photo ? "change photo" : "add a photo"}
            </button>

            {!firstSetup ? (
              <button
                type="button"
                onClick={() => {
                  if (utility === "messages" && onMessages) {
                    buzz();
                    onMessages();
                    return;
                  }
                  cycleUtility();
                }}
                onDoubleClick={cycleUtility}
                className="mt-2.5 flex items-center gap-2 text-left"
                aria-label={`${utility}: ${value[utility]} — tap to cycle`}
              >
                {/* THE MINIATURE TOGGLE: three seats, one tiny travelling dot. */}
                <span className="flex items-center gap-1">
                  {UTILITIES.map((u) => (
                    <span
                      key={u}
                      className="block rounded-full"
                      style={{
                        width: u === utility ? 7 : 4,
                        height: u === utility ? 7 : 4,
                        background: UTILITY_COLOUR[u],
                        opacity: u === utility ? 1 : 0.28,
                        transition: "all 180ms ease-out",
                      }}
                    />
                  ))}
                </span>
                <span
                  className="text-2xl font-black leading-none tracking-[-0.04em] tabular-nums"
                  style={{ color: UTILITY_COLOUR[utility] }}
                >
                  {value[utility]}
                </span>
                <span className="g-meta opacity-45">{utility}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-7 space-y-5">
          <Field
            label="about me"
            value={me.aboutMe}
            onChange={(v) => myProfileStore.patch({ aboutMe: v })}
            placeholder="in ten words or less"
            limit={80}
          />

          {/* BIRTHDAY — the phone's own date picker, kept small. */}
          <label className="flex items-baseline justify-between gap-4">
            <span className="g-meta" style={{ color: "var(--giver-me)", opacity: 0.75 }}>
              birthday
            </span>
            <input
              type="date"
              value={me.birthday ?? ""}
              onChange={(e) => myProfileStore.patch({ birthday: e.target.value })}
              className="flex-1 border-b bg-transparent pb-1 text-right text-base font-black lowercase outline-none"
              style={{ borderColor: "color-mix(in oklab, var(--giver-me) 35%, transparent)" }}
            />
          </label>

          {/* GENDER — three words, one selected. Never a dropdown. */}
          <div className="flex flex-col gap-1.5">
            <span className="g-meta" style={{ color: "var(--giver-me)", opacity: 0.75 }}>
              gender
            </span>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    myProfileStore.patch({ gender: g });
                  }}
                  className="text-[13px] font-black lowercase tracking-[0.14em] transition-opacity"
                  style={{
                    color: me.gender === g ? "var(--giver-me)" : "var(--world-ink)",
                    opacity: me.gender === g ? 1 : 0.4,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

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
            label="anything else we should know? (optional)"
            value={me.weekend}
            onChange={(v) => myProfileStore.patch({ weekend: v })}
            limit={80}
          />
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-8 text-left text-2xl font-black lowercase leading-none tracking-[-0.03em] transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-me)" }}
        >
          ← back to my g
        </button>
        <p className="mt-2.5 g-meta opacity-40">everything saves as you go</p>

        {/* LEARN HOW, WHENEVER YOU LIKE. Never a nag, always here. */}
        {onHelp && !firstSetup ? (
          <button
            type="button"
            onClick={() => {
              buzz();
              onHelp();
            }}
            className="mt-6 text-left g-meta opacity-60"
          >
            learn how giver works
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A photo must never cost the words. We redraw it small before it is stored,
 * so the whole profile keeps fitting in persistent storage.
 */
async function shrink(dataUrl: string, max = 512): Promise<string> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("bad image"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return dataUrl;
  }
}

/** One field: label left, answer right. Compact by construction. */
function Field({
  label,
  value,
  onChange,
  placeholder = "—",
  limit = 26,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  limit?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="g-meta" style={{ color: "var(--giver-me)", opacity: 0.75 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, limit))}
        placeholder={placeholder}
        className="w-full border-b bg-transparent pb-1 text-xl font-black lowercase leading-tight tracking-[-0.03em] outline-none placeholder:opacity-30"
        style={{ borderColor: "color-mix(in oklab, var(--giver-me) 35%, transparent)" }}
      />
    </label>
  );
}

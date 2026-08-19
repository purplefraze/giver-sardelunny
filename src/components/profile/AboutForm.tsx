import { BackArrow } from "@/components/BackArrow";
import { useMyProfile } from "@/hooks/use-my-profile";
import { myProfileStore } from "@/data/my-profile";
import { buzz } from "@/lib/haptics";

/**
 * DESTINATION SCREEN — the deeper profile information behind the TOP LOOP.
 * You arrive here from the Living G, edit, and leave again. Nothing about this
 * screen sits underneath the G: it replaces it for as long as you are editing.
 * Every keystroke commits to the single source of truth immediately.
 */
export function AboutForm({
  onDone,
  onHelp,
  onMessages,
  unread = 0,
}: {
  onDone: () => void;
  /** HELP IS ALWAYS AVAILABLE — quietly, from inside my own profile. */
  onHelp?: () => void;
  /** MY INBOX LIVES HERE, beside my balances — private account information. */
  onMessages?: () => void;
  unread?: number;
}) {
  const me = useMyProfile();


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

      <div className="px-7 pb-20 pt-20">
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

        {/*
          THE PERMANENT HOME OF MY BALANCES. Sparks and sparkles live here and
          nowhere else — they are mine, private, and never on display on the
          Living G itself. Nobody else ever sees these numbers.
        */}
        <dl className="mt-12 flex flex-wrap items-start gap-x-10 gap-y-8">
          <div>
            <dd
              className="text-6xl font-black leading-none tracking-[-0.05em]"
              style={{ color: "var(--giver-generosity)" }}
            >
              {me.sparks}
            </dd>
            <dt className="mt-2 text-[11px] font-black lowercase tracking-[0.3em] opacity-50">
              sparks
            </dt>
          </div>
          <div>
            <dd
              className="text-6xl font-black leading-none tracking-[-0.05em]"
              style={{ color: "var(--giver-participation)" }}
            >
              {me.sparkles}
            </dd>
            <dt className="mt-2 text-[11px] font-black lowercase tracking-[0.3em] opacity-50">
              sparkles
            </dt>
          </div>
          {/*
            MY MESSAGES SIT WITH MY BALANCES: one compact, private account
            area. The count appears ONLY when something is unread — never a
            zero. Nobody else ever sees any of these three numbers.
          */}
          <button
            type="button"
            onClick={() => {
              buzz();
              onMessages?.();
            }}
            className="text-left transition-transform active:scale-[0.98]"
          >
            {unread ? (
              <dd
                className="text-6xl font-black leading-none tracking-[-0.05em]"
                style={{ color: "var(--giver-connection)" }}
              >
                {unread}
              </dd>
            ) : null}
            <dt
              className="text-[11px] font-black lowercase tracking-[0.3em]"
              style={{ marginTop: unread ? "0.5rem" : "3.25rem", opacity: 0.5 }}
            >
              messages
            </dt>
          </button>
        </dl>
        <p className="mt-3 text-[11px] font-black lowercase tracking-[0.3em] opacity-35">
          private to you
        </p>



        <div className="mt-12">
          <Field
            label="about me"
            value={me.aboutMe}
            onChange={(v) => myProfileStore.patch({ aboutMe: v })}
            placeholder="a couple of honest lines"
            multiline
          />
        </div>


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

        <button
          type="button"
          onClick={save}
          className="mt-16 text-left text-[13vw] font-black lowercase leading-[0.85] tracking-[-0.055em] transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-participation)" }}
        >
          back
          <br />
          to my g
        </button>
        <p className="mt-6 text-[11px] font-black lowercase tracking-[0.3em] opacity-40">
          everything saves as you go
        </p>

        {/* LEARN HOW, WHENEVER YOU LIKE. Never a nag, always here. */}
        {onHelp ? (
          <button
            type="button"
            onClick={() => {
              buzz();
              onHelp();
            }}
            className="mt-10 text-left text-[11px] font-black lowercase tracking-[0.3em] opacity-55"
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

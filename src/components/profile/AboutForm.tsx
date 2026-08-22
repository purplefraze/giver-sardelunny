import { useEffect, useRef, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { useMyProfile } from "@/hooks/use-my-profile";
import { myProfileStore } from "@/data/my-profile";
import {
  ADULT_AGE,
  HANDLE_MESSAGE,
  PASSWORD_RULES,
  ageFrom,
  birthdayLabel,
  checkHandle,
  displayHandle,
  normaliseHandle,
  passwordStrongEnough,
  type HandleCheck,
} from "@/data/account";
import { PhotoCropper } from "@/components/profile/PhotoCropper";
import {
  ProfilePhotoToggle,
  type PhotoSeat,
} from "@/components/profile/ProfilePhotoToggle";
import { buzz } from "@/lib/haptics";
import { haptics } from "@/lib/haptics";

/**
 * MY G — THE ACCOUNT AND THE PERSON, ON ONE COMPACT PAGE.
 *
 * Giver asks for almost nothing, but an ACCOUNT is real: a username, a date of
 * birth and a password are required, marked with *, and everything else is
 * genuinely optional. Publishing a give needs 18+, and that is said here, once,
 * plainly — never as an alarm.
 *
 * THE PRIVATE UTILITIES LIVE ON THE PHOTO ITSELF: one miniature Living-G-style
 * toggle riding the rim of my photo circle. 1:30 messages (RED), 3:00 sparks
 * (PURPLE), 4:30 sparkles (PINK). First tap selects, second tap opens that
 * history. There are no large counters anywhere.
 */

const GENDERS = ["male", "female", "non-binary", "prefer not to say"] as const;

const PHOTO = 112;

export function AboutForm({
  onDone,
  onHelp,
  onViewProfile,
  onMessages,
  onSparks,
  onSparkles,
  unread = 0,
  firstSetup = false,
}: {
  onDone: () => void;
  /** HELP IS ALWAYS AVAILABLE — quietly, from inside my own profile. */
  onHelp?: () => void;
  /** MY WHOLE PROFILE, in the same shared profile system everyone else uses. */
  onViewProfile?: () => void;
  /** THE THREE HISTORY PORTALS behind my photo's own toggle. */
  onMessages?: () => void;
  onSparks?: () => void;
  onSparkles?: () => void;
  unread?: number;
  /** A new person's setup is identity only; account furniture comes afterwards. */
  firstSetup?: boolean;
}) {
  const me = useMyProfile();
  const [handleState, setHandleState] = useState<HandleCheck>({ state: "empty" });
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [cropping, setCropping] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);

  const handle = normaliseHandle(me.username);
  const age = ageFrom(me.birthday);
  const adult = age !== null && age >= ADULT_AGE;

  /* AVAILABILITY IS CHECKED WHILE YOU TYPE, and never blocks the typing. */
  useEffect(() => {
    let alive = true;
    if (!handle || handle === "you") {
      setHandleState({ state: "empty" });
      return;
    }
    const timer = setTimeout(() => {
      void checkHandle(handle).then((r) => alive && setHandleState(r));
    }, 260);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [handle]);

  /* A PASSWORD IS SAVED THE MOMENT IT IS REAL — hashed, never stored plainly. */
  useEffect(() => {
    if (!pass || pass !== again || !passwordStrongEnough(pass)) return;
    void myProfileStore.setPassword(pass);
  }, [pass, again]);

  const pickPhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        /* Shrunk first, then positioned: the crop is always the last word. */
        setCropping(await shrink(String(reader.result)));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const openSeat = (seat: PhotoSeat) => {
    if (seat === "messages") onMessages?.();
    if (seat === "sparks") onSparks?.();
    if (seat === "sparkles") onSparkles?.();
  };

  const save = () => {
    buzz();
    myProfileStore.patch({ built: true, username: displayHandle(me.username) });
    onDone();
  };

  const passwordSet = Boolean(me.password);
  const matches = pass.length > 0 && pass === again;

  return (
    <div
      data-world="profile"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={save} label="back to my g" />

      <div className="px-7 pb-14 pt-16">
        {/* PHOTO + ITS ONE PHYSICAL UTILITY TOGGLE ON THE RIM. */}
        <div className="flex items-start gap-5">
          <div className="relative shrink-0" style={{ width: PHOTO, height: PHOTO }}>
            <button
              type="button"
              onClick={() => {
                buzz();
                if (me.photoSource) setCropping(me.photoSource);
                else pickPhoto();
              }}
              className="block h-full w-full transition-transform active:scale-[0.98]"
              aria-label={me.photo ? "reposition photo" : "add a photo"}
            >
              {me.photo ? (
                <img
                  src={me.photo}
                  alt="my profile photo"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                /* MATHEMATICALLY CENTRED PLUS — a flex box with no line-height. */
                <span
                  className="flex h-full w-full items-center justify-center rounded-full"
                  style={{ border: "2px solid var(--giver-me)" }}
                >
                  <span
                    className="block text-[2.4rem] font-black leading-none"
                    style={{ color: "var(--giver-me)", transform: "translateY(-0.03em)" }}
                  >
                    +
                  </span>
                </span>
              )}
            </button>

            {!firstSetup ? (
              <ProfilePhotoToggle
                size={PHOTO}
                counts={{ messages: unread, sparks: me.sparks, sparkles: me.sparkles }}
                onOpen={openSeat}
              />
            ) : null}
          </div>

          <div className="min-w-0 pt-1">
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
            {me.photoSource ? (
              <button
                type="button"
                onClick={() => {
                  buzz();
                  setCropping(me.photoSource);
                }}
                className="mt-2 block text-left g-meta opacity-55"
              >
                reposition
              </button>
            ) : null}
            {!firstSetup ? (
              <p className="mt-3 g-meta opacity-35">tap a dot, tap again to open</p>
            ) : null}
          </div>
        </div>

        {/* ---- REQUIRED: THE ACCOUNT ITSELF. ---- */}
        <p className="mt-10 g-heading" style={{ color: "var(--giver-me)" }}>
          your account
        </p>
        <p className="mt-2 g-meta opacity-40">* required</p>

        <div className="mt-5 space-y-5">
          <Field
            label="username / handle *"
            value={handle}
            onChange={(v) => myProfileStore.patch({ username: normaliseHandle(v) })}
            placeholder="yourname"
            prefix="@"
            limit={20}
            note={
              handleState.state === "free"
                ? HANDLE_MESSAGE.free
                : handleState.state === "taken"
                  ? HANDLE_MESSAGE.taken
                  : handleState.state === "short"
                    ? HANDLE_MESSAGE.short
                    : "lowercase, no spaces"
            }
            noteColour={
              handleState.state === "taken" ? "var(--giver-action)" : undefined
            }
          />

          {/* BIRTHDAY — THE ANSWER BELONGS TO ITS OWN LABEL, right beside it. */}
          <div className="flex flex-col gap-1.5">
            <span className="g-meta" style={{ color: "var(--giver-me)", opacity: 0.75 }}>
              birthday / dob *
            </span>
            <div
              className="relative flex items-baseline gap-3 border-b pb-1"
              style={{ borderColor: "color-mix(in oklab, var(--giver-me) 35%, transparent)" }}
            >
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  dateRef.current?.showPicker?.();
                  dateRef.current?.focus();
                }}
                className="text-left text-xl font-black lowercase leading-tight tracking-[-0.03em]"
                style={{ opacity: me.birthday ? 1 : 0.3 }}
              >
                {birthdayLabel(me.birthday) || "choose your date of birth"}
              </button>
              <input
                ref={dateRef}
                type="date"
                value={me.birthday ?? ""}
                onChange={(e) => myProfileStore.patch({ birthday: e.target.value })}
                aria-label="date of birth"
                className="absolute inset-0 h-full w-full opacity-0"
              />
            </div>
            <span
              className="g-meta"
              style={{
                color: age !== null && !adult ? "var(--giver-action)" : undefined,
                opacity: 0.6,
              }}
            >
              {age === null
                ? `you must be ${ADULT_AGE} or older to publish a give`
                : adult
                  ? `${age} — you can publish gives`
                  : `${age} — gives can be written and saved, not published yet`}
            </span>
          </div>

          <Secret
            label="password *"
            value={pass}
            onChange={setPass}
            show={showPass}
            placeholder={passwordSet && !pass ? "•••••••• saved" : "your password"}
          />
          <div className="space-y-1.5">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(pass);
              return (
                <p
                  key={rule.label}
                  className="g-meta"
                  style={{
                    color: ok ? "var(--mode-give)" : undefined,
                    opacity: ok ? 0.9 : 0.4,
                  }}
                >
                  {ok ? "✓" : "·"} {rule.label}
                </p>
              );
            })}
          </div>

          <Secret
            label="confirm password *"
            value={again}
            onChange={setAgain}
            show={showPass}
            placeholder="again, exactly"
          />
          <div className="flex items-baseline gap-4">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setShowPass((s) => !s);
              }}
              className="g-meta"
              style={{ color: "var(--giver-action)" }}
            >
              {showPass ? "hide" : "show"}
            </button>
            <span className="g-meta opacity-50">
              {!pass && passwordSet
                ? "password saved"
                : !pass
                  ? ""
                  : matches
                    ? passwordStrongEnough(pass)
                      ? "saved"
                      : "nearly — see above"
                    : "these two don’t match yet"}
            </span>
          </div>
        </div>

        {/* ---- OPTIONAL: THE PERSON. ---- */}
        <p className="mt-12 g-heading" style={{ color: "var(--giver-me)" }}>
          about you
        </p>
        <p className="mt-2 g-meta opacity-40">all optional</p>

        <div className="mt-5 space-y-5">
          <Field
            label="about me"
            value={me.aboutMe}
            onChange={(v) => myProfileStore.patch({ aboutMe: v })}
            placeholder="in ten words or less"
            limit={80}
          />

          {/* GENDER — a few words, one selected. Never a dropdown. */}
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
                    myProfileStore.patch({ gender: me.gender === g ? "" : g });
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
            label="anything else we should know?"
            value={me.weekend}
            onChange={(v) => myProfileStore.patch({ weekend: v })}
            limit={80}
          />
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-9 text-left text-2xl font-black lowercase leading-none tracking-[-0.03em] transition-transform active:scale-[0.98]"
          style={{ color: "var(--giver-me)" }}
        >
          ← back to my g
        </button>
        <p className="mt-2.5 g-meta opacity-40">everything saves as you go</p>

        {/* MY PROFILE, EXACTLY AS ANYONE ELSE SEES IT. Same shared system. */}
        {onViewProfile && !firstSetup ? (
          <button
            type="button"
            onClick={() => {
              buzz();
              onViewProfile();
            }}
            className="mt-6 text-left g-meta"
            style={{ color: "var(--giver-me)", opacity: 0.85 }}
          >
            see my whole profile
          </button>
        ) : null}

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

      {/* THE CIRCLE IS CHOSEN BY HAND — drag to move, pinch to zoom. */}
      {cropping ? (
        <PhotoCropper
          source={cropping}
          initial={me.photoCrop}
          onCancel={() => setCropping(null)}
          onConfirm={(cropped, crop) => {
            myProfileStore.setPhoto(cropped, cropping, crop);
            setCropping(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * A photo must never cost the words. We redraw it small before it is stored,
 * so the whole profile keeps fitting in persistent storage.
 */
async function shrink(dataUrl: string, max = 900): Promise<string> {
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

/** One field: its label, then its own answer directly beneath it. */
function Field({
  label,
  value,
  onChange,
  placeholder = "—",
  limit = 26,
  prefix,
  note,
  noteColour,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  limit?: number;
  prefix?: string;
  note?: string;
  noteColour?: string | undefined;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="g-meta" style={{ color: "var(--giver-me)", opacity: 0.75 }}>
        {label}
      </span>
      <span
        className="flex items-baseline border-b pb-1"
        style={{ borderColor: "color-mix(in oklab, var(--giver-me) 35%, transparent)" }}
      >
        {prefix ? (
          <span className="text-xl font-black leading-tight opacity-45">{prefix}</span>
        ) : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, limit))}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-xl font-black lowercase leading-tight tracking-[-0.03em] outline-none placeholder:opacity-30"
        />
      </span>
      {note ? (
        <span className="g-meta" style={{ color: noteColour, opacity: 0.55 }}>
          {note}
        </span>
      ) : null}
    </label>
  );
}

/** A password field. Same type as everything else; never a special widget. */
function Secret({
  label,
  value,
  onChange,
  show,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="g-meta" style={{ color: "var(--giver-me)", opacity: 0.75 }}>
        {label}
      </span>
      <input
        type={show ? "text" : "password"}
        value={value}
        autoComplete="new-password"
        onChange={(e) => onChange(e.target.value.slice(0, 64))}
        placeholder={placeholder}
        className="w-full border-b bg-transparent pb-1 text-xl font-black leading-tight tracking-[-0.03em] outline-none placeholder:font-medium placeholder:lowercase placeholder:opacity-30"
        style={{ borderColor: "color-mix(in oklab, var(--giver-me) 35%, transparent)" }}
      />
    </label>
  );
}

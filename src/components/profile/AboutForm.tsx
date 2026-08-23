import { useEffect, useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { useMyProfile } from "@/hooks/use-my-profile";
import { myProfileStore } from "@/data/my-profile";
import {
  ADULT_AGE,
  HANDLE_MESSAGE,
  PASSWORD_RULES,
  ageFrom,
  checkHandle,
  displayHandle,
  normaliseHandle,
  passwordStrongEnough,
  type HandleCheck,
} from "@/data/account";
import { useProfilePhoto } from "@/components/profile/ProfilePhotoPicker";
import {
  ProfilePhotoToggle,
  type PhotoSeat,
} from "@/components/profile/ProfilePhotoToggle";
import { InlineEdit } from "@/components/profile/InlineEdit";
import { BirthdayInput } from "@/components/profile/BirthdayInput";
import { PromptAnswers } from "@/components/profile/PromptAnswers";
import { buzz, haptics } from "@/lib/haptics";

/**
 * MY G — A PERSON, NOT A QUESTIONNAIRE.
 *
 * This screen is my profile itself, and it is also how I change it. Every piece
 * of me is printed exactly once, where it belongs, and touching that place turns
 * it into its own input. There are no field boxes, no repeated labels, no second
 * copy of the same question lower down, and nothing to submit.
 */

const GENDERS = ["male", "female", "non-binary", "prefer not to say"] as const;

const PHOTO = 104;

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
  onHelp?: () => void;
  onViewProfile?: () => void;
  onMessages?: () => void;
  onSparks?: () => void;
  onSparkles?: () => void;
  unread?: number;
  firstSetup?: boolean;
}) {
  const me = useMyProfile();
  const [handleState, setHandleState] = useState<HandleCheck>({ state: "empty" });
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [showPass, setShowPass] = useState(false);
  const photo = useProfilePhoto();
  const [photoMenu, setPhotoMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  /** THE INTERFACE TEACHES ITSELF ONCE: the hint retires after the first touch. */
  const [taught, setTaught] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);

  const handle = normaliseHandle(me.username);
  const named = Boolean(handle) && handle !== "you";
  const age = ageFrom(me.birthday);
  const adult = age !== null && age >= ADULT_AGE;
  const onboarding = firstSetup || !me.built;

  useEffect(() => {
    let alive = true;
    if (!named) {
      /* A stable value: a fresh object here would re-render forever. */
      setHandleState((current) => (current.state === "empty" ? current : { state: "empty" }));
      return;
    }

    const timer = setTimeout(() => {
      void checkHandle(handle).then((r) => alive && setHandleState(r));
    }, 260);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [handle, named]);

  useEffect(() => {
    if (!pass || pass !== again || !passwordStrongEnough(pass)) return;
    void myProfileStore.setPassword(pass);
  }, [pass, again]);

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
      <BackArrow onClick={save} label="back to my g" sticky />

      <div className="g-page g-page-top g-page-bottom">
        {/* WHO I AM — photo, name, birthday. All three in one breath. */}
        <div className="flex items-start gap-5">
          <div className="relative shrink-0" style={{ width: PHOTO, height: PHOTO }}>
            <button
              type="button"
              onClick={() => {
                buzz();
                if (me.photo || me.photoSource) setPhotoMenu((o) => !o);
                else void photo.choose();
              }}
              className="block h-full w-full transition-transform active:scale-[0.98]"
              aria-label={me.photo ? "photo options" : "add a photo"}
            >
              {me.photo ? (
                <img
                  src={me.photo}
                  alt="my profile photo"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
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

          <div className="min-w-0 flex-1 space-y-4 pt-0.5">
            {/* @USERNAME — printed as it reads, edited in place. */}
            <InlineEdit
              label=""
              value={handle}
              onChange={(v) => {
                setTaught(true);
                myProfileStore.patch({ username: normaliseHandle(v) });
              }}
              placeholder="@yourname"
              prefix="@"
              limit={20}
              register="display-sm"
              /* "you" is a stand-in, not a name: touching it replaces it. */
              selectAll={!named}
              autoEdit={onboarding && !named}

              note={
                named && handleState.state === "taken"
                  ? HANDLE_MESSAGE.taken
                  : named && handleState.state === "free"
                    ? HANDLE_MESSAGE.free
                    : "tap to change"
              }
            />

            {/* BIRTHDAY — once, here, typed. Nowhere else in the app. */}
            <BirthdayInput
              birthday={me.birthday}
              onChange={(day) => {
                setTaught(true);
                myProfileStore.patch({ birthday: day });
              }}
            />
          </div>
        </div>

        {/* THE ONE TEACHING LINE. It shows how, once, then never again. */}
        {!taught ? (
          <p className="g-body mt-6" style={{ opacity: 0.6 }}>
            tap anything on your profile to change it — it saves itself.
          </p>
        ) : null}

        {photo.failed ? (
          <p className="g-body mt-4" style={{ color: "var(--giver-me)" }}>
            that picture wouldn’t open — try another
          </p>
        ) : null}

        {/* THE PHOTO'S OWN SHORT LIST, only while it is open. */}
        {photoMenu ? (
          <div
            className="mt-5 flex flex-col items-start gap-3 border-l pl-4"
            style={{ borderColor: "color-mix(in oklab, var(--giver-me) 35%, transparent)" }}
          >
            <button
              type="button"
              onClick={() => {
                setPhotoMenu(false);
                void photo.choose();
              }}
              className="g-name text-left"
              style={{ color: "var(--giver-me)" }}
            >
              {photo.loading ? "opening…" : "change photo"}
            </button>
            {me.photoSource ? (
              <button
                type="button"
                onClick={() => {
                  setPhotoMenu(false);
                  photo.reposition(me.photoSource!, me.photoCrop);
                }}
                className="g-name text-left"
                style={{ color: "var(--giver-me)" }}
              >
                reposition photo
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ---- THE PERSON. Each thing once, tapped where it stands. ---- */}
        <div className="mt-9 space-y-7">
          <div className="g-rule pt-6">
            <InlineEdit
              label={me.aboutMe ? "" : "about me"}
              value={me.aboutMe}
              onChange={(v) => {
                setTaught(true);
                myProfileStore.patch({ aboutMe: v });
              }}
              placeholder="a line about you"
              limit={120}
              multiline
              register="lede"
            />
          </div>

        </div>

        {/* THE FUN QUESTIONS — optional, playful, and they become sentences. */}
        <PromptAnswers onTouched={() => setTaught(true)} />

        {/* AGE ONLY MATTERS FOR PUBLISHING, and it is said once, plainly. */}
        {age !== null && !adult ? (
          <p className="g-body mt-8" style={{ color: "var(--giver-me)" }}>
            gives can be written and saved, and published once you are {ADULT_AGE}.
          </p>
        ) : null}

        {/* A PASSWORD IS ASKED FOR ONCE, while the account is being made. */}
        {onboarding ? (
          <div className="g-rule mt-10 space-y-5 pt-6">
            <Secret
              label="a password"
              value={pass}
              onChange={setPass}
              show={showPass}
              placeholder={passwordSet && !pass ? "•••••••• saved" : "your password"}
            />
            {pass ? (
              <div className="space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(pass);
                  return (
                    <p
                      key={rule.label}
                      className="g-meta"
                      style={{ color: ok ? "var(--mode-give)" : undefined, opacity: ok ? 0.9 : 0.5 }}
                    >
                      {ok ? "✓" : "·"} {rule.label}
                    </p>
                  );
                })}
                <Secret
                  label="again, exactly"
                  value={again}
                  onChange={setAgain}
                  show={showPass}
                  placeholder="the same password"
                />
              </div>
            ) : null}
            <div className="flex items-baseline gap-5">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setShowPass((s) => !s);
                }}
                className="g-meta"
                style={{ color: "var(--giver-me)", opacity: 0.9 }}
              >
                {showPass ? "hide" : "show"}
              </button>
              <span className="g-meta">
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
        ) : null}

        {/* MY SETTINGS — quiet, and the only home of a password change. */}
        {!onboarding ? (
          <div className="g-rule mt-10 pt-6">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setSettings((o) => !o);
              }}
              className="g-name text-left"
              style={{ color: "var(--giver-me)" }}
            >
              my settings
            </button>

            {settings ? (
              <div className="mt-5 space-y-5">
                <Secret
                  label="new password"
                  value={pass}
                  onChange={setPass}
                  show={showPass}
                  placeholder={passwordSet && !pass ? "•••••••• saved" : "a new password"}
                />
                {pass ? (
                  <Secret
                    label="again, exactly"
                    value={again}
                    onChange={setAgain}
                    show={showPass}
                    placeholder="the same password"
                  />
                ) : null}
                <div className="flex items-baseline gap-5">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setShowPass((s) => !s);
                    }}
                    className="g-meta"
                    style={{ color: "var(--giver-me)", opacity: 0.9 }}
                  >
                    {showPass ? "hide" : "show"}
                  </button>
                  <span className="g-meta">
                    {!pass
                      ? "update password"
                      : matches
                        ? passwordStrongEnough(pass)
                          ? "saved"
                          : "nearly"
                        : "these two don’t match yet"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col items-start gap-5">
          <button
            type="button"
            onClick={save}
            className="g-display-sm text-left transition-transform active:scale-[0.98]"
            style={{ color: "var(--giver-me)" }}
          >
            ← back to my g
          </button>

          {onViewProfile && !firstSetup ? (
            <button
              type="button"
              onClick={() => {
                buzz();
                onViewProfile();
              }}
              className="g-name text-left"
              style={{ color: "var(--giver-me)" }}
            >
              see my whole profile
            </button>
          ) : null}

          {onHelp && !firstSetup ? (
            <button
              type="button"
              onClick={() => {
                buzz();
                onHelp();
              }}
              className="g-name text-left"
              style={{ opacity: 0.7 }}
            >
              learn how giver works
            </button>
          ) : null}
        </div>
      </div>

      {/* THE CIRCLE IS CHOSEN BY HAND — drag to move, pinch to zoom. */}
      {photo.cropper}
    </div>
  );
}

/** A password. The one thing that cannot be printed in place. */
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
    <label className="block">
      <span className="g-meta" style={{ color: "var(--giver-me)" }}>
        {label}
      </span>
      <input
        type={show ? "text" : "password"}
        value={value}
        autoComplete="new-password"
        onChange={(e) => onChange(e.target.value.slice(0, 64))}
        placeholder={placeholder}
        className="g-name mt-1 w-full bg-transparent outline-none placeholder:font-medium placeholder:opacity-30"
      />
    </label>
  );
}

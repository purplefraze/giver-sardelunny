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
import { supabase } from "@/integrations/supabase/client";
import { joinGiver } from "@/lib/invites.functions";
import { sessionStore } from "@/data/cloud/session";
import { pushItems } from "@/data/cloud/items-sync";
import { useSession } from "@/hooks/use-session";

/**
 * MY G — A PERSON, NOT A QUESTIONNAIRE.
 *
 * This screen is my profile itself, and it is also how I change it. Every piece
 * of me is printed exactly once, where it belongs, and touching that place turns
 * it into its own input. There are no field boxes, no repeated labels, no second
 * copy of the same question lower down, and nothing to submit.
 */

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
  const [email, setEmail] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const [returning, setReturning] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const photo = useProfilePhoto();
  const [photoMenu, setPhotoMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const session = useSession();

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

  /**
   * A PASSWORD IS SAVED THE INSTANT IT IS TRUE — and again when the field is
   * left, so putting the phone down never loses it.
   */
  const commitPassword = () => undefined;


  const openSeat = (seat: PhotoSeat) => {
    if (seat === "messages") onMessages?.();
    if (seat === "sparks") onSparks?.();
    if (seat === "sparkles") onSparkles?.();
  };

  const save = async () => {
    if (!session.userId) {
      if (!returning && handleState.state !== "free") {
        setAccountMessage("choose an available @name first.");
        return;
      }
      if (!email.trim()) {
        setAccountMessage("add your email so this giver can live on every phone.");
        return;
      }
      if (pass !== again || !passwordStrongEnough(pass)) {
        setAccountMessage("use matching passwords with 8 characters, a letter and a number.");
        return;
      }
      setJoining(true);
      setAccountMessage("making your giver…");
      const credentials = { email: email.trim().toLowerCase(), password: pass };
      if (returning) {
        const signedIn = await supabase.auth.signInWithPassword(credentials);
        if (signedIn.error) {
          setJoining(false);
          setAccountMessage("that email and password didn’t match. try again or reset it.");
          return;
        }
        await sessionStore.refresh();
        setAccountMessage("welcome back. your giver is here.");
        setJoining(false);
        buzz();
        onDone();
        return;
      }
      const signedUp = await supabase.auth.signUp(credentials);
      if (signedUp.error && !/already/i.test(signedUp.error.message)) {
        setJoining(false);
        setAccountMessage(signedUp.error.message.toLowerCase());
        return;
      }
      if (!signedUp.data.session) {
        const signedIn = await supabase.auth.signInWithPassword(credentials);
        if (signedIn.error) {
          setJoining(false);
          setAccountMessage("check your email to confirm, then come back and sign in.");
          return;
        }
      }
      const token = window.localStorage.getItem("giver.invite.token") ?? undefined;
      const joined = await joinGiver({ data: { handle, name: handle, ...(token ? { token } : {}) } });
      if (!joined.ok) {
        setJoining(false);
        setAccountMessage(joined.reason.toLowerCase());
        return;
      }
      await sessionStore.refresh();
      myProfileStore.patch({ built: true, username: displayHandle(handle), password: "" });
      await sessionStore.saveProfile({
        handle,
        name: handle,
        birthday: me.birthday || null,
        photo_url: me.photo,
        about: me.aboutMe,
        by_day: me.byDay,
        by_night: me.byNight,
        weekend: me.weekend,
        gender: me.gender,
        answers: me.answers,
      });
      await pushItems();
      window.localStorage.removeItem("giver.invite.token");
      setAccountMessage("you’re in. this giver is saved.");
      setJoining(false);
    } else {
      myProfileStore.patch({ built: true, username: displayHandle(me.username), password: "" });
    }
    buzz();
    onDone();
  };

  const passwordSet = Boolean(session.userId);
  const matches = pass.length > 0 && pass === again;

  return (
    <div
      data-world="profile"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={() => void save()} label="back to my g" sticky />

      <div className="g-page g-page-top g-page-bottom">
        {/* WHO I AM — photo, name, birthday. All three in one breath. */}
        <div className="flex items-start gap-5">
          {/* THE PHOTO COLUMN RESERVES ITS OWN WORD LANE beneath the circle. */}
          <div className="relative shrink-0" style={{ width: PHOTO, height: PHOTO + 26 }}>
            <button
              type="button"
              onClick={() => {
                buzz();
                if (me.photo || me.photoSource) setPhotoMenu((o) => !o);
                else void photo.choose();
              }}
              className="block transition-transform active:scale-[0.98]"
              style={{ width: PHOTO, height: PHOTO }}
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
                myProfileStore.patch({ username: normaliseHandle(v) });
              }}
              placeholder="@yourname"
              prefix="@"
              limit={20}
              register="display-sm"
              /* "you" is a stand-in, not a name: touching it replaces it. */
              selectAll={!named}
              autoEdit={onboarding && !named}

              /* THE ONLY THING WORTH SAYING IS WHEN A NAME CANNOT BE HAD. */
              {...(named && handleState.state === "taken"
                ? { note: HANDLE_MESSAGE.taken }
                : {})}
            />

            {/* BIRTHDAY — once, here, typed. Nowhere else in the app. */}
            <BirthdayInput
              birthday={me.birthday}
              onChange={(day) => {
                myProfileStore.patch({ birthday: day });
              }}
            />
          </div>
        </div>



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
        <PromptAnswers />

        {/* AGE ONLY MATTERS FOR PUBLISHING, and it is said once, plainly. */}
        {age !== null && !adult ? (
          <p className="g-body mt-8" style={{ color: "var(--giver-me)" }}>
            gives can be written and saved, and published once you are {ADULT_AGE}.
          </p>
        ) : null}

        {/* A PASSWORD IS ASKED FOR ONCE, while the account is being made. */}
        {onboarding && !session.userId ? (
          <div className="g-rule mt-10 space-y-5 pt-6">
            <div className="flex gap-6">
              <button type="button" onClick={() => setReturning(false)} className="g-meta" style={{ color: !returning ? "var(--giver-me)" : undefined, opacity: !returning ? 1 : 0.45 }}>i’m new</button>
              <button type="button" onClick={() => setReturning(true)} className="g-meta" style={{ color: returning ? "var(--giver-me)" : undefined, opacity: returning ? 1 : 0.45 }}>i already joined</button>
            </div>
            <label className="block">
              <span className="g-meta" style={{ color: "var(--giver-me)" }}>your email</span>
              <input type="email" required autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="g-name mt-1 w-full border-b border-current/20 bg-transparent pb-2 outline-none" />
            </label>
            <Secret
              label="a password"
              value={pass}
              onChange={setPass}
              onBlur={commitPassword}
              show={showPass}
              placeholder={passwordSet && !pass ? "•••••••• saved" : "your password"}
            />
            {/* THE RULES ARE NEVER A SURPRISE, and the second field is never hidden. */}
            <PasswordRules pass={pass} />
            <Secret
              label="again, exactly"
              value={again}
              onChange={setAgain}
              onBlur={commitPassword}
              show={showPass}
              placeholder="the same password"
            />
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
              <PasswordState pass={pass} matches={matches} passwordSet={passwordSet} />
            </div>
            {returning ? <button type="button" className="g-body underline underline-offset-4" onClick={() => void supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` }).then(() => setAccountMessage("password link sent to your email"))}>forgot password?</button> : null}
            {accountMessage ? <p className="g-body" style={{ color: "var(--giver-me)" }}>{accountMessage}</p> : null}
          </div>
        ) : null}


        {/* MY SETTINGS — quiet, and the only home of a password change. */}
        {!onboarding && session.userId ? (
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
                <p className="g-body">signed in as {session.email}</p>
                <button type="button" className="g-name" style={{ color: "var(--giver-me)" }} onClick={() => void supabase.auth.resetPasswordForEmail(session.email ?? "", { redirectTo: `${window.location.origin}/reset-password` }).then(() => setAccountMessage("password link sent"))}>change password by email</button>
                <button type="button" className="g-name" onClick={() => void supabase.auth.signOut()}>sign out</button>
                {accountMessage ? <p className="g-body">{accountMessage}</p> : null}
              </div>
            ) : null}

          </div>
        ) : null}

        <div className="mt-10 flex flex-col items-start gap-5">
          <button
            type="button"
            onClick={() => void save()}
            disabled={joining}
            className="g-display-sm text-left transition-transform active:scale-[0.98]"
            style={{ color: "var(--giver-me)" }}
          >
            {joining ? "joining…" : "← back to my g"}
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

/** WHAT GIVER NEEDS, TICKED OFF AS IT ARRIVES. Always visible, never a scold. */
function PasswordRules({ pass }: { pass: string }) {
  return (
    <div className="space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(pass);
        return (
          <p
            key={rule.label}
            className="g-meta"
            style={{ color: ok ? "var(--mode-give)" : undefined, opacity: ok ? 0.95 : 0.7 }}
          >
            {ok ? "✓" : "·"} {rule.label}
          </p>
        );
      })}
    </div>
  );
}

/**
 * SAVED, OR NOT SAVED YET — said out loud. The old screen stayed silent when a
 * password failed, which is why one was never actually stored.
 */
function PasswordState({
  pass,
  matches,
  passwordSet,
}: {
  pass: string;
  matches: boolean;
  passwordSet: boolean;
}) {
  const saved = matches && passwordStrongEnough(pass);
  /* THE MISSING THING IS NAMED, never left as "see above". */
  const missing = PASSWORD_RULES.find((rule) => !rule.test(pass));
  const say = !pass
    ? passwordSet
      ? "password saved"
      : "not saved yet"
    : saved
      ? "password saved"
      : missing
        ? `not saved yet — needs ${missing.label}`
        : "not saved yet — these two don’t match";
  return (
    <span
      className="g-body"
      style={{ color: saved || (!pass && passwordSet) ? "var(--mode-give)" : undefined }}
    >
      {say}
    </span>
  );

}



/**
 * A password. The one thing that cannot be printed in place.
 *
 * IT MUST SHOW EXACTLY WHAT WAS TYPED. The shared name register lowercases its
 * text, which made typed capitals look rejected while the rules quietly asked
 * for one — so this field opts out of the transform and out of every phone
 * auto-capitalisation habit.
 */
function Secret({
  label,
  value,
  onChange,
  onBlur,
  show,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
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
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.slice(0, 64))}
        onBlur={onBlur}
        placeholder={placeholder}
        className="g-name mt-1 w-full bg-transparent outline-none placeholder:font-medium placeholder:opacity-30"
        style={{ textTransform: "none" }}
      />
    </label>
  );
}


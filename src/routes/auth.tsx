import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { joinGiver } from "@/lib/invites.functions";
import { sessionStore } from "@/data/cloud/session";
import { myProfileStore } from "@/data/my-profile";
import { normaliseHandle } from "@/data/account";
import { haptics } from "@/lib/haptics";

/**
 * THE DEV DOOR. Email and a password — no SMS, no fake verification codes.
 * Deliberately plain: the Living G is the app, this is only the way in.
 */
export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ invite: z.string().optional() }).parse,
  head: () => ({
    meta: [
      { title: "sign in · giver dev" },
      { name: "description", content: "sign in to the shared giver dev prototype with an invited email address." },
      { property: "og:title", content: "sign in · giver dev" },
      { property: "og:description", content: "sign in to the shared giver dev prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"join" | "back">(invite ? "join" : "back");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("giver.invite.token");
    if (invite) window.localStorage.setItem("giver.invite.token", invite);
    else if (stored) setMode("join");
  }, [invite]);

  const token = invite ?? window.localStorage.getItem("giver.invite.token") ?? undefined;

  async function finish() {
    const chosen = normaliseHandle(handle || myProfileStore.get().username || email.split("@")[0] || "giver");
    await joinGiver({ data: { handle: chosen, name: chosen, ...(token ? { token } : {}) } });
    if (chosen && !normaliseHandle(myProfileStore.get().username)) {
      myProfileStore.setUsername(chosen);
    }
    await sessionStore.refresh();
    window.localStorage.removeItem("giver.invite.token");
    haptics.tap();
    void navigate({ to: "/" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "join") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError && !/already/i.test(signUpError.message)) throw signUpError;
        if (signUpError) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message.toLowerCase() : "that didn't work");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="g-page min-h-screen bg-giver-paper text-giver-ink">
      <p className="g-meta">giver · shared dev prototype</p>
      <h1 className="g-display mt-6">
        {mode === "join" ? "make your giver" : "welcome back"}
      </h1>
      <p className="g-body mt-4 max-w-[28ch]">
        {mode === "join"
          ? "an email and a password. no phone number in this test build."
          : "sign in and everything you made is still there."}
      </p>

      <form onSubmit={submit} className="mt-10 flex flex-col gap-6">
        {mode === "join" ? (
          <label className="flex flex-col gap-2">
            <span className="g-meta">your @name</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoCapitalize="none"
              placeholder="@you"
              className="g-name border-b border-giver-ink/20 bg-transparent pb-2 outline-none"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-2">
          <span className="g-meta">email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            className="g-name border-b border-giver-ink/20 bg-transparent pb-2 outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="g-meta">password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="g-name border-b border-giver-ink/20 bg-transparent pb-2 outline-none"
          />
        </label>

        {error ? <p className="g-meta text-giver-ink/60">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="g-heading mt-2 self-start disabled:opacity-40"
          style={{ color: "var(--giver-me)" }}
        >
          {busy ? "one moment" : mode === "join" ? "start" : "sign in"}
        </button>
      </form>

      <button
        type="button"
        className="g-meta mt-12 self-start underline decoration-giver-ink/20"
        onClick={() => setMode(mode === "join" ? "back" : "join")}
      >
        {mode === "join" ? "i already have a giver" : "i was invited"}
      </button>
    </main>
  );
}

/**
 * THE SIGNED-IN PERSON — DEV/TEST BUILD.
 *
 * This remix of Giver is a SHARED dev environment: invited friends really sign
 * in, really post, and really talk to each other. Identity therefore comes from
 * the backend, not from local storage — but everything the Living G already
 * knows about "me" (myProfileStore) stays exactly where it was. This module is
 * only the thin identity layer underneath it:
 *
 *   auth user  ->  profiles row  ->  admin/tester role
 *
 * Phone verification is deliberately NOT here. Email + invite is the dev
 * bypass; the profile model is untouched by it, so production SMS can be added
 * later without rebuilding the user model.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { joinGiver } from "@/lib/invites.functions";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionState = {
  status: "loading" | "signed-out" | "ready";
  userId: string | null;
  email: string | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
};

const EMPTY: SessionState = Object.freeze({
  status: "loading",
  userId: null,
  email: null,
  profile: null,
  isAdmin: false,
});

const SIGNED_OUT: SessionState = Object.freeze({
  status: "signed-out",
  userId: null,
  email: null,
  profile: null,
  isAdmin: false,
});

let state: SessionState = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function commit(next: SessionState) {
  state = next;
  for (const l of listeners) l();
}

/**
 * A VERIFIED EMAIL IS ENOUGH. Whichever way I signed in (code, link, another
 * tab), a missing profile row is created here — never treated as "denied".
 * Once per user per page; failure still lands on the G.
 */
const ensured = new Set<string>();
async function ensureProfile(userId: string, email: string | null): Promise<boolean> {
  if (ensured.has(userId)) return false;
  ensured.add(userId);
  const handle =
    (email?.split("@")[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 20) || "giver";
  try {
    /* Never hold the G hostage to a slow server: 4s, then land anyway. */
    const res = await Promise.race([
      joinGiver({ data: { handle, name: handle } }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    return Boolean(res?.ok);
  } catch {
    return false;
  }
}

async function load(userId: string, email: string | null) {
  const fetchBoth = () =>
    Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
  let [{ data: profile }, { data: roles }] = await fetchBoth();
  if (!profile && (await ensureProfile(userId, email))) {
    [{ data: profile }, { data: roles }] = await fetchBoth();
  }
  commit({
    status: "ready",
    userId,
    email,
    profile: profile ?? null,
    isAdmin: (roles ?? []).some((r) => r.role === "admin"),
  });
}

export const sessionStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    sessionStore.start();
    return () => listeners.delete(listener);
  },
  get(): SessionState {
    return state;
  },
  /** SSR never has a session; one frozen snapshot, never a fresh object. */
  getServer(): SessionState {
    return EMPTY;
  },

  start() {
    if (started || typeof window === "undefined") return;
    started = true;
    /* An email link (token_hash / code / error) is settled first, so the
       sign-in screen never flashes before a link session, and a failed link
       arrives as one plain line instead of "access_denied" in the address. */
    void consumeAuthCallback().then(() =>
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (user) void load(user.id, user.email ?? null);
        else commit(SIGNED_OUT);
      }),
    );
    supabase.auth.onAuthStateChange((event, session) => {
      /* The first answer comes from getSession above. */
      if (event === "INITIAL_SESSION") return;
      const user = session?.user;
      if (event === "SIGNED_OUT" || !user) {
        commit(SIGNED_OUT);
        return;
      }
      if (event === "TOKEN_REFRESHED" && state.userId === user.id) return;
      void load(user.id, user.email ?? null);
    });
  },

  async refresh() {
    if (state.userId) await load(state.userId, state.email);
  },

  /** Write my own profile row. The Living G's own store stays the author. */
  async saveProfile(fields: Partial<ProfileRow>) {
    const { userId, profile } = state;
    if (!userId) throw new Error("sign in first");
    if (profile) {
      const { data, error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", profile.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (data) commit({ ...state, profile: data });
      return data ?? null;
    }
    const { data, error } = await supabase
      .from("profiles")
      .insert({ ...fields, user_id: userId })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (data) commit({ ...state, profile: data });
    return data ?? null;
  },
};

export const myProfileId = () => state.profile?.id ?? null;

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

async function load(userId: string, email: string | null) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
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
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) void load(user.id, user.email ?? null);
      else commit(SIGNED_OUT);
    });
    supabase.auth.onAuthStateChange((event, session) => {
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

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

import { isAuthRetryableFetchError } from "@supabase/supabase-js";

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

/**
 * A SESSION THAT ENDED ON ITS OWN (refresh failed, a write came back 401).
 * Never answered with an email: the person is returned to the G sign-in with
 * one line and taps send themselves (useOtpSignIn reads takeSessionEnded).
 *
 *   LAST_USER  set while signed in; a reload that finds no session but this
 *              key means the session died while the tab was closed
 *   ENDED      "show the session-ended line on the sign-in"
 */
const LAST_USER_KEY = "giver.session.last-user.v1";
const ENDED_KEY = "giver.session-ended.v1";
/** The expiry of the last session seen, to tell a dead refresh from a tap on sign out. */
let lastExpiresAt: number | null = null;
/** True while ensureLiveSession is renewing: a SIGNED_OUT then is a dead session. */
let renewing = false;

function store(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}
function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Signed out, and the sign-in owes the "session ended" line (a fresh snapshot, so listeners re-read). */
const ENDED: SessionState = Object.freeze({ ...SIGNED_OUT });

function markSessionEnded() {
  store(ENDED_KEY, String(Date.now()));
  store(LAST_USER_KEY, null);
  lastExpiresAt = null;
  if (state !== ENDED) commit(ENDED);
}

/** True while the sign-in owes the "session ended" line. */
export function sessionEndedPending(): boolean {
  return typeof window !== "undefined" && stored(ENDED_KEY) !== null;
}

/** Read once by the sign-in screen: did the last session end on its own? */
export function takeSessionEnded(): boolean {
  if (!sessionEndedPending()) return false;
  store(ENDED_KEY, null);
  return true;
}

/** A PostgREST / Storage / Functions answer that means "your token is no good". */
export function isAuthFailure(err: unknown, status?: number): boolean {
  if (status === 401) return true;
  if (!err || typeof err !== "object") return false;
  const e = err as {
    status?: number;
    statusCode?: string | number;
    code?: string;
    message?: string;
  };
  if (e.status === 401 || String(e.statusCode ?? "") === "401") return true;
  if (e.code === "PGRST301" || e.code === "PGRST302" || e.code === "PGRST303") return true;
  return /jwt|token.*expired|invalid claim/i.test(e.message ?? "");
}

/**
 * BEFORE A WRITE: is there a live session? getSession() hands back a stored
 * session (refreshing it first when it has expired, autoRefreshToken); if it
 * still looks dead, one explicit refreshSession(). Never sends an email.
 *
 *   "live"   write away
 *   "ended"  there was a session and it cannot be renewed — the UI returns to
 *            the G sign-in with "session ended — send a new link"
 *   "none"   never signed in on this device; the caller keeps its own rules
 */
export async function ensureLiveSession(force = false): Promise<"live" | "ended" | "none"> {
  if (typeof window === "undefined") return "none";
  const hadSession = state.userId !== null || stored(LAST_USER_KEY) !== null;
  const nowS = Math.floor(Date.now() / 1000);
  renewing = true;
  try {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (s && !force && (s.expires_at ?? 0) > nowS + 10) return "live";
    if (s || force) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (!error && refreshed.session) return "live";
      /* Offline is not "ended": the write stays on this device and syncs later. */
      if (error && isAuthRetryableFetchError(error)) return "live";
    }
    if (!hadSession) return "none";
    /* The token was refused and cannot be renewed: forget it on this device
       only (no server call, no email), so every screen agrees it has ended. */
    if (s) await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* decided below */
  } finally {
    renewing = false;
  }
  if (!hadSession) return "none";
  markSessionEnded();
  return "ended";
}

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
  /* Signed in again: the session-ended line is no longer owed. */
  store(LAST_USER_KEY, userId);
  store(ENDED_KEY, null);
  const fetchBoth = () =>
    Promise.all([
      supabase.rpc("my_profile").maybeSingle(),
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
        lastExpiresAt = data.session?.expires_at ?? null;
        if (user) void load(user.id, user.email ?? null);
        /* Signed in last time, no session now: it could not be renewed while
           the tab was closed. The sign-in says so — no email is sent. */
        else if (stored(LAST_USER_KEY)) markSessionEnded();
        else commit(SIGNED_OUT);
      }),
    );
    /* THE LINK TAPPED IN ANOTHER TAB. supabase-js tells other tabs over
       BroadcastChannel; as a fallback (older Safari, a missed message) a
       signed-out tab re-reads the stored session when storage changes or the
       tab comes back into view, so the waiting screen still lands on the G. */
    const recheck = () => {
      if (state.status !== "signed-out") return;
      void supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (user && state.status === "signed-out") void load(user.id, user.email ?? null);
      });
    };
    window.addEventListener("storage", (e) => {
      if (e.key === null || e.key.startsWith("sb-")) recheck();
    });
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") recheck();
    });
    /* THE UI FOLLOWS THE CLIENT: SIGNED_OUT signs the UI out, TOKEN_REFRESHED
       keeps it signed in (autoRefreshToken renews the token in the background). */
    supabase.auth.onAuthStateChange((event, session) => {
      /* The first answer comes from getSession above. */
      if (event === "INITIAL_SESSION") return;
      const user = session?.user;
      if (event === "SIGNED_OUT" || !user) {
        /* Still waiting for the first answer (a stored session that could
           not be renewed at start-up): the getSession answer above decides. */
        if (state.status === "loading") return;
        /* A sign-out while the token was expiring (or expired) is a refresh
           that failed, not a tap on "sign out": the session ended. */
        const nowS = Math.floor(Date.now() / 1000);
        const died =
          state.userId !== null &&
          (renewing || (lastExpiresAt !== null && lastExpiresAt - nowS < 120));
        lastExpiresAt = null;
        if (died) {
          markSessionEnded();
          return;
        }
        /* A tap on "sign out": no line owed next time. */
        if (state.userId !== null) store(LAST_USER_KEY, null);
        commit(SIGNED_OUT);
        return;
      }
      lastExpiresAt = session?.expires_at ?? null;
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
      const { error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", profile.id);
      if (error) throw error;
      const { data } = await supabase.rpc("my_profile").maybeSingle();
      if (data) commit({ ...state, profile: data });
      return data ?? null;
    }
    const { error } = await supabase
      .from("profiles")
      .insert({ ...fields, user_id: userId });
    if (error) throw error;
    const { data } = await supabase.rpc("my_profile").maybeSingle();
    if (data) commit({ ...state, profile: data });
    return data ?? null;
  },
};

export const myProfileId = () => state.profile?.id ?? null;

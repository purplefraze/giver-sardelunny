/**
 * "SWIPE TO CONTINUE" — THE GIVE SURFACE'S ONE FIRST-TIME HINT.
 *
 * Shown once, on the very first give, under the first question's answer.
 * Seen is remembered in two places so it never comes back:
 *
 *   this device   localStorage "giver.give-hint.v1" = "1"
 *   the account   Supabase auth user metadata { give_hint_seen: true }
 *                 (supabase.auth.updateUser({ data }) — the auth user's own
 *                 raw_user_meta_data; no table, no column, no migration, no
 *                 email: a metadata-only update never sends one)
 *
 * Reading the account flag uses the locally stored session only (getSession),
 * so opening the give never waits on the network.
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "giver.give-hint.v1";
const META = "give_hint_seen";

function seenOnDevice(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export const giveHintStore = {
  /** Resolves true when this device OR the signed-in account has seen it. */
  async seen(): Promise<boolean> {
    if (seenOnDevice()) return true;
    try {
      const { data } = await supabase.auth.getSession();
      const meta = data.session?.user?.user_metadata as Record<string, unknown> | undefined;
      if (meta?.[META] === true) {
        giveHintStore.markDevice();
        return true;
      }
    } catch {
      /* no session: the device flag decides */
    }
    return false;
  },
  markDevice() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* a flag is not worth failing over */
    }
  },
  /** Written the moment the hint is shown: device first, then the account. */
  markSeen() {
    giveHintStore.markDevice();
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const meta = data.session.user.user_metadata as Record<string, unknown> | undefined;
        if (meta?.[META] === true) return;
        await supabase.auth.updateUser({ data: { [META]: true } });
      } catch {
        /* the device flag still holds */
      }
    })();
  },
};

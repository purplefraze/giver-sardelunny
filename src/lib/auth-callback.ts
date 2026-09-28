import type { EmailOtpType } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * THE EMAIL LINK, WHATEVER SHAPE IT COMES BACK IN.
 *
 * The sign-in email carries a 6-digit code AND a link. Supabase's link lands
 * back on "/" in one of these shapes:
 *
 *   #access_token=…            implicit flow (this client's default): supabase-js
 *                              reads it itself (detectSessionInUrl) — untouched
 *   #error=access_denied&error_code=otp_expired&error_description=…
 *                              the link was expired, already used (the code and
 *                              the link are ONE token — using either spends
 *                              both), superseded by a newer send, or opened
 *                              first by a mail scanner. supabase-js leaves this
 *                              in the address bar and says nothing, so the
 *                              tester saw "access_denied" and a blank sign-in.
 *   ?token_hash=…&type=…       a custom email template: verifyOtp here
 *   ?code=…                    PKCE: exchange here; with no code_verifier
 *                              (link opened in another browser / mail app)
 *                              it cannot work, so fall back to the code step
 *
 * Every failure becomes one short lowercase line on the sign-in screen, never
 * "access denied". No allowlist, no invite gate: a valid code or link always
 * lands on the G.
 */

const EMAIL_KEY = "giver.signin.email";
const ERROR_KEYS = ["error", "error_code", "error_description", "sb"];
const CALLBACK_KEYS = [...ERROR_KEYS, "code", "token_hash", "type"];

let parsed = false;
let notice: string | null = null;
let pending:
  | { kind: "token_hash"; tokenHash: string; type: EmailOtpType }
  | { kind: "code"; code: string }
  | null = null;
let consumed: Promise<void> | null = null;

/** The address a code/link was last sent to, so a link tab can offer the code step. */
export function rememberSignInEmail(email: string) {
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* private mode */
  }
}

export function rememberedSignInEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function sayLinkError(code: string | null): string {
  if (code === "otp_expired") return "link expired";
  return "link didn’t work";
}

function cleanUrl(dropHash: boolean) {
  try {
    const url = new URL(window.location.href);
    for (const k of CALLBACK_KEYS) url.searchParams.delete(k);
    if (dropHash) url.hash = "";
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    /* never block sign-in on tidying the address bar */
  }
}

/**
 * SYNCHRONOUS FIRST LOOK at the address, before supabase-js initialises: an
 * error hash is read and removed here; token_hash / code are queued for
 * consumeAuthCallback. Safe to call more than once.
 */
function parseOnce() {
  if (parsed || typeof window === "undefined") return;
  parsed = true;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const get = (k: string) => hash.get(k) ?? url.searchParams.get(k);

  if (get("error") || get("error_code") || get("error_description")) {
    notice = sayLinkError(get("error_code"));
    cleanUrl(hash.has("error") || hash.has("error_code") || hash.has("error_description"));
    return;
  }
  const tokenHash = get("token_hash");
  if (tokenHash) {
    pending = {
      kind: "token_hash",
      tokenHash,
      type: (get("type") as EmailOtpType | null) ?? "email",
    };
    return;
  }
  const code = url.searchParams.get("code");
  if (code) pending = { kind: "code", code };
}

/** Handle a token_hash / code link once. Resolves when there is nothing left to do. */
export function consumeAuthCallback(): Promise<void> {
  if (consumed) return consumed;
  parseOnce();
  const job = pending;
  pending = null;
  consumed = (async () => {
    if (!job) return;
    try {
      if (job.kind === "token_hash") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: job.tokenHash,
          type: job.type,
        });
        if (error) notice = sayLinkError(error.code ?? null);
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.exchangeCodeForSession(job.code);
          if (error) notice = sayLinkError(null);
        }
      }
    } catch {
      notice = sayLinkError(null);
    } finally {
      cleanUrl(false);
    }
  })();
  return consumed;
}

/** The one line the sign-in screen owes after a failed link (read once). */
export function takeLinkNotice(): string | null {
  parseOnce();
  const n = notice;
  notice = null;
  return n;
}

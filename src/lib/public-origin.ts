/**
 * WHERE THE EMAIL LINK SENDS PEOPLE — ALWAYS THE PUBLIC APP.
 *
 * The magic link returns to `emailRedirectTo`. Using window.location.origin
 * sent anyone who asked from a Lovable editor / preview host
 * (<id>.lovableproject.com, id-preview--<id>.lovable.app,
 * preview--<name>.lovable.app) back to that PRIVATE host, which only Lovable
 * project members can open — so the tap on "log in" never reached the G.
 *
 * Now: the current origin only when it IS the public app or local dev;
 * everything else (every Lovable preview/editor host, lovable.dev, unknown
 * hosts) gets the public URL. Set VITE_PUBLIC_APP_URL for a custom domain.
 */
const DEFAULT_PUBLIC_APP_URL = "https://giver-sardelunny.lovable.app";

export const PUBLIC_APP_URL = (
  (import.meta.env["VITE_PUBLIC_APP_URL"] as string | undefined) || DEFAULT_PUBLIC_APP_URL
).replace(/\/+$/, "");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** The origin (no trailing slash) the sign-in link should come back to. */
export function authRedirectOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_APP_URL;
  const { origin, hostname } = window.location;
  if (origin === PUBLIC_APP_URL) return origin;
  if (LOCAL_HOSTS.has(hostname)) return origin;
  return PUBLIC_APP_URL;
}

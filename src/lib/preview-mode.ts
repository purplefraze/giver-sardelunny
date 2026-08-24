/**
 * WHERE THE PROTOTYPE IS BEING LOOKED AT.
 *
 * Giver is still being felt out, so the testing paths — replay onboarding,
 * new-user reset — have to be reachable in the Lovable preview, not only on a
 * local dev server. They stay hidden on a real published site.
 */
export function isTestingSurface(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host.startsWith("id-preview--") ||
    host.endsWith("-dev.lovable.app") ||
    host.endsWith(".lovableproject.com")
  );
}

const ONBOARDING_FLAGS = ["onboarding", "replay", "intro"];

/**
 * AN EXPLICIT WAY BACK TO THE VERY BEGINNING.
 *
 * Opening the preview with ?onboarding=1 (or #onboarding) asks for the whole
 * opening sequence again. The flag is consumed once and removed from the URL so
 * a refresh does not silently restart the person's journey twice.
 */
export function consumeOnboardingRequest(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const hash = url.hash.replace(/^#/, "");
  const asked =
    ONBOARDING_FLAGS.some((flag) => url.searchParams.has(flag)) ||
    ONBOARDING_FLAGS.includes(hash);
  if (!asked) return false;
  for (const flag of ONBOARDING_FLAGS) url.searchParams.delete(flag);
  if (ONBOARDING_FLAGS.includes(hash)) url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
}

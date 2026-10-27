import { notFound, redirect } from "@tanstack/react-router";

/**
 * DEV-ONLY ROUTES (SEC-06). /auth (the TESTING-ONLY sign-in that skips the
 * welcome grant and profile gate), /dev/* and /admin exist for building and
 * review. They work under `vite dev` (local and the Lovable preview) and are
 * closed in every production build (`vite build`), on the server render and
 * in the client alike.
 */
export function devRoutesOpen(env: { DEV?: boolean } = import.meta.env): boolean {
  return env.DEV === true;
}

/** beforeLoad for /dev/* and /admin: a production build answers "not found". */
export function devOnlyRoute(): void {
  if (!devRoutesOpen()) throw notFound();
}

/**
 * beforeLoad for /auth: a production build sends the visitor to "/", where the
 * shipped sign-in (onboarding AuthGate) lives. An invite token is already kept
 * in localStorage by /invite/$token, and AuthGate reads it from there.
 */
export function devOnlyAuthRoute(): void {
  if (!devRoutesOpen()) throw redirect({ to: "/", replace: true });
}

import { createIsomorphicFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { wishReviewOpen } from "./wish-review-access";

const reviewHostname = createIsomorphicFn()
  .server(async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    // Deliberately ignore forwarded/caller-supplied host headers.
    return new URL(getRequest().url).hostname;
  })
  .client(async () => window.location.hostname);

export async function wishReviewOnlyRoute(): Promise<void> {
  if (import.meta.env.DEV === true) return;
  if (!wishReviewOpen(import.meta.env, await reviewHostname())) throw notFound();
}
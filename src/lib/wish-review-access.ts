/** Exact allowlist for the isolated Wish review; never grants account access. */
export const WISH_REVIEW_HOST = "id-preview--c68cfc0b-5cbf-4de6-baaf-5193d583eaba.lovable.app";
export const WISH_REVIEW_PATH = "/review/wish";

export function wishReviewOpen(env: { DEV?: boolean }, hostname: string): boolean {
  return env.DEV === true || hostname.toLowerCase() === WISH_REVIEW_HOST;
}

export function isWishReviewPath(pathname: string): boolean {
  return [WISH_REVIEW_PATH, "/review/november", "/review/give"].some(path => pathname === path || pathname === `${path}/`);
}
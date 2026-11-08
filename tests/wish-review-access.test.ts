import { describe, expect, test } from "bun:test";
import { isWishReviewPath, wishReviewOpen, WISH_REVIEW_HOST } from "@/lib/wish-review-access";

describe("isolated Wish review access", () => {
  test("development runtime is allowed", () => {
    expect(wishReviewOpen({ DEV: true }, "localhost")).toBe(true);
  });
  test("the exact known preview is allowed in production", () => {
    expect(wishReviewOpen({ DEV: false }, WISH_REVIEW_HOST)).toBe(true);
    expect(wishReviewOpen({ DEV: false }, WISH_REVIEW_HOST.toUpperCase())).toBe(true);
  });
  test("published and unknown production hosts are denied", () => {
    for (const host of ["giver-sardelunny.lovable.app", "project--c68cfc0b-5cbf-4de6-baaf-5193d583eaba.lovable.app", "example.com", "localhost", `${WISH_REVIEW_HOST}.evil.com`, "id-preview-6--c68cfc0b-5cbf-4de6-baaf-5193d583eaba.lovable.app", ""]) {
      expect(wishReviewOpen({ DEV: false }, host)).toBe(false);
    }
  });
  test("missing runtime flags fail closed except for known preview", () => {
    expect(wishReviewOpen({}, "giver-sardelunny.lovable.app")).toBe(false);
    expect(wishReviewOpen({}, WISH_REVIEW_HOST)).toBe(true);
  });
  test("cloud-startup exclusion is limited to this isolated route", () => {
    expect(isWishReviewPath("/review/wish")).toBe(true);
    expect(isWishReviewPath("/review/wish/")).toBe(true);
    for (const path of ["/", "/auth", "/admin", "/dev/wish", "/review/wish/other"]) {
      expect(isWishReviewPath(path)).toBe(false);
    }
  });
});
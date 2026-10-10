import { expect, test } from "bun:test";
import { signInCanvasSize } from "../src/lib/signin-canvas";

test("320x568 keyboard contraction never shrinks the sign-in canvas", () => {
  expect(signInCanvasSize({ width: 320, height: 568 }, { width: 320, height: 260 }))
    .toEqual({ width: 320, height: 568 });
});
test("keyboard dismissal preserves the original 390x844 composition", () => {
  const rest = { width: 390, height: 844 };
  const typing = signInCanvasSize(rest, { width: 390, height: 430 });
  expect(signInCanvasSize(typing, rest)).toEqual(rest);
});
test("real orientation changes accept their new canvas", () => {
  expect(signInCanvasSize({ width: 390, height: 844 }, { width: 844, height: 390 }))
    .toEqual({ width: 844, height: 390 });
});
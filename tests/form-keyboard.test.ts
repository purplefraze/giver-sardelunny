import { expect, test } from "bun:test";
import { formKeyboardBounds } from "../src/lib/form-keyboard";

test("opening the complete form has no keyboard inset", () => {
  expect(formKeyboardBounds(844, 844)).toEqual({ keyboard: false, top: 0, bottom: 0 });
});
test("keyboard reduces only content bounds while artwork stays 844 high", () => {
  expect(formKeyboardBounds(844, 480)).toEqual({ keyboard: true, top: 0, bottom: 364 });
});
test("Safari panning keeps content within its visible band", () => {
  expect(formKeyboardBounds(844, 480, 50)).toEqual({ keyboard: true, top: 50, bottom: 314 });
});
test("keyboard dismissal restores identical content composition", () => {
  expect(formKeyboardBounds(844, 844, 0)).toEqual({ keyboard: false, top: 0, bottom: 0 });
});
test("browser pinch zoom is not mistaken for keyboard", () => {
  expect(formKeyboardBounds(844, 422, 0, 2)).toEqual({ keyboard: false, top: 0, bottom: 0 });
});
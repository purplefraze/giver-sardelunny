import { describe, expect, test } from "bun:test";
import { seatPlacement } from "../src/intelligence/seat-placement";

describe("seat placement", () => {
  test("12 centred lower", () => expect(seatPlacement(0)).toEqual({ align: "center", x: 0, y: 1 }));
  test("1:30 left lower-left", () => expect(seatPlacement(45)).toEqual({ align: "left", x: -1, y: 1 }));
  test("3 left mid", () => expect(seatPlacement(90)).toEqual({ align: "left", x: -1, y: 0 }));
  test("4:30 left upper-left", () => expect(seatPlacement(135)).toEqual({ align: "left", x: -1, y: -1 }));
  test("6 centred higher", () => expect(seatPlacement(180)).toEqual({ align: "center", x: 0, y: -1 }));
  test("7:30 right upper-right", () => expect(seatPlacement(225)).toEqual({ align: "right", x: 1, y: -1 }));
  test("9 right mid", () => expect(seatPlacement(270)).toEqual({ align: "right", x: 1, y: 0 }));
  test("10:30 right lower-right", () => expect(seatPlacement(315)).toEqual({ align: "right", x: 1, y: 1 }));
  test("mid-drag snaps to nearest seat", () => expect(seatPlacement(-50).align).toBe("right"));
});

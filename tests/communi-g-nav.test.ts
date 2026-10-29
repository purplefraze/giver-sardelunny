import { expect, test } from "bun:test";
import { SEAT_TITLE, SEAT_ANGLE } from "../src/components/living-g/EarSelector";
import { LOWER_STATIONS, lowerAngle, lowerWord, nearestLower } from "../src/components/community/lower-stations";

test("6:00 seat is communi-g; 12:00 is My G", () => {
  expect(SEAT_TITLE.map).toBe("communi-g");
  expect(Math.round((SEAT_ANGLE.map * 180) / Math.PI)).toBe(-270);
  expect(SEAT_TITLE.giver).toBe("my g");
  expect(Math.round((SEAT_ANGLE.giver * 180) / Math.PI)).toBe(-90);
});
test("lower loop opens at its 6:00, labelled communi-g; no map seat, no 12:00 entry", () => {
  expect(lowerAngle("everything")).toBe(-180);
  expect(lowerWord("everything")).toBe("communi-g");
  expect(LOWER_STATIONS.some(s => (s.value as string) === "map")).toBe(false);
  expect(LOWER_STATIONS.some(s => s.angle === 0)).toBe(false);
  expect(nearestLower(-180)).toBe("everything");
});

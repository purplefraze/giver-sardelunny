import { expect, test } from "bun:test";
import { G_ANCHORS, G_GEOMETRY, G_REGION_NAMES, LIVING_G_PATH, LOOP_RIM_RADIUS, BOTTOM_LOOP_INTERIOR, EAR_GEOMETRY } from "../src/components/living-g/g-path";
import { SPARK_START, SPARK_END, SPARK_TRACK_D } from "../src/components/living-g/spark-track";

const rad = (d: number) => (d * Math.PI) / 180;
const at = (c: { x: number; y: number }, r: number, d: number) => ({ x: c.x + r * Math.cos(rad(d)), y: c.y + r * Math.sin(rad(d)) });
const near = (a: { x: number; y: number }, b: { x: number; y: number }, tol = 0.05) => expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(tol);

test("the G is built only from true arcs at one even stroke (no curves, no lines)", () => {
  expect(LIVING_G_PATH).not.toMatch(/[CcLlQqSsTtHhVv]/);
  expect(G_GEOMETRY.stroke).toBe(53.5);
  // every arc radius is a centre-line radius ± half the stroke (or the round cap)
  const half = G_GEOMETRY.stroke / 2;
  const allowed = [G_GEOMETRY.middle.r, G_GEOMETRY.s.r, G_GEOMETRY.bottom.r].flatMap(r => [r + half, r - half]).concat(half).map(r => Math.round(r * 100));
  for (const m of LIVING_G_PATH.matchAll(/A([\d.]+) /g)) expect(allowed).toContain(Math.round(Number(m[1]) * 10));
});

test("joins are tangent-continuous: circles touch exactly at the join points", () => {
  const { middle: M, s: S, bottom: B } = G_GEOMETRY;
  near(at(M.c, M.r, S.leaveDeg), at(S.c, S.r, S.leaveDeg + 180));
  near(at(S.c, S.r, S.joinDeg), at(B.c, B.r, B.joinDeg));
  expect(Math.abs(Math.hypot(M.c.x - S.c.x, M.c.y - S.c.y) - (M.r + S.r))).toBeLessThan(0.05);
  expect(Math.abs(Math.hypot(B.c.x - S.c.x, B.c.y - S.c.y) - (B.r + S.r))).toBeLessThan(0.05);
});

test("loops: middle unchanged, bottom is a circle sitting on the box foot, no ear", () => {
  expect(LOOP_RIM_RADIUS.middle).toBe(196.5);
  expect(G_GEOMETRY.bottom.c.y + LOOP_RIM_RADIUS.bottom).toBeCloseTo(1133, 6);
  expect(BOTTOM_LOOP_INTERIOR.rx).toBe(BOTTOM_LOOP_INTERIOR.ry);
  expect(BOTTOM_LOOP_INTERIOR.rx).toBeCloseTo(G_GEOMETRY.bottom.r - 26.75, 6);
  expect(LIVING_G_PATH.match(/M/g)?.length).toBe(2); // one outer contour + the middle hole: no seams, no ear ring
});

test("regions are toggle / middle / communi-g; toggle homes at 1:30 on its orbit", () => {
  expect(G_REGION_NAMES).toEqual({ top: "toggle", middle: "middle", bottom: "communi-g" });
  near(G_ANCHORS.toggle, at(G_ANCHORS.middle, 300, -45));
  near(EAR_GEOMETRY.home, G_ANCHORS.toggle);
});

test("spark rail runs on the exact centre line from middle loop to the cap", () => {
  near(SPARK_START, at(G_GEOMETRY.middle.c, G_GEOMETRY.middle.r, 52));
  near(SPARK_END, at(G_GEOMETRY.bottom.c, G_GEOMETRY.bottom.r, -58));
  expect(SPARK_TRACK_D.startsWith("M")).toBe(true);
});

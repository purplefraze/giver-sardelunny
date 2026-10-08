import { describe, expect, test } from "bun:test";
import { crossings, frameOf, inputAngle, scaleOf, settleDuration, signedTurn, trackPose, TRACK_WIDTH, SNAP_MS } from "../src/components/community/perimeter-geometry";

describe("Communi-G single-angle geometry", () => {
  test("Bentley lens expands and contracts only with progress, continuously across the seam", () => {
    expect(scaleOf(0)).toBeCloseTo(1.45, 8);
    expect(scaleOf(90)).toBeCloseTo(1.85, 8);
    expect(scaleOf(180)).toBeCloseTo(1.45, 8);
    for (let a = -720; a <= 720; a += 1) {
      expect(scaleOf(a)).toBeGreaterThanOrEqual(1.45);
      expect(scaleOf(a)).toBeLessThanOrEqual(1.85);
      expect(scaleOf(a + 360)).toBeCloseTo(scaleOf(a), 8);
      expect(frameOf(390, 844, a).scale).toBe(scaleOf(a));
      expect(Math.abs(scaleOf(a + .01) - scaleOf(a))).toBeLessThan(.0001);
    }
    expect(scaleOf(-.001)).toBeCloseTo(scaleOf(.001), 10);
  });
  test("tall-phone normalized input follows equal spatial angle steps and keeps stationary grab offset", () => {
    for (const h of [844, 932]) {
      const centre = { x: 195, y: h / 2 }, radii = { x: 141, y: h / 2 - 54 };
      for (let a = 0; a < 360; a += 5) {
        const bead = frameOf(390, h, a).bead, next = frameOf(390, h, a + 5).bead;
        const raw = inputAngle(bead, centre, radii), after = inputAngle(next, centre, radii);
        if (raw === null || after === null) throw new Error("accessible grip must have input angle");
        expect(signedTurn(raw, after)).toBeCloseTo(5, 8);
        expect(signedTurn(after, raw)).toBeCloseTo(-5, 8);
        expect(signedTurn(raw, inputAngle(bead, centre, radii) ?? 999)).toBe(0);
      }
    }
  });
  test("release never exceeds the requested 180ms and reduced motion is immediate", () => {
    expect(SNAP_MS).toBe(180);
    expect(settleDuration(180, false)).toBe(180);
    expect(settleDuration(22.5, false)).toBeLessThanOrEqual(180);
    expect(settleDuration(45, true)).toBe(0);
  });
  test("station crossing enumerates high-speed skips in either direction", () => {
    const seats = Array.from({ length: 8 }, (_, i) => ({ angle: i * 45, value: i }));
    expect(crossings(5, 145, seats)).toEqual([1, 2, 3]);
    expect(crossings(145, 5, seats)).toEqual([3, 2, 1]);
    expect(crossings(350, 460, seats)).toEqual([0, 1, 2]);
    expect(crossings(0, 720, seats)).toHaveLength(16);
    expect(crossings(45, 45, seats)).toEqual([]);
  });
  test("stable input holds still, preserves grab offset, and reverses over seam", () => {
    const centre = { x: 195, y: 422 }, point = { x: 200, y: 54 };
    const raw = inputAngle(point, centre);
    expect(raw).not.toBeNull();
    if (raw === null) throw new Error("expected input angle");
    expect(signedTurn(raw, raw)).toBe(0);
    expect(signedTurn(179, -179)).toBe(2);
    expect(signedTurn(-179, 179)).toBe(-2);
    expect(90 + signedTurn(raw, raw)).toBe(90);
  });
  test("all eight stations and intermediate points keep the full grip accessible", () => {
    for (const h of [844, 932]) for (let a = -720; a <= 720; a += 2.5) {
      const f = frameOf(390, h, a);
      expect(f.bead.x - 44).toBeGreaterThanOrEqual(0);
      expect(f.bead.x + 44).toBeLessThanOrEqual(390);
      expect(f.bead.y - 44).toBeGreaterThanOrEqual(0);
      expect(f.bead.y + 44).toBeLessThanOrEqual(h);
    }
  });
  test("paint and square arm contact share the same smooth curve", () => {
    expect(TRACK_WIDTH).toBe(17);
    for (let angle = 0; angle < 360; angle += 3) {
      const pose = trackPose(angle), frame = frameOf(390, 844, angle);
      const painted = { x: pose.point.x * frame.scale + frame.x, y: pose.point.y * frame.scale + frame.y };
      expect(Math.hypot(frame.root.x - painted.x, frame.root.y - painted.y)).toBeCloseTo(7.9, 6);
      expect(Math.hypot(pose.normal.x, pose.normal.y)).toBeCloseTo(1, 8);
      const next = frameOf(390, 844, angle + .01);
      expect(Math.hypot(next.x - frame.x, next.y - frame.y)).toBeLessThan(1);
    }
    expect(trackPose(0).point.x).toBeCloseTo(trackPose(360).point.x, 8);
    expect(trackPose(0).point.y).toBeCloseTo(trackPose(360).point.y, 8);
  });
});
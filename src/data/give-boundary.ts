/**
 * CITY BOUNDARY — !!! PLACEHOLDER !!!
 *
 * A ROUGH, HAND-TRACED TORONTO OUTLINE for the preview only. It is NOT the
 * real municipal boundary and must not be treated as one. Real data would be
 * the City of Toronto Open Data "Toronto Boundary" GeoJSON (no key) for one
 * city, or OSM admin boundaries (Nominatim `polygon_geojson=1`) for many,
 * cached server-side per city.
 */
import type { Pin } from "./give-pins";

export const CITY_NAME = "toronto";

/** PLACEHOLDER polygon, [lat, lng] pairs, clockwise from the south-west. */
export const PLACEHOLDER_CITY_BOUNDARY: [number, number][] = [
  [43.5846, -79.5436], // etobicoke creek mouth
  [43.6263, -79.5547],
  [43.6553, -79.5898],
  [43.7430, -79.6392], // north-west corner
  [43.8551, -79.1702], // north-east corner
  [43.7919, -79.1154],
  [43.7545, -79.1420],
  [43.6863, -79.2585], // scarborough bluffs
  [43.6539, -79.3182],
  [43.6286, -79.3530], // outer harbour
  [43.6255, -79.3950],
  [43.6285, -79.4450],
  [43.6100, -79.4800],
];

/** Placeholder city centre (nathan phillips square). */
export const CITY_CENTRE: Pin = { lat: 43.6534, lng: -79.3841 };

/** Ray casting point-in-polygon. Tiny and local — no dependency. */
export function insideCity(p: Pin, poly = PLACEHOLDER_CITY_BOUNDARY): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]!;
    const [yj, xj] = poly[j]!;
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** A point 200–400m from `p` in a random direction (never the exact spot). */
export function offsetPin(p: Pin, rnd = Math.random): Pin {
  const metres = 200 + rnd() * 200;
  const angle = rnd() * Math.PI * 2;
  const dLat = (metres * Math.cos(angle)) / 111_320;
  const dLng = (metres * Math.sin(angle)) / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

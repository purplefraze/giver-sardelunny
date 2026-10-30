import { ListingLine } from "./ListingLine";
import { memberById } from "@/data/giver";
import { itemsStore } from "@/data/items";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

import { CG_COLOUR, CG_INK, type MapPin } from "@/data/communigy";
import type { Pin } from "@/data/give-pins";
import { haptics } from "@/lib/haptics";
import { CITY_CENTRE } from "@/data/give-boundary";
import { NEIGHBOURHOOD_ZOOM, mapCameraKey } from "./map-view";

/**
 * COMMUNI-G'S MAP — THE PIN IS THE PRODUCT.
 *
 * Reuses the give flow's Leaflet setup (LocationPicker): Leaflet 1.9 loaded on
 * demand, OpenStreetMap tiles with visible attribution, no API key. The tiles
 * remain full colour, framed by the existing hollow. A red circle marks the nearby radius
 * round the person (their approximate, device-only location, or the city
 * centre until they allow it).
 *
 * Tapping a pin shows its line in a quiet card; a real listing opens its
 * detail from there. Sample pins (written sample activity) say so.
 */
const pinSvg = (colour: string) =>
  `<svg viewBox="0 0 30 40" width="26" height="35" aria-hidden="true"><path d="M15 39C15 39 28 23.5 28 14.5A13 13 0 0 0 2 14.5C2 23.5 15 39 15 39Z" style="fill:${colour}" stroke="var(--background)" stroke-width="1.6"/><circle cx="15" cy="14" r="4.4" fill="var(--background)"/></svg>`;

/** Overlays drawn above the full-bleed map (heading, filters, tools, note, ring). */
const MAP_OVERLAYS = ".cg-heading-row, [data-cg-upper-tools], [data-cg-results] > *, [data-cg-ring], .cg-map-attribution";
const PIN_W = 26, PIN_H = 35, EDGE = 12;

/**
 * Padding (px, from each edge of the map box) that keeps a whole pin clear of
 * every overlay and the screen edges. Overlays in the upper half push the top
 * down; those in the lower half push the bottom up. Null when there is no room.
 */
export function mapFreeInsets(el: HTMLElement): { top: number; bottom: number; left: number; right: number } | null {
  const box = el.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return null;
  const mid = box.top + box.height / 2;
  let top = box.top, bottom = box.bottom;
  for (const o of Array.from(document.querySelectorAll<HTMLElement>(MAP_OVERLAYS))) {
    if (el.contains(o) && !o.classList.contains("cg-map-attribution")) continue;
    const r = o.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || getComputedStyle(o).visibility === "hidden") continue;
    if (r.top + r.height / 2 < mid) top = Math.max(top, r.bottom);
    else bottom = Math.min(bottom, r.top);
  }
  const insets = {
    top: Math.round(top - box.top) + PIN_H + EDGE,
    bottom: Math.round(box.bottom - bottom) + EDGE,
    left: PIN_W / 2 + EDGE + 8,
    right: PIN_W / 2 + EDGE + 8,
  };
  return insets.top + insets.bottom < box.height - 40 ? insets : null;
}

export function CommunigyMap({
  pins,
  centre,
  radiusKm,
  onOpen,
  active = true,
}: {
  pins: MapPin[];
  centre: Pin | null;
  radiusKm: number | null;
  onOpen: (itemId: string) => void;
  /** true while the map view is showing (overlays laid out for the map). */
  active?: boolean;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const ring = useRef<Leaflet.Circle | null>(null);
  const me = useRef<Leaflet.CircleMarker | null>(null);
  const [ready, setReady] = useState(false);
  const [tileProblem, setTileProblem] = useState(false);
  const [picked, setPicked] = useState<MapPin | null>(null);

  const cameraKey = useRef<string | null>(null);
  const mapCentre = centre ?? (pins.some(p => p.sample) ? CITY_CENTRE : null);

  /* The map, once. */
  useEffect(() => {
    let dead = false;
    (async () => {
      const lib = (await import("leaflet")).default;
      if (dead || !box.current) return;
      L.current = lib;
      const m = lib
        .map(box.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.25, zoomAnimation:false, fadeAnimation:false, markerZoomAnimation:false })
        .setView(mapCentre ? [mapCentre.lat, mapCentre.lng] : [0, 0], mapCentre ? NEIGHBOURHOOD_ZOOM : 1);
      lib
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "",
        })
        .on("tileerror", () => setTileProblem(true))
        .addTo(m);
      layer.current = lib.layerGroup().addTo(m);
      map.current = m;
      m.on("click", () => setPicked(null));
      setReady(true);
    })();
    return () => {
      dead = true;
      map.current?.stop();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  /* The nearby circle and "you", wherever the centre is. */
  useEffect(() => {
    const lib = L.current;
    const m = map.current;
    if (!ready || !lib || !m) return;
    ring.current?.remove();
    me.current?.remove();
    const key = mapCameraKey(mapCentre);
    if (cameraKey.current !== key) {
      cameraKey.current = key;
      if (mapCentre) m.setView([mapCentre.lat, mapCentre.lng], NEIGHBOURHOOD_ZOOM);
    }
    if (!centre) return;
    /* Leaflet writes SVG presentation attributes, which cannot read var():
       resolve the red token to its value first. */
    const red =
      getComputedStyle(document.documentElement).getPropertyValue("--mode-communigy").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--mode-map").trim();
    if (radiusKm !== null) ring.current = lib
      .circle([centre.lat, centre.lng], {
        radius: radiusKm * 1000,
        color: red,
        weight: 1.5,
        opacity: 0.8,
        fillColor: red,
        fillOpacity: 0.05,
        interactive: false,
      })
      .addTo(m);
    me.current = lib
      .circleMarker([centre.lat, centre.lng], {
        radius: 6,
        color: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
        weight: 2,
        fillColor: red,
        fillOpacity: 1,
        interactive: false,
      })
      .addTo(m);

  }, [ready, centre?.lat, centre?.lng, mapCentre?.lat, mapCentre?.lng, radiusKm]);

  /* PINS NEVER START UNDER A CONTROL (anna pass3). Frame the pins once per pin set, when the map is actually on screen. */
  const fitted = useRef<MapPin[] | null>(null);
  useEffect(() => {
    const lib = L.current;
    const m = map.current;
    if (!ready || !lib || !m || !active || !pins.length || fitted.current === pins) return;
    const fit = () => {
      const el = box.current;
      if (!el || !map.current) return;
      const pad = mapFreeInsets(el);
      if (!pad) return;
      fitted.current = pins;
      m.invalidateSize(false);
      m.fitBounds(lib.latLngBounds(pins.map(p => [p.pin.lat, p.pin.lng] as [number, number])), {
        paddingTopLeft: [pad.left, pad.top],
        paddingBottomRight: [pad.right, pad.bottom],
        maxZoom: NEIGHBOURHOOD_ZOOM,
        animate: false,
      });
    };
    const raf = requestAnimationFrame(fit);
    const late = window.setTimeout(fit, 450);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(late); };
  }, [ready, pins, active]);

  /* One pin per listing, in its mode colour. */
  useEffect(() => {
    const lib = L.current;
    const group = layer.current;
    if (!ready || !lib || !group) return;
    group.clearLayers();
    setPicked(null);
    for (const p of pins) {
      const icon = lib.divIcon({
        className: "cg-pin",
        html: pinSvg(CG_COLOUR[p.mode]),
        iconSize: [26, 35],
        iconAnchor: [13, 34],
      });
      lib
        .marker([p.pin.lat, p.pin.lng], { icon, keyboard: true, title: `${p.mode}: ${p.text}` })
        .on("click", () => {
          haptics.selection();
          setPicked(p);
        })
        .addTo(group);
    }

  }, [ready, pins, centre]);

  return (
    <div className="cg-map-wrap" data-testid="communigy-map">
      <div ref={box} className="cg-map absolute inset-0" aria-label="map of nearby listings" />
      <a className="cg-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      {tileProblem ? <p className="cg-map-problem g-meta">map tiles unavailable · listing pins still work</p> : null}
      {picked ? (
        <div className="cg-map-card">
          <span className="cg-map-line"><ListingLine mode={picked.mode} text={picked.text} /></span>
          <span className="g-meta">{memberById(itemsStore.get().items.find(i => i.id === picked.itemId)?.ownerId ?? "")?.username ?? ""}{picked.sample ? " · demo" : ""}</span>
          {picked.itemId ? (
            <Button variant="ghost"
              type="button"
              className="cg-map-open"
              onClick={() => {
                haptics.light();
                if (picked.itemId) onOpen(picked.itemId);
              }}
            >
              open
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

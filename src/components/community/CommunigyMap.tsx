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

/**
 * COMMUNI-G'S MAP — THE PIN IS THE PRODUCT.
 *
 * Reuses the give flow's Leaflet setup (LocationPicker): Leaflet 1.9 loaded on
 * demand, OpenStreetMap tiles with visible attribution, no API key. The tiles
 * are kept PALE (grayscale, brighter, lower contrast — .cg-map in
 * styles.css) so the only colour on screen is the pins (each listing in its
 * own mode colour) and the red frame. A red circle marks the nearby radius
 * round the person (their approximate, device-only location, or the city
 * centre until they allow it).
 *
 * Tapping a pin shows its line in a quiet card; a real listing opens its
 * detail from there. Sample pins (written sample activity) say so.
 */
const pinSvg = (colour: string) =>
  `<svg viewBox="0 0 30 40" width="26" height="35" aria-hidden="true"><path d="M15 39C15 39 28 23.5 28 14.5A13 13 0 0 0 2 14.5C2 23.5 15 39 15 39Z" style="fill:${colour}" stroke="var(--background)" stroke-width="1.6"/><circle cx="15" cy="14" r="4.4" fill="var(--background)"/></svg>`;

export function CommunigyMap({
  pins,
  centre,
  radiusKm,
  onOpen,
}: {
  pins: MapPin[];
  centre: Pin | null;
  radiusKm: number;
  onOpen: (itemId: string) => void;
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

  /* The map, once. */
  useEffect(() => {
    let dead = false;
    (async () => {
      const lib = (await import("leaflet")).default;
      if (dead || !box.current) return;
      L.current = lib;
      const m = lib
        .map(box.current, { zoomControl: false, attributionControl: false, zoomAnimation:false, fadeAnimation:false, markerZoomAnimation:false })
        .setView(centre ? [centre.lat, centre.lng] : [0, 0], centre ? 13 : 1);
      lib.control.attribution({ position: "bottomright", prefix: false }).addTo(m);
      lib
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© openstreetmap contributors",
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
    if (!centre) return;
    /* Leaflet writes SVG presentation attributes, which cannot read var():
       resolve the red token to its value first. */
    const red =
      getComputedStyle(document.documentElement).getPropertyValue("--mode-communigy").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--mode-map").trim();
    ring.current = lib
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
    m.fitBounds(ring.current.getBounds(), { padding: [18, 18] });
  }, [ready, centre?.lat, centre?.lng, radiusKm]);

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
    if (!centre && pins.length) map.current?.fitBounds(lib.latLngBounds(pins.map(p => [p.pin.lat, p.pin.lng])), { padding: [24, 24], maxZoom: 13 });
  }, [ready, pins, centre]);

  return (
    <div className="cg-map-wrap relative min-h-0 flex-1" data-testid="communigy-map">
      <div ref={box} className="cg-map absolute inset-0" aria-label="map of nearby listings" />
      {tileProblem ? <p className="absolute top-2 left-2 right-2 z-[500] bg-background p-2 g-meta">map tiles unavailable · listing pins still work</p> : null}
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

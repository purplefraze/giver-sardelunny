import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Pin } from "@/data/give-pins";
import { nearbyCollectionPin, coarseCollectionPin } from "@/lib/collection-location";

/** Existing Leaflet provider, local approximate pin; no location lookup or guessed centre. */
export function CollectionMap({ pin, onChange, onProblem }: { pin: Pin; onChange: (pin: Pin) => void; onProblem: (message: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onChange, onProblem }); callbacks.current = { onChange, onProblem };
  useEffect(() => {
    let dead = false; let map: Leaflet.Map | undefined;
    const origin = pin;
    void import("leaflet").then(({ default: L }) => {
      if (dead || !box.current) return;
      map = L.map(box.current, { zoomControl: false, scrollWheelZoom: false }).setView([origin.lat, origin.lng], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 16 }).addTo(map);
      const ink = getComputedStyle(box.current).getPropertyValue("--mode-give").trim();
      const marker = L.marker([origin.lat, origin.lng], { draggable: true, title: "approximate collection pin", icon: L.divIcon({ className: "gv-collection-pin", html: "", iconSize: [22,22], iconAnchor: [11,11] }) }).addTo(map);
      L.circle([origin.lat, origin.lng], { radius: 600, color: ink, weight: 1, fillOpacity: .05, interactive: false }).addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        if (!nearbyCollectionPin(origin, point)) { marker.setLatLng([origin.lat, origin.lng]); callbacks.current.onProblem("keep the pin near the confirmed collection area"); return; }
        const approximate = coarseCollectionPin(point); marker.setLatLng([approximate.lat, approximate.lng]); callbacks.current.onChange(approximate);
      });
      const observer = new ResizeObserver(() => map?.invalidateSize()); observer.observe(box.current);
      map.on("unload", () => observer.disconnect());
    }).catch(() => callbacks.current.onProblem("map preview is unavailable; your approximate area is kept"));
    return () => { dead = true; map?.remove(); };
  }, []);
  return <div ref={box} className="gv-collection-map" aria-label="approximate collection map" />;
}
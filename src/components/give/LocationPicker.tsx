import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CITY_CENTRE,
  CITY_NAME,
  PLACEHOLDER_CITY_BOUNDARY,
  insideCity,
  offsetPin,
} from "@/data/give-boundary";
import type { Pin } from "@/data/give-pins";
import { haptics } from "@/lib/haptics";

/**
 * WHERE IS IT? — one full-screen map (/workspace/giver-give-infer/
 * give-infer-location.png): the prompt and a thin search line at the top,
 * three quiet choices, the map with a draggable seat-colour pin, the city
 * boundary as a thin seat-colour line, one quiet footer line and the done
 * circle.
 *
 * MAP: Leaflet + OpenStreetMap tiles (attribution shown), no API key.
 * SEARCH + LABELS: Nominatim (no key), only on explicit actions (search
 * submit, done) — the OSM tile and Nominatim policies forbid heavy use; a
 * production build needs a key-based provider (MapTiler/Mapbox/Stadia tiles,
 * a paid geocoder) configured through env, never hard-coded.
 *
 * PRIVACY: the exact pin is returned to the caller, which keeps it on this
 * device only (give-pins.ts). Only the coarse label is ever made public.
 */

export type WhereMode = "mine" | "neighbourhood" | "intersection";
export type WhereAnswer = { pin: Pin; label: string; mode: WhereMode };

const CHOICES: { mode: WhereMode; text: string }[] = [
  { mode: "mine", text: "use my location" },
  { mode: "neighbourhood", text: "my neighbourhood" },
  { mode: "intersection", text: "a nearby intersection" },
];

/* The done circle's geometry (CSS below): the boundary line keeps clear of it. */
const DONE = { right: 30, bottom: 52, size: 80, air: 14 };

const NOMINATIM = "https://nominatim.openstreetmap.org";

async function reverseLabel(pin: Pin, mode: WhereMode): Promise<string> {
  try {
    const r = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=${pin.lat}&lon=${pin.lng}`,
      { headers: { Accept: "application/json" } },
    );
    const j = (await r.json()) as { address?: Record<string, string> };
    const a = j.address ?? {};
    const hood = a["neighbourhood"] ?? a["suburb"] ?? a["quarter"] ?? a["city_district"];
    if (mode === "intersection" && a["road"]) return `near ${a["road"]}`.toLowerCase();
    return (hood ?? CITY_NAME).toLowerCase();
  } catch {
    return CITY_NAME;
  }
}

async function searchPlace(q: string): Promise<Pin | null> {
  try {
    const r = await fetch(
      `${NOMINATIM}/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${q}, ${CITY_NAME}`)}`,
      { headers: { Accept: "application/json" } },
    );
    const j = (await r.json()) as { lat: string; lon: string }[];
    const hit = j[0];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

/** A default pin a few blocks from the home area — never the exact spot. */
function defaultPin(): Promise<Pin> {
  return new Promise((resolve) => {
    const fallback = () => resolve(offsetPin(CITY_CENTRE));
    if (typeof navigator === "undefined" || !navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!insideCity(here)) return fallback();
        /* the offset must stay inside the city too (the lake edge) */
        for (let i = 0; i < 8; i++) {
          const p = offsetPin(here);
          if (insideCity(p)) return resolve(p);
        }
        fallback();
      },
      fallback,
      { timeout: 4000, maximumAge: 600000 },
    );
  });
}

export function LocationPicker({
  prompt,
  initial,
  onDone,
  onBack,
}: {
  prompt: string;
  initial?: WhereAnswer | null;
  onDone: (answer: WhereAnswer) => void;
  onBack: () => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const area = useRef<Leaflet.Circle | null>(null);
  const lastValid = useRef<Pin>(initial?.pin ?? offsetPin(CITY_CENTRE, () => 0.5));
  const [mode, setMode] = useState<WhereMode>(initial?.mode ?? "neighbourhood");
  const [query, setQuery] = useState("");
  const [say, setSay] = useState<string | null>(null);
  const [line, setLine] = useState<string>("");
  const [busy, setBusy] = useState(false);

  /* The boundary is drawn in our own SVG over the map, projected on every
     move, so it can be masked away from the done circle. */
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [screenPts, setScreenPts] = useState("");

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onBack]);

  const place = (p: Pin, fly = false) => {
    if (!insideCity(p)) {
      /* SNAP BACK — quietly, no modal, no red. */
      marker.current?.setLatLng([lastValid.current.lat, lastValid.current.lng]);
      area.current?.setLatLng([lastValid.current.lat, lastValid.current.lng]);
      setSay("gives stay in your city");
      haptics.warning();
      return false;
    }
    lastValid.current = p;
    marker.current?.setLatLng([p.lat, p.lng]);
    area.current?.setLatLng([p.lat, p.lng]);
    if (fly) map.current?.setView([p.lat, p.lng], Math.max(map.current.getZoom(), 15));
    setSay(null);
    return true;
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !box.current) return;
      const start = initial?.pin ?? (await defaultPin());
      if (dead || !box.current) return;
      lastValid.current = start;
      const m = L.map(box.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([start.lat, start.lng], 15);
      /* OSM attribution stays visible, top right — clear of the done circle. */
      L.control.attribution({ position: "topright", prefix: false }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© openstreetmap contributors",
      }).addTo(m);
      const icon = L.divIcon({
        className: "gf-pin",
        html: `<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 39C15 39 28 23.5 28 14.5A13 13 0 0 0 2 14.5C2 23.5 15 39 15 39Z" fill="var(--form-seat)"/><circle cx="15" cy="14" r="4.6" fill="#fff"/></svg>`,
        iconSize: [30, 40],
        iconAnchor: [15, 39],
      });
      area.current = L.circle([start.lat, start.lng], {
        radius: 260,
        color: "var(--form-seat)",
        weight: 1,
        opacity: 0.35,
        fillColor: "var(--form-seat)",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(m);
      const mk = L.marker([start.lat, start.lng], { icon, draggable: true, keyboard: true, title: "your pin" }).addTo(m);
      mk.on("drag", () => area.current?.setLatLng(mk.getLatLng()));
      mk.on("dragend", () => {
        const ll = mk.getLatLng();
        place({ lat: ll.lat, lng: ll.lng });
      });
      marker.current = mk;
      map.current = m;
      const project = () => {
        const s = m.getSize();
        setSize({ w: s.x, h: s.y });
        setScreenPts(
          PLACEHOLDER_CITY_BOUNDARY.map(([lat, lng]) => {
            const pt = m.latLngToContainerPoint([lat, lng]);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          }).join(" "),
        );
      };
      m.on("move zoom viewreset resize", project);
      project();
    })();
    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (next: WhereMode) => {
    haptics.selection();
    setMode(next);
    if (next !== "mine") return;
    if (!navigator.geolocation) {
      setLine("location isn’t available here — drag the pin instead");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => place({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true),
      () => setLine("location is off — drag the pin instead"),
      { timeout: 6000 },
    );
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    const hit = await searchPlace(q);
    setBusy(false);
    if (!hit) {
      setLine("couldn’t find that — try a street or intersection");
      return;
    }
    setLine("");
    place(hit, true);
  };

  const done = async () => {
    haptics.light();
    setBusy(true);
    const pin = lastValid.current;
    const label = await reverseLabel(pin, mode);
    setBusy(false);
    onDone({ pin, label, mode });
  };

  const doneCx = size.w - DONE.right - DONE.size / 2;
  const doneCy = size.h - DONE.bottom - DONE.size / 2;

  return (
    <div className="gf-map-screen" data-testid="give-map">
      <div ref={box} className="gf-map" aria-label="map" />
      {size.w ? (
        <svg className="gf-boundary" width={size.w} height={size.h} aria-hidden="true">
          <defs>
            <mask id="gf-boundary-mask" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width={size.w} height={size.h} fill="#fff" />
              <circle cx={doneCx} cy={doneCy} r={DONE.size / 2 + DONE.air} fill="#000" />
            </mask>
          </defs>
          <polygon
            points={screenPts}
            fill="none"
            stroke="var(--form-seat)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            mask="url(#gf-boundary-mask)"
          />
        </svg>
      ) : null}
      <div className="gf-map-top">
        <button type="button" className="gf-map-back" onClick={onBack} aria-label="back">
          ‹
        </button>
        <span className="uf-label">{prompt}</span>
        <input
          className="gf-search"
          value={query}
          placeholder="search a street or intersection"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
          aria-label="search a street or intersection"
        />
        <div className="gf-choices" role="radiogroup" aria-label="where">
          {CHOICES.map((c) => (
            <button
              key={c.mode}
              type="button"
              role="radio"
              aria-checked={mode === c.mode}
              className="gf-choice"
              onClick={() => choose(c.mode)}
            >
              {c.text}
            </button>
          ))}
        </div>
      </div>
      <p className="gf-map-foot" role="status">
        {say ?? (line || (mode === "intersection" ? "others only see the nearest street" : "others only see your neighbourhood"))}
      </p>
      <button
        type="button"
        className="gf-done"
        aria-label="done"
        disabled={busy}
        onClick={() => void done()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12.5 10.2 16.5 18 8" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

import type { Pin } from "@/data/give-pins";
export const NEIGHBOURHOOD_ZOOM = 15;
/** Radius is a search rule, never a camera zoom rule. */
export const mapCameraKey = (centre: Pin | null) => centre ? `${centre.lat}:${centre.lng}` : "unknown";
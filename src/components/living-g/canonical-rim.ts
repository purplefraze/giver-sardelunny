import { G_GEOMETRY, LOOP_CENTRE, wedgePath } from "./g-path";

const centre=LOOP_CENTRE.middle;
/** The redrawn middle loop is a TRUE circle (G_GEOMETRY.middle): its stroke
 * centre line is 169.75 at every angle. No flare, no dip, no second track. */
export function canonicalRimRadius(_degrees:number) {
  return G_GEOMETRY.middle.r;
}
export const CANONICAL_EAR_MASK = wedgePath(centre,-64,-24,130,440);
export const CANONICAL_RIM_PATH = Array.from({length:113},(_,i)=> {
  const d=-70+i*.5,r=canonicalRimRadius(d),a=d*Math.PI/180;
  return `${i?"L":"M"} ${centre.x+r*Math.cos(a)} ${centre.y+r*Math.sin(a)}`;
}).join(" ");
/** The S-curve's right-hand turn, centre line, at height y (exact: it is the
 * circle G_GEOMETRY.s). Valid across the turn, |y - s.c.y| <= s.r. */
export function canonicalConnectorCentre(y:number) {
  const {c,r}=G_GEOMETRY.s, dy=y-c.y;
  if(Math.abs(dy)>r)throw new Error("canonical connector cross-section missing");
  return {x:c.x+Math.sqrt(r*r-dy*dy),y};
}

/** Closed middle rim: the true middle circle. */
export const CANONICAL_MIDDLE_PATH = Array.from({length:721},(_,i)=>{
  const d=-70+i*.5,r=canonicalRimRadius(d>180?d-360:d),a=d*Math.PI/180;
  return `${i?"L":"M"} ${centre.x+r*Math.cos(a)} ${centre.y+r*Math.sin(a)}`;
}).join(" ")+" Z";

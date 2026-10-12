import svgpath from "svgpath";
import { LIVING_G_PATH, LIVING_G_TRANSFORM, LOOP_CENTRE, wedgePath } from "./g-path";

/** Read-only contour measurement. The old circular rim patch met the eroded
 * traced rim at different radii, leaving a persistent nick at the ear cut. */
const contour: {x:number;y:number}[] = [];
svgpath(LIVING_G_PATH).transform(LIVING_G_TRANSFORM).abs().unshort().unarc().iterate((s,_i,x,y) => {
  if(s[0]==="M"||s[0]==="L") contour.push({x:s[1],y:s[2]});
  if(s[0]==="C") for(let i=1;i<=80;i++) {
    const t=i/80,v=1-t;
    contour.push({x:v*v*v*x+3*v*v*t*s[1]+3*v*t*t*s[3]+t*t*t*s[5],y:v*v*v*y+3*v*v*t*s[2]+3*v*t*t*s[4]+t*t*t*s[6]});
  }
});
const centre=LOOP_CENTRE.middle;
function edges(degrees:number) {
  const a=degrees*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),hits:number[]=[];
  for(let i=1;i<contour.length;i++) {
    const p=contour[i-1],q=contour[i]; if(!p||!q)continue;
    const ex=q.x-p.x,ey=q.y-p.y,det=dx*ey-dy*ex;
    if(Math.abs(det)<1e-9)continue;
    const px=p.x-centre.x,py=p.y-centre.y,r=(px*ey-py*ex)/det,u=(px*dy-py*dx)/det;
    if(r>0&&u>=0&&u<=1)hits.push(r);
  }
  hits.sort((a,b)=>a-b);
  return {inner:hits[0]??143,outer:hits[1]??197};
}
const before=edges(-60),after=edges(-30);
/** The ear flare obscures the outer contour only across this span. Continue
 * its measured neighbouring radii, retaining the actual inner contour. */
export function canonicalRimRadius(degrees:number) {
  if(degrees>=38&&degrees<=104) {
    const t=Math.min(1,Math.max(0,(degrees-50)/28));
    return 170.75+7*t*t*(3-2*t);
  }
  const measured=edges(degrees);
  const outer=degrees>-60&&degrees<-30?before.outer+(after.outer-before.outer)*(degrees+60)/30:measured.outer;
  return (measured.inner+outer)/2;
}
export const CANONICAL_EAR_MASK = wedgePath(centre,-64,-24,130,440);
export const CANONICAL_RIM_PATH = Array.from({length:113},(_,i)=> {
  const d=-70+i*.5,r=canonicalRimRadius(d),a=d*Math.PI/180;
  return `${i?"L":"M"} ${centre.x+r*Math.cos(a)} ${centre.y+r*Math.sin(a)}`;
}).join(" ");
/** Horizontal ink cross-sections on the canonical connector's narrow neck. */
export function canonicalConnectorCentre(y:number) {
  const hits:number[]=[];
  for(let i=1;i<contour.length;i++) {
    const a=contour[i-1],b=contour[i]; if(!a||!b||(a.y>y)===(b.y>y))continue;
    hits.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));
  }
  hits.sort((a,b)=>a-b);
  const right=hits.at(-1),left=hits.at(-2);
  if(right===undefined||left===undefined)throw new Error("canonical connector cross-section missing");
  return {x:(left+right)/2,y};
}

/** Closed middle rim derived from the same contour, not a substitute circle. */
export const CANONICAL_MIDDLE_PATH = Array.from({length:721},(_,i)=>{
  const d=-70+i*.5,r=canonicalRimRadius(d>180?d-360:d),a=d*Math.PI/180;
  return `${i?"L":"M"} ${centre.x+r*Math.cos(a)} ${centre.y+r*Math.sin(a)}`;
}).join(" ")+" Z";

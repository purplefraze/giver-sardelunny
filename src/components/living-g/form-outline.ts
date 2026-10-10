import svgpath from "svgpath";
import Clipper from "clipper-lib";
import { EAR_CUT, LIVING_G_PATH, LOOP_CENTRE, RIM_PATCH, arcPath, wedgePath } from "./g-path";
import { MIDDLE_CLOSE } from "./loop-close";

export type Point = { x: number; y: number };
export type OutlinePose = { x: number; y: number; scale: number };
const C = LOOP_CENTRE.middle;
const U = 100;
const ip = (p: Point) => ({ X: Math.round(p.x * U), Y: Math.round(p.y * U) });
function flatten(d: string): Point[][] {
  const paths: Point[][] = []; let points: Point[] = [];
  svgpath(d).abs().unshort().unarc().iterate((s, _i, x, y) => {
    if (s[0] === "M") { points = [{ x: s[1], y: s[2] }]; paths.push(points); }
    if (s[0] === "L") points.push({ x: s[1], y: s[2] });
    if (s[0] === "H") points.push({ x: s[1], y });
    if (s[0] === "V") points.push({ x, y: s[1] });
    if (s[0] === "C") {
      const count = Math.max(3, Math.ceil((Math.hypot(s[1]-x,s[2]-y)+Math.hypot(s[3]-s[1],s[4]-s[2])+Math.hypot(s[5]-s[3],s[6]-s[4]))/2));
      for (let i=1;i<=count;i++) { const t=i/count, a=1-t; points.push({ x:a*a*a*x+3*a*a*t*s[1]+3*a*t*t*s[3]+t*t*t*s[5], y:a*a*a*y+3*a*a*t*s[2]+3*a*t*t*s[4]+t*t*t*s[6] }); }
    }
  });
  return paths;
}
function boolean(subject: Clipper.Paths, clip: Clipper.Paths, kind: Clipper.ClipType) {
  const c=new Clipper.Clipper(); c.AddPaths(subject,Clipper.PolyType.ptSubject,true); c.AddPaths(clip,Clipper.PolyType.ptClip,true);
  const result: Clipper.Paths=[]; c.Execute(kind,result,Clipper.PolyFillType.pftNonZero,Clipper.PolyFillType.pftNonZero); return result;
}
function stroke(d:string,width:number) {
  const offset=new Clipper.ClipperOffset(2,.1*U); offset.AddPaths(flatten(d).map(p=>p.map(ip)),Clipper.JoinType.jtRound,Clipper.EndType.etOpenRound);
  const out:Clipper.Paths=[]; offset.Execute(out,width/2*U); return out;
}
/** Exact source artwork, eroded like GThinMask, with the live ear cut/patch.
 * Only derived polygons are changed; the canonical traced file is untouched. */
const source = (() => {
  const paths=flatten(svgpath(LIVING_G_PATH).transform("translate(0,1133) scale(0.1,-0.1)").toString()).map(p=>p.map(ip));
  const off=new Clipper.ClipperOffset(2,.08*U); off.AddPaths(paths,Clipper.JoinType.jtRound,Clipper.EndType.etClosedPolygon);
  const eroded:Clipper.Paths=[]; off.Execute(eroded,-12.5*U);
  let art=boolean(eroded,flatten(wedgePath(C,EAR_CUT.a0,EAR_CUT.a1,EAR_CUT.r0,EAR_CUT.r1)).map(p=>p.map(ip)),Clipper.ClipType.ctDifference);
  art=boolean(art,stroke(arcPath(C,RIM_PATCH.a0,RIM_PATCH.a1,RIM_PATCH.rMid),28.5),Clipper.ClipType.ctUnion);
  const m=MIDDLE_CLOSE; const pts:Point[]=[];
  for(let d=m.from;d<=m.to;d++){const t=Math.min(1,Math.max(0,(d-m.easeFrom)/(m.easeTo-m.easeFrom)));const r=m.rFrom+(m.rTo-m.rFrom)*t*t*(3-2*t);pts.push({x:C.x+r*Math.cos(d*Math.PI/180),y:C.y+r*Math.sin(d*Math.PI/180)});}
  art=boolean(art,stroke(`M${pts.map(p=>`${p.x} ${p.y}`).join(" L")}`,28.5),Clipper.ClipType.ctUnion);
  return art.map(p=>p.map(v=>({x:v.X/U,y:v.Y/U})));
})();

// Radial intersections of the *measured* closed middle hollow, not an ellipse.
function band(angle:number) {
  const dx=Math.cos(angle),dy=Math.sin(angle); const hits:number[]=[];
  for(const poly of source) for(let i=0;i<poly.length;i++) {
    const p=poly[i],q=poly[(i+1)%poly.length]; if(!p||!q)continue;
    const ex=q.x-p.x,ey=q.y-p.y,det=dx*ey-dy*ex; if(Math.abs(det)<1e-8)continue;
    const px=p.x-C.x,py=p.y-C.y,r=(px*ey-py*ex)/det,u=(px*dy-py*dx)/det;
    if(r>0&&u>=0&&u<=1) hits.push(r);
  }
  hits.sort((a,b)=>a-b); const inner=hits[0]??155;
  return {inner,outer:hits.find(r=>r>inner+1)??inner+28.5};
}
const bands=Array.from({length:1440},(_,i)=>band(i*Math.PI/720));
function measured(a:number){const n=((a/(Math.PI*2)*1440)%1440+1440)%1440;const i=Math.floor(n);const p=bands[i],q=bands[(i+1)%1440];if(!p||!q)return {inner:155,outer:184};const t=n-i;return {inner:p.inner+(q.inner-p.inner)*t,outer:p.outer+(q.outer-p.outer)*t};}
/** Ray intersection with a rounded rectangle, including curved corners. */
function roundedRadius(a:number,hw:number,hh:number,r:number) {
  const x=Math.abs(Math.cos(a)),y=Math.abs(Math.sin(a));
  const vertical=hw/Math.max(x,1e-9),horizontal=hh/Math.max(y,1e-9);
  if(vertical*y<=hh-r)return vertical;
  if(horizontal*x<=hw-r)return horizontal;
  const cx=hw-r,cy=hh-r,d=cx*x+cy*y;
  return d+Math.sqrt(Math.max(0,r*r-cx*cx-cy*cy+d*d));
}
export function warpOutlinePoint(p:Point,t:number,pose:OutlinePose,w:number,h:number):Point {
  const a=Math.atan2(p.y-C.y,p.x-C.x),r=Math.hypot(p.x-C.x,p.y-C.y),b=measured(a);
  const inner=roundedRadius(a,Math.max(1,w/2-10),Math.max(1,h/2-10),20);
  const outer=roundedRadius(a,w/2,h/2,30);
  const target=r<b.inner ? r/b.inner*inner : r<=b.outer ? inner+(r-b.inner)/(b.outer-b.inner)*(outer-inner) : outer+(r-b.outer)*pose.scale*1.3;
  const start={x:pose.x+p.x*pose.scale,y:pose.y+p.y*pose.scale};
  const end={x:w/2+Math.cos(a)*target,y:h/2+Math.sin(a)*target};
  return {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
}
function dense(poly:Point[]){const out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(!a||!b)continue;const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));for(let j=0;j<n;j++)out.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});}return out;}
function pathOf(polys:Point[][],warp:(p:Point)=>Point){return polys.map(p=>`M${dense(p).map(v=>{const q=warp(v);return `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;}).join(" L")} Z`).join(" ");}
export function formOutline(t:number,pose:OutlinePose,w:number,h:number){return pathOf(source,p=>warpOutlinePoint(p,t,pose,w,h));}
export function movingEar(t:number,pose:OutlinePose,w:number,h:number,angle:number){
  const a=angle, nx=Math.cos(a),ny=Math.sin(a),cx=C.x+283.1*nx,cy=C.y+283.1*ny;
  const ring=(r:number)=>Array.from({length:160},(_,i)=>({x:cx+r*Math.cos(i*Math.PI/80),y:cy+r*Math.sin(i*Math.PI/80)}));
  const root=176,tip=225.7;
  const stem=[{x:root,y:-10},{x:tip,y:-10},{x:tip,y:10},{x:root,y:10}].map(p=>({x:C.x+p.x*nx-p.y*ny,y:C.y+p.x*ny+p.y*nx}));
  const outer=ring(74.6).map(ip),hole=ring(57.4).map(ip); const band=boolean([outer],[hole],Clipper.ClipType.ctDifference);const art=boolean(band,[stem.map(ip)],Clipper.ClipType.ctUnion);return pathOf(art.map(poly=>poly.map(v=>({x:v.X/U,y:v.Y/U}))),p=>warpOutlinePoint(p,t,pose,w,h));
}
import {expect,test} from "bun:test";
import { lowerAngle, lowerWord, lowerToken } from "@/components/community/lower-stations";
import { feedFor } from "@/components/community/CommunityFeed";
import { spatialCameraPose } from "@/components/living-g/spatial-camera";
import { suggestedConnections } from "@/lib/suggested-connections";
import type { Item } from "@/data/items";
import { isWishReviewPath, wishReviewOpen } from "@/lib/wish-review-access";
const row=(id:string,text:string,ownerId="someone"):Item=>({id,text,ownerId,type:"give",status:"active",published:true,createdAt:1,updatedAt:1,priority:0,boostCount:0});
test("November lower home is six, own My G is twelve, with blue own bead",()=>{
  expect(lowerAngle("everything")).toBe(-180);expect(lowerAngle("mine")).toBe(0);expect(lowerWord("mine")).toBe("my g");expect(lowerToken("mine")).toBe("--mode-giver");
});
test("My G aggregates only current user's published active posts",()=>{
  const own=row("own","bike","me"),other=row("other","bike");
  expect(feedFor([own,other],"mine").map(i=>i.id)).toEqual(["own"]);
});
test.each([[320,568],[390,844],[430,932]])("camera is continuous and oriented at phone width %s",(w,h)=>{
  const start=spatialCameraPose("bottom","top",0),end=spatialCameraPose("bottom","top",1);
  expect(start.scale).toBe(2.62);expect(end.scale).toBe(2.62);expect(start.y).toBeGreaterThan(end.y);
  expect(spatialCameraPose("bottom","top",.5).scale).toBe(1);
  for(let t=0;t<1;t+=.005){const a=spatialCameraPose("bottom","top",t),b=spatialCameraPose("bottom","top",t+.005);expect(Math.abs((a.y-b.y)*h/100)).toBeLessThan(h*.03);expect(Math.abs((a.scale-b.scale)*w)).toBeLessThan(w*.06);}
});
test.each([["cake desired","cake baking offered"],["dog walking twice weekly","nearby dog walker"],["science tutoring","science tutor"]])("semantic suggestion: %s",(wish,offer)=>{
  expect(suggestedConnections(wish,[row("offer",offer)]).map(m=>m.item.id)).toEqual(["offer"]);
});
test("suggestions never include own, inactive or unknown-location offers in a radius",()=>{
  expect(suggestedConnections("cake",[row("own","cake","me"),{...row("closed","cake"),status:"archived"}],{ownerId:"me"})).toEqual([]);
  expect(suggestedConnections("cake",[row("unknown","cake")],{centre:{lat:0,lng:0},radiusKm:5,pin:()=>null})).toEqual([]);
});
test("November review is isolated but published host remains denied",()=>{expect(isWishReviewPath("/review/november")).toBe(true);expect(isWishReviewPath("/review/november/other")).toBe(false);expect(wishReviewOpen({DEV:false},"giver-sardelunny.lovable.app")).toBe(false);});
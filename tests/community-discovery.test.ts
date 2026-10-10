import { expect,test } from "bun:test";
import { arrangeFeed } from "@/components/community/CommunityFeed";
import type { Item } from "@/data/items";
const rows=[{id:"near",createdAt:100},{id:"far",createdAt:300},{id:"unknown",createdAt:200}].map(x=>({...x,type:"give",ownerId:"fixture",text:x.id,status:"active",published:true,priority:0,updatedAt:x.createdAt,boostCount:0} as Item));
const pins=(id:string)=>id==="near"?{lat:0,lng:.03}:id==="far"?{lat:0,lng:.07}:null;
test("latest and oldest use timestamps with stable order",()=>{expect(arrangeFeed(rows,"latest",null,null,pins).map(x=>x.id)).toEqual(["far","unknown","near"]);expect(arrangeFeed(rows,"oldest",null,null,pins).map(x=>x.id)).toEqual(["near","unknown","far"]);});
test("nearest excludes unknowns from first position",()=>expect(arrangeFeed(rows,"nearest",{lat:0,lng:0},null,pins).map(x=>x.id)).toEqual(["near","far","unknown"]));
test("5 km and 10 km filter actual coordinates, never invented distances",()=>{expect(arrangeFeed(rows,"latest",{lat:0,lng:0},5,pins).map(x=>x.id)).toEqual(["near"]);expect(arrangeFeed(rows,"latest",{lat:0,lng:0},10,pins).map(x=>x.id)).toEqual(["far","near"]);});

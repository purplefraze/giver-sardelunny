import { profileLoop } from "../components/living-g/profile-loop";
import { MEMBERS } from "../data/giver";
for (const m of MEMBERS) {
  const mid = profileLoop({anchor:{x:284,y:311},region:"middle",blocks:[
    {text:m.age,role:"primary"},{text:"by day",role:"secondary",lead:true},{text:m.byDay,role:"primary"},
    {text:"by night",role:"secondary",lead:true},{text:m.byNight,role:"primary"},
    {text:"on the weekends",role:"secondary",lead:true},{text:m.weekend,role:"primary"}]});
  const bot = profileLoop({anchor:{x:270,y:853},region:"bottom",blocks:m.bottom});
  console.log(m.id, (mid as any).props.children.length, (bot as any).props.children.length);
}

import maya from "@/assets/maya.jpg";
import john from "@/assets/john.jpg";
import sofia from "@/assets/sofia.jpg";
import me from "@/assets/me.jpg";

export type Member = {
  id: string;
  name: string;
  photo: string;
  blurb: string;
  mode: "Wishing" | "Giving" | "Trading";
  activity: string;
  about: string;
};

export const MEMBERS: Member[] = [
  {
    id: "maya",
    name: "Maya",
    photo: maya,
    blurb: "Two streets over. Keeps the plant swap alive.",
    mode: "Wishing",
    activity: "Wishing for a sewing machine for a month — mending everyone's coats.",
    about: "Maya, 29. Fixes things. Terrible at asking for help, learning fast.",
  },
  {
    id: "john",
    name: "John",
    photo: john,
    blurb: "Retired carpenter. Shed full of tools.",
    mode: "Giving",
    activity: "Giving away a full set of garden tools. Free to whoever digs.",
    about: "John, 58. Believes a thing unused is a thing wasted.",
  },
  {
    id: "sofia",
    name: "Sofia",
    photo: sofia,
    blurb: "Bakes far too much bread on Sundays.",
    mode: "Trading",
    activity: "Trading sourdough loaves for help with her bike chain.",
    about: "Sofia, 34. Trades in flour, favours and very strong coffee.",
  },
];

export const ME = {
  name: "You",
  photo: me,
  activity: "You gave 50 Sparks. Your first act of generosity.",
  about: "New here. Curious. Reckons kindness is currency.",
};

export const COMMUNITY_WISHES = [
  "A ladder for one afternoon — Ravi, 300m",
  "Someone to walk Bess on Thursdays — Aggie, 1.1km",
  "Cot mattress, any condition — Nell, 700m",
];

export const COMMUNITY_GIVES = [
  "Six bags of apples. Come and take them — Tom, 400m",
  "Free piano lessons, Sundays — Ines, 900m",
  "Two winter coats, kids age 6 — Sam, 1.4km",
];

export const SEARCH_RESULTS = [
  "Sewing machine — 3 nearby",
  "Garden tools — 5 nearby",
  "Sourdough — 2 nearby",
];

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
  /** World palette used for this person's Living G. */
  world: "give" | "wish" | "trade";
  /** Their current activity, kept to a handful of words. */
  headline: string;
  activity: string;
  about: string;
  /** Two short lines maximum. */
  aboutLines: string[];
};

export const MEMBERS: Member[] = [
  {
    id: "maya",
    name: "Maya",
    photo: maya,
    blurb: "Two streets over. Keeps the plant swap alive.",
    mode: "Giving",
    world: "give",
    headline: "Haircuts",
    activity: "Giving haircuts on her back step, Saturday mornings.",
    about: "Maya, 29. Fixes things. Terrible at asking for help, learning fast.",
    aboutLines: ["Maya, 29.", "Cuts hair. Fixes things."],
  },
  {
    id: "john",
    name: "John",
    photo: john,
    blurb: "Retired carpenter. Shed full of tools.",
    mode: "Wishing",
    world: "wish",
    headline: "A lift on Tuesdays",
    activity: "Wishing for a lift to the allotment on Tuesdays.",
    about: "John, 58. Believes a thing unused is a thing wasted.",
    aboutLines: ["John, 58.", "Carpenter. Bad knees."],
  },
  {
    id: "sofia",
    name: "Sofia",
    photo: sofia,
    blurb: "Bakes far too much bread on Sundays.",
    mode: "Trading",
    world: "trade",
    headline: "Bread for bike repairs",
    activity: "Trading sourdough loaves for help with her bike chain.",
    about: "Sofia, 34. Trades in flour, favours and very strong coffee.",
    aboutLines: ["Sofia, 34.", "Bakes too much bread."],
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

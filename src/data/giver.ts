import giuliaAsset from "@/assets/giulia.jpg.asset.json";
import sofiaAsset from "@/assets/sofia-profile.jpg.asset.json";
import robinAsset from "@/assets/robin.jpg.asset.json";
import me from "@/assets/me.jpg";

export type Member = {
  id: string;
  name: string;
  /** Public identity — usernames, never real names. */
  username: string;
  photo: string;
  blurb: string;
  mode: "Wishing" | "Giving" | "Trading";
  /** Role colour world: GIVING yellow, WISHING blue, TRADING trade colour. */
  world: "giving" | "wishing" | "trading";
  /** Their current activity, kept to a handful of words. */
  headline: string;
  activity: string;
  about: string;
  /** Two or three short lines maximum. */
  aboutLines: string[];
  /** Word above their current activity, inside the bottom loop. */
  bottomKicker: string;
  /** Their activity, one idea per line, inside the bottom loop. */
  bottomLines: string[];
};

export const MEMBERS: Member[] = [
  {
    id: "giulia",
    name: "Giulia",
    username: "@giulia",
    photo: giuliaAsset.url,
    blurb: "Two streets over. Keeps the plant swap alive.",
    mode: "Giving",
    world: "giving",
    headline: "Haircuts",
    activity: "Giving haircuts on her back step, Saturday mornings.",
    about: "Giulia, 29. Fixes things. Terrible at asking for help, learning fast.",
    aboutLines: ["Giulia, 29", "Cuts hair", "Fixes things"],
    bottomKicker: "Giving",
    bottomLines: ["Haircuts"],
  },
  {
    id: "sofia",
    name: "Sofia",
    username: "@sofia",
    photo: sofiaAsset.url,
    blurb: "Bakes far too much bread on Sundays.",
    mode: "Wishing",
    world: "wishing",
    headline: "Ride to the airport",
    activity: "Wishing for a ride to the airport this Tuesday, 4 PM.",
    about: "Sofia, 34. Believes a thing unused is a thing wasted.",
    aboutLines: ["Sofia, 34", "Loves to bake"],
    bottomKicker: "Wish",
    bottomLines: ["Ride to", "the airport", "Tuesday", "4 pm"],
  },
  {
    id: "robin",
    name: "Robin",
    username: "@robin",
    photo: robinAsset.url,
    blurb: "Shed full of tools. Never sits still.",
    mode: "Trading",
    world: "trading",
    headline: "Kayak for bike repairs",
    activity: "Trading a spare kayak for help fixing his bike chain.",
    about: "Robin, 41. Trades in tools, favours and very strong coffee.",
    aboutLines: ["Robin, 41", "Fixes boats"],
    bottomKicker: "Trading",
    bottomLines: ["Kayak for", "bike repairs"],
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

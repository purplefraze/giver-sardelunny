import giuliaAsset from "@/assets/giulia.jpg.asset.json";
import sofiaAsset from "@/assets/sofia-profile.jpg.asset.json";
import robinAsset from "@/assets/robin.jpg.asset.json";
import me from "@/assets/me.jpg";
import type { LoopBlock } from "@/components/living-g/profile-loop";

export type Member = {
  id: string;
  name: string;
  /** Public identity — usernames, never real names. */
  username: string;
  /** Approximate distance, shown under the username. Never inside a loop. */
  distance: string;
  photo: string;
  blurb: string;
  mode: "Wishing" | "Giving" | "Trading";
  /** Role colour world: GIVING yellow, WISHING blue, TRADING trade colour. */
  world: "giving" | "wishing" | "trading";
  /** Word for what they are doing on Giver: GIVING / WISH / TRADING. */
  action: string;
  /** Their current activity, kept to a handful of words. */
  headline: string;
  activity: string;
  about: string;
  /** Middle loop: who are they? Short-form human prompts. */
  age: string;
  byDay: string;
  byNight: string;
  weekend: string;
  /** Bottom loop: what are they doing on Giver? */
  bottom: LoopBlock[];
  /** Extra active items hidden behind the "+N MORE" cue. */
  alsoGiving?: string[];
};

export const MEMBERS: Member[] = [
  {
    id: "giulia",
    name: "Giulia",
    username: "@giulia",
    distance: "0.7 km away",
    photo: giuliaAsset.url,
    blurb: "Two streets over. Keeps the plant swap alive.",
    mode: "Giving",
    world: "giving",
    action: "Giving",
    headline: "Science tutoring",
    activity: "Giving science tutoring, weekday evenings.",
    about:
      "29, about 0.7 km away. High-school chemistry teacher. Out on her bike most weekends.",
    age: "29",
    byDay: "Chemistry teacher",
    byNight: "Cuddle bug",
    weekend: "Cycling",
    bottom: [
      { text: "Giving", role: "secondary" },
      { text: "Science tutoring", role: "primary" },
      { text: "+1 more", role: "tertiary", lead: true },
    ],
    alsoGiving: ["After-school dog walking"],
  },
  {
    id: "sofia",
    name: "Sofia",
    username: "@sofia",
    distance: "< 1 km away",
    photo: sofiaAsset.url,
    blurb: "Reads cards on Sundays. Always has the kettle on.",
    mode: "Wishing",
    world: "wishing",
    action: "Wish",
    headline: "Ride to the airport",
    activity: "Wishing for a ride to the airport this Tuesday, 4 PM.",
    about: "26, less than a kilometre away. Business grad. Deep into tarot and spirituality.",
    age: "26",
    byDay: "Business grad",
    byNight: "Wouldn't you like to know",
    weekend: "Who knows",
    bottom: [
      { text: "Wish", role: "secondary" },
      { text: "Ride to the airport", role: "primary" },
      { text: "This Tuesday", role: "tertiary", lead: true },
      { text: "4 pm", role: "tertiary" },
    ],
  },
  {
    id: "robin",
    name: "Robin",
    username: "@robin",
    distance: "1.5 km away",
    photo: robinAsset.url,
    blurb: "Festivals, bonfires and a shed full of tools.",
    mode: "Trading",
    world: "trading",
    action: "Trading",
    headline: "Firewood for a Burning Man ticket",
    activity: "Trading a year's supply of firewood for a Burning Man ticket.",
    about:
      "43, about 1.5 km away. Music festivals, bonfires and boys. Tall enough that he has never owned a ladder.",
    age: "43",
    byDay: "Light guru",
    byNight: "Psychic oracle",
    weekend: "Festy bestie",
    bottom: [
      { text: "Trading", role: "secondary" },
      { text: "A year's supply of firewood", role: "primary" },
      { text: "For", role: "secondary", lead: true },
      { text: "A Burning Man ticket", role: "primary" },
    ],
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

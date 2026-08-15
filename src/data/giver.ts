import giuliaAsset from "@/assets/giulia.jpg.asset.json";
import sofiaAsset from "@/assets/sofia-profile.jpg.asset.json";
import robinAsset from "@/assets/robin.jpg.asset.json";
import me from "@/assets/me.jpg";
import kai from "@/assets/kai.jpg";
import type { LoopBlock } from "@/components/living-g/profile-loop";

/**
 * All user-facing copy in Giver is lowercase. Proper nouns entered by a person
 * ("Burning Man") keep their own capitalisation.
 */
export type Member = {
  id: string;
  name: string;
  /** Public identity — usernames, never real names. */
  username: string;
  /** Approximate distance, shown under the username. Never inside a loop. */
  distance: string;
  photo: string;
  blurb: string;
  mode: "wishing" | "giving" | "trading" | "borrowing";
  /** Role colour world: giving, wishing, trading, borrowing (pink). */
  world: "giving" | "wishing" | "trading" | "borrowing";
  /** Word for what they are doing on Giver. */
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
  /** Extra active items hidden behind the "+N more" cue. */
  alsoGiving?: string[];
  /** Prototype history, one short line per state. */
  history: { wishes: string[]; gives: string[]; trades: string[] };
};

export const MEMBERS: Member[] = [
  {
    id: "giulia",
    name: "Giulia",
    username: "@giulia",
    distance: "0.7 km away",
    photo: giuliaAsset.url,
    blurb: "two streets over. keeps the plant swap alive.",
    mode: "giving",
    world: "giving",
    action: "giving",
    headline: "science tutoring",
    activity: "giving science tutoring, weekday evenings.",
    about:
      "29, about 0.7 km away. high-school chemistry teacher. out on her bike most weekends.",
    age: "29",
    byDay: "chemistry teacher",
    byNight: "cuddle bug",
    weekend: "cycling",
    bottom: [
      { text: "currently offering", role: "secondary" },
      { text: "science", role: "primary" },
      { text: "tutoring", role: "primary" },
      { text: "+1 more", role: "tertiary", lead: true },
    ],

    alsoGiving: ["after-school dog walking"],
    history: {
      wishes: ["a lift to the coast", "someone to water the plants"],
      gives: ["chemistry revision, 6 evenings", "two boxes of jam jars"],
      trades: ["bike inner tubes for tomatoes"],
    },
  },
  {
    id: "sofia",
    name: "Sofia",
    username: "@sofia",
    distance: "< 1 km away",
    photo: sofiaAsset.url,
    blurb: "reads cards on sundays. always has the kettle on.",
    mode: "wishing",
    world: "wishing",
    action: "wish",
    headline: "ride to the airport",
    activity: "wishing for a ride to the airport this tuesday, 4 pm.",
    about: "26, less than a kilometre away. business grad. deep into tarot and spirituality.",
    age: "26",
    byDay: "business grad",
    byNight: "wouldn't you like to know",
    weekend: "who knows",
    bottom: [
      { text: "wish", role: "secondary" },
      { text: "ride to the", role: "primary" },
      { text: "airport", role: "primary" },
      { text: "this tuesday", role: "tertiary", lead: true },
      { text: "at 4 pm", role: "tertiary" },
    ],

    history: {
      wishes: ["a desk lamp", "help moving a sofa"],
      gives: ["tarot readings, sundays"],
      trades: ["a tarot reading for a haircut"],
    },
  },
  {
    id: "robin",
    name: "Robin",
    username: "@robin",
    distance: "1.5 km away",
    photo: robinAsset.url,
    blurb: "festivals, bonfires and a shed full of tools.",
    mode: "trading",
    world: "trading",
    action: "trading",
    headline: "firewood for a burning man ticket",
    activity: "trading a year's supply of firewood for a burning man ticket.",
    about:
      "43, about 1.5 km away. music festivals, bonfires and boys. tall enough that he has never owned a ladder.",
    age: "43",
    byDay: "light guru",
    byNight: "psychic oracle",
    weekend: "festy bestie",
    bottom: [
      { text: "trading", role: "secondary" },
      { text: "a year's supply", role: "primary" },
      { text: "of firewood", role: "primary" },
      { text: "for", role: "secondary", lead: true },
      { text: "a burning", role: "primary" },
      { text: "man ticket", role: "primary" },
    ],

    history: {
      wishes: ["a trailer for one weekend"],
      gives: ["stage lighting for the street party", "a wheelbarrow of kindling"],
      trades: ["tool sharpening for a car wash", "firewood for festival tickets"],
    },
  },
  {
    // Temporary prototype person for the fourth mode: BORROW (pink).
    // Username, photo and profile details are placeholders for now.
    id: "kai",
    name: "Kai",
    username: "@kai",
    distance: "1.1 km away",
    photo: kai,
    blurb: "temporary borrow example.",
    mode: "borrowing",
    world: "borrowing",
    action: "borrow",
    headline: "a bike for the summer",
    activity: "borrowing a bike for the summer.",
    about: "24, about 1.1 km away. temporary prototype person for borrow.",
    age: "24",
    byDay: "bike commuter",
    byNight: "night swimmer",
    weekend: "river trails",
    bottom: [
      { text: "borrow", role: "secondary" },
      { text: "a bike", role: "primary" },
      { text: "for the summer", role: "primary", lead: true },
    ],
    history: {
      wishes: ["a helmet, any size"],
      gives: ["a spare set of lights"],
      trades: ["nothing yet"],
    },
  },
];

export const ME = {
  name: "you",
  photo: me,
  activity: "you gave 50 sparks. your first act of generosity.",
  about: "new here. curious. reckons kindness is currency.",
  history: {
    wishes: ["nothing yet"],
    gives: ["50 sparks, gifted"],
    trades: ["nothing yet"],
  },
};

export const COMMUNITY_WISHES = [
  "a ladder for one afternoon — ravi, 300m",
  "someone to walk bess on thursdays — aggie, 1.1km",
  "cot mattress, any condition — nell, 700m",
];

export const COMMUNITY_GIVES = [
  "six bags of apples. come and take them — tom, 400m",
  "free piano lessons, sundays — ines, 900m",
  "two winter coats, kids age 6 — sam, 1.4km",
];

export const SEARCH_RESULTS = [
  "sewing machine — 3 nearby",
  "garden tools — 5 nearby",
  "sourdough — 2 nearby",
];

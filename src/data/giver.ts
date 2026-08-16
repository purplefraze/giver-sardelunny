import giuliaAsset from "@/assets/giulia.jpg.asset.json";
import sofiaAsset from "@/assets/sofia-profile.jpg.asset.json";
import robinAsset from "@/assets/robin.jpg.asset.json";
import me from "@/assets/me.jpg";
import marcusAsset from "@/assets/marcus.jpg.asset.json";
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
  /**
   * WHAT THEY HAVE GOING ON RIGHT NOW, per category — not a lifetime history.
   * The profile toggle reads this: move a seat, see that person's live items.
   * Prototype range 0-5; an empty category simply stays quiet.
   */
  active: { wish: string[]; give: string[]; trade: string[]; borrow: string[] };
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
    byDay: "teacher",
    byNight: "cuddle bug",
    weekend: "cycling",
    bottom: [
      { text: "currently offering", role: "secondary" },
      { text: "science", role: "primary" },
      { text: "tutoring", role: "primary" },
      { text: "+2 more", role: "tertiary", lead: true },
    ],

    alsoGiving: ["dog walking", "italian lessons"],
    active: {
      wish: ["a lift to the coast"],
      give: ["science tutoring", "dog walking", "italian lessons"],
      trade: [],
      borrow: [],
    },
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
    byDay: "who knows",
    byNight: "wouldn't you like to know",
    weekend: "who knows",
    bottom: [
      { text: "wish", role: "secondary" },
      { text: "need ride", role: "primary" },
      { text: "to airport", role: "primary" },
      { text: "this tuesday", role: "tertiary", lead: true },
      { text: "at 4 pm", role: "tertiary" },
    ],
    active: {
      wish: ["need ride to airport", "a desk lamp"],
      give: ["tarot readings"],
      trade: [],
      borrow: [],
    },

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
    active: {
      wish: ["a trailer for a weekend"],
      give: ["stage lighting"],
      trade: ["firewood for a ticket", "sharpening for a car wash"],
      borrow: [],
    },

    history: {
      wishes: ["a trailer for one weekend"],
      gives: ["stage lighting for the street party", "a wheelbarrow of kindling"],
      trades: ["tool sharpening for a car wash", "firewood for festival tickets"],
    },
  },
  {
    // The fourth mode: BORROW.
    id: "marcus",
    name: "Marcus",
    username: "@marcus",
    distance: "1.1 km away",
    photo: marcusAsset.url,
    blurb: "psychologist by day. no weekends allowed.",
    mode: "borrowing",
    world: "borrowing",
    action: "borrow",
    headline: "a cigarette",
    activity: "wants to borrow a cigarette.",
    about: "psychologist by day, snusing by night. no weekends allowed.",
    age: "",
    byDay: "psychologist",
    byNight: "snusing",
    weekend: "no weekends allowed",
    bottom: [
      { text: "wants to borrow", role: "secondary" },
      { text: "a cigarette", role: "primary" },
    ],
    active: {
      wish: ["a lighter, any kind"],
      give: [],
      trade: ["snus for coffee"],
      borrow: ["a cigarette"],
    },
    history: {
      wishes: ["a lighter, any kind"],
      gives: ["an hour of listening"],
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

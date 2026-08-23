import giuliaAsset from "@/assets/giulia.jpg.asset.json";
import sofiaAsset from "@/assets/sofia-profile.jpg.asset.json";
import robinAsset from "@/assets/robin.jpg.asset.json";
import marcusAsset from "@/assets/marcus.jpg.asset.json";
import type { LoopBlock } from "@/components/living-g/profile-loop";
import { memberEditsStore } from "@/data/member-edits";


/**
 * All user-facing copy in Giver is lowercase. Proper nouns entered by a person
 * ("Burning Man") keep their own capitalisation.
 *
 * THESE ARE THE FOUR ONBOARDING SAMPLE PEOPLE. They exist to show a new user
 * what a FULLY LIVED-IN Living G looks like: every one of them is active in all
 * four worlds, has a personality (by day / by night / weekends) and has real
 * completed connections behind them. This data is DEMO ONLY and never merges
 * into the signed-in person's own G (see src/data/my-profile.ts).
 */
export type Member = {
  id: string;
  name: string;
  /** Public identity — usernames, never real names. */
  username: string;
  /** Approximate distance, shown under the username. Never inside a loop. */
  distance: string;
  /** null until the person has chosen their own picture. Never a stand-in. */
  photo: string | null;
  blurb: string;
  mode: "wishing" | "giving" | "trading" | "borrowing";
  /** Activity world. Colour-wise every sample person is ANOTHER PERSON: blue. */
  world: "giving" | "wishing" | "trading" | "borrowing";
  /** Word for what they are doing on Giver. */
  action: string;
  /** Their current activity, kept to a handful of words. */
  headline: string;
  activity: string;
  about: string;
  /** Middle loop: who are they? Short-form human prompts. */
  age: string;
  /** How they describe themselves. Their words, never a fixed set. */
  gender: string;
  byDay: string;
  byNight: string;
  weekend: string;
  /**
   * THE FUN QUESTIONS, ANSWERED. Same prompt ids as my own profile, so their
   * page prints the same kind of sentences about them (see src/data/prompts.ts).
   */
  answers?: Record<string, string>;
  /** Bottom loop: what are they doing on Giver? */
  bottom: LoopBlock[];
  /** Extra active items hidden behind the "+N more" cue. */
  alsoGiving?: string[];
  /**
   * WHAT THEY HAVE GOING ON RIGHT NOW, per category — not a lifetime history.
   * The profile toggle reads this: move a seat, see that person's live items.
   * Every sample person carries 2-3 in EVERY world, deliberately spanning
   * skills, time, knowledge, objects, experiences, favours, food, transport,
   * teaching and companionship — never four variations on household clutter.
   * Trades always read as "offer for want".
   */
  active: { wish: string[]; give: string[]; trade: string[]; borrow: string[] };
  /** Prototype history, one short line per state. */
  history: { wishes: string[]; gives: string[]; trades: string[] };
  /** FULL PROFILE ONLY — the person, not their current activity. */
  since: string;
  aboutMe: string;
  /** Completed activity. Plain counts, never leaderboard stats. */
  done: { gifts: number; wishes: number; trades: number; borrows: number };
  /**
   * CONNECTIONS ARE EARNED: member ids they have completed a give, a granted
   * wish or a trade with. Mutual by construction (see connectionsOf).
   */
  connections: string[];
};

/**
 * THE WRITTEN RECORD of the sample people. Never read directly by the app: the
 * exported MEMBERS below is this, with any developer/admin edit applied on top.
 */
const BASE_MEMBERS: Member[] = [

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
    activity: "giving science tutoring, tuesdays 7–9 pm.",
    about:
      "29, about 0.7 km away. high-school chemistry teacher. out on her bike most weekends.",
    age: "29",
    gender: "she / her",
    byDay: "chemistry teacher",
    byNight: "choir soprano",
    weekend: "long bike rides",
    answers: {
      happy: "a full bike basket and nowhere to be",
      animal: "a heron",
      one-food: "her nonna’s tomato bread",
      hours: "why baking soda works",
      dream: "to teach science outdoors, all year",
    },
    bottom: [
      { text: "currently offering", role: "secondary" },
      { text: "science", role: "primary" },
      { text: "tutoring", role: "primary" },
      { text: "+2 more", role: "tertiary", lead: true },
    ],

    alsoGiving: ["dog walking", "italian lessons"],
    active: {
      wish: [
        "someone to teach me to swim",
        "a lift to the coast on sunday",
        "company at the late film",
      ],
      give: [
        "science tutoring",
        "italian conversation hour",
        "sourdough starter, endless",
      ],
      trade: [
        "language lessons for photography",
        "cake baking for bike repair",
        "chemistry help for guitar lessons",
      ],
      borrow: [
        "a tent for one weekend",
        "a projector for movie night",
        "waders, size 39",
      ],
    },
    history: {
      wishes: ["a lift to the coast", "someone to water the plants"],
      gives: ["chemistry revision, 6 evenings", "two boxes of jam jars"],
      trades: ["bike inner tubes for tomatoes"],
    },
    since: "march 2026",
    aboutMe:
      "hi, i'm giulia. i'm a chemistry teacher and always happy to help with science stuff. even if you've just got a quick question, send me a message — happy to help.",
    done: { gifts: 5, wishes: 2, trades: 1, borrows: 1 },
    connections: ["sofia", "robin"],
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
    gender: "she / her",
    byDay: "market researcher",
    byNight: "reads tarot",
    weekend: "cold water swims",
    answers: {
      lights-up: "cold water at six in the morning",
      animal: "a seal",
      bucket-list: "swim between two islands",
      silly: "naming every stray cat on her street",
    },
    bottom: [
      { text: "wish", role: "secondary" },
      { text: "need ride", role: "primary" },
      { text: "to airport", role: "primary" },
      { text: "this tuesday", role: "tertiary", lead: true },
      { text: "at 4 pm", role: "tertiary" },
    ],
    active: {
      wish: [
        "a ride to the airport, tuesday",
        "someone to sit with my nonna",
        "help naming my little studio",
      ],
      give: [
        "tarot readings, sundays",
        "cv and interview practice",
        "a spare seat at sunday dinner",
      ],
      trade: [
        "tarot readings for a haircut",
        "spreadsheet help for houseplants",
        "sunday dinner for dog sitting",
      ],
      borrow: [
        "a suitcase for two weeks",
        "a sewing machine, one evening",
        "a bike for the airport run",
      ],
    },

    history: {
      wishes: ["a desk lamp", "help moving a sofa"],
      gives: ["tarot readings, sundays"],
      trades: ["a tarot reading for a haircut"],
    },
    since: "january 2026",
    aboutMe:
      "hi, i'm sofia. i read cards on sundays and the kettle is always on. if you're curious, come sit down — no experience needed.",
    done: { gifts: 3, wishes: 4, trades: 1, borrows: 0 },
    connections: ["giulia", "marcus"],
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
    gender: "he / him",
    byDay: "lighting technician",
    byNight: "vinyl digging",
    weekend: "festivals and fires",
    answers: {
      excited: "the moment a room goes dark before a set",
      animal: "a fox",
      million: "buy a van and light small festivals for free",
      hours: "stage lighting and bonfires",
    },
    bottom: [
      { text: "trading", role: "secondary" },
      { text: "a year's supply", role: "primary" },
      { text: "of firewood", role: "primary" },
      { text: "for", role: "secondary", lead: true },
      { text: "a burning", role: "primary" },
      { text: "man ticket", role: "primary" },
    ],
    active: {
      wish: [
        "a trailer for one weekend",
        "someone to teach me to sing",
        "help sanding a boat",
      ],
      give: [
        "stage lighting for your party",
        "a van and two strong arms",
        "tool sharpening, any blade",
      ],
      trade: [
        "firewood for a festival ticket",
        "sharpening for a car wash",
        "van runs for cooked dinners",
      ],
      borrow: [
        "a ladder for an afternoon",
        "a pressure washer, sunday",
        "a suit for a wedding",
      ],
    },

    history: {
      wishes: ["a trailer for one weekend"],
      gives: ["stage lighting for the street party", "a wheelbarrow of kindling"],
      trades: ["tool sharpening for a car wash", "firewood for festival tickets"],
    },
    since: "november 2025",
    aboutMe:
      "i'm robin. shed full of tools, too much firewood, and a van that mostly starts. if you need something lifted, lit or sharpened, ask.",
    done: { gifts: 6, wishes: 1, trades: 4, borrows: 2 },
    connections: ["giulia", "marcus"],
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
    age: "38",
    gender: "he / him",
    byDay: "psychologist",
    byNight: "night runner",
    weekend: "no weekends allowed",
    answers: {
      happy: "a quiet hour and a good notebook",
      animal: "a bear",
      look-like: "an owl",
      dream: "to make people less afraid of talking",
    },
    bottom: [
      { text: "wants to borrow", role: "secondary" },
      { text: "a cigarette", role: "primary" },
    ],
    active: {
      wish: [
        "someone to run with at 6 am",
        "a lighter, any kind",
        "a recipe worth repeating",
      ],
      give: [
        "an hour of real listening",
        "help writing a hard email",
        "lifts to the hospital",
      ],
      trade: [
        "listening hour for cooking",
        "coffee beans for snus",
        "running company for swedish",
      ],
      borrow: [
        "a folding table for saturday",
        "a road bike for a month",
        "a kids' car seat, one trip",
      ],
    },
    history: {
      wishes: ["a lighter, any kind"],
      gives: ["an hour of listening"],
      trades: ["nothing yet"],
    },
    since: "february 2026",
    aboutMe:
      "marcus. psychologist by day, snus by night. if you need someone to just listen for an hour, that's the thing i'm best at.",
    done: { gifts: 2, wishes: 1, trades: 1, borrows: 3 },
    connections: ["sofia", "robin"],
  },
];

/**
 * THE ONE MEMBER PROJECTION EVERY VIEW READS.
 *
 * The array identity never changes (so every existing import keeps working),
 * but each entry is rebuilt whenever a developer edits that person, which is
 * what makes an admin edit show up on their profile, in the community feed, on
 * every item's detail page and in their activity counts at once.
 */
export const MEMBERS: Member[] = BASE_MEMBERS.map((m) => ({ ...m }));

function applyMemberEdits() {
  const edits = memberEditsStore.get();
  BASE_MEMBERS.forEach((base, i) => {
    const patch = edits[base.id];
    MEMBERS[i] = patch ? { ...base, ...patch } : { ...base };
  });
}

memberEditsStore.subscribe(applyMemberEdits);
applyMemberEdits();

/** The untouched written record, so an admin edit can always be reverted. */
export const baseMemberById = (id: string) => BASE_MEMBERS.find((m) => m.id === id);

export const memberById = (id: string) => MEMBERS.find((m) => m.id === id);


/**
 * CONNECTIONS ARE MUTUAL. The completed act creates the link both ways, so a
 * person's connections are their own list PLUS anyone who lists them — no
 * acceptance step, no friend request.
 */
export function connectionsOf(id: string): Member[] {
  const self = memberById(id);
  const ids = new Set(self?.connections ?? []);
  for (const m of MEMBERS) if (m.connections.includes(id)) ids.add(m.id);
  ids.delete(id);
  return MEMBERS.filter((m) => ids.has(m.id));
}

/**
 * PAST CONNECTIONS — every completed act behind a person, as one count. The
 * top loop only ever shows this number; the profile page tells the stories.
 */
export function pastConnectionCount(m: Member) {
  return m.done.gifts + m.done.wishes + m.done.trades + m.done.borrows;
}

/*
  THERE IS NO STAND-IN FOR ME. My own name, picture and story come only from
  myProfileStore — never from sample data. The community below stays sample.
*/



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

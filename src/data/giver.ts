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
    headline: "Science tutoring",
    activity: "Giving science tutoring, weekday evenings.",
    about:
      "29, about 0.7 km away. High-school chemistry teacher. Out on her bike most weekends.",
    aboutLines: ["29", "0.7 km away", "Chemistry teacher", "Loves cycling"],
    bottomKicker: "Giving",
    bottomLines: ["Science", "tutoring"],
  },
  {
    id: "sofia",
    name: "Sofia",
    username: "@sofia",
    photo: sofiaAsset.url,
    blurb: "Reads cards on Sundays. Always has the kettle on.",
    mode: "Wishing",
    world: "wishing",
    headline: "Ride to the airport",
    activity: "Wishing for a ride to the airport this Tuesday, 4 PM.",
    about: "26, less than a kilometre away. Business grad. Deep into tarot and spirituality.",
    aboutLines: ["26", "< 1 km away", "Business grad", "Into tarot"],
    bottomKicker: "Wish",
    bottomLines: ["Ride to", "the airport", "Tuesday 4pm"],
  },
  {
    id: "robin",
    name: "Robin",
    username: "@robin",
    photo: robinAsset.url,
    blurb: "Festivals, bonfires and a shed full of tools.",
    mode: "Trading",
    world: "trading",
    headline: "Kayak for bike repairs",
    activity: "Trading a spare kayak for help fixing his bike chain.",
    about:
      "43, about 1.2 km away. Music festivals, bonfires and boys. Tall enough that he has never owned a ladder.",
    aboutLines: ["43", "1.2 km away", "Bonfires", "Never needs a ladder"],
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

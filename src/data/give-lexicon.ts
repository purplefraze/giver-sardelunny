/**
 * THE GIVE LEXICON — a small, deterministic, local guess at what kind of
 * give someone is typing. No AI, no network: whole-word keyword matches.
 *
 * RULES
 *   1. The text is lowercased and split into words (letters, digits, ').
 *   2. Every keyword that matches as a whole word (or a whole phrase, for
 *      entries with a space) scores 1 for its type. Stems ending in "*" match
 *      any word that starts with them ("tutor*" → tutor, tutoring).
 *   3. The highest score wins. Ties break by PRIORITY below (a verb of doing
 *      beats a noun: "fix a bike" is a hand, not a thing).
 *   4. No match → null, and the flow asks "what are you giving?".
 * The caller debounces, so the guess never flickers keystroke by keystroke.
 */

export type GiveType = "a thing" | "clothes" | "food" | "time" | "a skill" | "a hand";

export const GIVE_TYPES: GiveType[] = ["a thing", "clothes", "food", "time", "a skill", "a hand"];

/** Tie-break order, strongest first. */
const PRIORITY: GiveType[] = ["a hand", "a skill", "time", "food", "clothes", "a thing"];

export const GIVE_LEXICON: Record<GiveType, string[]> = {
  "a hand": [
    "fix*", "repair*", "mend*", "assembl*", "install*", "mount*", "hang*", "paint*",
    "mow*", "shovel*", "rake*", "weed*", "haul*", "move", "moving", "unclog*", "plumb*",
    "handyman", "odd job*", "odd jobs", "help move", "help moving", "build*", "patch*",
    "clean*", "gutter*", "leak*", "leaking", "drywall", "tile*", "caulk*",
  ],
  "a skill": [
    "lesson*", "teach*", "tutor*", "coach*", "class*", "course*", "mentor*", "how to",
    "learn*", "practice", "workshop*", "train*", "advice", "review*", "translat*",
    "edit*", "proofread*", "resume", "cv", "portfolio", "singing", "guitar", "piano",
    "violin", "drawing", "coding", "math*", "science", "chemistry", "french", "spanish",
    "english", "language*", "photograph*", "sewing", "knitting", "cooking class",
  ],
  time: [
    "company", "visit*", "walk*", "dog walk*", "babysit*", "sitting", "pet sit*",
    "house sit*", "read to", "listen*", "chat*", "drive", "driving", "ride", "rides",
    "lift", "lifts", "errand*", "grocer* run", "keep company", "an hour", "afternoon",
    "evening", "volunteer*", "hang out", "accompany", "check in*", "water* plants",
  ],
  food: [
    "food", "meal*", "dinner*", "lunch*", "breakfast", "soup*", "stew", "lasagna",
    "casserole", "curry", "pasta", "bread", "loaf", "loaves", "sourdough", "bagel*",
    "cake*", "cookie*", "muffin*", "pie", "pies", "bak*", "jam", "jams", "preserve*",
    "honey", "egg", "eggs", "veg*", "vegetable*", "fruit*", "apple*", "tomato*",
    "zucchini", "herb*", "produce", "leftover*", "groceries", "homemade", "coffee",
    "tea", "chili", "dumpling*", "rice", "beans", "snack*", "starter",
  ],
  clothes: [
    "cloth*", "shirt*", "t-shirt*", "tee*", "jean*", "pants", "trouser*", "shorts",
    "dress*", "skirt*", "coat*", "jacket*", "parka*", "sweater*", "hoodie*", "cardigan*",
    "scarf*", "scarves", "hat*", "beanie*", "glove*", "mitten*", "sock*", "shoe*",
    "boot*", "sneaker*", "sandal*", "heels", "suit*", "blazer*", "tux*", "onesie*",
    "leggings", "pyjama*", "pajama*", "uniform*", "outfit*", "abercrombie", "levi*",
    "denim", "size",
  ],
  "a thing": [
    "chair*", "table*", "desk*", "sofa*", "couch*", "bed", "beds", "crib*", "mattress*",
    "lamp*", "shelf", "shelves", "dresser*", "tv", "television", "laptop*", "phone*",
    "monitor*", "printer*", "book*", "toy*", "game*", "puzzle*", "bike*", "bicycle*",
    "stroller*", "car seat*", "pram*", "tool*", "drill*", "ladder*", "tent*", "kettle*",
    "blender*", "toaster*", "microwave*", "pot", "pots", "pan", "pans", "plate*",
    "dish*", "jar*", "box", "boxes", "plant*", "rug*", "mirror*", "frame*", "speaker*",
    "camera*", "guitar amp", "kayak*", "skis", "snowboard*", "furniture", "fan", "heater*",
  ],
};

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9'’-]+/g) ?? [];
}

function matches(keyword: string, ws: string[], joined: string): boolean {
  if (keyword.includes(" ")) {
    const stem = keyword.endsWith("*");
    const k = stem ? keyword.slice(0, -1) : keyword;
    const re = new RegExp(`(^| )${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${stem ? "" : "( |$)"}`);
    return re.test(joined);
  }
  if (keyword.endsWith("*")) {
    const stem = keyword.slice(0, -1);
    return ws.some((w) => w.startsWith(stem));
  }
  return ws.includes(keyword);
}

/** The guess, or null when nothing in the lexicon matches. */
export function inferGiveType(text: string): GiveType | null {
  const ws = words(text);
  if (!ws.length) return null;
  const joined = ws.join(" ");
  let best: GiveType | null = null;
  let bestScore = 0;
  for (const type of PRIORITY) {
    const score = GIVE_LEXICON[type].filter((k) => matches(k, ws, joined)).length;
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return best;
}

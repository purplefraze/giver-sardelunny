/**
 * THE FUN QUESTIONS.
 *
 * A profile is not a survey. Each question is optional, and the moment it is
 * answered the question disappears: what stays on the page is a sentence about
 * a person. The question exists only long enough to get an answer out.
 *
 * THE SENTENCE UNDERSTANDS BOTH SIDES. An answer is never blindly appended to
 * its question. Each prompt carries its own template AND a test for an answer
 * that is ALREADY a whole thought ("my dogs light me up"), which is kept as it
 * was said rather than wrapped in the template a second time.
 */

export type Prompt = {
  id: string;
  /** The playful invitation, shown only while it is unanswered. */
  question: string;
  /** True when the answer already says the whole thing by itself. */
  whole?: RegExp;
  /** The answer, said in my own voice, on my own profile. */
  mine: (answer: string) => string;
  /** The same answer, said about somebody else, in their own pronouns. */
  theirs: (name: string, answer: string, p: Pronouns) => string;
};

/**
 * THEIR OWN WORDS FOR THEMSELVES. Read from how a person describes themselves
 * ("she / her"), and neutral whenever that is not clear.
 */
export type Pronouns = { subject: string; possessive: string; object: string };

export const NEUTRAL: Pronouns = { subject: "they", possessive: "their", object: "them" };

export function pronounsFrom(gender: string | undefined): Pronouns {
  const said = (gender ?? "").toLowerCase();
  if (/\bshe\b|\bher\b/.test(said)) return { subject: "she", possessive: "her", object: "her" };
  if (/\bhe\b|\bhim\b|\bhis\b/.test(said)) return { subject: "he", possessive: "his", object: "him" };
  return NEUTRAL;
}

export const PROMPTS: Prompt[] = [
  {
    id: "happy",
    question: "what makes you happy?",
    whole: /\bmakes me (happy|smile)\b/,
    mine: (a) => `${a} makes me happy.`,
    theirs: (n, a) => `${a} makes ${n} happy.`,
  },
  {
    id: "lights-up",
    question: "what lights you up?",
    whole: /\blights? me up\b/,
    mine: (a) => `${a} lights me up.`,
    theirs: (n, a) => `${a} lights ${n} up.`,
  },
  {
    id: "excited",
    question: "what gets you excited?",
    whole: /\b(gets me excited|lights? me up|excites me)\b/,
    mine: (a) => `${a} gets me excited.`,
    theirs: (n, a) => `${a} gets ${n} excited.`,
  },
  {
    id: "bucket-list",
    question: "what’s something on your bucket list?",
    whole: /^(i|one day)\b/,
    mine: (a) => `one day i want to ${a}.`,
    theirs: (n, a) => `one day ${n} wants to ${a}.`,
  },
  {
    id: "million",
    question: "if you could have a million dollars tomorrow, what would you do?",
    whole: /^i\b/,
    mine: (a) => `with a million dollars tomorrow, i’d ${a}.`,
    theirs: (n, a) => `with a million dollars tomorrow, ${n} would ${a}.`,
  },
  {
    id: "one-food",
    question: "if you could eat one thing for the rest of your life, what would it be?",
    whole: /^i\b/,
    mine: (a) => `i could eat ${a} for the rest of my life.`,
    theirs: (n, a, p) => `${n} could eat ${a} for the rest of ${p.possessive} life.`,
  },
  {
    id: "animal",
    question: "if you could be any animal, what would you be?",
    whole: /^(i|if i)\b/,
    mine: (a) => `if i could be any animal, i’d be ${a}.`,
    theirs: (n, a, p) => `if ${n} could be any animal, ${p.subject}’d be ${a}.`,
  },
  {
    id: "look-like",
    question: "what animal do you think you look like most?",
    whole: /\bi look\b|^i\b/,
    mine: (a) => `apparently i look most like ${a}.`,
    theirs: (n, a, p) => `${n} thinks ${p.subject} looks most like ${a}.`,
  },
  {
    id: "dream",
    question: "what’s your dream?",
    whole: /^(my dream|i dream)\b/,
    mine: (a) => `my dream is ${a}.`,
    theirs: (n, a) => `${n}’s dream is ${a}.`,
  },
  {
    id: "hours",
    question: "what’s something you could talk about for hours?",
    whole: /\bi (could|can) talk\b/,
    mine: (a) => `i could talk about ${a} for hours.`,
    theirs: (n, a) => `${n} could talk about ${a} for hours.`,
  },
  {
    id: "silly",
    question: "what’s something silly you love?",
    whole: /^i\b|\bi love\b/,
    mine: (a) => `something silly i love: ${a}.`,
    theirs: (n, a) => `something silly ${n} loves: ${a}.`,
  },
];

export const promptById = (id: string) => PROMPTS.find((p) => p.id === id);

/**
 * THE ANSWER, TIDIED. Giver speaks in lowercase, so the answer joins the
 * sentence in the app's own voice, with stray spacing and end punctuation gone.
 */
function clean(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!,;:]+$/, "")
    .replace(/^[-–—•]\s*/, "")
    .replace(/^([A-Z])(?=[a-z’']|\b)/, (c) => c.toLowerCase());
}

/**
 * ALREADY A WHOLE THOUGHT? Then it is left alone. Either the prompt recognises
 * its own verb inside the answer, or the answer plainly speaks in the first
 * person about itself ("my dogs light me up") — in both cases wrapping it in a
 * template again would say the same thing twice.
 */
function isWhole(p: Prompt, answer: string) {
  if (p.whole?.test(answer)) return true;
  const words = answer.split(" ");
  return words.length >= 3 && /(^|\s)(i|i’m|i'm|me|my|mine)(\s|$)/.test(answer);
}

/** A sentence always ends. Question marks and exclamations are respected. */
const finish = (line: string) => (/[.?!]$/.test(line) ? line : `${line}.`);

/** MY OWN VOICE: "my dogs light me up." or "giraffes make me happy." */
export function mineStatement(p: Prompt, raw: string) {
  const answer = clean(raw);
  if (!answer) return "";
  return finish(isWhole(p, answer) ? answer : p.mine(answer));
}

/** THE SAME THOUGHT, SAID ABOUT SOMEBODY ELSE, in their own pronouns. */
export function theirStatement(p: Prompt, raw: string, name: string, pr: Pronouns) {
  const answer = clean(raw);
  if (!answer) return "";
  if (isWhole(p, answer)) return finish(toThird(answer, name, pr));
  return finish(p.theirs(name, answer, pr));
}

/**
 * FIRST PERSON -> THIRD PERSON. Only the words that actually point at the
 * speaker are moved; everything the person wrote otherwise stays untouched.
 */
function toThird(text: string, name: string, p: Pronouns) {
  let out = text;
  out = out.replace(/(^|\s)i['’]m(\s|$)/g, `$1${name} is$2`);
  out = out.replace(/(^|\s)i['’](d|ll|ve)(\s|$)/g, `$1${p.subject}’$2$3`);
  out = out.replace(/(^|\s)i(\s|$)/g, (_m, a: string, b: string, offset: number) =>
    offset === 0 ? `${a}${name}${b}` : `${a}${p.subject}${b}`,
  );
  out = out.replace(/(^|\s)my(\s|$)/g, `$1${p.possessive}$2`);
  out = out.replace(/(^|\s)mine(\s|$)/g, `$1${p.possessive}s$2`);
  out = out.replace(/(^|\s)me(\s|$)/g, `$1${p.object}$2`);
  out = out.replace(/(^|\s)myself(\s|$)/g, `$1${p.subject}self$2`);
  return out;
}

/** THE FINISHED SENTENCES, in the order the questions are asked. */
export function answeredStatements(
  answers: Record<string, string> | undefined,
  who: { mine: boolean; name?: string; pronouns?: Pronouns },
): { id: string; line: string }[] {
  if (!answers) return [];
  return PROMPTS.flatMap((p) => {
    const said = (answers[p.id] ?? "").trim();
    if (!said) return [];
    const line = who.mine
      ? mineStatement(p, said)
      : theirStatement(p, said, who.name ?? "they", who.pronouns ?? NEUTRAL);
    return line ? [{ id: p.id, line }] : [];
  });
}

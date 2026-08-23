/**
 * THE FUN QUESTIONS.
 *
 * A profile is not a survey. Each question is optional, and the moment it is
 * answered the question disappears: what stays on the page is a sentence about
 * a person. The question exists only long enough to get an answer out.
 */

export type Prompt = {
  id: string;
  /** The playful invitation, shown only while it is unanswered. */
  question: string;
  /** The answer, said in my own voice, on my own profile. */
  mine: (answer: string) => string;
  /** The same answer, said about somebody else. */
  theirs: (name: string, answer: string) => string;
};

export const PROMPTS: Prompt[] = [
  {
    id: "happy",
    question: "what makes you happy?",
    mine: (a) => `${a} makes me happy.`,
    theirs: (n, a) => `${a} makes ${n} happy.`,
  },
  {
    id: "lights-up",
    question: "what lights you up?",
    mine: (a) => `${a} lights me up.`,
    theirs: (n, a) => `${a} lights ${n} up.`,
  },
  {
    id: "excited",
    question: "what gets you excited?",
    mine: (a) => `${a} gets me excited.`,
    theirs: (n, a) => `${a} gets ${n} excited.`,
  },
  {
    id: "bucket-list",
    question: "what’s something on your bucket list?",
    mine: (a) => `one day i want to ${a}.`,
    theirs: (n, a) => `one day ${n} wants to ${a}.`,
  },
  {
    id: "million",
    question: "if you could have a million dollars tomorrow, what would you do?",
    mine: (a) => `with a million dollars tomorrow, i’d ${a}.`,
    theirs: (n, a) => `with a million dollars tomorrow, ${n} would ${a}.`,
  },
  {
    id: "one-food",
    question: "if you could eat one thing for the rest of your life, what would it be?",
    mine: (a) => `i could eat ${a} for the rest of my life.`,
    theirs: (n, a) => `${n} could eat ${a} for the rest of their life.`,
  },
  {
    id: "animal",
    question: "if you could be any animal, what would you be?",
    mine: (a) => `if i could be any animal, i’d be ${a}.`,
    theirs: (n, a) => `if ${n} could be any animal, they’d be ${a}.`,
  },
  {
    id: "look-like",
    question: "what animal do you think you look like most?",
    mine: (a) => `apparently i look most like ${a}.`,
    theirs: (n, a) => `${n} thinks they look most like ${a}.`,
  },
  {
    id: "dream",
    question: "what’s your dream?",
    mine: (a) => `my dream is ${a}.`,
    theirs: (n, a) => `${n}’s dream is ${a}.`,
  },
  {
    id: "hours",
    question: "what’s something you could talk about for hours?",
    mine: (a) => `i could talk about ${a} for hours.`,
    theirs: (n, a) => `${n} could talk about ${a} for hours.`,
  },
  {
    id: "silly",
    question: "what’s something silly you love?",
    mine: (a) => `something silly i love: ${a}.`,
    theirs: (n, a) => `something silly ${n} loves: ${a}.`,
  },
];

export const promptById = (id: string) => PROMPTS.find((p) => p.id === id);

/** THE FINISHED SENTENCES, in the order the questions are asked. */
export function answeredStatements(
  answers: Record<string, string> | undefined,
  who: { mine: boolean; name?: string },
): { id: string; line: string }[] {
  if (!answers) return [];
  return PROMPTS.flatMap((p) => {
    const said = (answers[p.id] ?? "").trim();
    if (!said) return [];
    return [{ id: p.id, line: who.mine ? p.mine(said) : p.theirs(who.name ?? "they", said) }];
  });
}

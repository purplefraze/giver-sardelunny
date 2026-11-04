/**
 * FUND RULES — pure, dependency-free, so they can be reasoned about (and
 * tested) on their own. The contributions store (src/data/fund.ts) and the
 * Supabase migration (wish_contributions) enforce the SAME rules.
 *
 * FUND = one member pledges MONEY toward another member's existing Wish.
 * It is not a Give, not a Lend/Borrow, not a Trade and never Sparks.
 *
 * NO PAYMENT IS PROCESSED. A contribution is a PLEDGE RECORD only.
 * TODO(payment-rails): when a processor exists, a pledge becomes a charge
 * there — never here, and never faked. Until then status is only "pledged".
 */

/** Money is stored as integer minor units (cents). Never floats. */
export type Cents = number;

/**
 * PLACEHOLDER CURRENCY. Open product question (see report): which currency,
 * and whether it follows the member or the Wish. Display uses "$".
 */
export const FUND_CURRENCY = "CAD";

/** Smallest pledge: $1. Largest single pledge: $10,000 (typo / abuse guard). */
export const FUND_MIN_CENTS: Cents = 100;
export const FUND_MAX_CENTS: Cents = 1_000_000;

/** Largest target a Wish may state: $100,000 (a $12,000 dental Wish fits). */
export const FUND_TARGET_MAX_CENTS: Cents = 10_000_000;

/**
 * "12", "12.5", "12.50", "$1,200" -> cents. Anything else -> null:
 * negative, zero, NaN/Infinity, exponent notation, more than 2 decimals.
 */
export function parseAmount(raw: string): Cents | null {
  const clean = raw.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(clean)) return null;
  const [whole = "0", frac = ""] = clean.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** 150000 -> "$1,500", 1250 -> "$12.50". */
export function formatCents(cents: Cents): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `$${whole.toLocaleString("en-US")}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
}

/** A Wish's stated money cost, if it has a sane one. */
export function validTarget(value: unknown): Cents | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= FUND_MIN_CENTS &&
    value <= FUND_TARGET_MAX_CENTS
    ? value
    : null;
}

/** The minimum a rule needs to know about the Wish being funded. */
export type FundableWish = {
  ownerId: string;
  type: string;
  status: string;
  published: boolean;
  /** Integer cents, when the Wish states a money cost. */
  target: Cents | null;
};

export type FundRefusal =
  | "missing"
  | "not-a-wish"
  | "own-wish"
  | "closed"
  | "amount"
  | "too-small"
  | "too-large"
  | "fully-funded"
  | "over-target";

export type FundCheck = { ok: true } | { ok: false; reason: FundRefusal; say: string };

/**
 * EVERY PLEDGE PASSES HERE FIRST.
 *   - the Wish must exist, be a Wish, be active and published (not deleted,
 *     completed, archived/expired or paused)
 *   - never your own Wish
 *   - amount: a positive, finite, whole number of cents, $1 … $10,000
 *   - with a stated cost: no pledge once fully funded, and never past it
 */
export function checkContribution(input: {
  wish: FundableWish | undefined;
  funderId: string;
  amountCents: number;
  /** Already pledged toward this Wish, by everyone. */
  fundedCents: Cents;
}): FundCheck {
  const { wish, funderId, amountCents, fundedCents } = input;
  if (!wish) return { ok: false, reason: "missing", say: "that wish isn’t here anymore." };
  if (wish.type !== "wish")
    return { ok: false, reason: "not-a-wish", say: "only a wish can be funded." };
  if (wish.ownerId === funderId)
    return { ok: false, reason: "own-wish", say: "you can’t fund your own wish." };
  if (wish.status !== "active" || !wish.published)
    return { ok: false, reason: "closed", say: "this wish is closed." };
  if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents) || amountCents <= 0)
    return { ok: false, reason: "amount", say: "enter an amount, like 20 or 12.50." };
  if (amountCents < FUND_MIN_CENTS)
    return { ok: false, reason: "too-small", say: `the smallest pledge is ${formatCents(FUND_MIN_CENTS)}.` };
  if (amountCents > FUND_MAX_CENTS)
    return { ok: false, reason: "too-large", say: `the largest single pledge is ${formatCents(FUND_MAX_CENTS)}.` };
  if (wish.target !== null) {
    const left = wish.target - fundedCents;
    if (left <= 0) return { ok: false, reason: "fully-funded", say: "this wish is fully funded." };
    if (amountCents > left)
      return { ok: false, reason: "over-target", say: `only ${formatCents(left)} left to fund.` };
  }
  return { ok: true };
}

/**
 * FULLY FUNDED IS A FACT, NOT A COMPLETION. Nothing in Fund ever completes a
 * Wish: the existing Wish flow (grant -> both people verify) still decides.
 */
export const fullyFunded = (target: Cents | null, fundedCents: Cents) =>
  target !== null && fundedCents >= target;

/**
 * Why a stated Fund GOAL is not acceptable, in plain words; null when it is.
 * Uses only the existing target limits (FUND_MIN_CENTS .. FUND_TARGET_MAX_CENTS).
 */
export function fundGoalProblem(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return "how much are you raising? enter a goal, like 1200.";
  const clean = t.replace(/^\$/, "").replace(/,/g, "").trim();
  if (/^[-−]/.test(clean)) return "the goal has to be more than zero.";
  if (!/^[\d.]+$/.test(clean) || !/\d/.test(clean)) return "enter the goal as a number, like 1200.";
  if (!/^\d+(\.\d+)?$/.test(clean) || /\.\d{3,}$/.test(clean)) return "use a plain number with at most two decimals, like 1200 or 1200.50.";
  const cents = parseAmount(clean);
  if (cents === null) return /^0*(\.0*)?$/.test(clean) ? "the goal has to be more than zero." : "that goal is too large to read. the largest goal is " + formatCents(FUND_TARGET_MAX_CENTS) + ".";
  if (cents < FUND_MIN_CENTS) return `the smallest goal is ${formatCents(FUND_MIN_CENTS)}.`;
  if (cents > FUND_TARGET_MAX_CENTS) return `the largest goal is ${formatCents(FUND_TARGET_MAX_CENTS)}.`;
  return null;
}

/**
 * WRITE GUARD for item details: a fundTarget, when present, must be a whole
 * number of cents within the existing target limits. Items without one pass.
 * (Client-side: items are written straight to Supabase; the DB has no check.)
 */
export function fundDetailsOk(details: unknown): boolean {
  if (!details || typeof details !== "object" || !("fundTarget" in details)) return true;
  const t = (details as { fundTarget?: unknown }).fundTarget;
  return typeof t === "number" && validTarget(t) !== null;
}

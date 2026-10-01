import { bandOf } from "@/intelligence/action-draft";
import { bindUtterance } from "@/intelligence/bind";

/**
 * Representative sentences. The binder must handle these with the gateway down.
 * Not a chatbot transcript — one utterance, one draft.
 */

export type Fixture = {
  say: string;
  action: string | null;
  band: "high" | "moderate" | "low";
  item?: string;
  date?: string;
  offer?: string;
  want?: string;
  amountCents?: number;
  clarify: boolean;
};

export const FIXTURES: readonly Fixture[] = [
  {
    say: "I have a couch.",
    action: null,
    band: "low",
    item: "couch",
    clarify: true,
  },
  {
    say: "I have a couch I don't need anymore.",
    action: "give",
    band: "high",
    item: "couch",
    clarify: false,
  },
  {
    say: "I need a couch.",
    action: "wish",
    band: "moderate",
    item: "couch",
    clarify: true,
  },
  {
    say: "Can someone lend me a pressure washer Saturday?",
    action: "borrow",
    band: "high",
    item: "pressure washer",
    date: "saturday",
    clarify: false,
  },
  {
    say: "I have a pressure washer that someone can borrow.",
    action: "lend",
    band: "high",
    item: "pressure washer",
    clarify: false,
  },
  {
    say: "I have three boxes of moving supplies to give away.",
    action: "give",
    band: "high",
    item: "moving supplies",
    clarify: false,
  },
  {
    say: "I need help moving this weekend.",
    action: "wish",
    band: "high",
    date: "this weekend",
    clarify: false,
  },
  {
    say: "I have $500 and want to fund coffees for people in my community.",
    action: "fund",
    band: "high",
    amountCents: 50000,
    clarify: false,
  },
  {
    say: "I want to trade my bike for a skateboard.",
    action: "trade",
    band: "high",
    offer: "bike",
    want: "skateboard",
    clarify: false,
  },
  {
    say: "I don't know what category this belongs in.",
    action: null,
    band: "low",
    clarify: true,
  },
];

export type FixtureFailure = { say: string; why: string };

export const checkFixtures = (): FixtureFailure[] => {
  const bad: FixtureFailure[] = [];
  for (const f of FIXTURES) {
    const d = bindUtterance(f.say);
    const why: string[] = [];
    if (d.action !== f.action) why.push(`action ${d.action} != ${f.action}`);
    if (bandOf(d.confidence) !== f.band) why.push(`band ${bandOf(d.confidence)} != ${f.band}`);
    if (f.item && d.entities.item !== f.item) why.push(`item ${d.entities.item} != ${f.item}`);
    if (f.date && d.entities.date !== f.date) why.push(`date ${d.entities.date} != ${f.date}`);
    if (f.offer && d.entities.offer !== f.offer) why.push(`offer ${d.entities.offer} != ${f.offer}`);
    if (f.want && d.entities.want !== f.want) why.push(`want ${d.entities.want} != ${f.want}`);
    if (f.amountCents != null && d.entities.amountCents !== f.amountCents) {
      why.push(`amount ${d.entities.amountCents} != ${f.amountCents}`);
    }
    if (f.clarify !== (d.clarification != null)) why.push("clarification mismatch");
    if (d.action === "give" && !d.missingRequired.includes("location")) {
      why.push("give must still ask where");
    }
    if (why.length) bad.push({ say: f.say, why: why.join("; ") });
  }
  return bad;
};

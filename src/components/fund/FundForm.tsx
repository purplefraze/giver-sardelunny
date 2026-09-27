import { useState } from "react";
import { BackArrow } from "@/components/BackArrow";
import { useItems } from "@/hooks/use-items";
import { useFund } from "@/hooks/use-fund";
import { memberById } from "@/data/giver";
import { ME_ID, itemLine } from "@/data/items";
import {
  contributorCount,
  fundStore,
  fundableWishes,
  fundedTotal,
  myContributions,
  wishTarget,
} from "@/data/fund";
import { formatCents, fullyFunded, parseAmount } from "@/data/fund-rules";
import { OTHER_PERSON_COLOUR } from "@/lib/exchange-colours";
import { haptics } from "@/lib/haptics";

/**
 * THE FUND SEAT'S SHEET — the same chamber pattern as CategoryForm, opened
 * from the middle loop (or the toggle's tap-tap) at the Fund seat. Never a
 * page stack: it is a depth of the Living G, anchored to the middle loop.
 *
 * Pick someone else's Wish, see the running total (vs its cost, if it states
 * one), pledge an amount. A PLEDGE RECORD ONLY — no payment is processed.
 * TODO(payment-rails): the pledge button becomes a real checkout here once a
 * processor exists. It must never pretend to charge before then.
 */

const FUND = "var(--activity-fund)";
const WISH = "var(--activity-wish)";

function ownerHandle(ownerId: string) {
  const m = memberById(ownerId);
  return m ? m.username : "a neighbour";
}

export function FundForm({
  onDone,
  initialWishId,
}: {
  onDone: () => void;
  initialWishId?: string;
}) {
  const items = useItems();
  const funds = useFund();
  const [wishId, setWishId] = useState<string | null>(initialWishId ?? null);
  const [amount, setAmount] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);

  const wishes = fundableWishes(items, ME_ID);
  const wish = wishId ? (items.items.find((i) => i.id === wishId) ?? null) : null;
  const mine = myContributions(funds, ME_ID);

  const cents = parseAmount(amount);
  const verdict = wish && cents !== null ? fundStore.check(wish.id, cents, ME_ID) : null;

  const pledge = () => {
    if (!wish) return;
    if (cents === null) {
      setProblem("enter an amount, like 20 or 12.50.");
      haptics.warning();
      return;
    }
    const result = fundStore.contribute(wish.id, cents, ME_ID);
    if (!result.ok) {
      setProblem(result.say);
      haptics.warning();
      return;
    }
    haptics.light();
    setProblem(null);
    setAmount("");
    setRecorded(
      `${formatCents(cents)} pledge recorded. no money has moved — payment isn’t processed yet.`,
    );
  };

  const leave = () => {
    haptics.light();
    onDone();
  };

  return (
    <div
      data-world="fund"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
    >
      <BackArrow
        onClick={wish ? () => setWishId(null) : leave}
        label={wish ? "back to wishes" : "back to my g"}
        sticky
      />

      <div className="g-page pb-[8.5rem] pt-16">
        <h1 className="g-heading" style={{ color: FUND }}>
          fund a wish
        </h1>
        <p className="g-body mt-2 max-w-[26ch]" style={{ color: FUND }}>
          chip in toward someone’s wish.
        </p>
        {/* SAID PLAINLY, EVERY TIME: nothing is charged, nothing is sparks. */}
        <p className="mt-2 g-meta">
          pledge record only · payment isn’t processed yet · no sparks involved
        </p>

        {wish ? (
          (() => {
            const target = wishTarget(wish);
            const total = fundedTotal(funds, wish.id);
            const people = contributorCount(funds, wish.id);
            const done = fullyFunded(target, total);
            const open = wish.status === "active" && wish.published && wish.ownerId !== ME_ID;
            return (
              <div className="mt-8">
                <p className="g-post text-[1.9rem]" style={{ color: WISH }}>
                  {itemLine(wish)}
                </p>
                <p className="mt-1 g-meta" style={{ color: OTHER_PERSON_COLOUR.wish, opacity: 1 }}>
                  {ownerHandle(wish.ownerId)}’s wish
                </p>

                {/* THE RUNNING TOTAL — vs the wish's cost only when it states one. */}
                <div className="g-rule mt-6 pt-5">
                  <p className="g-lede" style={{ color: FUND }}>
                    {formatCents(total)} pledged
                    {target !== null ? ` of ${formatCents(target)}` : ""}
                  </p>
                  {target !== null ? (
                    <div
                      className="mt-3 h-[3px] w-full"
                      style={{ background: "var(--edit-rule)" }}
                      aria-hidden
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, (total / target) * 100)}%`,
                          background: FUND,
                        }}
                      />
                    </div>
                  ) : null}
                  <p className="mt-2 g-meta">
                    {people === 0
                      ? "nobody has chipped in yet"
                      : `${people} ${people === 1 ? "person has" : "people have"} chipped in`}
                    {target === null ? " · no stated cost" : ""}
                  </p>
                  {done ? (
                    <p className="mt-3 g-name" style={{ color: FUND }}>
                      fully funded
                      <span className="block g-meta" style={{ color: "var(--world-ink)" }}>
                        the wish is still granted the usual way
                      </span>
                    </p>
                  ) : null}
                </div>

                {open && !done ? (
                  <div className="mt-7 space-y-4">
                    <label className="flex items-end gap-2">
                      <span className="g-lede pb-1" style={{ color: FUND }}>
                        $
                      </span>
                      <input
                        autoFocus
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value.slice(0, 12));
                          setProblem(null);
                          setRecorded(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") pledge();
                        }}
                        placeholder="how much?"
                        aria-label="pledge amount"
                        className="min-w-0 flex-1 border-b border-current/25 bg-transparent pb-1 g-lede outline-none placeholder:opacity-35"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={pledge}
                      disabled={verdict !== null && !verdict.ok}
                      className="g-display-sm text-left transition-transform active:scale-[0.98] disabled:opacity-30"
                      style={{ color: FUND }}
                    >
                      {cents !== null ? `pledge ${formatCents(cents)}` : "pledge"}
                    </button>
                    {verdict && !verdict.ok && !problem ? (
                      <p className="g-body" style={{ color: FUND }}>
                        {verdict.say}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {problem ? (
                  <p className="mt-4 g-body" style={{ color: FUND }}>
                    {problem}
                  </p>
                ) : null}
                {recorded ? (
                  <p className="mt-4 g-name" style={{ color: FUND }}>
                    {recorded}
                  </p>
                ) : null}
              </div>
            );
          })()
        ) : (
          <ul className="mt-8 space-y-4">
            {wishes.length === 0 ? (
              <li className="g-meta">no wishes to fund right now</li>
            ) : null}
            {wishes.map((w) => {
              const target = wishTarget(w);
              const total = fundedTotal(funds, w.id);
              return (
                <li key={w.id} className="g-rule pt-4 first:border-0 first:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setWishId(w.id);
                      setAmount("");
                      setProblem(null);
                      setRecorded(null);
                    }}
                    className="w-full text-left"
                  >
                    <span className="block g-name" style={{ color: WISH }}>
                      {itemLine(w)}
                    </span>
                    <span className="mt-0.5 block g-meta">
                      <span style={{ color: OTHER_PERSON_COLOUR.wish }}>{ownerHandle(w.ownerId)}</span>
                      {" · "}
                      {target !== null
                        ? `${formatCents(total)} of ${formatCents(target)}${
                            fullyFunded(target, total) ? " · fully funded" : ""
                          }`
                        : total > 0
                          ? `${formatCents(total)} pledged`
                          : "no stated cost"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* MY PLEDGES — a record, never a receipt: nothing was charged. */}
        {mine.length ? (
          <div className="g-rule mt-10 pt-5">
            <h2 className="g-heading" style={{ color: FUND }}>
              my pledges
            </h2>
            <ul className="mt-3 space-y-2">
              {mine.map((c) => {
                const w = items.items.find((i) => i.id === c.wishId);
                return (
                  <li key={c.id} className="g-meta" style={{ opacity: 0.8 }}>
                    <span style={{ color: FUND }}>{formatCents(c.amountCents)}</span>
                    {" · "}
                    {w ? itemLine(w) : "a wish that has closed"} · pledged, not paid
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {/* THE WAY BACK IS ALWAYS THERE — same bar as CategoryForm. */}
      <div
        className="g-page fixed bottom-0 left-0 right-0 z-30 border-t"
        style={{
          background: "var(--giver-paper, #fff)",
          borderColor: "var(--edit-rule)",
          paddingTop: "0.85rem",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.85rem)",
        }}
      >
        <button
          type="button"
          onClick={leave}
          className="whitespace-nowrap text-[13px] font-black lowercase tracking-[0.16em] transition-transform active:scale-95"
          style={{ color: "var(--giver-me)" }}
        >
          ← back to my g
        </button>
      </div>
    </div>
  );
}

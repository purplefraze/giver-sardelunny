import { BackArrow } from "@/components/BackArrow";
import { eventsOf, signed, whenWord, type Currency } from "@/data/ledger";
import { useLedger } from "@/hooks/use-ledger";
import { useMyProfile } from "@/hooks/use-my-profile";
import { reservedTotal } from "@/data/my-profile";

/**
 * A HISTORY PORTAL, NOT A WALLET.
 *
 * Sparks and sparkles are only meaningful as a story: where they came from,
 * where they went and what they were for. Same page, same type, one currency
 * at a time, newest first — and nothing is ever hidden, including what is
 * currently being held inside an open wish.
 */

const TITLE: Record<Currency, string> = {
  spark: "sparks",
  sparkle: "sparkles",
};

const COLOUR: Record<Currency, string> = {
  spark: "var(--giver-sparks)",
  sparkle: "var(--giver-sparkles)",
};

const SAY: Record<Currency, string> = {
  spark: "sparks are what a wish costs, and what generosity earns.",
  sparkle: "sparkles help somebody else get seen. earned, never bought.",
};

export function LedgerHistory({
  currency,
  onClose,
}: {
  currency: Currency;
  onClose: () => void;
}) {
  const me = useMyProfile();
  const events = eventsOf(useLedger(), currency);
  const colour = COLOUR[currency];
  const balance = currency === "spark" ? me.sparks : me.sparkles;
  const held = currency === "spark" ? reservedTotal(me) : 0;

  return (
    <div
      data-world="me"
      className="relative h-full w-full overflow-y-auto"
      style={{ background: "var(--giver-paper, #fff)", color: "var(--world-ink)" }}
    >
      <BackArrow onClick={onClose} label="back to my g" />

      <div className="g-page g-page-top g-page-bottom">
        <p className="g-heading" style={{ color: colour }}>
          {TITLE[currency]}
        </p>

        <p
          className="mt-5 text-[4.5rem] font-black leading-none tracking-[-0.05em] tabular-nums"
          style={{ color: colour }}
        >
          {balance}
        </p>
        {held ? (
          <p className="g-meta mt-3 opacity-55">{held} held inside open wishes</p>
        ) : null}
        <p className="g-body mt-6 opacity-60">{SAY[currency]}</p>

        <ul className="mt-10">
          {events.length ? (
            events.map((e) => (
              <li key={e.id} className="g-rule flex items-baseline gap-4 py-4">
                <span
                  className="w-14 shrink-0 text-lg font-black tabular-nums"
                  style={{ color: e.amount === 0 ? "var(--world-ink)" : colour }}
                  aria-hidden={e.amount === 0}
                >
                  {e.amount === 0 ? "" : signed(e.amount)}
                </span>
                <span className="flex-1">
                  <span className="g-body block">{e.say}</span>
                  <span className="g-meta mt-1 block opacity-40">
                    {e.kind} · {whenWord(e.at)}
                  </span>
                </span>
              </li>
            ))
          ) : (
            <li className="g-body opacity-45">
              nothing yet — this fills itself as you give.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

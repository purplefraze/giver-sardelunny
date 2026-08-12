import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
};

/** Minimal full-bleed panel. No cards, no chrome. */
export function Panel({ open, onClose, title, children }: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col px-7 pb-10 pt-14 transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "invisible pointer-events-none translate-y-full",
      )}
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
      aria-hidden={!open}
    >

      <button
        type="button"
        onClick={onClose}
        className="self-start text-sm font-bold uppercase tracking-[0.18em] opacity-60"
      >
        Close
      </button>
      <h2 className="mt-8 text-[13vw] font-black uppercase leading-[0.82] tracking-[-0.05em]">
        {title}
      </h2>
      <div className="mt-8 flex-1 space-y-5 overflow-y-auto text-lg font-medium leading-snug">
        {children}
      </div>
    </div>
  );
}

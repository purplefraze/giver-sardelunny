import { BackArrow } from "@/components/BackArrow";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
};

/** Minimal full-bleed panel. No cards, no chrome. Always a way back. */
export function Panel({ open, onClose, title, children }: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col px-7 pb-10 pt-16 transition-opacity duration-200 ease-out",
        open ? "opacity-100" : "invisible pointer-events-none opacity-0",
      )}
      style={{ background: "var(--world-bg)", color: "var(--world-ink)" }}
      aria-hidden={!open}
    >
      {open ? <BackArrow onClick={onClose} /> : null}
      <h2 className="mt-6 text-[13vw] font-black lowercase leading-[0.82] tracking-[-0.05em]">
        {title}
      </h2>
      <div className="mt-8 flex-1 space-y-5 overflow-y-auto text-lg font-medium leading-snug">
        {children}
      </div>
    </div>
  );
}

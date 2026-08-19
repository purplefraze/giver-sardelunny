import { useEffect, useSyncExternalStore } from "react";
import { sparkFlashStore } from "@/data/spark-flash";

/**
 * "+10 SPARKS ✨" — satisfying, then gone. No reward screen, no blocking, no
 * queue. It never interrupts: the balance has already changed underneath it.
 */
export function SparkFlash() {
  const { message, token } = useSyncExternalStore(
    sparkFlashStore.subscribe,
    sparkFlashStore.get,
    sparkFlashStore.getServer,
  );

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => sparkFlashStore.clear(), 1400);
    return () => clearTimeout(t);
  }, [message, token]);

  if (!message) return null;

  return (
    <div
      key={token}
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-8 z-40 flex justify-center animate-in fade-in duration-150"
    >
      <span
        className="text-[7vw] font-black lowercase tracking-[-0.03em]"
        style={{ color: "var(--giver-generosity)" }}
      >
        {message}
      </span>
    </div>
  );
}

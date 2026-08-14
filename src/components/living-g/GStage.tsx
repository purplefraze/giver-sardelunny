/**
 * THE canonical stage for every full-screen Living G.
 *
 * One scale system, everywhere: the G is centred in the usable viewport
 * (safe areas excluded) and stands at ~79% of that height, with its locked
 * aspect ratio preserved and a small deliberate margin around it.
 * Huge, never cropped. Surrounding content adapts around it — the G never
 * shrinks to make room, because it is positioned independently of page content.
 */
export function GStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div
        className="pointer-events-auto"
        style={{ height: "79%", aspectRatio: "576 / 1133", maxWidth: "92%" }}
      >
        {children}
      </div>
    </div>
  );
}

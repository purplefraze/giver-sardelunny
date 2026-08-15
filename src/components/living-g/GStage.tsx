/**
 * THE canonical stage for every full-screen Living G.
 *
 * One scale system, everywhere: the G consumes up to 94% of the usable
 * viewport height, with its locked aspect ratio preserved and only enough
 * edge room to keep the complete silhouette intentionally framed.
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
        style={{
          width: "min(96%, calc(94dvh * 756 / 1173))",
          aspectRatio: "756 / 1173",
        }}
      >
        {children}
      </div>
    </div>
  );
}

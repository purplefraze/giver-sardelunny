/** The welcome animation temporarily owns the G; its settled state does not. */
export const recordAvailable = (phase: "ceremony" | "settled" | null) => phase !== "ceremony";
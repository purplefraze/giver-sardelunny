import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { devRoutesOpen } from "@/lib/dev-routes";

/* SEC-06: /auth, /dev/* and /admin are closed in production builds. */
describe("dev-only routes", () => {
  test("open under vite dev", () => expect(devRoutesOpen({ DEV: true })).toBe(true));
  test("closed in a production build", () => expect(devRoutesOpen({ DEV: false })).toBe(false));
  test("closed when DEV is missing", () => expect(devRoutesOpen({})).toBe(false));

  const guarded: Record<string, string> = {
    "admin.tsx": "devOnlyRoute",
    "auth.tsx": "devOnlyAuthRoute",
    "dev.communi-g.tsx": "devOnlyRoute",
    "dev.luna.tsx": "devOnlyRoute",
    "dev.middle-loop.tsx": "devOnlyRoute",
    "dev.my-g.tsx": "devOnlyRoute",
  };
  for (const [file, guard] of Object.entries(guarded)) {
    test(`${file} has beforeLoad: ${guard}`, () => {
      const src = readFileSync(`src/routes/${file}`, "utf8");
      expect(src).toContain(`beforeLoad: ${guard},`);
    });
  }

  test("every /dev route file is guarded", () => {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    for (const f of readdirSync("src/routes").filter((n: string) => n.startsWith("dev."))) {
      expect(readFileSync(`src/routes/${f}`, "utf8")).toContain("beforeLoad: devOnlyRoute,");
    }
  });
});

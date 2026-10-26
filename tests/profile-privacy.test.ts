import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/* SEC-04: the member directory must only select public columns. Private
   columns (pronouns, birthday, gender, answers, sparks) are owner-only in the
   database; selecting one makes PostgREST fail the whole directory load. */
describe("directory selects public profile columns only", () => {
  const src = readFileSync("src/data/cloud/directory.ts", "utf8");
  const cols = /PUBLIC_PROFILE_COLUMNS\s*=\s*"([^"]+)"/.exec(src)?.[1].split(",") ?? [];
  test("column list found", () => expect(cols.length).toBeGreaterThan(5));
  for (const c of ["pronouns", "birthday", "gender", "answers", "sparks", "sparkles", "give_sparks"]) {
    test(`does not select ${c}`, () => expect(cols).not.toContain(c));
  }
});

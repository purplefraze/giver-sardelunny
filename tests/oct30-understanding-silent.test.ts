import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const review = readFileSync("src/intelligence/VoiceReview.tsx", "utf8");
const convo = readFileSync("src/intelligence/voice-conversation.ts", "utf8");

describe("oct30 item 6: understanding failures are silent", () => {
  it("the review never renders the understanding error copy", () => {
    expect(review).not.toMatch(/c\.understandingError\s*\?/);
  });
  it("the conversation never surfaces the unavailable copy, and logs instead", () => {
    expect(convo).not.toMatch(/understandingError:\s*(result\.error|UNDERSTANDING_UNAVAILABLE)/);
    expect(convo).toMatch(/logUnderstanding\(/);
  });
  it("a thrown reading falls back to the scripted next question", () => {
    expect(convo).toMatch(/catch\(err\) \{logUnderstanding\(err\);[^\n]*session:nextAsk\(cur\)/);
  });
});

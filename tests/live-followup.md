# Live follow-up model check — 2026-10-09 (bounded, 36 + 4 calls)

Separate from the free local suite (`tests/conversation-regression.test.ts`).
Script: same system prompt and strict schema as `src/lib/followup.functions.ts`.
12 tricky scenarios (departure vs pickup, out-of-order, corrections, flexible
timing, accessibility, "not sure yet" must not become a list).

| model | correct | median | slowest |
|---|---|---|---|
| openai/gpt-6-astra (Responses, reasoning low) | 12/12 | 2.5s | 3.9s |
| openai/gpt-5.6-terra (Responses, reasoning low) | 11/12 (missed a drop-off area) | 1.4s | 1.6s |
| google/gemini-3.8-flash (chat) | 12/12 | 4.7s | 14.1s |

Chosen: `openai/gpt-6-astra`. The rule question shows instantly, so its extra
second is hidden. End-to-end through the signed-in preview: 2/2 returned
`source: "model"` in 3.4–4.4s.

Not proven here: real microphone, Safari recognition, spoken playback, haptics.

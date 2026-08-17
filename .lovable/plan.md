# Giver Prototype → Giver Launchpad: migration and reuse plan

Confirmed and understood:

- **Giver Prototype (this project) is the source of truth and stays intact.** Nothing here is deleted, refactored, downgraded or treated as obsolete. This project remains the reference build.
- **Giver Launchpad is not a redesign and not a fresh start.** It inherits the actual approved frontend from here — files copied verbatim — and adds only the production layer (accounts, database, persistence, cross-user).
- Nothing from the Prototype is considered obsolete unless you explicitly approve removing it.

## Where the work happens

Cross-project access is read-only in both directions: from this chat I can read Launchpad but cannot write to it. So the copy-in runs **inside the Giver Launchpad project**, where I check out a read-only snapshot of this Prototype and copy files across. This document is the manifest for that pass.

## What exists on each side (verified)

Prototype (approved, to be reused verbatim):

- Living G geometry and scale: `src/components/living-g/g-path.ts`, `GStage.tsx`, `LivingG.tsx`
- Typography engine: `type-scale.ts`, `loop-layout.ts`, `loop-text.tsx`, `profile-loop.tsx`
- Selector/toggle: `EarSelector.tsx`, `TopLoopSelector.tsx`
- Onboarding: `src/components/Onboarding.tsx`, `onboarding/IntroG.tsx`, `onboarding/MemberExample.tsx`
- Sample Givers + imagery: `src/data/giver.ts`, `src/assets/giulia.jpg`, `sofia-profile.jpg`, `robin.jpg`, `marcus.jpg`, `me.jpg`
- Profile experience: `ProfileBuilder.tsx`, `FullProfile.tsx`, `SparklesReward.tsx`, `CommunityList.tsx`, `Panel.tsx`, `World.tsx`, `BackArrow.tsx`
- Item model + state: `src/data/items.ts`, `src/data/my-profile.ts`, `hooks/use-items.ts`, `hooks/use-my-profile.ts`
- Design system: `src/styles.css` (semantic colour tokens), `src/lib/haptics.ts`
- Workspace composition: `src/routes/index.tsx`

Launchpad (production layer, to be preserved):

- Supabase integration: `client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`
- Auth + gate: public `routes/index.tsx` (Apple/Google/email), `_authenticated/route.tsx`
- Server functions: `profile.functions.ts`, `items.functions.ts`, `sparks.functions.ts`
- Migrations: `profiles`, `items`, `sample_givers`, `spark_transactions`, `sparkle_boosts`, with RLS, grants and helper functions
- To be replaced by the real thing: `components/giver/LivingG.tsx` (73-line approximation), and the hand-written `_authenticated/onboarding.tsx`, `setup.tsx`, `profile.tsx`, `giver.tsx` screens

## Migration sequence (run in Launchpad, one reviewable step per phase)

**Phase 1 — Design system + Living G.** Copy `src/styles.css`, `src/lib/haptics.ts`, the whole `src/components/living-g/` folder, and `src/assets/*` across unchanged. Merge Launchpad's Supabase/auth-specific CSS additions on top of the Prototype tokens rather than the reverse. Retire `components/giver/LivingG.tsx` and `GiverMark.tsx` (kept in git history, not deleted from the Prototype). Verify the canonical G renders at the same scale as here.

**Phase 2 — Onboarding, verbatim.** Copy `Onboarding.tsx`, `onboarding/IntroG.tsx`, `onboarding/MemberExample.tsx`, `data/giver.ts`, plus `Panel.tsx`, `World.tsx`, `BackArrow.tsx`, `SparklesReward.tsx`. Mount them behind `/_authenticated/onboarding`, replacing the approximated screen. Timing, copy, fades, sample Givers and imagery unchanged.

**Phase 3 — Auth restyled, not redesigned.** Keep Launchpad's auth logic and provider calls exactly as they are; re-skin the public `/` and phone-verification screens with the Prototype's tokens and lowercase display typography. On success the user lands in the real onboarding from Phase 2.

**Phase 4 — Data layer swap behind the same UI.** Keep `ProfileBuilder.tsx`, `FullProfile.tsx`, `CommunityList.tsx` and the workspace composition as-is; replace their data source only. `data/items.ts` / `data/my-profile.ts` become thin adapters with the same exported shape, backed by the existing server functions and tables instead of `localStorage`. Sample Givers move to `sample_givers` reads while keeping the same TypeScript shape `MemberExample` already consumes.

**Phase 5 — Sparks, Sparkles, cross-user.** Wire the first-generosity flow and messaging consent to `spark_transactions` / `profiles.messaging_opt_in`, and the sparkle boost to `sparkle_boosts` with the existing no-self-boost trigger. Community reads move to a real cross-user query.

## Technical notes

- Column mapping to reconcile in Phase 4: Prototype `type` → `items.kind`, `text` → `title`, priority `0`-based → `1`-based, and Prototype statuses `completed`/`paused` are not in the current `items` CHECK constraint — a follow-up migration extends it rather than dropping Prototype states.
- Prototype `itemsStore` is a synchronous `useSyncExternalStore`; the adapter keeps that interface and hydrates from server functions so no component signature changes.
- Prototype `styles.css` is the token authority; anything in Launchpad's CSS that conflicts loses.
- No file in this Prototype project is modified by any phase.

## Next step

Open Giver Launchpad and ask me to run Phase 1. I will check out this Prototype read-only there and report a file-by-file copy list before touching anything.

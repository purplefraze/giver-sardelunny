-- SPARKS THAT SURVIVE LOGINS.
-- profiles.sparks / sparkles already exist. Add companion fields the local
-- my-profile model already keeps (reserved holds, one-time seed flag, rewarded
-- keys), and align the column default with STARTING_SPARKS (50).
--
-- Client sync (boot.ts) always RELOADS currency from this row on sign-in and
-- WRITES it back on earn/spend/seed, so a fresh device sees the same balance.
-- Connection settlement still awards via SECURITY DEFINER RPCs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reserved jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sparks_seeded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rewarded jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  ALTER COLUMN sparks SET DEFAULT 50,
  ALTER COLUMN sparkles SET DEFAULT 0;

-- Rows that already hold a balance are treated as seeded so a new session
-- restores them instead of re-running the welcome gift over the top.
UPDATE public.profiles
SET sparks_seeded = true
WHERE sparks_seeded = false
  AND (sparks > 0 OR sparkles > 0);

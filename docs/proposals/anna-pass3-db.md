# Anna pass 3 — DB impact assessment

**PROPOSAL, NOT APPROVED. Nothing here has been run against any database.**
No migration file was added to `supabase/migrations/`. Apply only with frazer's explicit authorisation.

## 1. Fund goal (`public.items.details->'fundTarget'`)

**Enforced now**
- Frontend: `parseAmount` + `validTarget` (src/data/fund-rules.ts) — whole cents, ≤ 2 decimals,
  `FUND_MIN_CENTS` (100 = $1) .. `FUND_TARGET_MAX_CENTS` (10,000,000 = $100,000).
  `fundGoalProblem` gives a reason per failure; Share stays disabled; guided intake re-asks.
- App write path: `buildPayload` returns null on an invalid target; `items-sync.ts` now refuses to
  upsert an item whose `details.fundTarget` is present but invalid (`fundDetailsOk`).
- DB: **nothing**. `items.details` is unconstrained `jsonb`; RLS ("insert own items" /
  "update own items") only checks ownership.
- `wish_contributions` (20260927150000) checks pledge amounts 100..1,000,000 and reads
  `fundTarget` with `^[0-9]{1,12}$`, but that migration is marked NOT APPLIED to the live project.

**Why app code is not enough**: items are written directly from the browser with the anon key +
user JWT (`supabase.from("items").upsert`). There is no server function in the path, so every
app-side check can be bypassed with a hand-made request.

**Proposed SQL diff**
```sql
alter table public.items
  add constraint items_fund_target_valid check (
    not (details ? 'fundTarget')
    or (
      jsonb_typeof(details->'fundTarget') = 'number'
      and (details->>'fundTarget') ~ '^[0-9]{1,12}$'
      and (details->>'fundTarget')::bigint between 100 and 10000000
    )
  ) not valid;
-- after checking existing rows (see below):
alter table public.items validate constraint items_fund_target_valid;
```
Rollback: `alter table public.items drop constraint if exists items_fund_target_valid;`

**Could existing data violate it?** Judged from schema + seeds only (prod NOT queried): the
migrations seed no `items` rows, and current app code only writes integer cents via `validTarget`.
Rows written by older builds or by hand cannot be ruled out — hence `NOT VALID` first, then a
read-only count (`select count(*) from items where details ? 'fundTarget' and not (...)`) that
someone authorised must run before `VALIDATE`.

**Migration / testing**: one new migration file; test locally with `supabase db reset` + inserts of
100, 10000000 (pass) and 0, 99, 10000001, 12.5, '"1200"' (fail); confirm the app still shares a
$1,200 fund and that `wish_contributions` (if later applied) still reads the target.

**Risk of not applying**: a crafted request can store a negative, zero, fractional or huge goal
that other people then see on the fund card and progress bar.

## 2. Username (`public.profiles.handle`)

**Enforced now**
- DB: `handle text unique` (20260827012603 line 35) — uniqueness is real, enforced only here.
  No format or length check; NULL allowed.
- Server: `handleAvailable` (src/lib/account.functions.ts) — zod 3..20, now also `^[a-z0-9._-]+$`;
  looks the handle up and reports availability. Advisory only (race between check and insert).
  `joinGiver` (invites.functions.ts) normalises and appends a random suffix if taken; the unique
  constraint is the final guard.
- Frontend: `normaliseHandle` (a-z 0-9 . _ -, max 20), `checkHandle` min 3 + reserved words +
  local sample members + `handleAvailable`. New (PROPOSAL, frazer to approve): must start and end
  with a letter or number (`HANDLE_SHAPE`). The frontend never claims a name is unique by itself.

**Why app code is not enough**: profiles can be updated straight from the client under RLS, so the
format rules are bypassable; only the DB can make them hold.

**Proposed SQL diff (PROPOSAL)**
```sql
alter table public.profiles
  add constraint profiles_handle_format check (
    handle is null or handle ~ '^[a-z0-9](?:[a-z0-9._-]{1,18})[a-z0-9]$'
  ) not valid;
alter table public.profiles validate constraint profiles_handle_format;
```
Rollback: `alter table public.profiles drop constraint if exists profiles_handle_format;`
(Case-insensitive uniqueness is already implied if the format check forces lowercase.)

**Could existing data violate it?** Seeds `giulia`, `sofia`, `robin`, `marcus` pass. Real users'
handles were normalised by `joinGiver`, but a handle like `_x`, `ab`, or one ending in `.` could
exist (old rules allowed them; random suffix makes handles up to 23 chars — **would violate the
20-char max**). Needs an authorised read-only count before `VALIDATE`; offending rows need a
rename plan. Also `joinGiver` should cap the base at 17 chars before adding the suffix (app change,
not made here — flagged).

**Migration / testing**: one migration; local reset; insert valid/invalid handles; run sign-up and
profile-rename flows.

**Risk of not applying**: malformed or over-long names can be stored by a crafted request; no
security impact beyond display/impersonation-by-lookalike.

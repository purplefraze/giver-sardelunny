#!/usr/bin/env bash
# SEC-04 pronouns tests on a LOCAL throwaway Postgres (never a Supabase project).
# usage: PGPORT=55433 PGHOST=/tmp supabase/tests/run_local_pronouns.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -U postgres -v ON_ERROR_STOP=1 -q -X"
export PGOPTIONS='-c client_min_messages=warning'
rollback_sql() { awk '/^-- ROLLBACK/{r=1} r && /^-- +begin;/{b=1} b{print} b && /commit;/{exit}' "$1" | sed -E 's/^-- ?//' | grep -vE '^ *--'; }
DB=sec_pronouns
$P -c "drop database if exists $DB" -c "create database $DB" >/dev/null
$P -d $DB -f supabase/tests/00_supabase_shim.sql >/dev/null
for f in supabase/migrations/20260827*.sql; do $P -d $DB -f "$f" >/dev/null; done
$P -d $DB -f supabase/unapplied/20261026_05_my_profile.sql >/dev/null
$P -d $DB -f supabase/unapplied/20261026_05_my_profile.sql >/dev/null   # idempotent
$P -d $DB -f supabase/unapplied/20261026_06_pronouns_owner_only.sql >/dev/null
$P -d $DB -f supabase/unapplied/20261026_06_pronouns_owner_only.sql >/dev/null   # idempotent
$P -d $DB -f supabase/tests/70_pronouns_lock_tests.sql >/dev/null
rollback_sql supabase/unapplied/20261026_06_pronouns_owner_only.sql | $P -d $DB >/dev/null
$P -d $DB -f supabase/tests/71_pronouns_rollback_tests.sql >/dev/null
$P -d $DB -At -F' | ' -c "select case when ok then 'PASS' else 'FAIL' end, name, detail from t.results order by n"
$P -d $DB -At -c "select count(*) filter (where ok)||' pass / '||count(*) filter (where not ok)||' fail' from t.results"
test "$($P -d $DB -At -c "select count(*) from t.results where not ok")" = 0

#!/usr/bin/env bash
# Runs the security tests on a LOCAL throwaway Postgres (never a Supabase project).
# usage: PGPORT=55432 PGHOST=/tmp supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -U postgres -v ON_ERROR_STOP=1 -q -X"
fresh() { $P -c "drop database if exists $1" -c "create database $1" >/dev/null;
  $P -d $1 -f supabase/tests/00_supabase_shim.sql >/dev/null
  for f in supabase/migrations/20260827*.sql; do $P -d $1 -f "$f" >/dev/null; done
  $P -d $1 -f supabase/tests/01_prod_drift_shim.sql >/dev/null; }
rollback_sql() { awk '/^-- ROLLBACK/{r=1} r && /^-- +begin;/{b=1} b{print} b && /commit;/{exit}' "$1" | sed -E 's/^-- ?//' | grep -vE '^ *--'; }
report() { $P -d $1 -At -F' | ' -c "select case when ok then 'PASS' else 'FAIL' end, name, detail from t.results order by n"; }
export PGOPTIONS='-c client_min_messages=warning'
# 1) prod-shaped: Aug-27 + prod drift, then 01, 02, tests, then 01b + its tests
fresh sec_main
$P -d sec_main -f supabase/unapplied/20261015_01_spark_lock.sql
$P -d sec_main -f supabase/unapplied/20261015_02_live_give_gate.sql
$P -d sec_main -f supabase/tests/10_security_tests.sql >/dev/null
$P -d sec_main -f supabase/unapplied/20261015_01b_spark_column_revoke.sql
$P -d sec_main -f supabase/tests/20_column_revoke_tests.sql >/dev/null
echo "== prod-shaped run"; report sec_main
# 2) rollback: apply rollback blocks of 01b, 02, 01 (reverse order) then re-test
rollback_sql supabase/unapplied/20261015_01b_spark_column_revoke.sql | $P -d sec_main >/dev/null
rollback_sql supabase/unapplied/20261015_02_live_give_gate.sql | $P -d sec_main >/dev/null
rollback_sql supabase/unapplied/20261015_01_spark_lock.sql | $P -d sec_main >/dev/null
$P -d sec_main -c "truncate t.results" >/dev/null
$P -d sec_main -f supabase/tests/40_rollback_tests.sql >/dev/null
echo "== rollback run"; report sec_main
# 3) with Sep-23 sync present (future-compat for reserved)
fresh sec_sep23
$P -d sec_sep23 -f supabase/migrations/20260923160000_profile_sparks_sync.sql >/dev/null
$P -d sec_sep23 -f supabase/unapplied/20261015_01_spark_lock.sql
$P -d sec_sep23 -f supabase/unapplied/20261015_02_live_give_gate.sql
$P -d sec_sep23 -c "create schema t" >/dev/null
sed -n '1,/^-- ---- synthetic/p' supabase/tests/10_security_tests.sql | $P -d sec_sep23 >/dev/null
$P -d sec_sep23 -f supabase/tests/30_reserved_tests.sql >/dev/null
echo "== Sep-23 present run"; report sec_sep23
for d in sec_main sec_sep23; do $P -d $d -At -c "select count(*) filter (where ok)||' pass / '||count(*) filter (where not ok)||' fail' from t.results"; done

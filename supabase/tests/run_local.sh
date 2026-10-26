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
# 4) full app flow in SHIP ORDER: 01 (+03, 02) -> client -> 01b
fresh sec_flow
$P -d sec_flow -f supabase/unapplied/20261015_01_spark_lock.sql
$P -d sec_flow -f supabase/unapplied/20261015_03_holds_sparkles_fund.sql
$P -d sec_flow -f supabase/unapplied/20261015_02_live_give_gate.sql
sed -n '1,/^-- ---- synthetic/p' supabase/tests/10_security_tests.sql | $P -d sec_flow >/dev/null
$P -d sec_flow -f supabase/tests/50_flow_tests.sql >/dev/null
$P -d sec_flow -f supabase/unapplied/20261015_01b_spark_column_revoke.sql
$P -d sec_flow -f supabase/tests/55_after_01b_tests.sql >/dev/null
echo "== app flow (ship order 01 -> client -> 01b) run"; report sec_flow
rollback_sql supabase/unapplied/20261015_03_holds_sparkles_fund.sql | $P -d sec_flow >/dev/null
$P -d sec_flow -At -c "select 'rollback 03 ok: '||(to_regprocedure('public.spend_my_sparkle(uuid)') is null)"
# 5) Fund: with Sep-27 wish_contributions present
fresh sec_fund
# TEST-ONLY shim: Sep-27 calls public.owns_profile/is_admin, which prod no longer
# has (moved to app_private). Reconciliation task must fix Sep-27 itself.
$P -d sec_fund -c "create function public.owns_profile(uuid) returns boolean language sql stable as 'select app_private.owns_profile(\$1)'; create function public.is_admin() returns boolean language sql stable as 'select app_private.is_admin()';" >/dev/null
$P -d sec_fund -f supabase/migrations/20260927150000_wish_contributions.sql >/dev/null
$P -d sec_fund -f supabase/unapplied/20261015_01_spark_lock.sql
$P -d sec_fund -f supabase/unapplied/20261015_03_holds_sparkles_fund.sql
sed -n '1,/^-- ---- synthetic/p' supabase/tests/10_security_tests.sql | $P -d sec_fund >/dev/null
$P -d sec_fund -f supabase/tests/60_fund_tests.sql >/dev/null
echo "== Sep-27 present (fund) run"; report sec_fund
# 6) 04 boost_count lock, in SHIP ORDER 01 (+03, 04, 02) -> client -> 01b,
#    with the full app-flow suite re-run on top of 04, then 04's ROLLBACK
fresh sec_boost
$P -d sec_boost -f supabase/unapplied/20261015_01_spark_lock.sql
$P -d sec_boost -f supabase/unapplied/20261015_03_holds_sparkles_fund.sql
$P -d sec_boost -f supabase/unapplied/20261026_04_boost_count_lock.sql
$P -d sec_boost -f supabase/unapplied/20261015_02_live_give_gate.sql
sed -n '1,/^-- ---- synthetic/p' supabase/tests/10_security_tests.sql | $P -d sec_boost >/dev/null
$P -d sec_boost -f supabase/tests/50_flow_tests.sql >/dev/null
$P -d sec_boost -f supabase/tests/70_boost_count_tests.sql >/dev/null
$P -d sec_boost -f supabase/unapplied/20261015_01b_spark_column_revoke.sql
$P -d sec_boost -f supabase/tests/55_after_01b_tests.sql >/dev/null
echo "== 04 boost_count lock (flow suite + 04 tests, ship order) run"; report sec_boost
$P -d sec_boost -At -c "select '04 lock: '||count(*) filter (where ok)||' pass / '||count(*) filter (where not ok)||' fail' from t.results"
rollback_sql supabase/unapplied/20261026_04_boost_count_lock.sql | $P -d sec_boost >/dev/null
$P -d sec_boost -c "truncate t.results" >/dev/null
$P -d sec_boost -f supabase/tests/75_boost_rollback_tests.sql >/dev/null
echo "== 04 rollback run"; report sec_boost
for d in sec_main sec_sep23 sec_flow sec_fund; do $P -d $d -At -c "select count(*) filter (where ok)||' pass / '||count(*) filter (where not ok)||' fail' from t.results"; done
$P -d sec_boost -At -c "select '04 rollback: '||count(*) filter (where ok)||' pass / '||count(*) filter (where not ok)||' fail' from t.results"

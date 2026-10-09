#!/usr/bin/env bash
# בדיקת המסד על Postgres מקומי — לא צעד של מאור, זה הכלי של מי שכותב מיגרציה.
#
# מקים מסד ריק עם auth ו-storage מדומים ועם הטבלאות של DUBID לצידו (supabase/tests/00),
# מריץ את כל supabase/migrations פעמיים ברצף, ואז את בדיקות התקיפה והזרימה (10, 20, 30, 31, 40, 41, 50, 60).
# נכשל על כל שגיאה ועל כל שורת FAIL.
#
#   PGHOST=/tmp PGPORT=5499 PGUSER=postgres scripts/db/verify.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${WORKER_TEST_DB:-worker_verify}
psql -qc "drop database if exists $DB" -c "create database $DB" >/dev/null
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f supabase/tests/00-supabase-stub.sql >/dev/null 2>&1
for round in 1 2; do
  for file in supabase/migrations/*.sql; do
    psql -d "$DB" -v ON_ERROR_STOP=1 -qAt -f "$file" >/dev/null 2>/tmp/verify-err.txt || { cat /tmp/verify-err.txt; exit 1; }
  done
done
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f supabase/tests/10-portal.sql >/dev/null 2>/tmp/verify-err.txt || { cat /tmp/verify-err.txt; exit 1; }
out=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/20-collector.sql 2>&1) || { echo "$out" | grep -E "FAIL|ERROR"; exit 1; }
echo "$out" | grep -c PASS | xargs -I{} echo "db verify: migrations twice, portal smoke, {} collector assertions — clean"
bc=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/30-blind-cow.sql 2>&1) || { echo "$bc" | grep -E "FAIL|ERROR"; exit 1; }
echo "$bc" | grep -c PASS | xargs -I{} echo "db verify: {} blind-cow (gate 10 duel) assertions — clean"
lv=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/31-blind-cow-live.sql 2>&1) || { echo "$lv" | grep -E "FAIL|ERROR"; exit 1; }
echo "$lv" | grep -c PASS | xargs -I{} echo "db verify: {} blind-cow LIVE duel assertions — clean"
ev=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/40-events.sql 2>&1) || { echo "$ev" | grep -E "FAIL|ERROR"; exit 1; }
echo "$ev" | grep -c PASS | xargs -I{} echo "db verify: {} measurement (worker_events) assertions — clean"
ab=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/50-away-been.sql 2>&1) || { echo "$ab" | grep -E "FAIL|ERROR"; exit 1; }
echo "$ab" | grep -c PASS | xargs -I{} echo "db verify: {} away-days \"הייתי שם\" (worker_away_been) assertions — clean"
tx=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/41-events-taxonomy.sql 2>&1) || { echo "$tx" | grep -E "FAIL|ERROR"; exit 1; }
echo "$tx" | grep -c PASS | xargs -I{} echo "db verify: {} event taxonomy (ONE RED WORLD §37) assertions — clean"
sx=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/70-market-search.sql 2>&1) || { echo "$sx" | grep -E "FAIL|ERROR"; exit 1; }
echo "$sx" | grep -c PASS | xargs -I{} echo "db verify: {} shirt hub (search, saved searches, wanted board) assertions — clean"
dx=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/71-deal-wave2.sql 2>&1) || { echo "$dx" | grep -E "FAIL|ERROR"; exit 1; }
echo "$dx" | grep -c PASS | xargs -I{} echo "db verify: {} shirt hub wave 2 (bundle, handover, feedback) assertions — clean"
cx=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/72-circles-wave3.sql 2>&1) || { echo "$cx" | grep -E "FAIL|ERROR"; exit 1; }
echo "$cx" | grep -c PASS | xargs -I{} echo "db verify: {} shirt hub wave 3 (place, circles, pipe, identification help) assertions — clean"
st=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/60-stand.sql 2>&1) || { echo "$st" | grep -E "FAIL|ERROR"; exit 1; }
echo "$st" | grep -c PASS | xargs -I{} echo "db verify: {} \"היציע שלי\" (worker_stand_*) attack and flow assertions — clean"
pi=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/60-public-identity.sql 2>&1) || { echo "$pi" | grep -E "FAIL|ERROR"; exit 1; }
echo "$pi" | grep -c PASS | xargs -I{} echo "db verify: {} public identity (אדום #N, ONE RED WORLD §35) assertions — clean"

#!/bin/sh
# הצינור כולו, בסדר. כל שלב קורא מ-content/manual/ וכותב לשם — אין תלות ב-/tmp
# ואין תלות ברשת: המקורות הגולמיים נשמרו בריפו בדיוק כפי שנקראו.
set -e
cd "$(dirname "$0")/../.."
python3 scripts/players/wiki_match.py        # ויקיפדיה עברית → הארכיון
python3 scripts/players/en_bridge.py > /dev/null   # ויקיפדיה אנגלית → מה שנשאר
python3 scripts/players/wf_all.py            # worldfootball כל-הזמנים → הארכיון
python3 scripts/players/sync_raw.py          # שלוש התוצאות → player-facts-wiki.json
python3 scripts/players/merge.py             # מיזוג חמשת המקורות → player-facts.json

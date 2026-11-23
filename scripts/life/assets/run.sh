#!/usr/bin/env bash
# LIFE character assets: the whole build, in order. Runs on the GitHub runner (see .github/workflows/life-assets.yml).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../.." && pwd)"
: "${LIFE_PACKS:?}" "${LIFE_WORK:?}"
mkdir -p "$LIFE_WORK"; export LIFE_DATA="$LIFE_WORK/mpfb-data"
bash "$HERE/fetch_packs.sh" "$LIFE_PACKS" "$LIFE_DATA"
python3 "$HERE/catalogue.py" "$LIFE_DATA" "$LIFE_PACKS" "$ROOT/docs/life/assets-catalogue" "$HERE/vendor"

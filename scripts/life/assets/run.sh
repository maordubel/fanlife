#!/usr/bin/env bash
# LIFE character assets: one part of the build (see .github/workflows/life-assets.yml).
#   run.sh cast    the catalogue, the clips, the cast and its previews (raw GLBs into $LIFE_WORK)
#   run.sh looks   the looks of shard $LIFE_SHARD (i/n) and their previews
#   run.sh all     both, then finish.py (a local run)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../.." && pwd)"; MODE="${1:-all}"
: "${LIFE_PACKS:?}" "${LIFE_WORK:?}"
mkdir -p "$LIFE_WORK"; export LIFE_DATA="$LIFE_WORK/mpfb-data"
bash "$HERE/fetch_packs.sh" "$LIFE_PACKS" "$LIFE_DATA"
QUIET='^\[(INFO|WARN|DEBUG) ?\]|Applied modifier was not first|^\s*$|Sample [0-9]|\| (Loading|Updating|Synchronizing|Initializing|Building|Waiting|Finishing|Denoising|Finished|Rendering)'
if [ "$MODE" = cast ] || [ "$MODE" = all ]; then
  python3 "$HERE/catalogue.py" "$LIFE_DATA" "$LIFE_PACKS" "$ROOT/docs/life/assets-catalogue" "$HERE/vendor" || true
  python3 "$HERE/build_clips.py" "$LIFE_WORK" 2>&1 | grep -vE '^\[(INFO|WARN|DEBUG) ?\]'
  python3 "$HERE/build_cast.py" "$LIFE_WORK" "${LIFE_ONLY:-}" 2>&1 | grep -vE "$QUIET"
fi
if [ "$MODE" = looks ] || [ "$MODE" = all ]; then
  python3 "$HERE/build_looks.py" "$LIFE_WORK" "${LIFE_SHARD:-0/1}" "${LIFE_ONLY:-}" 2>&1 | grep -vE "$QUIET"
fi
if [ "$MODE" = all ]; then python3 "$HERE/finish.py" "$LIFE_WORK" "$ROOT"; fi

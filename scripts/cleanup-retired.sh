#!/usr/bin/env bash
# Delete every file this project has retired.
#
# Why this exists: a delta that REPLACES a screen ships the new file, but the old one
# stays in git until someone deletes it — and a stale import is a red build on Vercel
# even though everything local is green. Twice now that has been
# `app/kits/build/KitChallengeBoard.tsx` importing a server action that no longer
# exists. This script is idempotent: run it after any delta, commit, push.
#
#   bash scripts/cleanup-retired.sh && git commit -am "remove retired files"
set -u

RETIRED=(
  "app/kits/build/KitChallengeBoard.tsx"   # → app/kits/build/KitRun.tsx
  "app/trivia/TriviaRound.tsx"             # → app/trivia/TriviaRun.tsx
  "app/trivia/summary/page.tsx"            # the run now ends in place
  "app/trivia/summary/ShareCard.tsx"       # → components/share/ShareRow.tsx
  "components/press/StoryCard.tsx"         # → lib/share/story.ts
  "app/derby/BlackFile.tsx"                # → app/derby/file/BlackFile.tsx
  "app/derby/actions.ts"                   # → app/derby/file/actions.ts
  "app/icon.svg"                           # → public/brand/logo-192.png
)
RETIRED_DIRS=(
  "app/trivia/summary"
)

removed=0
for path in "${RETIRED[@]}"; do
  if [ -e "$path" ]; then
    git rm -f -- "$path" >/dev/null 2>&1 || rm -f -- "$path"
    echo "removed  $path"
    removed=$((removed + 1))
  fi
done
for dir in "${RETIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    rm -rf -- "$dir"
    echo "removed  $dir/"
    removed=$((removed + 1))
  fi
done

if [ "$removed" -eq 0 ]; then
  echo "nothing to remove — the tree is already clean"
else
  echo
  echo "$removed removed. Now: git commit -am 'remove retired files' && git push"
fi

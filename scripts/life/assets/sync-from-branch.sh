#!/usr/bin/env bash
# Re-sync the LIFE character assets (skinned humans, clips, manifest, previews)
# from the asset pipeline's branch into this working tree. Run from anywhere.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git fetch --depth=5 origin claude/life-assets
git checkout FETCH_HEAD -- public/life/assets docs/life/ASSETS-PIPELINE.md docs/life/assets-preview
git log -1 --format='synced from claude/life-assets @ %h (%ci)' FETCH_HEAD

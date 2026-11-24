#!/usr/bin/env bash
# Download (once; the runner caches the folder) and unpack the MakeHuman asset packs named in packs.txt.
# $1 = folder for the zips, $2 = folder the packs are unpacked into (MPFB's user data folder).
set -euo pipefail
ZIPS="$1"; DATA="$2"; HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$ZIPS" "$DATA"
grep -v '^#' "$HERE/packs.txt" | while read -r name path lic; do
  [ -z "$name" ] && continue
  z="$ZIPS/$name.zip"
  if [ ! -s "$z" ] && [ -s "$HERE/vendor/$name.zip" ]; then cp "$HERE/vendor/$name.zip" "$z"; fi
  if [ ! -s "$z" ]; then
    for host in https://files.makehumancommunity.org https://files2.makehumancommunity.org; do
      echo "fetch $name from $host"
      if curl -fsSL --retry 3 --max-time 900 -o "$z.part" "$host/$path"; then mv "$z.part" "$z"; break; fi
    done
  fi
  [ -s "$z" ] || { echo "::error::could not download $name"; exit 1; }
  unzip -qo "$z" -d "$DATA"
  echo "$name $(du -h "$z" | cut -f1)"
done

#!/bin/sh
# delta 22: commit, list every file changed since the `delta-21` tag, zip them ≤100 per archive
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
Everyone was moonwalking: one constant for which way a painting faces

Every profile in this game is painted facing LEFT — pogi-side, hero80-side, teen-side,
soldier-march, and every walk frame in the packs Maor approved. The engine assumed the
opposite and flipped when heading left, so the child faced left while walking right and
right while walking left: backwards in both directions, in every chapter, since the first
sheet shipped. No test could see it — the walk probe screenshots him standing still and a
unit test cannot look at a picture. `WorldScene.ART_FACES` now holds the convention in one
place, for the player, the background walkers and a scheduled actor with a heading, and
facing-probe.mjs takes the two pictures that prove it.

And the Production Clean pack, ingested under his standing rule that an approved file
OVERWRITES the key it replaces: 44 keys — the six tunnel textures, two Ussishkin halls,
eight panoramas, gate 5, Rachel's eight poses, Barry and grown-up Efi, Michel's walk, the
title. Five actors who had been standing behind generic crowd sheets are now the real
characters. barry96-side arrived facing right and was mirrored on disk rather than at
runtime, so the file is the truth.

life:play passes with hue 0 at all nine tour stops for the first time.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status delta-23 HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^tsconfig.all.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta24full.txt
wc -l < /tmp/delta24full.txt
OUT=${DELIVER_OUT:-/mnt/user-data/outputs}
mkdir -p "$OUT"
rm -f "$OUT"/the-worker-delta-24-*.zip
python3 - "$OUT" <<'EOF'
import zipfile, os, sys
files=[l.strip() for l in open('/tmp/delta24full.txt') if l.strip()]
media=[f for f in files if f.startswith('public/') or f.startswith('content/audio/')]
code=[f for f in files if f not in media]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out=sys.argv[1]
for kind,lst in (('code',code),('media',media)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-24-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
open('/tmp/delta24-list.txt','w').write('\n'.join(files))
EOF
cp docs/life/STATUS-2026-09-05-DELTA-24.md "$OUT"/

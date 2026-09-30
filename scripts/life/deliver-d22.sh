#!/bin/sh
# delta 22: commit, list every file changed since the `delta-21` tag, zip them ≤100 per archive
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
Gate 7 from the grass: the terrace he painted, and a room cut to fit it

The picture is the source now, not the brief. The tread lines, the top of the pitch-side
railing and the mouth of the entrance were measured off the file and `scenes.ts` was set
to them — walk band 0.632-0.752, so the child stands ON the steps with the railing in
front of him, and the way out is the entrance the painter drew rather than the edge of
the frame. A metre is 0.056 of this frame, so everybody in the room is drawn at 1.3 times
life size: one consistent cheat, which reads as a closer camera and keeps an eight-year-
old findable on a phone.

The crowd is drawn twice. Nine hundred people is a frame-rate bug, so everything from the
ninth step back is one baked image of 2,601 figures composited out of the same crowd
sheets the game already ships (bake-gate7-crowd.py, 255KB, a third of the shirts pushed to
Hapoel red), and only the nine front rows are live and bouncing. The seam is the top of
the walk band, where a painted shoulder and a sprite shoulder are the same size.

The stale parallax planes went with the old painting. The yellow scanner went with the
pitch: 24,667 pixels to 6, and `life:play` passes end to end for the first time since
delta 20 — without touching the scanner or the stadium grade.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status delta-21 HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^tsconfig.all.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta22full.txt
wc -l < /tmp/delta22full.txt
OUT=${DELIVER_OUT:-/mnt/user-data/outputs}
mkdir -p "$OUT"
rm -f "$OUT"/the-worker-delta-22-*.zip
python3 - "$OUT" <<'EOF'
import zipfile, os, sys
files=[l.strip() for l in open('/tmp/delta22full.txt') if l.strip()]
media=[f for f in files if f.startswith('public/') or f.startswith('content/audio/')]
code=[f for f in files if f not in media]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out=sys.argv[1]
for kind,lst in (('code',code),('media',media)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-22-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
open('/tmp/delta22-list.txt','w').write('\n'.join(files))
EOF
cp docs/life/STATUS-2026-09-05-DELTA-22.md docs/life/GATE7-GEOMETRY.md docs/life/PROMPT-GATE7-STAND-1986.md "$OUT"/

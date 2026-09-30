#!/bin/sh
# delta 22: commit, list every file changed since the `delta-21` tag, zip them ≤100 per archive
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
A wall is not a walk: the front door stops swallowing the first day

A robot that plays a FRESH life, from the first frame, using only doors the game says are
open (scripts/life/longplay.mjs). It got stuck on day one, exactly as the owner reported:
out of the flat, sucked back in, out, back in, from 15:52 to 19:16 — so the bread was
never bought, the day never ended, and the key and the father that come after it never
happened at all.

Three things were wrong with the doors, and all three are the same mistake — a doorway
that acts on a player who is not choosing it:
- a door opened while a direction was HELD rather than while the child actually moved, so
  a child pinned against the left wall walked forever inside the doorway;
- the door you came out of counted as behind you the moment you left its rectangle, which
  at a spawn is frame one, so it guarded nothing;
- six doors on sixteen hundred pixels of street were full-height, so walking east fell
  through every one of them. They now sit at the depth of the pavement, like the alley
  mouth that solved this two passes ago: walking along passes them, turning in enters.

And the first piece of the map that opens at its moment: the turning to Ussishkin is not
shut, it is NOT THERE, until Efi says "behind the wall, right" and raises life:knows:hall.

Four chapters deep where the game used to end on day one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status delta-22 HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^tsconfig.all.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta23full.txt
wc -l < /tmp/delta23full.txt
OUT=${DELIVER_OUT:-/mnt/user-data/outputs}
mkdir -p "$OUT"
rm -f "$OUT"/the-worker-delta-23-*.zip
python3 - "$OUT" <<'EOF'
import zipfile, os, sys
files=[l.strip() for l in open('/tmp/delta23full.txt') if l.strip()]
media=[f for f in files if f.startswith('public/') or f.startswith('content/audio/')]
code=[f for f in files if f not in media]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out=sys.argv[1]
for kind,lst in (('code',code),('media',media)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-23-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
open('/tmp/delta23-list.txt','w').write('\n'.join(files))
EOF
cp docs/life/STATUS-2026-09-05-DELTA-23.md "$OUT"/

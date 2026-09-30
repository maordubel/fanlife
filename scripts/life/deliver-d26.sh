#!/bin/sh
# delta 22: commit, list every file changed since the `delta-21` tag, zip them ≤100 per archive
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
Half-size people and three mothers: the proportion fault was one bug, and it was mine

Every figure this game ever drew fills its own PNG, because the engine scales a figure by
the height of its FILE. The Production Clean pack ships on a fixed 512x1024 canvas with the
person inside it, filling 49-61% of the height — so Rachel, Barry, Efi and Michel were
rendering at roughly half the height they were placed at, next to people drawn to the old
rule. Twenty-nine files trimmed to their own alpha box, and they are back on one rule.

The kiosk counter Maor photographed is the same sentence upside down. Measured at the size
the game draws that painting, Rafi stands 185px for 1.75m while the counter measures 205px
— a 1.94m shop counter. So the room's metre is set from the counter (0.315 of the frame)
and all twenty-seven figure sizes in it are rewritten from real heights rather than from a
scale factor: a man 0.551, a boy of eight 0.403, the shirt on the rail 0.227.

And there were three Rachels in the folder — the approved one, a 1940s woman in a polka
dress, and a third with an apron — so the player met a different mother in almost every
scene. Fourteen legacy filenames overwritten by the nearest approved pose, under their own
names, per the standing rule.

Five more transitions cut from the 1989 reel; one landed on a drawing instead of a street
and was thrown away rather than shipped.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status delta-25 HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^tsconfig.all.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta26full.txt
wc -l < /tmp/delta26full.txt
OUT=${DELIVER_OUT:-/mnt/user-data/outputs}
mkdir -p "$OUT"
rm -f "$OUT"/the-worker-delta-26-*.zip
python3 - "$OUT" <<'EOF'
import zipfile, os, sys
files=[l.strip() for l in open('/tmp/delta26full.txt') if l.strip()]
media=[f for f in files if f.startswith('public/') or f.startswith('content/audio/')]
code=[f for f in files if f not in media]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out=sys.argv[1]
for kind,lst in (('code',code),('media',media)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-26-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
open('/tmp/delta26-list.txt','w').write('\n'.join(files))
EOF
cp docs/life/STATUS-2026-09-05-DELTA-26.md "$OUT"/

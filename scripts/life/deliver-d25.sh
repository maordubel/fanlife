#!/bin/sh
# delta 22: commit, list every file changed since the `delta-21` tag, zip them ≤100 per archive
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
The collection: seven real shirts, a rail in the kiosk, and Tel Aviv 1989 as the transition

Maor photographed the shirts he wants collectable, so they are cut off their photographs
onto one 1024 canvas each and made into the only object in this game that outlives a day:
`own:shirt:<id>` is one of the six flag prefixes that survive `day.entered` and
`year.entered`, so the VISA he counts a tin out for in the summer of 1985 is still in the
drawer in 2000, and the collection is the only thing here that measures a whole life.

The shirt hangs in Rafi's window from A4 — visible in the room the saving is for — and the
same painting is what the card holds up when it is finally bought: full glass, the shirt
big, "you bought your first Hapoel shirt", the sponsor and the years under it, and 1/7 in
the corner so the second one already reads as a set with a gap. From 1990 the same rail is
a fan shop, generated out of the collection rather than typed: one conversation per
chapter, holding the kits that exist by then at the price of their decade. The rail is
therefore a calendar — two shirts in 1990, seven after the double.

And the transitions are not drawn. Minute sixteen of Meir Mendelssohn's Tel Aviv, 1989, is
the promenade between Bloomfield and Ussishkin, which is the journey this game keeps
describing in words; four clips of it, cropped to 16:9, graded to the palette, faded, mute.

Two shirts were photographed on a floor and the automatic cut leaves a fringe of it. They
are held back rather than shipped dirty.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status delta-24 HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^tsconfig.all.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta25full.txt
wc -l < /tmp/delta25full.txt
OUT=${DELIVER_OUT:-/mnt/user-data/outputs}
mkdir -p "$OUT"
rm -f "$OUT"/the-worker-delta-25-*.zip
python3 - "$OUT" <<'EOF'
import zipfile, os, sys
files=[l.strip() for l in open('/tmp/delta25full.txt') if l.strip()]
media=[f for f in files if f.startswith('public/') or f.startswith('content/audio/')]
code=[f for f in files if f not in media]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out=sys.argv[1]
for kind,lst in (('code',code),('media',media)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-25-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
open('/tmp/delta25-list.txt','w').write('\n'.join(files))
EOF
cp docs/life/STATUS-2026-09-05-DELTA-25.md "$OUT"/

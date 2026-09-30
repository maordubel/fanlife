#!/bin/sh
# delta 20 (fixed): commit, list the changed files since the last upload, zip them ≤100 each
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
The painting owns the glass: height-fit framing, no smear; the concept-board sprites gone; the shell scales with the screen; linear filtering; a face for every speaker

- frameWorld: the picture fills the glass by height with a 6% dark margin, the camera
  follows sideways; bounds clamp to that margin so the extension strips are a hairline.
- fanA–G (pixel sprites with a white halo) replaced everywhere by the September adults.
- The shell over the painting zooms with the glass (1× phone → 1.5× desktop).
- pixelArt off: photographic art gets linear filtering.
- 25 portrait plates cut from each speaker's own figure (make-faces.py); faceFan retired.
- The child at the turnstiles 15% taller; the room budget counts unique textures.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status ee26197e HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta20full.txt
wc -l < /tmp/delta20full.txt
rm -f /mnt/user-data/outputs/the-worker-delta-20-*.zip
python3 - <<'EOF'
import zipfile, os
files=[l.strip() for l in open('/tmp/delta20full.txt') if l.strip()]
code=[f for f in files if not f.startswith('public/')]
art=[f for f in files if f.startswith('public/')]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out='/mnt/user-data/outputs'
for kind,lst in (('code',code),('art',art)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-20-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
EOF
cp docs/life/STATUS-2026-09-05.md docs/life/GRAPHICS-REQUESTS.md /mnt/user-data/outputs/

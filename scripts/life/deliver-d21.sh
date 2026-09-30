#!/bin/sh
# delta 21: commit, list every file changed since the `delta-20` tag, zip them ≤100 per archive
set -e
cd /root/worker
git add -A
git commit -q -F - <<'MSG' || true
Sixty seconds of match: a director, a board, the crowd as a state machine on the owner's recording; shekels; the discovered checklist; prices that land later

- matchScripts.ts + matchDirector.ts: nine directed matches (the 1986 final, 2.5.98, the 99 cup,
  the Hatikva, the double, two Galil games, two hall nights). Board from the archive only; a
  minute only where the archive holds one; 2–3 short prompts; the film at the goal step.
- audio.ts: LOW_MURMUR → … → FINAL_WHISTLE on one gain node, one loop, cuts that wait for
  their bytes, tab-dark suspend, ducking; the park recording as the street's ambience.
- money.ts: `12 ₪`, `קיבלת 5 ₪`, `שילמת 8 ₪`; the 86/90/91 economies rounded to whole shekels.
- checklist.ts: steps that appear when the world shows them, under the "?".
- consequence.ts: a red line now, a booked line later, kept in the state.
- "הכרת את X" / "X יזכור את זה" toasts with kickers, queued behind the line on screen.
- ART-REQUIRED.md; fanA–G retired; eslint config; tests for all of it.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NgFPkio27cie5EAHuYMwQH
MSG
git log --oneline -1
git diff --name-status delta-20 HEAD | grep -v "^D" | awk '{print $NF}' | grep -v "^node_modules/\|^\.next/\|^tsconfig.tsbuildinfo\|^tsconfig.all.tsbuildinfo\|^data/life-shots/\|__pycache__\|\.pyc$" > /tmp/delta21full.txt
wc -l < /tmp/delta21full.txt
OUT=${DELIVER_OUT:-/mnt/user-data/outputs}
mkdir -p "$OUT"
rm -f "$OUT"/the-worker-delta-21-*.zip
python3 - "$OUT" <<'EOF'
import zipfile, os, sys
files=[l.strip() for l in open('/tmp/delta21full.txt') if l.strip()]
media=[f for f in files if f.startswith('public/') or f.startswith('content/audio/')]
code=[f for f in files if f not in media]
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
out=sys.argv[1]
for kind,lst in (('code',code),('media',media)):
    for i,ch in enumerate(chunks(lst,100),1):
        name=f'{out}/the-worker-delta-21-{kind}-{i}.zip'
        with zipfile.ZipFile(name,'w',zipfile.ZIP_DEFLATED) as z:
            for f in ch: z.write(f, f)
        print(name.split('/')[-1], len(ch), 'files', round(os.path.getsize(name)/1024), 'KB')
open('/tmp/delta21-list.txt','w').write('\n'.join(files))
EOF
cp docs/life/STATUS-2026-09-05-DELTA-21.md docs/life/ART-REQUIRED.md docs/life/GRAPHICS-REQUESTS-2026-09-05-EVENING.md "$OUT"/

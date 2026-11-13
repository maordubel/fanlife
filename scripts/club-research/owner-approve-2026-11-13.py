#!/usr/bin/env python3 -I
"""Owner approval of 13.11.2026 — "I approve all the research data collected so far; attach it for every feature."

Every record the packs still held as `review` (one publisher only: league sheets read from 365Scores without a LiveScore twin,
Colours of Football kits read once) becomes approved by the owner, with his approval named and dated and the reason it was held
kept in its notes. Records collected AFTER today are not covered: a new single-publisher night stays `review` until he says so.
Gap lists (research-gaps.json) and candidate rows (research-staging) are not records and are left as they are.
Usage: python3 scripts/club-research/owner-approve-2026-11-13.py
"""
import json,glob,os
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BY='Maor Harel (owner approval 13.11.2026: all research collected so far)'
SKIP={'research-gaps.json'}
n=0
for f in sorted(glob.glob(os.path.join(ROOT,'club-packs','*','*.json'))):
    if os.path.basename(f) in SKIP: continue
    raw=open(f).read()
    try: d=json.loads(raw)
    except Exception: continue
    if not isinstance(d,dict): continue
    changed=0
    for k,v in d.items():
        if not isinstance(v,list): continue
        for r in v:
            if isinstance(r,dict) and r.get('status')=='review' and r.get('sources'):
                r['status']='approved';r['approvedAt']='2026-11-13';r['approvedBy']=BY
                r['confidence']=r.get('confidence') if r.get('confidence') in (2,3) else 2
                r['notes']=(r.get('notes') or '')+' · Held as one-publisher; approved by the owner on 13.11.2026.'
                changed+=1
    if changed:
        ind=1 if raw.startswith('{\n "') else (2 if raw.startswith('{\n  "') else None)
        open(f,'w').write(json.dumps(d,ensure_ascii=False,indent=ind)+('\n' if ind else ''))
        print(os.path.relpath(f,ROOT),changed);n+=changed
print('approved',n)

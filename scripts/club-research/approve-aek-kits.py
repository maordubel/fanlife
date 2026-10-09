#!/usr/bin/env python3 -I
"""Owner approval of the AEK Athens kit wave (catalogue + Commons) (review -> approved, confidence 2). NOT RUN BY THE AUTHOR.
Run only after the owner says so, with his words in --quote. Idempotent. Skips a kit when the club pack already holds an approved
kit for the same season+type (the two 2016/17 and 2023/24 home kits approved from aekfc.gr stay the source of truth for their maker).
Usage: approve-aek-commons.py --day YYYY-MM-DD --quote "<owner's words>" """
import argparse,glob,json
ap=argparse.ArgumentParser();ap.add_argument('--day',required=True);ap.add_argument('--quote',required=True);a=ap.parse_args()
OWNER='Maor Harel (owner, chat)'
f=f'club-packs/aek-athens/wave-kits-aek-{a.day}.json'
d=json.load(open(f));have=set()
for g in glob.glob('club-packs/aek-athens/*.json'):
    if g==f:continue
    x=json.load(open(g))
    for k in (x.get('kits') or []) if isinstance(x,dict) else []:
        if k.get('status')=='approved':have.add((k['value'].get('season'),k['value'].get('type')))
n=skip=0
for k in d['kits']:
    if k['status']=='approved':continue
    if (k['value']['season'],k['value']['type']) in have:skip+=1;continue
    k.update(status='approved',confidence=2,approvedAt=a.day,approvedBy=OWNER,notes=f'Approved by the owner in chat on {a.day} ("{a.quote}"). '+k['notes'])
    n+=1
json.dump(d,open(f,'w'),ensure_ascii=False,indent=1);open(f,'a').write('\n')
print('approved',n,'skipped twins',skip)

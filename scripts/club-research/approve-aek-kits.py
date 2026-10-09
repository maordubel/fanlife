#!/usr/bin/env python3 -I
"""Owner approval of the AEK Athens kit wave (catalogue + Commons) (review -> approved, confidence 2). Run on 2026-10-09 after the owner's "מאשר".
Run only after the owner says so, with his words in --quote. Idempotent. Kits that share season+type with an approved core kit are approved too and say so in their notes.
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
    if (k['value']['season'],k['value']['type']) in have:k['notes']='Same season and type as a kit core.json already approved (aekfc.gr, access unknown, held back by the compiler). '+k['notes']
    k.update(status='approved',confidence=2,approvedAt=a.day,approvedBy=OWNER,notes=f'Approved by the owner in chat on {a.day} ("{a.quote}"). '+k['notes'])
    n+=1
json.dump(d,open(f,'w'),ensure_ascii=False,indent=1);open(f,'a').write('\n')
print('approved',n,'skipped twins',skip)

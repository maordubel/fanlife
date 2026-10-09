#!/usr/bin/env python3 -I
"""Owner approval of catalogue kit waves (review -> approved, confidence 2). Run only after the owner says so, with his words in --quote.
Usage: approve-kit-waves.py --day YYYY-MM-DD --quote "<owner's words>" club-packs/<club>/wave-kits-cof-<day>.json ..."""
import argparse,json
ap=argparse.ArgumentParser();ap.add_argument('--day',required=True);ap.add_argument('--quote',required=True);ap.add_argument('files',nargs='+');a=ap.parse_args()
OWNER='Maor Harel (owner, chat)'
for f in a.files:
    d=json.load(open(f));n=0
    for k in d['kits']:
        if k['status']=='approved':continue
        k.update(status='approved',confidence=2,approvedAt=a.day,approvedBy=OWNER,notes=f'Approved by the owner in chat on {a.day} ("{a.quote}"). '+k['notes']);n+=1
    json.dump(d,open(f,'w'),ensure_ascii=False,indent=1);open(f,'a').write('\n');print(f,n)

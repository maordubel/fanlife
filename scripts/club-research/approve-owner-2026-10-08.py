#!/usr/bin/env python3 -I
"""Owner approval, chat 2026-10-08 20:30 (Maor Harel): "1+2 כן, לאשר. הכל מאושר." —
 (1) every kit-archive photo wave (review → approved, confidence 2); (2) single-publisher pao.gr Panathinaikos matches.
Idempotent. A kit is skipped when the same club already holds an approved kit for the same season+type (twin of a UEFA/core row)."""
import json,glob,os,collections
OWNER,DAY="Maor Harel (owner, chat)","2026-10-08"
NOTE="Approved by the owner in chat on 2026-10-08 (kit-archive photo waves; single publisher accepted)."
tot=collections.Counter()
for f in sorted(glob.glob('club-packs/*/wave-kits-photos-2026-10-08.json')):
    club=f.split('/')[1];d=json.load(open(f));have=set()
    for g in glob.glob(f'club-packs/{club}/*.json'):
        if g==f:continue
        x=json.load(open(g))
        for k in (x.get('kits') or []) if isinstance(x,dict) else []:
            if k.get('status')=='approved':have.add((k['value'].get('season'),k['value'].get('type')))
    seen=set()
    for k in d['kits']:
        key=(k['value'].get('season'),k['value'].get('type'));ex=key in have
        if k['status']=='approved':continue
        if ex:tot['skipped twin']+=1;continue
        k.update(status='approved',confidence=2,approvedAt=DAY,approvedBy=OWNER,notes=NOTE+' '+k.get('notes','').replace('Needs a second independent publisher before approval.','').strip())
        tot['kits approved']+=1
    json.dump(d,open(f,'w'),ensure_ascii=False,indent=1);open(f,'a').write('\n')
print(dict(tot))

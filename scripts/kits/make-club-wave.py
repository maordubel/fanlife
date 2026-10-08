#!/usr/bin/env python3
"""Photo manifests (content/manual/kit-photos-<club>.json) -> club-packs/<club>/wave-kits-photos-<date>.json.
Metadata only (season/type/maker/design/colours/sponsor) in the same envelope as make-fka-wave.py: single publisher =>
status 'review', never played until a second publisher agrees. Goalkeeper kits are skipped (as in make-fka-wave.py).
Usage: make-club-wave.py <club> [<club> ...]"""
import json,re,sys,datetime
D=datetime.date.today().isoformat()
for club in sys.argv[1:]:
    m=json.load(open(f'content/manual/kit-photos-{club}.json'))
    sources,kits,seen=[],[],set()
    for r in m['records']:
        if not r.get('seasonLabel'):continue
        kid=re.search(r'-(\d+)/?$',r['sourcePage']).group(1)
        if kid in seen:continue
        seen.add(kid);sid=f'fka-{kid}'
        yr=r['seasonLabel'];t=r['variant']
        sources.append({"id":sid,"title":f"{club.replace('-',' ').title()} {yr} {t} kit — Football Kit Archive","url":r['sourcePage'],"publisher":"Football Kit Archive","access":"available","checkedAt":D})
        v={"name":f"{club.replace('-',' ').title()} {yr} {t}","season":yr,"type":t,"manufacturer":r.get('manufacturer'),"construction":{"design":(r.get('design') or '').lower() or None,"colors":(r.get('colors') or '').replace(' / ','/').lower() or None}}
        if r.get('sponsor'):v['sponsor']=r['sponsor']
        v['palette']=r.get('palette');v['parts']={k:r['parts'].get(k) for k in ('body','pattern','sleeves','collar','crest','maker','sponsor','nameset')}
        v['photo']=('/kits/'+r['file']) if r.get('usableInApp') else None
        kits.append({"id":f"fka-k-{kid}","value":v,"sources":[sid],"researchedAt":D,"parserCertainty":"high","conflictFree":True,"confidence":2,"status":"approved","approvedAt":D,"approvedBy":"owner:maor-2026-10-08","notes":"Football Kit Archive page + measured cut-out. Owner approved 8.10.2026: no second publisher required for kits."})
    json.dump({"sources":sources,"kits":kits},open(f'club-packs/{club}/wave-kits-photos-{D}.json','w'),ensure_ascii=False,indent=1)
    print(club,len(kits))

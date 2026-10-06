#!/usr/bin/env python3
"""TSV rows collected from Football Kit Archive in the owner's Chrome -> club-packs/<id>/wave-kits-fka-<date>.json.
Single publisher => status 'review', confidence 1: stored and traceable, never played until a second publisher agrees
(compilePack requires two). Usage: make-fka-wave.py <clubId> <ClubName> <urlSlug> <tsv>"""
import json,sys,re
club,name,slug,tsv=sys.argv[1:5]
def season(s):
    a,b=s.split('-');y=int(a)+(1900 if int(a)>30 else 2000);return f"{y}/{b}"
sources,kits=[],[]
for line in open(tsv,encoding='utf-8'):
    p=line.strip().split('|')
    if len(p)<6:continue
    key,s,t,d,c,b=p
    if t.upper().startswith('GK'):continue
    base,_,kid=key.partition('#')
    sid=f"fka-{kid}";yr=season(s)
    sources.append({"id":sid,"title":f"{name} {yr} {t} kit — Football Kit Archive","url":f"https://www.footballkitarchive.com/{slug}-{base}-kit-{kid}/","publisher":"Football Kit Archive","access":"available","checkedAt":"2026-10-06"})
    kits.append({"id":f"fka-k-{kid}","value":{"name":f"{name} {yr} {t.lower()}","season":yr,"type":t.lower(),"manufacturer":b,"construction":{"design":d.lower(),"colors":c.replace(' / ','/').lower()}},"sources":[sid],"researchedAt":"2026-10-06","parserCertainty":"high","conflictFree":True,"confidence":1,"status":"review","notes":"Single publisher (Football Kit Archive, collected in the owner's browser). Needs a second independent publisher before approval."})
json.dump({"sources":sources,"kits":kits},open(f"club-packs/{club}/wave-kits-fka-2026-10-06.json","w"),ensure_ascii=False,indent=1)
print(club,len(kits),'kits',len(sources),'sources')

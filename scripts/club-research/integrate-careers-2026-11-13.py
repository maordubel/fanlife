#!/usr/bin/env python3 -I
"""Legends' club careers (13.11.2026) → club-packs/<club>/wave-careers-2026-11-13.json for Celtic, St. Pauli and AEK Athens.
Input: research-data/careers-2026-11-13/<club>-careers.json — apps/goals at the club, two publishers each (Wikipedia + club site,
The Celtic Wiki, DFB data centre, …). Only an approved, two-publisher row for a player id the club already holds is kept; it adds the
`career` field only (lib/clubs/waves.ts), never a name or a position."""
import json,os
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
for club in ['celtic','st-pauli','aek-athens']:
    d=json.load(open(os.path.join(ROOT,'research-data','careers-2026-11-13',f'{club}-careers.json')))
    out=[]
    for r in d['players']:
        c=(r.get('value') or {}).get('career') or {}
        if r.get('status')!='approved' or len(set(r['sources']))<2 or not isinstance(c.get('apps'),int): continue
        out.append({**r,'value':{'name':r['value']['name'],'career':{'apps':c['apps'],'goals':c.get('goals') if isinstance(c.get('goals'),int) else None,'basis':str(c.get('basis') or 'as the sources state')},'sensitive':False}})
    used={s for r in out for s in r['sources']}
    srcs=[{**s,'access':s.get('access','available'),'checkedAt':s.get('checkedAt','2026-11-13')} for s in d['sources'] if s['id'] in used]
    json.dump({'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':srcs,'players':out,'matches':[],'kits':[],'rivals':[],'skipped':d.get('skipped',[])},open(os.path.join(ROOT,'club-packs',club,'wave-careers-2026-11-13.json'),'w'),ensure_ascii=False,indent=1)
    print(club,len(out))

#!/usr/bin/env python3 -I
"""The CAF clubs' second research wave (13.11.2026) → club-packs/<club>/wave-history-2026-11-13.json.

Input : research-data/caf-2026-11-13/<club>-caf-matches.json (historic big nights with full elevens, two publishers each)
        research-data/caf-2026-11-13/<club>-careers.json      (legends' apps/goals at the club, two publishers each), when present
Rules : a match keeps its eleven only when two publishers agree on ≥10 of 11 names (checked by the researcher, re-checked here: 11
        names, no duplicate); scorers only where both agree; a player record only for an id the pack already holds.
        One night delivered twice (the 2022 final as "Al Ahly 0-2 Wydad" and "Wydad 2-0 Al Ahly") is folded by lib/clubs/one-night.ts.
"""
import json,os
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IN=os.path.join(ROOT,'research-data','caf-2026-11-13')
for club in ['raja-casablanca','wydad-casablanca','al-ahly']:
    core=json.load(open(os.path.join(ROOT,'club-packs',club,'core.json')))
    have={p['id']:p for p in core['players']}
    out={'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':[],'matches':[],'players':[],'kits':[],'rivals':[],'skipped':[]}
    srcs={}
    p=os.path.join(IN,f'{club}-caf-matches.json')
    if os.path.exists(p):
        d=json.load(open(p))
        for s in d['sources']: srcs[s['id']]=s
        for m in d['matches']:
            v=m['value'];lu=v.get('lineup') or []
            if lu and (len(lu)!=11 or len(set(lu))!=11): v['lineup']=[];m['notes']=m.get('notes','')+' · Eleven dropped at integration: not 11 distinct names.'
            if len(set(m['sources']))<2: out['skipped'].append({'what':m['id'],'reason':'fewer than two publishers'});continue
            v.setdefault('bench',[]);v.setdefault('scorers',[]);v['sport']='football'
            out['matches'].append(m)
        out['skipped']+=d.get('skipped',[])
    p=os.path.join(IN,f'{club}-careers.json')
    if os.path.exists(p):
        d=json.load(open(p))
        for s in d['sources']: srcs[s['id']]=s
        for r in d['players']:
            if r['id'] not in have or len(set(r['sources']))<2: continue
            v={'name':have[r['id']]['value']['name'],'sensitive':False}
            c=r['value'].get('career')
            if c and isinstance(c.get('apps'),int): v['career']={'apps':c['apps'],'goals':c.get('goals') if isinstance(c.get('goals'),int) else None,'basis':str(c.get('basis') or 'as stated by the sources')}
            ps=r['value'].get('positions')
            if ps and not have[r['id']]['value'].get('positions') and len(ps)==1 and ps[0] in ('GK','DF','MF','FW'): v['positions']=ps
            if len(v)>2: out['players'].append({**r,'value':v})
        out['missingLegends']=d.get('missing',[])
    used={s for r in out['matches']+out['players'] for s in r['sources']}
    for s in srcs.values(): s.setdefault('access','available');s.setdefault('checkedAt','2026-11-13')
    out['sources']=[s for k,s in srcs.items() if k in used]
    json.dump(out,open(os.path.join(ROOT,'club-packs',club,'wave-history-2026-11-13.json'),'w'),ensure_ascii=False,indent=1)
    print(club,'matches',len(out['matches']),'with XI',sum(1 for m in out['matches'] if len(m['value'].get('lineup') or [])==11),'players',len(out['players']))

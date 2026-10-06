#!/usr/bin/env python3
"""Promote Panathinaikos staged people into the pack's players section.
Owner approval: Maor Harel, chat, 2026-10-06. Names: highlights use the staged English suggestion; the current squad
uses the club's own English spelling (case only). Years come from explicit years in the source period — never inferred.
Idempotent: rebuilds core.json players + the sources they cite."""
import json,re
D='research-staging/panathinaikos/';P='club-packs/panathinaikos/core.json'
pack=json.load(open(P));src={x['id']:x for x in json.load(open(D+'sources.json'))}
POS={'goalkeeper':'GK','defender':'DF','midfielder':'MF','striker':'FW'}
slug=lambda n:re.sub(r'[^a-z0-9]+','-',n.lower()).strip('-')
def fact(i,name,pos,fy,ty,sources,note):
    return {'id':i,'value':{'name':name,'positions':pos,'fromYear':fy,'toYear':ty,'aliases':[],'sport':'football'},'sources':sources,'confidence':2,'status':'approved',
      'researchedAt':'2026-10-06','approvedAt':'2026-10-06','approvedBy':'Maor Harel (owner, chat)','parserCertainty':'high','conflictFree':True,'notes':note}
out=[];seen=set()
for h in json.load(open(D+'highlights.json')):
    name=h['suggestedNameEn'];yrs=[int(y) for y in re.findall(r'(?<!\d)(19\d{2}|20\d{2})(?!\d)',h['periodAsReported'])]
    i=slug(name)
    if i in seen:continue
    seen.add(i);out.append(fact(i,name,h['positions'],min(yrs) if yrs else None,max(yrs) if yrs else None,h['sourceIds'],'All-time roster highlight; years are the explicit years in the source period ('+h['periodAsReported']+').'))
for m in json.load(open(D+'current-squad.json')):
    name=' '.join(w.capitalize() for w in m['nameEnAsReported'].split());i=slug(name)
    if i in seen or m['positionAsReported'] not in POS:continue
    seen.add(i);out.append(fact(i,name,[POS[m['positionAsReported']]],None,None,m['sourceIds'],'Current squad listing of 2026-10-06; not proof of match participation; join year not stated.'))
need={s for f in out for s in f['sources']}
have={s['id'] for s in pack['sources']}
for sid in sorted(need-have):
    s=src[sid];pack['sources'].append({'id':sid,'title':s['title'],'url':s['url'],'publisher':s.get('sourceFamilyId') or s['publisher'],'access':s['access'],'checkedAt':s['checkedAt']})
pack['players']=out
json.dump(pack,open(P,'w'),ensure_ascii=False,indent=2);print(len(out),'players')

# primary rival — same two public sources the Olympiacos pack uses for the mirrored fixture; owner named it in chat on 2026-10-06
w=json.load(open('club-packs/olympiacos/wave-c-2026-10-06.json'))
pack=json.load(open(P))
have={s['id'] for s in pack['sources']}
for s in w['sources']:
    if s['id'] in ('w-wp-derby','w-flash-derby') and s['id'] not in have:pack['sources'].append(s)
pack['rivals']=[{'id':'w-r-olympiacos','value':{'name':'Olympiacos','note':'Eternal derby'},'sources':['w-wp-derby','w-flash-derby'],'researchedAt':'2026-10-06','parserCertainty':'high','conflictFree':True,'confidence':3,'status':'approved','approvedAt':'2026-10-06','approvedBy':'Maor Harel (owner, chat)','notes':'Both sources name the fixture the Derby of the Eternal Enemies (Panathinaikos central Athens, Olympiacos port of Piraeus).'}]
json.dump(pack,open(P,'w'),ensure_ascii=False,indent=2);print('rival ok')

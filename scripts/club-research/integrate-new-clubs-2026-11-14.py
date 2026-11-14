#!/usr/bin/env python3
"""Atalanta and Maccabi Haifa, opened 14.11.2026 on the owner's word in chat ("add Atalanta — derby Brescia; Maccabi Haifa —
derby Hapoel Haifa"): the research agents' deliveries (research-data/new-clubs-2026-11-14/<club>-{kits,goals,derby}.json,
kept as delivered) become the clubs' waves:
  club-packs/<club>/wave-research-2026-11-14.json   kits (one source is enough: owner, 8.10.2026) + derby matches
  club-packs/<club>/wave-goals-2026-11-14.json      touch-by-touch goals (two publishers, or one official source: owner, 13/14.11.2026)
A goal keeps only touches its sources state; fewer than two touches → skipped. Ids are [a-z0-9_-] ("90+2" → "90plus2")."""
import json,os,re,sys
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IN=os.path.join(ROOT,'research-data','new-clubs-2026-11-14')
def load(club,kind):
    p=os.path.join(IN,f'{club}-{kind}.json')
    return json.load(open(p)) if os.path.exists(p) else None
def write(path,obj):
    with open(path,'w') as f: f.write(json.dumps(obj,ensure_ascii=False,indent=1)+'\n')
# the agents wrote zones as L/C/R × 1–4 and a wider verb list; the game reads columns A–E (A = left) × rows 1–4 (1 = the
# goal's own box) and six verbs. Left/right inside the box are B/D, wide outside it A/E; a cut-back is a pass, a rebound or a
# penalty a shot, a corner a cross. A touch the game cannot draw (a tackle) drops the goal to skipped — never a partial truth.
VERB={'pass':'pass','cutback':'pass','through-ball':'throughBall','throughBall':'throughBall','cross':'cross','corner':'cross','dribble':'dribble','shot':'shot','rebound':'shot','penalty':'shot','free-kick':'shot','header':'header'}
def zone(z):
    m=re.fullmatch(r'([LCR])([1-4])',z or '')
    if not m: return z if re.fullmatch(r'[A-E][1-4]',z or '') else None
    c,r=m.group(1),int(m.group(2));return ({'L':'B','C':'C','R':'D'} if r==1 else {'L':'A','C':'C','R':'E'})[c]+str(r)
clean=lambda s:re.sub(r'[^a-z0-9_-]','-',s.replace('+','plus').lower())
for club in ['atalanta','maccabi-haifa']:
    k=load(club,'kits') or {'sources':[],'kits':[]};d=load(club,'derby') or {'sources':[],'matches':[]};g=load(club,'goals')
    kits=[dict(x,id=clean(x['id'])) for x in k['kits'] if x['value'].get('season')]
    matches=[dict(x,id=clean(x['id'])) for x in d.get('matches',[])]
    srcs={s['id']:s for s in k['sources']+d['sources']};used={s for r in kits+matches for s in r['sources']}
    write(f'{ROOT}/club-packs/{club}/wave-research-2026-11-14.json',{'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':[s for i,s in srcs.items() if i in used],'kits':kits,'matches':matches,'skipped':d.get('skipped',[])})
    out=[];skipped=list((g or {}).get('skipped',[]))
    for x in (g or {}).get('goals',[]):
        x=json.loads(json.dumps(x));x['id']=clean(x['id']);seq=x['value']['sequence']
        bad=[t for t in seq if VERB.get(t['action']) is None or zone(t['zone']) is None]
        if bad: skipped.append({'what':x['id'],'reason':'a touch the game cannot draw: '+', '.join(f"{t['action']} {t['zone']}" for t in bad)});continue
        for t in seq: t['action']=VERB[t['action']];t['zone']=zone(t['zone'])
        if len(seq)<2: skipped.append({'what':x['id'],'reason':'fewer than two stated touches'});continue
        x['value']['narrative']=' '.join(f"{t['actor'] or 'A team-mate'}: {t['note']}" for t in seq)
        out.append(x)
    gs={s['id']:s for s in (g or {}).get('sources',[])};gu={s for x in out for s in x['sources']}
    write(f'{ROOT}/club-packs/{club}/wave-goals-2026-11-14.json',{'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':[s for i,s in gs.items() if i in gu],'goals':out,'skipped':skipped})
    print(club,'kits',len(kits),'derby matches',len(matches),'goals',len(out),'skipped',len(skipped))

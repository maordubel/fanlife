#!/usr/bin/env python3 -I
"""The CAF clubs' research wave of 12.11.2026 (Raja CA, Wydad AC, Al Ahly) → club-pack wave files.

Input : research-data/caf-2026-11-12/<club>-{goals,kits,positions}.json — the agents' deliveries, kept as delivered.
Output: club-packs/<club>/wave-goals-2026-11-12.json      goals (wired in lib/clubs/goal-wave.ts)
        club-packs/<club>/wave-research-2026-11-12.json   kits + player positions (wired in lib/clubs/providers.ts)

The rule the compiler enforces is applied here before it gets the chance (fanlife-research-wave):
  · a touch only ONE publisher reports is not a touch of the reconstruction. Where both publishers describe the touch but only
    one names the man (a cross, a corner, a free kick), the touch stays and its actor becomes unnamed (side "unnamed").
    Where the touch itself is single-source, it is removed. The exact edits per goal are listed in EDITS below, with the reason.
  · a goal whose publishers disagree on the minute is held for the owner (status review), never auto-approved.
  · positions: two publishers each (Wikipedia + a second), as delivered; a player id the pack does not hold is dropped.
  · kits: one source is enough (the owner's standing decision of 8.10.2026).
Usage: python3 scripts/club-research/integrate-caf-2026-11-12.py
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IN=os.path.join(ROOT,'research-data','caf-2026-11-12')
DAY='2026-11-12'
# goal id -> list of (touch index, 'unname' | 'drop') and/or 'review' with reason
EDITS={
 'raja-casablanca':{
  'goal-2013-12-14-chemseddine-chtibi-24':[(0,'unname','both report the cross from the right; only Reuters names the crosser')],
  'goal-2013-12-14-kouko-guehi-95':[(0,'unname','both report a corner; only FourFourTwo names the taker')],
  'goal-2019-11-23-ben-malango-90plus4':[(0,'unname','both report a free kick; only Hespress names the taker')],
  'goal-2013-12-18-mouhcine-iajour-51':[('review','the pass from Hafidi is reported by Trivela only, and AFP gives 53 minutes')],
 },
 'al-ahly':{
  'goal-2006-11-11-mohamed-aboutrika-90+2':[(0,'drop','the first header (Moteab) is reported by Daily News Egypt only')],
  'goal-2021-07-17-mohamed-magdy-afsha-64':[(0,'drop','Taher Mohamed\'s run is reported by CAF only'),(1,'drop','Taher Mohamed\'s pass is reported by CAF only'),(2,'drop','the first leg of the one-two is reported by CAF only')],
  'goal-2020-11-27-mohamed-magdy-afsha-86':[('review','AFP gives 85 minutes against 86 from Reuters and Stadium Astro')],
 },
 'wydad-casablanca':{},
}
def load(club,kind):
    p=os.path.join(IN,f'{club}-{kind}.json')
    return json.load(open(p)) if os.path.exists(p) else None
def write(path,obj):
    with open(path,'w') as f: f.write(json.dumps(obj,ensure_ascii=False,indent=1)+'\n')

def goals(club):
    d=load(club,'goals')
    if not d: return None
    out=[];skipped=list(d.get('skipped',[]))
    for g in d['goals']:
        g=json.loads(json.dumps(g));seq=g['value']['sequence'];review=None;dropped=[];edits=EDITS.get(club,{}).get(g['id'],[])
        g['id']=g['id'].replace('+','plus')  # ids are [a-z0-9_-]: "90+2" is written "90plus2"
        for e in sorted(edits,key=lambda e:-e[0] if isinstance(e[0],int) else 0):
            if e[0]=='review': review=e[1];continue
            i,act,why=e
            if act=='drop': dropped.append(why);seq.pop(i)
            else: seq[i]['actor']='';seq[i]['side']='unnamed';dropped.append(why)
        if len(seq)<2: skipped.append({'what':g['id'],'reason':'fewer than two two-publisher touches remain'});continue
        g['value']['narrative']=' '.join(f"{t['actor'] or 'A team-mate'}: {t['note']}" for t in seq)
        if review:
            g.update(status='review',confidence=2,approvedAt=None,approvedBy=None,notes=g.get('notes','')+f' · HELD FOR THE OWNER: {review}.')
        if dropped: g['notes']=g.get('notes','')+' · Applied the two-publisher rule: '+'; '.join(dropped)+'.'
        out.append(g)
    used={s for g in out for s in g['sources']}
    return {'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':[s for s in d['sources'] if s['id'] in used],'goals':out,'skipped':skipped}

def research(club):
    core=json.load(open(os.path.join(ROOT,'club-packs',club,'core.json')))
    have={p['id']:p for p in core['players']}
    kits=load(club,'kits') or {'sources':[],'kits':[]}
    pos=load(club,'positions') or {'sources':[],'players':[]}
    players=[]
    for p in pos['players']:
        if p['id'] not in have: continue
        if have[p['id']]['value'].get('positions'): continue
        v=p['value'];ps=[x for x in v.get('positions',[]) if x in ('GK','DF','MF','FW')]
        if len(ps)!=1: continue
        players.append({**p,'value':{'name':have[p['id']]['value']['name'],'positions':ps,'sensitive':False}})
    srcs={s['id']:s for s in kits['sources']+pos['sources']}
    used={s for r in kits['kits']+players for s in r['sources']}
    for s in srcs.values(): s.setdefault('access','available');s.setdefault('checkedAt',DAY)
    return {'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':[s for k,s in srcs.items() if k in used],'kits':kits['kits'],'players':players,'skipped':pos.get('skipped',[])}

for club in ['raja-casablanca','wydad-casablanca','al-ahly']:
    g=goals(club)
    if g: write(os.path.join(ROOT,'club-packs',club,f'wave-goals-{DAY}.json'),g)
    r=research(club)
    write(os.path.join(ROOT,'club-packs',club,f'wave-research-{DAY}.json'),r)
    print(club,'goals',len(g['goals']) if g else 0,'(approved',sum(1 for x in (g or {'goals':[]})['goals'] if x['status']=='approved'),') kits',len(r['kits']),'positions',len(r['players']))

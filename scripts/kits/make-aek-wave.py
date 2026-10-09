#!/usr/bin/env python3 -I
"""Join the two AEK kit manifests into one reconciled archive and the pack wave.

  content/manual/kit-cof-aek-athens.json      (make-aek-cof.py: 57 complete kits from the colours-of-football catalogue)
  content/manual/kit-commons-aek-athens.json  (make-aek-commons.py: 133 Wikimedia Commons shirt drawings, folded to 84 kits)
  -> content/manual/kit-aek-athens.json       reconciled kits: what each source says, where they agree, where they disagree
  -> club-packs/aek-athens/wave-kits-aek-<day>.json   pack wave: status 'review', confidence 1, nothing approved by the author

Season and type come from the catalogue captions where there is one; a Commons drawing is folded into a catalogue kit only when its body
colour and design match a kit of the same season (a range or single-year file matches the seasons it could mean). A drawing the catalogue
does not corroborate stays a Commons-only kit with shirt colours only. Rule 11: maker and sponsor are filled only from the catalogue's
drawings, never from Commons. Usage: make-aek-wave.py [--day YYYY-MM-DD]"""
import argparse,json,re,collections
ap=argparse.ArgumentParser();ap.add_argument('--day',default='2026-10-09');a=ap.parse_args()
cof=json.load(open('content/manual/kit-cof-aek-athens.json'));com=json.load(open('content/manual/kit-commons-aek-athens.json'));core=json.load(open('club-packs/aek-athens/core.json'))
approved={(k['value']['season'],k['value']['type']):k for k in core['kits'] if k['status']=='approved'}
csrc={s['id']:s for s in core['sources']}
yr=lambda s:int(re.search(r'\d{4}',s)[0])
def span(season,kind):
    a_=yr(season)
    if kind=='season':return a_,a_
    if kind=='range':return a_,int(season[:2]+season[-2:]) if int(season[-2:])>=a_%100 else a_+1
    return a_-1,a_                               # a single year may mean the season ending or starting in it
kits=[];by_season=collections.defaultdict(list)
for r in cof['records']:
    sh=r['shirt'];colours=[sh['body']]+([sh['trim']] if sh['trim']!=sh['body'] else [])
    pid='cof-aek-p'+str(['aek_1.html','aek_2.html','aek_athens_3.html','aek_athens_4.html'].index(r['page'])+1)
    k=dict(id=f"cof-k-{r['i']:02d}",origin='catalogue',season=r['season'],kind=r['seasonKind'],type=r['type'],euro=r['euro'],
        shirt=dict(design=sh['design'],colours=colours,hex={sh['body']:sh['hex']['body'],**({sh['trim']:sh['hex']['trim']} if sh['trim']!=sh['body'] else {})},measured={}),
        shorts=r['shorts'],socks=r['socks'],maker=r['maker'],sponsor=r['sponsor'],shortsSponsor=r['shortsSponsor'],
        sources=[pid],evidence=[dict(publisher='colours-of-football.com',ref=r['caption'],image=r['image'])],drawings=[],conflicts=[],notes=[])
    kits.append(k);by_season[yr(r['season'])].append(k)
# fold the Commons drawings into the catalogue kits they corroborate
only=[];n_agree=n_conf=0
for c in com['kits']:
    lo,hi=span(c['season'],c['seasonKind']) if c['season'] else (None,None)
    cands=[]
    sameset=lambda d:d in('stripes','hoops','half-and-half')
    fam=lambda x:{'skyblue':'blue','navy':'black'}.get(x,x)
    csig=({fam(x) for x in c['colours']} if sameset(c['design']) else fam(c['colours'][0]))
    if lo is not None:
        for y in range(lo,hi+1):
            for k in by_season.get(y,[]):
                if (({fam(x) for x in k['shirt']['colours']} if sameset(c['design']) else fam(k['shirt']['colours'][0]))==csig) and (k['shirt']['design']==c['design'] or {k['shirt']['design'],c['design']}=={'plain','contrasting sleeves'}):cands.append(k)
    cands=[k for k in dict.fromkeys(id(k) for k in cands) for k in [next(x for x in cands if id(x)==k)]]
    if cands:
        same=[k for k in cands if k['type']==c['type']]
        for k in (same or cands):
            k['drawings'].append(dict(file=c['file'],suffixType=c['type'],typeSource=c['typeSource'],alts=c['alts'],measured=c['measured'],observed=c['observed']))
            if c['measured']:k['shirt']['measured'].update(c['measured'])
            if 'commons-aek-kit-body' not in k['sources']:k['sources'].append('commons-aek-kit-body')
            if k['type']==c['type'] and c['seasonKind']=='season':n_agree+=1
            elif k['type']!=c['type']:
                n_conf+=1;k['conflicts'].append(['suffix',c['file'],c['type'],k['type']])
            else:k['notes'].append(['range',c['file'],c['seasonKind'],c['season']])
        continue
    only.append(c)
cat_types={(k['season'],k['type']) for k in kits if k['origin']=='catalogue' and not k['euro']}
for c in only:
    if not c['season']:continue
    clash=c['seasonKind']=='season' and (c['season'],c['type']) in cat_types
    kits.append(dict(id='commons-k-'+re.sub(r'[^a-z0-9]+','-',c['code'].replace('_v2',' v2').lower()).strip('-'),origin='drawing',season=c['season'],kind=c['seasonKind'],type='special' if clash else c['type'],euro=False,
        shirt=dict(design=c['design'],colours=c['colours'],hex=c['hex'],measured=c['measured']),shorts=None,socks=None,maker=None,sponsor=None,shortsSponsor=None,
        sources=['commons-aek-kit-body'],evidence=[dict(publisher='Wikimedia Commons',ref=c['file'])],
        drawings=[dict(file=c['file'],suffixType=c['type'],typeSource=c['typeSource'],alts=c['alts'],measured=c['measured'],observed=c['observed'])],conflicts=[],
        notes=([['clash',c['type'],c['season']]] if clash else [])+([['label',c['code'],c['seasonKind']]] if c['seasonKind']!='season' or c['seasonAmbiguous'] else [])))
# a duplicate (season,type) inside the catalogue (the 2025/26 home appears twice) keeps both, the second marked
seen=collections.Counter()
for k in kits:
    key=(k['season'],k['type'],k['euro']);seen[key]+=1
    if seen[key]>1 and k['origin']=='catalogue':k['id']+='-v'+str(seen[key]);k['notes'].append(['second'])
    ap_=approved.get((k['season'],k['type']))
    k['verified']=dict(maker=ap_['value']['manufacturer'],source=csrc[ap_['sources'][0]]['title'],url=csrc[ap_['sources'][0]]['url']) if ap_ and not k['euro'] and seen[key]==1 else None
    if k['verified'] and k['maker'] and k['maker']!=k['verified']['maker']:k['conflicts'].append(['maker',k['maker'],k['verified']['maker']])
kits.sort(key=lambda k:(-yr(k['season']),['home','away','third','special','goalkeeper'].index(k['type']),k['euro'],k['id']))
json.dump(dict(retrieved=a.day,sources=dict(catalogue=cof['source'],commons=com['source']),kitCount=len(kits),catalogueKits=sum(k['origin']=='catalogue' for k in kits),drawingOnlyKits=sum(k['origin']=='drawing' for k in kits),
    crossChecked=sum(1 for k in kits if len(k['sources'])>1),typeConflicts=sum(1 for k in kits if k['conflicts']),kits=kits),open('content/manual/kit-aek-athens.json','w'),ensure_ascii=False,indent=1)
open('content/manual/kit-aek-athens.json','a').write('\n')
EN={'suffix':lambda f,t,ct:f"Commons files the matching drawing ({f}) as {t} (file-name suffix); the catalogue captions this kit {ct}. The caption is used.",
 'range':lambda f,kind,se:f"Commons drawing {f} is a {'range' if kind=='range' else 'single-year'} file ({se}) matched to this season by colour and design.",
 'clash':lambda t,se:f"Commons files this drawing as {t} (file-name suffix) but the catalogue's {t} kit for {se} is a different shirt, so it is kept as an unconfirmed other kit.",
 'label':lambda code,kind:f"Season label read from the file name ({code}) and is {'a range' if kind=='range' else 'ambiguous'}.",
 'second':lambda:'The catalogue lists a second version of this kit (different shorts and socks).',
 'maker':lambda m,v:f"Catalogue drawing shows {m}; the club pack (aekfc.gr) says {v}."}
en=lambda n:EN[n[0]](*n[1:])
# ---- wave
src=[dict(id=f'cof-aek-p{i}',title=f'AEK Athens kits, catalogue page {i} — colours-of-football.com',url='https://www.colours-of-football.com/colours03/gre/aek/'+p,publisher='colours-of-football.com',access='available',checkedAt=a.day) for i,p in enumerate(['aek_1.html','aek_2.html','aek_athens_3.html','aek_athens_4.html'],1)]
src.append(dict(id='commons-aek-kit-body',title='Category:Football kit body/AEK Athens — Wikimedia Commons',url=com['source'],publisher='Wikimedia Commons',access='available',checkedAt=a.day))
out=[]
for k in kits:
    cols=k['shirt']['colours'];colors='/'.join(cols)
    v=dict(name=f"AEK Athens {k['season']} {k['type']}{' (European)' if k['euro'] else ''}",season=k['season'],type=k['type'],manufacturer=k['maker'],construction=dict(design=k['shirt']['design'],colors=colors),sponsor=k['sponsor'])
    if k['shorts']:v['shorts']=dict(colour=k['shorts']['colour'],trim=k['shorts']['trim'])
    if k['socks']:v['socks']=dict(colour=k['socks']['colour'],trim=k['socks']['trim'])
    n=[]
    if k['origin']=='catalogue':n.append(f"Catalogue: {k['evidence'][0]['ref']}. Season and type are the publisher's caption; colours are measured from its drawing; maker and the printed sponsor are read from the drawing (single publisher).")
    else:n.append(f"Drawing only: {k['evidence'][0]['ref']} (Commons). Colours and design are what the drawing shows; maker and sponsor are not stated and stay empty. Type is the file-name suffix convention (h/a/t), not a club statement.")
    if len(k['sources'])>1:n.append('Cross-checked: a Commons drawing of the same colours and design exists.')
    n+=[en(x) for x in k['conflicts']+k['notes']]
    out.append(dict(id=k['id'],value=v,sources=k['sources'],researchedAt=a.day,parserCertainty='medium',conflictFree=not k['conflicts'],confidence=1,status='review',notes=' '.join(n)))
json.dump(dict(sources=src,kits=out),open(f'club-packs/aek-athens/wave-kits-aek-{a.day}.json','w'),ensure_ascii=False,indent=1);open(f'club-packs/aek-athens/wave-kits-aek-{a.day}.json','a').write('\n')
print('kits',len(kits),'catalogue',sum(k['origin']=='catalogue' for k in kits),'drawing-only',sum(k['origin']=='drawing' for k in kits),'cross-checked',sum(1 for k in kits if len(k['sources'])>1),'with conflicts',sum(1 for k in kits if k['conflicts']))

#!/usr/bin/env python3
"""Deterministic, OFFLINE assembly of the existing St Pauli and Zrinjski archives.

Read factual observations from collect-existing-archives.py; keep publication dates,
competitions, player directory limits and identity resolution distinct. Append to the
existing research-staging packages, never register a club or invent canonical people.
Everything newly collected stays in review. No match-detail, lineup or goal is inferred.
"""
import hashlib, json, re
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse
import importlib.util

ROOT=Path(__file__).resolve().parents[2]
AS_OF='2026-10-09'
RAW=ROOT/'research-data'/('existing-archives-'+AS_OF)
CLUBS=('st-pauli','zrinjski-mostar')
spec=importlib.util.spec_from_file_location('archive_collector',Path(__file__).with_name('collect-existing-archives.py'))
collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)
write=collector.write

def hid(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def row_id(kind,*parts):return 'ea-'+kind+'-'+hid('|'.join(map(str,parts)))
def source_id(url):return 'ea-src-'+hid(url)
def tags(club,kind,season=None,competition=None):
    return [x for x in ['club:'+club,'sport:football','category:'+kind,
                         'season:'+season if season else None,'competition:'+competition if competition else None] if x]
def review(row):
    return {**row,'status':'review','confidence':2,'researchedAt':AS_OF,
            'approvedAt':None,'approvedBy':None,'productionId':None}
def family(provider):
    return {'dfb':('dfb','Deutscher Fußball-Bund'),'club-tabs':('hsk-zrinjski','HŠK Zrinjski Mostar'),
            'nfs':('nfsbih','Football Federation of Bosnia and Herzegovina'),
            'nft':('national-football-teams','National Football Teams')}[provider]
def source(doc):
    meta=doc['source'];obs=doc['observations'] or {};provider=doc['provider'];fam,publisher=family(provider)
    return {'id':source_id(meta['url']),'title':f"{publisher} · {obs.get('season') or urlparse(meta['url']).path}",
            'url':meta['url'],'publisher':publisher,'sourceFamilyId':fam,'providerId':provider,
            'access':'available' if meta['status']==200 and doc['observations'] is not None else 'blocked',
            'checkedAt':meta['retrievedAt'][:10],'retrievedAt':meta['retrievedAt'],'sha256':meta['contentHash'],
            'scope':'record_specific','imagesUsableInApp':False,'parseError':meta.get('parseError')}

def save_rows(directory,name,incoming):
    """An existing owner's decision always survives; a rerun cannot duplicate rows."""
    path=directory/(name+'.json')
    previous=json.loads(path.read_text()) if path.exists() else []
    if not isinstance(previous,list):raise ValueError('Expected array: '+str(path))
    old={r['id']:r for r in previous};seen=set();out=[]
    for row in incoming:
        if row['id'] in seen:raise ValueError('Duplicate '+name+' id '+row['id'])
        seen.add(row['id']);prior=old.pop(row['id'],None)
        out.append(prior if prior and (prior.get('status')=='approved' or prior.get('approvedBy')) else row)
    out.extend(old.values())
    out.sort(key=lambda r:r['id'])
    write(path,out)
    return out

def fact(row,name,value):
    return {'id':row['id'],'value':{'name':name,'sport':'football',**value},'sources':row['sourceIds'],
            'status':'review','confidence':2,'researchedAt':AS_OF,'approvedAt':None,'approvedBy':None,
            'notes':'Existing-archive completion. Source-reported facts staged for review; no approval inferred.'}

def build(club):
    docs=[json.loads(p.read_text()) for p in sorted((RAW/club/'documents').glob('*.json'))]
    if not docs or any(d['source']['status']!=200 or d['observations'] is None for d in docs):
        raise ValueError('Source refusal/schema problem must be resolved explicitly before assembly')
    arrays=defaultdict(list);arrays['sources']=[source(d) for d in docs]
    memberships=[];membership_ids=set();people=defaultdict(list);seasons=[];wave_archive=[];wave_seasons=[];wave_matches=[]
    for d in docs:
        url=d['source']['url'];sid=source_id(url);obs=d['observations'];provider=d['provider']
        for i,m in enumerate(obs.get('memberships',[])):
            pid=m['providerPersonId'];role=m.get('role','player')
            mid=row_id('membership',pid,role,url,json.dumps(m,sort_keys=True,ensure_ascii=False))
            if mid in membership_ids:continue
            membership_ids.add(mid)
            r=review({'id':mid,'clubId':club,'providerPersonId':pid,
                **m,'role':role,'sourceIds':[sid],'personId':None,
                'tags':tags(club,'squad-membership',m.get('season'),m.get('competition'))})
            memberships.append(r);people[(pid,role)].append(r)
        for m in obs.get('matches',[]):
            r=review({'id':row_id('match',m['providerMatchId']),'clubId':club,'sport':'football',
                'providerMatchId':m['providerMatchId'],'playedOn':m['on'],'season':m['season'],
                'competition':m['competition'],'homeTeamAsReported':m['home'],'awayTeamAsReported':m['away'],
                'scoreAsReported':{'home':m['homeGoals'],'away':m['awayGoals']},
                'scoreType':m['scoreKind'],'homeAwayInterpretation':'explicit_home_away_on_source',
                'sourceMatchUrl':m['detailUrl'],'sourceIds':[sid],
                'tags':tags(club,'match',m['season'],m['competition']),
                'lineupCoverage':'not_collected','goalCoverage':'not_collected','venue':None})
            arrays['matches'].append(r)
            name=f"{m['home']} {m['homeGoals']}-{m['awayGoals']} {m['away']}"
            wave_matches.append(fact(r,name,{'on':m['on'],'competition':m['competition'],
                'score':f"{m['homeGoals']}-{m['awayGoals']}",'venue':None,'lineup':[],'bench':[],'scorers':[]}))
            # Preserve exact match dates as archive candidates; never turn them into approved game cards.
            wave_archive.append(fact({**r,'id':row_id('event',m['providerMatchId'])},name,
                {'on':m['on'],'precision':'day','sensitive':False,'hint':m['competition']}))
        if provider=='dfb':
            season=obs['season'];competition=obs['competition']
            r=review({'id':row_id('season',club,season,competition),'clubId':club,'season':season,
                'competition':competition,'sourceIds':[sid],'matchesCollected':len(obs['matches']),
                'membershipsCollected':len(obs['memberships']),'squadScope':'competition squad, not proof of appearances',
                'skippedRows':len(obs['skipped']),'coverageStatus':'partial','completeArchiveClaim':False,
                'tags':tags(club,'season',season,competition)})
            seasons.append(r)
            wave_seasons.append(fact(r,season+' · '+competition,{'season':season,'competition':competition}))
        if provider=='club-tabs':zrinjski_tables(club,d,arrays,seasons,wave_seasons,wave_archive)
    arrays['squad-memberships']=memberships
    for (pid,role),rows in people.items():
        provider,native=pid.split(':',1)
        # Native IDs only group observations from the SAME provider. They do not resolve a FAN LIFE identity.
        arrays['archive-players'].append(review({'id':row_id('person',pid,role),'clubId':club,'role':role,
            'providerIds':{provider:native},'providerPersonId':pid,'nameAsReported':rows[0]['nameAsReported'],
            'namesAsReported':sorted(set(r['nameAsReported'] for r in rows)),'sourceUrl':rows[0]['profileUrl'],
            'sourceIds':sorted(set(s for r in rows for s in r['sourceIds'])),
            'seasonsAsReported':', '.join(sorted(set(r['season'] for r in rows if r.get('season')))),
            'birthDatesAsReported':sorted(set(r['birthDate'] for r in rows if r.get('birthDate'))),
            'positionsAsReported':sorted(set(r.get('position') or r.get('positionAsReported') for r in rows
                                           if r.get('position') or r.get('positionAsReported'))),
            'membershipIds':[r['id'] for r in rows],'identityState':'unresolved','personId':None,
            'tags':tags(club,'player' if role=='player' else 'coach')}))
    arrays['season-summary']=seasons
    for m in arrays['matches']:
        arrays['timeline'].append(review({'id':row_id('timeline',m['providerMatchId']),
            'title':f"{m['homeTeamAsReported']} {m['scoreAsReported']['home']}-{m['scoreAsReported']['away']} {m['awayTeamAsReported']}",
            'on':m['playedOn'],'precision':'day','sourceIds':m['sourceIds'],'matchId':m['id'],
            'sport':'football','sensitive':False,'tags':m['tags']}))
    arrays['backlog'].extend([
        {'id':row_id('gap',club,'identity'),'priority':'P0','taskHe':'לאמת זהויות מול מזהי השחקנים הקיימים; שם זהה אינו הוכחת זהות.'},
        {'id':row_id('gap',club,'match-detail'),'priority':'P1','taskHe':'להשלים דפי משחק: הרכבים מפורשים, כובשים, חילופים ואצטדיון; לא להסיק מנתוני הסגל.'},
        {'id':row_id('gap',club,'cups'),'priority':'P1','taskHe':'להשלים תוצאות משחקי גביע, משחקי ידידות ואירופה ממקורות תוצאות לפי תאריך מדויק.'},
        {'id':row_id('gap',club,'approval'),'priority':'P0','taskHe':'לעבור על ההשלמות והסתירות; חומר מחקר חדש נשאר בבדיקה עד אישור לפי הכללים הקיימים.'},
    ])
    if club=='st-pauli':
        discovery=json.loads((RAW/club/'discovery.json').read_text())
        for s in discovery['seasons']:
            if not s['url']:
                arrays['coverage-gaps'].append({'id':row_id('gap',club,s['seasonAsReported']),
                    'seasonAsReported':s['seasonAsReported'],'reason':'DFB index has no season link; not evidence of zero matches',
                    'category':'league-results','sourceUrl':discovery['source']['url'],'completeArchiveClaim':False})
        arrays['backlog'].append({'id':row_id('gap',club,'lower-leagues'),'priority':'P1',
            'taskHe':'להשלים עונות בליגות אזוריות ועונות לפני 1974/75; 1991/92 בקובץ DFB כולל כאן רק שלב עלייה.'})
    else:
        arrays['backlog'].append({'id':row_id('gap',club,'historical-squads'),'priority':'P1',
            'taskHe':'להשלים סגלים מלאים ועונות משחקים לפני 2025/26; NFT הוא מאגר שחקני נבחרות חלקי, גם דף ריק אינו סגל ריק.'})
    # Shared bundle contract expects arrays, even where nothing was collected.
    for name in ['lineups','goal-claims','honours','conflicts','quarantined','timeline']:
        arrays[name]
    staging=ROOT/'research-staging'/club
    existing_manifest=staging/'manifest.json'
    if existing_manifest.exists() and json.loads(existing_manifest.read_text()).get('approvedForProduction'):
        raise ValueError('Existing reviewed manifest requires an explicit migration, not overwrite')
    saved={name:save_rows(staging,name,rows) for name,rows in arrays.items()}
    # Never publish a wave containing a duplicate native match id.
    mids=[m['providerMatchId'] for m in saved['matches']]
    if len(mids)!=len(set(mids)):raise ValueError('Duplicate provider match identity')
    write(staging/'manifest.json',{'schemaVersion':1,'clubId':club,'sport':'football',
        'researchVersion':'existing-archive-completion-2026-10-09','snapshotAsOf':AS_OF,
        'approvedForProduction':0,'completeArchiveClaim':False,
        'scope':'Extend an existing archive; no registry or new club pack created.',
        'identityRule':'Provider IDs are candidates, not verified canonical FAN LIFE IDs.',
        'counts':{k:len(v) for k,v in saved.items()}})
    # Only sources and review facts extend EXISTING packs. No new canonical player IDs.
    write(ROOT/'club-packs'/club/('wave-existing-archive-'+AS_OF+'.json'),{
        'schemaVersion':1,'clubId':club,'contentLocale':'en','sources':saved['sources'],
        'archive':wave_archive,'matches':wave_matches,'seasons':wave_seasons,'players':[],
        'completeArchiveClaim':False,'approvedForProduction':0})
    return {'club':club,'sources':len(saved['sources']),'matches':len(saved['matches']),
            'players':len([p for p in saved['archive-players'] if p['role']=='player']),
            'coaches':len([p for p in saved['archive-players'] if p['role']=='coach']),
            'memberships':len(memberships),'seasonRows':len(seasons),'conflicts':len(saved['conflicts']),
            'records':sum(len(v) for v in saved.values()),'approvedNewFacts':0,'completeArchiveClaim':False}

def zrinjski_tables(club,doc,arrays,seasons,wave_seasons,wave_archive):
    url=doc['source']['url'];sid=source_id(url);slug=urlparse(url).path.strip('/')
    scoped={
        'brojke':{0:'all-competition-appearances',1:'all-competition-goals',2:'coach-spells',3:'captain-spells',4:'president-spells'},
        'zrinjski-u-wwin-ligi':{1:'league-finishes',2:'league-club-table',3:'league-appearances',4:'league-goals',
                             5:'league-coach-matches',6:'league-opponent-records',7:'league-streaks'},
        'zrinjski-u-kupu-bih':{1:'cup-finishes',2:'cup-appearances',3:'cup-goals',4:'cup-coach-matches',5:'cup-opponent-records'},
        'zrinjski-u-europi':{1:'european-tie-assertion',2:'european-appearances',3:'european-goals',4:'european-coach-matches'},
        'zrinjski-u-ligi-hrvatske-republike-herceg-bosne':{1:'early-league-finishes',2:'early-league-club-table',
                             3:'early-league-appearances',4:'early-league-goals',5:'early-league-coach-matches'},
        'povijest':{5:'honour-as-reported'}
    }.get(slug,{})
    for tab in doc['observations']['tabs']:
        category=scoped.get(tab['tabIndex'])
        if not category:raise ValueError('Unclassified official table '+url)
        preceding_season=None;preceding_token=None
        for i,entry in enumerate(tab['rows']):
            season=collector.season_label(entry['keyAsReported'])
            inherited=False
            if season:
                preceding_season=season;preceding_token=entry['keyAsReported']
            elif category=='european-tie-assertion' and not entry['keyAsReported'] and preceding_season:
                # Blank left cells continue the preceding explicitly labelled season in this visual table.
                season=preceding_season;inherited=True
            r=review({'id':row_id('claim',url,tab['tabIndex'],i),'clubId':club,**entry,
                'category':category,'season':season,'sourceIds':[sid],'tabIndex':tab['tabIndex'],
                'statisticsCutoff':None,'scope':'as reported in this table; never combine competition scopes',
                'tags':tags(club,category,season)})
            if category=='european-tie-assertion':
                r.update({'seasonAsReported':season,'seasonTokenAsReported':preceding_token,
                          'continuedSeasonHeading':inherited,
                          'seasonNormalization':'YY/YY expanded using the documented 1940–2039 century window.'})
            target={'coach-spells':'coach-spells','captain-spells':'captain-spells','president-spells':'president-spells',
                    'european-tie-assertion':'euro-ties','early-league-finishes':'early-tables',
                    'honour-as-reported':'honours'}.get(category,'records')
            arrays[target].append(r)
            if category in ['league-finishes','cup-finishes','early-league-finishes']:
                if not season:raise ValueError('Unresolved season token')
                competition={'league-finishes':'premier-league-bih','cup-finishes':'bosnian-cup',
                             'early-league-finishes':'herceg-bosna-league'}[category]
                summary={**r,'competition':competition,'finishAsReported':entry['valueAsReported'],
                         'matchesCollected':0,'coverageStatus':'partial','completeArchiveClaim':False}
                seasons.append(summary)
                wave_seasons.append(fact(r,season+' · '+competition,{'season':season,'competition':competition}))
            if category in ['coach-spells','captain-spells']:
                if not season:raise ValueError('Unresolved spell season')
                r['namesAsReported']=[n.strip() for n in entry['valueAsReported'].split(',')]
                r['personIds']=None
    for award in doc['observations'].get('fanAwards',[]):
        r=review({'id':row_id('fan-award',award['year']),'clubId':club,**award,'sourceIds':[sid],
            'category':'supporter-award','personId':None,'tags':tags(club,'supporter-award')})
        arrays['fan-awards'].append(r)
        wave_archive.append(fact(r,'Supporter award · '+award['nameAsReported'],
            {'on':None,'precision':'year','year':award['year'],'sensitive':False,'hint':'Filip Šunjić Pipa supporter award'}))
    for coach in doc['observations'].get('trophyCoaches',[]):
        arrays['trophy-coaches'].append(review({'id':row_id('trophy-coach',coach['nameAsReported']),
            'clubId':club,**coach,'sourceIds':[sid],'personId':None,'statisticsCutoff':None,
            'tags':tags(club,'trophy-coach')}))
    # Checked manually against the official page, kept as competing claims, never completed matches.
    known_conflicts={
        'zrinjski-u-europi':[
            ('2024/25 Bravo away score','narrative: 3:1','table: 3:0'),
            ('2023/24 Slovan away score','narrative: 2:2','table: 2:0'),
            ('2014/15 Maribor away score','narrative: 0:2','table: 1:2'),
            ('2013/14 Botev away score','narrative: 0:2','table: 0:0')],
        'zrinjski-u-kupu-bih':[
            ('Cup goals: Mladen Žižović appears twice','table entry: 6','table entry: 4'),
            ('Cup honour list cutoff differs from current history page','cup page covers winners through 2023/24','history page adds 2026 cup')],
    }
    for topic,a,b in known_conflicts.get(slug,[]):
        arrays['conflicts'].append({'id':row_id('conflict',url,topic),'topic':topic,'claims':[a,b],
            'sourceIds':[sid],'status':'open','productRule':'Do not use this disputed field in production or games until independently resolved.'})
    if slug=='stadion':
        for part,seats in [('west-lower',4875),('west-upper',2380)]:
            arrays['stadium-components'].append(review({'id':row_id('stadium',part),'clubId':club,
                'stadiumNameAsReported':'Stadion HŠK Zrinjski','component':part,'seatsAsReported':seats,
                'sourceIds':[sid],'asOfDate':None,'tags':tags(club,'stadium'),
                'note':'Component capacity only. Do not sum into a current whole-stadium capacity; east stand under construction.'}))

if __name__=='__main__':
    summaries=[build(c) for c in CLUBS]
    write(RAW/'assembly-summary.json',{'snapshotAsOf':AS_OF,'clubs':summaries,'newClubs':0})
    for summary in summaries:print(json.dumps(summary,ensure_ascii=False))

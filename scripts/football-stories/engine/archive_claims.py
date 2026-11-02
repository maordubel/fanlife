#!/usr/bin/env python3
"""Turn match-master season records into source-linked, unverified claim data."""
import argparse
import json
import sys
from pathlib import Path

def convert(dossier,topic):
    if not isinstance(topic,str) or not topic.strip():raise ValueError('Topic is required')
    matches=dossier.get('matches'); sources=dossier.get('sources') or {}
    if not isinstance(matches,list) or not matches:raise ValueError('Empty match dossier')
    claims=[];held=[]
    for m in matches:
        mid=m.get('matchId');date=(m.get('playedOn') or {}).get('value');score=m.get('score')
        urls=[(sources.get(s) or {}).get('url') for s in m.get('sourceIds',[])]
        urls=[u for u in urls if isinstance(u,str) and u.startswith(('https://','http://'))]
        if not mid or not date or not isinstance(score,dict) or score.get('home') is None or score.get('away') is None or not urls or m.get('conflictRefs'):
            held.append(mid);continue
        facts={'date':date,'date_precision':(m.get('playedOn') or {}).get('precision'),'competition':m.get('competition'),'stage':m.get('stage'),'home':m.get('home'),'away':m.get('away'),'score':score,'scorers':m.get('scorers'),'scorers_disputed':m.get('scorersDisputed')}
        claims.append({'id':mid,'statement':json.dumps(facts,ensure_ascii=False,separators=(',',':')),'source_url':urls[0]})
    if not claims:raise ValueError('No eligible source-linked match records')
    return {'topic':topic.strip(),'claims':claims,'archive_sha256':dossier.get('match_master_sha256'),'held_match_ids':held,'verification_status':'UNVERIFIED: source records, not independent historical checks'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('archive',type=Path);p.add_argument('output',type=Path);p.add_argument('--topic',required=True);a=p.parse_args()
    try:
        data=json.loads(a.archive.read_text(encoding='utf-8'));out=convert(data,a.topic)
        a.output.parent.mkdir(parents=True,exist_ok=True)
        with a.output.open('x',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,indent=2);f.write('\n')
    except (OSError,ValueError,TypeError,json.JSONDecodeError) as e:print('Claim export failed:',e,file=sys.stderr);return 1
    print('Exported',len(out['claims']),'unverified match claims; held',len(out['held_match_ids']));return 0
if __name__=='__main__':raise SystemExit(main())

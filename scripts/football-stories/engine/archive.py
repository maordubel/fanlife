#!/usr/bin/env python3
"""Export a source-traceable season dossier from FanLife's match master.

The current match master is Hapoel Tel Aviv centric. Output is a research input,
not proof of historical accuracy or publication rights.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
DEFAULT=ROOT/'content/generated/match-master.json'

def season_dossier(path,season):
    if not re.fullmatch(r'\d{4}/\d{2}',season):raise ValueError('Season must use YYYY/YY')
    raw=path.read_bytes();master=json.loads(raw)
    matches=master.get('matches')
    if not isinstance(matches,list):raise ValueError('Invalid match master')
    selected=[];source_ids=set()
    for m in matches:
        if m.get('season')!=season or m.get('sport')!='football':continue
        ids=m.get('sourceIds') or [];source_ids.update(ids)
        selected.append({k:m.get(k) for k in ['matchId','playedOn','season','competition','stage','home','away','hapoelSide','opponent','score','scorers','scorersDisputed','events','sourceIds','confidence','conflictRefs']})
    selected.sort(key=lambda m:((m.get('playedOn') or {}).get('value') or '9999',m.get('matchId') or ''))
    if not selected:raise ValueError('Season absent from match master')
    sources=master.get('sources') or {}
    return {'version':1,'club':'hapoel-tel-aviv','season':season,'match_master_sha256':hashlib.sha256(raw).hexdigest(),'archive_schema_version':master.get('schemaVersion'),'note':'Archive data is research material; status/confidence is not independent verification or media permission.', 'match_count':len(selected),'sources':{s:sources.get(s) for s in sorted(source_ids)},'matches':selected}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--season',required=True);p.add_argument('--input',type=Path,default=DEFAULT);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    try:
        dossier=season_dossier(a.input,a.season)
        a.output.parent.mkdir(parents=True,exist_ok=True)
        with a.output.open('x',encoding='utf-8') as f:json.dump(dossier,f,ensure_ascii=False,indent=2);f.write('\n')
    except (OSError,ValueError,json.JSONDecodeError) as e:
        print(f'Archive export failed: {e}',file=sys.stderr);return 1
    print(f"Exported {dossier['match_count']} archive records to {a.output}");return 0
if __name__=='__main__':raise SystemExit(main())

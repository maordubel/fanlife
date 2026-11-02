#!/usr/bin/env python3
"""Validate the structural production manifest; this does not verify facts or media rights."""
import argparse
import json
import math
import sys
from pathlib import Path

class QualityError(ValueError): pass

def validate_manifest(manifest):
    if not isinstance(manifest,dict): raise QualityError('Manifest must be an object')
    duration=manifest.get('target_duration_minutes')
    if isinstance(duration,bool) or not isinstance(duration,(int,float)) or not (duration in (0.5,1,2,3,5) or (duration==int(duration) and 7<=duration<=25)): raise QualityError('Duration must be 0.5, 1, 2, 3, 5 or an integer from 7 to 25 minutes')
    shots=manifest.get('shots')
    if not isinstance(shots,list) or len(shots)!=round(duration*10): raise QualityError('Shot count must equal target minutes × 10')
    expected=0.0
    for index,shot in enumerate(shots,1):
        if not isinstance(shot,dict) or shot.get('shot_id')!=f'S{index:03}': raise QualityError('Shot IDs must be sequential')
        start,end=shot.get('start_seconds'),shot.get('end_seconds')
        if any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in (start,end)): raise QualityError('Shot times must be finite numbers')
        if abs(start-expected)>0.01 or end<=start: raise QualityError('Shot times must be contiguous and positive')
        expected=end
        if not isinstance(shot.get('visual_description'),str) or not shot['visual_description'].strip(): raise QualityError('Shot needs a visual description')
        if not isinstance(shot.get('motion_prompt'),str) or not shot['motion_prompt'].strip(): raise QualityError('Shot needs motion direction')
        if shot.get('rights_status') not in ('cleared','original','needs_clearance','not_applicable'): raise QualityError('Shot needs a rights status')
    if abs(expected-duration*60)>5: raise QualityError('Timeline does not match the target duration')
    return {'status':'structural_checks_passed','shots':len(shots),'seconds':expected,'release_ready':False,'note':'Facts, asset rights, audio, visual identity and recognisable faces require independent review.'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('manifest',type=Path);a=p.parse_args()
    try: result=validate_manifest(json.loads(a.manifest.read_text(encoding='utf-8')))
    except (OSError,ValueError,QualityError) as e: print(f'Quality check failed: {e}',file=sys.stderr);return 1
    print(json.dumps(result,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())

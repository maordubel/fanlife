#!/usr/bin/env python3
"""Render a documentary from locally provided video and narration.

This deliberately does not synthesize research, fabricate historical media, or
publish. The manifest is the editorial hand-off; see engine/README.md.
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

VIDEO_EXT={'.mp4','.mov','.mkv','.webm'}
AUDIO_EXT={'.mp3','.wav','.m4a','.flac','.ogg'}

class ProductionError(Exception): pass

def run(cmd):
    try:
        return subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError as e:
        raise ProductionError(f'Missing executable: {cmd[0]}') from e
    except subprocess.CalledProcessError as e:
        raise ProductionError(f'{cmd[0]} failed: {e.stderr[-1200:]}') from e

def probe(path):
    result=run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type','-of','json',str(path)])
    data=json.loads(result.stdout)
    duration=float(data['format']['duration'])
    if not math.isfinite(duration) or duration<=0: raise ProductionError(f'Invalid media duration: {path.name}')
    return duration,{s['codec_type'] for s in data.get('streams',[])}

def resolved(base, value, extensions):
    if not isinstance(value,str) or not value.strip(): raise ProductionError('Missing media path')
    p=(base/value).resolve() if not Path(value).is_absolute() else Path(value).resolve()
    if p.suffix.lower() not in extensions or not p.is_file(): raise ProductionError(f'Unavailable or unsupported media: {value}')
    return p

def timestamp(seconds):
    ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

def captions_for_alignment(path, narration, duration):
    try:
        data=json.loads(path.read_text(encoding="utf-8"))
        chars=data["characters"]; starts=data["character_start_times_seconds"]; ends=data["character_end_times_seconds"]
        if not (isinstance(chars,list) and len(chars)==len(starts)==len(ends) and chars): raise ValueError("invalid alignment arrays")
        if "".join(chars).strip()!=narration.strip(): raise ValueError("alignment text differs from narration")
        if any(not isinstance(c,str) or len(c)!=1 for c in chars): raise ValueError("invalid alignment character")
        if any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in starts+ends): raise ValueError("invalid timestamp")
        if any(a<0 or b<a or b>duration+0.1 for a,b in zip(starts,ends)) or any(a>b for a,b in zip(starts,starts[1:])): raise ValueError("alignment out of range")
        words=[]
        for m in re.finditer(r"\S+", "".join(chars)):
            words.append((m.group(),starts[m.start()],ends[m.end()-1]))
        return [(group[0][1],group[-1][2]," ".join(w[0] for w in group)) for i in range(0,len(words),6) if (group:=words[i:i+6])]
    except (OSError,ValueError,KeyError,TypeError,json.JSONDecodeError) as e:
        raise ProductionError(f"Invalid narration alignment: {e}") from e

def validate(manifest,base):
    if manifest.get('version')!=1: raise ProductionError('Expected manifest version 1')
    scenes=manifest.get('scenes')
    if not isinstance(scenes,list) or not scenes: raise ProductionError('At least one scene is required')
    prepared=[]; ids=set()
    for i,s in enumerate(scenes,1):
        if not isinstance(s,dict): raise ProductionError(f'Scene {i} must be an object')
        scene_id=s.get('id')
        if not isinstance(scene_id,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,60}',scene_id) or scene_id in ids: raise ProductionError(f'Scene {i}: missing, duplicate or invalid id')
        ids.add(scene_id)
        text=s.get('narration')
        if not isinstance(text,str) or not text.strip(): raise ProductionError(f'Scene {scene_id}: narration required')
        audio=resolved(base,s.get('narration_audio'),AUDIO_EXT); audio_duration,audio_streams=probe(audio)
        if 'audio' not in audio_streams: raise ProductionError(f'Scene {scene_id}: no narration audio')
        shots=s.get('shots')
        if not isinstance(shots,list) or not shots: raise ProductionError(f'Scene {scene_id}: at least one video shot required')
        parsed=[]
        for shot in shots:
            if not isinstance(shot,dict): raise ProductionError(f'Scene {scene_id}: invalid shot')
            rights=shot.get('rights')
            if not isinstance(rights,dict) or rights.get('status') not in ('owned','licensed','public_domain') or not isinstance(rights.get('evidence'),str) or not rights['evidence'].strip():
                raise ProductionError(f'Scene {scene_id}: each shot needs documented rights')
            video=resolved(base,shot.get('file'),VIDEO_EXT);duration,streams=probe(video)
            if 'video' not in streams: raise ProductionError(f'Scene {scene_id}: shot has no video')
            start=shot.get('in',0); length=shot.get('duration')
            if any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in (start,length)) or start<0 or length<=0 or start+length>duration+0.03:
                raise ProductionError(f'Scene {scene_id}: invalid shot range for {video.name}')
            parsed.append((video,float(start),float(length)))
        if sum(p[2] for p in parsed)+0.03<audio_duration:
            raise ProductionError(f'Scene {scene_id}: visuals shorter than narration')
        alignment_path=s.get('alignment')
        if alignment_path is not None:
            alignment=resolved(base,alignment_path,{'.json'})
            caption_parts=captions_for_alignment(alignment,text.strip(),audio_duration)
        else: caption_parts=[(0.0,audio_duration,text.strip())]
        prepared.append((scene_id,text.strip(),audio,audio_duration,parsed,caption_parts))
    return prepared

def render(manifest_path,output):
    manifest_path=manifest_path.resolve(); output=output.resolve()
    try: manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    except (OSError,json.JSONDecodeError) as e: raise ProductionError(f'Cannot read manifest: {e}') from e
    scenes=validate(manifest,manifest_path.parent) # Check everything before writing output.
    output.parent.mkdir(parents=True,exist_ok=True)
    srt_path=output.with_suffix('.srt')
    if output.exists() or srt_path.exists(): raise ProductionError('Output already exists; choose a new destination')
    if output.suffix.lower() != '.mp4': raise ProductionError('Output must use the .mp4 extension')
    with tempfile.TemporaryDirectory(prefix='fanlife-film-',dir=output.parent) as tmp:
        work=Path(tmp); segments=[]; captions=[]; offset=0.0
        for number,(sid,text,audio,audio_duration,shots,caption_parts) in enumerate(scenes):
            clips=[]; remaining=audio_duration
            for j,(video,start,duration) in enumerate(shots):
                use=min(duration,remaining)
                if use<=0.005: break
                clip=work/f'{number:03d}-{j:03d}.mp4'
                run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(video),'-t',f'{use:.6f}',
                     '-an','-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p',
                     '-c:v','libx264','-preset','veryfast','-crf','21',str(clip)])
                clips.append(clip); remaining-=use
            listing=work/f'list-{number:03d}.txt'
            listing.write_text(''.join(f"file '{p.name}'\n" for p in clips),encoding='utf-8')
            joined=work/f'joined-{number:03d}.mp4'
            run(['ffmpeg','-v','error','-y','-f','concat','-safe','1','-i',str(listing),'-c','copy',str(joined)])
            complete=work/f'scene-{number:03d}.mp4'
            run(['ffmpeg','-v','error','-y','-i',str(joined),'-i',str(audio),'-map','0:v:0','-map','1:a:0',
                 '-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-t',f'{audio_duration:.6f}','-movflags','+faststart',str(complete)])
            actual,streams=probe(complete)
            if not {'video','audio'}.issubset(streams): raise ProductionError(f'Scene {sid}: render lacks audio/video')
            for start,end,caption in caption_parts:
                captions.append(f'{len(captions)+1}\n{timestamp(offset+start)} --> {timestamp(offset+min(end,actual))}\n{caption}\n')
            offset+=actual; segments.append(complete)
        listing=work/'final.txt';listing.write_text(''.join(f"file '{p.name}'\n" for p in segments),encoding='utf-8')
        result=work/'final.mp4'
        run(['ffmpeg','-v','error','-y','-f','concat','-safe','1','-i',str(listing),'-c','copy','-movflags','+faststart',str(result)])
        duration,streams=probe(result)
        if not {'audio','video'}.issubset(streams) or abs(duration-offset)>max(0.2,len(scenes)*0.08): raise ProductionError('Final output failed media verification')
        # Only publish the output filenames after successful encoding and verification.
        temp_srt=work/'final.srt';temp_srt.write_text('\n'.join(captions),encoding='utf-8')
        os.replace(result,output);os.replace(temp_srt,srt_path)
    return {'video':str(output),'subtitles':str(srt_path),'duration_seconds':duration,'scene_count':len(scenes),'subtitles_timing':'alignment where provided; otherwise scene-level; review before publication'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('manifest',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
    try: print(json.dumps(render(a.manifest,a.output),ensure_ascii=False,indent=2))
    except ProductionError as e: print(f'Production error: {e}',file=sys.stderr);return 1
    return 0
if __name__=='__main__': raise SystemExit(main())

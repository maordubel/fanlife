"""Independent 9:16 hook films: new script and narration, source pictures from the edit."""
from __future__ import annotations
import math
import subprocess
from pathlib import Path
from . import voice
from .common import StageError, read_json


def episode_evidence(ep: dict, year=None) -> dict:
    """Turn cited, approved episode lines into a ledger for independently written hooks."""
    from .script import numbers_in_text
    claims = []
    for source in ep.get('sources') or []:
        number = source.get('n')
        lines = [b.get('say', '') for b in ep['beats'] if number in (b.get('sources') or []) and b.get('say')]
        if lines:
            text = ' '.join(lines)
            claims.append({'id': f'src-{number}', 'fact': {'kind': 'history', 'text': text,
                           'spoken_numbers': sorted(numbers_in_text(text))}, 'sources': []})
    return {'claims': claims, 'summary': {}, 'season': str(year) if year else ''}


def make(job: Path, script: dict, club: str, season: str, accent: str, *, ledger_override: dict | None = None) -> list[dict]:
    from . import shorts
    from .script import fact_guard, identity_guard, knockout_guard, story_of
    plan = read_json(job / 'plan.json')
    ledger = ledger_override if ledger_override is not None else read_json(job / 'ledger.json')
    story = story_of(ledger) if any((c.get('fact') or {}).get('kind') == 'match' for c in ledger.get('claims') or []) else {}
    by = {c['id'] for c in ledger.get('claims') or []}
    by.update('summary:' + k for k in (ledger.get('summary') or {}).get('by_competition', {}))
    by.add('story')
    original = ' '.join(b.get('narration','') for ch in script.get('chapters') or [] for b in ch.get('beats') or []).lower()
    offset = float(read_json(job / 'intro.json').get('seconds',0)) if (job / 'intro.json').exists() else 0
    out=[]
    for i, sh in enumerate(script.get('shorts') or [], 1):
        text, hook, ids = sh.get('narration'), sh.get('hook'), sh.get('claim_ids')
        if not isinstance(text,str) or not isinstance(hook,str) or not hook or not text.startswith(hook) or not 15 <= len(text.split()) <= 55:
            continue  # legacy short needs a new written hook; never fall back to a continuous film cut
        if not isinstance(ids,list) or not ids or any(x not in by for x in ids):
            continue
        if fact_guard(text,ledger,ids) or identity_guard(text,ledger) or knockout_guard(text,ledger,ids,story):
            continue
        if len(text.split()) >= 12 and text.lower() in original:
            continue
        matched=[s for s in plan['shots'] if set(s.get('claim_ids') or []) & set(ids) and s.get('visual',{}).get('type') not in ('follow','end')]
        if not matched:
            continue
        work=job/'short-hooks'/str(i);work.mkdir(parents=True,exist_ok=True)
        v=voice.voice_script({'chapters':[{'beats':[{'narration':text,'delivery':'tense'}]}]}, work/'voice', job/'cache'/'voice', lambda _:None)
        duration=v['beats'][0]['duration'] + 1.2
        if duration > 29.5:
            continue
        shots=matched[:6]
        images=[]
        for j, shot in enumerate(shots):
            img=work/f'frame-{j}.jpg'
            t=offset+float(shot['start'])+min(.5,shot['frames']/plan.get('fps',25)/2)
            subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(job/'out'/'master.mp4'),'-frames:v','1',str(img)],check=True)
            images.append(img)
        if not images:
            continue
        overlay=shorts.overlay(hook,f'{club} · {season}',accent,work/'overlay.png')
        dest=job/'out'/'shorts'/f'short-{i}.mp4';dest.parent.mkdir(parents=True,exist_ok=True)
        # New visuals: a rapid sequence of distinct frames; the full film's sound is never used.
        segment=duration/len(images)
        args=['ffmpeg','-y','-v','error']
        for img in images:
            args += ['-loop','1','-t',str(segment+.08),'-i',str(img)]
        args += ['-loop','1','-t',str(duration),'-i',str(overlay),'-i',str(work/'voice'/v['beats'][0]['file'])]
        filters=[]
        for j in range(len(images)):
            filters.append(f'[{j}:v]fps=25,scale=1080:608,drawbox=x=0:y=ih*0.78:w=iw:h=ih*0.22:color=black@1:t=fill,setsar=1,trim=duration={segment},setpts=PTS-STARTPTS[v{j}]')
        filters.append(''.join(f'[v{j}]' for j in range(len(images)))+f'concat=n={len(images)}:v=1:a=0[montage]')
        filters.append(f'color=c=0x15130f:s=1080x1920:r=25:d={duration}[bg]')
        filters.append(f'[bg][montage]overlay=0:{shorts.FRAME_Y}:shortest=1[base]')
        filters.append(f'[base][{len(images)}:v]overlay=0:0:shortest=1[vout]')
        args+=['-filter_complex',';'.join(filters),'-map','[vout]','-map',f'{len(images)+1}:a','-t',str(duration),
               '-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(dest)]
        subprocess.run(args,check=True)
        length=voice._duration(dest)
        if length > 30:
            dest.unlink(missing_ok=True)
            raise StageError('SHORT_TOO_LONG',f'Hook {i} exceeds 30 seconds')
        out.append({'file':str(dest),'seconds':round(length,2),'hook':hook,'narration':text,'claim_ids':ids,'independent':True})
    return out

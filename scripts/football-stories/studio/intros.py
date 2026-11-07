"""Fixed owner-selected openings. Never silently render a film without its opening."""
from __future__ import annotations
import copy
import hashlib
import json
import os
import subprocess
import urllib.request
from pathlib import Path
from .common import StageError

FILES = {'film': '1qeTwYH9yuZRb-IbGEWd5AjKcg4jqttAH', 'classified': '1QA41TgtkdMmB6fcLCHmIPZoAALfO5vC8'}


def _sha(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def _probe(p: Path) -> dict:
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))


def download(kind: str, dst: Path) -> None:
    file_id = FILES[kind]
    url = 'https://drive.usercontent.google.com/download?id=' + file_id + '&export=download&confirm=t'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'FanLife-Studio/1.0'})
        with urllib.request.urlopen(req, timeout=180) as src, dst.open('wb') as out:
            while chunk := src.read(1024 * 1024):
                out.write(chunk)
                if out.tell() > 100 * 1024 * 1024:
                    raise ValueError('opening exceeds 100 MB')
        p = _probe(dst)
        kinds = {s['codec_type'] for s in p['streams']}
        if not {'video', 'audio'} <= kinds or not 0 < float(p['format']['duration']) < 90:
            raise ValueError('expected a short video with audio')
    except Exception as e:
        dst.unlink(missing_ok=True)
        raise StageError('INTRO_UNAVAILABLE', f'The selected {kind} opening could not be read from Drive: {e}', retryable=True) from e


def prepend(master: Path, job: Path, kind: str, log, source: Path | None = None) -> float:
    """Keep a body copy for crash-safe retries. Returns the measured opening length, in seconds."""
    if kind not in FILES:
        raise ValueError('unsupported series')
    job.mkdir(parents=True, exist_ok=True)
    body, stamp = job / 'intro-body.mp4', job / 'intro.json'
    if stamp.exists() and master.exists():
        try:
            prev = json.loads(stamp.read_text())
            if prev['kind'] == kind and prev['master_sha256'] == _sha(master):
                return float(prev['seconds'])
        except (KeyError, ValueError, OSError):
            pass
    if not body.exists():
        os.replace(master, body)
    opening = source or job / f'intro-{kind}.mp4'
    if source is None and not opening.exists():
        download(kind, opening)
    p = _probe(body)
    v = next(s for s in p['streams'] if s['codec_type'] == 'video')
    width, height = int(v['width']), int(v['height'])
    normalized, candidate = job / 'intro-normalized.mp4', job / 'intro-result.mp4'
    try:
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(opening),'-vf',f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,fps=25,setsar=1',
                        '-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-shortest',str(normalized)],check=True)
        seconds = float(_probe(normalized)['format']['duration'])
        vf = '[0:v]setpts=PTS-STARTPTS[v0];[1:v]fps=25,setsar=1,setpts=PTS-STARTPTS[v1];[0:a]aresample=48000,asetpts=PTS-STARTPTS[a0];[1:a]aresample=48000,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]'
        subprocess.run(['ffmpeg','-y','-v','error','-i',str(normalized),'-i',str(body),'-filter_complex',vf,'-map','[v]','-map','[a]',
                        '-c:v','libx264','-preset',os.environ.get('STORIES_MASTER_PRESET','medium'),'-crf','18','-pix_fmt','yuv420p',
                        '-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-movflags','+faststart',str(candidate)],check=True)
        _probe(candidate)
        os.replace(candidate, master)
        tmp = stamp.with_suffix('.part')
        tmp.write_text(json.dumps({'kind':kind,'seconds':seconds,'master_sha256':_sha(master)}))
        os.replace(tmp, stamp)
        log(f'Opening: {kind} · {seconds:.2f}s, original owner video')
        return seconds
    except Exception as e:
        candidate.unlink(missing_ok=True)
        raise StageError('INTRO_FAILED', f'Could not add the selected {kind} opening: {e}', retryable=True) from e


def shift_plan(plan: dict, seconds: float) -> dict:
    """An output-only timeline; the render plan on disk remains on the original clock."""
    p = copy.deepcopy(plan)
    p['duration'] += seconds
    for shot in p['shots']:
        for key in ('start','voice_at'):
            if isinstance(shot.get(key), (int, float)):
                shot[key] += seconds
    for chapter in p.get('chapters') or []:
        chapter['t'] += seconds
    for image in (p.get('media_usage') or {}).get('pictures') or []:
        for shot in image.get('shots') or []:
            shot['start'] += seconds
    return p

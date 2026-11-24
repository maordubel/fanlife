"""The owner's own video clips in a film (owner, 24.11.2026: "the system should also know how to use video files I upload
inside the edit").

A clip uploaded to the film (the desk's file input) or sitting in a Drive folder pinned to the film becomes a piece of the
film's media set, beside the owner's pictures: `clip:<set>/<slug>`, a muted 1080p proxy in `kit/clips/<set>/` and a
poster frame beside it (the thumbnail engine and the picture checks read the poster). The clip keeps no sound: the
narrator speaks over it and the mix owns every sound. A clip is required like a picture the owner chose: the film shows
it, or the job stops and says which one.

`ingest_videos` writes `kit/clips/<set>/index.json` (paper.clip_index reads it). Nothing here is paid: ffmpeg only.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from datetime import date
from pathlib import Path

from .common import StageError
from .paper import CLIPS

VIDEO = re.compile(r'\.(mp4|mov|m4v|webm)$', re.I)
MAX_S = 20.0           # a clip is a moment in the edit, never a second film: its first twenty seconds
W, H = 1920, 1080


def is_video(name: str | Path) -> bool:
    return bool(VIDEO.search(str(name)))


def probe(path: Path) -> float:
    """The clip's length in seconds, or 0 when ffprobe cannot read a video stream."""
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'format=duration',
                            '-of', 'default=nw=1:nk=1', str(path)], capture_output=True, text=True, timeout=60)
        return float(r.stdout.strip() or 0)
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return 0.0


def proxy(src: Path, dst: Path, max_s: float = MAX_S) -> float:
    """A muted 1920×1080 30 fps H.264 proxy (cover-cropped, the owner's colour untouched). Returns its length."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-t', f'{max_s:.2f}', '-an',
           '-vf', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,format=yuv420p',
           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-movflags', '+faststart', str(dst)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0 or not dst.exists():
        dst.unlink(missing_ok=True)
        raise OSError((r.stderr or 'ffmpeg failed')[-300:])
    return probe(dst)


def poster(clip: Path, at: float = 1.0) -> Path:
    """The clip's poster frame (a JPEG beside it): what a picture check, the media index and a thumbnail see."""
    out = clip.with_suffix('.jpg')
    for t in (at, 0.0):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', str(clip), '-frames:v', '1', '-q:v', '3', str(out)],
                       capture_output=True, timeout=120)
        if out.exists() and out.stat().st_size > 0:
            return out
    raise OSError('no frame')


def slug_of(name: str) -> str:
    s = re.sub(r'[^a-z0-9]+', '-', Path(name).stem.lower()).strip('-')
    return s or 'clip'


def ingest_videos(set_id: str, entries: list[dict], club: str | None, season: str | None, log) -> list[dict]:
    """`entries`: {path, source, source_id, required, pack, origin?, licence?}. Writes the proxies, posters and the set's
    clip index; returns the pieces. A required clip that cannot be read stops the job (never a stand-in)."""
    if not re.fullmatch(r'[a-z0-9-]+', set_id):
        raise ValueError('set id')
    out_dir = CLIPS / set_id
    out_dir.mkdir(parents=True, exist_ok=True)
    idx_p = out_dir / 'index.json'
    index = {'set': set_id, 'club': club, 'season': season, 'origin': 'owner-upload', 'supplied': date.today().isoformat(),
             'note': 'Video clips for this production; required means selected by the owner.', 'pieces': []}
    for e in entries:
        path = Path(e['path'])
        ident = hashlib.sha256((e['source_id'] + ':').encode() + path.read_bytes()[:4_000_000]).hexdigest()[:12] if path.exists() else '0'
        slug = (slug_of(e['source'])[:44] + '-' + ident)
        dst = out_dir / f'{slug}.mp4'
        try:
            if not path.exists() or probe(path) <= 0:
                raise OSError('unreadable')
            dur = proxy(path, dst)
            pst = poster(dst, min(1.0, dur / 3))
        except (OSError, subprocess.TimeoutExpired) as x:
            if e.get('required'):
                raise StageError('REQUIRED_MEDIA', f'Your selected video {e["source"]} is missing or unreadable. Replace it (MP4, MOV or WebM) and retry.', retryable=True) from x
            log(f'Clips: optional video {e["source"]} is unreadable — skipped')
            continue
        desc = re.sub(r'[_-]+', ' ', Path(e['source']).stem)
        index['pieces'].append({'key': f'clip:{set_id}/{slug}', 'media': 'video', 'dur': round(dur, 2), 'poster': pst.name,
                                'description': desc[:300], 'source': e['source'], 'source_id': e['source_id'],
                                'required': bool(e.get('required')), 'pack': e.get('pack') or 'Your uploads',
                                **{k: e[k] for k in ('origin', 'licence') if e.get(k)}})
    idx_p.write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if index['pieces']:
        log(f'Clips: {len(index["pieces"])} video clip(s), {sum(p["required"] for p in index["pieces"])} required in the film')
    return index['pieces']


def poster_path(key: str) -> Path | None:
    """`clip:<set>/<slug>` → its poster frame, or None."""
    m = re.fullmatch(r'clip:([a-z0-9-]+)/([a-z0-9-]+)', str(key or ''))
    if not m:
        return None
    p = CLIPS / m.group(1) / f'{m.group(2)}.jpg'
    return p if p.exists() else None


def is_owner(asset: dict) -> bool:
    """A piece the owner chose for this film: an upload, or a file in a Drive folder pinned to it."""
    return bool(asset.get('required')) and not asset.get('archive')

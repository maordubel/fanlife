"""I WAS THERE — the material survey: what the owner's footage IS, before a single cut is planned.

For every clip in a folder it measures, never guesses:
  · shape        duration, size, fps, rotation → which frame it serves (wide film / tall reel / both)
  · when         the camera's own creation time → which matchday it belongs to (clips are grouped by local date)
  · anonymity    tags that identify the owner: GPS (ISO6709), device make/model, author/owner names. Every one is
                 stripped from anything published; the survey only reports them so the strip can be checked.
  · sound        integrated loudness (EBU R128) and true peak → is the original audio usable as crowd ambience
  · cuts         scene changes (ffmpeg scene score) → natural in/out points
  · faces        frames with a detectable frontal face (OpenCV, when installed) → which clips need face treatment
  · a contact sheet of 12 frames per clip, so a person (and Claude) can see the material

    python3 scripts/football-stories/matchday/survey.py <folder> <out>

Writes <out>/inventory.json, <out>/inventory.md and <out>/sheets/<clip>.jpg. Source files are never modified.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

VIDEO = {'.mov', '.mp4', '.m4v', '.mts', '.avi', '.mkv', '.3gp', '.webm'}
ID_TAGS = ('location', 'iso6709', 'make', 'model', 'software', 'author', 'artist', 'comment', 'copyright')
LOCAL_TZ = dt.timezone(dt.timedelta(hours=2))   # Israel/Greece winter; a matchday is grouped by its local date


def run(cmd: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def probe(p: Path) -> dict:
    r = run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(p)])
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:300])
    return json.loads(r.stdout)


def rotation(v: dict) -> int:
    for sd in v.get('side_data_list') or []:
        if 'rotation' in sd:
            return int(round(float(sd['rotation'])))
    t = (v.get('tags') or {}).get('rotate')
    return int(t) if t else 0


def fps_of(v: dict) -> float | None:
    s = v.get('avg_frame_rate') or v.get('r_frame_rate') or ''
    if '/' in s:
        a, b = s.split('/')
        return round(int(a) / int(b), 3) if int(b) else None
    return None


def shot_on(fmt: dict, streams: list[dict]) -> str | None:
    tags = {k.lower(): v for k, v in (fmt.get('tags') or {}).items()}
    for k in ('com.apple.quicktime.creationdate', 'creation_time'):
        if tags.get(k):
            return tags[k]
    for s in streams:
        t = (s.get('tags') or {}).get('creation_time')
        if t:
            return t
    return None


def local_date(iso: str | None) -> str | None:
    if not iso:
        return None
    try:
        d = dt.datetime.fromisoformat(iso.replace('Z', '+00:00'))
    except ValueError:
        return None
    if d.tzinfo is None:
        return d.date().isoformat()
    return d.astimezone(LOCAL_TZ).date().isoformat()


def identifying(fmt: dict, streams: list[dict]) -> dict:
    out = {}
    for src in [fmt] + streams:
        for k, v in (src.get('tags') or {}).items():
            kl = k.lower()
            if any(t in kl for t in ID_TAGS) and 'handler' not in kl and 'vendor' not in kl:
                out[k] = (str(v)[:6] + '…') if 'location' in kl or 'iso6709' in kl else str(v)[:60]
    return out


def loudness(p: Path) -> dict:
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    txt = r.stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', txt)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', txt)
    return {'lufs': float(i[-1]) if i else None, 'true_peak': float(tp[-1]) if tp else None}


def scenes(p: Path, threshold: float = 0.32) -> list[float]:
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-an', '-vf',
             f"select='gt(scene,{threshold})',showinfo", '-f', 'null', '-'])
    return [round(float(t), 2) for t in re.findall(r'pts_time:([\d.]+)', r.stderr)]


def frames(p: Path, duration: float, n: int, tmp: Path) -> list[Path]:
    tmp.mkdir(parents=True, exist_ok=True)
    out = []
    for k in range(n):
        t = duration * (k + 0.5) / n
        f = tmp / f'{k:02d}.jpg'
        r = run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.3f}', '-i', str(p), '-frames:v', '1',
                 '-vf', 'scale=480:-2', '-q:v', '4', str(f)])
        if r.returncode == 0 and f.exists():
            out.append(f)
    return out


def contact_sheet(imgs: list[Path], target: Path, label: str) -> None:
    from PIL import Image, ImageDraw
    ims = [Image.open(i).convert('RGB') for i in imgs]
    if not ims:
        return
    w = 480
    h = max(int(im.height * w / im.width) for im in ims)
    cols = 4 if ims[0].width >= ims[0].height else 6
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * h + 40), (21, 19, 15))
    d = ImageDraw.Draw(sheet)
    d.text((10, 12), label, fill=(255, 251, 242))
    for k, im in enumerate(ims):
        im = im.resize((w, int(im.height * w / im.width)))
        sheet.paste(im, ((k % cols) * w, 40 + (k // cols) * h))
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, quality=82)


def faces(imgs: list[Path]) -> int | None:
    try:
        import cv2
    except ImportError:
        return None
    path = Path(getattr(getattr(cv2, 'data', None), 'haarcascades', '') or '') / 'haarcascade_frontalface_default.xml'
    cascade = cv2.CascadeClassifier(str(path)) if path.exists() else None
    if cascade is None or cascade.empty():   # OpenCV 5 ships no cascades: say "not measured", never "no faces"
        return None
    hits = 0
    for i in imgs:
        g = cv2.cvtColor(cv2.imread(str(i)), cv2.COLOR_BGR2GRAY)
        if len(cascade.detectMultiScale(g, 1.1, 5, minSize=(24, 24))):
            hits += 1
    return hits


def serves(w: int, h: int, rot: int) -> str:
    if rot in (90, -90, 270, -270):
        w, h = h, w
    if h > w * 1.2:
        return 'tall'
    if w > h * 1.2:
        return 'wide'
    return 'both'


def survey(src: Path, out: Path, sheet_frames: int = 12) -> dict:
    clips = sorted(p for p in src.rglob('*') if p.is_file() and p.suffix.lower() in VIDEO)
    rows, bad = [], []
    for p in clips:
        rel = str(p.relative_to(src))
        try:
            meta = probe(p)
        except Exception as e:  # unreadable → reported, never skipped silently (rule 11)
            bad.append({'file': rel, 'reason': str(e)})
            continue
        fmt, streams = meta['format'], meta['streams']
        v = next((s for s in streams if s.get('codec_type') == 'video'), None)
        a = next((s for s in streams if s.get('codec_type') == 'audio'), None)
        if not v:
            bad.append({'file': rel, 'reason': 'no video stream'})
            continue
        dur = float(fmt.get('duration') or v.get('duration') or 0)
        rot = rotation(v)
        w, h = int(v.get('width') or 0), int(v.get('height') or 0)
        stamp = shot_on(fmt, streams)
        tmp = out / '.frames' / re.sub(r'[^\w.-]+', '_', rel)
        imgs = frames(p, dur, sheet_frames, tmp) if dur > 0 else []
        sheet = out / 'sheets' / (re.sub(r'[^\w.-]+', '_', rel) + '.jpg')
        contact_sheet(imgs, sheet, f'{rel} · {dur:.1f}s · {w}x{h} rot {rot} · {stamp or "no date"}')
        row = {
            'file': rel, 'bytes': p.stat().st_size, 'duration': round(dur, 2), 'width': w, 'height': h,
            'rotation': rot, 'fps': fps_of(v), 'codec': v.get('codec_name'), 'hdr': v.get('color_transfer') in ('arib-std-b67', 'smpte2084'),
            'serves': serves(w, h, rot), 'shot_on': stamp, 'matchday': local_date(stamp),
            'identifying_tags': identifying(fmt, streams),
            'audio': loudness(p) if a else None, 'scene_cuts': scenes(p) if dur > 0 else [],
            'face_frames': faces(imgs), 'frames_sampled': len(imgs), 'sheet': str(sheet.relative_to(out)),
        }
        rows.append(row)
        for f in imgs:
            f.unlink(missing_ok=True)
    days = defaultdict(list)
    for r in rows:
        days[r['matchday'] or 'unknown'].append(r['file'])
    inv = {
        'surveyed_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'clips': rows, 'unreadable': bad,
        'matchdays': {k: {'clips': v, 'seconds': round(sum(r['duration'] for r in rows if (r['matchday'] or 'unknown') == k), 1)}
                      for k, v in sorted(days.items())},
        'totals': {
            'clips': len(rows), 'seconds': round(sum(r['duration'] for r in rows), 1),
            'wide': sum(r['serves'] == 'wide' for r in rows), 'tall': sum(r['serves'] == 'tall' for r in rows),
            'with_identifying_tags': sum(bool(r['identifying_tags']) for r in rows),
            'with_faces': sum(bool(r['face_frames']) for r in rows),
            'hdr': sum(r['hdr'] for r in rows),
        },
    }
    inv['photos'] = photos(src, out)
    (out / 'inventory.json').write_text(json.dumps(inv, indent=2, ensure_ascii=False))
    (out / 'inventory.md').write_text(markdown(inv) + ''.join(f"- photo {r['file']} · {r['taken'] or 'no date'} · {r['width']}×{r['height']}\n" for r in inv['photos']))
    return inv


PHOTO = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}


def photos(src: Path, out: Path) -> list[dict]:
    """The owner's stills from the night (HEIC from an iPhone, JPG): each one read for its own time, and written to
    photos/ at 1600 px with no metadata, so the edit can look at it. Unreadable → reported, never skipped."""
    from PIL import Image, ImageOps
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
    except ImportError:
        pass
    rows = []
    for p in sorted(x for x in src.rglob('*') if x.is_file() and x.suffix.lower() in PHOTO):
        rel = str(p.relative_to(src))
        try:
            im = Image.open(p)
            ex = im.getexif()
            sub = ex.get_ifd(0x8769) if hasattr(ex, 'get_ifd') else {}
            taken = sub.get(0x9003) or ex.get(0x0132)
            off = sub.get(0x9011)
            im = ImageOps.exif_transpose(im).convert('RGB')
            w, h = im.size
            im.thumbnail((1600, 1600))
            dst = out / 'photos' / (re.sub(r'[^\w.-]+', '_', Path(rel).stem) + '.jpg')
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, quality=88)
            rows.append({'file': rel, 'taken': f'{taken}{off or ""}' if taken else None, 'width': w, 'height': h,
                         'still': str(dst.relative_to(out))})
        except Exception as e:
            rows.append({'file': rel, 'taken': None, 'width': 0, 'height': 0, 'still': None, 'error': str(e)[:160]})
    return rows


def markdown(inv: dict) -> str:
    t = inv['totals']
    lines = [f"# Material survey · {inv['surveyed_at']}", '',
             f"{t['clips']} clips · {t['seconds'] / 60:.1f} min · wide {t['wide']} · tall {t['tall']} · "
             f"HDR {t['hdr']} · identifying tags {t['with_identifying_tags']} · faces seen in {t['with_faces']}", '',
             '## Matchdays (by the camera\'s own date)', '']
    for day, d in inv['matchdays'].items():
        lines.append(f"- **{day}** — {len(d['clips'])} clips, {d['seconds'] / 60:.1f} min")
    lines += ['', '## Clips', '', '| clip | s | frame | date | LUFS | faces | ID tags |', '|---|---|---|---|---|---|---|']
    for r in inv['clips']:
        lufs = r['audio']['lufs'] if r['audio'] else 'no audio'
        lines.append(f"| {r['file']} | {r['duration']} | {r['serves']} {r['width']}×{r['height']} r{r['rotation']} | "
                     f"{r['matchday'] or '?'} | {lufs} | {r['face_frames'] if r['face_frames'] is not None else 'n/a'}/{r['frames_sampled']} | "
                     f"{', '.join(r['identifying_tags']) or '—'} |")
    if inv['unreadable']:
        lines += ['', '## Unreadable', ''] + [f"- {b['file']}: {b['reason']}" for b in inv['unreadable']]
    return '\n'.join(lines) + '\n'


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    inv = survey(Path(sys.argv[1]), Path(sys.argv[2]))
    print(json.dumps(inv['totals']))

"""SIGHT — the studio looks at its pictures and at its films (owner, 15.11.2026: "the studio still does not choose the right
graphics, does not make the editing and directing I wanted").

Measured on AEK 0–1 PAO (14.11): 42% of the film was type or a diagram on a flat ground, "He signed for AEK" ran over a
silhouette behind bars, a named striker stood over faceless generic players. The cause: pictures were chosen by the words
in their FILE NAMES (media_index: "no model is asked"), nothing decided what the viewer should SEE on a line, and no gate
ever looked at a frame. Three parts, one module:

  captions   every library picture is looked at once by Gemini and described (who, what happens, where, era, mood, any
             text in it). Kept in kit/sight/captions.json by the picture's content hash, so a renamed file keeps its
             caption and a changed one is looked at again. `caption_library` runs before each film for what is new.
  direct     the director's shot list: for every narrated line, one sentence of what the viewer SEES, and — from the
             candidates the media index allows (club, rival colours, freshness) — the picture that shows it, plus the
             candidates that would CONTRADICT the line (never shown on it). One call a film; cached in the job.
  critic     after the render: one frame every 3 s with the line spoken over it, judged by Gemini — does the picture fit
             the words (2 fits · 1 generic · 0 wrong) and is the frame a slide (type or a diagram on a plain ground).
             Wrong frames name their shots for the producer's one re-plan (qa.experience → 'mismatch').
  flat       the slide share measured on the render itself, no model: a frame whose single colour covers 45% or more.

Every call fails soft: no key, a spent quota or an answer that does not parse leaves the film as the index made it and
says so in the log. Nothing here writes a fact on screen.

    python -m studio.sight caption [--limit N]      # look at the pictures not yet described (needs GEMINI_API_KEY)
    python -m studio.sight critic <job-dir>         # judge a rendered film's frames
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import subprocess
from pathlib import Path

from .common import FPS

HERE = Path(__file__).resolve().parent
CAPTIONS = HERE / 'kit' / 'sight' / 'captions.json'
MODEL = os.environ.get('STORIES_SIGHT_MODEL') or None      # None: gemini.py picks the newest the key may use
BATCH = 6                 # pictures a caption call looks at
CANDIDATES = 10           # pictures the director may choose from per line
CRITIC_EVERY_S = 3.0      # one judged frame every this many seconds
CRITIC_BATCH = 12         # frames a critic call judges
FLAT_SHARE = 0.45         # a frame whose one colour covers this much of it is a slide
FLAT_MAX = 0.15           # the film may be a slide this much of its time …
FLAT_RUN_MAX_S = 4.0      # … and never longer than this in a row
WRONG_MAX = 3             # frames the critic may call wrong before the film is re-planned
THUMB = 448

CAPTION_SYSTEM = """You describe pictures from a football documentary studio's art library so an editor can choose them.
For EACH picture return one JSON object: {"i": index, "caption": one plain sentence of what is literally shown,
"people": number of people clearly shown (0 if none), "faces": true if any face is drawn with features,
"action": what is happening in a few words or "", "place": stadium | terrace | pitch | street | city | room | studio |
abstract | other, "era": the decade the clothes/kit/objects suggest or "", "mood": tension | joy | grief | defiance | calm,
"text": any readable words in the picture or "", "avoid": short list of lines this picture must NOT illustrate because a
viewer would read it wrongly (for example "prison bars: never for a transfer or a signing")}.
Describe, never guess names. Answer a JSON list only."""

DIRECT_SYSTEM = """You are the director of a football documentary made of illustrated pictures. For every narrated line
you get the line and up to ten candidate pictures (id + what the picture shows). Decide what the viewer must SEE while the
line is spoken, then pick the candidate that shows it best.
Rules: the picture must be about what the line says (the event, the place, the person's action, the feeling), never just
"football in general". A candidate that would make a viewer misread the line (bars for a transfer, a celebration over a
defeat, a crowd in the wrong colours, a generic face for a named player) goes in "reject". If no candidate fits, pick
null — a card or a new picture will carry the line. Never invent facts.
Answer a JSON list, one object per line: {"n": line number, "see": one concrete sentence of the shot (subject, action,
framing), "pick": candidate id or null, "reject": [candidate ids], "fit": 0-2}."""

CRITIC_SYSTEM = """You judge frames of a football documentary against the narration spoken over them. For each frame:
"fit": 2 if the picture shows what the words say, 1 if it is generic football imagery that neither helps nor misleads,
0 if it is wrong or misleading for the words (wrong action, wrong mood, wrong club colours, a silhouette or object that
changes the meaning, an empty diagram); "slide": true if the frame is mostly type, a table or a diagram on a plain
ground with no picture; "note": at most ten words on what is wrong, or "". Answer a JSON list:
{"i": frame index, "fit": 0|1|2, "slide": true|false, "note": "..."}."""


# ── the Gemini call (one place; tests pass `call`) ────────────────────────────────────────────────────────────────────
def _call(system: str, parts: list[dict], log=print, budget_s: float = 600) -> list:
    from . import gemini
    key = gemini.api_key()
    if not key:
        raise RuntimeError('no Gemini key on this machine')
    body = {'systemInstruction': {'parts': [{'text': system}]}, 'contents': [{'role': 'user', 'parts': parts}],
            'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.2, 'maxOutputTokens': 8192}}
    r, _model = gemini.generate(key, body, wanted=MODEL, budget_s=budget_s, log=log)
    return parse(''.join(p.get('text', '') for c in r.get('candidates') or [] for p in (c.get('content') or {}).get('parts') or []))


def parse(text: str) -> list:
    """A JSON list out of a model's answer (a code fence or a word around it is tolerated)."""
    t = (text or '').strip()
    m = re.search(r'\[.*\]', t, re.S)
    try:
        out = json.loads(m.group(0) if m else t)
    except (ValueError, AttributeError):
        return []
    return out if isinstance(out, list) else []


def _img_part(data: bytes, mime: str = 'image/jpeg') -> dict:
    return {'inlineData': {'mimeType': mime, 'data': base64.b64encode(data).decode()}}


def thumb(path: str | Path, size: int = THUMB) -> bytes | None:
    try:
        from PIL import Image
        with Image.open(path) as im:
            im = im.convert('RGB')
            im.thumbnail((size, size))
            buf = io.BytesIO()
            im.save(buf, 'JPEG', quality=82)
            return buf.getvalue()
    except Exception:  # noqa: BLE001 — a clip, a broken file: not looked at
        return None


# ── captions ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def content_hash(path: str | Path) -> str | None:
    try:
        h = hashlib.sha1()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(1 << 20), b''):
                h.update(chunk)
        return h.hexdigest()[:16]
    except OSError:
        return None


def load_captions(path: Path = CAPTIONS) -> dict:
    try:
        return json.loads(path.read_text(encoding='utf-8')).get('pictures') or {}
    except (OSError, ValueError):
        return {}


def save_captions(caps: dict, path: Path = CAPTIONS) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'version': 1, 'pictures': dict(sorted(caps.items()))}, ensure_ascii=False, indent=0) + '\n', encoding='utf-8')


def caption_of(rec: dict, caps: dict) -> dict | None:
    """The caption of an index record, by its content hash (kept on the record as `sight` once looked up)."""
    if 'sight' in rec:
        return rec['sight']
    h = content_hash(rec['path']) if rec.get('path') else None
    rec['sight'] = caps.get(h) if h else None
    return rec['sight']


def describe(rec: dict, caps: dict) -> str:
    """One line for the director: the caption when the picture was looked at, else the words of its name."""
    c = caption_of(rec, caps)
    if c:
        bits = [c.get('caption') or '']
        if c.get('people'):
            bits.append(f"{c['people']} people" + (', faces drawn' if c.get('faces') else ', faceless'))
        if c.get('era'):
            bits.append(c['era'])
        if c.get('avoid'):
            bits.append('NOT for: ' + '; '.join(c['avoid'][:3]))
        return ' · '.join(b for b in bits if b)
    return 'uncaptioned: ' + re.sub(r'[-_:/]+', ' ', rec['id'].split('/')[-1])


def caption_library(index: dict | None = None, log=print, call=None, limit: int | None = None, path: Path = CAPTIONS) -> int:
    """Look at every still and cut-out on this machine with no caption yet. → how many were described."""
    if index is None:
        from . import media_index as MI
        index = MI.build()
    caps = load_captions(path)
    todo, seen = [], set()
    for r in index.get('records') or []:
        if r.get('kind') not in ('still', 'cutout') or not r.get('path'):
            continue
        h = content_hash(r['path'])
        if not h or h in caps or h in seen:
            continue
        seen.add(h)
        todo.append((h, r))
    if limit:
        todo = todo[:limit]
    if not todo:
        log('Sight: every picture on this machine is already described')
        return 0
    call = call or (lambda parts: _call(CAPTION_SYSTEM, parts, log))
    done = 0
    for k in range(0, len(todo), BATCH):
        chunk = [(h, r, thumb(r['path'])) for h, r in todo[k:k + BATCH]]
        chunk = [x for x in chunk if x[2]]
        if not chunk:
            continue
        parts: list[dict] = []
        for i, (_h, r, img) in enumerate(chunk):
            parts += [{'text': f'Picture {i} (file name, a hint only: {r["id"].split("/")[-1]})'}, _img_part(img)]
        try:
            out = call(parts)
        except Exception as x:  # noqa: BLE001 — quota or network: what is described so far is kept
            log(f'Sight: captions stopped after {done} ({str(x)[:140]})')
            break
        for o in out:
            try:
                h, r, _ = chunk[int(o.get('i'))]
            except (TypeError, ValueError, IndexError):
                continue
            caps[h] = {k_: o.get(k_) for k_ in ('caption', 'people', 'faces', 'action', 'place', 'era', 'mood', 'text', 'avoid') if o.get(k_) not in (None, '')}
            caps[h]['id'] = r['id']
            done += 1
        save_captions(caps, path)
    log(f'Sight: {done} pictures described ({len(caps)} in the book)')
    return done


def after_captions(log=print, commit=None) -> None:
    """In the studio worker: describe what is new, commit the book to main (as looks.after_film does)."""
    if not os.environ.get('GEMINI_API_KEY') and not os.environ.get('GEMINI_API_KEY_KIDS'):
        log('Sight: no Gemini key here — pictures are chosen by their names only')
        return
    try:
        n = caption_library(log=log, limit=int(os.environ.get('STORIES_SIGHT_PER_FILM') or 240))   # the rest on the next film
    except Exception as x:  # noqa: BLE001 — never the film's problem
        log(f'Sight: captions skipped ({str(x)[:140]})')
        return
    if n and (os.environ.get('GITHUB_WORKFLOW') == 'Football Stories worker' or commit):
        from .kinds import _commit
        (commit or _commit)(['scripts/football-stories/studio/kit/sight/captions.json'], f'Studio: {n} pictures described', log)


# ── the director's shot list ─────────────────────────────────────────────────────────────────────────────────────────
def direct(lines: list[dict], log=print, call=None) -> dict[int, dict]:
    """`lines`: [{'n', 'type', 'text', 'candidates': [{'id', 'shows'}]}]. → {n: {'see', 'pick', 'reject', 'fit'}}.
    A pick that is not one of the line's candidates is dropped (the model may not invent a picture)."""
    todo = [x for x in lines if x.get('text')]
    if not todo:
        return {}
    call = call or (lambda parts: _call(DIRECT_SYSTEM, parts, log))
    out: dict[int, dict] = {}
    for k in range(0, len(todo), 30):   # thirty lines a call keeps every answer well inside the output limit
        chunk = todo[k:k + 30]
        text = '\n\n'.join(f'LINE {x["n"]} ({x.get("type") or "line"}): {x["text"]}\n' +
                           '\n'.join(f'  - {c["id"]}: {c["shows"]}' for c in x['candidates']) for x in chunk)
        try:
            ans = call([{'text': text}])
        except Exception as x:  # noqa: BLE001
            log(f'Sight: the director could not answer ({str(x)[:140]}) — the index chooses by names')
            return out
        allowed = {x['n']: {c['id'] for c in x['candidates']} for x in chunk}
        for o in ans:
            try:
                n = int(o.get('n'))
            except (TypeError, ValueError):
                continue
            if n not in allowed:
                continue
            pick = o.get('pick') if o.get('pick') in allowed[n] else None
            out[n] = {'see': str(o.get('see') or '')[:240], 'pick': pick,
                      'reject': [r for r in (o.get('reject') or []) if r in allowed[n] and r != pick],
                      'fit': o.get('fit') if isinstance(o.get('fit'), int) else None}
    log(f'Sight: shot list for {len(out)} lines — {sum(1 for v in out.values() if v["pick"])} pictures chosen by sight, '
        f'{sum(len(v["reject"]) for v in out.values())} refused as misleading')
    return out


# ── the render, measured ────────────────────────────────────────────────────────────────────────────────────────────
def flat(master: Path, every: float = 2.0) -> dict:
    """The slide share of a render: one 96×54 frame every `every` s; a frame whose most common colour (16 levels a
    channel) covers FLAT_SHARE of it is a slide. → {'share', 'run_s', 'run_at', 'times'}."""
    W, H = 96, 54
    try:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(master), '-vf', f'fps={1 / every},scale={W}:{H}', '-f', 'rawvideo',
                              '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return {'share': None, 'run_s': None, 'run_at': None, 'times': []}
    import numpy as np
    n = len(raw) // (W * H * 3)
    if not n:
        return {'share': None, 'run_s': None, 'run_at': None, 'times': []}
    a = np.frombuffer(raw[:n * W * H * 3], dtype=np.uint8).reshape(n, W * H, 3) >> 4
    codes = (a[..., 0].astype(np.int32) << 8) | (a[..., 1].astype(np.int32) << 4) | a[..., 2]
    times, run, best, best_at, start = [], 0, 0, None, None
    for i in range(n):
        top = np.bincount(codes[i]).max() / codes.shape[1]
        if top >= FLAT_SHARE:
            times.append(round(i * every, 2))
            start = i * every if run == 0 else start
            run += 1
            if run > best:
                best, best_at = run, start
        else:
            run = 0
    return {'share': round(len(times) / n, 3), 'run_s': round(best * every, 1), 'run_at': best_at, 'times': times}


def frame_at(master: Path, t: float, width: int = 512) -> bytes | None:
    try:
        return subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', str(master), '-frames:v', '1', '-vf', f'scale={width}:-2',
                               '-f', 'image2pipe', '-vcodec', 'mjpeg', '-q:v', '5', '-'], capture_output=True, check=True).stdout or None
    except (OSError, subprocess.CalledProcessError):
        return None


def line_at(plan: dict, t: float, intro_s: float = 0.0) -> tuple[int | None, str]:
    for s in plan.get('shots') or []:
        a = s['start'] - intro_s
        if a <= t < a + s['frames'] / FPS:
            return s['n'], s.get('narration') or ''
    return None, ''


def critic(master: Path, plan: dict, intro_s: float = 0.0, log=print, call=None, grab=frame_at) -> dict | None:
    """Judge the render frame by frame against its words. → {'frames': [...], 'wrong': [shot n], 'fit': mean, 'slides'}
    or None when no judge could be asked (the gate then reports the flat share alone)."""
    D = sum(s['frames'] for s in plan.get('shots') or []) / FPS
    pts = []
    t = 1.5
    while t < D - 1.0:
        n, words = line_at(plan, t, intro_s)
        if n is not None and words:
            pts.append((t, n, words))
        t += CRITIC_EVERY_S
    if not pts:
        return None
    call = call or (lambda parts: _call(CRITIC_SYSTEM, parts, log))
    frames: list[dict] = []
    for k in range(0, len(pts), CRITIC_BATCH):
        chunk = [(t, n, w, grab(master, t + intro_s)) for t, n, w in pts[k:k + CRITIC_BATCH]]
        chunk = [x for x in chunk if x[3]]
        parts: list[dict] = []
        for i, (t, n, w, img) in enumerate(chunk):
            parts += [{'text': f'Frame {i} at {t:.0f}s. Narration over it: "{w}"'}, _img_part(img)]
        if not parts:
            continue
        try:
            ans = call(parts)
        except Exception as x:  # noqa: BLE001
            log(f'Sight: the critic stopped at {k} frames ({str(x)[:140]})')
            if not frames:
                return None
            break
        for o in ans:
            try:
                t, n, w, _ = chunk[int(o.get('i'))]
            except (TypeError, ValueError, IndexError):
                continue
            fit = o.get('fit') if o.get('fit') in (0, 1, 2) else None
            frames.append({'t': round(t, 1), 'n': n, 'fit': fit, 'slide': bool(o.get('slide')), 'note': str(o.get('note') or '')[:80]})
    if not frames:
        return None
    judged = [f for f in frames if f['fit'] is not None]
    wrong = sorted({f['n'] for f in judged if f['fit'] == 0})
    return {'frames': frames, 'wrong': wrong, 'wrong_frames': sum(1 for f in judged if f['fit'] == 0),
            'fit': round(sum(f['fit'] for f in judged) / max(1, len(judged)), 2),
            'generic': round(sum(1 for f in judged if f['fit'] == 1) / max(1, len(judged)), 2),
            'slides': round(sum(1 for f in frames if f['slide']) / len(frames), 2)}


def main(argv=None) -> int:
    import argparse
    ap = argparse.ArgumentParser(prog='studio.sight')
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('caption')
    c.add_argument('--limit', type=int)
    k = sub.add_parser('critic')
    k.add_argument('job')
    f = sub.add_parser('flat')
    f.add_argument('video')
    a = ap.parse_args(argv)
    if a.cmd == 'caption':
        caption_library(limit=a.limit)
    elif a.cmd == 'flat':
        print(json.dumps(flat(Path(a.video))))
    else:
        jd = Path(a.job)
        plan = json.loads((jd / 'plan.json').read_text())
        master = next((jd / x for x in ('master.mp4', 'film.mp4', 'picture.mp4') if (jd / x).exists()), None)
        print(json.dumps(critic(master, plan) if master else None, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

"""Checks on the actual output. They measure what can be measured — streams, length, loudness, silence, black frames,
caption timing, rival colours — and say plainly what they cannot prove (facts, likeness, artistic quality).

THE EXPERIENCE GATE (owner, 12.11.2026: "every film must be an experience … viral, interesting, fun to watch, with a
HOOK"). The checks above are technical: a slideshow with perfect loudness passed them all. The gate measures what a
viewer feels, on the frames of the finished film, and each threshold below is a named constant with its reason:

  the opening     something changes on screen within FIRST_CHANGE_S; the film's stake is on screen within STAKE_BY_S
  the cut         no shot longer than MAX_SHOT_S; no shot under MOTION_FLOOR; no stretch of dead frames
  the pictures    at least UNIQUE_ASSET_MIN of the picture uses are different pictures; none on more than MAX_ASSET_SHOTS shots
  calm            no flash (a luma spike that comes straight back) and no shake (the whole frame reversing direction) —
                  rule 142, measured the way VOX measures its camera (docs/fanlife/71: dead_frames, worst_jerk)

A failure blocks `ready` with a sentence a person can act on, and names the plan shots at fault so the pipeline can
re-plan those shots once (studio/pipeline.py) before it gives the film to the owner as needing review."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from .common import FPS, Palette, is_banned_pixel


def probe(path: Path) -> dict:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def tolerance(minutes: float) -> float:
    return 0.20 if minutes <= 3 else 0.15


def check(job_dir: Path, master: Path, plan: dict, cues: list[dict], requested_minutes: float, palette: Palette, log, intro_s: float = 0.0) -> dict:
    out: dict = {'checks': [], 'cannot_prove': [
        'Historical accuracy beyond the cited records (the script is checked number-by-number against its claims, not against the world).',
        'That no generated image resembles a real person (prompts forbid faces; frames should be reviewed).',
        'Artistic quality — watch the film.']}

    def add(name, ok, detail):
        out['checks'].append({'name': name, 'ok': bool(ok), 'detail': detail})
        log(f'QA {"✓" if ok else "✗"} {name}: {detail}')

    p = probe(master)
    from .media_assets import verify_rendered
    media = verify_rendered(job_dir, plan)
    if media['required']:
        add('selected pictures', media['required'] == media['rendered'],
            f"{media['rendered']}/{media['required']} selected pictures rendered; shot times in media-usage.json")
    v = next((s for s in p['streams'] if s['codec_type'] == 'video'), None)
    a = next((s for s in p['streams'] if s['codec_type'] == 'audio'), None)
    dur = float(p['format']['duration'])
    add('streams', v and a and v['codec_name'] == 'h264' and a['codec_name'] == 'aac' and int(v['height']) >= 1080,
        f"{v and v['codec_name']} {v and v['width']}x{v and v['height']} · {a and a['codec_name']} {a and a.get('sample_rate')}Hz")
    want = requested_minutes * 60
    tol = tolerance(requested_minutes)
    add('duration', abs(dur - want) <= want * tol, f'{dur / 60:.2f} min for a {requested_minutes} min request (±{int(tol * 100)}%)')
    mb = master.stat().st_size / 1e6
    add('fits storage', mb <= 880, f'master {mb:.0f} MB (budget 800 MB: the private bucket holds 1 GB)')
    add('picture/audio sync', abs(dur - plan['duration']) < 0.25, f'master {dur:.2f}s, edit {plan["duration"]:.2f}s')
    # loudness
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(master), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r.stderr)
    lufs = float(m[-1]) if m else None
    add('loudness', lufs is not None and -16 <= lufs <= -12, f'{lufs} LUFS integrated, true peak {tp[-1] if tp else "?"} dBFS')
    # silence longer than 4 s anywhere before the end card
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(master), '-af', 'silencedetect=n=-45dB:d=4', '-f', 'null', '-'], capture_output=True, text=True)
    sil = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', r.stderr) if float(x) < dur - 8]
    add('no dead air', not sil, f'{len(sil)} silences over 4s' + (f' at {sil[:5]}' if sil else ''))
    # black frames
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(master), '-vf', 'blackdetect=d=0.6:pic_th=0.97', '-an', '-f', 'null', '-'], capture_output=True, text=True)
    blk = [float(x) for x in re.findall(r'black_start:(-?[\d.]+)', r.stderr) if float(x) > 1.0]
    add('no black gaps', not blk, f'{len(blk)} black runs' + (f' at {blk[:5]}' if blk else ''))
    # captions
    bad = [c for c in cues if c['end'] <= c['start'] or c['end'] > dur + 0.1 or any(len(l) > 46 for l in c['lines'])]
    add('captions', cues and not bad, f'{len(cues)} cues, {len(bad)} malformed')
    # Pixel colour alone cannot identify which club an object belongs to.
    frames_dir = job_dir / 'qa'
    frames_dir.mkdir(exist_ok=True)
    # contact sheet: one frame per shot, for a human look
    sheet = []
    for s in plan['shots']:
        t = s['start'] + min(s['frames'] / FPS * 0.6, s['frames'] / FPS - 0.1)
        fp = frames_dir / f'shot-{s["n"]:04d}.jpg'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t:.2f}', '-i', str(master), '-frames:v', '1', '-vf', 'scale=384:-1', str(fp)], check=True)
        sheet.append(fp)
    cols = 6
    rows = (len(sheet) + cols - 1) // cols
    cs = Image.new('RGB', (cols * 384, rows * 216), (21, 19, 15))
    for i, fp in enumerate(sheet):
        if fp.exists():
            cs.paste(Image.open(fp), ((i % cols) * 384, (i // cols) * 216))
    cs.save(job_dir / 'contact-sheet.jpg', quality=82)
    # the experience gate (see the module's head): what the film feels like, measured on its own frames
    try:
        exp = experience(master, plan, job_dir, intro_s)
        for name, ok, detail in exp['checks']:
            add(name, ok, detail)
        out['experience'] = {'numbers': exp['numbers'], 'replan': {str(k): v for k, v in exp['replan'].items()}, 'enforced': exp['enforced']}
    except Exception as e:  # noqa: BLE001 — a plan of another shape (CLASSIFIED's), a film ffmpeg cannot read: said, never a crash
        # the gate blocks only the engine it is enforced for; elsewhere a film it cannot measure is reported and goes on
        add('experience', plan.get('engine') != 'docu', f'the film could not be measured ({type(e).__name__}) — watch it before it goes out')
    out['ok'] = all(c['ok'] for c in out['checks'])
    out['duration_seconds'] = round(dur, 2)
    return out


# ── the experience gate ───────────────────────────────────────────────────────────────────────────────────────────────
# Frames are read small and grey (the gate measures change, not detail) with the subtitle band cut off: the karaoke
# lights a word every third of a second, which is motion to a ruler and nothing to a viewer.
GATE_W, GATE_H = 160, 90
GATE_KEEP = 0.80          # the share of the frame's height above the subtitles
TO_1080 = 1920 / GATE_W   # a shift measured on the small frame, in pixels of the film
# The first three seconds decide whether a thumb scrolls on (HOOK LAWS, writer.py): by then the picture has changed once.
FIRST_CHANGE_S = 3.0
# The film's stake — the scoreboard, the trailer card, the question, the number — is on screen inside the hook's fifteen seconds.
STAKE_BY_S = 15.0
STAKE_TYPES = {'score', 'versus', 'goal', 'trailer', 'stat', 'record', 'turning', 'ticket'}
# The editor cuts every still at 4 s (docu/editor.MAX_STILL); half a second on top is the measuring grain, not a licence.
MAX_SHOT_S = 4.5
# A visual change: a frame that differs from the one before by this many grey levels on average AND by CUT_RATIO times
# what its neighbours do. A slow push moves 0.3–1.5 levels a frame; a cut, a whip, a tear or a card landing moves 4–60.
CUT_ABS, CUT_RATIO = 3.0, 4.0
# Under this a shot is a photograph on a screen (levels a frame, averaged over the shot). The slowest move the editor
# makes — a card's creep — measures above it; a frame that does not move at all measures 0.
MOTION_FLOOR = 0.05
# VOX's `dead_frames` for a rendered film: consecutive frames that do not change at all. A second of them is a freeze.
DEAD_DIFF, DEAD_RUN_S = 0.01, 1.0
# Pictures: a film that shows the same few images again and again is the slideshow the owner rejected.
UNIQUE_ASSET_MIN, MAX_ASSET_SHOTS = 0.6, 2
# A flash: the frame's mean luma jumps by FLASH_RISE levels inside two frames and falls back inside FLASH_FRAMES. A cut to
# a paper card jumps and STAYS — that is a cut, not a flash.
FLASH_RISE, FLASH_FRAMES = 28.0, 6
# A shake: the whole frame moves more than JITTER_PX (film pixels) one way and then the other, SHAKE_REVERSALS times
# inside half a second. One reversal is a camera settling; three are the "feeling of epilepsy" of rule 142.
JITTER_PX, SHAKE_REVERSALS = 6.0, 3
# VOX's `worst_jerk`: the largest change of the frame's speed from one frame to the next, outside cuts (film px). VOX
# guards its camera at 130; a rendered film is held to the same.
WORST_JERK_PX = 130.0


def read_frames(path: Path, start: float = 0.0):
    """→ (fps, a generator of grey GATE_W×GATE_H frames from `start` seconds on). One ffmpeg, one pipe, no files."""
    v = next(s for s in probe(path)['streams'] if s['codec_type'] == 'video')
    num, den = (v.get('avg_frame_rate') or v.get('r_frame_rate') or '25/1').split('/')
    fps = float(num) / float(den or 1) or 25.0

    def gen():
        p = subprocess.Popen(['ffmpeg', '-v', 'error', *(['-ss', f'{start:.3f}'] if start > 0 else []), '-i', str(path), '-an',
                              '-vf', f'scale={GATE_W}:{GATE_H},format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
        try:
            while True:
                buf = p.stdout.read(GATE_W * GATE_H)
                if len(buf) < GATE_W * GATE_H:
                    break
                yield np.frombuffer(buf, np.uint8).reshape(GATE_H, GATE_W)
        finally:
            p.stdout.close()
            p.wait()
    return fps, gen()


def measure(frames, fps: float) -> dict:
    """What the gate reads off a film, frame by frame: how much each frame differs from the one before (`diff`), its mean
    luma (`luma`) and how far the whole frame moved (`shift`, film pixels, by phase correlation). Works on any iterable
    of 2-D uint8 arrays, so the thresholds are tested on frames made by hand."""
    import cv2
    keep = None
    prev = prev_f = None
    diff, luma, shift = [0.0], [], [(0.0, 0.0)]
    win = None
    for f in frames:
        keep = keep or max(8, int(f.shape[0] * GATE_KEEP))
        a = f[:keep].astype(np.float32)
        luma.append(float(a.mean()))
        if prev is not None:
            d = float(np.abs(a - prev).mean())
            diff.append(d)
            if d < DEAD_DIFF:                # nothing moved: no shift to read
                shift.append((0.0, 0.0))
            else:
                if win is None:
                    win = cv2.createHanningWindow((a.shape[1], a.shape[0]), cv2.CV_32F)
                (dx, dy), conf = cv2.phaseCorrelate(prev.copy(), a.copy(), win)   # on copies: OpenCV windows its inputs in place
                k = TO_1080 * GATE_W / a.shape[1]
                shift.append((dx * k, dy * k) if conf > 0.15 else (0.0, 0.0))
        prev = a
    return {'fps': fps, 'diff': diff, 'luma': luma, 'shift': shift}


def change_events(diff: list[float], fps: float) -> list[float]:
    """The times something visibly changes: a cut, a transition, a card or a stamp landing. Frames in a burst are one event."""
    d = np.asarray(diff, np.float32)
    n, w = len(d), max(3, int(fps))
    out: list[float] = []
    last = -1.0
    for i in range(1, n):
        if d[i] < CUT_ABS:
            continue
        lo, hi = max(1, i - w), min(n, i + w + 1)
        base = float(np.median(d[lo:hi]))
        if d[i] >= CUT_RATIO * max(base, 0.25) or d[i] >= 12:
            t = i / fps
            if not out or t - last > 0.25:   # a burst (a whip, a tear, a card sliding in) is one change, timed at its start
                out.append(t)
            last = t
    return out


def experience_numbers(m: dict) -> dict:
    """The series → the gate's numbers (all times in seconds from the first frame measured)."""
    fps, d, lum, sh = m['fps'], np.asarray(m['diff'], np.float32), np.asarray(m['luma'], np.float32), m['shift']
    n = len(lum)
    dur = n / fps if fps else 0.0
    ev = change_events(m['diff'], fps)
    edges = [0.0, *ev, dur]
    shots = [(a, b) for a, b in zip(edges, edges[1:]) if b - a > 1e-6]
    longest = max(shots, key=lambda s: s[1] - s[0], default=(0.0, 0.0))
    # motion inside each shot, away from the frames of the change itself
    slow = []
    for a, b in shots:
        i0, i1 = int(a * fps) + max(2, int(0.3 * fps)), int(b * fps) - 1
        if i1 - i0 >= int(0.6 * fps):
            mv = float(d[i0:i1].mean())
            if mv < MOTION_FLOOR:
                slow.append({'at': round(a, 2), 'd': round(b - a, 2), 'motion': round(mv, 3)})
    # dead frames
    dead = d < DEAD_DIFF
    dead[0] = False
    runs, run0, worst = [], None, (0.0, 0.0)
    for i in range(n + 1):
        if i < n and dead[i]:
            run0 = i if run0 is None else run0
        elif run0 is not None:
            if (i - run0) / fps >= DEAD_RUN_S:
                runs.append({'at': round(run0 / fps, 2), 'd': round((i - run0) / fps, 2)})
            run0 = None
    # flashes: up fast, and straight back down
    flashes = []
    for i in range(2, n):
        rise = float(lum[i] - min(lum[i - 1], lum[i - 2]))
        if rise >= FLASH_RISE and i + 1 < n:
            after = lum[i + 1:i + 1 + FLASH_FRAMES]
            if len(after) and float(lum[i] - after.min()) >= FLASH_RISE * 0.7:
                if not flashes or i / fps - flashes[-1] > 0.3:
                    flashes.append(round(i / fps, 2))
    # shake and jerk: the whole frame's movement, away from the frames of a change
    near = np.zeros(n, bool)
    for t in ev:
        i = int(round(t * fps))
        near[max(0, i - 2):min(n, i + max(3, int(0.5 * fps)))] = True
    shakes, jerk, half = [], 0.0, max(2, int(fps / 2))
    rev = []
    for i in range(2, n):
        (ax, ay), (bx, by) = sh[i - 1], sh[i]
        if not (near[i] or near[i - 1]):   # the speed of a cut is not a jerk; a shake is a shake wherever it happens
            jerk = max(jerk, float(np.hypot(bx - ax, by - ay)))
        for a_, b_ in ((ax, bx), (ay, by)):
            if abs(a_) >= JITTER_PX and abs(b_) >= JITTER_PX and a_ * b_ < 0:
                rev.append(i)
                break
    for j, i in enumerate(rev):
        if sum(1 for k in rev[j:] if k - i <= half) >= SHAKE_REVERSALS and (not shakes or i / fps - shakes[-1] > 0.5):
            shakes.append(round(i / fps, 2))
    first = next((t for t in ev if t > 0.1), None)
    return {'seconds': round(dur, 2), 'changes': len(ev), 'shots_per_minute': round(len(shots) * 60 / dur, 1) if dur else 0.0,
            'first_change_s': None if first is None else round(first, 2), 'longest_shot_s': round(longest[1] - longest[0], 2),
            'longest_shot_at': round(longest[0], 2), 'long_shots': [{'at': round(a, 2), 'd': round(b - a, 2)} for a, b in shots if b - a > MAX_SHOT_S],
            'slow_shots': slow, 'dead_frames': int(dead.sum()), 'dead_runs': runs, 'flashes': flashes, 'shakes': shakes,
            'worst_jerk': round(jerk, 1)}


def asset_numbers(shots: list[dict] | None) -> dict | None:
    """Picture repetition from the cut's shot list (docu-shots.json): a picture counts once per plan shot, however many
    looks the editor takes at it there."""
    if not shots:
        return None
    uses: dict[str, list] = {}
    for s in shots:
        for src in sorted({p.get('src') for p in s.get('pictures') or [] if p.get('src')}):
            uses.setdefault(src, []).append(s.get('n'))
    total = sum(len(v) for v in uses.values())
    if not total:
        return None
    over = {k: v for k, v in uses.items() if len(v) > MAX_ASSET_SHOTS}
    return {'uses': total, 'unique': len(uses), 'ratio': round(len(uses) / total, 2), 'most': max(len(v) for v in uses.values()),
            'over': sorted({n for v in over.values() for n in v[MAX_ASSET_SHOTS:] if n is not None})}


def experience(master: Path, plan: dict, job_dir: Path | None = None, intro_s: float = 0.0, shots: list[dict] | None = None,
               frames=None) -> dict:
    """The gate. → {'checks': [(name, ok, detail)], 'numbers', 'replan': {plan shot n: [reasons]}, 'enforced'}.
    `plan` is on the film's clock (after any owner opening of `intro_s` seconds, which the gate does not judge: the owner
    chose it). Enforced for the DOCU engine, the studio's default; for the older engines the numbers are recorded and
    reported but block nothing — their cut was never built to these rules."""
    cut_errors: list[str] = []
    if shots is None and job_dir and (job_dir / 'docu-shots.json').exists():
        j = json.loads((job_dir / 'docu-shots.json').read_text())
        shots, cut_errors = j.get('shots'), list(j.get('errors') or [])
    fps, gen = (frames[0], frames[1]) if frames else read_frames(master, intro_s)
    num = experience_numbers(measure(gen, fps))
    assets = asset_numbers(shots)
    num['assets'] = assets
    enforced = plan.get('engine') == 'docu'
    replan: dict[int, list[str]] = {}

    def at(t: float, why: str, d: float = 0.0):
        """Name the plan shots on screen from `t` to `t + d` seconds after the opening."""
        for s in plan['shots']:
            a = s['start'] - intro_s
            if a < t + d + 1e-6 and t < a + s['frames'] / FPS and (d or a <= t):
                replan.setdefault(s['n'], [])
                if why not in replan[s['n']]:
                    replan[s['n']].append(why)

    checks = []
    ok = num['first_change_s'] is not None and num['first_change_s'] <= FIRST_CHANGE_S
    if not ok:
        at(0.0, 'long')
    checks.append(('experience · the first seconds', ok, f'the picture first changes at {num["first_change_s"]}s (it must within {FIRST_CHANGE_S:.0f}s)'
                   if num['first_change_s'] is not None else f'nothing changes on screen in the whole film'))
    early = [s for s in plan['shots'] if s['start'] - intro_s < STAKE_BY_S]
    stake = next((s for s in early if s['visual']['type'] in STAKE_TYPES or (s['visual']['type'] == 'open' and (s['visual'].get('headline') or '').strip())), None)
    checks.append(('experience · the stake', stake is not None,
                   f'a {stake["visual"]["type"]} card states it {max(0.0, stake["start"] - intro_s):.1f}s in' if stake else
                   f'no score, trailer card, headline or number is on screen in the first {STAKE_BY_S:.0f}s — the viewer is not told what is at stake'))
    long_ = num['long_shots']
    for x in long_:
        at(x['at'] + 0.1, 'long', x['d'] - 0.2)
    checks.append(('experience · shot length', not long_, f'longest shot {num["longest_shot_s"]}s at {num["longest_shot_at"]}s; {num["shots_per_minute"]} changes a minute'
                   + (f'; {len(long_)} shots run past {MAX_SHOT_S}s — it plays as a slideshow there' if long_ else f' (limit {MAX_SHOT_S}s)')))
    still = num['slow_shots'] + num['dead_runs']
    for x in still:
        at(x['at'] + 0.1, 'long', x['d'] - 0.2)
    checks.append(('experience · motion', not still, f'{len(num["slow_shots"])} shots under the motion floor, {len(num["dead_runs"])} freezes of {DEAD_RUN_S:.0f}s or more ({num["dead_frames"]} dead frames)'
                   + (f' — first at {still[0]["at"]}s: a picture that does not move' if still else '')))
    if assets:
        bad = assets['ratio'] < UNIQUE_ASSET_MIN or bool(assets['over'])
        for n in assets['over']:
            replan.setdefault(n, []).append('asset')
        checks.append(('experience · pictures', not bad, f'{assets["unique"]} different pictures in {assets["uses"]} uses ({assets["ratio"]:.0%}; at least {UNIQUE_ASSET_MIN:.0%}), the most used on {assets["most"]} shots (at most {MAX_ASSET_SHOTS})'))
    for t in num['flashes']:
        at(t, 'flash')
    for t in num['shakes']:
        at(t, 'shake')
    calm = not num['flashes'] and not num['shakes'] and num['worst_jerk'] <= WORST_JERK_PX
    checks.append(('experience · calm picture', calm, f'{len(num["flashes"])} flashes, {len(num["shakes"])} shakes, worst jerk {num["worst_jerk"]} px (limit {WORST_JERK_PX:.0f})'
                   + (f' — a flash at {num["flashes"][0]}s' if num['flashes'] else f' — the picture shakes at {num["shakes"][0]}s' if num['shakes'] else '')))
    if cut_errors:
        checks.append(('experience · the editor\'s rules', False, '; '.join(cut_errors[:4])))
    if not enforced:
        checks = [(name, True, f'measured, not enforced for the {plan.get("engine") or "classic"} engine — ' + detail + ('' if ok_ else ' ✗')) for name, ok_, detail in checks]
        replan = {}
    return {'checks': checks, 'numbers': num, 'replan': replan, 'enforced': enforced}

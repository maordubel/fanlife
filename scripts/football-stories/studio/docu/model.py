"""The model film's package (docs/fanlife/74-model-film.md): what stands beside a hand-written DOCU film when it is
handed over — the producer's gate run on the finished file, a contact sheet somebody LOOKS at, two thumbnails measured
at YouTube's smallest size, and the vertical cuts. One command after `hyperframes render`:

    python3 -m studio.docu.model --film <master.mp4> --storyboard storyboard.json --project <built project> --out <dir> \
        [--cuts cuts.json] [--thumbs thumbs.json]

The gate is the pipeline's own (studio/qa.experience) — nothing is measured here that the pipeline does not measure.
A hand-written film has no plan.json, so the plan the gate reads is made from the built beats: their times, their
types, their lines, and the score sheet the director would have written (studio/drama.sheet)."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from .. import drama, qa
from ..common import FPS
from ..thumbs import render as R
from . import build as B


def plan_of(sb: dict, project: Path) -> dict:
    durs = json.loads((project / 'assets' / 'vo' / 'durations.json').read_text())
    beats = B.timeline(sb['beats'], durs)
    shots = [{'n': i, 'start': b['t'], 'frames': int(round(b['d'] * FPS)), 'chapter': (b.get('meta') or {}).get('chapter'), 'narration': b.get('vo') or '',
              'visual': {'type': (b.get('meta') or {}).get('type') or 'illustration', 'headline': (b.get('meta') or {}).get('headline') or ''}} for i, b in enumerate(beats)]
    sheet = drama.sheet([{'n': s['n'], 'chapter': s['chapter'], 'type': s['visual']['type'], 'narration': s['narration'], 'start': s['start'], 'd': s['frames'] / FPS,
                          'outcome': (beats[s['n']].get('meta') or {}).get('outcome'), 'claim_ids': (beats[s['n']].get('meta') or {}).get('claims') or [],
                          'headline': s['visual']['headline']} for s in shots])
    for n, m in sheet['beats'].items():   # the writer's own marks win over the reading (a hand-written film is directed by hand)
        w = beats[n].get('meta') or {}
        m.update({k: w[k] for k in ('emotion', 'intensity', 'breath') if w.get(k) is not None})
    return {'engine': 'docu', 'shots': shots, 'duration': beats[-1]['t'] + beats[-1]['d'], 'sheet': {**sheet, 'shaped': True}}


def gate(film: Path, sb: dict, project: Path, intro_s: float = 0.0) -> dict:
    plan = plan_of(sb, project)
    usage = project / 'assets' / 'img' / 'media-index-usage.json'
    extras = {'usage': json.loads(usage.read_text())} if usage.exists() else {}
    exp = qa.experience(film, plan, project, intro_s=intro_s, extras=extras)
    j = json.loads((project / 'docu-shots.json').read_text())
    num = exp['numbers']
    run, last, worst = 0.0, None, 0.0
    for s in j['shots']:
        run = run + s['d'] if s.get('language') == last else s['d']
        last, worst = s.get('language'), max(worst, run)
    cams: dict = {}
    for s in j['shots']:
        for p in s['pictures']:
            if p.get('camera'):
                cams[p['camera']] = cams.get(p['camera'], 0) + 1
    tr: dict = {}
    for s in j['shots']:
        tr[s['in']] = tr.get(s['in'], 0) + 1
    lines = [f'EXPERIENCE GATE — {film.name} ({num["seconds"]} s measured' + (f', after a {intro_s:.1f} s opening' if intro_s else '') + ')',
             'gate: ' + ('PASSED' if all(ok for _, ok, _ in exp['checks']) else 'FAILED'), '']
    lines += [f'  {"PASS" if ok else "FAIL"} {name} — {detail}' for name, ok, detail in exp['checks']]
    lines += ['', f'visible changes a minute: {num["shots_per_minute"]} · longest shot {num["longest_shot_s"]} s (at {num["longest_shot_at"]} s) · first change {num["first_change_s"]} s',
              f'camera or layer motion: {num["moving_share"]:.1%} of the time · static seconds {num["static_seconds"]} · dead frames {num["dead_frames"]} · worst jerk {num["worst_jerk"]} px',
              f'language mix: documentary {j["mix"]["documentary"]:.1%} / explainer {j["mix"]["explainer"]:.1%} / kinetic {j["mix"]["kinetic"]:.1%} · longest run in one language {worst:.1f} s',
              f'named camera moves: {dict(sorted(cams.items()))}', f'transitions: {dict(sorted(tr.items()))}',
              f'pictures: {num["assets"]}', f'arc: {num.get("arc")}', f'editor errors: {j["errors"] or "none"}']
    return {'text': '\n'.join(lines) + '\n', 'ok': all(ok for _, ok, _ in exp['checks']), 'numbers': num}


def sheet(film: Path, out: Path, every: float = 8.0, cols: int = 6) -> int:
    """One frame every `every` seconds on one page, each with its time — to be looked at, not filed."""
    tmp = out.parent / '.frames'
    tmp.mkdir(parents=True, exist_ok=True)
    for f in tmp.glob('*.jpg'):
        f.unlink()
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(film), '-vf', f'fps=1/{every},scale=480:-2', str(tmp / 'f-%03d.jpg')], check=True)
    fs = sorted(tmp.glob('*.jpg'))
    w, h = Image.open(fs[0]).size
    rows = (len(fs) + cols - 1) // cols
    page = Image.new('RGB', (cols * w, rows * h), (21, 19, 15))
    d = ImageDraw.Draw(page)
    for i, f in enumerate(fs):
        x, y = (i % cols) * w, (i // cols) * h
        page.paste(Image.open(f), (x, y))
        t = every / 2 + i * every
        d.rectangle((x, y, x + 62, y + 18), fill=(21, 19, 15))
        d.text((x + 4, y + 3), f'{int(t // 60)}:{int(t % 60):02d}', fill=(244, 236, 216))
    page.save(out, quality=84)
    for f in fs:
        f.unlink()
    tmp.rmdir()
    return len(fs)


def thumb(spec: dict, assets: Path, accent: str, out: Path) -> dict:
    """One 1280×720 thumbnail: the owner's picture re-framed on its subject, shaded on the type's side, the hook in The
    Weekly's head with its second plate, one word on the club's colour, a kicker — and the measure of how it reads at
    168×94 (thumbs.render.legibility, the engine's own rule). `spec`: {src, focus, zoom, side, lines, hot, kicker}."""
    from .vertical import hex_rgb
    acc = hex_rgb(accent)
    src = Image.open(assets / spec['src']).convert('RGB')
    w, h = src.size
    z = spec.get('zoom', 1.0)
    cw, ch = min(w, h * 16 / 9) / z, min(h, w * 9 / 16) / z
    fx, fy = spec.get('focus', (0.5, 0.5))
    x, y = min(max(fx * w - cw / 2, 0), w - cw), min(max(fy * h - ch / 2, 0), h - ch)
    pic = R.grade(src.resize((1280, 720), Image.LANCZOS, box=(x, y, x + cw, y + ch)))
    Bd = R.Board(1280, 720, pic.convert('RGBA'))
    side = spec.get('side', 'left')
    R.shade(Bd, side, 0.92, 0.66)
    x0 = 56 if side == 'left' else 1280 - 56
    yy = spec.get('top', 150)
    for i, ln in enumerate(spec['lines']):
        size = R.fit_size('ultra', spec.get('size', 150), ln, 700)
        hot = i == spec.get('hot')
        im, m = R.line(ln, 'ultra', size, (255, 255, 255) if hot else R.PAPER, shift=8, plate=R.INK)
        px = x0 if side == 'left' else x0 - im.width
        if hot:
            pl = R.plate(im.width + 44, im.height + 26, acc, shift=10, border=0)
            Bd.paste(pl, (px - 22, yy - 13))
        Bd.paste(im, (px, yy), m, 'headline', ln, (255, 255, 255) if hot else R.PAPER)
        yy += im.height + 30
    k, km = R.line(spec['kicker'], 'caps', 40, R.PAPER, track=1.5)
    Bd.paste(k, (x0 if side == 'left' else x0 - k.width, 640), km, 'kicker', spec['kicker'], R.PAPER)
    Bd.rgb().save(out, quality=92, optimize=True)
    leg = R.legibility(Bd)
    return {'file': out.name, 'size': [1280, 720], 'hook': ' '.join(spec['lines']), 'picture': spec['src'], 'legibility': leg}


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--film', required=True)
    ap.add_argument('--storyboard', required=True)
    ap.add_argument('--project', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--intro', type=float, default=0.0)
    ap.add_argument('--thumbs')
    a = ap.parse_args()
    sb, proj, out = json.loads(Path(a.storyboard).read_text()), Path(a.project), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    g = gate(Path(a.film), sb, proj, a.intro)
    (out / 'qa.txt').write_text(g['text'])
    print(g['text'])
    print(sheet(Path(a.film), out / 'contact-sheet.jpg'), 'frames on the contact sheet')
    if a.thumbs:
        rows = [thumb(t, proj / 'assets' / 'img', sb['palette']['us'], out / t['file']) for t in json.loads(Path(a.thumbs).read_text())]
        (out / 'thumbnails.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
        print([(r['file'], r['legibility']['ok'], [(x['px'], x['contrast']) for x in r['legibility']['lines']]) for r in rows])

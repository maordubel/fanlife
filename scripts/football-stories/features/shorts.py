"""FAN LIFE challenge Shorts (owner, 2.11.2026) — 1080×1920, ~20 s, one club, one challenge from its archive.

    python3 scripts/football-stories/features/shorts.py <week.json> <out dir> [index …]

Shape, every time: HOOK (crest + the club's own line, in its colours) → the CHALLENGE (the card, the options, a
5-second countdown — the comments answer here) → the REVEAL (the right one lights up in the club's colour, the
crowd goes) → the CALL (play the full round on FAN LIFE, follow for tomorrow's). Cut on the Football Stories studio
engine with the series narrator, the same voice as I WAS THERE, so the channel sounds like one place.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
MD = HERE.parent / 'matchday'
sys.path.insert(0, str(MD))
sys.path.insert(0, str(HERE.parent))
if '--reel' not in sys.argv:
    sys.argv.append('--reel')      # the studio modules are built 9:16 (film.py reads this before importing them)

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import film as F  # noqa: E402  (9:16 from here on)
import subscribe as SUB  # noqa: E402
from render import probe, read_audio, resample, run, write_wav  # noqa: E402
from studio.audio import CROWD, fx, score  # noqa: E402
from studio.captions import Captions  # noqa: E402
from studio.common import FPS, H, NEWSPRINT, PAPER, ROOT, W, Palette, hex_rgb  # noqa: E402
from studio.edit import cam_push, fit, pop, slam, slide_in  # noqa: E402
from studio.motion import Layer, Pose, Shot, ShotRenderer, blend_entry  # noqa: E402
from studio.paper import CANVAS, crumpled, halftone_overlay  # noqa: E402
from studio.sprites import SpriteFactory, key_of  # noqa: E402
from html import escape as esc  # noqa: E402

assert (W, H) == (1080, 1920), 'shorts are 9:16'
SR = F.SR
CW, CH = CANVAS
TOP = 300                     # the platform's own bar lives above this
LETTER = 'ABCD'
COUNT = 5
KIND_LABEL = {'quiz': 'Fans only', 'whoami': 'Who am I?', 'score': 'Guess the score', 'order': 'In order', 'scorer': 'Who scored?',
              'tf': 'True or false?', 'decade': 'Which decade?'}


def tinted(seed: int, hexcol: str, dark: float = 0.55) -> Image.Image:
    """Crumpled paper dyed in the club's colour and pressed dark, so cream type sits on it."""
    base = np.asarray(crumpled(seed, CANVAS, NEWSPRINT).convert('RGB'), 'float32') / 255
    col = np.array(hex_rgb(hexcol), 'float32') / 255
    out = base * col * (1 - dark) + base * col * 0.35 * dark
    return halftone_overlay(Image.fromarray(np.clip(out * 255, 0, 255).astype('uint8')), cell=9, strength=0.10).convert('RGB')


def light(hexcol: str) -> bool:
    r, g, b = hex_rgb(hexcol)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55


def hook_card(sp, key: str, text: str, kicker: str):
    """The hook, big: cream capitals printed twice, the second plate in the club's colour."""
    body = (f'<div style="width:960px;padding:10px 24px 20px 10px"><div class="caps" style="font-size:34px;color:var(--paper);opacity:.75;padding-bottom:14px">{esc(kicker)}</div>'
            f'<div class="head" style="font-size:122px;line-height:.94;color:var(--paper);text-shadow:9px 9px 0 var(--ink)">{esc(text)}</div></div>')
    return F.cropped(sp.render(f'hook-{key}', body, extra_css='.s{padding:0 20px 20px 0}'))


def clue_card(sp, key: str, n: int, label: str, value: str):
    body = (f'<div class="sh" style="inset:10px 0 0 10px"></div><div class="box" style="width:900px;display:grid;grid-template-columns:90px 1fr;border-width:5px">'
            f'<div class="goal" style="background:var(--accent);color:var(--paper);display:grid;place-items:center;font-size:64px;border-right:5px solid var(--ink)">{n}</div>'
            f'<div style="padding:14px 22px 16px"><div class="caps" style="font-size:24px;color:var(--accent)">{esc(label)}</div>'
            f'<div class="head" style="font-size:46px;line-height:1.02;text-transform:none;padding-top:6px">{esc(value)}</div></div></div>')
    return F.cropped(sp.render(f'clue-{key}', body, extra_css='.s{padding:0 14px 14px 0}'))


def count_disc(sp, n: int):
    body = (f'<div style="width:250px;height:250px;border-radius:50%;background:var(--ink);border:10px solid var(--accent);display:grid;place-items:center;'
            f'box-shadow:12px 12px 0 var(--accent)"><div class="goal" style="font-size:180px;line-height:1;color:var(--paper)">{n}</div></div>')
    return F.cropped(sp.render(f'count-{n}', body, extra_css='.s{padding:0 20px 20px 0}'))


def paper_world(seed: int) -> Image.Image:
    return halftone_overlay(crumpled(seed, CANVAS, NEWSPRINT), cell=8, strength=0.08).convert('RGB')


def sentence(s: str) -> str:
    s = s.strip()
    return s if s.endswith(('.', '?', '!')) else s + '.'


def build(s: dict, idx: int, out: Path) -> dict:
    work = out / f'work-{idx}'
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    pal = Palette('fl', 'FAN LIFE', s['primary'], PAPER, [])
    crest_p = ROOT / 'public' / 'crests' / f"{s['club']}.png"
    kind = s['kind']
    reveal_voice = {'order': 'Here is the order.', 'tf': f"It's {s['answer'].lower()}."}.get(kind, f"It's {s['answer']}.")
    expl = sentence(s['explanation']) if kind == 'tf' and s.get('explanation') else ''   # a false claim is corrected out loud
    ask = SUB.pick('reel_voice', idx + 1)
    lines = {
        'hook': sentence(s['hook']),
        'ask': sentence(s['prompt']) if kind != 'whoami' else 'Who am I?',
        'reveal': (reveal_voice + ' ' + expl).strip(),
        'call': f"Full round on FAN LIFE. {ask}",
    }
    voice = {}
    for k, text in lines.items():
        wav = work / f'v-{k}.wav'
        d, words = F.voice_beat(text, {}, wav)
        voice[k] = (wav, d, words)

    beats = []   # (name, dur, voice key, voice offset)
    beats.append(('hook', max(2.6, voice['hook'][1] + 0.9), 'hook', 0.45))
    clue_t = []
    if kind == 'whoami':
        n = len(s['clues'])
        ask_d = max(voice['ask'][1] + 0.6, 1.4 * n + 1.2)
        clue_t = [0.9 + 1.4 * i for i in range(n)]
    else:
        ask_d = voice['ask'][1] + 1.4
    beats.append(('ask', ask_d, 'ask', 0.35))
    beats.append(('count', COUNT + 0.3, None, 0))
    beats.append(('reveal', max(3.0, voice['reveal'][1] + 1.2), 'reveal', 0.5))
    beats.append(('call', max(3.8, voice['call'][1] + 0.9), 'call', 0.4))

    files, cues_all, t = [], [], 0.0
    plan = []
    for name, dur, vk, off in beats:
        frames = round(dur * FPS)
        plan.append({'name': name, 'start': t, 'dur': frames / FPS, 'frames': frames, 'vk': vk, 'voice_at': t + off})
        t += frames / FPS
    total = t

    with SpriteFactory(pal, work / 'sprites') as sp:
        crest = F.img(crest_p).resize((440, 440), Image.LANCZOS) if crest_p.exists() else None
        badge = F.img(ROOT / 'public/brand/fanlife/logo-512.png').resize((150, 150), Image.LANCZOS)
        heading = f"{s['clubName']} · {KIND_LABEL.get(kind, 'Challenge')}"
        card = None
        if kind != 'whoami':
            card = fit(F.cropped(sp.fact(key_of('card', s['qid'] if s.get('qid') else s['prompt']), heading, s['prompt'] if kind != 'order' else 'Oldest first — put them in order.', None)), W - 90, 720)
        opts = s.get('options') or s.get('items') or []
        chip = lambda i, o, tone: fit(F.cropped(sp.label(key_of('opt', idx, i, tone), f"{LETTER[i]}   {o}", tone, 64 if len(o) < 12 else 50 if len(o) < 26 else 40)), W - 130, 160)
        chips_paper = [chip(i, o, 'paper') for i, o in enumerate(opts)]
        right = []
        if kind == 'order':
            right = s['order']
        elif opts:
            right = [opts.index(s['answer'])]
        chips_acc = {i: chip(i, opts[i], 'accent') for i in right} if kind != 'order' else {}
        card_h = card.height if card else 0
        gap = 26
        block = card_h + (70 if card else 0) + sum(c.height for c in chips_paper) + gap * max(0, len(chips_paper) - 1)
        top0 = TOP + 40 + max(0, (H - 470 - TOP - 40 - block) / 2)     # the challenge sits in the middle of the free glass
        card_y = top0 + card_h / 2
        y0 = (card_y + card_h / 2 + 70) if card else TOP + 420
        ys = []
        y = y0
        for c in chips_paper:
            ys.append(y + c.height / 2)
            y += c.height + gap
        prev_last = None
        acc = hex_rgb(s['primary'])
        for bi, b in enumerate(plan):
            layers, cues, shake = [], [], []
            name, dur = b['name'], b['dur']
            entry = 'cut'
            cam = cam_push(1.0, 1.04, 0, -10, dur)
            if name == 'hook':
                world = tinted(idx * 7 + 1, '#2A2620' if light(s['primary']) else s['primary'], 0.5)
                if crest:
                    layers.append(Layer(crest, slam(W / 2, TOP + 300, 0.15, s0=1.6, rot=-4), settle=1e9))
                    shake.append((0.15, 12))
                head = fit(hook_card(sp, key_of('hook', idx), s['hook'], f"FAN LIFE · {KIND_LABEL.get(kind, '')}"), W - 90, 760)
                layers.append(Layer(head, slide_in(W / 2, TOP + 560 + head.height / 2, 0.45, frm=(0, 500), rot0=-3, rot1=-1.5, dur=0.5, drift=False), settle=1e9))
                cues += [(0.15, 'stamp'), (0.45, 'whoosh')]
                entry = 'black'
            else:
                world = paper_world(idx * 7 + bi)
                if name == 'call':
                    follow = SUB.ART / 'reel-follow.jpg'
                    world, cam = (F.glass(follow), F.still) if follow.exists() else (tinted(idx * 7 + 5, s['primary']), cam)
            if name in ('ask', 'count', 'reveal'):
                # the challenge stays on screen through the countdown and the reveal
                fresh = name == 'ask'
                if card:
                    layers.append(Layer(card, slam(W / 2, card_y, 0.1, s0=1.3, rot=-1) if fresh else (lambda t, y=card_y: Pose(W / 2, y, 1, -1, 1)), settle=1e9))
                if kind == 'whoami':
                    cl = s['clues']
                    yy = TOP + 120
                    for i, c in enumerate(cl):
                        im = fit(clue_card(sp, key_of('clue', idx, i), i + 1, c['label'], c['value']), W - 110, 230)
                        y_c = yy + im.height / 2
                        tc = clue_t[i] if fresh else -1
                        layers.append(Layer(im, slide_in(W / 2, y_c, tc, frm=(-900, 0), rot0=0, rot1=(-1, 1)[i % 2] * 0.8, dur=0.45, drift=False) if fresh else (lambda t, y=y_c, r=(-1, 1)[i % 2] * 0.8: Pose(W / 2, y, 1, r, 1)), settle=1e9))
                        if fresh:
                            cues.append((tc, 'paper'))
                        yy += im.height + 22
                elif not (name == 'reveal' and kind == 'order'):   # the order is re-dealt as the answer instead
                    for i, (c, y_) in enumerate(zip(chips_paper, ys)):
                        if name == 'reveal' and kind != 'order':
                            if i in chips_acc:
                                layers.append(Layer(chips_acc[i], slam(W / 2, y_, 0.2, s0=1.25, rot=-1.5), settle=1e9))
                            else:
                                layers.append(Layer(c, lambda t, y=y_: Pose(W / 2, y, 1, 0, 0.32), settle=1e9))
                            continue
                        if fresh:
                            ti = max(0.6, b['dur'] - 1.0 - 0.3 * (len(chips_paper) - i))
                            layers.append(Layer(c, pop(W / 2, y_, ti, rot=(-1.2, 1, -0.8, 1.2)[i]), settle=1e9))
                            cues.append((ti, 'pop'))
                        else:
                            layers.append(Layer(c, lambda t, y=y_, r=(-1.2, 1, -0.8, 1.2)[i]: Pose(W / 2, y, 1, r, 1), settle=1e9))
            if name == 'count':
                cx, cy = (W - 140, card_y - card_h / 2 - 30) if card else (W - 150, H - 640)   # on the card's top corner, clear of its words
                for n in range(COUNT):
                    num = count_disc(sp, COUNT - n)
                    t0, t1 = 0.15 + n, 1.1 + n
                    layers.append(Layer(num, SUB.until(pop(cx, cy, t0, dur=0.25, rot=(-8, 6)[n % 2]), t1 - 0.02, 0.05), settle=1e9))
                    cues.append((t0, 'pop'))
                cues.append((0.1, 'crowd-build'))
                low = fit(F.cropped(sp.label(key_of('comment', idx), 'Answer in the comments', 'ink', 40)), W - 360, 110)
                layers.append(Layer(low, slide_in(W / 2, H - 450, 0.3, frm=(-700, 0), rot0=0, rot1=-1, dur=0.4, drift=False), settle=1e9))
            if name == 'reveal' and kind == 'tf' and s.get('explanation'):
                ex = fit(F.cropped(sp.caption(key_of('ex', idx), s['explanation'])), W - 110, 200)
                layers.append(Layer(ex, slide_in(W / 2, ys[-1] + 190 if ys else H * 0.6, 0.6, frm=(0, 300), rot0=0, rot1=-1, dur=0.4, drift=False), settle=1e9))
            if name == 'reveal':
                cues += [(0.2, 'stamp'), (0.25, 'crowd-goal')]
                shake.append((0.2, 10))
                if kind == 'whoami' or kind == 'order':
                    txt = s['answer'] if kind == 'whoami' else '\n'.join(f'{y}  {it}' for y, it in zip(s['years'], [s['items'][j] for j in s['order']]))
                    if kind == 'whoami':
                        ans = fit(F.cropped(sp.label(key_of('ans', idx), s['answer'], 'accent', 84)), W - 100, 220)
                        layers.append(Layer(ans, slam(W / 2, H - 620, 0.2, s0=1.5, rot=-2), settle=1e9))
                    else:
                        yy = y0 if card else TOP + 420
                        for j, (yr, it) in enumerate(zip(s['years'], [s['items'][k] for k in s['order']])):
                            im = fit(F.cropped(sp.label(key_of('ord', idx, j), f"{yr}   {it}", 'accent' if j == 0 else 'paper', 44)), W - 120, 140)
                            layers.append(Layer(im, pop(W / 2, yy + im.height / 2, 0.2 + 0.35 * j, rot=(-1, 1)[j % 2]), settle=1e9))
                            cues.append((0.2 + 0.35 * j, 'pop'))
                            yy += im.height + 22
            if name == 'call':
                layers.append(Layer(badge.resize((260, 260), Image.LANCZOS), slam(W / 2, TOP + 120, 0.2, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                head = fit(F.cropped(sp.cta_headline(key_of('call', idx), f"Play the full {s['clubName']} round", SUB.pick('reel_line', idx + 1))), W - 80, 300)
                layers.append(Layer(head, slide_in(W / 2, TOP + 400, 0.45, frm=(0, 500), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                url = fit(F.cropped(sp.url_banner(key_of('url', idx), 'fanlife.dubelteam.com', f"{s['clubName']} · trivia · games · the archive")), W - 80, 200)
                layers.append(Layer(url, slam(W / 2, TOP + 620, 1.2, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                cues += [(0.2, 'stamp'), (0.45, 'whoosh'), (1.2, 'stamp'), (0.0, 'end')]
            caps = None
            if False:   # Shorts carry their words as cards; a caption plate would repeat them and cover the options
                wav, d, words = voice[b['vk']]
                c = Captions(words, b['voice_at'] - b['start'], s['primary'])
                caps = (lambda c: (lambda tt: (lambda r: r and (r[0], r[1], r[2] - 470))(c(tt))))(c)
            shot = Shot(index=bi, duration=dur, world=world, camera=cam, layers=layers, entry=entry, shake=shake, cues=cues, overlay=caps)
            r = ShotRenderer(shot)
            target = work / f'shot-{bi}.mp4'
            proc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                     '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', str(target)], stdin=subprocess.PIPE)
            g0 = round(b['start'] * FPS)
            last = None
            for fi in range(b['frames']):
                fr = blend_entry(shot, fi, r.frame(fi, g0 + fi), prev_last, acc)
                proc.stdin.write(fr.tobytes())
                last = fr
            proc.stdin.close()
            if proc.wait():
                raise SystemExit(f'encode failed: short {idx} beat {name}')
            prev_last = last
            files.append(target)
            cues_all += [(b['start'] + ct, c) for ct, c in cues]

    (work / 'list.txt').write_text(''.join(f"file '{f}'\n" for f in files))
    picture = work / 'picture.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(picture)])

    # sound: the narrator, the studio's cues, the real crowd, a pulse under the countdown
    n = int(total * SR) + SR
    vo, sfx = np.zeros(n, np.float32), np.zeros(n, np.float32)
    rng = np.random.default_rng(idx)
    for b in plan:
        if b['vk']:
            a = read_audio(voice[b['vk']][0])
            i = int(b['voice_at'] * SR)
            vo[i:i + len(a)] += a[: n - i]
    for ct, kind_ in cues_all:
        i = int(ct * SR)
        if kind_.startswith('crowd'):
            pth = CROWD.get(kind_)
            if pth and pth.exists():
                a = read_audio(pth)[: int(5 * SR)]
                a *= np.minimum(1, np.arange(len(a))[::-1] / (1.2 * SR))
                sfx[i:i + len(a)] += a[: n - i] * 0.35
            continue
        a = resample(fx(kind_, rng), 32000, SR)
        sfx[i:i + len(a)] += a[: n - i] * 0.55
    secs = [{'start': b['start'], 'end': b['start'] + b['dur'], 'mood': {'hook': 'tense', 'ask': 'tense', 'count': 'tense', 'reveal': 'major', 'call': 'major'}[b['name']],
             'energy': {'hook': 0.6, 'ask': 0.45, 'count': 0.8, 'reveal': 0.7, 'call': 0.5}[b['name']]} for b in plan]
    mus = resample(score(secs, seed=idx + 3), 32000, SR)[:n]
    mus = np.pad(mus, (0, n - len(mus)))
    for nm, arr in (('vo', vo), ('sfx', sfx), ('mus', mus)):
        write_wav(work / f'{nm}.wav', arr[: int(total * SR)])
    mix = work / 'mix.wav'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(work / 'vo.wav'), '-i', str(work / 'sfx.wav'), '-i', str(work / 'mus.wav'), '-filter_complex',
         '[2:a]volume=0.55[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=7:attack=25:release=380[md];'
         '[0:a]highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120,volume=1.15[v];[1:a]volume=0.85[s];'
         f'[v][md][s]amix=inputs=3:normalize=0,afade=t=out:st={total - 0.8:.2f}:d=0.8,loudnorm=I=-14:TP=-1.5:LRA=11[a]', '-map', '[a]', '-ar', str(SR), '-ac', '2', str(mix)])
    name = f"fl-{s['day'].lower()}-{s['kind']}-{s['club']}"
    pub = out / f'{name}.mp4'
    for crf in (23, 25, 27, 29):      # ≤ 45 MB, so the Telegram bot can hand it over
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(mix), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', '-movflags', '+faststart', '-shortest', str(pub)])
        if pub.stat().st_size <= 45 * 1048576:
            break
    for k, frac in enumerate((0.08, 0.3, 0.55, 0.75, 0.93)):
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{total * frac:.2f}', '-i', str(pub), '-frames:v', '1', '-vf', 'scale=360:-2', str(out / f'{name}-frame-{k}.jpg')])
    shutil.rmtree(work)
    mb = round(pub.stat().st_size / 1048576, 1)
    print(f'{name}: {total:.1f}s, {mb} MB', flush=True)
    return {'file': pub.name, 'seconds': round(total, 1), 'mb': mb}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    week = json.loads(Path(args[0]).read_text())
    out = Path(args[1])
    out.mkdir(parents=True, exist_ok=True)
    only = {int(x) for x in args[2:]}
    report = {}
    for i, s in enumerate(week['shorts']):
        if only and i not in only:
            continue
        report[i] = build(s, i, out)
    (out / 'shorts-report.json').write_text(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()

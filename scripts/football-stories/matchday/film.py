"""I WAS THERE — the film, cut on the Football Stories studio's own engine (PR #353), so the two series share one
craft: the studio's camera (a slow push on a canvas larger than the frame), its motion (slide-in, slam, pop, shake),
its transitions (black, fade, the diagonal accent wipe), its grain, its cards (SpriteFactory), its map, its sound
effects and its word-by-word burned captions. What is ours: the world is the owner's footage (tone-mapped once,
played as a moving world), a vertical clip is taped onto newsprint, every clip carries the camera's own clock as a
diary stamp, and the crowd that was recorded that night is the bed under everything.

    python3 scripts/football-stories/matchday/film.py <episode.json> <footage root> <out dir>

An episode's `film.beats` is the edit: each beat is one shot. A beat with narration lasts lead + voice + tail (the
studio's rule), so voice, picture and captions cannot drift; a silent beat says its own length.
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))

from render import (SERIES, TONE, GRADE, is_hdr, orient, phonemes, probe, read_audio, resample, run, speech_in,  # noqa: E402
                    write_wav, kokoro)
# A REEL is the same edit stood up: 1080×1920. The studio's modules read the frame size when they are imported, so
# the size is set on studio.common first and every module after it is built for 9:16.
CUT = 'reel' if '--reel' in sys.argv else 'film'
import studio.common as _sc  # noqa: E402
if CUT == 'reel':
    _sc.W, _sc.H = 1080, 1920
from studio.audio import CROWD, fx, score  # noqa: E402
import studio.captions as _caps  # noqa: E402
if CUT == 'reel':   # phone captions: bigger, shorter lines, above the platform's own buttons
    _caps.MAX_CHARS = 16
    _face_cls = _caps.Face
    _caps.font = lambda name='weekly-head', size=78: _face_cls(name, size)
from studio.captions import Captions  # noqa: E402
from studio.common import FPS, H, INK, NEWSPRINT, PAPER, ROOT, W, Palette, hex_rgb  # noqa: E402
from studio.edit import cam_push, fit, pop, slam, slide_in, tape  # noqa: E402
from studio.maps import pin_sprite  # noqa: E402
from studio.maps import render as render_map  # noqa: E402
from studio.motion import Layer, Pose, Shot, ShotRenderer, blend_entry, ease_in_out, ease_out_cubic  # noqa: E402
from studio.paper import CANVAS, ClipWorld, crumpled, halftone_overlay  # noqa: E402
from studio.sprites import SpriteFactory, key_of  # noqa: E402

SR = 48000
LEAD, TAIL, FIRST_LEAD = 0.45, 0.6, 1.0
CW, CH = CANVAS
WIN_H = 940                       # a vertical clip's height on the newsprint
FEATURES = (('Trivia', 'brand/weekly/plates/cheer-line.webp'), ('Timeline', 'brand/magazine/photos/memorabilia.webp'),
            ('Shirt game', 'brand/magazine/photos/striped-shirt.webp'), ('Royal Rumble', 'brand/weekly/plates/kicker-line.webp'),
            ('Legends Manager', 'legends/brand/logo-512.webp'), ('LIFE', 'brand/weekly/plates/fatherson-line.webp'))


def img(p) -> Image.Image:
    return Image.open(p).convert('RGBA')


def cropped(p: Path) -> Image.Image:
    im = img(p)
    box = im.getchannel('A').getbbox()
    return im.crop(box) if box else im


# ── narration: one file per beat, sentences synthesised one by one so their timing is exact ─────────────────────────
def voice_beat(text: str, ipa: dict, out: Path) -> tuple[float, list[dict]]:
    v = SERIES['voice']
    k = kokoro()
    sents = [s for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s]
    parts, words, t = [], [], 0.0
    gap = np.zeros(int(0.28 * SR), np.float32)
    for si, s in enumerate(sents):
        a, sr = k.create(phonemes(s, ipa, v['lang']), voice=v['voice'], speed=v['speed'], lang=v['lang'], is_phonemes=True)
        a = resample(np.asarray(a, np.float32), sr, SR)
        d = len(a) / SR
        ws = s.split()
        weights = [len(re.sub(r'\W', '', w)) + 2 for w in ws]
        tot = sum(weights)
        tw = t
        for w, wt in zip(ws, weights):
            dw = d * wt / tot
            words.append({'w': w, 'start': round(tw, 3), 'end': round(tw + dw, 3)})
            tw += dw
        parts.append(a)
        t += d
        if si < len(sents) - 1:
            parts.append(gap)
            t += len(gap) / SR
    audio = np.concatenate(parts)
    write_wav(out, audio)
    return len(audio) / SR, align(out, words)


def align(wav: Path, words: list[dict]) -> list[dict]:
    """The captions follow the voice word by word: Whisper's own word timings on the synthesised narration, our
    spelling kept. When the counts disagree the length estimate stands (it is never worse than a sentence off)."""
    try:
        import render
        from faster_whisper import WhisperModel
    except ImportError:
        return words
    if render._W is None:
        render._W = WhisperModel('small', device='cpu', compute_type='int8')
    segs, _ = render._W.transcribe(str(wav), word_timestamps=True, beam_size=1, language='en')
    heard = [w for sg in segs for w in (sg.words or [])]
    if len(heard) != len(words):
        return words
    return [{'w': ours['w'], 'start': round(h.start, 3), 'end': round(max(h.end, h.start + 0.08), 3)} for ours, h in zip(words, heard)]


# ── footage → an SDR clip the studio's ClipWorld can play ───────────────────────────────────────────────────────────
def prepare(src: Path, meta: dict, start: float, length: float, speed: float, size: tuple[int, int], out: Path) -> Path:
    w, h = size
    hdr = is_hdr(meta)
    vf = (f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},' + (TONE if hdr else 'format=yuv420p') +
          f',{GRADE},setpts=PTS/{speed},fps={FPS}')
    run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{start:.3f}', '-t', f'{length * speed + 0.2:.3f}', '-i', str(src), '-an',
         '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-pix_fmt', 'yuv420p', str(out)])
    return out


class PaperWorld:
    """A vertical clip taped onto crumpled newsprint, playing: the studio's paper collage with a moving picture in it."""

    def __init__(self, clip: Path, size: tuple[int, int], seed: int, at: tuple[int, int]):
        self.cw = ClipWorld(clip, size=size, fps=FPS)
        base = halftone_overlay(crumpled(seed, CANVAS, NEWSPRINT), cell=8, strength=0.08).convert('RGB')
        self.x, self.y = at
        d = ImageDraw.Draw(base)
        w, h = size
        d.rectangle([self.x + 22, self.y + 22, self.x + w + 22, self.y + h + 22], fill=hex_rgb(INK))   # offset print block
        d.rectangle([self.x - 10, self.y - 10, self.x + w + 10, self.y + h + 10], fill=hex_rgb(INK))
        self.base = base
        self.tapes = [(tape(seed).rotate(-28, expand=True, resample=Image.BICUBIC), (self.x - 70, self.y - 40)),
                      (tape(seed + 1).rotate(26, expand=True, resample=Image.BICUBIC), (self.x + w - 90, self.y - 40))]

    def __call__(self, i: int) -> Image.Image:
        fr = self.cw(i)
        im = self.base.copy()
        im.paste(fr, (self.x, self.y))
        for t, p in self.tapes:
            im.paste(t, p, t)
        return im


def cam_for(seed: int, dur: float, strong: bool = False) -> callable:
    d = [(1.0, 1.07, 40, -16), (1.07, 1.0, -40, 16), (1.02, 1.09, -56, 0), (1.08, 1.01, 30, 20)][seed % 4]
    if strong:
        d = (1.0, 1.12, d[2], d[3])
    return cam_push(d[0], d[1], d[2], d[3], dur)


# ── the edit ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    ep_path, footage, out_root = Path(args[0]), Path(args[1]), Path(args[2])
    ep = json.loads(ep_path.read_text())
    out = out_root / CUT
    tall = CUT == 'reel'
    top = 290 if tall else 120      # the reel keeps clear of the platform's top bar
    work = out / 'work'
    keep = bool(os.environ.get('FILM_KEEP'))      # local iteration: reuse shots already cut
    if not keep:
        shutil.rmtree(out, ignore_errors=True)
    work.mkdir(parents=True, exist_ok=True)
    folder = footage / ep['folder']
    fx_ = ep['fixture']
    pal = Palette('iwt', 'I WAS THERE', ep['accent'], PAPER, [])
    beats = ep[CUT]['beats']
    report = {'episode': ep['id'], 'cut': 'film', 'voice': SERIES['voice'], 'beats': [], 'speech': {}}

    # 1 · narration and the timeline (the studio's rule: lead + voice + tail)
    t = 0.0
    plan = []
    for i, b in enumerate(beats):
        p = {**b, 'n': i, 'start': round(t * FPS) / FPS}
        if b.get('say'):
            wav = work / f'voice-{i:02d}.wav'
            d, words = voice_beat(b['say'], ep.get('ipa', {}), wav)
            lead = b.get('lead', FIRST_LEAD if not any(x.get('say') for x in plan) else LEAD)
            p.update(voice=wav, voice_dur=d, words=words, voice_at=p['start'] + lead)
            dur = max(lead + d + b.get('tail', TAIL), b.get('min', 0))
        else:
            dur = b['dur']
        p['frames'] = round(dur * FPS)
        p['dur'] = p['frames'] / FPS
        t = p['start'] + p['dur']
        plan.append(p)
    total = t

    # 2 · pictures
    sp_dir = work / 'sprites'
    files, all_cues = [], []
    prev_last = None
    sf = {'home': fx_['home'], 'away': fx_['away'], 'competition': fx_['competition'], 'date': fx_['date_iso'],
          'score_home': fx_['home_score'], 'score_away': fx_['away_score'], 'stage': None}
    with SpriteFactory(pal, sp_dir) as sp:
        ticket = cropped(sp.ticket(key_of(ep['id'], 'ticket'), sf))
        for p in plan:
            kind = p.get('kind', 'clip')
            dur = p['dur']
            seed = 1000 + p['n'] * 7
            k = key_of(ep['id'], p['n'], kind)
            layers: list[Layer] = []
            cues: list[tuple[float, str]] = []
            shake: list[tuple[float, float]] = []
            entry = p.get('entry', 'cut')
            cam = cam_for(seed, dur)
            world_frames = None
            src = folder / p['clip'] if p.get('clip') else None
            meta = probe(src) if src else None

            if kind in ('clip', 'title', 'score', 'ticket', 'hook'):
                vw, vh = orient(meta)
                speed = float(p.get('speed', 1.0))
                left = float(meta['format']['duration']) - p.get('in', 0) - 0.1
                if dur * speed > left:      # slow it rather than hold a frozen last frame
                    speed = max(0.55, left / dur)
                p['speed_used'] = round(speed, 3)
                if tall and vw > vh:   # wide footage in a reel: a landscape window on newsprint, headline above
                    ww = CW - 110
                    wh = round(ww * vh / vw)
                    at = (int((CW - ww) / 2), int(CH * 0.52 - wh / 2))
                    corner = (at[0], at[1] + wh)        # the clock goes on the photo's corner, not on the glass
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, (ww, wh), work / f'clip-{p["n"]:02d}.mp4')
                    world_frames = PaperWorld(clip, (ww, wh), seed, at)
                    if p.get('head'):
                        hd = fit(cropped(sp.turning(key_of(k, 'turn'), p['head'], p.get('kicker', ''))), W - 230, 360)
                        layers.append(Layer(hd, slide_in(CW / 2, at[1] - hd.height / 2 - 40, 0.3, frm=(0, -520), rot0=-2, rot1=-1,
                                                          dur=0.5, drift=False), settle=1e9, space='world'))
                        cues.append((0.3, 'paper'))
                elif not tall and vh > vw:   # vertical footage in the film, taped onto newsprint
                    ww = round(WIN_H * vw / vh)
                    at = (int(CW * 0.30 - ww / 2), int((CH - WIN_H) / 2))
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, (ww, WIN_H), work / f'clip-{p["n"]:02d}.mp4')
                    world_frames = PaperWorld(clip, (ww, WIN_H), seed, at)
                    side_x = CW * 0.30 + ww / 2 + 90
                    if p.get('head'):   # the story's side of the page, next to the taped clip
                        hd = fit(cropped(sp.turning(key_of(k, 'turn'), p['head'], p.get('kicker', ''))), 880, 420)
                        layers.append(Layer(hd, slide_in(side_x + hd.width / 2, CH * 0.42, 0.45, frm=(760, 0), rot0=2.5, rot1=-1,
                                                          dur=0.55, drift=False), settle=1e9, space='world'))
                        cues.append((0.45, 'paper'))
                else:
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, CANVAS, work / f'clip-{p["n"]:02d}.mp4')
                    world_frames = ClipWorld(clip, dim=p.get('dim', 0.0), fps=FPS)
                world = world_frames(0)
                if p.get('clock'):     # the camera's own clock: the diary stamp
                    lab = fit(cropped(sp.label(key_of('clock', p['clock']), p['clock'], 'ink', 52 if tall else 46)), 400, 120)
                    if tall and vw > vh:
                        layers.append(Layer(lab, pop(corner[0] + 40 + lab.width / 2, corner[1] + 6, 0.35, rot=-3), settle=1e9, space='world'))
                    else:
                        layers.append(Layer(lab, pop(80 + lab.width / 2, top, 0.35, rot=-3), settle=1e9))
                    cues.append((0.35, 'pop'))
                if p.get('place'):
                    pl = fit(cropped(sp.caption(key_of('place', p['place']), p['place'])), W - 160, 120)
                    layers.append(Layer(pl, slide_in(80 + pl.width / 2, top + 108, 0.55, frm=(-700, 0), rot0=0, rot1=0, dur=0.45, drift=False), settle=1e9))
                    cues.append((0.55, 'paper'))
                if kind == 'title':
                    entry = 'black'
                    cam = cam_push(1.14, 1.0, 0, -24, dur)
                    ttl = fit(cropped(sp.open_title(key_of(k, 'title'), p['head'], p.get('kicker', ''))), 1500, 520)
                    layers.append(Layer(ttl, slam(W / 2, H * 0.42, 0.55, s0=1.4, rot=-1.5), settle=1e9))
                    st = fit(cropped(sp.stamp(key_of('date', fx_['date_short']), fx_['date_short'])), 280, 280)
                    layers.append(Layer(st, slam(W * 0.80, H * 0.70, 1.25, s0=1.9, rot=7, dur=0.22), settle=1e9))
                    shake += [(0.55, 10), (1.25, 7)]
                    cues += [(0.0, 'whoosh'), (0.55, 'stamp'), (1.25, 'stamp')]
                if kind == 'hook':      # the reel's first second: two lines slammed onto the loudest frame
                    entry = 'cut'
                    l1 = fit(cropped(sp.label(key_of(k, 'h1'), p['hook'], 'paper', 92)), W - 120, 200)
                    l2 = fit(cropped(sp.label(key_of(k, 'h2'), p['accent_line'], 'accent', 92)), W - 120, 200)
                    layers.append(Layer(l1, slam(60 + l1.width / 2, top + 260, 0.1, s0=1.5, rot=-3), settle=1e9))
                    layers.append(Layer(l2, slam(90 + l2.width / 2, top + 260 + l1.height + 10, 0.55, s0=1.5, rot=-2), settle=1e9))
                    shake += [(0.1, 12), (0.55, 10)]
                    cues += [(0.1, 'stamp'), (0.55, 'stamp')]
                if kind == 'ticket':
                    tk = fit(ticket, 1200, 640)
                    layers.append(Layer(tk, slide_in(W * 0.62, H * 0.47, 0.5, frm=(0, 520), rot0=-6, rot1=-2, dur=0.7), settle=1e9))
                    cues += [(0.5, 'whoosh'), (1.15, 'paper')]
                if kind == 'score':
                    card = fit(cropped(sp.score(k, sf, fx_.get('score_note'))), W - 70, 700)
                    cx, cy = W / 2, H * (0.40 if tall else 0.44)
                    layers.append(Layer(card, slam(cx, cy, 0.3, rot=-1.0), settle=1e9))
                    shake.append((0.3, 10))
                    cues += [(0.3, 'stamp'), (0.45, 'crowd-after')]
                    gap, chips = 22, []
                    for g in fx_['goals']:
                        chips.append(fit(cropped(sp.label(key_of('scorer', g['name'], g['minute_label']), f"{g['name']}  {g['minute_label']}", 'paper', 34)),
                                         int((W - 140) / 2) if tall else 620, 76))
                    tw = sum(c.width for c in chips) + gap * (len(chips) - 1)
                    x = W / 2 - tw / 2
                    y = min(cy + card.height / 2 + 64, H - (520 if tall else 210))
                    for j, c in enumerate(chips):
                        ti = 1.0 + 0.35 * j
                        layers.append(Layer(c, pop(x + c.width / 2, y, ti, dur=0.35, rot=(-2, 1.5)[j % 2]), settle=1e9))
                        cues.append((ti, 'pop'))
                        x += c.width + gap
            elif kind == 'chapter':
                world = crumpled(seed % 9, CANVAS, NEWSPRINT).convert('RGB')
                card = fit(cropped(sp.chapter(k, int(p['number']), p['title'])), 1640, 460)
                layers.append(Layer(card, slam(W * 0.47, H * 0.48, 0.4, rot=-1.5), settle=1e9))
                st = fit(cropped(sp.stamp(key_of('date', fx_['date_short']), fx_['date_short'])), 300, 300)
                layers.append(Layer(st, slam(W * 0.82, H * 0.27, 0.95, s0=1.8, rot=6, dur=0.22), settle=1e9))
                shake += [(0.4, 9), (0.95, 6)]
                entry = 'wipe'
                cues += [(0.0, 'whoosh'), (0.4, 'stamp'), (0.95, 'stamp')]
            elif kind == 'map':
                pts = [{'name': m['name'], 'lat': m['lat'], 'lon': m['lon'], 'home': m.get('home', False)} for m in p['points']]
                # `frame` points widen the view (the whole country) without a pin of their own
                extra = [{'name': '', 'lat': a, 'lon': b, 'home': False, 'frame': True} for a, b in p.get('frame', [])]
                base, pins = render_map(pts + extra, p.get('focus', 'domestic'), seed % 9, p.get('highlight'))
                pins = [q for q in pins if not q.get('frame')]
                world = base
                t0, step = 0.6, 0.9
                for j, pin in enumerate(pins):
                    ti = t0 + j * step
                    layers.append(Layer(pin_sprite(ep['accent'], pin['home']), pop(pin['x'], pin['y'], ti), settle=ti + 0.4, space='world'))
                    lab = fit(cropped(sp.label(key_of('city', pin['name']), pin['name'].upper(), 'accent' if pin['home'] else 'ink', 34)), 560, 84)
                    lx = min(max(pin['x'] + lab.width / 2 + 40, lab.width / 2 + 10), CW - lab.width / 2 - 10)
                    layers.append(Layer(lab, pop(lx, pin['y'] - 46, ti + 0.15, rot=2 if j % 2 else -2), settle=ti + 0.6, space='world'))
                    cues.append((ti, 'pop'))
                if p.get('label'):
                    cap = fit(cropped(sp.caption(k, p['label'])), 1300, 130)
                    layers.append(Layer(cap, slide_in(cap.width / 2 + 90, 130, 0.3, frm=(-700, 0), rot0=0, rot1=0, dur=0.5, drift=False), settle=1e9))
                mx, my = sum(q['x'] for q in pins) / len(pins), sum(q['y'] for q in pins) / len(pins)
                cam = (lambda mx=mx, my=my, dur=dur: (lambda tt: (1.0 + 0.10 * ease_in_out(tt / dur), CW / 2 + (mx - CW / 2) * 0.5 * ease_in_out(tt / dur),
                                                                  CH / 2 + (my - CH / 2) * 0.5 * ease_in_out(tt / dur))))()
                entry = p.get('entry', 'fade')
            elif kind == 'end':
                world = crumpled(seed % 9, CANVAS, '#2A2620').convert('RGB')
                cam = cam_push(1.04, 1.0, 0, 0, dur)
                entry = 'wipe'
                badge = img(ROOT / 'public/brand/fanlife/logo-512.png').resize((300 if tall else 340,) * 2, Image.LANCZOS)
                if tall:
                    layers.append(Layer(badge, slam(W / 2, top + 210, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                    head = fit(cropped(sp.cta_headline('iwt-end', 'Were you there?', 'Stamp your ticket on FAN LIFE')), W - 90, 260)
                    layers.append(Layer(head, slide_in(W / 2, top + 520, 0.55, frm=(0, 500), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                    for j, (label, rel) in enumerate(FEATURES):
                        tile = fit(cropped(sp.feature_tile(key_of('tile', label), label, ROOT / 'public' / rel, 'accent' if j in (0, 4) else 'paper')), 300, 238)
                        ti = 1.2 + 0.22 * j
                        layers.append(Layer(tile, pop(200 + (j % 3) * 340, top + 820 + (j // 3) * 270, ti, dur=0.4, rot=(-3, 2, -1.5, 2.5, -2, 1)[j]), settle=1e9))
                        cues.append((ti, 'pop'))
                    url = fit(cropped(sp.url_banner('iwt-end', 'fanlife.dubelteam.com', 'Every match · trivia · games')), W - 80, 200)
                    layers.append(Layer(url, slam(W / 2, top + 1300, 3.0, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                    cues += [(0.25, 'stamp'), (0.55, 'whoosh'), (3.0, 'stamp'), (0.0, 'end')]
                else:
                    layers.append(Layer(badge, slam(290, 290, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                    head = fit(cropped(sp.cta_headline('iwt-end', 'Were you there?', 'Find the night in the archive · stamp your ticket')), 1250, 230)
                    layers.append(Layer(head, slide_in(540 + head.width / 2, 210, 0.55, frm=(900, 0), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                    cues += [(0.25, 'stamp'), (0.55, 'whoosh')]
                    x0, y0, dx, dy = 700, 455, 380, 262
                    for j, (label, rel) in enumerate(FEATURES):
                        tile = fit(cropped(sp.feature_tile(key_of('tile', label), label, ROOT / 'public' / rel, 'accent' if j in (0, 4) else 'paper')), 300, 238)
                        ti = 1.3 + 0.28 * j
                        layers.append(Layer(tile, pop(x0 + (j % 3) * dx, y0 + (j // 3) * dy, ti, dur=0.4, rot=(-3, 2, -1.5, 2.5, -2, 1)[j]), settle=1e9))
                        cues.append((ti, 'pop'))
                    url = fit(cropped(sp.url_banner('iwt-end', 'fanlife.dubelteam.com', 'Every match · trivia · games · the life of a supporter')), 1500, 200)
                    layers.append(Layer(url, slam(W / 2 - 40, H - 120, 3.6, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                    cues += [(3.6, 'stamp'), (0.0, 'end')]
                    srcs = 'Sources: ' + '; '.join((s.get('short') or s.get('title') or s.get('file')) for s in ep['sources'])
                    sm = fit(cropped(sp.small_print('iwt-end', srcs)), 1700, 40)
                    layers.append(Layer(sm, slide_in(W / 2, H - 22, 4.2, frm=(0, 60), rot0=0, rot1=0, dur=0.4, drift=False), settle=1e9))
            else:
                raise SystemExit(f'unknown beat kind {kind}')

            caps = None
            if p.get('words') and kind != 'end':
                caps = Captions(p['words'], p['voice_at'] - p['start'], ep['accent'])
                if tall:     # lift the plate to two-thirds down: the platform's own buttons live at the bottom
                    lift = 300 if (meta and orient(meta)[0] > orient(meta)[1]) else 470   # under a landscape window, clear of its clock
                    caps = (lambda c, d=lift: (lambda tt: (lambda r: r and (r[0], r[1], r[2] - d))(c(tt))))(caps)
            shot = Shot(index=p['n'], duration=dur, world=world, camera=cam, layers=layers, entry=entry, shake=shake,
                        cues=cues, meta={'kind': kind}, world_frames=world_frames, overlay=caps)
            target = work / f'shot-{p["n"]:02d}.mp4'
            if keep and target.exists():
                raw = subprocess.run(['ffmpeg', '-v', 'error', '-sseof', '-0.1', '-i', str(target), '-frames:v', '1', '-f', 'rawvideo',
                                      '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
                prev_last = np.frombuffer(raw[: W * H * 3], np.uint8).reshape(H, W, 3) if len(raw) >= W * H * 3 else prev_last
                files.append(target)
                all_cues += [(p['start'] + ct, c) for ct, c in cues]
                print(f"beat {p['n']:02d} {kind:8} kept", flush=True)
                continue
            r = ShotRenderer(shot)
            tmp = target.with_suffix('.part.mp4')
            proc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                                     '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p',
                                     '-g', str(FPS * 2), str(tmp)], stdin=subprocess.PIPE)
            g0 = round(p['start'] * FPS)
            last = None
            acc = hex_rgb(ep['accent'])
            for fi in range(p['frames']):
                fr = r.frame(fi, g0 + fi)
                fr = blend_entry(shot, fi, fr, prev_last, acc)
                proc.stdin.write(fr.tobytes())
                last = fr
            proc.stdin.close()
            if proc.wait() != 0:
                raise SystemExit(f'encode failed on beat {p["n"]}')
            tmp.rename(target)
            prev_last = last
            if isinstance(world_frames, ClipWorld):
                world_frames.close()
            elif isinstance(world_frames, PaperWorld):
                world_frames.cw.close()
            files.append(target)
            all_cues += [(p['start'] + ct, c) for ct, c in cues]
            report['beats'].append({'n': p['n'], 'kind': kind, 'clip': p.get('clip'), 'start': p['start'], 'dur': round(dur, 2),
                                    'say': p.get('say', '')})
            print(f"beat {p['n']:02d} {kind:8} {p.get('clip') or ''} {dur:.1f}s ✓", flush=True)

    lst = work / 'list.txt'
    lst.write_text(''.join(f"file '{x}'\n" for x in files))
    picture = work / 'picture.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(picture)])

    # 3 · sound: voice, the night's own crowd, the studio's score and effects
    n = int(total * SR) + SR
    voice = np.zeros(n, np.float32)
    amb = np.zeros(n, np.float32)
    sfx = np.zeros(n, np.float32)
    rng = np.random.default_rng(5)
    for p in plan:
        if p.get('voice'):
            a = read_audio(p['voice'])
            i = int(p['voice_at'] * SR)
            voice[i:i + len(a)] += a[: n - i]
        if p.get('clip') and p.get('sound', 'clip') != 'mute' and p.get('kind') != 'end':
            src = folder / p['clip']
            chk = speech_in(src, p.get('in', 0), p['dur'] * p.get('speed', 1.0))
            report['speech'][f"{p['n']:02d} {p['clip']}"] = chk
            if chk.get('speech'):
                continue
            a = read_audio(src, p.get('in', 0), p['dur'] * p.get('speed', 1.0))
            if p.get('speed', 1.0) != 1.0:
                a = resample(a, int(SR * p['speed']), SR)
            if len(a):
                a = a * 10 ** ((-20 - 20 * math.log10(max(1e-6, float(np.sqrt(np.mean(a ** 2)))))) / 20) * p.get('gain', 1.0)
                fl = min(int(0.25 * SR), len(a) // 3)
                env = np.ones(len(a), np.float32)
                env[:fl] = np.linspace(0, 1, fl)
                env[-fl:] = np.linspace(1, 0, fl)
                i = int(p['start'] * SR)
                seg = (a * env)[: n - i]
                amb[i:i + len(seg)] += seg
    for ct, kind in all_cues:
        i = int(ct * SR)
        if kind.startswith('crowd'):
            path = CROWD.get(kind)
            if path and path.exists():
                a = read_audio(path)[: int(4.5 * SR)]
                a *= np.minimum(1, np.arange(len(a))[::-1] / (1.2 * SR))
                sfx[i:i + len(a)] += a[: n - i] * 0.25
            continue
        a = resample(fx(kind, rng), 32000, SR)
        sfx[i:i + len(a)] += a[: n - i] * 0.5
    sections = [{'start': p['start'], 'end': p['start'] + p['dur'], **p['music']} for p in plan if p.get('music')]
    music = resample(score(sections), 32000, SR)[:n] if sections else np.zeros(n, np.float32)
    music = np.pad(music, (0, n - len(music)))
    for name, arr in (('voice', voice), ('amb', amb), ('music', music), ('sfx', sfx)):
        write_wav(work / f'{name}.wav', arr[: int(total * SR)])
    mix = work / 'mix.wav'
    g = ('[2:a]volume=0.5[m];[1:a]volume=0.9[am];[am][m]amix=inputs=2:normalize=0[bed];'
         '[bed][0:a]sidechaincompress=threshold=0.03:ratio=7:attack=25:release=420[bd];'
         '[0:a]highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120,volume=1.1[v];'
         '[3:a]volume=0.8[s];[v][bd][s]amix=inputs=3:normalize=0,afade=t=out:st=%.2f:d=1.5[a]' % (total - 1.6))
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(work / 'voice.wav'), '-i', str(work / 'amb.wav'), '-i', str(work / 'music.wav'),
         '-i', str(work / 'sfx.wav'), '-filter_complex', g, '-map', '[a]', '-ar', str(SR), str(mix)])
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(mix), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr).group(0))
    final_mix = work / 'mix-14.wav'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(mix), '-af',
         f"loudnorm=I=-13.6:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
         f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", '-ar', str(SR), '-ac', '2', str(final_mix)])

    # 4 · master (no metadata), captions file, chapters, description, thumbnail, preview, report
    name = f"{ep['id']}-{CUT}"
    master = out / f'{name}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(final_mix), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac',
         '-b:a', '256k', '-map_metadata', '-1', '-map_chapters', '-1', '-metadata', f"title={ep['title']}", '-movflags', '+faststart',
         '-shortest', str(master)])
    cues_srt, k = [], 1
    for p in plan:
        if not p.get('words'):
            continue
        from studio.captions import groups
        for gr in groups(p['words']):
            a_, b_ = p['voice_at'] + gr[0]['start'], p['voice_at'] + gr[-1]['end'] + 0.2
            cues_srt.append(f"{k}\n{ts(a_)} --> {ts(b_)}\n{' '.join(w['w'] for w in gr)}\n")
            k += 1
    (out / f'{name}.en.srt').write_text('\n'.join(cues_srt))
    if tall:
        (out / 'marketing.txt').write_text(ep['reel'].get('post', '').strip() + '\n')
    chapters = [('0:00', 'Cold open')] + [(mmss(p['start']), p['title']) for p in plan if p.get('kind') == 'chapter']
    desc = ep[CUT]['description'].strip() + '\n\n' + '\n'.join(f'{a} {b}' for a, b in chapters) + '\n\nSources\n' + \
        '\n'.join(f"· {s['short']}: {s.get('url') or s.get('file')}" for s in ep['sources']) + \
        '\n\nNarration is synthetic (Kokoro, Apache-2.0). Footage: FAN LIFE, from the stand. #FANLIFE #IWasThere'
    (out / 'youtube-description.txt').write_text(desc if not tall else ep['reel']['description'].strip() + '\n\n#Shorts #FANLIFE #IWasThere')
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k',
         '-map_metadata', '-1', '-movflags', '+faststart', str(out / f'{name}-preview.mp4')])
    # the file that is actually published: YouTube (and Telegram, for a reel) — under 95 MB so it travels through git,
    # under 49 MB for a reel so the bot can send it. Starts at CRF 19 and gives up quality two steps at a time.
    cap = (49 if tall else 95) * 1024 * 1024
    pub = out / f'{name}-publish.mp4'
    for crf in (19, 21, 23, 25, 27):
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-profile:v', 'high',
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', '-movflags', '+faststart', str(pub)])
        if pub.stat().st_size <= cap:
            break
    report['publish'] = {'file': pub.name, 'mb': round(pub.stat().st_size / 1048576, 1), 'crf': crf}
    th = ep[CUT].get('thumbnail')
    if th:
        frame = work / 'thumb-src.jpg'
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f"{th['at']:.2f}", '-i', str(master), '-frames:v', '1', str(frame)])
        with SpriteFactory(pal, sp_dir) as sp:
            tp = sp.thumbnail('iwt-thumb', th['text'], th['sub'], frame.as_uri())
        Image.open(tp).convert('RGB').resize((1280, 720)).save(out / 'thumbnail.jpg', quality=92)
    for kk, frac in enumerate((0.04, 0.16, 0.3, 0.45, 0.6, 0.72, 0.86, 0.96)):
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{total * frac:.2f}', '-i', str(master), '-frames:v', '1', '-vf', 'scale=960:-2',
             str(out / f'frame-{kk}.jpg')])
    lr = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(master), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    mm = probe(master)
    tags = dict(mm['format'].get('tags') or {})
    for st in mm['streams']:
        tags.update({f"{st['codec_type']}:{kx}": v for kx, v in (st.get('tags') or {}).items()})
    bad = [kx for kx in tags if any(x in kx.lower() for x in ('location', 'iso6709', 'make', 'model', 'creation'))]
    report.update({'duration': round(float(mm['format']['duration']), 2), 'planned': round(total, 2),
                   'lufs': float(re.findall(r'I:\s+(-?[\d.]+) LUFS', lr)[-1]), 'true_peak': float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', lr)[-1]),
                   'identifying_tags_left': bad, 'chapters': chapters})
    (out / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    if not keep:
        shutil.rmtree(work)
    print(json.dumps({x: report[x] for x in ('duration', 'lufs', 'true_peak', 'identifying_tags_left')}), flush=True)
    if bad:
        sys.exit(f'identifying tags left: {bad}')


def ts(t: float) -> str:
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s % 1) * 1000):03d}'


def mmss(t: float) -> str:
    return f'{int(t // 60)}:{int(t % 60):02d}'


if __name__ == '__main__':
    main()

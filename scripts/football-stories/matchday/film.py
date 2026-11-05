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
from PIL import Image, ImageDraw, ImageFilter

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
from studio.audio import music_track, narrator_fx, CROWD, fx, score, track_score, level_fx, speech_db, thin_cues  # noqa: E402
import studio.captions as _caps  # noqa: E402
import subscribe as SUB  # noqa: E402
import doc as D  # noqa: E402
import plays as PL  # noqa: E402
if CUT == 'reel':   # phone captions: bigger, shorter lines, above the platform's own buttons
    _caps.MAX_CHARS = 16
    _face_cls = _caps.Face
    _caps.font = lambda name='weekly-head', size=78: _face_cls(name, size)
from studio.captions import Captions  # noqa: E402
from studio.common import FPS, H, INK, NEWSPRINT, PAPER, ROOT, W, Palette, hex_rgb  # noqa: E402
from studio.edit import cam_push, fit, pop, slam, slide_in, tape  # noqa: E402
from studio.maps import pin_sprite  # noqa: E402
from studio.maps import render as render_map  # noqa: E402
from studio.motion import Layer, Pose, Shot, ShotRenderer, blend_entry, ease_in_out, ease_out_cubic  # noqa: E402,F401
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
PAUSE = {'…': 0.85, '...': 0.85, '—': 0.5, '.': 0.32, '?': 0.42, '!': 0.36}


def voice_beat(text: str, ipa: dict, out: Path, speed: float | None = None) -> tuple[float, list[dict]]:
    """One sentence at a time, so each pause is ours: a full stop breathes, an ellipsis holds (the documentary's
    silence before the next line), a dash is a half-beat. `speed` slows a heavy beat below the series' pace."""
    v = SERIES['voice']
    k = kokoro()
    sents = [s for s in re.split(r'(?<=[.!?…—])\s+', text.strip()) if s]
    parts, words, t = [], [], 0.0
    for si, s in enumerate(sents):
        spoken = s.rstrip('—').rstrip()
        tail = '...' if s.endswith('...') else (s[-1] if s[-1] in PAUSE else '.')
        gap = np.zeros(int(PAUSE[tail] * SR), np.float32)
        a, sr = k.create(phonemes(spoken.replace('…', '.'), ipa, v['lang']), voice=v['voice'], speed=speed or v['speed'],
                         lang=v['lang'], is_phonemes=True)
        a = resample(np.asarray(a, np.float32), sr, SR)
        d = len(a) / SR
        ws = [w for w in spoken.split() if w not in ('—', '–', '-')]
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
def prepare(src: Path, meta: dict, start: float, length: float, speed: float, size: tuple[int, int], out: Path,
            blur: list | None = None) -> Path:
    """`blur` = [[x, y, w, h], …] in fractions of the picture as it is seen: a number plate, text someone typed on the
    clip — smudged before anything else touches the frame."""
    w, h = size
    hdr = is_hdr(meta)
    pre = ''
    for k, (bx, by, bw, bh) in enumerate(blur or []):
        pre += (f'split[m{k}][c{k}];[c{k}]crop=iw*{bw}:ih*{bh}:iw*{bx}:ih*{by},boxblur=24:3[b{k}];'
                f'[m{k}][b{k}]overlay=main_w*{bx}:main_h*{by},')
    vf = (pre + f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},' + (TONE if hdr else 'format=yuv420p') +
          f',{GRADE},setpts=PTS/{speed},fps={FPS}')
    run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{start:.3f}', '-t', f'{length * speed + 0.2:.3f}', '-i', str(src), '-an',
         '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-pix_fmt', 'yuv420p', str(out)])
    return out


class PaperWorld:
    """A vertical clip taped onto crumpled newsprint, playing: the studio's paper collage with a moving picture in it."""

    def __init__(self, clip: Path, size: tuple[int, int], seed: int, at: tuple[int, int], tone: str = NEWSPRINT):
        self.cw = ClipWorld(clip, size=size, fps=FPS)
        base = halftone_overlay(crumpled(seed, CANVAS, tone), cell=8, strength=0.08).convert('RGB')
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


class FillWorld:
    """A vertical clip in a documentary: the same picture, blown up, blurred and darkened, fills the frame behind it,
    and the clip itself stands in the middle on a thin ink rule — the way a broadcast documentary carries phone footage.
    One decode: the background is cut from the window frame itself."""

    def __init__(self, clip: Path, size: tuple[int, int], at: tuple[int, int], dark: float = 0.42):
        self.cw = ClipWorld(clip, size=size, fps=FPS)
        self.x, self.y = at
        self.w, self.h = size
        self.dark = dark

    def __call__(self, i: int) -> Image.Image:
        fr = self.cw(i)
        w, h = fr.size
        ch = int(w * CH / CW)                                    # the 16:9 band through the middle of the picture
        band = fr.crop((0, (h - ch) // 2, w, (h - ch) // 2 + ch)).resize((CW // 10, CH // 10), Image.BILINEAR)
        band = band.filter(ImageFilter.GaussianBlur(3.2)).resize(CANVAS, Image.BICUBIC)
        a = np.asarray(band, 'float32') * self.dark + np.array(hex_rgb(INK), 'float32') * (1 - self.dark) * 0.35
        im = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB')
        d = ImageDraw.Draw(im)
        d.rectangle([self.x + 16, self.y + 16, self.x + w + 16, self.y + h + 16], fill=(8, 7, 6))    # its shadow, printed
        d.rectangle([self.x - 4, self.y - 4, self.x + w + 3, self.y + h + 3], fill=hex_rgb(INK))
        im.paste(fr, (self.x, self.y))
        return im


def glass(path: Path, fill=(16, 17, 17)) -> Image.Image:
    """A full-frame piece of art placed so the still camera shows it exactly, pixel for pixel: the end-screen zones
    YouTube's buttons sit on are measured on the art, so the art may not be scaled or pushed."""
    art = Image.open(path).convert('RGB')
    k = max(W / art.width, H / art.height)
    art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
    art = art.crop(((art.width - W) // 2, (art.height - H) // 2, (art.width - W) // 2 + W, (art.height - H) // 2 + H))
    world = Image.new('RGB', CANVAS, fill)
    world.paste(art, ((CW - W) // 2, (CH - H) // 2))
    return world


def still(t):
    return 1.0, CW / 2, CH / 2


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
    report = {'episode': ep['id'], 'cut': CUT, 'voice': SERIES['voice'], 'beats': [], 'speech': {}}
    epn = int(ep['fixture'].get('episode', 1))
    # RULES §8 · the subscribe call: the end beat's line gains the spoken ask; one silent clip after the first chapter
    # (or a beat marked `subscribe`) carries the stub
    beats = [dict(b) for b in beats]
    if beats and beats[-1].get('kind') == 'end':
        ask = SUB.pick('reel_voice' if tall else 'end_voice', epn)
        beats[-1]['say'] = (beats[-1].get('say', '') + ' ' + ask).strip()
    if not tall and (SUB.ART / 'endscreen-ground.jpg').exists() and not any(b.get('kind') == 'endscreen' for b in beats):
        beats.append({'kind': 'endscreen', 'dur': 20.0, 'music': {'mood': 'major', 'energy': 0.25}})
    stub_at = next((i for i, b in enumerate(beats) if b.get('subscribe')), None)
    if stub_at is None and not tall:
        seen = False
        for i, b in enumerate(beats):
            seen = seen or b.get('kind') == 'chapter'
            if seen and b.get('kind') == 'clip' and not b.get('say') and not b.get('head') and b.get('dur', 0) >= 4.5:
                stub_at = i
                break
    report['subscribe_stub_beat'] = stub_at

    # 1 · narration and the timeline (the studio's rule: lead + voice + tail)
    t = 0.0
    plan = []
    for i, b in enumerate(beats):
        p = {**b, 'n': i, 'start': round(t * FPS) / FPS}
        if b.get('say'):
            wav = work / f'voice-{i:02d}.wav'
            d, words = voice_beat(b['say'], ep.get('ipa', {}), wav, b.get('speed_voice'))
            lead = b.get('lead', FIRST_LEAD if not any(x.get('say') for x in plan) else LEAD)
            p.update(voice=wav, voice_dur=d, words=words, voice_at=p['start'] + lead)
            dur = max(lead + d + b.get('tail', TAIL), b.get('min', 0))
        else:
            dur = b['dur'] if 'dur' in b else b['min']
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
            if p.get('kitclip'):          # a studio stop-motion clip, in the club's colour
                src = D.kit_clip(p['kitclip'], p.get('tint', ep['accent']), work)
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
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, (ww, wh), work / f'clip-{p["n"]:02d}.mp4', blur=p.get('blur'))
                    world_frames = PaperWorld(clip, (ww, wh), seed, at, ep.get('look', {}).get('paper', NEWSPRINT))
                    if p.get('head'):
                        hd = fit(cropped(sp.turning(key_of(k, 'turn'), p['head'], p.get('kicker', ''))), W - 230, 360)
                        layers.append(Layer(hd, slide_in(CW / 2, at[1] - hd.height / 2 - 40, 0.3, frm=(0, -520), rot0=-2, rot1=-1,
                                                          dur=0.5, drift=False), settle=1e9, space='world'))
                        cues.append((0.3, 'paper'))
                elif not tall and vh > vw and not p.get('head') and ep.get('look', {}).get('vertical') == 'fill':
                    wh = int(H * 0.86)                     # a vertical clip, documentary-style: blurred fill behind it
                    ww = round(wh * vw / vh)
                    at = (int((CW - ww) / 2), int((CH - wh) / 2))
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, (ww, wh), work / f'clip-{p["n"]:02d}.mp4', blur=p.get('blur'))
                    world_frames = FillWorld(clip, (ww, wh), at)
                elif not tall and vh > vw:   # vertical footage in the film, taped onto newsprint
                    ww = round(WIN_H * vw / vh)
                    at = (int(CW * 0.30 - ww / 2), int((CH - WIN_H) / 2))
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, (ww, WIN_H), work / f'clip-{p["n"]:02d}.mp4', blur=p.get('blur'))
                    world_frames = PaperWorld(clip, (ww, WIN_H), seed, at, ep.get('look', {}).get('paper', NEWSPRINT))
                    side_x = CW * 0.30 + ww / 2 + 90
                    if p.get('head'):   # the story's side of the page, next to the taped clip
                        hd = fit(cropped(sp.turning(key_of(k, 'turn'), p['head'], p.get('kicker', ''))), 880, 420)
                        layers.append(Layer(hd, slide_in(side_x + hd.width / 2, CH * 0.42, 0.45, frm=(760, 0), rot0=2.5, rot1=-1,
                                                          dur=0.55, drift=False), settle=1e9, space='world'))
                        cues.append((0.45, 'paper'))
                else:
                    clip = prepare(src, meta, p.get('in', 0), dur, speed, CANVAS, work / f'clip-{p["n"]:02d}.mp4', blur=p.get('blur'))
                    world_frames = ClipWorld(clip, dim=p.get('dim', 0.0), fps=FPS)
                world = world_frames(0)
                if p.get('clock') and not p.get('doc') and not ep.get('look', {}).get('doc_clock'):     # the camera's own clock: the diary stamp
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
                world = crumpled(seed % 9, CANVAS, ep.get('look', {}).get('paper', NEWSPRINT)).convert('RGB')
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
                follow = SUB.ART / 'reel-follow.jpg'
                if tall and follow.exists():     # the terrace fills the lower half; the ask lives in the top 900 px
                    world, cam = glass(follow), still
                    layers.append(Layer(badge, slam(W / 2, top + 120, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                    head = fit(cropped(sp.cta_headline('iwt-end', 'Were you there?', SUB.pick('reel_line', epn))), W - 90, 260)
                    layers.append(Layer(head, slide_in(W / 2, top + 400, 0.55, frm=(0, 500), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                    url = fit(cropped(sp.url_banner('iwt-end', 'fanlife.dubelteam.com', 'Every match · trivia · games')), W - 80, 200)
                    layers.append(Layer(url, slam(W / 2, top + 600, 1.6, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                    cues += [(0.25, 'stamp'), (0.55, 'whoosh'), (1.6, 'stamp'), (0.0, 'end')]
                elif tall:
                    layers.append(Layer(badge, slam(W / 2, top + 210, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                    head = fit(cropped(sp.cta_headline('iwt-end', 'Were you there?', SUB.pick('reel_line', epn))), W - 90, 260)
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
                    head = fit(cropped(sp.cta_headline('iwt-end', 'Were you there?', SUB.pick('end_line', epn))), 1250, 230)
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
            elif kind == 'endscreen':     # YouTube's end screen sits on this: the zones are left empty on purpose
                world, cam, entry = glass(SUB.ART / 'endscreen-ground.jpg'), still, 'fade'
                badge = img(ROOT / 'public/brand/fanlife/logo-512.png').resize((150, 150), Image.LANCZOS)
                layers.append(Layer(badge, pop(110, 110, 0.3, rot=-6), settle=1e9))
                line = fit(cropped(sp.label('iwt-next', SUB.pick('endscreen_line', epn), 'paper', 44)), 1300, 110)
                layers.append(Layer(line, slide_in(210 + line.width / 2, 120, 0.5, frm=(0, -200), rot0=0, rot1=-1, dur=0.5, drift=False), settle=1e9))
                cues += [(0.0, 'crowd-murmur'), (0.5, 'paper')]
            elif kind in ('black', 'timeline', 'stat', 'prop'):     # the documentary's own cards: dark ground, typed / counted / drawn
                world = Image.new('RGB', CANVAS, (12, 11, 9))
                if p.get('backdrop'):          # a picture under the card, darkened (history, a scene)
                    from studio.paper import cover
                    bd = cover(D.art_image(p['backdrop'], p.get('tint', ep['accent']), 'RGB'), CANVAS)
                    world = Image.blend(world, bd, 1 - float(p.get('dim', 0.72)))
                cam = cam_push(1.0, 1.05, 0, 0, dur)
                entry = p.get('entry', 'black' if kind == 'black' else 'fade')
            elif kind == 'art':      # an owner illustration as a moving set: the picture pushes, its cut-outs drift over it
                from studio.paper import cover
                if p.get('photo'):       # or the owner's own still from the night (HEIC/JPG in the footage folder)
                    world = cover(D.photo(folder / p['photo'], p.get('crop')), CANVAS)
                else:
                    world = cover(D.art_image(p['art'], p.get('tint', ep['accent']), 'RGB'), CANVAS)
                if p.get('dim'):
                    world = Image.blend(world, Image.new('RGB', CANVAS, (8, 7, 6)), float(p['dim']))
                z = p.get('push', [1.0, 1.08])
                cam = cam_push(z[0], z[1], p.get('pan', [0, 0])[0], p.get('pan', [0, 0])[1], dur)
                for j, fg in enumerate(p.get('figures', [])):
                    fim = D.art_image(fg['art'], fg.get('tint', ep['accent']))
                    box = fim.getchannel('A').getbbox()
                    fim = fim.crop(box) if box else fim
                    hh = int(fg.get('h', 0.6) * H)
                    fim = fim.resize((max(1, int(fim.width * hh / fim.height)), hh), Image.LANCZOS)
                    if fg.get('flip'):
                        fim = fim.transpose(Image.FLIP_LEFT_RIGHT)
                    x0, y0 = fg.get('x', 0.5) * CW, fg.get('y', 0.6) * CH
                    dx, dy = fg.get('drift', [40, 0])
                    t_in = float(fg.get('at', 0.2 + 0.25 * j))
                    def fpose(tt, x0=x0, y0=y0, dx=dx, dy=dy, t_in=t_in, dur=dur, rise=fg.get('rise', 140)):
                        if tt < t_in:
                            return None
                        k = ease_out_cubic((tt - t_in) / 0.7)
                        u = (tt - t_in) / max(0.1, dur - t_in)
                        return Pose(x0 + dx * u, y0 + dy * u + rise * (1 - k), alpha=k)
                    layers.append(Layer(fim, fpose, space='world'))
                entry = p.get('entry', 'fade')
            else:
                raise SystemExit(f'unknown beat kind {kind}')

            # the documentary layer: any beat may wear these (doc.py)
            extra = []
            if p.get('doc') or (p.get('clock') and ep.get('look', {}).get('doc_clock')):
                ov, cs = D.doc_line(p.get('doc', fx_.get('ground', '')), p.get('clock'), fx_.get('kickoff'), accent=ep['accent'])
                extra.append(ov)
                cues += cs[::3]
            if p.get('typed'):
                ty = p['typed']
                ov, cs = D.typed(ty['lines'], ty.get('at_t', 0.5), cps=ty.get('cps', 20), at=tuple(ty.get('pos', (0.5, 0.48))),
                                 size=ty.get('size', 68 if not tall else 60), accent=ep['accent'], accent_line=ty.get('accent_line'),
                                 panel=bool(ty.get('panel', p.get('backdrop') or p.get('clip') or kind == 'art')),
                                 out_at=ty.get('out'), face=ty.get('face', D.TYPE_FACE), gap=ty.get('gap', 0.35))
                extra.append(ov)
                cues += cs
            if p.get('stat'):
                st_ = p['stat']
                ov, cs = D.stat(int(st_['value']), st_['label'], st_.get('at_t', 0.4), source=st_.get('source'),
                                prefix=st_.get('prefix', ''), suffix=st_.get('suffix', ''), accent=ep['accent'],
                                at=tuple(st_.get('pos', (0.5, 0.44))), count=st_.get('count', 1.5))
                extra.append(ov)
                cues += cs
            if p.get('timeline'):
                tl = p['timeline']
                ov, cs = D.timeline(tl['points'], tl.get('at_t', 0.5), tl.get('step', 1.1), ep['accent'], tl.get('title', ''))
                extra.append(ov)
                cues += cs
            if p.get('play'):          # a goal re-drawn from the match reports (plays.py)
                ov, cs = PL.play(p['play'], ep['accent'], p['play'].get('at_t', 0.2))
                extra.append(ov)
                cues += cs
            if p.get('board'):         # the ground's own scoreboard, re-drawn from the owner's clip
                bo = p['board']
                ov, cs = PL.board(str(ROOT / bo['crest']), bo['away'], bo['score'], bo['minute'], bo.get('scorers', []), ep['accent'],
                                  bo.get('at_t', 0.25), bo.get('w', 0.5), tuple(bo.get('pos', (0.5, 0.47))), bo.get('prev'))
                extra.append(ov)
                cues += cs
            if p.get('red'):
                ov, cs = PL.red(p['red']['name'], p['red']['minute'], p['red'].get('at_t', 0.4))
                extra.append(ov)
                cues += cs
            if p.get('lights'):
                li = p['lights']
                ov, cs = PL.lights(li.get('at_t', 0.3), li.get('n', 1400), tuple(li.get('region', (0.0, 0.08, 1.0, 0.62))),
                                   li.get('build', 4.0))
                extra.append(ov)
            if p.get('bug'):
                extra.append(D.bug(fx_['home_short'], fx_['away_short'], p['bug'], ep['accent']))
            if p.get('prop'):        # an owner prop with our type on it, slid in and settled
                pr = p['prop']
                pim = D.prop_card(pr, ep['accent'])
                px, py = pr.get('pos', (0.5, 0.48))
                layers.append(Layer(pim, slide_in(W * px, H * py, pr.get('at_t', 0.3), frm=(0, 700), rot0=pr.get('rot', -4),
                                                  rot1=pr.get('rot1', -1.2), dur=0.6, drift=False), settle=1e9))
                cues.append((pr.get('at_t', 0.3) + 0.45, 'stamp'))
                shake.append((pr.get('at_t', 0.3) + 0.45, 7))
            for c in p.get('cues', []):        # a beat may ask for its own sound: a heartbeat, a boom, a tick
                cues.append((float(c[0]), c[1]))

            caps = None
            if p['n'] == stub_at:      # the stub: in the free half of the frame, clear of the clock and the captions
                vertical_world = isinstance(world_frames, PaperWorld) and not tall
                sx, sy = (W * 0.70, H * 0.46) if vertical_world else ((W / 2, H * 0.36) if tall else (W - 450, 250))
                layers += SUB.stub_layers(sp, ep['id'], SUB.pick('stub', epn), sx, sy, 0.9, max(3.0, min(4.4, dur - 1.4)),
                                          (W - 120) if tall else 760, cues)
            if p.get('words') and kind != 'end':
                caps = Captions(p['words'], p['voice_at'] - p['start'], ep['accent'])
                if tall:     # lift the plate to two-thirds down: the platform's own buttons live at the bottom
                    lift = 300 if (meta and orient(meta)[0] > orient(meta)[1]) else 470   # under a landscape window, clear of its clock
                    caps = (lambda c, d=lift: (lambda tt: (lambda r: r and (r[0], r[1], r[2] - d))(c(tt))))(caps)
            overlays = extra + ([caps] if caps else [])
            shot = Shot(index=p['n'], duration=dur, world=world, camera=cam, layers=layers, entry=entry, shake=shake,
                        cues=cues, meta={'kind': kind}, world_frames=world_frames, overlay=overlays or None)
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
            lk = ep.get('look', {})
            footage = kind in ('clip', 'title', 'score', 'ticket', 'hook')
            scope = int(lk.get('scope', 0) * (1 if not tall else 0)) if footage and not p.get('no_scope') else 0
            vig = float(lk.get('vignette', 0)) if kind not in ('endscreen', 'end') else 0.0
            for fi in range(p['frames']):
                fr = r.frame(fi, g0 + fi)
                fr = D.look(fr, g0 + fi, scope=scope, vignette=vig, flashback=bool(p.get('flashback')),
                            scope_k=ease_in_out(fi / 12) if p.get('scope_in') else 1.0)
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
            elif isinstance(world_frames, (PaperWorld, FillWorld)):
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
            if chk.get('speech') and not p.get('crowd_ok'):
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
    docfx = {'boom': D.boom(SR), 'tick': D.tick(SR), 'heart': D.heart(SR), 'whistle': D.whistle(SR)}
    # every effect at its own distance under the narrator (owner, 4.11.2026: "the effects are too loud"), the same way the
    # studio levels them (studio/audio.level_fx): a hit is felt, never louder than the voice
    vdb = speech_db(voice) if voice.any() else -21.0
    doc_under = {'boom': 12.0, 'whistle': 13.0, 'heart': 16.0, 'tick': 20.0, 'key': 20.0}

    def at_level(a, under):
        w = max(1, int(0.12 * SR))
        body = max((a[j:j + w] for j in range(0, max(1, len(a) - w + 1), max(1, w // 4))), key=lambda x: float(np.mean(x * x)))
        rms = 20 * math.log10(max(1e-9, float(np.sqrt(np.mean(body ** 2)))))
        return a * 10 ** ((vdb - under + float(rng.uniform(-1.5, 1.5)) - rms) / 20)
    studio_kinds = [(ct, k) for ct, k in all_cues if k not in docfx and k != 'key' and not k.startswith('crowd')]
    keep = set(thin_cues(studio_kinds, total))
    for ct, kind in all_cues:
        i = int(ct * SR)
        if kind == 'key':
            a = at_level(D.key_click(rng, SR), doc_under['key'])
            sfx[i:i + len(a)] += a[: n - i]
            continue
        if kind in docfx:
            a = at_level(docfx[kind], doc_under[kind])
            sfx[i:i + len(a)] += a[: n - i]
            continue
        if kind.startswith('crowd'):
            path = CROWD.get(kind)
            if path and path.exists():
                a = read_audio(path)[: int(4.5 * SR)]
                a *= np.minimum(1, np.arange(len(a))[::-1] / (1.2 * SR))
                sfx[i:i + len(a)] += a[: n - i] * 0.25
            continue
        if (ct, kind) not in keep:
            continue
        a = resample(level_fx(kind, fx(kind, rng), vdb, rng), 32000, SR)
        sfx[i:i + len(a)] += a[: n - i]
    sections = [{'start': p['start'], 'end': p['start'] + p['dur'], **p['music']} for p in plan if p.get('music')]
    track = ep.get('music') if isinstance(ep.get('music'), str) else ''
    if isinstance(ep.get('music'), dict) and ep['music'].get('track'):   # the owner's track, laid under the edit with a level per beat
        music = D.music_bed(ep['music'], plan, total, SR, read_audio)
    elif sections and track.startswith('track:'):   # the owner's chosen track, edited to the night (studio/audio.track_score)
        music = resample(track_score(sections, track.split(':', 1)[1]), 32000, SR)[:n]
    else:
        music = resample(score(sections), 32000, SR)[:n] if sections else np.zeros(n, np.float32)
    music = np.pad(music, (0, n - len(music)))
    for name, arr in (('voice', voice), ('amb', amb), ('music', music), ('sfx', sfx)):
        write_wav(work / f'{name}.wav', arr[: int(total * SR)])
    mix = work / 'mix.wav'
    mv, av = (0.72, 0.6) if track.startswith('track:') else (0.5, 0.9)
    g = (f'[2:a]volume={mv}[m];[1:a]volume={av}[am];[am][m]amix=inputs=2:normalize=0[bed];'
         '[bed][0:a]sidechaincompress=threshold=0.03:ratio=7:attack=25:release=420[bd];'
         f'[0:a]{narrator_fx(SR)},volume=1.1[v];'
         '[3:a]lowpass=f=9000[s0];[s0][0:a]sidechaincompress=threshold=0.04:ratio=3:attack=10:release=300[s];[v][bd][s]amix=inputs=3:normalize=0,afade=t=out:st=%.2f:d=1.5[a]' % (total - 1.6))
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(work / 'voice.wav'), '-i', str(work / 'amb.wav'), '-i', str(work / 'music.wav'),
         '-i', str(work / 'sfx.wav'), '-filter_complex', g, '-map', '[a]', '-ar', str(SR), str(mix)])
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(mix), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr).group(0))
    final_mix = work / 'mix-14.wav'
    # a gain to −13.7, then a brickwall a little under the ceiling: linear loudnorm stops short when the booms and the
    # crowd's peaks would cross −1.5, and the AAC encode adds back a few tenths — so the limiter, not loudnorm, holds TP
    gain = -13.7 - float(m['input_i'])
    for _ in range(4):        # the limiter takes some loudness back: measure, add the shortfall, again
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(mix), '-af',
             f"volume={gain:.2f}dB,alimiter=limit=0.75:attack=3:release=120:level=false",
             '-ar', str(SR), '-ac', '2', str(final_mix)])
        r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(final_mix), '-af', 'ebur128', '-f', 'null', '-'],
                           capture_output=True, text=True)
        got = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1])
        if abs(got + 13.9) <= 0.3:
            break
        gain += -13.9 - got

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
        '\n'.join(f"· {s['short']}: {s.get('url') or 'https://fanlife.dubelteam.com'}" for s in ep['sources']) + \
        '\n\nNarration is synthetic (Kokoro, Apache-2.0). Footage: FAN LIFE, from the stand.' + music_credit(ep) + ' #FANLIFE #IWasThere'
    (out / 'youtube-description.txt').write_text(desc if not tall else ep['reel']['description'].strip() + '\n\n' + music_credit(ep).strip() + '\n#Shorts #FANLIFE #IWasThere')
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-vf', "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'",
         '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '128k',
         '-map_metadata', '-1', '-movflags', '+faststart', str(out / f'{name}-preview.mp4')])      # 720p: a preview travels through git (100 MB)
    # the file that is actually published: YouTube (and Telegram, for a reel) — under 95 MB so it travels through git,
    # under 49 MB for a reel so the bot can send it. Phone footage with grain is too dense for a fixed CRF (a 2.5-minute
    # film came out at 450 MB at CRF 19), so the video is given the bitrate the cap allows, at most 14 Mb/s: ONE encode.
    cap = (49 if tall else 95) * 1024 * 1024
    pub = out / f'{name}-publish.mp4'
    kbps = min(14000, int(cap * 8 * 0.9 / max(total, 1) / 1000) - 192)
    for k in (kbps, int(kbps * 0.8)):
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-c:v', 'libx264', '-preset', 'medium', '-b:v', f'{k}k',
             '-maxrate', f'{int(k * 1.5)}k', '-bufsize', f'{k * 2}k', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
             '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', '-movflags', '+faststart', str(pub)])
        if pub.stat().st_size <= cap:
            break
    report['publish'] = {'file': pub.name, 'mb': round(pub.stat().st_size / 1048576, 1), 'video': f'{k}k'}
    th = ep[CUT].get('thumbnail')
    if th or CUT == 'film':   # the film always gets its thumbnails: the night's scoreline is a hook on its own
        frame = work / 'thumb-src.jpg'
        sc = 0 if tall else int(ep.get('look', {}).get('scope', 0))    # never the scope bars on a thumbnail
        crop = ['-vf', f'crop=iw-{sc * 32 // 9}:ih-{sc * 2},scale={W}:{H}'] if sc else []
        at = float((th or {}).get('at') or total * 0.3)
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{at:.2f}', '-i', str(master), '-frames:v', '1', *crop, str(frame)])
        from studio import thumbs as T   # the hook engine (docs/fanlife/68): thumbnail.jpg, -2, -3 and the Shorts cover
        T.for_vlog(ep, CUT, frame, out)
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


def music_credit(ep: dict) -> str:
    """' Music: …' for the description when the episode plays a library track (CC BY needs the credit and the link)."""
    m = ep.get('music')
    if isinstance(m, dict) and m.get('track'):
        tid = m['track']
    elif str(m or '').startswith('track:'):
        tid = str(m).split(':', 1)[1]
    else:
        return ''
    t = music_track(tid)
    return ' Music: ' + (t.get('credit') or f"{t['artist']} — {t['title']}") + '.'


def mmss(t: float) -> str:
    return f'{int(t // 60)}:{int(t % 60):02d}'


if __name__ == '__main__':
    main()

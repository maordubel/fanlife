"""FAN LIFE promo series — Royal Rumble and Legends Manager (owner, 3.11.2026).

    python3 scripts/football-stories/promo/promo.py <campaign.json> <item id> <out dir> <captures dir>

One film (16:9) and six Shorts (9:16) per game, cut on the Football Stories studio engine with the series narrator:
the owner's promo art and the club art from the shared library (`../art-library/library.json`), the live game filmed
on a phone (`capture.py`), the house type and the subscribe call. Every word on screen and every word spoken is in
campaign.json — nothing is typed into this file.

Beat kinds (fields in campaign.json):
  art     the library art full-bleed, pushed in        {art, focus:[fx,fy], zoom:[z0,z1], head, kicker, tag, score}
  card    the art as a taped print on dyed paper       {art, region:[x0,y0,x1,y1], head, kicker, tag}
  phone   a live still on a phone                      {cap, head, kicker}
  clip    a live screen recording on a phone           {clip, mark, len, head, kicker}
  title   the game's own mark slammed on               {logo, head, kicker}
  slam    one line, huge                               {head, kicker}
  montage several art pieces cut on the beat           {arts:[…], names:[…], crests:[…]}
  end / call / endscreen                               the close (film / Short / YouTube end screen)
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from html import escape as esc
from pathlib import Path

HERE = Path(__file__).resolve().parent
CAMP = json.loads(Path(sys.argv[1]).read_text())
ITEM = next(i for i in CAMP['items'] if i['id'] == sys.argv[2])
SHORT = ITEM['format'] == 'short'
if SHORT and '--reel' not in sys.argv:
    sys.argv.append('--reel')        # the studio modules read this before they are imported: 9:16 from here on

sys.path.insert(0, str(HERE.parent / 'matchday'))
sys.path.insert(0, str(HERE.parent))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import film as F  # noqa: E402
import subscribe as SUB  # noqa: E402
from render import read_audio, resample, run, write_wav  # noqa: E402
from studio.audio import CROWD, fx, score  # noqa: E402
from studio.captions import Captions  # noqa: E402
from studio.common import FPS, H, INK, NEWSPRINT, PAPER, ROOT, W, Palette, hex_rgb  # noqa: E402
from studio.edit import cam_push, fit, pop, slam, slide_in, taped  # noqa: E402
from studio.motion import Layer, Pose, Shot, ShotRenderer, blend_entry, clamp, ease_in_out  # noqa: E402
from studio.paper import CANVAS, ClipWorld, crumpled, halftone_overlay  # noqa: E402
from studio.sprites import SpriteFactory, key_of  # noqa: E402

SR = F.SR
CW, CH = CANVAS
LIB = HERE.parent / 'art-library'
LIBRARY = {a['id']: a for a in json.loads((LIB / 'library.json').read_text())['items']}
TOP = 300 if SHORT else 0           # a Short's top bar belongs to the platform
FOOT = 470 if SHORT else 0          # …and so do the caption and the buttons at the foot
LOGOS = {'rumble': ROOT / 'public/brand/gates/royal-rumble.png', 'legends': ROOT / 'public/legends/brand/logo-1024.webp',
         'fanlife': ROOT / 'public/brand/fanlife/logo-512.png'}


# ── pictures ───────────────────────────────────────────────────────────────────────────────────────────────────────
def art_src(aid: str) -> Image.Image:
    """Library art with its fake wordmark covered by the real FAN LIFE badge, the way a sticker goes over a poster."""
    a = LIBRARY[aid]
    im = Image.open(LIB / a['file']).convert('RGB')
    z = a.get('zones', {}).get('wordmark')
    if z:
        reg = np.asarray(im.crop(tuple(z)), 'float32').reshape(-1, 3)
        lum = reg.mean(1)
        paper = tuple(int(v) for v in np.median(reg[lum >= np.percentile(lum, 60)], 0))
        ImageDraw.Draw(im).rectangle(z, fill=paper)
        d = round((z[3] - z[1]) * 2.3)
        badge = Image.open(LOGOS['fanlife']).convert('RGBA').resize((d, d), Image.LANCZOS)
        x, y = z[0] + 150, z[1] + 62      # inside what a film's canvas margin leaves on screen
        ink = Image.new('RGBA', badge.size, hex_rgb(INK) + (255,))
        ink.putalpha(badge.getchannel('A'))
        im.paste(ink, (x + 10, y + 10), ink)
        im.paste(badge, (x, y), badge)
    return im


def bleed(aid: str, focus=(0.5, 0.5)) -> Image.Image:
    """The art cut to the canvas shape around a focus point (fractions of the art), filling the frame."""
    im = art_src(aid)
    aw, ah = im.size
    if aw / ah > CW / CH:
        cw, ch = round(ah * CW / CH), ah
    else:
        cw, ch = aw, round(aw * CH / CW)
    x0 = clamp(focus[0] * aw - cw / 2, 0, aw - cw)
    y0 = clamp(focus[1] * ah - ch / 2, 0, ah - ch)
    im = im.crop((round(x0), round(y0), round(x0) + cw, round(y0) + ch)).resize(CANVAS, Image.LANCZOS)
    return halftone_overlay(im, cell=7, strength=0.06).convert('RGB')


def card_img(aid: str, region=None, width=None) -> Image.Image:
    im = art_src(aid)
    if region:
        im = im.crop(tuple(region))
    width = width or (W - 70 if SHORT else 1180)
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    pad = 16
    c = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), hex_rgb(PAPER) + (255,))
    c.paste(im, (pad, pad))
    ImageDraw.Draw(c).rectangle([0, 0, c.width - 1, c.height - 1], outline=hex_rgb(INK) + (255,), width=6)
    s = Image.new('RGBA', (c.width + 22, c.height + 22), (0, 0, 0, 0))
    s.paste(Image.new('RGBA', c.size, hex_rgb(INK) + (255,)), (22, 22))
    s.alpha_composite(c, (0, 0))
    return taped(s, hash(aid) % 97)


def tinted(seed: int, hexcol: str, dark: float = 0.5) -> Image.Image:
    base = np.asarray(crumpled(seed, CANVAS, NEWSPRINT).convert('RGB'), 'float32') / 255
    col = np.array(hex_rgb(hexcol), 'float32') / 255
    out = base * col * (1 - dark) + base * col * 0.35 * dark
    return halftone_overlay(Image.fromarray(np.clip(out * 255, 0, 255).astype('uint8')), cell=9, strength=0.10).convert('RGB')


def phone_frame(sw: int, sh: int) -> tuple[Image.Image, Image.Image, int]:
    """(bezel with a transparent screen, the screen's rounded mask, pad) for a sw×sh screen."""
    pad, rad, drop = 22, 54, 18
    w2, h2 = sw + pad * 2, sh + pad * 2
    im = Image.new('RGBA', (w2 + drop, h2 + drop), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([drop, drop, w2 + drop - 1, h2 + drop - 1], rad, fill=hex_rgb(INK) + (255,))
    d.rounded_rectangle([0, 0, w2 - 1, h2 - 1], rad, fill=(28, 26, 22, 255), outline=hex_rgb(INK) + (255,), width=6)
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], rad - pad + 8, fill=255)
    hole = Image.new('L', im.size, 0)
    hole.paste(mask, (pad, pad))
    a = np.asarray(im.getchannel('A')).copy()
    a[np.asarray(hole) > 0] = 0
    im.putalpha(Image.fromarray(a))
    return im, mask, pad


def phone(screen: Image.Image, h: int) -> Image.Image:
    sw = round(h * screen.width / screen.height)
    sc = screen.convert('RGB').resize((sw, h), Image.LANCZOS)
    bez, mask, pad = phone_frame(sw, h)
    out = Image.new('RGBA', bez.size, (0, 0, 0, 0))
    out.paste(sc, (pad, pad), mask)
    out.alpha_composite(bez)
    return out


class PhoneClip:
    """A screen recording playing inside a phone on dyed paper — a moving world for the studio's ShotRenderer."""

    def __init__(self, clip: Path, base: Image.Image, at: tuple[int, int], h: int, aspect: float):
        sw = round(h * aspect)
        sw -= sw % 2
        self.cw = ClipWorld(clip, size=(sw, h), fps=FPS)
        self.bez, self.mask, self.pad = phone_frame(sw, h)
        self.base = base.convert('RGBA')
        self.x, self.y = round(at[0] - self.bez.width / 2), round(at[1] - self.bez.height / 2)

    def __call__(self, i: int) -> Image.Image:
        im = self.base.copy()
        im.paste(self.cw(i), (self.x + self.pad, self.y + self.pad), self.mask)
        im.alpha_composite(self.bez, (self.x, self.y))
        return im.convert('RGB')


# ── type ───────────────────────────────────────────────────────────────────────────────────────────────────────────
SS = float(__import__('os').environ.get('STORIES_SPRITE_SCALE', '1.5'))   # the sprite browser's device scale


def headline(sp, key: str, text: str, kicker: str | None = None, size: int = 0, width: int = 0, tone: str = 'plate') -> Image.Image:
    """The campaign's voice in type. 'plate': ink capitals on a paper slab with the accent's second print (over art);
    'shout': cream capitals printed twice, no slab (over dyed paper). Size and width are in FRAME pixels."""
    size = size or (112 if SHORT else 124)
    width = width or (W - 90 if SHORT else 860)
    cs, cw = size / SS, width / SS
    lines = esc(text).replace('\n', '<br>')
    k = f'<div class="caps" style="font-size:{cs * 0.34:.0f}px;padding-bottom:8px;color:var(--accent)">{esc(kicker)}</div>' if kicker else ''
    if tone == 'shout':
        k = k.replace('var(--accent)', 'var(--paper)')
        body = (f'<div style="max-width:{cw:.0f}px;padding:4px 12px 12px 4px">{k}<div class="head" style="font-size:{cs:.0f}px;line-height:.93;'
                f'color:var(--paper);text-shadow:{cs * .08:.0f}px {cs * .08:.0f}px 0 var(--ink)">{lines}</div></div>')
    else:
        body = (f'<div class="sh" style="inset:10px 0 0 10px;background:var(--accent)"></div><div class="box" style="max-width:{cw:.0f}px;padding:14px 22px 16px;border-width:5px">'
                f'{k}<div class="head" style="font-size:{cs:.0f}px;line-height:.93">{lines}</div></div>')
    return fit(F.cropped(sp.render(f'hd-{key}', body, extra_css='.s{padding:0 14px 14px 0}')), width + 40, 900)


def game_mark(sp, game: str, width: int) -> Image.Image:
    if game == 'rumble':
        body = ('<div class="sh" style="inset:16px 0 0 16px"></div><div class="box" style="padding:14px 34px 18px;border-width:7px;transform:rotate(-2deg)">'
                '<div class="caps" style="font-size:34px;color:var(--ink);padding-bottom:4px">FAN LIFE · Gate 9</div>'
                '<div class="head" style="font-size:150px;line-height:.86;color:var(--accent);text-shadow:8px 8px 0 var(--ink)">Royal<br>Rumble</div>'
                '<div class="caps" style="font-size:30px;padding-top:12px">Your club · your five · your budget</div></div>')
        im = F.cropped(sp.render('mark-rumble', body, extra_css='.s{padding:20px 30px 30px 20px}'))
    else:
        im = F.img(LOGOS[game])
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def glide(z0, z1, c0, c1, dur):
    """A camera that starts where the beat says (fractions of the canvas) — for art whose top must stay out of shot."""
    def f(t):
        k = ease_in_out(t / max(dur, 0.1))
        return z0 + (z1 - z0) * k, CW * (c0[0] + (c1[0] - c0[0]) * k), CH * (c0[1] + (c1[1] - c0[1]) * k)
    return f


def tag(sp, text: str) -> Image.Image:
    return F.cropped(sp.label(key_of('tag', text), text, 'ink', 26 if SHORT else 22))


# ── the cut ────────────────────────────────────────────────────────────────────────────────────────────────────────
def cap_path(caps: Path, ref: str) -> Path:
    return caps / f'{ref}.png'


def clip_cut(caps: Path, ref: str, mark: str, length: float, work: Path, n: int, offset: float = 0.0) -> tuple[Path, float]:
    """A stretch of a screen recording, from a named moment in its log, cut to the studio frame rate."""
    d = caps / ref
    log = json.loads((d / 'log.json').read_text())
    t0 = float(log['marks'][mark]) + offset
    out = work / f'clip-{n}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{t0:.2f}', '-t', f'{length + 0.3:.2f}', '-i', str(d / 'screen.webm'), '-an',
         '-vf', f'crop=540:960:0:0,fps={FPS},format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', str(out)])
    return out, 540 / 960      # Playwright records the 540×960 page 1:1 in the top-left of its 1080×1920 frame


def main():
    out, caps = Path(sys.argv[3]), Path(sys.argv[4])
    out.mkdir(parents=True, exist_ok=True)
    work = out / f"work-{ITEM['id']}"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    accent = ITEM.get('accent') or CAMP['games'][ITEM['game']]['accent']
    game = CAMP['games'][ITEM['game']]
    pal = Palette('fl', 'FAN LIFE', accent, PAPER, [])
    acc = hex_rgb(accent)
    seq = ITEM['n']

    beats = [dict(b) for b in ITEM['beats']]
    if SHORT:
        beats.append({'kind': 'call', 'say': ITEM.get('call_say') or game['call_say']})
    else:
        beats.append({'kind': 'end', 'say': game['end_say'] + ' ' + SUB.pick('end_voice', seq)})
        if (SUB.ART / 'endscreen-ground.jpg').exists():
            beats.append({'kind': 'endscreen', 'dur': 20.0})

    t, plan = 0.0, []
    for i, b in enumerate(beats):
        p = {**b, 'i': i, 'start': t}
        if b.get('say'):
            wav = work / f'v-{i}.wav'
            d, words = F.voice_beat(b['say'], CAMP.get('ipa', {}), wav)
            lead = b.get('lead', 0.6 if i == 0 else 0.3)
            p.update(wav=wav, words=words, voice_at=t + lead)
            dur = max(lead + d + b.get('tail', 0.45), b.get('min', 2.9 if SHORT else 2.6), 5.5 if b['kind'] in ('end', 'call') else 0)
        else:
            dur = b.get('dur', 2.0)
        p['frames'] = round(dur * FPS)
        p['dur'] = p['frames'] / FPS
        t += p['dur']
        plan.append(p)
    total = t

    files, cues_all, prev_last = [], [], None
    with SpriteFactory(pal, work / 'sprites') as sp:
        if not SHORT and ITEM.get('thumb'):
            th = ITEM['thumb']
            im = art_src(th['art'])
            k = max(W / im.width, H / im.height)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            fx_, fy_ = th.get('focus', (0.5, 0.5))
            x0 = int(clamp(fx_ * im.width - W / 2, 0, im.width - W))
            y0 = int(clamp(fy_ * im.height - H / 2, 0, im.height - H))
            im = im.crop((x0, y0, x0 + W, y0 + H)).convert('RGBA')
            shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            a = np.zeros((H, W), 'uint8')
            a[:, :] = (np.clip((np.arange(W)[None, :] - W * 0.35) / (W * 0.65), 0, 1) * 170).astype('uint8')
            shade.putalpha(Image.fromarray(a))
            im.alpha_composite(shade)
            hd = headline(sp, 'thumb-' + ITEM['id'], th['head'], th.get('kicker'), 150, width=1000, tone='plate')
            im.alpha_composite(hd, (W - 50 - hd.width, H - 60 - hd.height))
            gm = game_mark(sp, ITEM['game'], 420 if ITEM['game'] == 'rumble' else 300)
            im.alpha_composite(gm, (W - 60 - gm.width, 50))
            im.convert('RGB').resize((1280, 720), Image.LANCZOS).save(out / f"{ITEM['file']}-thumbnail.jpg", quality=92)
        for p in plan:
            k, dur, i = p['kind'], p['dur'], p['i']
            layers, cues, shake, world_frames = [], list(p.get('cues', [])), [], None
            cam, entry = cam_push(1.0, 1.05, 30, -10, dur), p.get('entry', 'cut' if SHORT else 'fade')
            key = key_of(ITEM['id'], i)
            head = headline(sp, key, p['head'], p.get('kicker'), p.get('size', 0), tone=p.get('tone', 'plate')) if p.get('head') else None
            if k == 'art':
                world = bleed(p['art'], p.get('focus', (0.5, 0.5)))
                z0, z1 = p.get('zoom', (1.0, 1.08))
                pan = p.get('pan', (0, 0))
                cam = cam_push(z0, z1, pan[0], pan[1], dur)
                if p.get('c0'):
                    cam = glide(z0, z1, p['c0'], p.get('c1', p['c0']), dur)
                if head:
                    # the captions own the foot of the frame, so the line sits up top
                    hy = (TOP + 30 + head.height / 2) if SHORT else (60 + head.height / 2)
                    hx = W / 2 if SHORT else 80 + head.width / 2
                    layers.append(Layer(head, slam(hx, hy, p.get('head_at', 0.35), s0=1.35, rot=p.get('rot', -1.5)), settle=1e9))
                    cues.append((p.get('head_at', 0.35), 'stamp'))
            elif k == 'card':
                world = tinted(seq * 13 + i, p.get('ground', accent), 0.55)
                cd = card_img(p['art'], p.get('region'), None if SHORT else 980)
                cy = (H * 0.58) if SHORT else (H * 0.60)
                cx = W / 2 if SHORT else W * 0.37
                layers.append(Layer(cd, slide_in(cx, cy, 0.1, frm=(0, 900 if SHORT else 700), rot0=-5, rot1=p.get('rot', -2), dur=0.55), settle=1e9))
                cues.append((0.1, 'whoosh'))
                if head:
                    pos = (W / 2, TOP + 40 + head.height / 2) if SHORT else (W - 70 - head.width / 2, 50 + head.height / 2)
                    layers.append(Layer(head, slam(pos[0], pos[1], 0.55, s0=1.4, rot=-1.5), settle=1e9))
                    cues.append((0.55, 'stamp'))
            elif k in ('phone', 'clip'):
                world = tinted(seq * 7 + i, p.get('ground', accent), 0.5)
                ph_h = p.get('ph', 1000 if SHORT else 880)
                if SHORT:
                    y_top = TOP + 20 + (head.height + 26 if head else 120)
                    at = (W / 2, y_top + (ph_h + 62) / 2)
                else:
                    at = (W * 0.30, H * 0.5)
                if k == 'phone':
                    shot_im = Image.open(cap_path(caps, p['cap']))
                    if p.get('crop'):
                        shot_im = shot_im.crop(tuple(p['crop']))
                    ph = phone(shot_im, ph_h)
                    layers.append(Layer(ph, slide_in(at[0], at[1], 0.12, frm=(0, 800) if SHORT else (0, 700), rot0=-4, rot1=p.get('rot', -1.2), dur=0.55), settle=1e9))
                    cues.append((0.12, 'whoosh'))
                else:
                    clip, aspect = clip_cut(caps, p['clip'], p['mark'], dur + 0.2, work, i, p.get('offset', 0.0))
                    world_frames = PhoneClip(clip, world, at, ph_h, aspect)
                    cam = lambda tt: (1.0, CW / 2, CH / 2)   # noqa: E731 — the recording is the motion
                if head:
                    pos = (W / 2, TOP + 20 + head.height / 2) if SHORT else (W * 0.70, H * 0.34)
                    layers.append(Layer(head, slam(pos[0], pos[1], 0.45, s0=1.35, rot=-1.5), settle=1e9))
                    cues.append((0.45, 'stamp'))
            elif k == 'title':
                world, entry = tinted(seq * 5 + i, accent, 0.62), 'black' if i == 0 else entry
                lw = (720 if SHORT else 780) if p.get('logo', ITEM['game']) == 'rumble' else (600 if SHORT else 560)
                logo = game_mark(sp, p.get('logo', ITEM['game']), lw)
                if p.get('head'):
                    head = headline(sp, key + '-t', p['head'], p.get('kicker'), p.get('size', 170 if SHORT else 190), width=W - 120 if SHORT else 820, tone='shout')
                lpos = (W / 2, TOP + 60 + logo.height / 2) if SHORT else (60 + logo.width / 2, H * 0.48)
                layers.append(Layer(logo, slam(lpos[0], lpos[1], 0.25, s0=1.9, rot=-6, dur=0.35), settle=1e9))
                cues += [(0.0, 'whoosh'), (0.25, 'stamp')]
                shake.append((0.25, 14))
                if head:
                    pos = (W / 2, lpos[1] + logo.height / 2 + 60 + head.height / 2) if SHORT else (W - 60 - head.width / 2, H * 0.50)
                    layers.append(Layer(head, slide_in(pos[0], pos[1], 0.75, frm=(0, 300) if SHORT else (700, 0), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                    cues.append((0.75, 'paper'))
            elif k == 'slam':
                world = tinted(seq * 11 + i, p.get('ground', accent), 0.62)
                h2 = headline(sp, key + '-s', p['head'], p.get('kicker'), p.get('size', 190 if SHORT else 200), width=W - 120, tone='shout')
                layers.append(Layer(h2, slam(W / 2, (TOP + (H - FOOT)) / 2 if SHORT else H / 2, 0.2, s0=1.7, rot=-2.5, dur=0.3), settle=1e9))
                cues.append((0.2, 'stamp'))
                shake.append((0.2, 18))
            elif k == 'montage':
                arts = p['arts']
                step = dur / len(arts)
                frames = [bleed(a, f) for a, f in zip(arts, p.get('focus', [(0.5, 0.5)] * len(arts)))]
                world = frames[0]
                per = max(1, round(step * FPS))

                def wf(j, frames=frames, per=per):
                    return frames[min(len(frames) - 1, j // per)]
                world_frames = wf
                cam = lambda tt, step=step: (1.0 + 0.10 * ((tt % step) / step), CW / 2, CH / 2)   # noqa: E731
                names = p.get('names', [])
                crests = p.get('crests', [])
                for j in range(len(arts)):
                    t0, t1 = j * step, (j + 1) * step
                    if j < len(names) and names[j]:
                        nm = headline(sp, key + f'-n{j}', names[j], None, 130 if SHORT else 120, width=W - 120 if SHORT else 1200, tone='plate')
                        x = W / 2 if SHORT else 80 + nm.width / 2
                        y = H * 0.60 if SHORT else 70 + nm.height / 2
                        layers.append(Layer(nm, (lambda tt, t0=t0, t1=t1, x=x, y=y: None if not (t0 + 0.05 <= tt < t1) else Pose(x, y, 1.25 - 0.25 * clamp((tt - t0) / 0.18), -2, clamp((tt - t0) / 0.06)))))
                        cues.append((t0 + 0.05, 'stamp'))
                    if j < len(crests) and crests[j]:
                        cr = ROOT / 'public/crests' / f'{crests[j]}.png'
                        if cr.exists():
                            ci = F.img(cr)
                            cs = 300 if SHORT else 240
                            ci = ci.resize((cs, round(ci.height * cs / ci.width)), Image.LANCZOS)
                            cx, cy = (W / 2, TOP + 120 + ci.height / 2) if SHORT else (W - 80 - ci.width / 2, 60 + ci.height / 2)
                            layers.append(Layer(ci, (lambda tt, t0=t0, t1=t1, cx=cx, cy=cy: None if not (t0 + 0.12 <= tt < t1) else Pose(cx, cy, max(0.05, min(1.0, (tt - t0 - 0.12) / 0.16 * 1.15)), -6, 1))))
            elif k == 'end':
                world, entry = crumpled(4, CANVAS, '#2A2620').convert('RGB'), 'wipe'
                gl = game_mark(sp, ITEM['game'], 420 if SHORT else 400)
                layers.append(Layer(gl, slam(W * 0.20, H * 0.42, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                hd = fit(F.cropped(sp.cta_headline(key_of('e', ITEM['id']), game['end_head'], SUB.pick('end_line', seq))), 1200, 260)
                layers.append(Layer(hd, slide_in(560 + hd.width / 2, H * 0.36, 0.55, frm=(900, 0), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                url = fit(F.cropped(sp.url_banner('fl-end-' + ITEM['game'], 'fanlife.dubelteam.com', game['url_sub'])), 1400, 200)
                layers.append(Layer(url, slam(560 + url.width / 2, H * 0.62, 1.4, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                cues += [(0.25, 'stamp'), (0.55, 'whoosh'), (1.4, 'stamp'), (0.0, 'end')]
            elif k == 'endscreen':
                world, cam = F.glass(SUB.ART / 'endscreen-ground.jpg'), F.still
                b2 = F.img(LOGOS['fanlife']).resize((150, 150), Image.LANCZOS)
                layers.append(Layer(b2, pop(110, 110, 0.3, rot=-6), settle=1e9))
                line = fit(F.cropped(sp.label('fl-next-' + ITEM['id'], SUB.pick('fl_endscreen_line', seq), 'paper', 44)), 1300, 110)
                layers.append(Layer(line, slide_in(210 + line.width / 2, 120, 0.5, frm=(0, -200), rot0=0, rot1=-1, dur=0.5, drift=False), settle=1e9))
                cues.append((0.0, 'crowd-murmur'))
            else:   # call — the Short's close
                follow = SUB.ART / 'reel-follow.jpg'
                world, cam = (F.glass(follow), F.still) if follow.exists() else (tinted(seq, accent), cam)
                gl = game_mark(sp, ITEM['game'], 420 if ITEM['game'] == 'rumble' else 330)
                layers.append(Layer(gl, slam(W / 2, TOP + 40 + gl.height / 2, 0.2, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                hd = fit(F.cropped(sp.cta_headline(key_of('call', ITEM['id']), game['end_head'], SUB.pick('reel_line', seq))), W - 80, 300)
                y2 = TOP + 80 + gl.height + hd.height / 2
                layers.append(Layer(hd, slide_in(W / 2, y2, 0.45, frm=(0, 500), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                url = fit(F.cropped(sp.url_banner('fl-call-' + ITEM['game'], 'fanlife.dubelteam.com', game['url_sub'])), W - 80, 200)
                layers.append(Layer(url, slam(W / 2, y2 + hd.height / 2 + 40 + url.height / 2, 1.2, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                cues += [(0.2, 'stamp'), (0.45, 'whoosh'), (1.2, 'stamp'), (0.0, 'end')]
            if p.get('tag'):
                tg = tag(sp, p['tag'])
                tx, ty = (W - 40 - tg.width / 2, TOP + 30 + (head.height + 40 if head is not None and k == 'art' else 0)) if SHORT else (W - 40 - tg.width / 2, 50)
                layers.append(Layer(tg, (lambda tt, tx=tx, ty=ty: Pose(tx, ty, 1, 0, clamp(tt / 0.2)))))
            if p.get('score'):
                sc = headline(sp, key + '-sc', p['score'], p.get('score_kicker'), 70 if SHORT else 64, width=W - 90 if SHORT else 1100, tone='plate')
                sx, sy = (W / 2, TOP + 160 + sc.height / 2) if SHORT else (W - 60 - sc.width / 2, 170 + sc.height / 2)
                layers.append(Layer(sc, slam(sx, sy, p.get('score_at', 0.8), s0=1.4, rot=1.5), settle=1e9))
                cues.append((p.get('score_at', 0.8), 'stamp'))
            if p.get('stub'):
                layers += SUB.stub_layers(sp, 'fl-' + ITEM['id'], SUB.pick('stub', seq), W * 0.70, H * 0.66, 1.2, min(4.2, dur - 1.4), 700, cues, brand='fl')
            caps_ov = None
            if p.get('words') and p.get('captions', True):     # owner, 3.11.2026: captions run through every spoken line
                c = Captions(p['words'], p['voice_at'] - p['start'], accent)
                caps_ov = c if not SHORT else (lambda tt, c=c: (lambda r: r and (r[0], r[1], r[2] - 430))(c(tt)))
            shot = Shot(index=i, duration=dur, world=world, camera=cam, layers=layers, entry=entry, shake=shake, cues=cues,
                        overlay=caps_ov, world_frames=world_frames)
            r = ShotRenderer(shot)
            target = work / f'shot-{i:02d}.mp4'
            proc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                     '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', str(target)], stdin=subprocess.PIPE)
            g0 = round(p['start'] * FPS)
            last = None
            for fi in range(p['frames']):
                fr = blend_entry(shot, fi, r.frame(fi, g0 + fi), prev_last, acc)
                proc.stdin.write(fr.tobytes())
                last = fr
            proc.stdin.close()
            if proc.wait():
                raise SystemExit(f'encode failed: {ITEM["id"]} beat {i}')
            prev_last = last
            files.append(target)
            cues_all += [(p['start'] + ct, c) for ct, c in cues]
            print(f"{ITEM['id']} beat {i:02d} {k} {dur:.1f}s ✓", flush=True)

    (work / 'list.txt').write_text(''.join(f"file '{f}'\n" for f in files))
    picture = work / 'picture.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(picture)])

    n = int(total * SR) + SR
    vo, sfx = np.zeros(n, np.float32), np.zeros(n, np.float32)
    rng = np.random.default_rng(seq)
    for p in plan:
        if p.get('wav'):
            a = read_audio(p['wav'])
            j = int(p['voice_at'] * SR)
            vo[j:j + len(a)] += a[: n - j]
    for ct, kd in cues_all:
        j = int(ct * SR)
        if kd.startswith('crowd'):
            pth = CROWD.get(kd)
            if pth and pth.exists():
                a = read_audio(pth)[: int(6 * SR)]
                a *= np.minimum(1, np.arange(len(a))[::-1] / (1.5 * SR))
                sfx[j:j + len(a)] += a[: n - j] * 0.32
            continue
        a = resample(fx(kd, rng), 32000, SR)
        sfx[j:j + len(a)] += a[: n - j] * 0.5
    mood = {'end': 'major', 'call': 'major', 'endscreen': 'major', 'montage': 'major', 'clip': 'major', 'title': 'major', 'slam': 'tense'}
    energy = {'art': 0.55, 'card': 0.5, 'phone': 0.55, 'clip': 0.75, 'title': 0.7, 'slam': 0.8, 'montage': 0.85, 'end': 0.5, 'call': 0.55, 'endscreen': 0.35}
    secs = [{'start': p['start'], 'end': p['start'] + p['dur'], 'mood': p.get('mood', mood.get(p['kind'], 'tense')), 'energy': p.get('energy', energy.get(p['kind'], 0.5))} for p in plan]
    mus = resample(score(secs, seed=seq + (11 if ITEM['game'] == 'legends' else 3)), 32000, SR)[:n]
    mus = np.pad(mus, (0, n - len(mus)))
    for nm, arr in (('vo', vo), ('sfx', sfx), ('mus', mus)):
        write_wav(work / f'{nm}.wav', arr[: int(total * SR)])
    mix = work / 'mix.wav'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(work / 'vo.wav'), '-i', str(work / 'sfx.wav'), '-i', str(work / 'mus.wav'), '-filter_complex',
         '[2:a]volume=0.62[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=25:release=420[md];'
         '[0:a]highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120,volume=1.1[v];[1:a]volume=0.8[s];'
         f'[v][md][s]amix=inputs=3:normalize=0,afade=t=out:st={total - 1.2:.2f}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]', '-map', '[a]', '-ar', str(SR), '-ac', '2', str(mix)])
    name = ITEM['file']
    pub = out / f'{name}.mp4'
    cap_mb = 45 if SHORT else 90         # a branch file must stay under GitHub's 100 MB
    for crf in (21, 23, 25, 27, 29, 31):
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(mix), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', '-movflags', '+faststart', '-shortest', str(pub)])
        if pub.stat().st_size <= cap_mb * 1048576:
            break
    scale = 'scale=360:-2' if SHORT else 'scale=640:-2'
    for kk, p in enumerate(plan):
        mid = p['start'] + min(p['dur'] * 0.7, p['dur'] - 0.1)
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{mid:.2f}', '-i', str(pub), '-frames:v', '1', '-vf', scale, str(out / f'{name}-frame-{kk:02d}.jpg')])
    if not SHORT and not ITEM.get('thumb'):
        tt = ITEM.get('thumb_at', 2.4)
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{tt:.2f}', '-i', str(pub), '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '2', str(out / f'{name}-thumbnail.jpg')])
    shutil.rmtree(work)
    rep = {'id': ITEM['id'], 'file': pub.name, 'seconds': round(total, 1), 'mb': round(pub.stat().st_size / 1048576, 1),
           'beats': [{'kind': p['kind'], 'start': round(p['start'], 2), 'dur': round(p['dur'], 2)} for p in plan]}
    (out / f'{name}.json').write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep), flush=True)


if __name__ == '__main__':
    main()

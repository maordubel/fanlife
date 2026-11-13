"""Football Fairy Tales — build one episode from its script, its Flow clips and its checked narration (11.11.2026).

  python3 -m studio.fairytales.build_episode <episode.json> <work_dir> <narration_dir> <out_dir>

work_dir holds the Flow material by plate name — <plate>.mp4 (an Omni clip, 6 s) or <plate>.jpg (a still) — and the
Fraunces fonts. narration_dir holds <shot>-<lang>.wav and narration.json from narrate.py.

Every shot lasts as long as its longer narration (both languages share one picture) plus a breath either side. A clip
plays on twos (12 poses a second, the series' stop-motion), slowed to fill the shot and held on its last pose with a
slow push; the next shot arrives under a page turn. What the shot prints — tags, the crest, the wordmark — comes from
the shot's `visual` in the script, so this file knows no club.

out_dir gets episode-<lang>.mp4 for every language (the same picture), audio-<lang>.m4a (the track YouTube adds as a
second audio language), and captions-<lang>.srt.
"""
from __future__ import annotations

import json
import math
import random
import zlib
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from studio.fairytales import papertheatre as pt
from studio.fairytales import transitions as tr
from studio.fairytales import subtitles as sub
from studio.fairytales import night as nt

REPO = Path(__file__).resolve().parents[4]
SFX = REPO / 'public/life/sfx'
BEAT = 2.6                                                    # seconds between camera waypoints
MUSIC_DIR = REPO / 'scripts/football-stories/studio/kit/music'
LIFE_SFX = REPO / 'public/life/sfx'
KIT_SFX = REPO / '.claude/skills/media-use/audio/assets/sfx'
# the sound under each cut: (file, level). Soft and short — the story is told by the voice
CUT_SFX = {'page': (SFX / 'page.m4a', 0.7), 'slide': (KIT_SFX / 'whoosh-short.mp3', 0.22), 'zoom': (KIT_SFX / 'whoosh.mp3', 0.16),
           'iris': (KIT_SFX / 'sparkle.mp3', 0.18), 'torn': (SFX / 'page.m4a', 0.5), 'dissolve': (None, 0), 'fade': (None, 0)}
# where a shot has no `transition`: the page turn opens every fourth shot, the rest rotate so no cut repeats
CYCLE = ['iris', 'slide', 'zoom', 'dissolve', 'torn', 'slide', 'iris', 'zoom']
LEAD, TAIL, TURN = 0.55, 0.85, 0.5
# a Good Night episode (`night: true`) breathes slower, melts from picture to picture, and sounds only of the lullaby
# and a slow sea (owner, 13.11.2026: "think like a lullaby, a bedtime story — nothing that makes you jump")
NIGHT_SFX = Path(__file__).resolve().parent / 'sfx'
NIGHT_LEAD, NIGHT_TAIL = 1.1, 1.9
NIGHT_DISSOLVE = 2.4                                         # seconds: one picture melts into the next
W, H, FPS = pt.W, pt.H, pt.FPS


def seconds(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def clip_frames(path: Path) -> list[Image.Image]:
    """The clip's frames at their own size (a 720p clip is 400 MB in memory; 1080p would be twice that)."""
    w, h = (int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                            'stream=width,height', '-of', 'csv=p=0', str(path)],
                                           capture_output=True, text=True, check=True).stdout.strip().split(','))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vf', 'fps=24', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    n = len(raw) // (w * h * 3)
    return [Image.frombuffer('RGB', (w, h), raw[i * w * h * 3:(i + 1) * w * h * 3]) for i in range(n)]


def lens(img: Image.Image, zoom: float, cx: float, cy: float, dx: float = 0, dy: float = 0) -> Image.Image:
    """pt.camera for a source of any size with the plate's 16:9 framing: the push-in rendered straight to W×H."""
    sw, sh = img.size
    s = max(W / sw, H / sh)
    vw, vh = W / s, H / s                                             # the 16:9 window of the source
    cw, ch = vw / zoom, vh / zoom
    ox, oy = (sw - vw) / 2, (sh - vh) / 2
    x0 = min(max(ox + cx * vw - cw / 2 + dx / (s * zoom), ox), ox + vw - cw)
    y0 = min(max(oy + cy * vh - ch / 2 + dy / (s * zoom), oy), oy + vh - ch)
    return img.transform((W, H), Image.EXTENT, (x0, y0, x0 + cw, y0 + ch), Image.BICUBIC)


class Source:
    """A shot's moving picture: a clip on twos stretched to the shot, or a still with a stop-motion boil.
    Frames are decoded on first use and released with `drop()`, so only two shots are ever in memory."""

    def __init__(self, work: Path, plate: str, dur: float, speed_floor: float = 0.55, seed: int = 1):
        self.dur, self.seed, self.work, self.plate, self.floor = dur, seed, work, plate, speed_floor
        self._frames: list[Image.Image] | None = None
        # owner 12.11.2026: never more than three seconds of a still camera. A waypoint every BEAT seconds (a new
        # framing: closer or wider, a little left or right) and a Catmull-Rom curve through them, so the lens is always
        # travelling and never stops at a waypoint.
        rng = random.Random(seed * 7919)
        n = int((dur + 2.0) / BEAT) + 3
        self.way = [(0.0, 0.0, 0.0)] + [(rng.uniform(0.02, 0.13), rng.uniform(-0.06, 0.06), rng.uniform(-0.035, 0.035))
                                        for _ in range(n)]

    @property
    def frames(self) -> list[Image.Image]:
        if self._frames is None:
            name, _, mode = self.plate.partition(':')                  # 'book-close:rev' plays a clip backwards
            mp4, jpg = self.work / f'{name}.mp4', self.work / f'{name}.jpg'
            self._frames = clip_frames(mp4) if mp4.exists() else [Image.open(jpg).convert('RGB')]
            if mode == 'rev':
                self._frames.reverse()
            length = len(self._frames) / FPS
            self.speed = 1.0 if len(self._frames) == 1 else max(min(1.0, length / max(self.dur, 0.1)), self.floor)
        return self._frames

    def drop(self) -> None:
        self._frames = None

    def beat(self, t: float) -> tuple[float, float, float]:
        x = max(t, 0.0) / BEAT
        i = min(int(x), len(self.way) - 3)
        f = x - i
        p0, p1, p2, p3 = self.way[max(i - 1, 0)], self.way[i], self.way[i + 1], self.way[i + 2]
        return tuple(0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f ** 3)
                     for a, b, c, d in zip(p0, p1, p2, p3))

    def at(self, t: float, push=(1.0, 1.06), centre=(.5, .5), punch: float = 0.0, aim=(.5, .5), night: bool = False,
           frame_override: Image.Image | None = None) -> Image.Image:
        frames = self.frames
        if night:
            # owner 13.11.2026 ("the camera movement feels epileptic"): at night a still gets ONE slow glide — a straight,
            # constant push with a slight drift, no waypoints, no punch-in — and it keeps gliding through the long
            # dissolve into the next picture, so nothing ever starts or stops
            base = frame_override or frames[0]
            v = max(t, 0.0) / max(self.dur, 0.1)
            side = 1 if self.seed % 2 else -1
            z = push[0] + 0.035 + (push[1] - push[0]) * v
            cx = centre[0] + 0.045 * (v - 0.5) * side
            cy = centre[1] + 0.012 * (0.5 - v)
            return lens(base, z, cx, cy)
        # owner 11.11.2026: no shake — the clip plays on ones, a slowed clip blends its neighbouring frames, and the
        # camera glides on one eased curve with no boil
        fk = max(t, 0.0) * self.speed * FPS
        last = len(frames) - 1
        if last and fk > last:                                       # a clip shorter than its shot swings back (a
            fk = fk % (2 * last)                                     # boomerang), it never freezes on its last frame
            fk = 2 * last - fk if fk > last else fk
        fk = min(fk, last)
        k = int(fk)
        frame = frames[k]
        if 0.08 < fk - k and k + 1 < len(frames):
            frame = Image.blend(frames[k], frames[k + 1], fk - k)
        u = pt.ease(t / max(self.dur, 0.1))
        z = push[0] + (push[1] - push[0]) * u
        cx, cy = centre
        side = 1 if self.seed % 2 else -1
        if len(frames) == 1:                                          # a still drifts as well as pushes: a camera on a slider
            z += 0.04
            cx += 0.07 * (u - 0.5) * side
            cy += 0.02 * (0.5 - u)
        else:                                                         # a clip gets a slower reframe, so no shot sits still
            cx += 0.03 * (u - 0.5) * side
        dz, dx, dy = self.beat(t)
        z += dz
        cx += dx
        cy += dy
        # owner 11.11.2026 ("zooms when needed, so the film keeps moving"): a punch-in on the shot's big moment, eased,
        # leaning a little toward what just landed
        z += punch
        if punch:
            k = min(punch / 0.08, 1.0) * 0.35
            cx += (aim[0] - cx) * k
            cy += (aim[1] - cy) * k
        return lens(frame, z, cx, cy)


def tag(img: Image.Image, t: float, text: str, xy: tuple[int, int], font: Path, size: int = 84, sub: str = '',
        sub_font: Path | None = None, colour=pt.CREAM, ink=pt.INK, rot: float | None = None) -> Image.Image:
    """A cut-card label with a brass pin, dropped in on twos."""
    if t <= 0:
        return img
    f = ImageFont.truetype(str(font), size)
    fs = ImageFont.truetype(str(sub_font or font), max(30, int(size * 0.5)))
    probe = ImageDraw.Draw(Image.new('RGB', (4, 4)))
    tw = probe.textlength(text, font=f)
    sw = probe.textlength(sub, font=fs) if sub else 0
    cw, ch = int(max(tw, sw) + 70), int(size * 1.35 + (int(size * 0.5) + 18 if sub else 0))
    card = Image.new('RGBA', (cw + 40, ch + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    rng = random.Random(zlib.crc32(text.encode()) & 0xffff)
    pts = [(20 + rng.randint(-3, 3), 20 + rng.randint(-3, 3)), (20 + cw + rng.randint(-3, 3), 20 + rng.randint(-3, 3)),
           (20 + cw + rng.randint(-3, 3), 20 + ch + rng.randint(-3, 3)), (20 + rng.randint(-3, 3), 20 + ch + rng.randint(-3, 3))]
    d.polygon(pts, fill=colour + (255,))
    d.text((20 + (cw - tw) / 2, 20 + size * 0.12), text, font=f, fill=ink + (255,))
    if sub:
        d.text((20 + (cw - sw) / 2, 20 + size * 1.32), sub, font=fs, fill=ink + (230,))
    d.ellipse((20 + cw // 2 - 11, 8, 20 + cw // 2 + 11, 30), fill=pt.BRASS + (255,), outline=(120, 90, 30, 255), width=2)
    p = tr._out_back(t / 0.45, 1.1)                                  # drops in and settles, no stepping
    r = (rot if rot is not None else rng.uniform(-5, 5)) * (1.6 - 0.6 * min(p, 1.0))
    card = card.rotate(r, resample=Image.BICUBIC, expand=True)
    x, y = int(xy[0] - card.width / 2), int(xy[1] - card.height / 2 - (1 - p) * 70)
    out = img.convert('RGBA')
    sh = card.split()[3].filter(ImageFilter.GaussianBlur(6)).point(lambda v: v * 0.5)
    out.paste((20, 12, 6, 255), (x + 7, y + 11), sh)
    out.paste(card, (x, y), card)
    return out.convert('RGB')


def crest_card(img: Image.Image, t: float, art: Image.Image, xy, size: int, flip_to: Image.Image | None = None,
               flip_at: float = 1e9) -> Image.Image:
    """The crest printed on a round cream card that drops in; optionally it flips like a coin to another crest."""
    if t <= 0:
        return img
    ts = t
    p = tr._out_back(ts / 0.5, 1.1)
    face, sx, hop = art, 1.0, 0
    if flip_to is not None and ts > flip_at:
        q = min((ts - flip_at) / 0.4, 1.0)
        face = art if q < .5 else flip_to
        sx, hop = abs(math.cos(math.pi * q)), int(-30 * math.sin(math.pi * q))
    disc = Image.new('RGBA', (size + 40, size + 40), (0, 0, 0, 0))
    dd = ImageDraw.Draw(disc)
    dd.ellipse((20, 20, 20 + size, 20 + size), fill=pt.CREAM + (255,), outline=(150, 128, 90, 255), width=4)
    a = face.resize((int(size * 0.84), int(size * 0.84 * face.height / face.width)), Image.LANCZOS)
    disc.paste(a, (20 + (size - a.width) // 2, 20 + (size - a.height) // 2), a)
    disc = disc.resize((max(2, int(disc.width * max(sx, 0.03))), disc.height), Image.LANCZOS)
    x, y = int(xy[0] - disc.width / 2), int(xy[1] - disc.height / 2 - (1 - p) * 90 + hop)
    out = img.convert('RGBA')
    sh = disc.split()[3].filter(ImageFilter.GaussianBlur(8)).point(lambda v: v * 0.5)
    out.paste((20, 12, 6, 255), (x + 8, y + 12), sh)
    out.paste(disc, (x, y), disc)
    return out.convert('RGB')


def deyellow(img: Image.Image, band=(36, 74), smin=0.30) -> Image.Image:
    """The rival's hue never prints (pack `bannedRivalHues`; rule 8 for Hapoel): a pixel in the band at saturation ≥ smin
    turns to the brass-brown of the badge's own fix (hue 26°) at the same value, so gold becomes bronze and stays lit."""
    import cv2
    a = np.asarray(img)
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV_FULL)
    h = hsv[..., 0].astype(np.float32) * 360 / 256
    m = (h >= band[0]) & (h <= band[1]) & (hsv[..., 1] >= smin * 255)
    if not m.any():
        return img
    hsv[..., 0][m] = int(26 * 256 / 360)
    return Image.fromarray(cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB_FULL))


def plan(ep: dict, narr: Path, langs: list[str]) -> list[dict]:
    t = 0.0
    out = []
    for s in ep['shots']:
        lens = {l: seconds(narr / f"{s['id']}-{l}.wav") for l in langs}
        dur = LEAD + max(lens.values()) + TAIL + s.get('visual', {}).get('extra', 0.0)
        k = len(out)
        cut = s.get('transition') or ('fade' if k == 0 else 'page' if k % 4 == 0 else CYCLE[k % len(CYCLE)])
        out.append({'shot': s, 'start': t, 'dur': dur, 'lens': lens, 'cut': cut})
        t += dur
    return out


def caption(shot: dict, lang: str) -> str:
    """What the subtitle prints: the narration, or the script's `cap` where the spoken line spells out a number."""
    return (shot.get('cap') or {}).get(lang) or shot[lang]


def ass_colour(hexrgb: str, k: float = 0.42) -> str:
    """The club colour, darkened, as an ASS outline (&HAABBGGRR)."""
    h = hexrgb.lstrip('#')
    r, g, b = (int(int(h[i:i + 2], 16) * k) for i in (0, 2, 4))
    return f'&H00{b:02X}{g:02X}{r:02X}'


def music_plan(ep: dict, shots: list[dict], total: float, xf: float = 3.0) -> list[tuple]:
    """(file, start, length, fade-in, fade-out) for each music cue in the script's `music` list. A cue starts at its
    shot and runs into the next cue by `xf` seconds; the last one closes with the film."""
    index = {t['id']: t for t in json.loads((MUSIC_DIR / 'index.json').read_text())['tracks']}
    starts = {s['shot']['id']: s['start'] for s in shots}
    cues = ep.get('music') or [{'track': 'zambolino-lighthearted', 'from': shots[0]['shot']['id']}]
    out = []
    for j, c in enumerate(cues):
        t = index[c['track']]
        assert t.get('owner'), f"{c['track']}: only tracks the owner supplied score a film"
        path = MUSIC_DIR / t['file']
        if not path.exists():
            raise SystemExit(f'music missing: {path} (fetch it from the owner\'s Drive into kit/music/cache/owner/)')
        a = starts[c['from']] if j else 0.0
        b = starts[cues[j + 1]['from']] + xf if j + 1 < len(cues) else total
        out.append((path, max(0.0, a - (xf if j else 0)), b - max(0.0, a - (xf if j else 0)), xf if j else 1.5,
                    xf if j + 1 < len(cues) else 3.5))
    return out


def sfx_events(shots: list[dict], night: bool = False) -> list[tuple]:
    """(file, time, level): a soft sound under every cut, a pop when a card lands, a sparkle with the confetti.
    At night (owner, 13.11.2026: "the crowd and the confetti stress even me — how will a child fall asleep?") there is
    no crowd, no whistle, no confetti and no cut sound at all: only a faint music-box twinkle as a card fades in."""
    ev = []
    for k, s in enumerate(shots):
        v = s['shot'].get('visual', {})
        if night:
            for g in v.get('tags', []) + v.get('crests', []):
                ev.append((NIGHT_SFX / 'night-twinkle.wav', s['start'] + g['at'] * s['dur'] + 0.3, 0.07))
            continue
        f, lv = CUT_SFX[s['cut']]
        if k and f:
            ev.append((f, s['start'], lv))
        for g in v.get('tags', []) + v.get('crests', []):
            ev.append((KIT_SFX / 'pop.mp3', s['start'] + g['at'] * s['dur'] + 0.12, 0.12))
        if v.get('confettiAt') is not None:
            ev.append((KIT_SFX / 'sparkle.mp3', s['start'] + v['confettiAt'] * s['dur'], 0.28))
            ev.append((LIFE_SFX / 'crowd-claps.m4a', s['start'] + v['confettiAt'] * s['dur'], 0.22))
        for x in v.get('sfx', []):                                   # the owner's crowd, a whistle, a kick — by name
            ev.append((LIFE_SFX / f"{x['file']}.m4a", s['start'] + x['at'] * s['dur'], x.get('level', 0.3)))
    return ev


def main() -> None:
    ep_path, work, narr, outd = (Path(a) for a in sys.argv[1:5])
    ep = json.loads(ep_path.read_text())
    outd.mkdir(parents=True, exist_ok=True)
    langs = [l for l in ep['voice'] if l != 'chosen']
    if ep.get('night'):
        global LEAD, TAIL
        LEAD, TAIL = NIGHT_LEAD, NIGHT_TAIL
    fb, fs = work / 'Fraunces-Black-Soft.ttf', work / 'Fraunces-Bold.ttf'
    shots = plan(ep, narr, langs)
    total = shots[-1]['start'] + shots[-1]['dur']
    crests = {k: Image.open(REPO / v).convert('RGBA') for k, v in ep.get('crests', {}).items()}
    red = tuple(int(ep['palette']['primary'][i:i + 2], 16) for i in (1, 3, 5))
    sources = [Source(work, s['shot']['plate'], s['dur'], seed=k + 1) for k, s in enumerate(shots)]
    deep = tuple(int(c * .62) for c in red)
    light = tuple(int(c + (255 - c) * .45) for c in red)
    hexes = ep['palette'].get('confetti')                      # a club whose colours are two (AEK: gold and black)
    paper = ([tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in hexes] if hexes
             else [red, red, deep, light, (246, 240, 228), (246, 240, 228), pt.KRAFT])
    party = [pt.Celebration(paper, (W, H), seed=k + 5)
             for k in range(4)]

    NIGHT = bool(ep.get('night'))
    motes = nt.Motes() if NIGHT else None
    lamps = {}                                                   # shot index -> nt.Lamps, built on first use

    def night_draw(k: int, t: float) -> Image.Image:
        """A Good Night frame: one slow glide, the lamps switching off on the count, every card arriving by a slow
        fade, no punch-ins and no confetti (owner, 13.11.2026)."""
        s, src = shots[k], sources[k]
        v = s['shot'].get('visual', {})
        frame = None
        if v.get('lights'):
            if k not in lamps:
                lamps[k] = nt.Lamps(src.frames[0], v['lights'])
            spoken = s['lens'].get('he', next(iter(s['lens'].values())))
            levels = [1 - nt.smooth((t - (LEAD + f * spoken)) / 0.55) for f in v.get('lightsAt', [])]
            frame = lamps[k].at(levels)
        img = src.at(t, tuple(v.get('push', (1.0, 1.06))), tuple(v.get('centre', (.5, .5))), night=True,
                     frame_override=frame)
        for c in v.get('crests', []):
            tc = t - c['at'] * s['dur']
            if tc > 0:
                img = nt.soft_in(img, crest_card(img, 9.0, crests[c['crest']], c['xy'], c['size']), tc, 1.6)
        for g in v.get('tags', []):
            tg = t - g['at'] * s['dur']
            if tg > 0:
                landed = tag(img, 9.0, g['text'], tuple(g['xy']), fb if g.get('big', True) else fs, g.get('size', 84),
                             g.get('sub', ''), fs, rot=g.get('rot'))
                img = nt.soft_in(img, landed, tg, 1.2)
        if v.get('wordmarkAt') is not None:
            img = pt.wordmark(img, t - v['wordmarkAt'] * s['dur'], fb, fs, tag=v.get('wordmarkTag', ''), accent=red)
        return img

    def draw(k: int, t: float) -> Image.Image:
        if NIGHT:
            return night_draw(k, t)
        s, src = shots[k], sources[k]
        v = s['shot'].get('visual', {})
        punch, aim = 0.0, (.5, .5)
        for pu in v.get('punch', []):                                # each punch adds a gentle 7% push over 0.6 s
            q = tr._ease_io((t - pu * s['dur']) / 0.6)
            if q > 0:
                punch += 0.07 * q
                hit = next((g for g in v.get('tags', []) if abs(g['at'] - pu) < 1e-6), None)
                if hit:
                    aim = (hit['xy'][0] / W * .5 + .25, hit['xy'][1] / H * .5 + .25)
        img = src.at(t, tuple(v.get('push', (1.0, 1.06))), tuple(v.get('centre', (.5, .5))), punch, aim)
        u = t / s['dur']                                              # where in the shot, 0..1
        for c in v.get('crests', []):
            img = crest_card(img, t - c['at'] * s['dur'], crests[c['crest']], c['xy'], c['size'],
                             crests.get(c.get('flipTo')), c.get('flipAt', 9) * s['dur'] - c['at'] * s['dur'])
        for g in v.get('tags', []):
            img = tag(img, t - g['at'] * s['dur'], g['text'], tuple(g['xy']), fb if g.get('big', True) else fs,
                      g.get('size', 84), g.get('sub', ''), fs, rot=g.get('rot'))
        if v.get('confettiAt') is not None:
            img = party[k % 4].draw(img, t - v['confettiAt'] * s['dur'])
        if v.get('wordmarkAt') is not None:
            img = pt.wordmark(img, t - v['wordmarkAt'] * s['dur'], fb, fs, tag=v.get('wordmarkTag', ''), accent=red)
        if u > 1:
            pass
        return img

    def frames():
        n = int(total * FPS)
        for i in range(n):
            gt = i / FPS
            k = max(j for j, s in enumerate(shots) if s['start'] <= gt + 1e-9)
            if k >= 2:
                sources[k - 2].drop()
            t = gt - shots[k]['start']
            fr = draw(k, t)
            cut = shots[k]['cut']
            if NIGHT:                                            # at night every cut is a long, slow cross-dissolve
                d = 2.6 if k == 0 else NIGHT_DISSOLVE
                if t < d:
                    q = nt.smooth(t / d)
                    if k == 0:
                        fr = Image.fromarray((np.asarray(fr, dtype=np.float32) * q).astype(np.uint8))
                    else:
                        fr = Image.blend(draw(k - 1, shots[k - 1]['dur'] + t), fr, q)
                fr = motes.draw(fr, gt, min(1.0, gt / 4.0))
                end = 3.5
            else:
                d = tr.DURATION[cut]
                if t < d:
                    prev = draw(k - 1, shots[k - 1]['dur'] + t) if k > 0 else None
                    fr = tr.CUTS[cut](prev, fr, t / d)
                end = 0.6
            if gt > total - end:
                fr = Image.fromarray((np.asarray(fr, dtype=np.float32) * nt.smooth(max(0.0, (total - gt) / end))).astype(np.uint8))
            fr = pt.grain(fr, i, 1.6 if NIGHT else 2.2)
            if ep['palette'].get('bannedHue'):
                fr = deyellow(fr, tuple(ep['palette']['bannedHue']))
            yield sub.put_stamp(fr, gt, total)

    silent = outd / 'picture.mp4'
    if not silent.exists():
        pt.encode(frames(), silent)
    timing = []
    music = music_plan(ep, shots, total)
    events = sfx_events(shots, bool(ep.get('night')))
    for lang in langs:
        inputs, parts = [], []
        for k, s in enumerate(shots):
            inputs += ['-i', str(narr / f"{s['shot']['id']}-{lang}.wav")]
            ms = int((s['start'] + LEAD) * 1000)
            ln = s['lens'][lang]                                     # a soft edge on every take: no click at a cut
            parts.append(f'[{k}:a]aresample=48000,afade=t=in:d=0.025,afade=t=out:st={max(0.0, ln - 0.09):.3f}:d=0.09,'
                         f'adelay={ms}|{ms}[v{k}]')
        n = len(shots)
        fc = ';'.join(parts) + ';' + ''.join(f'[v{k}]' for k in range(n)) + f'amix=inputs={n}:normalize=0,volume=1.5,asplit=2[vo][key];'
        # the bed: the owner's warm, playful tracks in turn, crossfaded, ducked under the voice and lifted between lines
        for j, (path, start, length, fin, fout) in enumerate(music):
            inputs += ['-i', str(path)]
            ms = int(start * 1000)
            fc += (f'[{n + j}:a]aresample=48000,aloop=loop=-1:size=2e9,atrim=0:{length:.2f},asetpts=PTS-STARTPTS,'
                   f'afade=t=in:d={fin:.2f},afade=t=out:st={length - fout:.2f}:d={fout:.2f},adelay={ms}|{ms}[m{j}];')
        m0 = n + len(music)
        fc += (''.join(f'[m{j}]' for j in range(len(music))) + f'amix=inputs={len(music)}:normalize=0,volume={0.5 if ep.get("night") else 0.42},'
               f'atrim=0:{total:.2f}[bed];[bed][key]sidechaincompress=threshold=0.03:{'ratio=2:attack=120:release=900' if ep.get("night") else 'ratio=4:attack=60:release=500'}[mu];')
        for e, (path, at, level) in enumerate(events):
            inputs += ['-i', str(path)]
            ms = int(at * 1000)
            fc += f'[{m0 + e}:a]aresample=48000,volume={level},adelay={ms}|{ms}[x{e}];'
        fc += (''.join(f'[x{e}]' for e in range(len(events))) + f'amix=inputs={len(events)}:normalize=0[fx];')
        if ep.get('night'):                                          # a slow sea breathing under the whole night
            inputs += ['-i', str(NIGHT_SFX / 'night-ambience.wav')]
            fc += (f'[{m0 + len(events)}:a]aresample=48000,aloop=loop=-1:size=2e9,atrim=0:{total:.2f},asetpts=PTS-STARTPTS,'
                   f'volume=0.16,afade=t=in:d=4,afade=t=out:st={max(0.0, total - 5):.2f}:d=5[sea];'
                   f'[vo][mu][fx][sea]amix=inputs=4:normalize=0,alimiter=limit=0.95,atrim=0:{total:.2f}[a]')
        else:
            fc += f'[vo][mu][fx]amix=inputs=3:normalize=0,alimiter=limit=0.95,atrim=0:{total:.2f}[a]'
        mix = outd / f'mix-{lang}.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', fc, '-map', '[a]', '-ar', '48000', '-ac', '2',
                        str(mix)], check=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(mix), '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9', '-ar', '48000',
                        '-c:a', 'aac', '-b:a', '192k', str(outd / f'audio-{lang}.m4a')], check=True)
        # subtitles burned in the storybook face (owner, 12.11.2026); the clean picture stays as picture.mp4
        spans = [(s['start'] + LEAD, s['start'] + LEAD + s['lens'][lang], caption(s['shot'], lang),
                  'top' if s['shot'].get('visual', {}).get('wordmarkAt') is not None else 'bottom',
                  narr / f"{s['shot']['id']}-{lang}.wav") for s in shots]
        assf = outd / f'subs-{lang}.ass'
        assf.write_text(sub.ass(lang, spans, outline=ass_colour(ep['palette']['primary'])), encoding='utf-8')
        vf = f"ass={assf}:fontsdir={sub.FONTS}"
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(silent), '-i', str(outd / f'audio-{lang}.m4a'), '-map', '0:v',
                        '-map', '1:a', '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
                        '-c:a', 'copy', '-metadata:s:a:0', f'language={ {"en": "eng", "he": "heb", "el": "ell"}[lang]}',
                        '-movflags', '+faststart', str(outd / f'episode-{lang}.mp4')], check=True)
        mix.unlink()
        srt = []
        fmt = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(x * 1000 % 1000):03d}'
        for a, b, text, _, wav in spans:                             # the YouTube caption track: the same cues
            for t0, t1, c in sub.timed(text, a, b, wav):
                srt.append(f"{len(srt) + 1}\n{fmt(t0)} --> {fmt(t1)}\n{c}\n")
        (outd / f'captions-{lang}.srt').write_text('\n'.join(srt), encoding='utf-8')
    for s in shots:
        timing.append({'shot': s['shot']['id'], 'start': round(s['start'], 2), 'dur': round(s['dur'], 2), 'narration': s['lens']})
    (outd / 'timing.json').write_text(json.dumps({'total': round(total, 2), 'shots': timing}, indent=1))
    print(f'{total:.1f}s · {len(shots)} shots · {", ".join(langs)}')


if __name__ == '__main__':
    main()

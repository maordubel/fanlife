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
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from studio.fairytales import papertheatre as pt

REPO = Path(__file__).resolve().parents[4]
SFX = REPO / 'public/life/sfx'
MUSIC = REPO / 'scripts/football-stories/studio/kit/music/sports-atlasaudio-625740.mp3'
LEAD, TAIL, TURN = 0.55, 0.85, 0.5
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

    def at(self, t: float, push=(1.0, 1.06), centre=(.5, .5)) -> Image.Image:
        frames = self.frames
        ts = pt.stepped(t)                                            # on twos
        k = min(int(ts * self.speed * FPS), len(frames) - 1)
        rng = random.Random(self.seed * 1000 + int(ts * 12))
        u = pt.ease(t / max(self.dur, 0.1))
        z = push[0] + (push[1] - push[0]) * u
        cx, cy = centre
        if len(frames) == 1:                                          # a still drifts as well as pushes: a camera on a slider
            z += 0.04
            cx += 0.07 * (u - 0.5) * (1 if self.seed % 2 else -1)
            cy += 0.02 * (0.5 - u)
        return lens(frames[k], z, cx, cy, dx=rng.uniform(-1.1, 1.1), dy=rng.uniform(-0.9, 0.9))


def tag(img: Image.Image, t: float, text: str, xy: tuple[int, int], font: Path, size: int = 84, sub: str = '',
        sub_font: Path | None = None, colour=pt.CREAM, ink=pt.INK, rot: float | None = None) -> Image.Image:
    """A cut-card label with a brass pin, dropped in on twos."""
    if t <= 0:
        return img
    t = pt.stepped(t)
    f = ImageFont.truetype(str(font), size)
    fs = ImageFont.truetype(str(sub_font or font), max(30, int(size * 0.42)))
    probe = ImageDraw.Draw(Image.new('RGB', (4, 4)))
    tw = probe.textlength(text, font=f)
    sw = probe.textlength(sub, font=fs) if sub else 0
    cw, ch = int(max(tw, sw) + 70), int(size * 1.35 + (int(size * 0.42) + 18 if sub else 0))
    card = Image.new('RGBA', (cw + 40, ch + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    rng = random.Random(hash(text) & 0xffff)
    pts = [(20 + rng.randint(-3, 3), 20 + rng.randint(-3, 3)), (20 + cw + rng.randint(-3, 3), 20 + rng.randint(-3, 3)),
           (20 + cw + rng.randint(-3, 3), 20 + ch + rng.randint(-3, 3)), (20 + rng.randint(-3, 3), 20 + ch + rng.randint(-3, 3))]
    d.polygon(pts, fill=colour + (255,))
    d.text((20 + (cw - tw) / 2, 20 + size * 0.12), text, font=f, fill=ink + (255,))
    if sub:
        d.text((20 + (cw - sw) / 2, 20 + size * 1.32), sub, font=fs, fill=ink + (230,))
    d.ellipse((20 + cw // 2 - 11, 8, 20 + cw // 2 + 11, 30), fill=pt.BRASS + (255,), outline=(120, 90, 30, 255), width=2)
    p = pt.ease(min(t / 0.25, 1.0))
    r = (rot if rot is not None else rng.uniform(-5, 5)) * (1.6 - 0.6 * p)
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
    ts = pt.stepped(t)
    p = pt.ease(min(ts / 0.3, 1.0))
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
        out.append({'shot': s, 'start': t, 'dur': dur, 'lens': lens})
        t += dur
    return out


def main() -> None:
    ep_path, work, narr, outd = (Path(a) for a in sys.argv[1:5])
    ep = json.loads(ep_path.read_text())
    outd.mkdir(parents=True, exist_ok=True)
    langs = [l for l in ep['voice'] if l != 'chosen']
    fb, fs = work / 'Fraunces-Black-Soft.ttf', work / 'Fraunces-Bold.ttf'
    shots = plan(ep, narr, langs)
    total = shots[-1]['start'] + shots[-1]['dur']
    crests = {k: Image.open(REPO / v).convert('RGBA') for k, v in ep.get('crests', {}).items()}
    red = tuple(int(ep['palette']['primary'][i:i + 2], 16) for i in (1, 3, 5))
    sources = [Source(work, s['shot']['plate'], s['dur'], seed=k + 1) for k, s in enumerate(shots)]
    confetti = pt.Confetti((W * .5, H * .6), [red, (246, 240, 228), pt.KRAFT, red], n=120)

    def draw(k: int, t: float) -> Image.Image:
        s, src = shots[k], sources[k]
        v = s['shot'].get('visual', {})
        img = src.at(t, tuple(v.get('push', (1.0, 1.06))), tuple(v.get('centre', (.5, .5))))
        u = t / s['dur']                                              # where in the shot, 0..1
        for c in v.get('crests', []):
            img = crest_card(img, t - c['at'] * s['dur'], crests[c['crest']], c['xy'], c['size'],
                             crests.get(c.get('flipTo')), c.get('flipAt', 9) * s['dur'] - c['at'] * s['dur'])
        for g in v.get('tags', []):
            img = tag(img, t - g['at'] * s['dur'], g['text'], tuple(g['xy']), fb if g.get('big', True) else fs,
                      g.get('size', 84), g.get('sub', ''), fs, rot=g.get('rot'))
        if v.get('confettiAt') is not None:
            img = confetti.draw(img, t - v['confettiAt'] * s['dur'])
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
            if k > 0 and t < TURN:
                prev = draw(k - 1, shots[k - 1]['dur'] + t)
                fr = pt.page_turn(prev, fr, t / TURN)
            if gt > total - 0.6:
                fr = Image.fromarray((np.asarray(fr, dtype=np.float32) * max(0.0, (total - gt) / 0.6)).astype(np.uint8))
            fr = pt.grain(fr, i, 3.0)
            yield deyellow(fr, tuple(ep['palette']['bannedHue'])) if ep['palette'].get('bannedHue') else fr

    silent = outd / 'picture.mp4'
    if not silent.exists():
        pt.encode(frames(), silent)
    timing = []
    for lang in langs:
        inputs, parts = [], []
        for k, s in enumerate(shots):
            inputs += ['-i', str(narr / f"{s['shot']['id']}-{lang}.wav")]
            ms = int((s['start'] + LEAD) * 1000)
            parts.append(f'[{k}:a]aresample=48000,adelay={ms}|{ms}[v{k}]')
        n = len(shots)
        inputs += ['-i', str(MUSIC), '-i', str(SFX / 'page.m4a')]
        turns = ''.join(f'[{n + 1}:a]adelay={int(s["start"] * 1000)}|{int(s["start"] * 1000)},volume=0.7[p{k}];'
                        for k, s in enumerate(shots) if k > 0)
        pages = ''.join(f'[p{k}]' for k in range(1, n))
        fc = (';'.join(parts) + ';' + ''.join(f'[v{k}]' for k in range(n)) + f'amix=inputs={n}:normalize=0,volume=1.5[vo];'
              f'[{n}:a]aloop=loop=-1:size=2e9,atrim=0:{total:.2f},asetpts=PTS-STARTPTS,volume=0.075,'
              f'afade=t=in:d=1.5,afade=t=out:st={total - 2.5:.2f}:d=2.5[mu];' + turns +
              f'{pages}amix=inputs={n - 1}:normalize=0[pg];'
              f'[vo][mu][pg]amix=inputs=3:normalize=0,alimiter=limit=0.95,atrim=0:{total:.2f}[a]')
        mix = outd / f'mix-{lang}.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', fc, '-map', '[a]', '-ar', '48000', '-ac', '2',
                        str(mix)], check=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(mix), '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9', '-ar', '48000',
                        '-c:a', 'aac', '-b:a', '192k', str(outd / f'audio-{lang}.m4a')], check=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(silent), '-i', str(outd / f'audio-{lang}.m4a'), '-map', '0:v',
                        '-map', '1:a', '-c', 'copy', '-metadata:s:a:0', f'language={ {"en": "eng", "he": "heb", "el": "ell"}[lang]}',
                        '-movflags', '+faststart', str(outd / f'episode-{lang}.mp4')], check=True)
        mix.unlink()
        srt = []
        for k, s in enumerate(shots):
            a = s['start'] + LEAD
            b = a + s['lens'][lang]
            fmt = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(x * 1000 % 1000):03d}'
            srt.append(f"{k + 1}\n{fmt(a)} --> {fmt(b)}\n{s['shot'][lang]}\n")
        (outd / f'captions-{lang}.srt').write_text('\n'.join(srt), encoding='utf-8')
    for s in shots:
        timing.append({'shot': s['shot']['id'], 'start': round(s['start'], 2), 'dur': round(s['dur'], 2), 'narration': s['lens']})
    (outd / 'timing.json').write_text(json.dumps({'total': round(total, 2), 'shots': timing}, indent=1))
    print(f'{total:.1f}s · {len(shots)} shots · {", ".join(langs)}')


if __name__ == '__main__':
    main()

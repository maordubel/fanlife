"""The subscribe call (RULES §8). Every I WAS THERE film and reel asks the viewer to join, in the terrace's own voice:
never "smash that like button", always football, always the stand. Three pieces, all drawn on the studio kit:

  · the STUB   — a season-ticket stub with a SUBSCRIBE button slides in, a cursor taps it, it flips to
                 SUBSCRIBED with a stamp. Once per film, after the first chapter has earned it; never over a goal.
  · the END    — the end card's line and the narrator's last sentence ask for the follow.
  · the SCARF  — when the owner's scarf art is in `public/brand/fanlife/iwt/` (ART-BRIEF-SUBSCRIBE.md) it is raised
                 behind the stub; until then the stub stands alone and nothing is drawn in its place.

The words come from `series.json → subscribe` and rotate by episode number, so the channel does not repeat itself.
"""
from __future__ import annotations

import html
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

from studio.common import INK, PAPER, ROOT, hex_rgb
from studio.edit import fit, pop, slide_in
from studio.motion import Layer, Pose, clamp, ease_in_out, ease_out_cubic

HERE = Path(__file__).resolve().parent
COPY = json.loads((HERE / 'series.json').read_text())['subscribe']
ART = ROOT / 'public' / 'brand' / 'fanlife' / 'iwt'


def pick(kind: str, episode: int) -> str:
    pool = COPY[kind]
    return pool[(max(1, episode) - 1) % len(pool)]


def _img(p) -> Image.Image:
    im = Image.open(p).convert('RGBA')
    box = im.getchannel('A').getbbox()
    return im.crop(box) if box else im


def stub(sp, key: str, kicker: str, done: bool) -> Image.Image:
    """The season-ticket stub, in its two states. Drawn by the studio's own sprite kit (fonts, plates, second print)."""
    btn = ('<span style="display:inline-flex;align-items:center;gap:14px;background:var(--ink);color:var(--paper);'
           'border:5px solid var(--ink);padding:12px 26px 8px;font-size:46px" class="head">✓ SUBSCRIBED</span>') if done else \
          ('<span style="display:inline-flex;align-items:center;gap:14px;background:var(--accent);color:var(--paper);'
           'border:5px solid var(--ink);padding:12px 26px 8px;font-size:46px;box-shadow:6px 6px 0 var(--ink)" class="head">'
           '<svg width="34" height="34" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z"/></svg>'
           'SUBSCRIBE</span>')
    body = f'''<div class="sh"></div><div class="box" style="width:760px;display:grid;grid-template-columns:1fr 120px">
      <div style="padding:0 0 26px">
        <div class="bar" style="padding:12px 28px;font-size:24px">FAN LIFE · I WAS THERE · Season ticket</div>
        <div style="padding:24px 28px 10px">{btn}</div>
        <div class="caps fit" data-fit="560" style="font-size:28px;padding:6px 30px 0">{html.escape(kicker)}</div></div>
      <div class="lines" style="border-left:6px dashed var(--ink);opacity:.9"></div></div>'''
    return _img(sp.render(f'sub-{key}-{"done" if done else "ask"}', body))


def cursor(scale: float = 1.0) -> Image.Image:
    """A pointer in the house inks: paper fill, ink outline, a hard ink shadow (the second plate, not a blur)."""
    s = int(64 * scale)
    pts = [(0, 0), (0, 46), (12, 35), (21, 56), (30, 52), (21, 32), (37, 32)]
    pts = [(x * scale, y * scale) for x, y in pts]
    im = Image.new('RGBA', (s + 12, s + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(x + 6, y + 6) for x, y in pts], fill=hex_rgb(INK) + (255,))
    d.polygon([(x + 2, y + 2) for x, y in pts], fill=hex_rgb(PAPER) + (255,), outline=hex_rgb(INK) + (255,), width=max(3, int(4 * scale)))
    return im


def until(pose, t_end: float, fade: float = 0.25):
    def p(t):
        q = pose(t)
        if q is None or t >= t_end + fade:
            return None
        if t > t_end:
            q = Pose(q.x, q.y, q.scale, q.rot, q.alpha * (1 - (t - t_end) / fade), q.reveal)
        return q
    return p


def stub_layers(sp, key: str, kicker: str, x: float, y: float, t0: float, hold: float, max_w: int, cues: list) -> list[Layer]:
    """Slide in · the cursor travels and taps · the stub flips to SUBSCRIBED with a stamp · slides away."""
    ask = fit(stub(sp, key, kicker, False), max_w, 400)
    done = fit(stub(sp, key, kicker, True), max_w, 400)
    t_tap, t_out = t0 + 1.25, t0 + hold
    # the button sits in the stub's upper-left third; aim the cursor there (fractions of the stub, not pixels)
    bx, by = x - ask.width * 0.5 + ask.width * 0.24, y - ask.height * 0.5 + ask.height * 0.42
    cur = cursor(1.2 if max_w > 600 else 1.0)
    layers: list[Layer] = []
    scarf = ART / 'subscribe-scarf.png'
    if scarf.exists():
        sc = fit(_img(scarf), int(max_w * 1.25), 520)
        layers.append(Layer(sc, until(slide_in(x, y - ask.height * 0.55, t0 + 0.15, frm=(0, 340), rot0=-4, rot1=-1, dur=0.6, drift=True), t_out), settle=1e9))
    layers.append(Layer(ask, until(slide_in(x, y, t0, frm=(max_w + 200, 0), rot0=3, rot1=-1.5, dur=0.55, drift=False), t_tap), settle=1e9))

    def flip(t):
        if t < t_tap:
            return None
        k = ease_out_cubic(clamp((t - t_tap) / 0.22))
        return Pose(x, y, 1.08 - 0.08 * k, -1.5, 1.0)
    layers.append(Layer(done, until(flip, t_out), settle=1e9))
    stamp = ART / 'subscribed-stamp.png'
    if stamp.exists():
        st = fit(_img(stamp), int(ask.height * 1.1), int(ask.height * 1.1))
        layers.append(Layer(st, until(pop(x + ask.width * 0.30, y, t_tap + 0.08, dur=0.25, rot=-8, scale=1.0), t_out), settle=1e9))

    def travel(t):
        if t < t0 + 0.55:
            return None
        k = ease_in_out(clamp((t - t0 - 0.55) / 0.65))
        sx, sy = x + max_w * 0.55, y + ask.height * 0.9
        px, py = sx + (bx - sx) * k, sy + (by - sy) * k
        press = 0.88 if t_tap <= t < t_tap + 0.12 else 1.0
        if t > t_tap + 0.15:      # after the tap the hand leaves the button, so the stamp reads
            k2 = ease_in_out(clamp((t - t_tap - 0.15) / 0.45))
            px, py = px + 160 * k2, py + 120 * k2
        return Pose(px + cur.width / 2 - 4, py + cur.height / 2 - 4, press, 0, 1.0)
    layers.append(Layer(cur, until(travel, t_tap + 0.7), settle=1e9))
    cues += [(t0, 'whoosh'), (t_tap, 'pop'), (t_tap + 0.05, 'stamp')]
    return layers

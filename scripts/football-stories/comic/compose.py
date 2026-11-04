"""CLASSIFIED composer: the owner's panels (or photographs) → a living comic, H.264 1080p25.

    python3 scripts/football-stories/comic/compose.py --episode scripts/football-stories/comic/episodes/file01-demo.json \
        --panels /tmp/classified-panels --out /tmp/file01-demo.mp4 [--vertical] [--audio voice.wav] [--timing t.json]
        [--stills 0.5,3.2] [--report r.json] [--no-model] [--missing slate|skip|fail]

The owner's pictures are used exactly as supplied — never blurred, cropped to anonymise or rejected (owner decision
4.11.2026). Depth layers move them; code draws the effects and the lettering on top. Neither the pictures nor the
render may be written inside the repository: an --out there is refused.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from comic import camera as cam  # noqa: E402
from comic import episode as epi  # noqa: E402
from comic import fx  # noqa: E402
from comic import layers as lay  # noqa: E402
from comic import letter  # noqa: E402
from comic.manifest import Asset, load_manifest, scan_folder  # noqa: E402

REPO = HERE.parents[2]
FPS = 25


def inside_repo(p: Path) -> bool:
    p = Path(p).resolve()
    return p == REPO or REPO in p.parents


# ------------------------------------------------------------------ a prepared panel
class Prepared:
    """A picture's depth layers at working size, with its boil variants (drawn art only)."""

    def __init__(self, asset: Asset, allow_model: bool, log):
        self.asset = asset
        self.drawn = asset.drawn
        if asset.kind == 'cutout':
            rgba = lay.read_rgba(asset.path)
            self.wh = (rgba.shape[1], rgba.shape[0])
            self.method = 'alpha'
            self.bg = None
            self.sub = None
            self.fg = [rgba]
            self.centre = (.5, .5)
            self.par = 1.0
            return
        L = lay.load(asset.path, allow_model, log)
        self.method = L.method
        # when depth is only an estimate, the layers separate less (a guessed edge shown wide is a tear)
        self.par = 1.0 if L.method == 'depth-anything-v2-small' else .55
        self.wh = L.size
        self.centre = L.subject_centre()
        sub = np.dstack([L.sub, (L.a_sub * 255).astype(np.uint8)])
        fg = np.dstack([L.fg, (L.a_fg * 255).astype(np.uint8)])
        if self.drawn:
            amp = 1.5 * max(1.0, L.size[0] / 1920)
            maps = fx.boil_maps(L.size, 3, amp, seed=int(L.sha[:6], 16) % 997)
            w = fx.ink_weight(L.rgb)
            self.bg = fx.boiled(L.bg, w, maps)
            self.sub = fx.boiled(sub, w, maps)
            self.fg = fx.boiled(fg, w, maps)
        else:
            self.bg, self.sub, self.fg = [L.bg], [sub], [fg]

    def pick(self, seq, f):
        return seq[(f // 2) % len(seq)] if len(seq) > 1 else seq[0]


def slate(wh, text: str) -> Asset:
    """An honest stand-in for a panel the owner has not supplied: ink card, the panel's id. Never an invented picture."""
    import tempfile
    from PIL import Image, ImageDraw
    W, H = wh
    im = Image.new('RGB', (W, H), letter.INK)
    d = ImageDraw.Draw(im)
    f = letter.face('caps', 56)
    msg = f'PANEL NOT SUPPLIED · {text}'
    d.text(((W - f.getlength(msg)) / 2, H / 2 - 30), msg, font=f, fill=letter.PAPER)
    p = Path(tempfile.gettempdir()) / f'classified-slate-{text}.png'
    im.save(p)
    return Asset(f'slate-{text}', p, 'photo', 'slate')


# ------------------------------------------------------------------ the renderer
class Composer:
    def __init__(self, ep: dict, beats: list, assets: dict[str, Asset], out_wh=(1920, 1080), allow_model=True,
                 missing='slate', log=print):
        self.ep, self.beats, self.assets, self.wh = ep, beats, assets, out_wh
        self.allow_model, self.log = allow_model, log
        self.fps = int(ep.get('fps', FPS))
        man = load_manifest()
        tone = ep.get('tone', 'LAUGH')
        self.tone = tone
        self.tone_rgb = letter.hex_rgb(man['tones'][tone]['color'])
        self.grade = float(ep.get('grade', .5))
        self.prepared: dict[str, Prepared] = {}
        self.sprites: dict = {}
        self.report = {'beats': [], 'missing': [], 'depth': {}}
        keep = []
        for i, b in enumerate(beats):
            if b.panel not in assets:
                self.report['missing'].append(b.panel)
                if missing == 'fail':
                    raise SystemExit(f'panel {b.panel} not supplied')
                if missing == 'skip':
                    continue
                assets[b.panel] = slate(out_wh, b.panel)
            keep.append(b)
        if missing == 'skip':   # re-lay the clock
            t = 0.0
            for j, b in enumerate(keep):
                b.start = t
                if j == 0:
                    b.transition, b.tdur = 'cut', 0.0
                t += b.dur
        self.beats = keep
        if self.report['missing']:
            log('missing panels: ' + ', '.join(self.report['missing']))

    # -- assets
    def prep(self, pid: str) -> Prepared:
        if pid not in self.prepared:
            t0 = time.time()
            p = Prepared(self.assets[pid], self.allow_model, self.log)
            self.prepared[pid] = p
            self.report['depth'][pid] = p.method
            self.log(f'prepared {pid} ({p.method}, {p.wh[0]}×{p.wh[1]}, {time.time() - t0:.1f}s)')
        return self.prepared[pid]

    def release_before(self, i: int) -> None:
        need = {b.panel for b in self.beats[max(0, i - 1):]}
        for k in list(self.prepared):
            if k not in need:
                del self.prepared[k]

    def sprite(self, key, make):
        if key not in self.sprites:
            self.sprites[key] = make()
        return self.sprites[key]

    # -- one beat at local time tl
    def impacts(self, b) -> list[float]:
        out = []
        for e in b.fx:
            if e['type'] == 'stamp':
                out.append(float(e.get('t0', 0)) + .14)
            elif e['type'] == 'smash':
                out.append(float(e.get('t0', 0)) + .05)
        if b.transition == 'smash':
            out.append(0.0)
        return out

    def render_beat(self, i: int, tl: float, f: int) -> np.ndarray:
        b = self.beats[i]
        P = self.prep(b.panel)
        W, H = self.wh
        vertical = H > W
        focus = b.focus
        if b.raw.get('focus') == 'subject':
            focus = P.centre
        if focus is None:
            focus = (.5, .5)
        if vertical:   # 9:16: the subject's centre across, the beat's own height
            focus = tuple(b.raw['focus_v']) if b.raw.get('focus_v') else (P.centre[0], focus[1])
        k = tl / b.dur
        view, start = cam.view_at(b.move, k, focus, b.amount, b.ease)
        dx = dy = rot = 0.0
        sc = 1.0
        shake = b.shake if b.shake is not None else (1.0 if self.tone == 'WAR' else 0.0)
        if shake:
            hx, hy, hr = cam.handheld(self.beats[i].start + tl, shake, seed=i)
            dx, dy, rot = dx + hx, dy + hy, rot + hr
            sc *= 1.012
        for t0 in self.impacts(b):
            ix, iy = cam.impact(tl, t0, 16 * H / 1080)
            dx, dy = dx + ix, dy + iy
            if 0 <= tl - t0 < .35:
                sc *= 1.01
        if b.transition == 'smash' and tl < .25:
            sc *= 1 + .07 * (1 - cam.ease_out(tl / .25))
        extra = (dx, dy, rot, sc)
        Mb = cam.layer_matrix(P.wh, self.wh, view, start, cam.PARALLAX['bg'], extra)
        out = None
        if P.bg is not None:
            bg = P.pick(P.bg, f)
            out = cv2.warpAffine(bg, Mb, self.wh, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
            layers_ = [(P.pick(P.sub, f), cam.PARALLAX['sub']), (P.pick(P.fg, f), cam.PARALLAX['fg'])]
        else:   # a cut-out alone: over the tone colour
            out = np.zeros((H, W, 3), np.float32) + np.asarray(self.tone_rgb, np.float32)
            layers_ = [(P.fg[0], cam.PARALLAX['fg'])]
        for img, p in layers_:
            M = cam.layer_matrix(P.wh, self.wh, view, start, p * P.par, extra)
            w = cv2.warpAffine(img, M, self.wh, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
            a = w[..., 3:4].astype(np.float32) * (1 / 255)
            out += (w[..., :3].astype(np.float32) - out) * a
        frame = np.clip(out, 0, 255).astype(np.uint8)
        ctx = {'W': W, 'H': H, 't': tl, 'f': f, 'seed': i + 1, 'speed': b.speed, 'M_bg': Mb, 'panel_wh': P.wh,
               'subject': P.centre}
        live = [e for e in b.fx if float(e.get('from', -1e9)) <= tl <= float(e.get('to', 1e9))]
        # cut-outs over the scene (pack assets: transparent PNGs as foreground layers)
        for e in live:
            if e['type'] == 'cutout' and e.get('asset') in self.assets:
                self.cutout(frame, e, view, start, extra, f)
        # panel-space lettering (glued to the paper) and overlays
        for e in live:
            t = e['type']
            if t == 'stamp':
                self.stamp(frame, ctx, e)
            elif t in fx.OVERLAYS:
                fx.OVERLAYS[t](frame, ctx, **{k_: v for k_, v in e.items() if k_ not in ('type', 'from', 'to')})
        frame = fx.look(frame, f, self.tone_rgb, P.drawn, self.grade)
        # screen lettering on top of the look
        for e in live:
            t = e['type']
            if t == 'smash':
                self.smash(frame, ctx, e, b.dur)
            elif t == 'caption':
                self.caption(frame, ctx, e)
            elif t == 'title':
                self.title(frame, ctx, e)
            elif t == 'tab':
                self.tab(frame, ctx, e)
        return frame

    # -- lettering
    def cutout(self, frame, e, view, start, extra, f):
        P = self.prep(e['asset'])
        img = P.fg[0]
        W, H = self.wh
        h_out = float(e.get('height', .7)) * H
        s = h_out / img.shape[0]
        cx, cy = e.get('at', (.5, .62))
        p = float(e.get('depth', 1.0))
        k = 1 + p * view.par
        z = start.z * (view.z / start.z) ** k
        ox = (view.cx - start.cx) * k * W * z * -1
        oy = (view.cy - start.cy) * k * H * z * -1
        dx, dy, rot, sc = extra
        M = fx.sprite_matrix((img.shape[1], img.shape[0]), cx * W + ox + dx, cy * H + oy + dy, s * z * sc, rot)
        fx.blit(frame, img, M)

    def stamp(self, frame, ctx, e):
        tau = ctx['t'] - float(e.get('t0', 0))
        if tau < 0:
            return
        spr = self.sprite(('stamp', e.get('text', 'CLASSIFIED')), lambda: letter.stamp(e.get('text', 'CLASSIFIED'), letter.RED))
        Wp, Hp = ctx['panel_wh']
        at = e.get('at', (.5, .5))
        base = float(e.get('scale', 1.0)) * Hp * .2 / spr.shape[0]
        hit = .14
        if tau < hit:
            k = tau / hit
            s, op = base * (2.2 - 1.2 * k * k), .25 + .75 * k
        else:
            s, op = base, 1.0
        rot = float(e.get('rot', -8))
        Ms = fx.sprite_matrix((spr.shape[1], spr.shape[0]), at[0] * Wp, at[1] * Hp, s, rot)
        M = np.vstack([ctx['M_bg'], [0, 0, 1]]) @ np.vstack([Ms, [0, 0, 1]])
        M = M[:2].astype(np.float32)
        if tau >= hit:   # the ink bleeds into the paper
            b = min(1.0, (tau - hit) / .7)
            bleed = self.sprite(('stamp-bleed', e.get('text', 'CLASSIFIED')), lambda: _bleed(spr))
            fx.blit(frame, bleed, M, .32 * b, 'multiply')
            if tau - hit < .05:   # the thump: a frame of shadow
                fx.overlay(frame, (21, 19, 15), np.full(frame.shape[:2], .16, np.float32))
        fx.blit(frame, spr, M, op * .96, 'multiply')

    def smash(self, frame, ctx, e, dur):
        tau = ctx['t'] - float(e.get('t0', 0))
        if tau < 0:
            return
        text = e.get('text', 'SMASH!')
        spr = self.sprite(('smash', text), lambda: letter.shout(text, 260, letter.RED))
        W, H = ctx['W'], ctx['H']
        at = e.get('at', (.5, .46))
        fit = min(1.0, W * .82 / spr.shape[1])
        size = float(e.get('size', 1.0)) * fit * H / 1080
        if tau < .26:
            s = 2.5 - 1.5 * cam.back(tau / .26)
        else:
            s = 1 + .018 * math.sin((tau - .26) * 7)
        rot = float(e.get('rot', -7)) + 5 * math.exp(-tau * 9) * math.sin(tau * 40)
        jx, jy = cam.impact(tau, 0, 10 * H / 1080, .3)
        end = dur - ctx['t']
        op = min(1.0, tau / .05) * (min(1.0, end / .12) if e.get('fade_out', True) else 1.0)
        M = fx.sprite_matrix((spr.shape[1], spr.shape[0]), at[0] * W + jx, at[1] * H + jy, s * size, rot)
        fx.blit(frame, spr, M, op)

    def caption(self, frame, ctx, e):
        tau = ctx['t'] - float(e.get('t0', .2))
        if tau < 0:
            return
        text = e['text']
        lines = e.get('lines') or _wrap(text, int(e.get('chars', 34)))
        key = ('cap', text, e.get('label', ''))
        card, glyphs = self.sprite(key, lambda: letter.caption_card(lines, e.get('label', ''), int(e.get('width', 860))))
        n = min(int(tau * float(e.get('cps', 32))), len(glyphs))
        blink = n < len(glyphs) or (ctx['f'] // 8) % 2 == 0
        img = letter.type_on(card, glyphs, n, blink)
        W, H = ctx['W'], ctx['H']
        fit = min(1.0, W * .9 / img.shape[1]) * H / 1080 if W > H else min(1.0, W * .9 / img.shape[1])
        k = cam.ease_out(min(1.0, tau / .3))
        pos = e.get('pos', 'tl')
        x0 = W * .055 + img.shape[1] * fit / 2 if 'l' in pos else W - W * .055 - img.shape[1] * fit / 2
        y0 = H * .085 + img.shape[0] * fit / 2 if 't' in pos else H - H * .12 - img.shape[0] * fit / 2
        M = fx.sprite_matrix((img.shape[1], img.shape[0]), x0 - (1 - k) * 60, y0, fit, float(e.get('rot', -1.2)))
        fx.blit(frame, img, M, k)

    def title(self, frame, ctx, e):
        tau = ctx['t'] - float(e.get('t0', .3))
        if tau < 0:
            return
        num, ttl = self.ep.get('number', '00'), self.ep.get('title', '')
        spr = self.sprite(('title',), lambda: letter.title_card(num, ttl, self.tone, self.tone_rgb))
        W, H = ctx['W'], ctx['H']
        fit = min(H / 1080, W * .88 / spr.shape[1])
        s = (1.6 - .6 * cam.back(min(1, tau / .3))) * fit
        op = min(1.0, tau / .08)
        at = e.get('at', (.5, .7))
        jx, jy = cam.impact(tau, .28, 8 * H / 1080, .25)
        M = fx.sprite_matrix((spr.shape[1], spr.shape[0]), at[0] * W + jx, at[1] * H + jy, s, float(e.get('rot', -2.5)))
        fx.blit(frame, spr, M, op)

    def tab(self, frame, ctx, e):
        tau = ctx['t'] - float(e.get('t0', 0))
        if tau < 0:
            return
        spr = self.sprite(('tab',), lambda: letter.tone_tab(self.tone, self.tone_rgb, f"FILE {self.ep.get('number', '00')}"))
        W, H = ctx['W'], ctx['H']
        fit = H / 1080 if W > H else W / 1080
        k = cam.ease_out(min(1.0, tau / .35))
        x = W * .045 + spr.shape[1] * fit / 2 - (1 - k) * (spr.shape[1] * fit + 80)
        y = H - H * .07 - spr.shape[0] * fit / 2
        fx.blit(frame, spr, fx.sprite_matrix((spr.shape[1], spr.shape[0]), x, y, fit, 0), 1.0)

    # -- a frame of the film
    def frame(self, f: int) -> np.ndarray:
        t = f / self.fps
        i = epi.beat_at(self.beats, t)
        b = self.beats[i]
        tl = t - b.start
        cur = self.render_beat(i, tl, f)
        if i == 0 or b.tdur <= 0 or tl >= b.tdur:
            return cur
        prev = self.render_beat(i - 1, t - self.beats[i - 1].start, f)
        return transition(b.transition, prev, cur, tl / b.tdur, f)

    def warm(self) -> None:
        """Build (or read) every picture's layers once, in order, before the frames are shared out: the workers then
        read them from the cache, and the report knows which depth path each picture took."""
        for pid in dict.fromkeys(b.panel for b in self.beats):
            a = self.assets[pid]
            if a.kind == 'cutout':
                self.report['depth'][pid] = 'alpha'
                continue
            t0 = time.time()
            L = lay.load(a.path, self.allow_model, self.log)
            self.report['depth'][pid] = L.method
            self.log(f'layers {pid}: {L.method} ({time.time() - t0:.1f}s)')
        for b in self.beats:
            for e in b.fx:
                if e['type'] == 'cutout' and e.get('asset') in self.assets:
                    self.report['depth'][e['asset']] = 'alpha'

    def chunk(self, f0: int, f1: int) -> bytes:
        self.release_before(epi.beat_at(self.beats, f0 / self.fps))
        return b''.join(self.frame(f).tobytes() for f in range(f0, f1))

    def render(self, out: Path, audio: Path | None = None, stills: list[float] | None = None) -> dict:
        n = epi.frames(self.beats, self.fps)
        W, H = self.wh
        if stills:
            for s in stills:
                fr = self.frame(int(round(s * self.fps)))
                p = out.with_name(f'{out.stem}-{s:05.2f}.png')
                cv2.imwrite(str(p), cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
                self.report.setdefault('stills', []).append(str(p))
            return self.report
        self.warm()
        silent = out if audio is None else out.with_name(out.stem + '.silent.mp4')
        ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                               '-r', str(self.fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
                               '-pix_fmt', 'yuv420p', '-r', str(self.fps), '-movflags', '+faststart', str(silent)],
                              stdin=subprocess.PIPE)
        t0 = time.time()
        workers = max(1, int(os.environ.get('CLASSIFIED_WORKERS', os.cpu_count() or 1)))
        chunks = [(a, min(n, a + CHUNK)) for a in range(0, n, CHUNK)]
        done = 0
        if workers > 1 and len(chunks) > 1:
            global _WORKER
            _WORKER = self
            import multiprocessing as mp
            with mp.get_context('fork').Pool(workers) as pool:
                for data in pool.imap(_render_chunk, chunks):
                    ff.stdin.write(data)
                    done += len(data) // (W * H * 3)
                    if done % 100 < CHUNK:
                        self.log(f'frame {done}/{n} ({time.time() - t0:.0f}s, {workers} workers)')
            _WORKER = None
        else:
            for c in chunks:
                ff.stdin.write(self.chunk(*c))
                done = c[1]
                self.log(f'frame {done}/{n} ({time.time() - t0:.0f}s)')
        ff.stdin.close()
        if ff.wait() != 0:
            raise SystemExit('ffmpeg failed')
        if audio is not None:
            r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(silent), '-i', str(audio), '-map', '0:v', '-map', '1:a',
                                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)])
            silent.unlink(missing_ok=True)
            if r.returncode != 0:
                raise SystemExit('ffmpeg (audio) failed')
        self.report.update({'frames': n, 'fps': self.fps, 'size': [W, H], 'seconds': round(n / self.fps, 2),
                            'render_seconds': round(time.time() - t0, 1)})
        self.report['beats'] = [{'panel': b.panel, 'start': round(b.start, 3), 'dur': b.dur, 'move': b.move,
                                 'transition': b.transition} for b in self.beats]
        return self.report


CHUNK = 10
_WORKER = None


def _render_chunk(c):
    return _WORKER.chunk(*c)


def _bleed(spr: np.ndarray) -> np.ndarray:
    a = spr[..., 3].astype(np.float32)
    a = cv2.GaussianBlur(cv2.dilate(a, np.ones((5, 5), np.uint8)), (0, 0), 6)
    out = spr.copy()
    out[..., 3] = np.clip(a * 1.2, 0, 255).astype(np.uint8)
    return out


def _wrap(text: str, n: int) -> list[str]:
    words, lines, cur = text.split(), [], ''
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) > n:
            lines.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}' if cur else w
    if cur:
        lines.append(cur)
    return lines


# ------------------------------------------------------------------ transitions
def _hblur(img: np.ndarray, k: int) -> np.ndarray:
    k = max(1, int(k))
    return cv2.blur(img, (k, 1)) if k > 1 else img


def transition(kind: str, a: np.ndarray, b: np.ndarray, u: float, f: int) -> np.ndarray:
    H, W = a.shape[:2]
    u = min(1.0, max(0.0, u))
    if kind == 'fade':
        k = cam.ease_io(u)
        return cv2.addWeighted(a, 1 - k, b, k, 0)
    if kind == 'smash':   # a hard cut through a white flash
        out = b.copy()
        fx.overlay(out, (255, 251, 242), np.full((H, W), (1 - u) ** 1.4, np.float32))
        return out
    if kind == 'whip':
        k = cam.ease_io(u)
        blur = int(W * .18 * math.sin(math.pi * k)) | 1
        src, off = (a, -k * W * .55) if k < .5 else (b, (1 - k) * W * .55)
        M = np.float32([[1, 0, off], [0, 1, 0]])
        out = cv2.warpAffine(src, M, (W, H), borderMode=cv2.BORDER_REFLECT)
        out = _hblur(out, blur)
        # streaks: thin light lines across the frame
        r = np.random.default_rng(f)
        tmp = out.copy()
        for _ in range(int(40 * math.sin(math.pi * k))):
            y = int(r.uniform(0, H))
            cv2.line(tmp, (0, y), (W, y), (255, 251, 242), int(r.uniform(1, 4)), cv2.LINE_AA)
        cv2.addWeighted(tmp, .35, out, .65, 0, out)
        return out
    if kind in ('slide', 'turn'):
        k = cam.ease_out(u) if kind == 'slide' else cam.ease_io(u)
        if kind == 'slide':   # the next panel slides in over this one, inked, with its second plate
            base = a.copy()
            fx.overlay(base, (21, 19, 15), np.full((H, W), .22 * k, np.float32))
            x = int(W * (1 - k))
            out = base
            sh = int(H * .02)
            if 0 < x < W:   # the incoming panel's ink plate, along its leading edge
                x0 = max(0, x - sh)
                out[:, x0:x] = (out[:, x0:x].astype(np.float32) * .2 + 21 * .8).astype(np.uint8)
            if x < W:
                out[:, x:] = b[:, :W - x]
                cv2.line(out, (x, 0), (x, H), (21, 19, 15), max(4, int(H * .008)))
            return out
        # turn: this page lifts and swings away to the left, the next is under it
        out = b.copy()
        fx.overlay(out, (21, 19, 15), np.full((H, W), .35 * (1 - k), np.float32))
        edge = W * (1 - k)
        if edge > 2:
            lift = H * .06 * math.sin(math.pi * k)
            src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
            dst = np.float32([[edge - W, 0], [edge, -lift], [edge, H + lift], [edge - W, H]])
            Mp = cv2.getPerspectiveTransform(src, dst)
            page = cv2.warpPerspective(a, Mp, (W, H), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
            mask = cv2.warpPerspective(np.full((H, W), 255, np.uint8), Mp, (W, H))
            g = np.clip((np.arange(W, dtype=np.float32) - (edge - W * .18)) / (W * .18), 0, 1) ** 2 * .45
            page = (page.astype(np.float32) * (1 - g[None, :, None])).astype(np.uint8)
            m = mask[..., None].astype(np.float32) / 255
            out = (out * (1 - m) + page * m).astype(np.uint8)
            x = int(edge)
            if 0 < x < W:
                cv2.line(out, (x, 0), (x, H), (21, 19, 15), max(3, int(H * .006)))
        return out
    return b


# ------------------------------------------------------------------ CLI
def assets_from(args) -> dict[str, Asset]:
    man = load_manifest()
    assets: dict[str, Asset] = {}
    for d in args.panels or []:
        assets.update(scan_folder(Path(d), 'auto', man))
    for d in args.pack or []:
        assets.update(scan_folder(Path(d), 'auto', None))
    return assets


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--episode', type=Path, required=True)
    ap.add_argument('--panels', type=Path, action='append', help='a folder of CLASSIFIED panels (manifest names)')
    ap.add_argument('--pack', type=Path, action='append', help='a pack folder (01_Scenes / 02_Editing_Assets / …)')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--vertical', action='store_true', help='9:16 for Shorts, reframed on the subject')
    ap.add_argument('--audio', type=Path)
    ap.add_argument('--timing', type=Path)
    ap.add_argument('--stills', default='')
    ap.add_argument('--report', type=Path)
    ap.add_argument('--no-model', action='store_true')
    ap.add_argument('--missing', choices=('slate', 'skip', 'fail'), default='slate')
    a = ap.parse_args(argv)
    if inside_repo(a.out):
        print(f'refused: {a.out} is inside the repository — renders are never stored there', file=sys.stderr)
        return 2
    a.out.parent.mkdir(parents=True, exist_ok=True)
    timing = json.loads(a.timing.read_text()) if a.timing else None
    ep, beats = epi.load(a.episode, timing)
    log = lambda m: print(time.strftime('%H:%M:%S'), m, flush=True)
    c = Composer(ep, beats, assets_from(a), (1080, 1920) if a.vertical else (1920, 1080), not a.no_model, a.missing, log)
    rep = c.render(a.out, a.audio, [float(s) for s in a.stills.split(',') if s] or None)
    if a.report:
        a.report.write_text(json.dumps(rep, indent=2), encoding='utf-8')
    log(f"done: {a.out} · depth {sorted(set(rep['depth'].values()))} · missing {rep['missing'] or 'none'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

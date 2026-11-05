"""CLASSIFIED on VOX's case board (comic/casefile.py) — owner, 5.11.2026: "a feeling of epilepsy, the pictures shake,
they're not clear. Take the VOX atmosphere there too."

What is measured here, on stand-in panels with no network: frame to frame the picture does not flicker (mean luma)
and does not shake (phase correlation) while a beat holds; the owner's picture on its print is as sharp as the picture
itself at that size; the old flickering effects are never drawn; the camera glides without a jerk; the CLASSIFIED stamp
lands once per chapter; VERSION A and VERSION B lie side by side; the highlighter only goes over a source's own quoted
words; nothing on the board is a yellow. The approval gate is in test_produce (unchanged)."""
from __future__ import annotations

import copy
import json
import math
import os
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

os.environ.setdefault('CLASSIFIED_WORKERS', '1')

from comic import casefile, dummy, episode, produce  # noqa: E402
from comic.manifest import load_manifest, scan_folder  # noqa: E402
from studio.vox import elements as E  # noqa: E402

HERE = Path(__file__).resolve().parents[1]
FILE01 = HERE / 'episodes' / 'file01-the-bottle.json'
SIZE = (480, 270)


def _yellow(rgb: np.ndarray) -> np.ndarray:
    """lib/isYellow.ts's band: hue 38–70°, saturation ≥ 0.35 (and not near-black)."""
    hsv = cv2.cvtColor(rgb.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV_FULL).reshape(-1, 3).astype(np.float32)
    h, s, v = hsv[:, 0] * 360 / 256, hsv[:, 1] / 255, hsv[:, 2] / 255
    return (h >= 38) & (h <= 70) & (s >= 0.35) & (v >= 0.2)


def episode_ep(beats=None) -> tuple[dict, list]:
    ep = json.loads(FILE01.read_text(encoding='utf-8'))
    for b in ep['beats']:
        if b['panel'].startswith('@'):
            b['panel'] = 'f01-ch-a'
    if beats:
        ep['beats'] = [b for b in ep['beats'] if b['id'] in beats]
        ep['beats'][0]['chapter'] = ep['beats'][0].get('chapter') or 'Cold open'
    return episode.load(produce.with_follow(ep) if not beats else ep)


class _Film(unittest.TestCase):
    beats = ('b06', 'b07', 'b08', 'b09', 'b15', 'b16', 'b25', 'b30')

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        t = Path(cls.tmp.name)
        cls.panels = t / 'panels'
        dummy.write_all(cls.panels, (960, 540), 'file01')
        cls.assets = scan_folder(cls.panels, 'auto', load_manifest())
        cls._centre = casefile.CaseFilm.centre
        casefile.CaseFilm.centre = lambda self, pid: (0.42, 0.45)   # the depth model is not what is tested here
        ep, beats = episode_ep(cls.beats)
        cls.film = casefile.CaseFilm(ep, beats, cls.assets, SIZE, False, 'slate', lambda m: None, work=t / 'vox')

    @classmethod
    def tearDownClass(cls):
        casefile.CaseFilm.centre = cls._centre
        cls.tmp.cleanup()

    def n_of(self, bid: str) -> int:
        return next(i + 1 for i, b in enumerate(self.film.beats) if b.raw['id'] == bid)

    def held(self, bid: str) -> tuple[int, int]:
        """The frames of a beat after every piece on it has settled and before the camera leaves."""
        f, n = self.film, self.n_of(bid)
        s = f.shots[n]
        P = f.panel(n)
        last = max([e.settle for e in P.els if e.settle < 1e8] + [0.0])
        j = f.order.index(n)
        post = f.cam.win[j]['post']
        pre = f.cam.win[j + 1]['pre'] if j + 1 < len(f.order) else 0.0
        a = s['start'] + max(last, post) + 0.1
        b = s['start'] + s['frames'] / f.fps - pre - 0.1
        return int(math.ceil(a * f.fps)), int(b * f.fps)


class Steady(_Film):
    def test_no_flicker_and_no_shake_while_a_beat_holds(self):
        for bid in ('b07', 'b09', 'b16', 'b25', 'b30'):
            a, b = self.held(bid)
            self.assertGreater(b - a, 10, bid)
            n = self.n_of(bid)
            still = self.film.beats[n - 1].move in casefile.STILL_MOVES and self.film.shots[n]['visual']['type'] == 'print'
            prev, last = None, None
            for fr in range(a, b):
                g = cv2.cvtColor(self.film.frame(fr), cv2.COLOR_RGB2GRAY).astype(np.float32)
                if prev is not None:
                    # a lamp flicker or a flash frame moved the mean by 20–100 levels in the living comic (measured)
                    self.assertLess(abs(g.mean() - prev.mean()), 0.35 if still else 1.0, f'{bid} frame {fr}: the light jumped')
                    (sx, sy), _ = cv2.phaseCorrelate(prev, g)
                    if still:   # nothing moves: nothing may change
                        self.assertLess(np.abs(g - prev).mean(), 1.2, f'{bid} frame {fr}: the picture boils')
                        self.assertLess(math.hypot(sx, sy), 0.6, f'{bid} frame {fr}: the picture shook')
                    elif last is not None:   # a slow camera move: the same small step every frame, never a jitter
                        self.assertLess(math.hypot(sx - last[0], sy - last[1]), 0.45, f'{bid} frame {fr}: the picture jittered')
                    last = (sx, sy)
                prev = g

    def test_the_camera_never_jerks(self):
        """Screen speed of the board under the camera, frame to frame: a glide speeds up and slows down, it never
        jumps (the change of speed in one frame stays small) — chapter changes lift off and settle instead."""
        f = self.film
        prev_v, prev_p = None, f.cam.pose(0.0)
        worst = 0.0
        for fr in range(1, f.n_frames):
            p = f.cam.pose(fr / f.fps)
            if p.board == prev_p.board and not (p.through or p.arrive or prev_p.through or prev_p.arrive):
                v = math.hypot((p.cx - prev_p.cx) * p.z, (p.cy - prev_p.cy) * p.z) + abs(math.log(p.z / prev_p.z)) * 1000
                if prev_v is not None:
                    worst = max(worst, abs(v - prev_v))
                prev_v = v
            else:
                prev_v = None
            prev_p = p
        self.assertLess(worst, 13.0, 'a jerk in the camera path (px per frame, change in one frame, at 1920 wide)')

    def test_a_chapter_change_is_a_fade_not_a_cut(self):
        f = self.film
        n = self.n_of('b08')
        s0 = int(round(f.shots[n]['start'] * f.fps))
        prev = None
        for fr in range(s0 - 30, s0 + 40):
            g = cv2.cvtColor(f.frame(fr), cv2.COLOR_RGB2GRAY).astype(np.float32).mean()
            if prev is not None:
                self.assertLess(abs(g - prev), 6.0, f'frame {fr}')
            prev = g

    def test_the_old_flickering_effects_are_not_drawn(self):
        dropped = self.film.report['dropped_fx']
        for k in ('flash', 'stars', 'shards', 'speedlines'):
            self.assertIn(k, dropped)   # b06 asked for them: the board left them out
        for n in self.film.order:
            for e in self.film.panel(n).els:
                self.assertNotIn(type(e).__module__, ('comic.fx',))
            self.assertEqual(self.film.panel(n).flash, [])
            self.assertEqual(self.film.panel(n).shake, [])
        src = (HERE / 'casefile.py').read_text(encoding='utf-8')
        for banned in ('fx.look', 'boil', 'handheld(', 'impact(', 'flashbulbs(', '_grain('):
            self.assertNotIn(banned, src.split('# ------------------------------------------------------------------ what one beat')[1])


class Sharp(_Film):
    beats = ('b07', 'b09')

    def test_the_print_is_as_sharp_as_the_picture(self):
        """On a held frame the owner's picture keeps its detail: the print's Laplacian energy against the source shrunk
        (INTER_AREA) to the size it has on screen. No blur except while the camera is moving."""
        f = self.film
        n = self.n_of('b09')
        a, b = self.held('b09')
        fr = (a + b) // 2
        img = f.frame(fr)
        p = f.cam.pose(fr / f.fps)
        w = f.where(n)
        g = f.panel(n)
        geo = None
        for e in g.els:
            if e.kind == 'photo':
                geo = e.rect
        self.assertIsNotNone(geo)
        x, y, ww, hh = geo
        inset = casefile.BORDER + 40
        X0, Y0 = f.screen(p, w['ox'] + x + inset, w['oy'] + y + inset)
        X1, Y1 = f.screen(p, w['ox'] + x + ww - inset, w['oy'] + y + hh - inset)
        X0, Y0 = max(0, int(X0)), max(0, int(Y0))
        X1, Y1 = min(img.shape[1], int(X1)), min(img.shape[0], int(Y1))
        crop = cv2.cvtColor(img[Y0:Y1, X0:X1], cv2.COLOR_RGB2GRAY)
        src = cv2.imread(str(self.assets[f.beats[n - 1].panel].path), cv2.IMREAD_GRAYSCALE)
        pw = ww - 2 * casefile.BORDER                       # the picture's width in panel units
        k = p.z * f.k * pw / src.shape[1]                   # source pixels → screen pixels
        ref = cv2.resize(src, (int(src.shape[1] * k), int(src.shape[0] * k)), interpolation=cv2.INTER_AREA)
        m = int(40 * p.z * f.k)
        ref = ref[m:ref.shape[0] - m, m:ref.shape[1] - m]
        e_out = cv2.Laplacian(crop.astype(np.float32), cv2.CV_32F).var()
        e_ref = cv2.Laplacian(ref.astype(np.float32), cv2.CV_32F).var()
        self.assertGreater(e_out / e_ref, 0.55, f'the print lost its detail ({e_out:.1f} vs {e_ref:.1f})')

    def test_the_whole_picture_is_on_the_print(self):
        f = self.film
        n = self.n_of('b09')
        B = casefile.CaseBuilder(f, f.shots[n], f.beats[n - 1], 1.25)
        B.print_(self.assets[f.beats[n - 1].panel].path)
        h, w = cv2.imread(str(self.assets[f.beats[n - 1].panel].path)).shape[:2]
        self.assertAlmostEqual(B.geo['pw'] / B.geo['ph'], w / h, places=2)   # contained, never cropped
        self.assertLessEqual(B.geo['pw'], casefile.PRINT_BOX[0] + 1e-6)
        self.assertLessEqual(B.geo['ph'], casefile.PRINT_BOX[1] + 1e-6)


class CaseFile(_Film):
    beats = ('b06', 'b07', 'b08', 'b09', 'b13', 'b14', 'b15', 'b16', 'b21', 'b25', 'b29', 'b30')

    def test_the_stamp_lands_once_per_chapter(self):
        f = self.film
        chap = f.chapter_of()
        per: dict = {}
        for n in f.order:
            k = sum(1 for e in f.panel(n).els if e.kind == 'stamp')
            per[chap[n - 1]] = per.get(chap[n - 1], 0) + k
        self.assertEqual(set(per.values()), {1}, per)
        self.assertEqual(len(per), 5)
        closed = f.panel(self.n_of('b29')).targets['stamp']
        self.assertEqual(closed[0], 'FILE 01 · CLOSED')   # the episode's own stamp text where it names one
        # it lands, it does not flash: no frame is brighter than the one before by more than a little
        n = self.n_of('b07')
        t0 = f.panel(n).targets['stamp'][1]
        s0 = f.shots[n]['start']
        prev = None
        for fr in range(int((s0 + t0 - 0.2) * f.fps), int((s0 + t0 + 0.8) * f.fps)):
            g = cv2.cvtColor(f.frame(fr), cv2.COLOR_RGB2GRAY).astype(np.float32)
            if prev is not None:
                self.assertLess(abs(g.mean() - prev.mean()), 1.5)   # no flash frame, no thump of shadow
            prev = g

    def test_version_a_and_b_lie_side_by_side(self):
        f = self.film
        a, b = f.where(self.n_of('b15')), f.where(self.n_of('b16'))
        self.assertEqual(a['board'], b['board'])
        self.assertLess(abs(a['oy'] - b['oy']), 200)
        self.assertLess(a['ox'], b['ox'])
        for bid, side in (('b15', 'l'), ('b16', 'r')):
            v = f.panel(self.n_of(bid)).targets['version']
            self.assertEqual(v[4], side)

    def test_the_highlighter_goes_over_a_quote_only(self):
        self.assertEqual(casefile.parse_source('Reuters via CNN — "Canizares ruled out by aftershave accident", 18 May 2002'),
                         ('Reuters via CNN', 'Canizares ruled out by aftershave accident', '18 May 2002'))
        self.assertIsNone(casefile.parse_source('Wikipedia / RSSSF — Iker Casillas (born 20 May 1981)')[1])
        f = self.film
        for n in f.order:
            P = f.panel(n)
            hl = [e for e in P.els if isinstance(e, E.Highlight) and e.col != casefile.INK]
            quotes = [k for k in P.targets if k.startswith('quote')]
            if 'clipping' in P.targets:
                self.assertTrue(quotes)
                for k in quotes:   # every swipe sits on the clipping
                    x, y, w, h = P.targets[k]
                    cx, cy, cw, ch = P.targets['clipping']
                    self.assertTrue(cx - 20 <= x and x + w <= cx + cw + 20 and cy - 20 <= y and y + h <= cy + ch + 20, k)
            elif P.kind != 'chapter':
                self.assertFalse(hl, f'beat {n}: a highlight with no quote under it')

    def test_red_string_runs_from_print_to_print(self):
        f = self.film
        path = f.layout['path']
        for p in path:
            self.assertIsNotNone(p['pin'], p['n'])
        # a frame late in a board shows the string: red pixels along the line between two pins
        n = self.n_of('b16')
        a, b = self.held('b16')
        img = f.frame((a + b) // 2)
        red = (img[..., 0] > 150) & (img[..., 1] < 60) & (img[..., 2] < 70)
        self.assertGreater(int(red.sum()), 30)
        self.assertGreater(n, 1)

    def test_nothing_on_the_board_is_yellow(self):
        for c in (casefile.CORK, casefile.KRAFT, casefile.PRINT, casefile.STRING, casefile.PIN, casefile.NEWS):
            self.assertFalse(_yellow(np.array([c])).any(), c)
        f = self.film
        b = f.layout['boards'][0]
        im = casefile.case_board(b, 1, '01', 'THE BOTTLE')
        a = np.asarray(im.resize((im.width // 4, im.height // 4)))
        self.assertLess(_yellow(a).mean(), 0.001)


class Produce(unittest.TestCase):
    def test_vox_is_the_default_and_classic_one_switch_away(self):
        self.assertEqual(produce.engine_of({}), 'vox')
        self.assertEqual(produce.engine_of({'engine': 'classic'}), 'classic')
        old = os.environ.get('CLASSIFIED_VOX')
        os.environ['CLASSIFIED_VOX'] = '0'
        try:
            self.assertEqual(produce.engine_of({}), 'classic')
        finally:
            if old is None:
                os.environ.pop('CLASSIFIED_VOX')
            else:
                os.environ['CLASSIFIED_VOX'] = old

    def test_the_board_refuses_a_work_folder_in_the_repository(self):
        ep, beats = episode_ep(('b09',))
        with self.assertRaises(SystemExit):
            casefile.CaseFilm(ep, beats, {}, SIZE, False, 'slate', lambda m: None, work=HERE / 'tmp-vox')

    def test_the_board_renders_16_9_only(self):
        ep, beats = episode_ep(('b09',))
        with self.assertRaises(ValueError):
            casefile.CaseFilm(ep, beats, {}, (1080, 1920), False, 'slate', lambda m: None)


if __name__ == '__main__':
    unittest.main()

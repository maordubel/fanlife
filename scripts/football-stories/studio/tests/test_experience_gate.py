"""The experience gate (studio/qa.py): the producer's measurements on frames made by hand, so every threshold is held by a
test — a slideshow fails and says where, a film that moves and cuts passes, a flash is not a cut to paper, a shake is not
a pan, and a failure names the plan shots to re-plan once."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import qa  # noqa: E402
from studio.common import FPS  # noqa: E402

F = 25.0


def texture(seed: int, level: float = 90.0) -> np.ndarray:
    """A picture with detail at every scale (so a shift of it can be read), GATE_H × GATE_W, mean about `level`."""
    rng = np.random.default_rng(seed)
    a = rng.normal(0, 1, (qa.GATE_H * 2, qa.GATE_W * 2))
    for _ in range(6):   # soften it: real pictures are not white noise
        a = (a + np.roll(a, 1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 0) + np.roll(a, -1, 1)) / 5
    a = (a - a.mean()) / a.std()
    return np.clip(level + 45 * a, 0, 255)


def pan(tex: np.ndarray, n: int, px: float = 0.25, x0: int = 20) -> list[np.ndarray]:
    """n frames gliding one way across the picture, `px` small-frame pixels a frame (sub-pixel by blending)."""
    out = []
    for i in range(n):
        x = x0 + i * px
        k, fr = int(x), x - int(x)
        a = tex[10:10 + qa.GATE_H, k:k + qa.GATE_W] * (1 - fr) + tex[10:10 + qa.GATE_H, k + 1:k + 1 + qa.GATE_W] * fr
        out.append(a.astype(np.uint8))
    return out


def still(tex: np.ndarray, n: int) -> list[np.ndarray]:
    return [tex[10:10 + qa.GATE_H, 20:20 + qa.GATE_W].astype(np.uint8)] * n


def plan(seconds: float, kinds=('trailer', 'illustration'), engine='docu') -> dict:
    per = seconds / len(kinds)
    return {'engine': engine, 'duration': seconds,
            'shots': [{'n': i, 'start': i * per, 'frames': int(per * FPS), 'visual': {'type': k}} for i, k in enumerate(kinds)]}


def film(*parts) -> list[np.ndarray]:
    return [f for p in parts for f in p]


def gate(frames, pl=None, shots=None):
    return qa.experience(None, pl or plan(len(frames) / F), None, 0.0, shots, frames=(F, frames))


def check(g, name):
    return next(c for c in g['checks'] if c[0].endswith(name))


class Numbers(unittest.TestCase):
    def test_a_film_that_moves_and_cuts_passes_every_check(self):
        frames = film(*[pan(texture(i), int(3 * F)) for i in range(6)])
        g = gate(frames, shots=[{'n': i, 'pictures': [{'src': f'{i}.webp'}]} for i in range(2)])
        self.assertTrue(all(ok for _, ok, _ in g['checks']), [c for c in g['checks'] if not c[1]])
        n = g['numbers']
        self.assertEqual(n['changes'], 5)
        self.assertAlmostEqual(n['first_change_s'], 3.0, delta=0.05)
        self.assertLessEqual(n['longest_shot_s'], 3.1)
        self.assertEqual((n['dead_frames'], n['flashes'], n['shakes'], g['replan']), (0, [], [], {}))

    def test_a_slideshow_fails_on_length_and_says_where(self):
        frames = film(pan(texture(1), int(3 * F)), pan(texture(2), int(11 * F)), pan(texture(3), int(3 * F)))
        g = gate(frames, plan(17.0, ('trailer', 'illustration', 'score', 'illustration')))
        name, ok, detail = check(g, 'shot length')
        self.assertFalse(ok)
        self.assertIn('slideshow', detail)
        self.assertAlmostEqual(g['numbers']['longest_shot_s'], 11.0, delta=0.1)
        self.assertEqual(sorted(g['replan']), [0, 1, 2, 3])                                 # every plan shot the 11 s hold runs through …
        self.assertTrue(all(v == ['long'] for v in g['replan'].values()))                   # … and why
        self.assertGreater(qa.MAX_SHOT_S, 4.0)                                              # the editor's 4 s plus measuring grain

    def test_a_picture_that_does_not_move_fails_the_motion_floor_and_is_a_freeze(self):
        frames = film(pan(texture(1), int(3 * F)), still(texture(2), int(3 * F)), pan(texture(3), int(3 * F)))
        g = gate(frames)
        self.assertFalse(check(g, 'motion')[1])
        self.assertEqual(len(g['numbers']['slow_shots']), 1)
        self.assertEqual(len(g['numbers']['dead_runs']), 1)
        self.assertGreaterEqual(g['numbers']['dead_frames'], int(3 * F) - 2)
        slow = film(*[pan(texture(i), int(3 * F), px=0.03) for i in range(3)])              # a card's creep: slow, but alive
        self.assertTrue(check(gate(slow), 'motion')[1], gate(slow)['numbers'])

    def test_nothing_changing_for_three_seconds_fails_the_opening(self):
        late = film(pan(texture(1), int(4 * F)), pan(texture(2), int(3 * F)))
        self.assertFalse(check(gate(late), 'first seconds')[1])
        never = gate(pan(texture(1), int(4 * F)))
        self.assertIn('nothing changes', check(never, 'first seconds')[2])

    def test_the_stake_must_be_on_screen_in_the_first_fifteen_seconds(self):
        frames = film(*[pan(texture(i), int(3 * F)) for i in range(8)])
        self.assertTrue(check(gate(frames, plan(24.0, ('illustration', 'score', 'illustration'))), 'the stake')[1])
        self.assertFalse(check(gate(frames, plan(24.0, ('illustration', 'illustration', 'score'))), 'the stake')[1])   # the score comes at 16 s
        opened = plan(24.0, ('open', 'illustration'))
        opened['shots'][0]['visual']['headline'] = 'Five days in May'
        self.assertTrue(check(gate(frames, opened), 'the stake')[1])


class Calm(unittest.TestCase):
    def test_a_flash_is_caught_and_a_cut_to_paper_is_not(self):
        base = film(*[pan(texture(i), int(3 * F)) for i in range(3)])
        flash = list(base)
        flash[40] = np.clip(flash[40].astype(np.int16) + 110, 0, 255).astype(np.uint8)       # one bright frame, then back
        g = gate(flash)
        self.assertFalse(check(g, 'calm picture')[1])
        self.assertEqual(len(g['numbers']['flashes']), 1)
        self.assertIn('flash', g['replan'][0])
        paper = film(pan(texture(1), int(3 * F)), pan(texture(2, 215), int(3 * F)), pan(texture(3), int(3 * F)))   # a chapter card: bright, and it stays
        self.assertEqual(gate(paper)['numbers']['flashes'], [])

    def test_a_shake_is_caught_and_a_pan_or_a_single_settle_is_not(self):
        tex = texture(7)
        calm = pan(tex, int(3 * F), px=0.5)
        shake = [tex[10:10 + qa.GATE_H, 40 + (3 if i % 2 else 0):40 + (3 if i % 2 else 0) + qa.GATE_W].astype(np.uint8) for i in range(14)]
        g = gate(film(calm, shake, pan(tex, int(2 * F), px=0.5, x0=60)))
        self.assertFalse(check(g, 'calm picture')[1])
        self.assertGreaterEqual(len(g['numbers']['shakes']), 1)
        fast = gate(film(*[pan(texture(i), int(3 * F), px=1.5) for i in range(3)]))          # a brisk pan: one direction, no reversal
        self.assertEqual(fast['numbers']['shakes'], [])
        self.assertTrue(check(fast, 'calm picture')[1])
        settle = pan(tex, 30, px=1.0) + pan(tex, 2, px=-1.0, x0=50) + pan(tex, 40, px=0.2, x0=48)   # lands, eases back once
        self.assertEqual(gate(film(pan(texture(1), int(3 * F)), settle))['numbers']['shakes'], [])


class Pictures(unittest.TestCase):
    def test_repetition_is_counted_per_plan_shot_not_per_look(self):
        looks = [{'n': 0, 'pictures': [{'src': 'a'}, {'src': 'a'}, {'src': 'a'}]}, {'n': 1, 'pictures': [{'src': 'b'}]}]
        self.assertEqual(qa.asset_numbers(looks)['ratio'], 1.0)                              # three looks at one picture in one shot: one use
        again = [{'n': i, 'pictures': [{'src': 'a' if i < 3 else f'p{i}'}]} for i in range(6)]
        a = qa.asset_numbers(again)
        self.assertEqual((a['most'], a['over']), (3, [2]))                                   # the third shot of `a` is the one to change
        self.assertIsNone(qa.asset_numbers(None))

    def test_the_same_few_pictures_fail_and_name_the_shots(self):
        frames = film(*[pan(texture(i), int(3 * F)) for i in range(4)])
        shots = [{'n': i, 'pictures': [{'src': 'a'}]} for i in range(2)] + [{'n': 2, 'pictures': [{'src': 'a'}]}]
        g = gate(frames, plan(12.0, ('trailer', 'illustration', 'illustration')), shots)
        self.assertFalse(check(g, 'pictures')[1])
        self.assertEqual(g['replan'].get(2), ['asset'])


class Enforcement(unittest.TestCase):
    def test_older_engines_are_measured_and_reported_but_block_nothing(self):
        frames = film(pan(texture(1), int(12 * F)))
        g = gate(frames, plan(12.0, engine='vox'))
        self.assertTrue(all(ok for _, ok, _ in g['checks']))
        self.assertTrue(all('not enforced' in d for _, _, d in g['checks']))
        self.assertEqual((g['replan'], g['enforced']), ({}, False))
        self.assertAlmostEqual(g['numbers']['longest_shot_s'], 12.0, delta=0.1)              # the number is still there to read

    def test_the_owners_opening_is_not_judged(self):
        pl = plan(9.0)
        for s in pl['shots']:
            s['start'] += 8.0                                                                # an 8 s opening before the film's own clock
        g = qa.experience(None, pl, None, 8.0, None, frames=(F, film(*[pan(texture(i), int(3 * F)) for i in range(3)])))
        self.assertTrue(check(g, 'the stake')[1])
        self.assertTrue(check(g, 'first seconds')[1])

    def test_every_threshold_is_a_named_constant(self):
        for name in ('FIRST_CHANGE_S', 'STAKE_BY_S', 'MAX_SHOT_S', 'MOTION_FLOOR', 'DEAD_RUN_S', 'UNIQUE_ASSET_MIN', 'MAX_ASSET_SHOTS',
                     'FLASH_RISE', 'FLASH_FRAMES', 'JITTER_PX', 'SHAKE_REVERSALS', 'WORST_JERK_PX'):
            self.assertIsInstance(getattr(qa, name), (int, float), name)


class Replan(unittest.TestCase):
    """What the one automatic re-plan does to the shots the gate named (docu/editor.cut `fixes`)."""

    def test_a_long_shot_is_cut_tighter_and_a_flashing_one_comes_in_calm(self):
        from studio.docu import editor as E
        b = lambda n: {'t': n * 8.0, 'd': 8.0, 'shots': [{'kind': 'image', 'src': f'{n}.webp', 'move': 'slam'}], 'meta': {'n': n, 'type': 'matchday', 'words': []}}  # noqa: E731
        plain = E.cut([b(0), b(1)])
        fixed = E.cut([b(0), b(1)], fixes={1: ['long', 'flash']})
        self.assertGreater(len(E.pictures(fixed[1])), len(E.pictures(plain[1])))
        self.assertLessEqual(max(x['d'] for x in E.pictures(fixed[1])), E.MAX_STILL)
        self.assertEqual((plain[1]['in'], fixed[1]['in']), ('whip', 'cut'))
        self.assertTrue(all(E.motion(x) not in ('slam', 'pull', 'reverse', 'turn') for x in E.pictures(fixed[1])))
        self.assertEqual(E.pictures(fixed[0]), E.pictures(plain[0]))                         # the shots the gate did not name are untouched


if __name__ == '__main__':
    unittest.main()

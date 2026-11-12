"""The pictures do not shake or flicker (rule 142; owner: "a feeling of epilepsy, the pictures shake"). The shaking camera
and the trailer's flickering line are no longer offered; a script saved while they were still films, on a calm move."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import script as S  # noqa: E402
from studio import writer as W  # noqa: E402
from studio.cinema import look  # noqa: E402
from studio.directors import DIRECTORS  # noqa: E402
from studio.tests import test_cinema as tc  # noqa: E402

tearDownModule = tc.tearDownModule


class CalmCamera(unittest.TestCase):
    def test_no_writer_and_no_director_is_offered_a_shake(self):
        self.assertNotIn('shake for', W.SYSTEM)
        self.assertNotIn('|shake|', S.SCHEMA_TEXT)
        for d in DIRECTORS:
            self.assertNotIn('shake', d.get('camera') or [], d['id'])
        self.assertNotIn('shake', look.MOVES)

    def test_an_older_script_that_asks_for_a_shake_still_passes_and_films_as_a_push(self):
        self.assertIn('shake', S.CAMERAS)                                  # the validator still accepts it
        old, calm = look.move('shake', 4.0, seed=7), look.move('push', 4.0, seed=7)
        for t in (0.0, 0.5, 1.7, 3.9):
            self.assertEqual(old(t), calm(t))

    def test_no_move_jolts_the_picture_between_two_frames(self):
        for name in look.MOVES + ('shake',):
            cam = look.move(name, 4.0, seed=3)
            for i in range(30, 110):                                       # after a whip's own entry
                (_, x0, y0), (_, x1, y1) = cam(i / 30), cam((i + 1) / 30)
                self.assertLess(abs(x1 - x0) + abs(y1 - y0), 6.0, name)


class CalmTrailer(unittest.TestCase):
    def test_a_trailer_line_is_on_screen_on_every_frame_once_it_has_come_up(self):
        from studio.cinema import shots
        from studio.common import FPS
        ed, _ = tc.editor()
        plan = ed.plan()
        s = next(x for x in plan['shots'] if x['visual']['type'] == 'trailer')
        import inspect
        self.assertNotIn('stutter', inspect.getsource(shots))
        for seed in range(3):                                              # every line style, whichever the seed deals
            sh = shots.trailer(ed, {**s, 'n': s['n'] + seed})
            pieces = sh.overlay[0]
            on = [bool(pieces(i / FPS)) for i in range(int(sh.duration * FPS))]
            first = on.index(True)
            self.assertTrue(all(on[first:]), f'seed {seed}: a line went dark after it came up')


if __name__ == '__main__':
    unittest.main()

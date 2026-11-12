"""DOCU as the studio's engine (studio/docu/plan.py): the plan drawn in the owner's approved look, without a browser.

The engine is the default for a documentary, every score on screen is the claim's, every shot of the plan is on the page
at the plan's own time (so the pipeline's mix still lands), subtitles never run ahead of the narrator, and the cue files the
mix reads are written for every shot.
"""
from __future__ import annotations

import os
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio.common import FPS, write_json  # noqa: E402
from studio.docu import plan as dp  # noqa: E402
from studio.tests import test_cinema as tc  # noqa: E402
from studio.tests import test_hyperframes as th  # noqa: E402

tearDownModule = tc.tearDownModule
dp.B.GSAP = th._STUB   # the page is checked as written; no browser runs it here


def project():
    ed, d = tc.editor(scr=th.script())
    plan = ed.plan()
    d = Path(d)
    write_json(d / 'script.json', th.script())
    write_json(d / 'ledger.json', ed.ledger)
    out = Path(tempfile.mkdtemp(prefix='docu-'))
    dp.crests = lambda names: {n: None for n in names}   # no network in tests
    page, D, cues = dp.write_project(d, plan, tc.PAL, out / 'p')
    return ed, plan, page.read_text(), D, cues, out


class Docu(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ed, cls.plan, cls.page, cls.D, cls.cues, cls.out = project()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.out, ignore_errors=True)

    def test_it_is_the_default_for_a_documentary(self):
        os.environ.pop('STORIES_DOCU', None)
        self.assertTrue(dp.wanted({}))
        self.assertTrue(dp.wanted({'look': 'archive'}))
        for style in ('collage', 'night', 'mixed', 'papercut'):   # every brief carries one; a style is not an engine
            self.assertTrue(dp.wanted({'visual_style': style}), style)
        for keep in ({'look': 'vox-hf'}, {'engine': 'vox'}, {'visual_style': 'classic'}):
            self.assertFalse(dp.wanted(keep))
        os.environ['STORIES_DOCU'] = '0'
        try:
            self.assertFalse(dp.wanted({}))
        finally:
            os.environ.pop('STORIES_DOCU')

    def test_every_shot_is_on_the_page_at_the_plans_time(self):
        self.assertGreaterEqual(self.D, self.plan['duration'] - 0.05)
        starts = {round(float(x), 2) for x in re.findall(r'data-start="([\d.]+)"', self.page)}
        for s in self.plan['shots']:
            self.assertIn(round(s['start'], 2), starts, s['visual']['type'])

    def test_the_score_is_the_claims(self):
        f = self.ed.by['m3']['fact']
        us, them = (f['score_home'], f['score_away']) if f['side'] != 'away' else (f['score_away'], f['score_home'])
        self.assertRegex(self.page, rf'<div class="sbc"><b>{us}</b><i>–</i><b>{them}</b></div>')

    def test_subtitles_never_run_ahead_of_the_voice(self):
        for s in self.plan['shots']:
            if not s.get('narration') or s.get('voice_at') is None:
                continue
            for _, at, _ in dp.subtitles(s):
                self.assertGreaterEqual(at + 1e-6, s['voice_at'])

    def test_the_mix_has_a_cue_file_per_shot(self):
        for s in self.plan['shots']:
            self.assertIsInstance(self.cues.get(s['n'], []), list)
        kinds = {k for v in self.cues.values() for _, k in v}
        self.assertTrue(kinds <= {'paper', 'crowd-goal', 'whoosh', 'tick', 'stamp', 'sting', 'end', 'pop', 'drum'} | {k for k in kinds if ':' in k})

    def test_no_crest_is_borrowed(self):
        self.assertNotIn('assets/img/None', self.page)
        self.assertIn('class="ini"', self.page)

    def test_a_pictures_caption_is_never_printed(self):
        for s in self.plan['shots']:
            cap = s['visual'].get('caption')
            if s['visual']['type'] == 'illustration' and cap:
                self.assertNotIn(f'<b>{cap}</b>', self.page)

    def test_the_picture_is_silent_for_the_mix(self):
        self.assertNotIn('<audio', self.page)


if __name__ == '__main__':
    unittest.main()


class SparePictures(unittest.TestCase):
    """A shot with no art of its own borrows a crowd picture — never the same one again and again (owner, 12.11.2026)."""

    def adapter(self, job='job-a'):
        keep, dp.crests = dp.crests, lambda names: {}
        try:
            return dp.Adapter(Path('/tmp') / job, {}, tc.PAL, {'claims': []}, {})
        finally:
            dp.crests = keep

    @staticmethod
    def bare(n):
        return {'n': n, 'visual': {'type': 'stat'}}

    def test_no_picture_twice_and_the_same_shot_asks_the_same_picture(self):
        ad = self.adapter()
        got = [ad.picture(self.bare(n))[0] for n in range(25)]
        self.assertEqual(len(set(got)), 25)                                # the index has hundreds: nothing repeats in 25 shots
        self.assertEqual(ad.picture(self.bare(3))[0], got[3])              # asked again for the same shot: the same picture
        self.assertTrue(all(k.startswith(('beat:', 'art:')) for k in ad.keys.values()))   # each by its index key

    def test_the_same_film_draws_the_same_pictures_and_another_film_differs(self):
        a, b, c = (([ad.picture(self.bare(n))[0] for n in range(8)]) for ad in (self.adapter(), self.adapter(), self.adapter('job-b')))
        self.assertEqual(a, b)
        self.assertNotEqual(a, c)

    def test_not_the_picture_the_script_chose_for_the_shot_before(self):
        for job in ('job-a', 'job-b', 'job-c', 'job-d'):
            ad = self.adapter(job)
            ad.spare(0)                                                    # what this film would borrow first
            first = ad.keys[0]
            ad = self.adapter(job)
            own = ad.picture({'n': 0, 'visual': {'type': 'stat', 'backdrop': first}})[0]
            self.assertNotEqual(ad.picture(self.bare(1))[0], own, job)


class Calm(unittest.TestCase):
    """Nothing in a DOCU film shakes or flashes white (rule 142; owner: "a feeling of epilepsy, the pictures shake")."""

    def film(self):
        f = dp.B.Film({'palette': {'us': '#c00', 'them': '#222'}}, Path('/tmp'))
        f.agg_moves = []
        return f

    def test_word_and_tint_land_without_a_shake(self):
        f = self.film()
        f.word({'text': 'GOAL', 'glitch': True}, 1.0, 2.0)
        f.tint({'src': 'a.webp'}, 3.0, 2.0)
        js = ''.join(f.tw)
        self.assertNotIn('yoyo', js)
        self.assertNotIn('steps(', js)
        self.assertNotRegex(js, r'\{x:\d+')                                # no sideways jolt
        self.assertIn('scale:1.04', js)                                    # the word plate settles instead

    def test_a_beats_flash_dips_to_the_ground_colour_not_to_white(self):
        f = self.film()
        f.build([{'t': 0.0, 'd': 2.0, 'shots': [], 'flash': 0.5}])
        js = ''.join(f.tw)
        self.assertIn('tl.fromTo("#flash",{opacity:0},{opacity:0.5', js)
        self.assertRegex(f.page(2.0), r'#flash\{[^}]*background:' + re.escape(f.INK))

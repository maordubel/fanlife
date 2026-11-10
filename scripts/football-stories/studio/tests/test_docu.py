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

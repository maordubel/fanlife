"""Studio v3 (4.11.2026): one match, a tie, a rivalry; three scripts; the Drive library; each look's grade; captions
and film length measured on the first full film."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import package, pipeline, research, worker, writer  # noqa: E402
from studio.common import StageError  # noqa: E402
from studio.script import target_words  # noqa: E402


class Pick(unittest.TestCase):
    def setUp(self):
        self.ledger = research.build_ledger('hapoel-tel-aviv', '1999/00', [])
        self.matches = [c for c in self.ledger['claims'] if c['fact'].get('kind') == 'match']

    def test_one_match_keeps_that_match_and_counts_again(self):
        one = research.pick(self.ledger, [self.matches[0]['id']])
        kept = [c for c in one['claims'] if c['fact'].get('kind') == 'match']
        self.assertEqual([c['id'] for c in kept], [self.matches[0]['id']])
        self.assertNotEqual(one['summary'], self.ledger['summary'])

    def test_a_match_from_another_season_is_refused(self):
        with self.assertRaises(StageError):
            research.pick(self.ledger, ['nothing-like-this'])


class Rivalry(unittest.TestCase):
    def test_every_meeting_with_one_opponent(self):
        l = research.rivalry_ledger('hapoel-tel-aviv', 'Hapoel Petah Tikva', '1995–2026')
        m = [c for c in l['claims'] if c['fact'].get('kind') == 'match']
        self.assertGreaterEqual(len(m), 10)
        self.assertTrue(all(c['fact']['opponent'] == 'Hapoel Petah Tikva' for c in m))

    def test_an_opponent_never_met_is_refused(self):
        with self.assertRaises(StageError):
            research.rivalry_ledger('hapoel-tel-aviv', 'Nobody FC', '2020–2026')


class Options(unittest.TestCase):
    def test_three_angles_and_a_card_for_each(self):
        from studio.directors import DIRECTORS
        self.assertEqual([d['id'] for d in DIRECTORS], ['broadcaster', 'terrace', 'trailer'])  # one option per director
        s = {'_angle': 'Chronicle', '_director': 'broadcaster', 'title_candidates': [{'title': 'The night', 'angle': 'search'}], 'selected': 0, 'hook': 'H',
             'chapters': [{'title': 'One', 'beats': [{'narration': 'a b c'}, {'narration': 'd e'}]}]}
        o = writer.option_summary(s, 1)
        self.assertEqual((o['n'], o['angle'], o['director'], o['title'], o['words'], o['chapters']),
                         (1, 'Chronicle', 'broadcaster', 'The night', 5, ['One']))


class Drive(unittest.TestCase):
    def test_a_club_takes_its_own_folders_only(self):
        f = worker.drive_folder_fits
        self.assertTrue(f('aek-athens', 'AEK Athens', '01 football stories aek athens'))
        self.assertFalse(f('panathinaikos', 'Panathinaikos', '01 football stories aek athens'))
        self.assertTrue(f('hapoel-tel-aviv', 'Hapoel Tel Aviv', '04 approved graphics the worker and hapoel 02 stadiums and city backgrounds'))
        self.assertFalse(f('hapoel-petah-tikva', 'Hapoel Petah Tikva', '04 approved graphics the worker and hapoel 02 stadiums and city backgrounds'))
        self.assertFalse(f('celtic', 'Celtic', '05 documents'))


class Looks(unittest.TestCase):
    def test_every_look_has_a_grade(self):
        for style in ('collage', 'papercut', 'archive', 'night'):
            self.assertIn(pipeline.STYLE_LOOK[style], pipeline.LOOKS)

    def test_papercut_brings_the_paper_cut_library(self):
        self.assertEqual(pipeline.ingest_art({'visual_style': 'papercut'}, lambda *_: None), ['papercut-library'])
        self.assertEqual(pipeline.ingest_art({'visual_style': 'collage'}, lambda *_: None), [])


class Measured(unittest.TestCase):
    def test_seven_minutes_is_planned_at_the_film_rate(self):
        lo, hi = target_words(7)
        self.assertLess(hi, 1000)  # the old rate allowed 1160 words, which ran 8.8 min

    def test_a_long_cue_splits_and_no_line_passes_42_characters(self):
        words = [{'w': w, 'start': i * 0.3, 'end': i * 0.3 + 0.25} for i, w in enumerate(
            ('Twenty supporters stood in the rain outside the ground on Leoforos Alexandras waiting for the gates to open '
             'and nobody said a word').split())]
        cues = package.captions({'shots': [{'words': words, 'voice_at': 0.0}]})
        self.assertTrue(all(len(l) <= 42 for c in cues for l in c['lines']))
        self.assertTrue(all(c['end'] > c['start'] and len(c['lines']) <= 2 for c in cues))


if __name__ == '__main__':
    unittest.main()

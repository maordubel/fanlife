"""The three languages inside one DOCU film (studio/docu/explainer.py): an explanation the claims can draw becomes a VOX
explainer passage on the same HyperFrames page, a quote or a beat's short line becomes kinetic type, the mix is counted
and held to named targets — and nothing is printed that the research block does not hold."""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio.docu import build as B  # noqa: E402
from studio.docu import explainer as X  # noqa: E402
from studio.docu import plan as dp  # noqa: E402
from studio.tests import test_cinema as tc  # noqa: E402

FINAL = {'kind': 'match', 'date': '2000-05-17', 'competition': 'State Cup', 'stage': 'Final', 'home': 'Rovers', 'away': 'United', 'side': 'away',
         'opponent': 'Rovers', 'score_home': 2, 'score_away': 2, 'outcome': 'draw',
         'scorers': [{'name': 'Dean Racunica', 'minute': 85}, {'name': 'Salim Toama', 'minute': 115}, {'name': 'No Minute', 'minute': None}]}
WAIT = {'kind': 'previous-title', 'gap_seasons': 12, 'attendance': 40000}
LEDGER = {'season': '1999/00', 'claims': [{'id': 'm1', 'fact': FINAL}, {'id': 'w1', 'fact': WAIT}, {'id': 'r1', 'fact': {'kind': 'record', 'competition': 'League', 'won': 20, 'drawn': 5, 'lost': 3}}]}


def adapter(shots=()):
    keep, dp.crests = dp.crests, lambda names: {}
    try:
        return dp.Adapter(Path('/tmp/lang-job'), {'shots': list(shots)}, tc.PAL, LEDGER, {})
    finally:
        dp.crests = keep


def shot(n, t, narration, d=10.0, **visual):
    words = narration.split()
    return {'n': n, 'chapter': 0, 'start': n * 20.0, 'frames': int(d * 25), 'visual': {'type': t, **visual}, 'claim_ids': [visual.get('claim')] if visual.get('claim') else [],
            'narration': narration, 'voice_at': n * 20.0 + 0.2, 'words': [{'w': w, 'start': 0.4 * i, 'end': 0.4 * i + 0.3} for i, w in enumerate(words)]}


class Builders(unittest.TestCase):
    def test_the_goal_timeline_is_the_claims_own_minutes(self):
        tl = X.goal_timeline(FINAL, 'United')
        self.assertEqual([(t['label'], t['value']) for t in tl['ticks']], [('RACUNICA', 85), ('TOAMA', 115)])   # no minute → no tick
        self.assertEqual((tl['right'], tl['marks'][0]['label']), ("120'", "90'"))                               # a goal after the ninetieth
        self.assertEqual([round(t['at'], 3) for t in tl['ticks']], [round(85 / 120, 3), round(115 / 120, 3)])
        self.assertTrue(tl['ticks'][-1].get('hot'))
        self.assertIsNone(X.goal_timeline({**FINAL, 'scorers': [{'name': 'A B', 'minute': None}]}, 'United'))
        self.assertEqual(X.goal_timeline({**FINAL, 'scorers': FINAL['scorers'][:1]}, 'United')['right'], "90'")

    def test_a_number_is_shown_only_when_the_line_says_it_and_a_claim_holds_it(self):
        self.assertEqual({k: v for k, v in X.number('A club that had waited twelve seasons.', [WAIT]).items() if k in ('value', 'label')}, {'value': 12, 'label': 'SEASONS'})
        self.assertEqual(X.number('Forty thousand people.', [WAIT])['value'], 40000)
        self.assertIsNone(X.number('A club that had waited a long time.', [WAIT]))        # nobody says it
        self.assertIsNone(X.number('They waited thirteen seasons.', [WAIT]))              # the claim does not hold it
        self.assertEqual([b['share'] for b in X.bars(LEDGER['claims'][2]['fact'])['bars']], [1.0, 0.25, 0.15])

    def test_the_punch_line_rides_the_narrators_words(self):
        text = 'Two goals for the club, one of them late. Now it comes down to the spot.'
        times = [100 + 0.4 * i for i in range(len(text.split()))]
        k = X.punch(text, times, 100.0, 12.0)
        self.assertEqual(' '.join(w['w'] for w in k['words']), 'Now it comes down to the spot.')
        self.assertAlmostEqual(k['dt'], 0.4 * 9)                                          # it arrives when its first word is said
        self.assertEqual([round(w['at'], 1) for w in k['words']][:3], [0.0, 0.4, 0.8])
        self.assertEqual(k['words'][k['hot'][0]]['w'], 'comes')
        self.assertIsNone(X.punch(text, times[:-2], 100.0, 12.0))                         # timings that do not match the words: no type
        self.assertIsNone(X.punch('One very long sentence that never stops and has far too many words in it to be read.', [1.0] * 18, 0, 9))


class Languages(unittest.TestCase):
    def test_each_beat_gets_the_language_that_tells_it(self):
        shots = [shot(0, 'score', 'Two goals for United, one late in normal time, the other deep into extra time.', claim='m1'),
                 shot(1, 'score', 'United drew with Rovers.', claim='m1'),
                 shot(2, 'turning', 'How did a club that had waited twelve seasons end up here?', 13.0, title='How?', claim='w1'),
                 shot(3, 'quote', 'We never stopped singing', 7.0, text='We never stopped singing', who='A supporter'),
                 shot(4, 'record', 'Twenty wins.', 8.0, claim='r1')]
        ad = adapter(shots)
        dev = {s['n']: ad.shots(s, s['frames'] / 25) for s in shots}
        tl = next(x for x in dev[0] if x['kind'] == 'explain')
        self.assertEqual((tl['form'], tl['dt'] >= 2.6, tl['dt'] + tl['d']), ('timeline', True, 10.0))      # the board is read first
        self.assertFalse([x for x in dev[0] if x['kind'] in ('verdict', 'stamp')])
        self.assertFalse([x for x in dev[1] if x['kind'] == 'explain'])        # the line does not talk about the goals …
        self.assertTrue(ad.explainable[1])                                      # … though the data could carry it
        nb = next(x for x in dev[2] if x['kind'] == 'explain')
        self.assertEqual((nb['form'], nb['value'], nb['label']), ('number', 12, 'SEASONS'))
        self.assertGreaterEqual(nb['dt'], 0.8 + dp.E.WORD_HOLD)                 # after the slammed word has been read
        self.assertEqual([x['kind'] for x in dev[3]], ['image', 'kinetic'])
        self.assertEqual(dev[3][1]['who'], 'A SUPPORTER')
        self.assertEqual([x['form'] for x in dev[4] if x['kind'] == 'explain'], ['bars'])
        self.assertEqual(X.languages(dev[3], 7.0), {'explainer': 0.0, 'kinetic': 6.7, 'documentary': 0.3})
        os.environ['STORIES_DOCU_LANG'] = '0'
        try:
            self.assertFalse([x for x in adapter(shots).shots(shots[0], 10.0) if x['kind'] == 'explain'])
        finally:
            os.environ.pop('STORIES_DOCU_LANG')

    def test_a_label_the_record_does_not_hold_is_not_printed(self):
        ad = adapter()
        s = shot(0, 'score', 'Two goals.', claim='m1')
        ok = X.goal_timeline(FINAL, 'United')
        self.assertIsNotNone(ad.checked(ok, s))
        bad = {**ok, 'ticks': [{**ok['ticks'][0], 'label': 'MARADONA'}]}
        self.assertIsNone(ad.checked(bad, s))
        self.assertIsNone(ad.checked({**ok, 'ticks': [{**ok['ticks'][0], 'value': 77}]}, s))
        self.assertIsNone(ad.checked({'kind': 'explain', 'form': 'number', 'value': 12, 'label': 'TROPHIES'}, s))

    def test_the_mix_is_counted_and_plain_art_is_held_under_its_share(self):
        art = lambda n, text: shot(n, 'illustration', text, 8.0)   # noqa: E731
        shots = [art(0, 'A long road north for the club and its people. Nobody slept that night.'), art(1, 'They sang on the terrace until the lights went out again.'),
                 art(2, 'The city waited. It would not wait long.'), shot(3, 'score', 'Two goals, both late in extra time.', claim='m1')]
        ad = adapter(shots)
        beats = ad.beats()
        m = X.mix(beats)
        self.assertAlmostEqual(m['documentary'] + m['explainer'] + m['kinetic'], 1.0, places=2)
        self.assertGreater(m['kinetic'], 0.0)                                   # 100% art in three beats: the short lines became type
        self.assertTrue(any(x['kind'] == 'kinetic' for b in beats for x in b['shots']))
        self.assertEqual(m['chapters']['0'], {'explainers': 1, 'possible': 1})
        self.assertEqual(m['chapters_short'], [])
        self.assertEqual({b['language'] for b in beats} - {'documentary', 'explainer', 'kinetic'}, set())
        self.assertEqual((X.PLAIN_MAX, X.EXPLAINERS_PER_CHAPTER), (0.55, 1))
        none = X.mix([{'meta': {'chapter': 0, 'explainable': True}, 'lang': {'documentary': 8.0, 'explainer': 0.0, 'kinetic': 0.0}}])
        self.assertEqual(none['chapters_short'], ['0'])


class Page(unittest.TestCase):
    def film(self):
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}, 'silent': True}, Path('/tmp'))
        f.agg_moves = []
        return f

    def test_the_vox_devices_are_on_the_docu_page_and_nothing_overshoots(self):
        f = self.film()
        tl = X.goal_timeline(FINAL, 'United')
        D = f.build([{'t': 0, 'd': 6, 'shots': [tl]}, {'t': 6, 'd': 5, 'shots': [{'kind': 'explain', 'form': 'number', 'value': 12, 'label': 'SEASONS'}]},
                     {'t': 11, 'd': 5, 'shots': [X.bars(LEDGER['claims'][2]['fact'])]},
                     {'t': 16, 'd': 4, 'shots': [{'kind': 'kinetic', 'words': [{'w': 'Now', 'at': 0.0}, {'w': 'the', 'at': 0.4}, {'w': 'spot.', 'at': 0.8}], 'hot': [2]}]}])
        page = f.page(D)
        js = '\n'.join(f.tw)
        self.assertGreaterEqual(page.count('stroke-dasharray'), 4)              # the pen: the clock's line, a tick per goal, the underline
        self.assertIn('strokeDashoffset:0', js)
        self.assertEqual(page.count('class="od"'), 2 + 3 + 2 + (2 + 1 + 1))     # odometer drums: 85, 115 · 12 · 20, 5, 3
        self.assertIn('yPercent:-50', js)                                       # the 5 of 85 rolls to its own digit
        self.assertEqual(page.count('class="hl"'), 2)                           # the highlighter: the deciding goal, the line's word
        self.assertIn('RACUNICA', page)
        self.assertIn('>SEASONS<', page)
        self.assertNotRegex(js, r'back\.out|elastic|bounce|yoyo|repeat')         # nothing rolls past and back (rule 142)
        self.assertEqual(len([c for c in f.cams if c['move'] == 'breath']), 3)  # every board drifts the whole time


if __name__ == '__main__':
    unittest.main()

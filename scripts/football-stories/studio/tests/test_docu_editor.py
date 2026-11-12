"""The editor in DOCU (studio/docu/editor.py): no slideshow. A still never holds past MAX_STILL, the cuts land on a beat
or a word, a card leaves when it has been read, every beat arrives by a transition that neither flashes nor shakes, and
the docs/71 rules hold — while the plan's own times, which the mix and the subtitles stand on, do not move."""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import audio  # noqa: E402
from studio.docu import build as B  # noqa: E402
from studio.docu import editor as E  # noqa: E402
from studio.tests import test_docu as td  # noqa: E402

tearDownModule = td.tearDownModule


def beat(n, t, d, shots, type_='illustration', chapter=0, words=(), **meta):
    return {'t': t, 'd': d, 'shots': shots, 'meta': {'n': n, 'type': type_, 'chapter': chapter, 'words': list(words), **meta}}


def img(src='a.webp', **kw):
    return {'kind': 'image', 'src': src, 'move': 'push', **kw}


class CutPoints(unittest.TestCase):
    def lengths(self, d, pts):
        e = [0.0, *pts, d]
        return [b - a for a, b in zip(e, e[1:])]

    def test_a_short_hold_is_left_alone(self):
        self.assertEqual(E.cut_points(0, E.MAX_STILL, [], None), [])

    def test_every_look_is_a_look_and_none_is_a_slide(self):
        for d in (4.1, 5.0, 7.8, 11.3, 13.44, 22.0, 41.7):
            for words, grid in (([], None), ([x * 0.37 for x in range(200)], None), ([], [x * 0.5 for x in range(200)])):
                parts = self.lengths(d, E.cut_points(0, d, words, grid))
                self.assertGreaterEqual(len(parts), 2)
                self.assertLessEqual(max(parts), E.MAX_STILL + 1e-6, (d, parts))
                self.assertGreaterEqual(min(parts), E.MIN_SUB - 1e-6, (d, parts))

    def test_a_cut_lands_on_the_music_beat_before_it_lands_on_a_word(self):
        # a 7 s hold from film time 10: the arithmetic says 2.33 and 4.67; a beat at 12.5 and a word at 12.2 are both near
        pts = E.cut_points(10, 7.0, [12.2, 14.9], [12.5, 20.0])
        self.assertAlmostEqual(pts[0], 2.5)             # the beat
        self.assertAlmostEqual(pts[1], 4.9)             # no beat within reach: the word
        self.assertEqual(E.cut_points(10, 7.0, [], None), [round(7 / 3, 3), round(14 / 3, 3)])

    def test_a_mark_that_would_break_a_look_is_not_taken(self):
        pts = E.cut_points(0, 4.4, [0.9, 3.6], None)    # either word would leave a look under MIN_SUB
        self.assertEqual(pts, [2.2])


class Cut(unittest.TestCase):
    def test_a_long_still_becomes_wide_detail_reverse_and_then_a_related_picture(self):
        got = E.cut([beat(0, 0, 13.0, [img(tag={'big': 'X'})])], None, related=lambda n, i: f'rel-{i}.webp')[0]
        p = got['shots']
        self.assertEqual([x.get('frame') for x in p], [None, 'detail', 'reverse', 'wide'])
        self.assertEqual([x['src'] for x in p], ['a.webp', 'a.webp', 'a.webp', 'rel-3.webp'])
        self.assertEqual(p[0]['hold'], 13.0)            # the name tag stays for the whole line
        self.assertTrue(all('tag' not in x for x in p[1:]))
        self.assertAlmostEqual(sum(x['d'] for x in p), 13.0, places=2)
        self.assertAlmostEqual(p[1]['dt'], p[0]['d'], places=2)
        self.assertEqual(E.errors([got]), [])

    def test_the_plans_times_do_not_move(self):
        raw = [beat(i, i * 9.0, 9.0, [img(f'{i}.webp')]) for i in range(5)]
        for a, b in zip(raw, E.cut(raw)):
            self.assertEqual((a['t'], a['d']), (b['t'], b['d']))
        self.assertEqual(raw[0]['shots'], [img('0.webp')])   # the adapter's beats are not edited in place

    def test_a_card_leaves_when_it_has_been_read(self):
        ticket = {'kind': 'ticket', 'small': 'CHAPTER TWO', 'big': 'X', 'line': ''}
        b = E.cut([beat(0, 0, 13.3, [ticket], 'chapter')], None, None, backdrop=lambda n: img('back.webp'))[0]
        card = next(x for x in b['shots'] if x['kind'] == 'ticket')
        self.assertEqual(card['d'], E.MAX_CARD)
        pics = E.pictures(b)
        self.assertAlmostEqual(pics[0]['dt'], E.MAX_CARD)
        self.assertAlmostEqual(sum(x['d'] for x in pics), 13.3 - E.MAX_CARD, places=2)
        alone = E.cut([beat(0, 0, 13.3, [ticket], 'chapter')])[0]
        self.assertNotIn('d', alone['shots'][0])        # no picture to hand over to: the card stays, never an empty frame
        short = E.cut([beat(0, 0, 6.5, [ticket], 'chapter')], None, None, backdrop=lambda n: img('back.webp'))[0]
        self.assertEqual(len(short['shots']), 1)        # half a second of picture would be a flicker: the card stays

    def test_the_slammed_word_gets_out_of_the_pictures_way(self):
        word = {'kind': 'word', 'text': 'THE TURN', 'bg': 'ink', 'at': 0.8}
        b = E.cut([beat(0, 0, 13.0, [{'kind': 'tint', 'src': 'a.webp'}, word], 'turning')])[0]
        self.assertAlmostEqual(next(x for x in b['shots'] if x['kind'] == 'word')['d'], E.WORD_HOLD + 0.8)
        self.assertEqual(b['shots'][0]['kind'], 'tint')
        self.assertGreater(len(E.pictures(b)), 2)

    def test_end_and_follow_cards_are_left_as_they_are(self):
        end = {'kind': 'end', 'title': 'x'}
        self.assertEqual(E.cut([beat(0, 0, 9.0, [end], 'end')])[0]['shots'], [end])

    def test_transitions_follow_the_story_and_never_repeat_three_times(self):
        types = ['open', 'illustration', 'score', 'matchday', 'chapter', 'illustration', 'illustration', 'illustration', 'goal', 'goal', 'goal', 'quote']
        beats = E.cut([beat(i, i * 3.0, 3.0, [img(f'{i}.webp')], t, chapter=int(i >= 4)) for i, t in enumerate(types)])
        ins = [b['in'] for b in beats]
        self.assertEqual(ins[0], 'cut')
        self.assertEqual((ins[2], ins[3], ins[4], ins[5], ins[11]), ('match', 'whip', 'dive', 'tear', 'fade'))
        self.assertTrue(all(not (a == b == c) for a, b, c in zip(ins, ins[1:], ins[2:])), ins)
        self.assertTrue(set(ins) <= set(B.TAILS))
        self.assertEqual(E.errors(beats), [])

    def test_the_third_plain_still_is_a_print_and_the_third_same_move_changes(self):
        beats = E.cut([beat(i, i * 3.0, 3.0, [img(f'{i}.webp')]) for i in range(6)])
        self.assertEqual([E.treatment(b) for b in beats[:3]], ['image', 'image', 'print'])
        moves = [E.motion(x) for b in beats for x in E.pictures(b)]
        self.assertTrue(all(not (a == b == c) for a, b, c in zip(moves, moves[1:], moves[2:])), moves)
        self.assertEqual(E.errors(beats), [])

    def test_a_chapter_ends_on_a_turn(self):
        beats = E.cut([beat(0, 0, 9.0, [img('a.webp')], chapter=0), beat(1, 9.0, 5.0, [{'kind': 'ticket', 'small': '', 'big': 'B'}], 'chapter', chapter=1)])
        self.assertEqual(E.pictures(beats[0])[-1]['frame'], 'turn')
        self.assertEqual(beats[1]['in'], 'dive')

    def test_errors_name_what_is_wrong(self):
        slide = [{**beat(0, 0, 13.0, [img()]), 'in': 'cut'}]
        self.assertIn('a still holds 13.0s', E.errors(slide)[0])


class OnTheRealPlan(unittest.TestCase):
    """The adapter's own fixture film (test_docu.project), edited."""

    @classmethod
    def setUpClass(cls):
        cls.ed, cls.plan, cls.page, cls.D, cls.cues, cls.out = td.project()
        import tempfile
        ad = td.dp.Adapter(Path(tempfile.mkdtemp(prefix='docu-ed-')), cls.plan, td.tc.PAL, cls.ed.ledger, {})
        cls.raw, cls.beats = ad.raw_beats(), ad.beats()

    def test_no_slideshow_and_the_rules_hold(self):
        self.assertEqual(E.errors(self.beats), [])
        holds = [x.get('d', b['d'] - x.get('dt', 0)) for b in self.beats for x in E.pictures(b) if b['meta']['type'] not in ('end', 'follow')]
        self.assertLessEqual(max(holds), E.MAX_STILL + 0.01)
        self.assertGreater(sum(len(E.pictures(b)) for b in self.beats), sum(len(E.pictures(b)) for b in self.raw))

    def test_cuts_inside_a_beat_sit_on_word_starts_where_one_is_near(self):
        on, off = 0, 0
        for b in self.beats:
            for x in E.pictures(b)[1:]:
                at = b['t'] + x['dt']
                near = any(abs(at - w) < 1e-3 for w in b['meta']['words'])
                on, off = on + near, off + (not near)
        self.assertGreater(on, 0)
        self.assertGreaterEqual(on, off)

    def test_the_page_moves_whole_clips_and_nothing_flashes_or_shakes(self):
        tw = [ln for ln in self.page.splitlines() if ln.startswith('tl.')]
        self.assertTrue(any('xPercent:100' in ln for ln in tw) or any('polygon(' in ln for ln in tw) or any('scale:1.1}' in ln for ln in tw))
        for ln in tw:
            if 'xPercent' in ln or 'polygon(' in ln:
                self.assertNotIn('yoyo', ln)
                self.assertNotIn('repeat', ln)
        self.assertNotRegex(self.page, r'#flash",\{opacity:0\},\{opacity:0\.[5-9]')   # no beat of the adapter asks for the dip
        self.assertNotIn('background:#fff;opacity', self.page)

    def test_the_shot_list_is_written_for_the_gate(self):
        sl = E.shot_list(self.beats)
        self.assertEqual(len(sl), len(self.plan['shots']))
        self.assertTrue(all(s['in'] in B.TAILS for s in sl))
        self.assertTrue(any(len(s['pictures']) > 1 for s in sl))

    def test_the_old_cut_is_one_switch_away(self):
        import os
        os.environ['STORIES_DOCU_EDIT'] = '0'
        try:
            ad = td.dp.Adapter(Path('/tmp/docu-ed-off'), self.plan, td.tc.PAL, self.ed.ledger, {})
            self.assertTrue(all('in' not in b for b in ad.beats()))
        finally:
            os.environ.pop('STORIES_DOCU_EDIT')


class Drawing(unittest.TestCase):
    def film(self):
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}}, Path('/tmp'))
        f.agg_moves = []
        return f

    def test_a_storyboard_written_by_hand_is_drawn_as_before(self):
        f = self.film()
        f.build([{'t': 0, 'd': 9, 'shots': [{'kind': 'image', 'src': 'a.webp'}, {'kind': 'question', 'text': 'Q'}]},
                 {'t': 9, 'd': 9, 'shots': [{'kind': 'ledger', 'us': 'A', 'them': 'B', 'rows': [['x', 1, 2]]}]}])
        js = '\n'.join(f.tw)
        self.assertNotIn('xPercent:100', js)
        self.assertNotIn(f'scale:{1 + B.CREEP * 8.4:.4f}', js)
        self.assertEqual(len(re.findall(r'opacity:0\},\{opacity:1,duration:0\.35', js)), 1)   # the picture's own fade, once
        self.assertIn('data-duration="9.0"', '\n'.join(f.clips))

    def test_an_edited_beat_stays_under_the_next_one_for_its_transition_and_a_card_creeps(self):
        f = self.film()
        f.build([{'t': 0, 'd': 5, 'in': 'cut', 'shots': [{'kind': 'ledger', 'us': 'A', 'them': 'B', 'rows': [['x', 1, 2]]}]},
                 {'t': 5, 'd': 5, 'in': 'whip', 'shots': [{'kind': 'image', 'src': 'a.webp', 'fade': False}]},
                 {'t': 10, 'd': 5, 'in': 'tear', 'shots': [{'kind': 'image', 'src': 'b.webp', 'fade': False}]},
                 {'t': 15, 'd': 5, 'in': 'dive', 'shots': [{'kind': 'ticket', 'small': 'x', 'big': 'y'}]},
                 {'t': 20, 'd': 5, 'in': 'match', 'shots': [{'kind': 'image', 'src': 'c.webp', 'fade': False}]}])
        clips, js = '\n'.join(f.clips), '\n'.join(f.tw)
        self.assertIn(f'data-start="0.0" data-duration="{5 + B.TAILS["whip"]}"', clips)
        self.assertIn(f'data-start="5.0" data-duration="{5 + B.TAILS["tear"]}"', clips)
        self.assertIn(f'data-start="10.0" data-duration="{5 + B.TAILS["dive"]}"', clips)
        self.assertIn('xPercent:-100', js)
        self.assertEqual(js.count('polygon(0% 0%'), 2)
        self.assertEqual(js.count('polygon(100% 0%'), 2)
        self.assertIn(f'scale:{1 + B.CREEP * 4.4:.4f}', js)             # the ledger creeps instead of standing dead
        self.assertLess(B.CREEP * 960 / 30, 0.6)                        # … far under rule 142's 0.6 px a frame at the edge
        self.assertNotRegex(js, r'#fff|#ffffff|white')

    def test_framings_and_the_print(self):
        f = self.film()
        f.image({'src': 'a.webp', 'frame': 'detail', 'focus': '66% 42%', 'fade': False}, 0, 3)
        f.image({'src': 'a.webp', 'as': 'print', 'fade': False}, 3, 3)
        js, clips = '\n'.join(f.tw), '\n'.join(f.clips)
        self.assertIn('transformOrigin:"66% 42%"', js)
        self.assertIn('{scale:1.5}', js)
        self.assertIn('class="prn"', clips)
        self.assertEqual(set(E.FRAMES) | {'turn'}, set(B.FRAMINGS))


class BeatGrid(unittest.TestCase):
    def test_a_steady_pulse_is_found_and_noise_is_not_called_music(self):
        sr = audio.SR
        x = np.zeros(sr * 30, 'float32')
        for k in range(60):
            a = int((0.25 + k * 0.5) * sr)
            x[a:a + 400] = 1
        period, phase = audio.tempo(x)
        self.assertAlmostEqual(period, 0.5, places=2)
        self.assertAlmostEqual(phase, 0.25, delta=0.03)
        self.assertIsNone(audio.tempo(np.zeros(sr * 30, 'float32')))
        self.assertIsNone(audio.tempo(np.zeros(sr, 'float32')))

    def test_the_grid_and_the_score_read_the_same_passages(self):
        loud = np.array([False] * 20 + [True] * 20 + [False] * 20)
        secs = [{'start': 0, 'end': 8, 'mood': 'tension'}, {'start': 8, 'end': 14, 'mood': 'joy'}, {'start': 14, 'end': 20, 'mood': 'sad'}]
        ps = audio.passages(secs, loud, audio.SR // 2)
        self.assertEqual(ps[0][0], 0)
        self.assertTrue(loud[ps[1][0] // (audio.SR // 2)])                 # joy gets a loud passage
        self.assertFalse(loud[ps[2][0] // (audio.SR // 2) % len(loud)])    # and the sad part a quiet one


if __name__ == '__main__':
    unittest.main()

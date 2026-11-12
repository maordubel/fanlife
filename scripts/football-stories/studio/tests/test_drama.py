"""The director's score sheet (studio/drama.py) and what follows it: an emotion and an intensity per beat from the script's
own structure and markers, the film's arc, the mini-drama shape with plain-English failures and one rewrite, and the
crafts that read the sheet — the pace of the cut, the transition, the colour, the music's hush and lift, the delivery,
the match clock and the scoreline that changes on the cut."""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import audio, drama, script, writer  # noqa: E402
from studio.docu import build as B  # noqa: E402
from studio.docu import editor as E  # noqa: E402


def beat(text, t='illustration', ids=(), **v):
    return {'narration': text, 'claim_ids': list(ids), 'visual': {'type': t, **v}}


GOOD = {'drama': 1, 'chapters': [
    {'title': 'Five days in May', 'beats': [
        beat('Extra time is over in the cup final, and it all comes down to penalties.', 'open', ['final'], headline='Five Days in May'),
        beat('United needed this cup: twelve seasons had passed without a trophy.', 'matchday', ['final']),
        beat('But Rovers were the favourites, unbeaten since the winter.', 'versus', ['final']),
        beat('Ninety minutes gone. Still level.', 'illustration', ['final']),
        beat('Then came the summer that changed everything.', 'turning', title='The summer'),
        beat('United won two-nil in the first round.', 'score', ['r1'], claim='r1'),
        beat('Nobody knew yet what it would cost them.', 'illustration')]},
    {'title': 'The spot', 'beats': [
        beat('They wanted one thing now: the cup their fathers had waited for.', 'illustration'),
        beat('Against them stood a keeper who had not lost a shoot-out.', 'illustration'),
        beat('Five kicks each, and the clock no longer mattered.', 'illustration', ['final']),
        beat('Until the fourth kick. Then everything turned.', 'illustration', ['final']),
        beat('United won the shoot-out, four–two, and the stand erupted.', 'score', ['final'], claim='final'),
        beat('Champions. They celebrated until morning.', 'illustration', ['final'])]}]}


class Sheet(unittest.TestCase):
    def test_every_beat_gets_an_emotion_and_an_intensity_from_what_it_is_and_says(self):
        bs = drama.beats_of_script(GOOD)
        for b, out in zip(bs, (None, None, None, None, None, 'win', None, None, None, None, None, 'win', None)):
            b['outcome'] = out
        sh = drama.sheet(bs)
        x = sh['beats']
        self.assertEqual((x[0]['emotion'], x[0]['clock']), ('tension', True))             # "comes down to penalties", extra time
        self.assertEqual(x[3]['emotion'], 'tension')                                      # ninety minutes, still level
        self.assertTrue(x[4]['turn'] and x[3].get('breath'))                              # the beat before the turn holds its breath
        self.assertEqual(x[5]['emotion'], 'release')                                      # the recorded win straight after the tension
        self.assertEqual((x[8]['emotion'], x[9]['emotion']), ('tension', 'tension'))      # the clock, the shoot-out: the words decide a picture beat
        self.assertTrue(x[10]['turn'] and not x[12]['turn'])                              # "Until the fourth kick." turns; "until morning" does not
        self.assertIn(x[11]['emotion'], ('joy', 'release'))
        self.assertEqual(x[12]['emotion'], 'joy')
        self.assertTrue(all(0.1 <= v['intensity'] <= 1.0 and v['emotion'] in drama.EMOTIONS for v in x.values()))
        self.assertGreater(x[4]['intensity'], x[1]['intensity'])                          # a chapter climbs
        self.assertEqual(drama.sheet(bs), sh)                                             # the same script, the same sheet
        self.assertIn('tension', ' '.join(x[0]['why']))

    def test_the_arc_finds_the_question_and_where_it_is_paid_off(self):
        a = drama.sheet(drama.beats_of_script(GOOD))['arc']
        self.assertEqual((a['question'], a['answer']), (0, 11))
        self.assertGreaterEqual(a['answer_at'], 0.5)
        self.assertIsNone(a['told_early'])
        self.assertTrue(a['tension'] and a['joy'] and a['turns'])
        early = json.loads(json.dumps(GOOD))
        early['chapters'][0]['beats'][2] = beat('United won the final on penalties.', 'score', ['final'], claim='final')
        self.assertEqual(drama.sheet(drama.beats_of_script(early))['arc']['told_early'], 2)

    def test_the_plan_carries_the_sheet_and_the_music_cues(self):
        shots, t = [], 0.0
        for n, b in enumerate(drama.beats_of_script(GOOD)):
            shots.append({'n': n, 'chapter': b['chapter'], 'start': t, 'frames': 150, 'visual': {'type': b['type'], 'claim': 'final' if n in (5, 11) else None},
                          'claim_ids': b['claim_ids'], 'narration': b['narration'], 'mood': 'minor'})
            t += 6.0
        plan = {'fps': 25, 'shots': shots, 'duration': t}
        led = {'claims': [{'id': 'final', 'fact': {'kind': 'match', 'outcome': 'win'}}]}
        drama.attach(plan, GOOD, led)
        once = json.dumps(plan, sort_keys=True)
        self.assertEqual(json.dumps(drama.attach(plan, GOOD, led), sort_keys=True), once)           # attaching twice changes nothing
        self.assertEqual(plan['shots'][0]['drama']['emotion'], 'tension')
        self.assertEqual((plan['shots'][0]['mood'], plan['shots'][0]['mood_was']), ('tense', 'minor'))   # a strong beat leads the mix
        self.assertEqual(plan['shots'][5]['mood'], 'triumph')
        self.assertEqual(plan['sheet']['hush'], [[round(4 * 6.0 - drama.HUSH_S, 2), drama.HUSH_S], [round(10 * 6.0 - drama.HUSH_S, 2), drama.HUSH_S]])
        self.assertIn([30.0, drama.LIFT_S], plan['sheet']['lift'])
        self.assertIn('arc: question planted on shot 0', drama.text(plan))
        env = audio.sheet_envelope(plan['sheet'], int(80 * audio.SR))
        at = lambda s: float(env[int(s * audio.SR)])   # noqa: E731
        self.assertAlmostEqual(at(23.5), drama.HUSH_DEPTH, places=2)                                # near-silence before the turn
        self.assertAlmostEqual(at(31.0), drama.LIFT_GAIN, places=2)                                 # the lift on the release
        self.assertAlmostEqual(at(10.0), 1.0)
        self.assertLess(float(np.abs(np.diff(env)).max()), 0.001)                                   # ramps, never a step

    def test_the_voice_is_given_the_breath_and_the_release(self):
        s = drama.direct_script(json.loads(json.dumps(GOOD)))
        flat = [b for ch in s['chapters'] for b in ch['beats']]
        self.assertEqual(flat[3]['delivery'], 'hush')
        kept = json.loads(json.dumps(GOOD))
        kept['chapters'][0]['beats'][3]['delivery'] = 'punch'
        self.assertEqual(drama.direct_script(kept)['chapters'][0]['beats'][3]['delivery'], 'punch')   # the writer's own stays


class MiniDrama(unittest.TestCase):
    def test_a_script_with_the_shape_passes(self):
        self.assertEqual(script.mini_drama(GOOD), [])

    def test_each_missing_part_is_said_in_words(self):
        flat = {'chapters': [{'title': 'A season', 'beats': [beat('The club played in the league.'), beat('The ground was full.'), beat('The players wore plain shirts.'),
                                                              beat('The supporters sang.'), beat('The season went on.')]},
                             {'title': 'More', 'beats': [beat('It was a season.')]}]}
        errs = script.mini_drama(flat)
        text = ' | '.join(errs)
        for part in ('WANT', 'OBSTACLE', 'CLOCK', 'TURN', 'never pays off', 'cliff edge', 'plant no question'):
            self.assertIn(part, text)
        self.assertTrue(all('[mini-drama]' in e for e in errs))
        self.assertTrue(errs[0].startswith('Chapter 1 ("A season")'))
        no_joy = json.loads(json.dumps(GOOD))
        for i in (5, ):
            no_joy['chapters'][0]['beats'][i] = beat('United played in the first round.', 'illustration')
        no_joy['chapters'][1]['beats'][4:] = [beat('The shoot-out ended four–two.', 'table', ['final']), beat('The players walked off.', 'illustration')]
        self.assertTrue(any('pure joy' in e for e in script.mini_drama(no_joy)))

    def test_one_rewrite_and_only_a_better_script_is_taken(self):
        flat = {'chapters': [{'title': 'A', 'beats': [beat('The club played.')] * 5}]}
        calls = []
        keep = writer.call_model
        log = []
        with tempfile.TemporaryDirectory() as d:
            try:
                writer.call_model = lambda system, user, **kw: (calls.append(user), (json.dumps(GOOD), {'provider': 't', 'model': 'm', 'seconds': 0}))[1]
                out = writer.drama_pass(json.loads(json.dumps(flat)), lambda sc: [], 'BRIEF', '{}', Path(d), log.append)
                self.assertEqual((len(calls), out['drama_check']['rewritten'], out['drama_check']['errors']), (1, True, []))
                self.assertIn('[mini-drama]', calls[0])
                # a rewrite that breaks a check, or is no closer to the shape, is refused: the first script stays
                bad = writer.drama_pass(json.loads(json.dumps(flat)), lambda sc: ['a claim is wrong'] if sc.get('drama') else [], 'BRIEF2', '{}', Path(d), log.append)
                self.assertFalse(bad['drama_check']['rewritten'])
                self.assertTrue(bad['drama_check']['errors'])
                writer.call_model = lambda *a, **k: (_ for _ in ()).throw(RuntimeError('busy'))
                still = writer.drama_pass(json.loads(json.dumps(flat)), lambda sc: [], 'BRIEF3', '{}', Path(d), log.append)
                self.assertFalse(still['drama_check']['rewritten'])                       # a busy tier never fails the film
                n = len(calls)
                good = writer.drama_pass(json.loads(json.dumps(GOOD)), lambda sc: [], 'BRIEF4', '{}', Path(d), log.append)
                self.assertEqual((len(calls), good['drama_check']), (n, {'errors': [], 'rewritten': False}))   # nothing to fix: nobody is asked
            finally:
                writer.call_model = keep

    def test_the_writer_is_told_the_shape(self):
        for word in ('WANT', 'OBSTACLE', 'CLOCK', 'TURN', 'PAYOFF', 'CLIFF EDGE', 'first fifteen seconds', '"drama": 1'):
            self.assertIn(word, writer.SYSTEM)
        self.assertIn('"drama": 1', script.SCHEMA_TEXT)


class Craft(unittest.TestCase):
    def test_the_pace_follows_the_sheet(self):
        self.assertEqual(E.pace({}), E.TARGET)
        self.assertEqual(E.pace({'emotion': 'tension', 'intensity': 1.0}), E.TIGHT)       # short as tension rises
        self.assertLess(E.pace({'emotion': 'tension', 'intensity': 0.9}), E.pace({'emotion': 'tension', 'intensity': 0.3}))
        self.assertEqual(E.pace({'emotion': 'tension', 'intensity': 0.9, 'breath': True}), E.HELD)   # the held breath before the turn
        self.assertEqual(E.pace({'emotion': 'release', 'intensity': 1.0}), E.BURST)       # a burst at the release
        self.assertGreaterEqual(E.BURST, E.MIN_SUB)                                       # … of looks, never flickers (rule 142)
        img = {'kind': 'image', 'src': 'a.webp', 'move': 'push'}
        mk = lambda **m: E.cut([{'t': 0, 'd': 2, 'shots': [dict(img)], 'meta': {'n': 0, 'type': 'open'}},   # noqa: E731
                                {'t': 2, 'd': 11.4, 'shots': [dict(img)], 'meta': {'n': 1, 'type': 'illustration', **m}}])[1]
        looks = lambda b: [x['d'] for x in b['shots'] if x['kind'] == 'image']   # noqa: E731
        held, burst = mk(emotion='tension', intensity=0.8, breath=True), mk(emotion='release', intensity=1.0)
        self.assertEqual(len(looks(held)), 3)
        self.assertEqual(len(looks(burst)), 6)
        self.assertTrue(all(E.MIN_SUB <= x <= E.MAX_STILL for x in looks(held) + looks(burst)))
        self.assertEqual(burst['in'], 'cut')                                              # the release is a hard cut
        self.assertEqual(mk(emotion='grief', intensity=0.8)['in'], 'fade')                # grief arrives slowly
        self.assertEqual({x.get('grade') for x in burst['shots'] if x['kind'] == 'image'}, {'bloom'})
        self.assertEqual({x.get('grade') for x in mk(emotion='dread', intensity=0.8)['shots'] if x['kind'] == 'image'}, {'cold'})
        self.assertEqual({x.get('grade') for x in mk()['shots'] if x['kind'] == 'image'}, {None})

    def film(self, beats):
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}, 'silent': True}, Path('/tmp'))
        f.agg_moves = []
        return f, f.page(f.build(beats))

    def test_colour_is_a_slow_grade_and_the_clock_and_the_score_are_drawn(self):
        cut = E.cut([{'t': 0, 'd': 9, 'meta': {'n': 0, 'type': 'goal', 'emotion': 'release', 'intensity': 1.0}, 'shots': [
            {'kind': 'image', 'src': 'a.webp', 'move': 'slam', 'mini': {'home': 'A', 'score': '0–0', 'away': 'B', 'at': 0.4, 'flip': {'score': '1–0', 'at': 3.4}}},
            {'kind': 'clockdev', 'minute': 85, 'span': 90, 'dt': 0.6, 'd': 8.4}]}])
        first = cut[0]['shots'][0]
        edges = [x['dt'] for x in cut[0]['shots'] if x['kind'] == 'image' and x.get('dt')]
        self.assertTrue(first['mini']['flip']['on_cut'])
        self.assertIn(first['mini']['flip']['at'], edges)                                 # the scoreline changes ON a cut
        f, page = self.film(cut)
        js = '\n'.join(f.tw)
        self.assertIn('textContent:"1–0"', js)
        self.assertIn('class="bloom"', page)
        self.assertRegex(js, r'opacity:0\},\{opacity:0\.3,duration:1\.4')                 # the bloom rises over 1.4 s: never a flash
        self.assertIn('saturate(1.18)', page)
        self.assertIn(">85'</b>", page)
        self.assertIn('scaleX:0.9444', js)                                                # 85 of 90, once, eased
        self.assertNotRegex(js.split('ck')[1] if 'ck' in js else '', r'yoyo|repeat')
        self.assertLessEqual(B.BLOOM_TO * 255 / (B.BLOOM_S * 25), 3.0)                    # levels a frame: far under the gate's flash


if __name__ == '__main__':
    unittest.main()

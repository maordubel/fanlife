"""The hook judge (studio/hook_judge.py): three openings scored against the hook laws, the best one spoken, the reason
kept for the desk; the critic only ever breaks a tie and is never needed; a pitch's three scripts are chosen the same way."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import hook_judge as hj  # noqa: E402
from studio import writer  # noqa: E402
from studio.common import StageError  # noqa: E402

LEDGER = {'club_name': 'Hapoel Tel Aviv', 'summary': {},
          'claims': [{'id': 'm1', 'fact': {'kind': 'match', 'date': '2000-05-13', 'opponent': 'Maccabi Haifa', 'home': 'Hapoel Tel Aviv',
                                           'away': 'Maccabi Haifa', 'score_home': 3, 'score_away': 1, 'side': 'home', 'outcome': 'win'}},
                     {'id': 'm0', 'fact': {'kind': 'match', 'date': '1999-08-21', 'opponent': 'Bnei Yehuda', 'home': 'Hapoel Tel Aviv',
                                           'away': 'Bnei Yehuda', 'score_home': 0, 'score_away': 0, 'side': 'home', 'outcome': 'draw'}}],
          'story': {'moments': [{'id': 'm1', 'why': 'the decider'}]}}
STRONG = ('Maccabi Haifa needed one point, and nobody in Bloomfield believed Hapoel could stop them. '
          'The champions had not lost in months. So how did the night end with their coach walking off alone? '
          'This is the part of that evening the highlights left out.')
MIDDLE = ('One night decided a whole season for the red half of the city. '
          'The supporters who were there still argue about it. '
          'By the end you will know what really turned it.')
WEAK = ('In the year of the millennium this is the story of an incredible football season. '
        'Hapoel Tel Aviv won three-one against Maccabi Haifa at the end of it and everybody was happy. '
        'It was an amazing time for the club and its many supporters across the country.')


def opts(*texts, ids=('m1',)):
    return [{'text': t, 'claim_ids': list(ids)} for t in texts]


class Scoring(unittest.TestCase):
    def test_the_weak_hook_loses_and_says_why(self):
        v = hj.judge(opts(WEAK, MIDDLE, STRONG), LEDGER)
        by = {r['n']: r for r in v['scores']}
        self.assertEqual(v['winner'], 3)
        self.assertLess(by[1]['score'], by[2]['score'])
        self.assertLess(by[2]['score'], by[3]['score'])
        self.assertEqual(by[1]['laws']['cliche'], 0)          # "In the year… this is the story of…"
        self.assertEqual(by[1]['laws']['moment'], 0)          # the calendar, not the moment
        self.assertEqual(by[1]['laws']['spoiler'], 0)         # "three-one" is the decider's final score
        self.assertTrue(any('ban' in n for n in by[1]['notes']))
        self.assertIn('opening 3 scored', v['reason'])

    def test_it_is_deterministic_and_bounded(self):
        a, b = hj.judge(opts(WEAK, MIDDLE, STRONG), LEDGER), hj.judge(opts(WEAK, MIDDLE, STRONG), LEDGER)
        self.assertEqual(a, b)
        self.assertTrue(all(0 <= r['score'] <= 100 for r in a['scores']))
        self.assertEqual(sum(hj.POINTS.values()), 100)

    def test_the_budget_is_the_first_ten_seconds_at_the_narrators_pace(self):
        self.assertEqual(hj.FIRST_WORDS, round(hj.WORDS_PER_MINUTE * 10 / 60))
        long_first = ' '.join(['word'] * (hj.FIRST_WORDS + 9)) + '. Short. Short too.'
        self.assertLess(hj.score_option({'text': long_first, 'claim_ids': []}, LEDGER)['laws']['budget'], hj.POINTS['budget'])

    def test_a_dead_heat_keeps_the_writers_order(self):
        self.assertEqual(hj.judge(opts(MIDDLE, MIDDLE, MIDDLE), LEDGER, call=lambda *a, **k: (_ for _ in ()).throw(StageError('WRITER_BUSY', 'x')))['winner'], 1)


class Critic(unittest.TestCase):
    def test_it_is_asked_only_inside_a_tie_and_then_decides(self):
        calls = []

        def call(system, user, max_tokens=0):
            calls.append(user)
            return '{"pick": 2, "why": "the stronger question"}', {}
        v = hj.judge(opts(MIDDLE, MIDDLE + ' ', WEAK), LEDGER, call=call)
        self.assertEqual((len(calls), v['winner'], v['critic']['pick']), (1, 2, 2))
        self.assertNotIn(WEAK[:30], calls[0])                 # only the tied openings are shown to it
        calls.clear()
        self.assertEqual(hj.judge(opts(WEAK, MIDDLE, STRONG), LEDGER, call=call)['winner'], 3)
        self.assertEqual(calls, [])                           # a clear winner costs no request

    def test_a_film_never_fails_because_the_critic_is_away(self):
        for bad in (lambda *a, **k: (_ for _ in ()).throw(StageError('WRITER_QUOTA_DAY', 'spent')),
                    lambda *a, **k: ('not json', {}), lambda *a, **k: ('{"pick": 9}', {}),
                    lambda *a, **k: (_ for _ in ()).throw(RuntimeError('boom'))):
            v = hj.judge(opts(MIDDLE, MIDDLE + ' ', WEAK), LEDGER, call=bad)
            self.assertEqual((v['winner'], v['critic']), (1, None))

    def test_without_a_key_nothing_is_asked(self):
        import os
        keep = {k: os.environ.pop(k, None) for k in ('GEMINI_API_KEY', 'GEMINI_API_KEY_KIDS')}
        try:
            self.assertFalse(hj.critic_available())
            self.assertIsNone(hj.ask_critic([(1, 'a'), (2, 'b')], None, lambda m: None))
        finally:
            for k, x in keep.items():
                if x is not None:
                    os.environ[k] = x


def script(first, *others, beats=None):
    beats = beats or [{'narration': s, 'claim_ids': ['m1'], 'visual': {'type': 'trailer'}} for s in hj.sentences(first)]
    return {'hook': hj.sentences(first)[0], 'hook_options': opts(first, *others),
            'chapters': [{'beats': beats + [{'narration': 'Then the season began.', 'claim_ids': ['m0'], 'visual': {'type': 'score'}}]}]}


class Speaking(unittest.TestCase):
    def test_the_winner_is_spoken_across_the_opening_beats_and_becomes_option_one(self):
        s = script(MIDDLE, WEAK, STRONG)
        out = hj.judge_script(s, LEDGER, lambda x: [])
        said = ' '.join(b['narration'] for b in out['chapters'][0]['beats'][:3])
        self.assertEqual(said, STRONG)
        self.assertEqual(out['hook_options'][0]['text'], STRONG)
        self.assertEqual(out['hook'], hj.sentences(STRONG)[0])
        self.assertEqual((out['hook_judge']['winner'], out['hook_judge']['spoken']), (3, 3))
        self.assertEqual(len(out['hook_judge']['scores']), 3)
        self.assertEqual(out['chapters'][0]['beats'][3]['narration'], 'Then the season began.')   # the film after it is untouched
        self.assertEqual(s['chapters'][0]['beats'][0]['narration'], hj.sentences(MIDDLE)[0])       # the original is not edited in place

    def test_a_swap_that_breaks_a_check_is_not_made(self):
        s = script(MIDDLE, WEAK, STRONG)
        out = hj.judge_script(s, LEDGER, lambda x: ['broken'] if x['hook_options'][0]['text'] == STRONG else [])
        self.assertEqual(out['hook_options'][0]['text'], MIDDLE)
        self.assertEqual((out['hook_judge']['winner'], out['hook_judge']['spoken']), (3, 1))
        self.assertIn('broke a check', out['hook_judge']['reason'])

    def test_other_evidence_or_a_woven_opening_keeps_the_first(self):
        s = script(MIDDLE, WEAK, STRONG)
        s['hook_options'][2]['claim_ids'] = ['m0']             # the winner stands on a claim the opening pictures do not cite
        self.assertEqual(hj.judge_script(s, LEDGER, lambda x: [])['hook_judge']['spoken'], 1)
        woven = script(MIDDLE, WEAK, STRONG, beats=[{'narration': MIDDLE + ' And then more.', 'claim_ids': ['m1'], 'visual': {'type': 'trailer'}}])
        self.assertIn('woven', hj.judge_script(woven, LEDGER, lambda x: [])['hook_judge']['reason'])

    def test_a_judged_script_is_not_judged_again(self):
        s = hj.judge_script(script(STRONG, MIDDLE, WEAK), LEDGER, lambda x: [])
        self.assertIs(hj.judge_script(s, LEDGER, lambda x: ['never called']), s)


class PickingAScript(unittest.TestCase):
    def three(self):
        a = hj.judge_script({**script(WEAK, MIDDLE + ' x', MIDDLE + ' y'), '_director': 'broadcaster'}, LEDGER, lambda x: ['keep'])
        b = hj.judge_script({**script(STRONG, MIDDLE, WEAK), '_director': 'terrace'}, LEDGER, lambda x: [])
        c = hj.judge_script({**script(MIDDLE, WEAK, WEAK + ' z'), '_director': 'trailer'}, LEDGER, lambda x: [])
        return [a, b, c]

    def test_the_best_spoken_opening_wins_and_the_scores_are_recorded(self):
        k, rec = hj.pick_script(self.three(), LEDGER, lambda s: [], lead='trailer')
        self.assertEqual((k, rec['chosen']), (1, 2))
        self.assertEqual([r['director'] for r in rec['scripts']], ['broadcaster', 'terrace', 'trailer'])
        self.assertIn('terrace', rec['reason'])

    def test_a_script_that_fails_the_director_rules_cannot_win(self):
        k, rec = hj.pick_script(self.three(), LEDGER, lambda s: ['[director rule 4] a third "score" in a row'] if s['_director'] == 'terrace' else [])
        self.assertNotEqual(k, 1)
        self.assertFalse(rec['scripts'][1]['valid'])

    def test_a_dead_heat_goes_to_the_director_who_pitched(self):
        two = [hj.judge_script({**script(MIDDLE, WEAK, WEAK + ' z'), '_director': d}, LEDGER, lambda x: []) for d in ('broadcaster', 'trailer')]
        self.assertEqual(hj.pick_script(two, LEDGER, lambda s: [], lead='trailer')[0], 1)
        self.assertEqual(hj.pick_script(two, LEDGER, lambda s: [])[0], 0)


class Quota(unittest.TestCase):
    """Three scripts, then two, then one when the free daily quota ends (write_options, least=1) — never a failed film."""

    def run_with(self, fail_at, code, least):
        made, logs = [], []

        def fake(brief, ledger, cache, log, director=None, avoid=None, angle=None):
            if len(made) == fail_at:
                raise StageError(code, 'the free tier said no', retryable=True)
            made.append(director['id'])
            return {'hook': director['id'], 'title_candidates': [{'title': director['id']}], 'selected': 0}
        keep, writer.write_script = writer.write_script, fake
        try:
            return writer.write_options({'lead_director': 'trailer'}, LEDGER, Path('/tmp'), logs.append, least=least), made, logs
        finally:
            writer.write_script = keep

    def test_a_spent_day_leaves_two_then_one_and_says_so(self):
        out, made, logs = self.run_with(2, 'WRITER_QUOTA_DAY', 1)
        self.assertEqual(len(out), 2)
        out, made, logs = self.run_with(1, 'WRITER_QUOTA_DAY', 1)
        self.assertEqual((len(out), made), (1, ['trailer']))          # the pitching director wrote first: the one script is his
        self.assertTrue(any('1 of 3' in m for m in logs))

    def test_nothing_written_still_waits_and_the_owners_choice_still_needs_two(self):
        with self.assertRaises(StageError):
            self.run_with(0, 'WRITER_QUOTA_DAY', 1)
        with self.assertRaises(StageError):
            self.run_with(1, 'WRITER_QUOTA_DAY', 2)
        with self.assertRaises(StageError):
            self.run_with(1, 'WRITER_BUSY', 1)                        # a busy minute is waited out, not settled for


if __name__ == '__main__':
    unittest.main()

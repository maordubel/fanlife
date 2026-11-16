"""The house crew (studio/house.py, owner 16.11.2026): three writers, three directors and three editors who make a film
from the record alone — no model, no key — and hold it to every check a model's script must pass."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from studio import house, house_writer as HW, script as sc, writer
from studio.common import StageError
from studio.director import attach


def match(i, date, opp, cg, og, comp='League', stage=None, side='home', scorers=None, opp_scorers=None):
    outcome = 'win' if cg > og else 'loss' if cg < og else 'draw'
    home, away = ('Test FC', opp) if side == 'home' else (opp, 'Test FC')
    sh, sa = (cg, og) if side == 'home' else (og, cg)
    return {'id': f'm{i}', 'type': 'match', 'fact': {
        'kind': 'match', 'date': date, 'competition': comp, 'stage': stage, 'club': 'Test FC', 'opponent': opp, 'side': side,
        'home': home, 'away': away, 'score_home': sh, 'score_away': sa, 'club_goals': cg, 'opponent_goals': og, 'outcome': outcome,
        'venue': None, 'title_decided': False, 'scorers': scorers, 'scorers_note': None},
        'sources': [{'id': 's', 'url': 'https://example.org'}], 'confidence': 2, 'status': 'archive', 'conflicts': []}


def ledger(claims, season='2001/02', focus=None):
    from studio.research import season_summary
    led = {'club_id': 'test-fc', 'club_name': 'Test FC', 'season': season, 'claims': claims, 'held': [], **({'focus': focus} if focus else {})}
    led['summary'] = season_summary(led)
    return attach(led)


def season_claims():
    opps = ['Rovers', 'Athletic', 'Wanderers', 'Albion', 'Harbour', 'Valley', 'Rangers', 'County', 'Borough', 'Dynamo']
    out, i = [], 0
    results = [(1, 1), (0, 2), (2, 2), (0, 1), (1, 0), (2, 0), (3, 1), (2, 1), (1, 0), (4, 0), (2, 2), (1, 2), (3, 0), (2, 0), (1, 1),
               (2, 1), (3, 2), (1, 0)]
    for k, (cg, og) in enumerate(results):
        i += 1
        month = 8 + k // 4
        y, mth = (2001, month) if month <= 12 else (2002, month - 12)
        sc_ = [{'name': 'Avi Cohen', 'minute': 30 + k, 'penalty': False, 'own_goal': False}] if cg else None
        out.append(match(i, f'{y}-{mth:02d}-{(k % 4) * 7 + 3:02d}', opps[k % len(opps)], cg, og, scorers=sc_))
    out.append(match(99, '2002-05-20', 'City', 2, 1, comp='Cup', stage='Final', scorers=[
        {'name': 'Avi Cohen', 'minute': 12, 'penalty': False, 'own_goal': False}, {'name': 'Dan Levi', 'minute': 88, 'penalty': False, 'own_goal': False}]))
    out.append({'id': 'h1', 'type': 'honour', 'fact': {'kind': 'honour', 'season': '2001/02', 'club': 'Test FC', 'competition': 'Cup', 'result': 'won'},
                'sources': [{'id': 's', 'url': 'https://example.org'}], 'confidence': 2, 'status': 'archive', 'conflicts': []})
    return out


def check(led, kind):
    return lambda s, m: sc.validate_script(s, led, m, kind) + writer.hook_option_errors(s, led)


class HouseWriters(unittest.TestCase):
    def test_every_writer_writes_a_season_that_passes_every_check(self):
        led = ledger(season_claims())
        hooks, titles = set(), set()
        for d in ('broadcaster', 'terrace', 'trailer'):
            s = house.write({'duration': 5, 'kind': 'season'}, led, d, log=lambda m: None, check_at=check(led, 'season'))
            self.assertEqual(check(led, 'season')(s, s['_minutes']), [], d)
            self.assertEqual(s['_house']['unit'], d)
            self.assertEqual(s['director'], 2)
            self.assertEqual(s['drama'], 1)
            hooks.add(s['hook'])
            titles.add(s['title_candidates'][s['selected']]['title'])
        self.assertEqual(len(hooks), 3, 'three writers, three openings')
        self.assertEqual(len(titles), 3, 'three writers, three titles')

    def test_the_same_record_gives_the_same_script(self):
        led = ledger(season_claims())
        a = house.write({'duration': 5, 'kind': 'season'}, led, 'terrace', log=lambda m: None)
        b = house.write({'duration': 5, 'kind': 'season'}, led, 'terrace', log=lambda m: None)
        self.assertEqual(a['chapters'], b['chapters'])

    def test_the_opening_withholds_the_result_and_pays_it_off_late(self):
        led = ledger(season_claims())
        s = house.write({'duration': 5, 'kind': 'season'}, led, 'broadcaster', log=lambda m: None)
        top = HW.Book(led, 'season').top
        self.assertEqual(top, 'm99', 'the cup final is the strongest moment')
        self.assertNotIn('2–1', s['hook_options'][0]['text'], 'the opening never gives away the final score')
        drama = sc.mini_drama(s)
        self.assertFalse([e for e in drama if 'paid off' in e or 'before the midpoint' in e], drama)

    def test_a_number_the_record_does_not_hold_is_never_written(self):
        led = ledger(season_claims())
        for d in ('broadcaster', 'terrace', 'trailer'):
            s = house.write({'duration': 5, 'kind': 'season'}, led, d, log=lambda m: None)
            for ch in s['chapters']:
                for b in ch['beats']:
                    v = b['visual']
                    ids = b['claim_ids'] + ([v['claim']] if isinstance(v.get('claim'), str) else []) + list(v.get('claims') or [])
                    self.assertEqual(sc.fact_guard(b['narration'], led, ids), [], b['narration'])

    def test_one_match_is_told_goal_by_goal(self):
        cl = [match(1, '2002-05-20', 'City', 2, 1, comp='Cup', stage='Final', scorers=[
            {'name': 'Avi Cohen', 'minute': 12, 'penalty': False, 'own_goal': False}, {'name': 'Dan Levi', 'minute': 88, 'penalty': False, 'own_goal': False}])]
        led = ledger(cl, focus={'matches': ['m1']})
        s = house.write({'duration': 3, 'kind': 'match'}, led, 'broadcaster', log=lambda m: None, check_at=check(led, 'match'))
        types = [b['visual']['type'] for ch in s['chapters'] for b in ch['beats']]
        self.assertIn('versus', types)
        self.assertIn('goal', types)
        self.assertEqual(check(led, 'match')(s, s['_minutes']), [])

    def test_a_film_too_thin_to_carry_is_refused_not_padded(self):
        with self.assertRaises(StageError):
            house.write({'duration': 5, 'kind': 'season'}, ledger([]), 'broadcaster', log=lambda m: None)

    def test_a_name_with_a_full_stop_does_not_break_a_sentence(self):
        self.assertEqual(HW.spoken('FC St. Pauli'), 'FC Saint Pauli')


class WriterHandsOver(unittest.TestCase):
    def test_no_key_means_the_house_writes_at_once(self):
        led = ledger(season_claims())
        env = {k: '' for k in ('GEMINI_API_KEY', 'GEMINI_API_KEY_KIDS', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'STORIES_WRITER')}
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(os.environ, env), mock.patch.object(writer, '_MODEL_DOWN', [None, 0.0]):
            opts = writer.write_options({'duration': 5, 'kind': 'season'}, led, Path(tmp), lambda m: None)
        self.assertEqual([o['_director'] for o in opts], ['broadcaster', 'terrace', 'trailer'])
        self.assertEqual([o['_house']['writer'] for o in opts], ['chronicler', 'poet', 'mythmaker'])

    def test_a_spent_quota_is_not_waited_for(self):
        led = ledger(season_claims())
        calls = []

        def spent(*a, **k):
            calls.append(1)
            raise StageError('WRITER_QUOTA_DAY', 'spent', retryable=False)
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(writer, 'call_model', spent), \
                mock.patch.object(writer, '_MODEL_DOWN', [None, 0.0]), mock.patch.dict(os.environ, {'STORIES_WRITER': ''}):
            opts = writer.write_options({'duration': 5, 'kind': 'season'}, led, Path(tmp), lambda m: None)
        self.assertEqual(len(opts), 3)
        self.assertEqual(len(calls), 1, 'one refusal is enough: the other directors go straight to the house')

    def test_the_variable_puts_the_house_first(self):
        led = ledger(season_claims())
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(os.environ, {'STORIES_WRITER': 'house'}), \
                mock.patch.object(writer, 'call_model', side_effect=AssertionError('no model call')):
            s = writer.write_script({'duration': 5, 'kind': 'season'}, led, Path(tmp), lambda m: None)
        self.assertEqual(s['_writer'][0]['source'], 'house')


class HouseDirectorsAndEditors(unittest.TestCase):
    def test_the_director_never_puts_a_celebration_on_a_defeat(self):
        shots = house.direct([{'n': 1, 'type': 'score', 'text': 'Test FC lost 0–2 to Rovers. A long, quiet way home.', 'candidates': [
            {'id': 'beat:common/celebration-pyro', 'shows': 'fans celebrating with flares', 'subjects': ['pyro', 'crowd'], 'moods': ['joy']},
            {'id': 'beat:common/terrace-empty', 'shows': 'empty terrace at night', 'subjects': ['stand'], 'moods': ['grief']}]}],
            'terrace', log=lambda m: None)
        self.assertEqual(shots[1]['pick'], 'beat:common/terrace-empty')
        self.assertIn('beat:common/celebration-pyro', shots[1]['reject'])

    def test_each_director_has_his_own_eye(self):
        cands = [{'id': 'a', 'shows': 'keeper dives at goal', 'subjects': ['keeper', 'goal'], 'moods': ['tension']},
                 {'id': 'b', 'shows': 'crowd with scarves in the street', 'subjects': ['crowd', 'street'], 'moods': ['tension']}]
        line = [{'n': 1, 'type': 'versus', 'text': 'It was a decider, and there was no second chance.', 'candidates': cands}]
        self.assertEqual(house.direct(line, 'broadcaster', log=lambda m: None)[1]['pick'], 'a')
        self.assertEqual(house.direct(line, 'terrace', log=lambda m: None)[1]['pick'], 'b')

    def test_an_editor_keeps_the_hard_limits(self):
        from studio.docu import editor as E
        for d in ('broadcaster', 'terrace', 'trailer'):
            prof = house.editor_profile(d)
            for emo in ('tension', 'joy', 'grief', None):
                v = house.paced(3.9, emo, prof, E.MIN_SUB + 0.1, E.MAX_STILL)
                self.assertTrue(E.MIN_SUB < v <= E.MAX_STILL)
            self.assertLessEqual(prof['card'], 1.0)

    def test_the_roster_is_three_by_three(self):
        r = house.roster()
        self.assertEqual([len(r[k]) for k in ('writers', 'directors', 'editors')], [3, 3, 3])


if __name__ == '__main__':
    unittest.main()

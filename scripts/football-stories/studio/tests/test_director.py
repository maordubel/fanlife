"""The Director's Cut, workstream A (docs/fanlife/66-directors-cut.md): the story block the record proves, the new cards
and beat fields, and the director rules — each rule with a script that breaks it and one that keeps it. No network."""
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import director, research, writer  # noqa: E402
from studio.common import read_json  # noqa: E402
from studio.script import validate_script, with_cta  # noqa: E402

PILOT = HERE / 'studio' / 'dossiers' / 'pilot-hapoel-1999-00.script.json'


# ── a synthetic season ───────────────────────────────────────────────────────────────────────────────────────────────
def match(i, date, opp, cg, og, side='home', comp='League', stage=None, scorers=None, **kw):
    f = {'kind': 'match', 'date': date, 'competition': comp, 'stage': stage, 'club': 'Testers', 'opponent': opp, 'side': side,
         'home': 'Testers' if side == 'home' else opp, 'away': opp if side == 'home' else 'Testers',
         'score_home': cg if side == 'home' else og, 'score_away': og if side == 'home' else cg,
         'club_goals': cg, 'opponent_goals': og, 'outcome': 'win' if cg > og else 'draw' if cg == og else 'loss',
         'scorers': scorers, **kw}
    return {'id': i, 'type': 'match', 'fact': f, 'sources': [{'url': 'https://example.org/' + i}], 'confidence': 2}


def ledger(claims, **kw):
    L = {'club_id': 'testers', 'club_name': 'Testers', 'season': '2001/02', 'claims': claims, 'held': [], **kw}
    L['summary'] = research.season_summary(L)
    return L


def season(results: str, **kw):
    """A league season from a string of results: W 2–0, D 1–1, L 0–2, one match a week from August."""
    import datetime as dt
    out = []
    d0 = dt.date(2001, 8, 4)
    for k, r in enumerate(results):
        cg, og = {'W': (2, 0), 'D': (1, 1), 'L': (0, 2)}[r]
        out.append(match(f'm{k + 1:02d}', (d0 + dt.timedelta(days=7 * k)).isoformat(), f'Club {k + 1}', cg, og))
    return ledger(out, **kw)


class FormLine(unittest.TestCase):
    def test_form_is_wins_minus_defeats_and_gd_accumulates(self):
        st = director.story(season('WWLDW'))
        self.assertEqual([m['form'] for m in st['matches']], [1, 2, 1, 1, 2])
        self.assertEqual([m['gd'] for m in st['matches']], [2, 4, 2, 2, 4])
        self.assertEqual((st['totals']['won'], st['totals']['drawn'], st['totals']['lost'], st['totals']['form']), (3, 1, 1, 2))

    def test_never_a_position_or_points(self):
        text = json.dumps(director.story(season('WWLDWLLWWDW')))
        for word in ('"position"', '"points"', '"pos"', '"table"', '"rank"'):
            self.assertNotIn(word, text)

    def test_the_same_ledger_gives_the_same_story(self):
        L = season('WLDWWLWLLDWW')
        self.assertEqual(json.dumps(director.story(L)), json.dumps(director.story(copy.deepcopy(L))))

    def test_runs(self):
        st = director.story(season('WWWWLDDWDWLLL'))
        kinds = {(r['kind'], r['length']) for r in st['runs']}
        self.assertIn(('wins', 4), kinds)
        self.assertIn(('losses', 3), kinds)
        self.assertIn(('unbeaten', 5), kinds)              # D D W D W: unbeaten, with draws in it
        first = st['matches'][0]
        self.assertIn('streak-start', first['tags'])

    def test_the_turn_and_the_shape_of_a_fall_and_a_recovery(self):
        st = director.story(season('WWLLLLLWWWWW'))
        self.assertEqual(st['shape'], 'fall-and-recovery')
        self.assertEqual(st['turning_point'], 'm08')       # the first win of the new trend
        self.assertEqual(st['turning_direction'], 'up')
        acts = {a['name']: a for a in st['acts']}
        ids = [m['id'] for m in st['matches']]
        self.assertEqual(acts['Act I']['ids'] + acts['Act II']['ids'] + acts['Act III']['ids'], ids)  # a partition, in order
        self.assertEqual(acts['Act III']['ids'][0], 'm08')  # the recovery starts at the bottom
        self.assertEqual([a['name'] for a in st['acts']], ['Cold open', 'Act I', 'Act II', 'Act III', 'Epilogue'])

    def test_a_dominant_season_is_a_rise_and_a_flat_one_steady(self):
        self.assertEqual(director.story(season('WWDWWWDWWWWW'))['shape'], 'rise')
        self.assertEqual(director.story(season('WLDWLDWLDWLD'))['shape'], 'steady')
        self.assertIsNone(director.story(season('WLDWLDWLDWLD'))['turning_point'])

    def test_one_match_is_three_acts_of_one_night(self):
        st = director.story(ledger([match('a', '2002-05-01', 'X', 1, 0)]))
        self.assertEqual(st['shape'], 'single')
        self.assertTrue(all(a['ids'] for a in st['acts']))


class Tags(unittest.TestCase):
    def test_late_winner_needs_the_minutes(self):
        late = match('a', '2002-01-01', 'X', 2, 1, scorers=[{'name': 'A', 'minute': 10}, {'name': 'B', 'minute': 88}])
        early = match('b', '2002-01-08', 'Y', 2, 1, scorers=[{'name': 'A', 'minute': 10}, {'name': 'B', 'minute': 60}])
        unnamed = match('c', '2002-01-15', 'Z', 2, 1, scorers=None)
        two = match('d', '2002-01-22', 'V', 2, 0, scorers=[{'name': 'A', 'minute': 10}, {'name': 'B', 'minute': 89}])
        tags = {m['id']: m['tags'] for m in director.story(ledger([late, early, unnamed, two]))['matches']}
        self.assertIn('late-winner', tags['a'])
        for k in 'bcd':
            self.assertNotIn('late-winner', tags[k])

    def test_with_the_opponents_minutes_a_late_winner_must_break_a_level_score(self):
        m = match('a', '2002-01-01', 'X', 2, 1, scorers=[{'name': 'A', 'minute': 10}, {'name': 'B', 'minute': 87}])
        det = {'id': 'd', 'fact': {'kind': 'match-detail', 'date': '2002-01-01', 'opponent_scorers': [{'name': 'Z', 'minute': 89}]},
               'sources': [{'url': 'https://example.org/d'}]}
        self.assertNotIn('late-winner', director.story(ledger([m, det]))['matches'][0]['tags'])
        det['fact']['opponent_scorers'][0]['minute'] = 40
        self.assertIn('late-winner', director.story(ledger([m, det]))['matches'][0]['tags'])

    def test_comeback_needs_minutes_or_a_half_time_score(self):
        m = match('a', '2002-01-01', 'X', 2, 1, scorers=[{'name': 'A', 'minute': 60}, {'name': 'B', 'minute': 80}])
        self.assertNotIn('comeback', director.story(ledger([m]))['matches'][0]['tags'])   # no proof the club was behind
        det = {'id': 'd', 'fact': {'kind': 'match-detail', 'date': '2002-01-01', 'opponent_scorers': [{'name': 'Z', 'minute': 10}]},
               'sources': [{'url': 'https://example.org/d'}]}
        self.assertIn('comeback', director.story(ledger([m, det]))['matches'][0]['tags'])
        ht = {'id': 'h', 'fact': {'kind': 'match-detail', 'date': '2002-01-01', 'half_time': '0–1'}, 'sources': [{'url': 'https://example.org/h'}]}
        self.assertIn('comeback', director.story(ledger([match('a', '2002-01-01', 'X', 2, 1), ht]))['matches'][0]['tags'])

    def test_biggest_win_and_worst_defeat(self):
        L = ledger([match('a', '2002-01-01', 'X', 5, 0), match('b', '2002-01-08', 'Y', 1, 0), match('c', '2002-01-15', 'Z', 0, 3),
                    match('d', '2002-01-22', 'V', 0, 1)])
        tags = {m['id']: m['tags'] for m in director.story(L)['matches']}
        self.assertIn('biggest-win', tags['a'])
        self.assertIn('worst-defeat', tags['c'])
        self.assertNotIn('biggest-win', tags['b'])
        self.assertNotIn('worst-defeat', tags['d'])

    def test_a_group_is_not_a_tie_and_a_tie_is_a_decider(self):
        C = 'UEFA Cup'
        L = ledger([
            match('g1', '2002-09-17', 'A', 1, 0, 'away', 'UEFA Champions League'), match('g2', '2002-09-25', 'B', 0, 0, 'home', 'UEFA Champions League'),
            match('g3', '2002-10-02', 'C', 3, 3, 'home', 'UEFA Champions League'), match('g4', '2002-10-22', 'C', 2, 2, 'away', 'UEFA Champions League'),
            match('g5', '2002-10-30', 'A', 1, 1, 'home', 'UEFA Champions League'), match('g6', '2002-11-12', 'B', 1, 1, 'away', 'UEFA Champions League'),
            match('t1', '2002-11-28', 'D', 0, 2, 'away', C), match('t2', '2002-12-12', 'D', 3, 0, 'home', C)])
        st = director.story(L)
        tags = {m['id']: m['tags'] for m in st['matches']}
        self.assertNotIn('decider', tags['g4'])            # C home and away inside A's home and away: a group
        self.assertIn('decider', tags['t2'])
        self.assertIn('comeback', tags['t2'])              # lost the first leg, went through
        self.assertIn('europe', tags['t2'])
        self.assertTrue(next(m for m in st['matches'] if m['id'] == 't2')['through'])

    def test_a_final_and_a_shootout_from_a_penalties_claim(self):
        f = match('f', '2002-05-17', 'X', 2, 2, 'away', 'Cup', 'Final')
        pens = {'id': 'p', 'fact': {'kind': 'penalties', 'date': '2002-05-17', 'winner': 'Testers', 'shootout': '4–2'},
                'sources': [{'url': 'https://example.org/p'}]}
        st = director.story(ledger([match('a', '2002-01-01', 'Y', 3, 0), f, pens]))
        self.assertIn('final', st['matches'][1]['tags'])
        self.assertEqual(st['moments'][0]['id'], 'f')
        self.assertEqual(st['acts'][0]['ids'], ['f'])        # the cold open is the strongest moment

    def test_honours_are_the_epilogue(self):
        h = {'id': 'h1', 'type': 'honour', 'fact': {'kind': 'honour', 'competition': 'League', 'result': 'champions'},
             'sources': [{'url': 'https://example.org/h'}]}
        L = season('WWDW')
        L['claims'].append(h)
        st = director.story(L)
        self.assertEqual(st['honours'], [{'id': 'h1', 'competition': 'League', 'result': 'champions'}])
        self.assertIn('h1', st['acts'][-1]['ids'])


class Rivals(unittest.TestCase):
    def test_spellings(self):
        same = director.same_club
        self.assertTrue(same('Velež', ['FK Velež Mostar']))
        self.assertTrue(same('Olympiakos Piraeus', ['Olympiacos', 'Olympiakos Piraeus']))
        self.assertFalse(same('Olympiacos Volou', ['Olympiacos']))
        self.assertFalse(same('Berwick Rangers', ['Rangers']))
        self.assertFalse(same('Maccabi', ['Maccabi Petah Tikva']))
        self.assertFalse(same('Hapoel Tel Aviv', ['Maccabi Tel Aviv']))

    def test_a_derby_comes_from_the_pack_never_from_the_sound_of_a_name(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        Path(tmp.name, 'testers.json').write_text(json.dumps({'data': {'rivals': [
            {'status': 'approved', 'value': {'name': 'FK Velež Mostar'}}]}}), encoding='utf-8')
        old = research.COMPILED
        research.COMPILED = Path(tmp.name)
        self.addCleanup(lambda: setattr(research, 'COMPILED', old))
        st = director.story(ledger([match('a', '2002-01-01', 'Velež', 1, 0), match('b', '2002-01-08', 'Mostar Town', 1, 0)]))
        self.assertEqual([m['rival'] for m in st['matches']], [True, False])
        self.assertIn('derby', st['matches'][0]['tags'])
        self.assertEqual(st['rivals'], ['Velež'])

    def test_the_rivalry_films_opponent_is_the_rival(self):
        st = director.story(ledger([match('a', '2002-01-01', 'Old Foes', 1, 0)], focus={'opponent': 'Old Foes'}))
        self.assertTrue(st['matches'][0]['rival'])


class RealArchive(unittest.TestCase):
    """Hapoel Tel Aviv 1999/00 — The Worker's match master is in the repository, so this runs in CI too."""

    @classmethod
    def setUpClass(cls):
        cls.L = research.build_ledger('hapoel-tel-aviv', '1999/00', read_json(HERE / 'studio' / 'dossiers' / 'hapoel-tel-aviv-1999-00.json')['claims'])
        cls.st = director.story(cls.L)
        cls.by = {m['id']: m for m in cls.st['matches']}

    def test_the_double_season(self):
        st, by = self.st, self.by
        self.assertEqual(st['totals']['form'], st['totals']['won'] - st['totals']['lost'])
        self.assertEqual(st['rivals'], ['Maccabi Tel Aviv'])
        self.assertTrue(all('derby' in m['tags'] for m in st['matches'] if m['opponent'] == 'Maccabi Tel Aviv'))
        self.assertFalse(any('derby' in m['tags'] for m in st['matches'] if m['opponent'] != 'Maccabi Tel Aviv'))
        top = by[st['moments'][0]['id']]
        self.assertEqual((top['competition'], top['stage']), ('Israel State Cup', 'Final'))   # won on penalties: the cold open
        whys = {m['why'] for m in st['moments']}
        self.assertIn('title-decided', whys)
        self.assertEqual({h['competition'] for h in st['honours']}, {'Israeli Premier League', 'Israel State Cup'})

    def test_acts_partition_the_season(self):
        acts = {a['name']: a for a in self.st['acts']}
        ids = [m['id'] for m in self.st['matches']]
        self.assertEqual(acts['Act I']['ids'] + acts['Act II']['ids'] + acts['Act III']['ids'], ids)

    def test_a_pick_and_a_rivalry_have_their_own_story(self):
        one = director.story(research.pick(self.L, [self.st['moments'][0]['id']]))
        self.assertEqual(one['shape'], 'single')
        riv = director.story(research.rivalry_ledger('hapoel-tel-aviv', 'Maccabi Tel Aviv', '1995–2026'))
        self.assertGreater(len(riv['matches']), 20)
        self.assertTrue(all(m['rival'] for m in riv['matches']))

    @unittest.skipUnless((research.COMPILED / 'aek-athens.json').exists(), 'compiled packs are built by npm run clubs:precompile')
    def test_aek_2002_03(self):
        st = director.story(research.build_ledger('aek-athens', '2002/03'))
        by = {m['id']: m for m in st['matches']}
        olympiacos = [m for m in st['matches'] if m['opponent'] == 'Olympiacos']
        self.assertTrue(olympiacos and all('derby' in m['tags'] for m in olympiacos))
        madrid = [m for m in st['matches'] if m['opponent'] == 'Real Madrid']
        self.assertTrue(madrid and not any('decider' in m['tags'] for m in madrid))   # a group, home and away
        self.assertTrue(any('biggest-win' in m['tags'] and m['club_goals'] - m['opponent_goals'] == 6 for m in st['matches']))
        self.assertTrue(by[st['moments'][0]['id']]['tags'])


# ── the script ───────────────────────────────────────────────────────────────────────────────────────────────────────
def words(n: int) -> str:
    return ' '.join(['the'] * n)


def director_script(L: dict, chapter2_cards=None) -> dict:
    """A small season film that keeps every director rule, built from the ledger's own story."""
    st = director.story(L)
    top = st['moments'][0]['id']
    f = {c['id']: c['fact'] for c in L['claims']}[top]
    ids = [m['id'] for m in st['matches']]
    comp = next(iter(L['summary']['by_competition']))
    hook = 'Hold that moment.'
    ch1 = [
        {'narration': hook + ' ' + words(14), 'claim_ids': [top], 'visual': {'type': 'trailer', 'lines': ['NOBODY SAW IT COMING']},
         'camera': 'push', 'pace': 'fast', 'sfx': 'drum'},
        {'narration': 'The form line, all season. ' + words(12), 'claim_ids': ['story'], 'visual': {'type': 'race', 'label': 'The season', 'mark': [top]},
         'camera': 'drift'},
        {'narration': f'{f["opponent"]}, and everything on it. ' + words(12), 'claim_ids': [top], 'visual': {'type': 'versus', 'claim': top},
         'camera': 'push', 'broll': 'tunnel'},
        {'narration': 'And then the whistle. ' + words(12), 'claim_ids': [top], 'visual': {'type': 'score', 'claim': top}, 'sfx': 'whistle'},
        {'narration': words(10) + ' But how did they get there?', 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'terrace-crowd', 'caption': 'The end'}},
    ]
    ch2 = chapter2_cards or [
        {'narration': 'The league in full. ' + words(12), 'claim_ids': [f'summary:{comp}'], 'visual': {'type': 'record', 'claim': f'summary:{comp}'}},
        {'narration': 'Three in a row. ' + words(12), 'claim_ids': ids[:3], 'visual': {'type': 'form', 'claims': ids[:3], 'label': 'August'}},
        {'narration': 'The terrace emptied slowly. ' + words(8), 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'terrace-empty', 'caption': 'After'}},
    ]
    return {'director': 2,
            'title_candidates': [{'title': f'Title {k}', 'angle': 'search' if k % 2 else 'discovery'} for k in range(10)],
            'selected': 0, 'hook': hook,
            'chapters': [{'title': 'The night', 'beats': ch1}, {'title': 'The season', 'beats': ch2}],
            'description': 'x' * 300, 'tags': ['a', 'b', 'c', 'd', 'e'],
            'shorts': [{'hook': 'h', 'idea': 'i', 'claim_ids': []}, {'hook': 'h', 'idea': 'i', 'claim_ids': []}],
            'thumbnails': [{'text': 'One', 'concept': 'c', 'claim': None}] * 3}


def minutes_for(s: dict) -> float:
    """A film length that fits the script's own word count, so these tests are about the director rules alone."""
    n = sum(len(b['narration'].split()) for ch in s['chapters'] for b in ch['beats'])
    return round(n / 122 / 0.99, 3)


class DirectorRules(unittest.TestCase):
    def setUp(self):
        self.L = season('WWLLLLLWWWWW')
        self.s = director_script(self.L)

    def errs(self, s=None, kind=None):
        s = s or self.s
        return [e for e in validate_script(s, self.L, minutes_for(s), kind) if not e.startswith('Narration is')]

    def test_the_good_script_passes(self):
        self.assertEqual(self.errs(), [])
        self.assertEqual(self.errs(with_cta(copy.deepcopy(self.s), 'k')), [])  # the studio's follow and end beats do not break it

    def test_rule_1_a_result_needs_its_match_cited(self):
        s = copy.deepcopy(self.s)
        b = s['chapters'][1]['beats'][2]
        b['narration'] = 'They beat Club 3 that night. ' + words(6)
        self.assertTrue(any('[director rule 1]' in e and 'Club 3' in e for e in self.errs(s)))
        b['claim_ids'] = ['m03']
        self.assertFalse(any('[director rule 1]' in e for e in self.errs(s)))

    def test_rule_1_a_scoreline_must_be_the_cited_score(self):
        s = copy.deepcopy(self.s)
        b = s['chapters'][1]['beats'][1]
        b['narration'] = 'Three in a row, the first of them three-one. ' + words(6)
        self.assertTrue(any('scoreline 3–1' in e for e in self.errs(s)))
        b['narration'] = 'Three in a row, the first of them two-nil. ' + words(6)
        self.assertFalse(any('[director rule 1]' in e for e in self.errs(s)))
        b['narration'] = 'Three in a row, and a one-two down the left. ' + words(6)   # a pass, not a score
        self.assertFalse(any('[director rule 1]' in e for e in self.errs(s)))

    def test_rule_2_the_cards_each_film_needs(self):
        s = copy.deepcopy(self.s)
        s['chapters'][1]['beats'][0]['visual'] = {'type': 'illustration', 'art': 'supporter', 'caption': 'x'}
        s['chapters'][0]['beats'][1]['visual'] = {'type': 'illustration', 'art': 'supporter', 'caption': 'x'}
        s['chapters'][1]['beats'][1]['visual'] = {'type': 'stat', 'value': '3', 'label': 'wins', 'claim': 'm01'}
        e = self.errs(s)
        self.assertTrue(any('"race" or a "form"' in x for x in e))
        self.assertTrue(any('"record" card' in x for x in e))
        e = self.errs(s, kind='match')
        self.assertFalse(any('[director rule 2]' in x for x in e))      # it has a versus and a score
        s['chapters'][0]['beats'][2]['visual'] = {'type': 'matchday', 'claim': s['chapters'][0]['beats'][2]['visual']['claim']}
        self.assertTrue(any('needs a "versus"' in x for x in self.errs(s, kind='match')))

    def test_rule_2_a_rivalry_needs_its_record_and_its_biggest_meeting(self):
        L = ledger(season('WLWDLW')['claims'], focus={'opponent': 'Club 1'})
        L['summary']['by_competition']['All competitions'] = dict(L['summary']['by_competition']['League'])
        s = director_script(L)
        e = [x for x in validate_script(s, L, minutes_for(s)) if '[director rule 2]' in x]
        self.assertTrue(any('summary:All competitions' in x for x in e))
        top = director.story(L)['moments'][0]['id']
        s['chapters'][1]['beats'][0]['visual'] = {'type': 'record', 'claim': 'summary:All competitions'}
        s['chapters'][1]['beats'][0]['claim_ids'] = ['summary:All competitions']
        s['chapters'][0]['beats'][2]['visual'] = {'type': 'versus', 'claim': top}
        self.assertEqual([x for x in validate_script(s, L, minutes_for(s)) if '[director rule 2]' in x], [])

    def test_rule_3_open_cold(self):
        s = copy.deepcopy(self.s)
        s['chapters'][0]['beats'][0]['visual'] = {'type': 'open', 'backdrop': 'tunnel', 'headline': 'H', 'kicker': 'K'}
        s['chapters'][0]['beats'][0]['claim_ids'] = []
        self.assertTrue(any('[director rule 3]' in e for e in self.errs(s)))
        s['chapters'][0]['beats'][0]['claim_ids'] = [director.story(self.L)['moments'][0]['id']]
        self.assertFalse(any('[director rule 3]' in e for e in self.errs(s)))
        s['hook'] = 'In the season of 2001/02'
        s['chapters'][0]['beats'][0]['narration'] = s['hook'] + ' ' + words(14)
        self.assertTrue(any('history lesson' in e for e in self.errs(s)))

    def test_rule_4_no_third_card_of_a_kind_and_no_third_camera_move(self):
        s = copy.deepcopy(self.s)
        b = s['chapters'][0]['beats']
        b[1]['visual'] = {'type': 'score', 'claim': b[2]['visual']['claim']}
        b[2]['visual'] = {'type': 'score', 'claim': b[2]['visual']['claim']}
        self.assertTrue(any('third "score" in a row' in e for e in self.errs(s)))
        s = copy.deepcopy(self.s)
        for x in s['chapters'][0]['beats'][:3]:
            x['camera'] = 'push'
        self.assertTrue(any('same camera move (push)' in e for e in self.errs(s)))

    def test_rule_5_a_chapter_ends_on_a_hook(self):
        s = copy.deepcopy(self.s)
        s['chapters'][0]['beats'][-1]['narration'] = 'They went home happy. ' + words(10) + '.'
        self.assertTrue(any('[director rule 5]' in e for e in self.errs(s)))
        for hook in ('It would not last.', 'And then came Club 8…', 'How do you come back from that?', 'But the run was over.'):
            s['chapters'][0]['beats'][-1]['narration'] = words(10) + ' ' + hook
            self.assertFalse(any('[director rule 5]' in e for e in self.errs(s)), hook)
        s['chapters'][0]['beats'][-1]['narration'] = 'But nobody knew. ' + words(10) + '.'   # the hook has to be the LAST line
        self.assertTrue(any('[director rule 5]' in e for e in self.errs(s)))

    def test_the_rules_bite_only_a_director_script(self):
        s = copy.deepcopy(self.s)
        del s['director']
        s['chapters'][0]['beats'][-1]['narration'] = 'They went home happy. ' + words(10) + '.'
        s['chapters'][0]['beats'][0]['visual'] = {'type': 'open', 'backdrop': 'tunnel', 'headline': 'H', 'kicker': 'K'}
        self.assertEqual(self.errs(s), [])
        s['director'] = 3
        self.assertTrue(any('"director" must be 2' in e for e in self.errs(s)))


class Cards(unittest.TestCase):
    def setUp(self):
        self.L = season('WWLLLLLWWWWW')
        self.L['claims'][0]['fact']['scorers'] = [{'name': 'Ann Striker', 'minute': 12}, {'name': 'Bo Header', 'minute': None}]
        self.s = director_script(self.L)

    def card(self, visual, beat=None):
        s = copy.deepcopy(self.s)
        s['chapters'][1]['beats'][2] = {'narration': 'The terrace emptied slowly. ' + words(8), 'claim_ids': [], 'visual': visual, **(beat or {})}
        return [e for e in validate_script(s, self.L, minutes_for(s)) if 'Chapter 2 beat 3' in e]

    def test_form(self):
        self.assertEqual(self.card({'type': 'form', 'claims': ['m01', 'm02', 'm03'], 'label': 'August'}), [])
        self.assertTrue(self.card({'type': 'form', 'claims': ['m03', 'm02', 'm01'], 'label': 'August'}))
        self.assertTrue(self.card({'type': 'form', 'claims': ['m01', 'm02'], 'label': 'August'}))
        self.assertTrue(self.card({'type': 'form', 'claims': ['m01', 'm02', 'm03'], 'label': 'x' * 41}))

    def test_race(self):
        self.assertEqual(self.card({'type': 'race', 'label': 'The line'}), [])
        self.assertTrue(self.card({'type': 'race', 'label': 'The line', 'mark': ['m01', 'm02', 'm03', 'm04', 'm05']}))
        self.assertTrue(self.card({'type': 'race', 'label': 'The line', 'mark': ['nope']}))

    def test_goal_needs_a_named_scorer_with_a_minute(self):
        self.assertEqual(self.card({'type': 'goal', 'claim': 'm01', 'scorer': 0}), [])
        self.assertTrue(self.card({'type': 'goal', 'claim': 'm01', 'scorer': 1}))      # no minute
        self.assertTrue(self.card({'type': 'goal', 'claim': 'm01', 'scorer': 2}))      # no such scorer
        self.assertTrue(self.card({'type': 'goal', 'claim': 'm02', 'scorer': 0}))      # no scorers on the claim

    def test_record_versus_run(self):
        self.assertEqual(self.card({'type': 'record', 'claim': 'summary:League'}), [])
        self.assertTrue(self.card({'type': 'record', 'claim': 'm01'}))
        self.assertTrue(self.card({'type': 'versus', 'claim': 'summary:League'}))
        self.assertEqual(self.card({'type': 'run', 'claims': ['m03', 'm04', 'm05'], 'label': 'Five defeats'}), [])
        self.assertTrue(self.card({'type': 'run', 'claims': ['m02', 'm03', 'm04'], 'label': 'Mixed'}))   # W L L: no streak
        self.assertTrue(self.card({'type': 'run', 'claims': ['m03', 'm05', 'm06'], 'label': 'Gap'}))     # not consecutive

    def test_trailer(self):
        self.assertEqual(self.card({'type': 'trailer', 'lines': ['NOBODY SAW IT', 'COMING']}), [])
        self.assertTrue(self.card({'type': 'trailer', 'lines': ['ONE TWO THREE FOUR FIVE SIX']}))
        self.assertTrue(self.card({'type': 'trailer', 'lines': ['A B', 'C', 'D', 'E', 'F']}))
        self.assertTrue(self.card({'type': 'trailer', 'lines': ['STRIKER STRUCK']}))                 # a name no cited claim holds
        self.assertEqual(self.card({'type': 'trailer', 'lines': ['STRIKER STRUCK']}, {'claim_ids': ['m01']}), [])
        self.assertTrue(self.card({'type': 'trailer', 'lines': ['SEVENTEEN TIMES']}))                # a number nobody counted
        self.assertTrue(self.card({'type': 'trailer', 'lines': ['THEN CAME MARCH']}))                # a month no claim is dated in
        self.assertEqual(self.card({'type': 'trailer', 'lines': ['THEN CAME AUGUST']}, {'claim_ids': ['m01']}), [])

    def test_beat_fields(self):
        self.assertEqual(self.card({'type': 'illustration', 'art': 'supporter', 'caption': 'c'},
                                   {'camera': 'orbit', 'pace': 'slow', 'sfx': 'gasp', 'broll': 'terrace-crowd'}), [])
        for bad in ({'camera': 'zoom'}, {'pace': 'medium'}, {'sfx': 'boom'}, {'broll': 'beat:nowhere/x'}):
            self.assertTrue(self.card({'type': 'illustration', 'art': 'supporter', 'caption': 'c'}, bad), bad)

    def test_story_may_be_cited_for_what_it_counted(self):
        s = copy.deepcopy(self.s)
        s['chapters'][1]['beats'][2]['narration'] = 'Five defeats in a row. ' + words(8)
        self.assertTrue(any('number 5' in e for e in validate_script(s, self.L, minutes_for(s))))
        s['chapters'][1]['beats'][2]['claim_ids'] = ['story']
        self.assertFalse(any('number 5' in e for e in validate_script(s, self.L, minutes_for(s))))


class OldScripts(unittest.TestCase):
    def test_the_pilot_on_disk_still_passes(self):
        L = research.build_ledger('hapoel-tel-aviv', '1999/00', read_json(HERE / 'studio' / 'dossiers' / 'hapoel-tel-aviv-1999-00.json')['claims'])
        s = read_json(PILOT)
        self.assertNotIn('director', s)
        errs = validate_script(s, L, 8)
        self.assertFalse([e for e in errs if 'director' in e])

    def test_a_ledger_written_before_the_story_gets_one(self):
        L = season('WWDL')
        self.assertNotIn('story', L)
        self.assertEqual(director.story_of(L)['totals']['played'], 4)
        director.attach(L)
        self.assertEqual(L['story']['version'], director.STORY_VERSION)


class Writer(unittest.TestCase):
    def test_the_brief_carries_the_story_as_data(self):
        L = season('WWLLLLLWWWWW')
        p = writer.ledger_for_prompt(L)
        self.assertEqual(p['story']['shape'], 'fall-and-recovery')
        self.assertEqual(p['story']['matches'][0], {'id': 'm01', 'date': '2001-08-04', 'opponent': 'Club 1', 'score': '2–0', 'form': 1,
                                                    'gd': 2, 'tags': ['first']})
        self.assertIn('"director": 2', writer.SYSTEM)
        self.assertIn('COLD OPEN', writer.SYSTEM)
        self.assertEqual([a[0] for a in writer.ANGLES_V3], ['Chronicle', 'From the stands', 'The turning point'])

    def test_every_director_error_has_a_hint(self):
        L = season('WWLLLLLWWWWW')
        top = director.story(L)['moments'][0]['id']
        for err, want in (('x: [director rule 1] the narration tells a result against X', 'cite that match'),
                          ('x: [director rule 1] the scoreline 3–1 is not', 'scoreline in the narration'),
                          ('[director rule 2] a season film needs a "record" card', '"record"'),
                          ('[director rule 3] the film must open cold', top),
                          ('x: [director rule 4] a third "score" in a row', 'three beats in a row'),
                          ('Chapter 1: [director rule 5] its last line', 'cliffhanger'),
                          ('x: trailer line "A" names "b"', 'five words'),
                          ('x: a goal card needs a match', 'goal = a match id'),
                          ('"director" must be 2', '"director": 2')):
            self.assertIn(want, writer.fix_hints([err], L, 100, 120), err)


if __name__ == '__main__':
    unittest.main()

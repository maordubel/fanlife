"""The story engine round (owner, 28.11.2026: "a script that sticks to the facts, builds tension, understands football …
that knows how to use the huge encyclopedia we have, smartly"). Measured on Celtic 2016/17, the season of the treble:
the film opened on a 3–0 over Lincoln Red Imps, never named a trophy, cut names to "L Red Imps", and read tallies.
"""
import unittest

from studio import director, research, season_book, story_judge

# an invented club's season article, written the way Wikipedia's football season infoboxes are (fixture, not a fact)
WIKITEXT = """{{Short description|Football club season}}
{{Infobox football club season
| club = [[Testford United F.C.|Testford United]]
| season = 2001–02
| manager = [[Ann Example]]
| stadium = [[Example Park]]
| league = [[2001–02 Test Premiership|Test Premiership]]
| league result = 1st<ref>{{cite web |url=https://example.org}}</ref>
| cup1 = [[2001–02 Test Cup|Test Cup]]
| cup1 result = '''Winners'''
| cup2 = [[2001–02 Test League Cup|Test League Cup]]
| cup2 result = Runners-up
| cup3 = [[2001–02 European Cup|European Cup]]
| cup3 result = Group stage
| league topscorer = [[Bo Striker]] (21)
| season topscorer = [[Cy Forward]] (32)
| highest attendance = 58,968<br />vs [[Rival City]]<br />(1 January 2002)
| average attendance = 54,726
}}
'''Testford United''' had a season."""


def m(mid, date, opp, us, them, comp='Test League', stage=None, side='home'):
    return {'id': mid, 'type': 'match', 'fact': {'kind': 'match', 'date': date, 'competition': comp, 'stage': stage, 'club': 'Testford', 'opponent': opp,
            'side': side, 'home': 'Testford' if side == 'home' else opp, 'away': opp if side == 'home' else 'Testford',
            'score_home': us if side == 'home' else them, 'score_away': them if side == 'home' else us, 'club_goals': us, 'opponent_goals': them,
            'outcome': 'win' if us > them else 'draw' if us == them else 'loss'}, 'sources': [{'url': 'https://example.org'}]}


class TheSeasonBook(unittest.TestCase):
    def test_the_infobox_becomes_honours_and_facts(self):
        box = season_book.infobox(WIKITEXT)
        self.assertEqual(box['league result'], '1st')
        self.assertEqual(box['league'], 'Test Premiership')
        fs, skipped = season_book.facts(box)
        honours = {f['competition']: f['result'] for f in fs if f['kind'] == 'honour'}
        self.assertEqual(honours, {'Test Premiership': 'won', 'Test Cup': 'won', 'Test League Cup': 'runner-up', 'European Cup': 'group stage'})
        scorers = {(f['scope'], f['name'], f['goals']) for f in fs if f.get('field') == 'top_scorer'}
        self.assertEqual(scorers, {('league', 'Bo Striker', 21), ('all', 'Cy Forward', 32)})
        att = [f for f in fs if f.get('field') == 'attendance']
        self.assertEqual({a['which']: a['count'] for a in att}, {'highest': 58968, 'average': 54726})
        self.assertEqual([f['name'] for f in fs if f.get('field') == 'manager'], ['Ann Example'])
        self.assertEqual(skipped, [])

    def test_its_claims_cite_the_article_revision_and_reach_the_story(self):
        fs, _ = season_book.facts(season_book.infobox(WIKITEXT))
        cl = season_book.claims({'title': '2001–02 Testford United F.C. season', 'revid': 123, 'facts': fs}, '2001/02', 'Testford')
        for c in cl:
            research.validate_claim(c)
            self.assertIn('oldid=123', c['sources'][0]['url'])
        L = {'club_name': 'Testford', 'season': '2001/02', 'claims': [m('a', '2001-08-01', 'Rival City', 2, 0), *cl]}
        director.attach(L)
        self.assertEqual({h['competition'] for h in L['story']['honours'] if h['result'] == 'won'}, {'Test Premiership', 'Test Cup'})

    def test_no_network_never_fails_the_film(self):
        import tempfile
        from unittest import mock
        L = {'club_name': 'Testford', 'season': '2001/02', 'claims': []}
        with mock.patch.object(season_book, 'find_article', side_effect=OSError('refused')), tempfile.TemporaryDirectory() as d:
            season_book.attach(L, {'club_id': 'testford', 'season': '2001/02', 'kind': 'season'}, d, lambda *_: None)
        self.assertTrue(L['season_book']['status'].startswith('unreachable'))

    def test_season_labels(self):
        self.assertEqual(season_book.season_label('2016/17'), '2016–17')
        self.assertEqual(season_book.season_label('2023'), '2023')


class TheRecord(unittest.TestCase):
    def test_a_stage_written_into_the_competition_is_read_as_one(self):
        self.assertEqual(research.split_stage('League Cup (Final)'), ('League Cup', 'Final', None))
        self.assertEqual(research.split_stage('Scottish League (Premiership / 36)'), ('Scottish Premiership', None, 36))
        self.assertEqual(research.split_stage('UEFA Champions League'), ('UEFA Champions League', None, None))

    def test_the_last_cup_match_after_the_semi_is_the_final(self):
        cl = [m('s', '2002-04-20', 'Rival City', 2, 0, 'Test Cup', 'Semi Final'), m('f', '2002-05-25', 'Other FC', 2, 1, 'Test Cup')]
        research._infer_finals(cl)
        self.assertEqual(cl[1]['fact']['stage'], 'Final')

    def test_short_names_are_written_out(self):
        self.assertEqual(research._full_name('L. Red Imps'), 'Lincoln Red Imps')
        self.assertEqual(research._full_name('Man City'), 'Manchester City')
        self.assertEqual(research._full_name('Some Club'), 'Some Club')


class TheBigNight(unittest.TestCase):
    def test_a_final_and_a_giant_outrank_a_qualifier_comeback_against_a_small_club(self):
        L = {'club_name': 'Testford', 'season': '2016/17', 'claims': [
            m('q1', '2016-07-12', 'Tiny Rovers', 0, 1, 'UEFA Champions League', side='away'),
            m('q2', '2016-07-20', 'Tiny Rovers', 3, 0, 'UEFA Champions League'),
            m('g', '2016-09-28', 'Manchester City', 3, 3, 'UEFA Champions League'),
            *[m(f'l{k}', f'2016-10-{k + 1:02d}', f'Side {k}', 1, 0) for k in range(1, 9)],
            m('f', '2017-05-27', 'Other FC', 2, 1, 'Test Cup', 'Final')]}
        director.attach(L)
        order = [x['id'] for x in L['story']['moments']]
        self.assertEqual(order[0], 'f')
        self.assertLess(order.index('g'), order.index('q2'))
        self.assertEqual(next(x for x in L['story']['moments'] if x['id'] == 'g')['why'], 'giant')


class TheJudge(unittest.TestCase):
    def ledger(self):
        L = {'club_name': 'Testford', 'season': '2001/02', 'claims': [
            m('f', '2002-05-25', 'Other FC', 2, 1, 'Test Cup', 'Final'),
            {'id': 'h', 'type': 'honour', 'fact': {'kind': 'honour', 'competition': 'Test Cup', 'result': 'won'}, 'sources': [{'url': 'https://example.org'}]}]}
        director.attach(L)
        return L

    def script(self, *lines):
        return {'chapters': [{'title': 'One', 'beats': [{'narration': x} for x in lines]}]}

    def test_the_failures_of_the_treble_film_are_caught(self):
        bad = self.script('L Red Imps, 20 July 2016: one night that Testford supporters still describe with their hands.',
                          'And then? So where did it begin? Who would blink first?',
                          '12 matches, 3 of them won, 5 lost.',
                          'They were beaten 2–0 by H Beer-Sheva. And Testford were through, which is football being difficult on purpose.')
        v = story_judge.judge(bad, self.ledger())
        rules = {f['rule'] for f in v['failures']}
        self.assertTrue({'stock', 'questions', 'cut-name', 'tally', 'untold-honour', 'weak-open'} <= rules, rules)
        self.assertEqual(v['verdict'], 'rewrite')

    def test_a_told_story_passes(self):
        good = self.script('25 May 2002, the Test Cup final: Testford 1–1 with Other FC and ninety minutes gone.',
                           'Ann Example had sent on Bo Striker with twenty minutes left.',
                           'In the 92nd minute he met a corner at the near post, and Testford had the cup, 2–1.',
                           'It was the club\'s first Test Cup in eleven years.')
        v = story_judge.judge(good, self.ledger())
        self.assertEqual(v['verdict'], 'pass', v)


if __name__ == '__main__':
    unittest.main()

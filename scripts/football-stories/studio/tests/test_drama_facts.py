"""The drama desk (studio/drama_facts.py) and the context lines the house writer speaks from it."""
import unittest

from studio import drama_facts as D
from studio import house_writer as H


def ledger():
    m = lambda i, d, opp, side, cg, og, comp='Ligat HaAl': {   # noqa: E731
        'id': i, 'type': 'match', 'sources': [{'title': 's', 'url': 'https://example.org/' + i}], 'confidence': 2,
        'fact': {'kind': 'match', 'date': d, 'competition': comp, 'opponent': opp, 'side': side, 'club_goals': cg, 'opponent_goals': og,
                 'outcome': 'win' if cg > og else 'draw' if cg == og else 'loss', 'club': 'Hapoel Tel Aviv'}}
    return {'club_id': 'hapoel-tel-aviv', 'club_name': 'Hapoel Tel Aviv', 'season': '2009/10',
            'claims': [m('a', '2009-09-01', 'Maccabi Haifa', 'away', 1, 2), m('b', '2009-12-01', 'Celtic', 'away', 0, 2, 'UEFA Europa League'),
                       m('c', '2010-01-25', 'Maccabi Haifa', 'home', 2, 0)]}


class DramaDesk(unittest.TestCase):
    def test_rematch_and_road_are_counted_and_cited(self):
        L = ledger()
        c = D.counts(L)
        self.assertEqual(c['c']['earlier_this_season']['outcome'], 'loss')
        self.assertEqual(c['b']['trip']['to'], 'Glasgow')
        self.assertEqual(c['b']['trip']['km'] % 100, 0)
        D.attach(L)
        ctx = [x for x in L['claims'] if x['fact']['kind'] == 'context']
        self.assertEqual(len(ctx), 3)
        self.assertTrue(all(x['sources'][0]['url'].startswith('https://') for x in ctx))
        D.attach(L)   # idempotent
        self.assertEqual(len([x for x in L['claims'] if x['fact']['kind'] == 'context']), 3)

    def test_a_drought_is_said_only_across_seasons_the_archive_holds_whole(self):
        complete = D.coverage('olympiacos')
        self.assertFalse(complete('2021-05-16', '2024-02-04'))   # 2021/22 and 2022/23 are thin in the archive
        self.assertTrue(D.coverage('celtic')('1990-01-01', '2010-01-01'))

    def test_the_writer_says_the_rematch_before_the_result_and_cites_it(self):
        L = ledger()
        D.attach(L)
        b = H.Book(L, 'season')
        b.story = {}
        pen = H.Pen('chronicler', b, 'x')
        line, cid = H.context_line(pen, 'c')
        self.assertIn('had beaten Hapoel Tel Aviv 2–1', line)
        self.assertEqual(cid, 'c:context')
        from studio.script import fact_guard
        self.assertEqual(fact_guard(line, L, ['c', cid]), [])


class PlaceBook(unittest.TestCase):
    def test_the_archive_opponents_are_placed(self):
        from studio import maps
        for club, city in (('Rangers', 'Glasgow'), ('Bayern München', 'Munich'), ('PAOK Saloniki', 'Thessaloniki'), ('Celtic', 'Glasgow')):
            got = maps.city_of(club)
            self.assertIsNotNone(got, club)
            self.assertEqual(got[0], city, club)

    def test_names_fold_and_order(self):
        from studio.place_book import key
        self.assertEqual(key('FC Porto'), key('Porto FC'))
        self.assertEqual(key('1. FC Köln'), key('FC Koln'))


if __name__ == '__main__':
    unittest.main()


class Odds(unittest.TestCase):
    def test_the_underdog_line_is_the_claims_own_number(self):
        from studio import elo as E
        self.assertAlmostEqual(E.chance(1500, 1500, None), 0.5)
        self.assertLess(E.chance(1500, 1800, False), 0.15)
        L = ledger()
        orig = E.lookup
        E.lookup = lambda: {'matches': {'hapoel-tel-aviv': {'2009-12-01': [1450, 1700]}}}
        try:
            D.attach(L)
        finally:
            E.lookup = orig
        ctx = next(c for c in L['claims'] if c['id'] == 'b:context')
        self.assertIn('one_in', ctx['fact']['elo'])
        self.assertTrue(any('clubelo' in s['url'] for s in ctx['sources']))
        b = H.Book(L, 'season')
        b.story = {}
        pen = H.Pen('chronicler', b, 'x')
        line, cid = H.context_line(pen, 'b')
        self.assertIn('one chance in', line)
        from studio.script import fact_guard
        self.assertEqual(fact_guard(line, L, ['b', cid]), [])

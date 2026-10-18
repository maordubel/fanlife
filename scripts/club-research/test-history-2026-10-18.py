#!/usr/bin/env python3
"""Source-boundary regression checks plus exhaustive score/identity accounting."""
import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('history', HERE / 'build-history-2026-10-18.py')
history = importlib.util.module_from_spec(spec)
spec.loader.exec_module(history)


class HistorySources(unittest.TestCase):
    def test_date_ranges_and_new_rounds_do_not_inherit_a_previous_day(self):
        doc = {'seasonEnd': 2024, 'sourceUrl': 'https://example.org', 'text': '''Round 1 [Aug 1]
Zrinjski 2-0 Velez
[Aug 3,4]
Zrinjski 1-0 Borac
Round 2
Zrinjski 3-0 Sarajevo
Round 3 [Aug 8]
Velez 1-1 Zrinjski
Final Table:
 1.Zrinjski (Mostar) 30 19 4 7 56-30 61
Cup Tournaments 2023/24
1/16 Finals [Sep 9]
Zrinjski 2-0 Velez
1/8 Finals
Zrinjski 1-0 Sarajevo
Prva Liga
Round 1 [Sep 9]
Zrinjski 9-0 Some reserve side
'''}
        rows, held = history.rsssf_rows(doc)
        self.assertEqual([r['value']['on'] for r in rows], ['2023-08-01', '2023-08-08', '2023-09-09'])
        self.assertEqual(rows[-1]['value']['competition'], 'Bosnia and Herzegovina Cup')
        self.assertEqual(len(held), 3)

    def test_shootout_is_not_the_match_score_and_next_game_annotation_is_not_ours(self):
        doc = {'seasonEnd': 2024, 'sourceUrl': 'https://example.org', 'text': '''Cup Tournaments 2023/24
1/16 Finals [Sep 9]
Zrinjski 1-1 Velez [4-2 pen]
Borac awd Sarajevo [awarded 3-0]
'''}
        rows, held = history.rsssf_rows(doc)
        self.assertEqual(held, [])
        self.assertEqual(rows[0]['value']['score'], '1-1')
        self.assertEqual(rows[0]['value']['penalties'], {'home': 4, 'away': 2})

    def test_every_museum_record_is_accounted_for_without_inventing_people(self):
        wave = json.loads((history.ROOT / 'club-packs/hapoel-petah-tikva/wave-history-2026-10-18.json').read_text())
        evidence = [r for p in history.EVIDENCE.glob('hpt-*.json') for r in json.loads(p.read_text())['games']]
        by_id = {r['id']: r for r in evidence}
        self.assertEqual(len(evidence), len(by_id))
        games = {r['value']['sourceMatchId']: r for r in wave['matches']}
        contextual = {int(r['id'].split('-')[2]): r for r in wave['archive']}
        self.assertEqual(set(games) | set(contextual), set(by_id))
        self.assertFalse(set(games) & set(contextual))
        for mid, f in games.items():
            v, row = f['value'], by_id[mid]
            if v.get('neutral'):
                us, them = v['clubGoals'], v['opponentGoals']
                self.assertNotIn('home', v)
            else:
                us, them = (v['homeGoals'], v['awayGoals']) if v['us'] == 'home' else (v['awayGoals'], v['homeGoals'])
            self.assertEqual((us, them), (row['hapoelGoals'], row['opponentGoals']))
            self.assertEqual((v['lineup'], v['bench'], v['scorers']), ([], [], []))
            self.assertEqual(f['confidence'], 2)
        self.assertNotIn(1727, games)  # abandoned, live score differs from awarded result
        self.assertNotIn(2249, games)  # source explicitly says half-time
        self.assertEqual(games[1388]['value']['season'], '1966/68')

    def test_complete_rsssf_league_seasons_reconcile_with_the_published_table(self):
        # Independent published totals, not the parser's output. 2017/18 have
        # separate playoff tables; 2025 includes a deliberately excluded award.
        totals = {2002: (30, 35, 39), 2004: (30, 40, 47), 2005: (30, 56, 30),
                  2006: (30, 47, 29), 2008: (30, 46, 27), 2009: (30, 50, 37),
                  2010: (30, 46, 33), 2011: (30, 41, 39), 2012: (30, 47, 41),
                  2013: (30, 26, 42), 2014: (30, 56, 21), 2015: (30, 41, 13),
                  2016: (30, 52, 17), 2019: (33, 46, 22), 2020: (22, 30, 12),
                  2021: (33, 50, 30), 2022: (33, 74, 14), 2023: (33, 66, 21), 2024: (33, 76, 27)}
        for year, expected in totals.items():
            doc = json.loads((history.EVIDENCE / f'rsssf-{year}.json').read_text())
            rows, _ = history.rsssf_rows(doc)
            rows = [f['value'] for f in rows if f['value']['competition'].endswith('League')]
            gf = sum(v['homeGoals'] if v['us'] == 'home' else v['awayGoals'] for v in rows)
            ga = sum(v['awayGoals'] if v['us'] == 'home' else v['homeGoals'] for v in rows)
            self.assertEqual((len(rows), gf, ga), expected, str(year))
        wave = json.loads((history.ROOT / 'club-packs/zrinjski-mostar/wave-history-2026-10-18.json').read_text())
        self.assertTrue(all('\ufffd' not in f['value']['name'] for f in wave['matches']))
        self.assertEqual(len(wave['matches']), len({f['id'] for f in wave['matches']}))


if __name__ == '__main__':
    unittest.main()

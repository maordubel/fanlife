"""The graphic designer in DOCU (studio/docu/designer.py): the automatic adapter reaches the hand-written films' devices
— the city split, the league table, the chalk board, the verdict, the stamp, the rule card, the cutting, the cut-out —
each ONLY when the beat's data earns it, and never with a name, a number or a place the research block does not hold."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio.common import Palette  # noqa: E402
from studio.docu import build as B  # noqa: E402
from studio.docu import designer as G  # noqa: E402
from studio.docu import plan as dp  # noqa: E402

PAL = Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#D7192A', '#FFFBF2', [])
SRC = [{'title': 's', 'url': 'https://example.org/x'}]


def match(i, opp, side, us, them, **kw):
    home, away = ('Hapoel Tel Aviv', opp) if side == 'home' else (opp, 'Hapoel Tel Aviv')
    sh, sa = (us, them) if side == 'home' else (them, us)
    return {'id': i, 'sources': SRC, 'fact': {'kind': 'match', 'date': kw.pop('date', '1999-09-16'), 'competition': 'UEFA Cup', 'stage': kw.pop('stage', 'Round 1, leg 1'),
                                              'club': 'Hapoel Tel Aviv', 'opponent': opp, 'side': side, 'home': home, 'away': away, 'score_home': sh, 'score_away': sa,
                                              'outcome': 'win' if us > them else 'loss' if us < them else 'draw', 'venue': None, 'scorers': [], **kw}}


LEDGER = {'club_name': 'Hapoel Tel Aviv', 'claims': [
    match('away', 'Celtic', 'away', 0, 2),
    match('home', 'Maccabi Haifa', 'home', 3, 1),
    match('final', 'Beitar Jerusalem', 'away', 2, 2, stage='Final', date='2000-05-17'),
    match('leg2', 'Celtic', 'home', 0, 1, stage='Round 1, leg 2', date='1999-09-30'),
    match('goal', 'Maccabi Haifa', 'home', 1, 0, date='2000-01-08', scorers=[{'name': 'Shimon Gershon', 'minute': 44}]),
    {'id': 'gd', 'sources': SRC, 'fact': {'kind': 'goal-detail', 'match_id': 'goal', 'scorer': 'Gershon', 'title': "44' · Gershon v Maccabi Haifa",
                                          'description': 'A free kick from the edge of the area, curled over the wall.'}},
    {'id': 'pens', 'sources': SRC, 'fact': {'kind': 'penalties', 'date': '2000-05-17', 'opponent': 'Beitar Jerusalem', 'shootout': '4–2', 'winner': 'Hapoel Tel Aviv'}},
    {'id': 'tbl', 'sources': SRC, 'fact': {'kind': 'table', 'competition': 'Israeli Premier League', 'rows': [
        {'pos': 1, 'club': 'Hapoel Tel Aviv', 'points': 85}, {'pos': 2, 'club': 'Maccabi Haifa', 'points': 76},
        {'pos': 3, 'club': 'Hapoel Petah Tikva', 'points': 74}, {'pos': 4, 'club': 'Maccabi Tel Aviv', 'points': 60}]}},
    {'id': 'pr', 'sources': SRC, 'fact': {'kind': 'press', 'outlet': 'Maariv', 'headline': 'The Reds are champions'}},
    {'id': 'pr0', 'sources': [], 'fact': {'kind': 'press', 'outlet': 'Maariv', 'headline': 'The Reds are champions'}}],
    'story': {'matches': [{'id': 'leg2', 'through': False}]}}


def adapter(ledger=LEDGER):
    keep, dp.crests = dp.crests, lambda names: {}
    try:
        return dp.Adapter(Path(tempfile.mkdtemp(prefix='designer-')), {'shots': []}, PAL, ledger, {})
    finally:
        dp.crests = keep


def shot(n, visual, narration='', ids=(), **kw):
    return {'n': n, 'visual': visual, 'narration': narration, 'claim_ids': list(ids), **kw}


def kinds(devs):
    return [x['kind'] for x in devs]


class Cities(unittest.TestCase):
    def test_an_away_match_is_a_journey_between_two_cities_on_record(self):
        ad = adapter()
        out = ad.shots(shot(0, {'type': 'map', 'claims': ['away'], 'label': 'To Scotland'}, ids=['away']), 7.0)
        ct = next(x for x in out if x['kind'] == 'cities')
        self.assertEqual((ct['a']['name'], ct['b']['name'], ct['b']['small'], ct['mid']), ('TEL AVIV', 'GLASGOW', 'CELTIC', 'UEFA CUP'))
        self.assertTrue(all('lt' not in x for x in out))      # the map replaces the lower third, it does not sit on it

    def test_without_two_placed_cities_the_still_and_its_lower_third_stay(self):
        ad = adapter()
        for claims in ([], ['home'], ['final']):             # nothing cited · a home match · a final with no ground on record
            out = ad.shots(shot(1, {'type': 'map', 'claims': claims, 'label': 'Bloomfield'}), 7.0)
            self.assertNotIn('cities', kinds(out), claims)
            self.assertEqual(out[0].get('lt', [None])[0], 'BLOOMFIELD')
        unknown = {**LEDGER, 'claims': [match('x', 'Nowhere Rovers', 'away', 1, 0)]}
        self.assertNotIn('cities', kinds(adapter(unknown).shots(shot(2, {'type': 'map', 'claims': ['x'], 'label': ''}), 7.0)))

    def test_an_away_day_opens_on_the_journey_but_never_twice_running(self):
        ad = adapter()
        a = ad.shots(shot(0, {'type': 'matchday', 'claim': 'away'}, ids=['away']), 8.0)
        b = ad.shots(shot(1, {'type': 'matchday', 'claim': 'away'}, ids=['away']), 8.0)
        self.assertEqual(kinds(a)[:2], ['cities', 'image'])
        self.assertAlmostEqual(a[1]['dt'], a[0]['d'])
        self.assertNotIn('cities', kinds(b))
        self.assertNotIn('cities', kinds(adapter().shots(shot(0, {'type': 'matchday', 'claim': 'home'}, ids=['home']), 8.0)))


class TableChalkRule(unittest.TestCase):
    def test_the_table_is_the_records_rows_with_the_club_lit_and_no_invented_line(self):
        out = adapter().shots(shot(0, {'type': 'table', 'claim': 'tbl'}), 8.0)
        self.assertEqual(out[0]['kind'], 'table')
        self.assertEqual((out[0]['rows'][0], out[0]['highlight'], out[0]['cut']), ('Hapoel Tel Aviv', 0, False))
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}, 'silent': True}, Path('/tmp'))
        f.table(out[0], 0, 8)
        self.assertNotIn('RELEGATION', ''.join(f.clips))
        self.assertNotIn('line"', ''.join(f.tw))

    def test_a_table_with_gaps_stays_a_ledger(self):
        led = {**LEDGER, 'claims': [{'id': 'tbl', 'fact': {'kind': 'table', 'rows': [{'pos': 1, 'club': 'A'}, {'pos': 3, 'club': 'B'}, {'pos': 4, 'club': 'C'}, {'pos': 9, 'club': 'D'}]}}]}
        self.assertEqual(kinds(adapter(led).shots(shot(0, {'type': 'table', 'claim': 'tbl'}), 8.0)), ['ledger'])

    def test_the_chalk_board_only_for_a_goal_the_record_describes_as_a_set_piece(self):
        ad = adapter()
        out = ad.shots(shot(0, {'type': 'goal', 'claim': 'goal', 'scorer': 0}, ids=['goal']), 9.0)
        ch = next(x for x in out if x['kind'] == 'chalk')
        self.assertEqual((ch['play'], ch['attack'], ch['minute'], ch['label']), ('freekick', 'us', 44, 'SHIMON GERSHON · FREE KICK'))
        pic = next(x for x in out if x['kind'] == 'image')
        self.assertAlmostEqual(pic['dt'], ch['d'])           # the goal's picture arrives when the board has drawn the move
        plain = {**LEDGER, 'claims': [c for c in LEDGER['claims'] if c['id'] != 'gd']}
        self.assertNotIn('chalk', kinds(adapter(plain).shots(shot(0, {'type': 'goal', 'claim': 'goal', 'scorer': 0}, ids=['goal']), 9.0)))
        open_play = {**LEDGER, 'claims': [c if c['id'] != 'gd' else {**c, 'fact': {**c['fact'], 'description': 'A run from midfield and a low shot.'}} for c in LEDGER['claims']]}
        self.assertNotIn('chalk', kinds(adapter(open_play).shots(shot(0, {'type': 'goal', 'claim': 'goal', 'scorer': 0}, ids=['goal']), 9.0)))

    def test_the_chalk_board_makes_no_sound_of_its_own_in_the_pipelines_silent_picture(self):
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}, 'silent': True}, Path('/tmp'))
        f.chalk({'play': 'corner', 'label': 'X'}, 0, 5)
        self.assertEqual(f.audio, [])

    def test_a_fact_card_that_is_a_rule_is_typed_as_a_rule(self):
        ad = adapter()
        rule = ad.shots(shot(0, {'type': 'fact', 'heading': 'Away goals', 'text': 'Level on aggregate, the side with more away goals went through.'}), 8.0)
        plain = ad.shots(shot(1, {'type': 'fact', 'heading': 'A new coach', 'text': 'He arrived in the summer.'}), 8.0)
        self.assertEqual((rule[-1]['kind'], rule[-1]['small'], rule[-1]['title']), ('rule', 'THE RULE', 'AWAY GOALS'))
        self.assertEqual(plain[-1]['kind'], 'card')


class VerdictAndStamp(unittest.TestCase):
    def test_a_shoot_out_is_two_results_once_the_narrator_has_told_it(self):
        ad = adapter()
        told = ad.shots(shot(0, {'type': 'score', 'claim': 'final'}, 'Two each. Then Hapoel won it on penalties.', ['final']), 10.0)
        vd = next(x for x in told if x['kind'] == 'verdict')
        self.assertEqual((vd['us_line'], vd['them_line'], vd['them']), ('WON ON PENALTIES', 'LOST ON PENALTIES', 'Beitar Jerusalem'))
        self.assertGreaterEqual(vd['dt'], 5.0)               # the second half of the beat: after the board has been read
        untold = ad.shots(shot(1, {'type': 'score', 'claim': 'final'}, 'Two each. Now it comes down to the spot.', ['final']), 10.0)
        self.assertNotIn('verdict', kinds(untold))           # the editor never shows what the narrator has not reached

    def test_a_tie_lost_is_stamped_out_and_a_plain_league_win_is_not_stamped(self):
        ad = adapter()
        out = ad.shots(shot(0, {'type': 'score', 'claim': 'leg2'}, 'Celtic won again, one-nil.', ['leg2']), 8.0)
        self.assertEqual(next(x for x in out if x['kind'] == 'stamp')['text'], 'OUT')
        gone = ad.shots(shot(1, {'type': 'score', 'claim': 'leg2'}, 'Celtic won again and Hapoel went out of Europe.', ['leg2']), 8.0)
        self.assertEqual(next(x for x in gone if x['kind'] == 'verdict')['us_line'], 'WENT OUT')
        self.assertNotIn('stamp', kinds(gone))               # one device says it, not two
        self.assertNotIn('stamp', kinds(ad.shots(shot(2, {'type': 'score', 'claim': 'home'}, 'Hapoel won three-one.', ['home']), 8.0)))

    def test_the_verdict_draws_initials_when_no_crest_is_on_file(self):
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}}, Path('/tmp'))
        f.verdict({'us': 'Hapoel Tel Aviv', 'them': 'Celtic', 'us_line': 'WENT OUT', 'them_line': 'WENT THROUGH', 'us_crest': None, 'them_crest': None}, 0, 5)
        self.assertNotIn('assets/img/None', ''.join(f.clips))
        self.assertIn('class="ini"', ''.join(f.clips))


class PressAndCutout(unittest.TestCase):
    def test_a_headline_without_its_page_or_without_a_source_stays_a_typed_card(self):
        ad = adapter()
        v = {'type': 'press', 'claim': 'pr', 'outlet': 'Maariv', 'headline': 'The Reds are champions'}
        self.assertEqual(kinds(ad.shots(shot(0, v), 8.0)), ['card'])                                    # no cutting to show
        self.assertIsNone(ad.design.press(shot(0, v), 'img-x.webp', 'beat:common/terrace-full-kr'))     # a crowd picture is not a cutting
        self.assertIsNone(ad.design.press(shot(0, {**v, 'claim': 'pr0'}), 'img-x.webp', 'beat:x/press-cutting-front-page'))   # unsourced
        got = ad.design.press(shot(0, v), 'img-x.webp', 'beat:x/press-cutting-front-page')
        self.assertEqual((got['kind'], got['translation'], got['small']), ('press', 'The Reds are champions', 'MAARIV'))

    def test_a_cut_out_only_when_the_owners_cut_out_exists(self):
        ad = adapter()
        from studio.paper import CUTS
        real = sorted((CUTS / 'common').glob('*.webp'))[0].stem
        with_fig = ad.shots(shot(0, {'type': 'illustration', 'art': 'terrace-crowd', 'figure': f'cut:common/{real}'}), 6.0)
        self.assertEqual(kinds(with_fig), ['image', 'cutout'])
        self.assertEqual(kinds(ad.shots(shot(1, {'type': 'illustration', 'art': 'terrace-crowd', 'figure': 'cut:common/no-such-figure'}), 6.0)), ['image'])


class Sourced(unittest.TestCase):
    """Facts carry a source: nothing reaches the screen that the research block or the beat's checked words do not hold."""

    def test_an_unsourced_name_number_or_place_drops_the_device(self):
        d = adapter().design
        s = shot(0, {'type': 'map'}, 'A long way from home.')
        ok = {'kind': 'cities', 'a': {'name': 'TEL AVIV', 'small': 'HAPOEL TEL AVIV'}, 'b': {'name': 'GLASGOW', 'small': 'CELTIC'}}
        self.assertIs(d.sourced(ok, s), ok)
        self.assertIsNone(d.sourced({**ok, 'b': {'name': 'LISBON', 'small': 'CELTIC'}}, s))             # a place nobody recorded
        self.assertIsNone(d.sourced({'kind': 'stamp', 'text': 'RECORD CROWD 51000'}, s))               # a number nobody recorded
        self.assertIsNone(d.sourced({'kind': 'chalk', 'label': 'ZIDANE · FREE KICK'}, s))              # a name nobody recorded
        self.assertIsNotNone(d.sourced({'kind': 'rule', 'small': 'THE RULE', 'title': 'A LONG WAY', 'text': 'from home'}, s))   # the beat's own checked words

    def test_every_label_the_designer_may_print_is_a_fixed_one(self):
        d = adapter().design
        for lab in G.LABELS:
            self.assertIsNotNone(d.sourced({'kind': 'stamp', 'text': lab}, shot(0, {'type': 'score'})), lab)


if __name__ == '__main__':
    unittest.main()

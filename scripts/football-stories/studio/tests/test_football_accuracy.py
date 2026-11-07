import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from studio.common import Palette
from studio.script import identity_guard, knockout_guard
from studio import director


class FootballAccuracy(unittest.TestCase):
    def setUp(self):
        self.ledger = {'club_name': 'Hapoel Petah Tikva', 'identity_primary': '#0055bb',
                       'claims': [{'fact': {'opponent': 'Feyenoord'}}]}

    def test_focus_scarf_and_rival_reference(self):
        self.assertTrue(identity_guard('We wear our red scarf.', self.ledger))
        self.assertFalse(identity_guard('We wear our blue scarf.', self.ledger))
        self.assertFalse(identity_guard('Feyenoord supporters wear a red scarf.', self.ledger))
        self.assertFalse(identity_guard('A yellow card is shown.', self.ledger))
        self.assertTrue(identity_guard('a red scarf', self.ledger, motif=True))

    def test_rival_colour_is_allowed_in_scene_but_not_club_palette(self):
        p = Palette('test', 'Test', '#0055bb', bans=['red'])
        self.assertEqual(p.render_bans, [])
        with self.assertRaises(ValueError):
            Palette('test', 'Test', '#cc0000', bans=['red'])

    def test_qualification_is_not_the_result_of_one_leg(self):
        st = {'matches': [{'id': 'second', 'through': False}]}
        self.assertTrue(knockout_guard('We qualified.', self.ledger, ['second'], st))
        self.assertFalse(knockout_guard('We were eliminated.', self.ledger, ['second'], st))
        self.assertFalse(knockout_guard('Feyenoord qualified.', self.ledger, ['second'], st))
        self.assertFalse(knockout_guard('We qualified.', self.ledger, ['first'], st))
        self.assertFalse(knockout_guard('We qualified.', self.ledger, ['second'], {'matches': [{'id': 'second', 'through': None}]}))

    def test_domestic_away_goal_rules_are_not_assumed(self):
        f = lambda date, side, a, b: {'date': date, 'opponent': 'X', 'competition': 'Cup',
            'side': side, 'club_goals': a, 'opponent_goals': b}
        tie = director._ties([('a', f('2000-01-01', 'away', 1, 2)), ('b', f('2000-01-08', 'home', 1, 0))], 'Test')
        self.assertIsNone(tie['b']['through'])


if __name__ == '__main__':
    unittest.main()

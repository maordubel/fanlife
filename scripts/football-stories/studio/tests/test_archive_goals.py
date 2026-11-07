import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from studio import research


class ArchiveGoals(unittest.TestCase):
    def setUp(self):
        self.match = {'id': 'match-1', 'fact': {'kind': 'match', 'date': '2004-04-15', 'opponent': 'Rival FC',
                      'club_goals': 2, 'opponent_goals': 1, 'competition': 'League', 'outcome': 'win'}}
        self.goal = {'id': 'goal-1', 'status': 'approved', 'confidence': 2, 'sources': ['source-1'],
                     'value': {'name': "45+2' · Jane Player v Rival FC", 'on': '2004-04-15', 'opponent': 'Rival FC',
                               'score': '2-1', 'competition': 'League', 'narrative': 'A finish from close range.'}}
        self.sources = {'source-1': {'id': 'source-1', 'title': 'Match report', 'url': 'https://example.org/report'}}

    def linked(self, goal=None, matches=None):
        return research._goal_claims([goal or self.goal], matches or [self.match], self.sources, '2003/04')

    def test_reviewed_goal_is_linked_without_implying_complete_scorers(self):
        goal = self.linked()[0]
        self.assertEqual(goal['fact']['match_id'], 'match-1')
        self.assertEqual(goal['fact']['scorer'], 'Jane Player')
        self.assertEqual(goal['fact']['minute_label'], '45+2')
        self.assertNotIn('scorers', goal['fact'])
        self.assertEqual(goal['sources'][0]['url'], 'https://example.org/report')

    def test_ambiguous_unreviewed_or_mismatched_goals_do_not_link(self):
        self.assertEqual(self.linked(matches=[self.match, {**self.match, 'id': 'duplicate'}]), [])
        for change in ({'status': 'draft'}, {'confidence': 1}, {'sources': ['unknown']}, {'conflicts': ['conflict']}):
            self.assertEqual(self.linked({**self.goal, **change}), [])
        for change in ({'on': '2004-04-16'}, {'opponent': 'Another FC'}, {'score': '1-2'}, {'score': 'not known'}):
            g = copy.deepcopy(self.goal); g['value'].update(change)
            self.assertEqual(self.linked(g), [])

    def test_plain_title_never_guesses_scorer(self):
        g = copy.deepcopy(self.goal); g['value']['name'] = 'A decisive goal'
        self.assertNotIn('scorer', self.linked(g)[0]['fact'])

    def test_match_selection_keeps_only_linked_goal(self):
        goal = self.linked()[0]
        other = {'id': 'match-2', 'fact': {**self.match['fact'], 'date': '2004-04-18'}}
        ledger = {'club_name': 'Club', 'season': '2003/04', 'claims': [self.match, other, goal], 'held': []}
        result = research.pick(ledger, ['match-2'])
        self.assertEqual([c['id'] for c in result['claims']], ['match-2'])

    def test_compiled_club_archive_puts_linked_goal_in_writer_ledger(self):
        pack = {'data': {'identity': {'name': 'Club'}, 'sources': list(self.sources.values()),
                         'matches': [{'id': 'match-1', 'status': 'approved', 'confidence': 2, 'sources': ['source-1'],
                                      'value': {'on': '2004-04-15', 'name': 'Club 2-1 Rival FC', 'score': '2-1',
                                                'competition': 'League'}}], 'goals': [self.goal]}}
        with tempfile.TemporaryDirectory() as d:
            Path(d, 'club.json').write_text(json.dumps(pack), encoding='utf-8')
            with patch.object(research, 'COMPILED', Path(d)), patch.object(research, '_club_names', return_value=[]), \
                 patch.object(research, '_names_en', return_value={}):
                ledger = research.compiled_ledger('club', '2003/04')
        goal = next(c for c in ledger['claims'] if c['id'] == 'goal-1')
        self.assertEqual(goal['fact']['match_id'], 'match-1')
        self.assertEqual(goal['fact']['minute_label'], '45+2')


if __name__ == '__main__':
    unittest.main()

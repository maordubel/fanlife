import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from studio import director, editorial, owner_story, owner_treatment, research, script, writer


class EditorialReview(unittest.TestCase):
    def test_complete_owner_treatment_becomes_a_reviewable_script_without_a_writer(self):
        ledger = {'club_id': 'north-city', 'club_name': 'North City', 'season': '1992/93', 'claims': [], 'held': []}
        for leg, (day, home, away, side, score) in enumerate([
            ('1992-09-16', 'South Rovers', 'North City', 'away', (1, 0)),
            ('1992-09-30', 'North City', 'South Rovers', 'home', (2, 1)),
        ], 1):
            ledger['claims'].append({'id': f'leg{leg}', 'sources': [], 'fact': {
                'kind': 'match', 'date': day, 'home': home, 'away': away, 'side': side,
                'score_home': score[0], 'score_away': score[1], 'club_goals': score[side == 'away'],
                'opponent_goals': score[side == 'home'], 'outcome': 'win' if leg == 2 else 'loss',
                'competition': 'Cup Winners Cup', 'scorers': [],
            }})
        ledger = research.pick(ledger, ['leg1', 'leg2'])
        ledger['story_documents'] = [{'name': 'story.md', 'text': """
STORY BRIEF: The Return
3. SCRIPT STRUCTURE
The first leg. Joško Marin breaks the deadlock.
The return leg. Luis Díaz scores. Danny Bright heads the ball into the net. Sam West scores.
4. RESEARCH LEDGER
Key Figures: Luis Díaz, Danny Bright (North City Goalscorers). Joško Marin, Sam West (South Rovers Goalscorers).
- Leg 1: Sept 16, 1992 - South Park, South (South Rovers 1-0 North City)
- Leg 2: Sept 30, 1992 - North Park, North (North City 2-1 South Rovers)
- Aggregate: 2-2. South Rovers advances on Away Goals (1 to 0).
"""}]
        self.assertTrue(owner_story.apply(ledger))
        director.attach(ledger)
        draft = owner_treatment.build(ledger)
        self.assertIsNotNone(draft)
        return_goals = [b for b in draft['chapters'][2]['beats'] if b['visual']['type'] == 'score']
        self.assertEqual([script.scorelines(b['narration']) for b in return_goals], [[(1, 0)], [(2, 0)], [(2, 1)]])
        self.assertTrue(return_goals[0]['narration'].startswith('Luis Díaz scores'))
        brief = {'kind': 'tie', 'scripts': 3, 'duration': 5, 'club_id': 'north-city', 'season': '1992/93'}
        with tempfile.TemporaryDirectory() as folder, patch.object(writer, 'write_options', side_effect=AssertionError('writer called')):
            root = Path(folder)
            selected, review = editorial.prepare_script(root, brief, ledger, root, lambda _: None, draft)
            self.assertIsNone(selected)
            self.assertEqual(len(review['drafts']), 1)
            request = {'action': 'editorial_script', 'option': 1, 'revision': review['drafts'][0]['revision']}
            approved, _ = editorial.prepare_script(root, {**brief, 'editorial_request': request}, ledger, root, lambda _: None, draft)
            self.assertIsNotNone(approved)
            script.ensure_football_accuracy(approved, ledger)

    def test_writer_repairs_the_screenshot_failure_without_rewriting_narration(self):
        opening = ('The supporters arrived expecting an afternoon of football and a familiar rivalry on the pitch. '
                   'The stadium was already tense when the teams came out of the tunnel to meet each other. '
                   'What happened next changed what everyone would remember about that fixture.')
        choices = [opening.replace('supporters', role, 1) for role in ('players', 'visitors', 'reporters')]
        script = {'hook_options': [{'text': h, 'claim_ids': ['s1']} for h in choices],
                  'chapters': [{'beats': [{'narration': opening, 'claim_ids': ['s1'],
                                          'visual': {'type': 'illustration', 'art': 'unknown picture'}}]}]}
        ledger = {'claims': [{'id': 's1', 'fact': {'kind': 'history'}}]}
        errors = writer.hook_option_errors(script, ledger) + ['Chapter 1 beat 1: illustration art must be a library piece']
        result = writer.autofix(script, errors, ledger)
        beat = result['chapters'][0]['beats'][0]
        self.assertEqual(beat['narration'], opening)
        self.assertEqual(beat['visual']['art'], 'paper')
        self.assertEqual(writer.hook_option_errors(result, ledger), [])

    def test_board_requires_approval_for_the_exact_revision(self):
        editor = SimpleNamespace(ledger={}, script={'chapters': [{'title': 'The match'}]})
        plan = {'shots': [{'n': 0, 'chapter': 0, 'narration': 'The game begins.', 'voice_at': .2,
                           'start': 0, 'frames': 50, 'visual': {'type': 'illustration'}}]}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            _, board = editorial.review_plan(root, {}, editor, plan, {'drafts': []})
            request = {'action': 'editorial_plan', 'order': ['0'], 'images': {}, 'approved': True}
            _, stale = editorial.review_plan(root, {'editorial_request': {**request, 'revision': 'stale'}},
                                             editor, plan, {'drafts': []})
            self.assertTrue(stale['issues'])
            _, accepted = editorial.review_plan(root, {'editorial_request': {**request, 'revision': stale['plan']}},
                                                editor, plan, {'drafts': []})
            self.assertIsNone(accepted)

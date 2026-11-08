import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from studio import editorial, writer


class EditorialReview(unittest.TestCase):
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

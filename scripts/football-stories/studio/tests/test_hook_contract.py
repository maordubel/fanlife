import unittest
from studio.writer import hook_option_errors, option_summary


class HookContract(unittest.TestCase):
    def setUp(self):
        self.ledger = {'claims': [{'id': 'a', 'fact': {'kind': 'history', 'text': 'A game was abandoned.'}}], 'summary': {}}
        self.opening = (
            'This is the story of a match that never began and why it still matters. '
            'Supporters arrived expecting football, but events took a different turn. '
            'The film follows the evidence behind the moment and asks what the famous image leaves outside its frame.'
        )
        self.alternatives = [
            'A single image can hide the story of a match that never began. '
            'We follow the people and the events behind that image. '
            'By the end, the famous moment will make sense in its wider football and social context.',
            'What happens when a match becomes a memory before anyone kicks a ball? '
            'We follow the evidence from the stadium to the story told afterwards. '
            'Along the way, the film asks what the photograph reveals and what remains uncertain.'
        ]
        self.script = {'hook': 'This is the story of a match that never began and why it still matters.',
                       'title_candidates': [{'title': 'The Match That Never Started'}], 'selected': 0,
                       'chapters': [{'beats': [{'narration': self.opening}]}],
                       'hook_options': [{'text': t, 'claim_ids': ['a']} for t in [self.opening, *self.alternatives]]}

    def test_three_cited_openings_and_selected_opening(self):
        self.assertEqual(hook_option_errors(self.script, self.ledger), [])
        self.assertEqual(len(option_summary(self.script, 1)['hook_options']), 3)

    def test_rejects_duplicates_unknown_sources_and_unspoken_opening(self):
        self.script['hook_options'][1] = {'text': self.opening, 'claim_ids': ['unknown']}
        self.script['chapters'][0]['beats'][0]['narration'] = 'Something else.'
        errs = hook_option_errors(self.script, self.ledger)
        self.assertTrue(any('distinct' in e for e in errs))
        self.assertTrue(any('evidence' in e for e in errs))
        self.assertTrue(any('opening narration' in e for e in errs))

    def test_rejects_unsupported_statistics(self):
        self.script['hook_options'][2]['text'] = self.alternatives[1].replace('a match', 'seven matches', 1)
        self.assertTrue(any('number 7' in e for e in hook_option_errors(self.script, self.ledger)))


if __name__ == '__main__':
    unittest.main()

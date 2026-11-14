"""Editing rule 2 and the bookend (docs/rules/editing-language.md, model-film 3 and 9): the question the narration asks
in the opening is set as a type card when it is asked, and comes back before the hand-over."""
import unittest

from studio.docu.plan import Adapter


def shot(n, start, frames, text, typ='illustration'):
    t = 0.0
    words = []
    for w in text.split():
        words.append({'w': w, 'start': round(t, 2), 'end': round(t + 0.3, 2)})
        t += 0.35
    return {'n': n, 'start': start, 'frames': frames, 'narration': text, 'voice_at': 0.2, 'words': words, 'visual': {'type': typ}}


class QuestionCard(unittest.TestCase):
    def setUp(self):
        self.a = Adapter.__new__(Adapter)
        self.a.plan = {'shots': [shot(0, 0.0, 240, 'He never scored for Greece. So what was a defender doing up there?'),
                                 shot(1, 8.0, 300, 'The champions had won three in a row.'),
                                 shot(2, 18.0, 300, 'And that is how one header settled it.'),
                                 shot(3, 28.0, 150, 'Subscribe.', 'follow')]}
        self.beats = [{'t': s['start'], 'd': s['frames'] / 30, 'shots': [], 'meta': {'n': s['n'], 'type': s['visual']['type']}} for s in self.a.plan['shots']]

    def test_the_opening_question_is_set_in_type_and_comes_back(self):
        self.a.question_cards(self.beats)
        card = [x for x in self.beats[0]['shots'] if x['kind'] == 'word']
        self.assertEqual(len(card), 1)
        self.assertEqual(card[0]['text'].replace('|', ' '), 'SO WHAT WAS A DEFENDER DOING UP THERE?')
        self.assertAlmostEqual(card[0]['at'], 0.2 + 5 * 0.35, places=2)        # on the narrator's first word of the question
        back = [x for x in self.beats[2]['shots'] if x['kind'] == 'word']
        self.assertEqual(back[0]['small'], 'THE OPENING QUESTION')                 # the bookend, before the hand-over
        self.assertFalse([x for x in self.beats[3]['shots'] if x['kind'] == 'word'])

    def test_no_question_no_card(self):
        self.a.plan['shots'][0] = shot(0, 0.0, 240, 'He never scored for Greece. Then came Nea Filadelfeia.')
        self.a.question_cards(self.beats)
        self.assertFalse(any(x['kind'] == 'word' for b in self.beats for x in b['shots']))


if __name__ == '__main__':
    unittest.main()

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


class Telling(unittest.TestCase):
    def test_the_narrator_never_talks_about_the_film(self):
        from studio.script import META_NARRATION
        for bad in ('We track the rivalry that defined an era.', 'You will see exactly how it turned.', 'This is a record of pride.'):
            self.assertTrue(META_NARRATION.search(bad), bad)
        self.assertFalse(META_NARRATION.search('Borrelli stands over the ball, out on the right.'))

    def test_a_club_name_alone_is_not_a_stake(self):
        from studio import hook_judge as H
        led = {'club_name': 'Panathinaikos', 'claims': [{'id': 'c1', 'fact': {'opponent': 'OFI', 'scorers': [{'name': 'Kalitzakis'}]}}]}
        club = H.score_option({'text': 'Three goals down against OFI, and the stands were ready to turn.'}, led)
        person = H.score_option({'text': 'Kalitzakis had seventy caps and no goal. So why was he up there?'}, led)
        self.assertLess(club['laws']['stake'], person['laws']['stake'])
        self.assertEqual(H.score_option({'text': 'We track the rivalry of 3 decades with Kalitzakis.'}, led)['laws']['cliche'], 0)


class YearFlaps(unittest.TestCase):
    """Editing rule 3: a year the narration says turns on a split-flap board, one a chapter, four a film at most."""
    def run_on(self, texts, chapters):
        a = Adapter.__new__(Adapter)
        a.plan = {'shots': [shot(i, i * 10.0, 300, t) for i, t in enumerate(texts)]}
        beats = [{'t': s['start'], 'd': 10.0, 'shots': [], 'meta': {'n': s['n'], 'type': 'illustration', 'chapter': c}}
                 for s, c in zip(a.plan['shots'], chapters)]
        a.year_flaps(beats)
        return [x for b in beats for x in b['shots'] if x['kind'] == 'flap']

    def test_a_spoken_year_turns_the_board_from_the_last_one(self):
        f = self.run_on(['It was 1994 in Athens.', 'Then came 1996 and a final.'], [0, 1])
        self.assertEqual([(x['frm'], x['to']) for x in f][1], ('1994', '1996'))
        self.assertEqual(f[0]['to'], '1994')

    def test_one_board_a_chapter(self):
        self.assertEqual(len(self.run_on(['In 1994 they won.', 'By 1995 they lost.'], [0, 0])), 1)

    def test_no_year_no_board(self):
        self.assertEqual(self.run_on(['They scored three goals.'], [0]), [])

    def test_four_boards_at_most(self):
        years = [f'It was {1990 + i} then.' for i in range(7)]
        self.assertEqual(len(self.run_on(years, list(range(7)))), 4)


class FilmShape(unittest.TestCase):
    """Editing rule 4: one shape a film, from the club, closed (no hole in the window)."""
    def test_club_shape_and_default(self):
        from studio.docu import build as B
        self.assertEqual(B.CLUB_SHAPES['panathinaikos'], 'shamrock')
        self.assertIn('svg', B.shape_mask('ticket'))
        self.assertIn('circle', B.shape_mask('shamrock'))
        self.assertEqual(B.shape_mask('nope'), B.shape_mask('ticket'))

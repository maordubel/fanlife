"""A named player's picture is made for him from a grounded look (docs/rules/studio-pictures.md 2–3)."""
import unittest

from studio import looks
from studio.docu.plan import Adapter


def response(text, facts_supported):
    return {'candidates': [{'content': {'parts': [{'text': text}]},
                            'groundingMetadata': {'groundingChunks': [{'web': {'uri': 'https://example.org/a', 'title': 'example.org'}}],
                                                  'groundingSupports': [{'segment': {'text': f}, 'groundingChunkIndices': [0]} for f in facts_supported]}}]}


class Look(unittest.TestCase):
    def test_slug_era_stem(self):
        self.assertEqual(looks.slug('Krzysztof Warzycha'), 'krzysztof-warzycha')
        self.assertEqual(looks.era_of('1993-94'), '1990s')
        self.assertEqual(looks.stem('Juan José Borrelli', '1990s', 'portrait'), 'person-juan-jose-borrelli-1990s-portrait-fl1-kr')

    def test_only_grounded_features_are_kept(self):
        ans = {'facts': ['Player X had short black curly hair in the 1990s.', 'Player X had dark brown skin and a slim build.'],
               'look': {'skin': 'dark brown skin', 'hair': 'short black curly hair', 'build': 'tall and slim', 'facial_hair': 'moustache'}}
        r = response('', ['Player X had short black curly hair in the 1990s.'])
        look, src = looks.grounded_look(ans, r, resolve=lambda u, c: u)
        self.assertEqual(look, {'hair': 'short black curly hair'})
        self.assertEqual(src[0]['url'], 'https://example.org/a')
        self.assertFalse(looks.ready(look))

    def test_prompt_never_names_and_needs_three_features(self):
        look = {'name': 'Player X', 'club': 'panathinaikos', 'era': '1990s', 'skin': 'dark brown skin', 'hair': 'short black curly hair', 'build': 'tall and slim'}
        ps = looks.pieces({'player-x-1990s': look})
        self.assertEqual(len(ps), len(looks.POSES))
        for p in ps:
            self.assertNotIn('Player X', p['prompt'])
            self.assertNotIn('panathinaikos', p['prompt'].lower())
            self.assertIn('dark brown skin', p['prompt'])
        self.assertEqual(looks.pieces({'y': {**look, 'skin': ''}}), [])


class Rec:
    def __init__(self, ids):
        self.records = [{'id': i, 'path': f'/x/{i}.png'} for i in ids]
        self.shots = {}

    def use(self, a, n, t=None, **k):
        self.shots.setdefault(a, set()).add(n)


class OwnPicture(unittest.TestCase):
    def adapter(self, ids):
        a = Adapter.__new__(Adapter)
        a._names = {'Warzycha'}
        a.led = {'season': '1993-94'}
        a.plan = {'shots': [{'n': 0, 'narration': 'Warzycha scored twice.', 'start': 0}, {'n': 1, 'narration': 'The crowd sang.'}]}
        a._picker = Rec(ids)
        a.pal = type('P', (), {'club_id': 'panathinaikos'})()
        return a

    def test_his_own_picture_of_his_era_is_used_and_other_figures_are_not(self):
        a = self.adapter(['person-warzycha-1990s-portrait-fl1-kr', 'person-warzycha-2000s-portrait-fl1-kr', 'ppl-player-shot-fl1-kr', 'terrace'])
        self.assertEqual(a.own_picture(0)['id'], 'person-warzycha-1990s-portrait-fl1-kr')
        self.assertEqual(a.people_pictures(0), {'person-warzycha-2000s-portrait-fl1-kr', 'ppl-player-shot-fl1-kr'})
        self.assertIsNone(a.own_picture(1))

    def test_no_picture_writes_an_order(self):
        a = self.adapter(['ppl-player-shot-fl1-kr'])
        self.assertIsNone(a.own_picture(0))
        self.assertEqual(a.missing_people['Warzycha']['era'], '1990s')
        self.assertEqual(a.missing_people['Warzycha']['beats'], [0])


class NotOnOtherLines(unittest.TestCase):
    def test_his_picture_stays_off_a_line_that_does_not_name_him(self):
        a = OwnPicture().adapter(['person-warzycha-1990s-portrait-fl1-kr', 'terrace'])
        self.assertEqual(a.people_pictures(1), {'person-warzycha-1990s-portrait-fl1-kr'})


class AfterFilm(unittest.TestCase):
    def test_grounded_person_is_ordered_and_committed(self):
        import json, tempfile
        from pathlib import Path
        from unittest import mock
        d = Path(tempfile.mkdtemp())
        (d / 'flow-people.json').write_text(json.dumps({'people': [{'name': 'Player X', 'club': 'panathinaikos', 'era': '1990s'}]}))
        facts = ['Player X had dark brown skin.', 'Player X had short black curly hair.', 'Player X was tall and slim.']
        ans = json.dumps({'facts': facts, 'look': {'skin': 'dark brown skin', 'hair': 'short black curly hair', 'build': 'tall and slim'}})
        call = lambda user: response(ans, facts)
        book = d / 'looks.json'
        committed = []
        orig = (looks.load.__defaults__, looks.save.__defaults__)
        with mock.patch.object(looks, 'BOOK', book), mock.patch('studio.deep_research._resolve', lambda u, c: u), \
             mock.patch('studio.cinema.flow_library.main', lambda: 0):
            looks.load.__defaults__ = (book,)
            looks.save.__defaults__ = (book,)
            try:
                out = looks.after_film(d, log=lambda *a: None, call=call, commit=lambda p, m, l: committed.append(m))
            finally:
                looks.load.__defaults__, looks.save.__defaults__ = orig
        self.assertEqual(out, ['Player X'])
        self.assertTrue(committed)
        self.assertTrue(looks.ready(json.loads(book.read_text())['player-x-1990s']))

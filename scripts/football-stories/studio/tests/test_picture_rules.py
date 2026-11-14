"""The owner's picture rules (14.11.2026): a rival's colour in the picture itself refuses it, and a line that names a real
person never gets a generic figure (docs/rules/model-film.md 19-20, docs/rules/studio-pictures.md)."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from studio import media_index as MI


def pic(d: Path, name: str, scarf: tuple[int, int, int] | None) -> Path:
    im = Image.new('RGB', (400, 300), (40, 110, 60))          # a green crowd …
    if scarf:
        for x in range(60, 340, 40):                           # … with scarves held up across it
            im.paste(scarf, (x, 120, x + 24, 150))
    p = d / name
    im.save(p)
    return p


class RivalPixels(unittest.TestCase):
    def test_red_scarves_in_the_picture_refuse_it_on_a_film_that_bans_red(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            red = MI.record('beat:common/crowd-a', 'kit', 'still', 'crowd scarves', path=pic(d, 'a.jpg', (210, 20, 25)))
            green = MI.record('beat:common/crowd-b', 'kit', 'still', 'crowd scarves', path=pic(d, 'b.jpg', None))
            p = MI.Picker({'records': [red, green]}, club='panathinaikos', bans=['red'])
            self.assertEqual(p.refused(red), "a rival's colour in the picture")   # the metadata said nothing: the pixels did
            self.assertIsNone(p.refused(green))
            self.assertEqual(p.pick({'n': 1, 'subjects': ['crowd']})['id'], 'beat:common/crowd-b')

    def test_a_key_red_piece_is_repainted_not_refused(self):
        with tempfile.TemporaryDirectory() as t:
            r = MI.record('lib:sup-scarf-up-kr', 'flow', 'cutout', 'supporter scarf', path=pic(Path(t), 'k.jpg', (210, 20, 25)),
                          extra={'accent': 'key-red'})
            self.assertIsNone(MI.Picker({'records': [r]}, club='panathinaikos', bans=['red']).refused(r, 'cutout'))


class NamedPeople(unittest.TestCase):
    def test_a_named_player_is_known_and_a_figure_is_recognised(self):
        from studio.docu.plan import Adapter
        a = Adapter.__new__(Adapter)
        a.led = {'facts': [{'fact': {'scorers': [{'name': 'Giannis Kalitzakis'}]}}]}
        self.assertTrue(a.named('Twenty minutes in, Giannis Kalitzakis rises at the far post.'))
        self.assertTrue(a.named('Krzysztof Warzycha finished with twenty-nine.'))    # a name the narrator's lexicon holds
        self.assertFalse(a.named('The away end is green and white.'))
        self.assertTrue(Adapter.FIGURE.search('lib:pup-striker-pose-kr'))
        self.assertTrue(Adapter.FIGURE.search('cut:common/fig-celebrate-arms-kr'))
        self.assertFalse(Adapter.FIGURE.search('lib:obj-drum-kr'))


if __name__ == '__main__':
    unittest.main()

"""The Flow-made art library (owner, 9.11.2026): every piece is named so the cinema picks it, drawn in the house
language, and the spec on disk is what the generator writes."""
import json
import re
import unittest
from pathlib import Path

from studio.cinema import animate, flow_library as FL
from studio.cinema.library import classify


class FlowLibrary(unittest.TestCase):
    def test_the_spec_on_disk_is_the_generator(self):
        on_disk = json.loads(FL.OUT.read_text(encoding='utf-8'))['pieces']
        self.assertEqual(on_disk, FL.pieces())

    def test_every_piece_is_a_library_piece_the_cinema_uses(self):
        for p in FL.pieces():
            info = classify(p['stem'])
            self.assertNotEqual(info['cls'], 'skip', p['stem'])
            self.assertEqual(info['colour'], 'kr', p['stem'])   # the red becomes each club's own colour
            self.assertRegex(p['stem'], r'^(ppl|sup|obj|era|doc|ins|layer|sky|ground|city)-[a-z0-9-]{2,70}-fl\d-kr$')
            if info['cls'] == 'ground':
                self.assertTrue(info['era'] and info['side'], p['stem'])

    def test_every_drawn_person_and_object_is_one_the_picker_asks_for(self):
        src = Path(animate.__file__).read_text(encoding='utf-8')
        asked = set(re.findall(r"'((?:ppl|sup|obj|era|doc|ins|layer|sky)-[a-z0-9-]+)'", src))
        for pat in {**FL.PEOPLE, **FL.OBJECTS, **FL.SCENES}:
            self.assertIn(pat, asked, f'{pat} is drawn but cinema/animate.wants never picks it')

    def test_the_house_language_and_nothing_that_is_not_ours(self):
        for p in FL.pieces():
            self.assertIn('ONE signal red', p['prompt'])
            self.assertIn('no club crests', p['prompt'])
            self.assertIn("no real person's likeness", p['prompt'])
            self.assertNotRegex(p['prompt'].lower(), r'\b(blood|riot|police|injur)')


if __name__ == '__main__':
    unittest.main()

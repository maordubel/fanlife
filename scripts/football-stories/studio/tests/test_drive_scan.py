"""The studio finds the owner's Drive packs for a film by name (owner, 4.11.2026), and a pasted folder always wins."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import drive_scan  # noqa: E402

F = '01_Football_Stories_מועדונים_ומשחקים'
TREE = {'folders': [{'id': f'id{i}', 'path': p} for i, p in enumerate([
    F, f'{F}/AEK-Athens', f'{F}/Panathinaikos', f'{F}/FanLife_Olympiacos_Maccabi_2024_Art_and_Research',
    f'{F}/FanLife_Olympiacos_Maccabi_2024_Art_and_Research/art', f'{F}/Fouad_Derby_Newspaper_Graphic_Pack',
    f'{F}/Fouad_Derby_Newspaper_Graphic_Pack/01_Scenes', f'{F}/Fouad_Derby_Newspaper_Graphic_Pack/03_Source_References',
    f'{F}/Maksimir_1990_Dinamo_Red_Star_Documentary_Pack', f'{F}/Hapoel_Tel_Aviv_FanLife_Complete_Graphic_Pack', 'CLASSIFIED'])],
    'files': [
        {'id': 'f1', 'path': f'{F}/Fouad_Derby_Newspaper_Graphic_Pack/01_Scenes', 'name': '01_Confrontation_Close.png'},
        {'id': 'f2', 'path': f'{F}/Fouad_Derby_Newspaper_Graphic_Pack/03_Source_References', 'name': 'image(4).png'},
        {'id': 'f3', 'path': f'{F}/Fouad_Derby_Newspaper_Graphic_Pack', 'name': 'README.md'},
        {'id': 'f4', 'path': f'{F}/FanLife_Olympiacos_Maccabi_2024_Art_and_Research/art', 'name': 'flare.png'},
        {'id': 'f5', 'path': 'CLASSIFIED', 'name': 'Hand_dropping_cologne_bottle_37899a4d.jpg'}]}


def plan(**b):
    return drive_scan.plan(TREE, {'club_name': 'Hapoel Tel Aviv', 'season': '', **b})


class Scan(unittest.TestCase):
    def test_a_story_finds_its_own_pack(self):
        p = plan(topic='The Fouad derby')
        self.assertEqual(p['targeted'][0]['path'], f'{F}/Fouad_Derby_Newspaper_Graphic_Pack')
        self.assertEqual({x['name'] for x in p['pictures']}, {'01_Confrontation_Close.png', 'image(4).png'})
        self.assertEqual([x['name'] for x in p['notes']], ['README.md'])

    def test_a_match_finds_the_pack_named_after_it(self):
        p = drive_scan.plan(TREE, {'club_name': 'Olympiacos', 'season': '2023/24', 'sides': ['Olympiacos', 'Maccabi Tel Aviv'], 'story_words': 'Olympiacos Maccabi Tel Aviv UEFA Conference League 2024'})
        self.assertEqual(p['targeted'][0]['path'], f'{F}/FanLife_Olympiacos_Maccabi_2024_Art_and_Research')
        self.assertEqual(len(p['targeted']), 1)  # its sub-folder is part of it, not a second pack

    def test_a_pasted_folder_always_wins(self):
        p = plan(drive_folder='https://drive.google.com/drive/folders/id8xxxxxxxx', topic='The Fouad derby')
        self.assertTrue(p['targeted'][0]['pinned'])

    def test_classified_takes_the_series_folder(self):
        p = drive_scan.plan(TREE, {'club_name': '', 'kind': 'classified', 'topic': 'Maksimir 1990'})
        paths = [t['path'] for t in p['targeted']]
        self.assertIn('CLASSIFIED', paths)
        self.assertIn(f'{F}/Maksimir_1990_Dinamo_Red_Star_Documentary_Pack', paths)

    def test_nothing_named_after_the_story_targets_nothing(self):
        self.assertEqual(drive_scan.plan(TREE, {'club_name': 'Celtic', 'season': '1966/67'})['targeted'], [])

    def test_press_photos_are_told_apart(self):
        self.assertTrue(drive_scan.is_photo({'path': f'{F}/Fouad/03_Source_References', 'name': 'image(4).png'}))
        self.assertFalse(drive_scan.is_photo({'path': f'{F}/Fouad/01_Scenes', 'name': '01_Confrontation_Close.png'}))

    def test_folder_ids(self):
        self.assertEqual(drive_scan.drive_id('https://drive.google.com/drive/folders/1Wegz3L6S2OrFZmvgShjNHpmSBxavsDxZ?usp=drive_link'),
                         '1Wegz3L6S2OrFZmvgShjNHpmSBxavsDxZ')
        self.assertIsNone(drive_scan.drive_id('hello'))


if __name__ == '__main__':
    unittest.main()

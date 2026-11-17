"""The Drive index (16.11.2026): every folder of the owner's library carries tags, and the committed index is exactly
what the tag map and the inventory build — so an edit to tags.json without a rebuild goes red here."""
import json
import unittest

from studio import drive_index as D


class DriveIndexTest(unittest.TestCase):
    def setUp(self):
        self.inv = json.loads(D.INVENTORY.read_text(encoding='utf-8'))
        self.tags = D.load_tags()

    def test_every_folder_is_tagged(self):
        self.assertEqual(D.build_index(self.inv, self.tags)['untagged'], [])

    def test_committed_index_is_current(self):
        built = D.build_index(self.inv, self.tags)
        committed = json.loads(D.INDEX.read_text(encoding='utf-8'))
        self.assertEqual(committed['files'], built['files'], 'run: python -m studio.drive_index build')

    def test_hebrew_folder_names_are_read_and_tagged(self):
        # owner, 17.11.2026: folders in his Drive may carry Hebrew names ("_לבדיקה_ידנית", "סופרגול כללי"). The index reads
        # them as they are and tags them like any folder; nothing is renamed in the owner's Drive.
        import re
        heb = {f['path'] for f in self.inv['folders'] if re.search('[֐-׿]', f['path'])}
        self.assertFalse(heb & set(D.build_index(self.inv, self.tags)['untagged']))

    def test_tags_are_from_the_vocabulary(self):
        voc = self.tags['vocab']
        for r in D.build_index(self.inv, self.tags)['files']:
            self.assertTrue(set(r['use']) <= set(voc['use']), r)
            self.assertIn(r['status'], voc['status'] + ['unreviewed'], r)
            self.assertIn(r['kind'], voc['kind'], r)

    def test_inheritance_and_rules(self):
        inv = {'folders': [{'id': 'a', 'path': 'Club'}, {'id': 'b', 'path': 'Club/Olympiacos drafts'}],
               'files': [{'id': 'x', 'path': 'Club/Olympiacos drafts', 'name': 'goal.png'}, {'id': 'y', 'path': 'Club', 'name': 'IMG_0001.MOV'}]}
        tags = {'folders': {'a': {'label': 'pack', 'use': ['studio'], 'status': 'approved'}},
                'rules': [{'match': '(?i)olympiacos', 'clubs': ['olympiacos'], 'on': 'any'}, {'match': '(?i)draft', 'status': 'draft', 'on': 'folder'},
                          {'match': r'IMG_\d+\.MOV$', 'status': 'vlog', 'protect': True, 'on': 'file'}]}
        rows = {r['id']: r for r in D.build_index(inv, tags)['files']}
        self.assertEqual(rows['x']['clubs'], ['olympiacos'])
        self.assertEqual(rows['x']['status'], 'draft')
        self.assertEqual(rows['x']['use'], ['studio'])
        self.assertEqual(rows['y']['status'], 'vlog')
        self.assertTrue(rows['y']['protect'])
        self.assertEqual(rows['y']['kind'], 'clip')

    def test_usable(self):
        self.assertFalse(D.usable({'status': 'draft'}, 'studio'))
        self.assertFalse(D.usable({'status': 'approved', 'clubs': ['panathinaikos']}, 'site', 'olympiacos'))
        self.assertTrue(D.usable({'status': 'approved', 'clubs': [], 'use': ['studio']}, 'studio', 'olympiacos'))
        self.assertFalse(D.usable({'status': 'approved', 'clubs': ['olympiacos'], 'use': []}, 'site', None, {'olympiacos'}))


if __name__ == '__main__':
    unittest.main()

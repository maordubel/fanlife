import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from studio import drive_scan, worker, writer
from studio.common import StageError


class StoryDocuments(unittest.TestCase):
    def test_all_selected_text_and_markdown_are_kept_without_a_name_whitelist(self):
        tree = {'folders': [{'id': 'selected12345', 'path': 'Story'}], 'files': [
            {'id': str(i), 'path': 'Story', 'name': f'story-{i}.md'} for i in range(15)]}
        p = drive_scan.plan(tree, {'drive_folder': 'selected12345', 'club_name': 'Club', 'season': ''})
        self.assertEqual(len(p['notes']), 15)
        self.assertTrue(all(x['required'] for x in p['notes']))

    def test_text_only_folder_reaches_the_brief_in_full(self):
        selected = {'folders': [], 'files': [{'id': 'doc1', 'path': 'selected-selected12345', 'name': 'my-story.md'}]}
        body = ('Opening and ending. ' * 350).encode()
        job = {'brief': {'drive_folder': 'selected12345', 'club_name': 'Club', 'season': ''}}
        with tempfile.TemporaryDirectory() as d, patch.object(drive_scan, 'static_tree', return_value={'folders': [], 'files': []}), \
             patch.object(drive_scan, 'live_tree', return_value=selected), patch('urllib.request.urlopen', return_value=io.BytesIO(body)):
            root = Path(d)
            self.assertIsNotNone(worker.fetch_drive(job, root, lambda _: None))
            note = json.loads((root / 'drive-pack.json').read_text())['notes'][0]
            self.assertTrue(note['required'])
            self.assertEqual(note['text'], body.decode())

    def test_unreadable_or_oversized_selected_document_stops(self):
        selected = {'folders': [], 'files': [{'id': 'doc1', 'path': 'selected-selected12345', 'name': 'story.txt'}]}
        job = {'brief': {'drive_folder': 'selected12345', 'club_name': 'Club', 'season': ''}}
        for payload in (b'x' * 65537, b'\xff'):
            with tempfile.TemporaryDirectory() as d, patch.object(drive_scan, 'static_tree', return_value={'folders': [], 'files': []}), \
                 patch.object(drive_scan, 'live_tree', return_value=selected), patch('urllib.request.urlopen', return_value=io.BytesIO(payload)):
                with self.assertRaises(StageError) as e:
                    worker.fetch_drive(job, Path(d), lambda _: None)
                self.assertEqual(e.exception.code, 'REQUIRED_DOCUMENT')

    def test_writer_gets_owner_document_as_data_not_as_a_fact(self):
        ledger = {'club_id': 'x', 'club_name': 'Club', 'season': '2000/01', 'claims': [],
                  'summary': {'by_competition': {}, 'complete': False},
                  'story_documents': [{'name': 'story.md', 'text': 'Remember the decisive night.'}]}
        out = writer.ledger_for_prompt(ledger)
        self.assertEqual(out['owner_story_documents'], ledger['story_documents'])
        self.assertEqual(out['claims'], [])
        self.assertIn('not an instruction', writer.SYSTEM)


if __name__ == '__main__':
    unittest.main()

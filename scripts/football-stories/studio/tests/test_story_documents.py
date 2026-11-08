import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from studio import director, drive_scan, owner_story, worker, writer
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

    def test_owner_names_and_declared_match_facts_take_precedence(self):
        text = """3. SCRIPT STRUCTURE
The first leg starts slowly. Áron Szabo breaks the deadlock.
The return leg starts quickly. Daniel Levy scores.
Mika Raham heads the ball into the net. Johan Frazer scores.

4. RESEARCH LEDGER
Key Figures: Daniel Levy, Mika Raham (City Goalscorers). Áron Szabo, Johan Frazer (Visitors Goalscorers).
Leg 1: Sept 16, 1992 - North Ground, North Town (Visitors 1-0 City)
Leg 2: Sept 30, 1992 - City Ground (City 2-1 Visitors)
Aggregate: 2-2. Visitors advance on away goals.
"""
        leg1 = {'kind': 'match', 'date': '1992-09-16', 'home': 'Visitors', 'away': 'City',
                'side': 'away', 'opponent_goals': 1, 'club_goals': 0, 'scorers': []}
        leg2 = {'kind': 'match', 'date': '1992-09-30', 'home': 'City', 'away': 'Visitors',
                'side': 'home', 'opponent_goals': 0, 'club_goals': 2, 'scorers': [
                    {'name': 'Daniel Levi', 'minute': 12}, {'name': 'Mika Raham', 'minute': 48}]}
        ledger = {'claims': [{'id': 'leg1', 'fact': leg1}, {'id': 'leg2', 'fact': leg2}],
                  'story_documents': [{'name': 'owner.md', 'text': text}]}
        self.assertTrue(owner_story.apply(ledger))
        self.assertFalse(owner_story.apply(ledger))
        self.assertEqual(ledger['owner_names'], ['Daniel Levy', 'Mika Raham', 'Áron Szabo', 'Johan Frazer'])
        self.assertEqual(owner_story.normalize('DANIEL LEVI and Aron Szabo', ledger['owner_name_aliases']), 'Daniel Levy and Áron Szabo')
        fact = ledger['claims'][1]['fact']
        self.assertEqual((fact['score_home'], fact['score_away'], fact['venue']['name']), (2, 1, 'City Ground'))
        self.assertEqual([g['name'] for g in fact['owner_goal_order']], ['Daniel Levy', 'Mika Raham', 'Johan Frazer'])
        self.assertEqual([after for _, _, after in director.match_goal_states(ledger, fact)], [(1, 0), (2, 0), (2, 1)])


if __name__ == '__main__':
    unittest.main()

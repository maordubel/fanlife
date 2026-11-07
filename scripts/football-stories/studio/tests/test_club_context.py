import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from studio.club_context import profile

class ClubContext(unittest.TestCase):
    def test_specific_reviewed_context_includes_sources_and_gaps(self):
        p = profile('hapoel-petah-tikva')
        self.assertEqual(p['status'], 'reviewed-context')
        self.assertTrue(any('Blue' in x['text'] for x in p['entries']))
        self.assertTrue(all(len(x['sources']) >= 2 for x in p['entries']))
        self.assertTrue(p['research_gaps'])

    def test_eligible_club_without_world_gets_researched_context(self):
        p = profile('al-ahly')
        self.assertEqual(p['status'], 'reviewed-context')
        self.assertTrue(any('Zamalek' in x['text'] for x in p['entries']))
        self.assertTrue(p['research_gaps'])

    def test_no_context_is_not_invented(self):
        self.assertEqual(profile('unknown')['status'], 'unavailable')
        self.assertEqual(profile('../bad')['status'], 'unavailable')

if __name__ == '__main__': unittest.main()

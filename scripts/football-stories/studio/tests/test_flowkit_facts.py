"""The Short's fact sheet reads the match as the archive gives it (13.11.2026: a venue is a dict, and every Short of a
match with a known ground crashed with "can only concatenate str (not dict)")."""
import unittest

from studio import flowkit


def ledger(venue):
    return {'claims': [{'id': 'm1', 'fact': {'kind': 'match', 'date': '1998-09-17', 'home': 'Maccabi Tel Aviv', 'away': 'Olympiacos', 'score_home': 1,
                                              'score_away': 6, 'competition': 'UEFA Cup', 'stage': 'First round', 'venue': venue,
                                              'scorers': [{'name': 'A', 'minute': 12}, {'name': 'B', 'minute': None}]}}]}


class FactsOf(unittest.TestCase):
    def test_a_venue_as_the_archive_gives_it(self):
        line = flowkit.facts_of(ledger({'name': 'Ramat Gan Stadium', 'city': 'Ramat Gan'}), 'm1')
        self.assertIn('venue Ramat Gan Stadium', line)
        self.assertIn('Maccabi Tel Aviv 1–6 Olympiacos', line)
        self.assertIn("A 12'", line)

    def test_an_older_string_venue_and_no_venue(self):
        self.assertIn('venue Bloomfield', flowkit.facts_of(ledger('Bloomfield'), 'm1'))
        for v in (None, {}, {'name': None}):
            self.assertNotIn('venue', flowkit.facts_of(ledger(v), 'm1'))


if __name__ == '__main__':
    unittest.main()

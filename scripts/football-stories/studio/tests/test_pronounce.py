"""The narrator says names right: the lexicon, its conversion to the voice's phonemes, and the spoken forms of numbers.

Rendering is not tested here (no model in CI); what the voice is GIVEN is.
"""
from __future__ import annotations

import glob
import json
import re
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import pronounce as P  # noqa: E402
from studio.voice import spoken  # noqa: E402


def narrations() -> list[str]:
    out = []
    for f in sorted(glob.glob(str(HERE / 'studio' / 'dossiers' / '*.script.json'))):
        for ch in json.loads(Path(f).read_text()).get('chapters', []):
            out += [b.get('narration', '') for b in ch.get('beats', [])]
    return out


class Lexicon(unittest.TestCase):
    def test_every_entry_uses_only_symbols_the_voice_knows(self):
        bad = {n: sorted(P.unknown_symbols(v)) for n, v in P.lexicon().items() if P.unknown_symbols(v)}
        self.assertEqual(bad, {}, 'a symbol outside the vocab is dropped silently and the name comes out mumbled')

    def test_every_entry_has_a_stress(self):
        for n, v in P.lexicon().items():
            if len(re.findall(r'[aeiouyæɑɒɔəɛɜɪʊʌ]', v)) > 1 and n not in ('TSC', 'PSV Eindhoven'):
                self.assertRegex(v, '[ˈˌ]', n)

    def test_stress_moves_before_the_vowel(self):
        self.assertEqual(P.to_kokoro('ziˈdan'), 'zidˈan')
        self.assertEqual(P.to_kokoro('ˌɛmbaˈpeɪ'), 'ˌɛmbapˈA')
        self.assertEqual(P.to_kokoro('ˈtʃɒrluka'), 'ʧˈɔːluka')

    def test_a_british_narrator_drops_the_r_before_a_consonant(self):
        self.assertEqual(P.to_kokoro('ˌmɛndiliˈbar'), 'mˌɛndilibˈɑː')
        self.assertEqual(P.to_kokoro('ˈmarijan'), 'mˈaɹijan')          # an r before a vowel stays
        self.assertEqual(P.to_kokoro('mɒˈrjɛntɛs'), 'mɒɹjˈɛntɛs')      # and in an onset cluster
        self.assertEqual(P.to_kokoro('ˈɡərbavitsa'), 'ɡˈɜːbavitsa')

    def test_longest_name_wins_and_language_follows_the_person(self):
        pr = P.Pronouncer()
        self.assertEqual(pr.names_in('José Mourinho and José Luis Mendilibar'), ['José Mourinho', 'José Luis Mendilibar'])
        self.assertNotEqual(pr.ipa['José Mourinho'].split()[0], pr.ipa['José Luis'].split()[0])

    def test_possessive_keeps_the_name(self):
        pr = P.Pronouncer()
        self.assertIn('/ziˈdanz/'.replace('iˈd', 'idˈ'), pr.markup("Zidane's goal"))
        self.assertIn('ɪz/', pr.markup("Olympiacos's fans"))

    def test_a_film_can_override_with_ipa_or_respelling(self):
        pr = P.Pronouncer({'Zidane': '/ˈziːdeɪn/', 'Fooville': 'Foo-vil'})
        self.assertIn('zˈiːdAn', pr.markup('Zidane'))
        self.assertEqual(pr.markup('Fooville'), 'Foo-vil')

    def test_the_club_is_sel_tic(self):
        self.assertTrue(P.lexicon()['Celtic'].startswith('ˈs'))

    def test_every_accented_name_in_a_script_is_listed(self):
        """A name written with letters English does not use (Mbappé, Željezničar) is always a guess without an entry."""
        pr = P.Pronouncer()
        missing = set()
        for t in narrations():
            covered = set()
            for m in pr.rx.finditer(t):
                covered.update(range(m.start(), m.end()))
            for m in re.finditer(r"[\wÀ-ž’'-]+", t):
                if m.start() not in covered and any(ord(c) > 127 and c.isalpha() for c in m.group(0)):
                    missing.add(m.group(0))
        self.assertEqual(sorted(missing), [])

    def test_respelling_for_text_only_voices(self):
        self.assertEqual(P.respell('ziˈdan'), 'zee-DAHN')
        self.assertEqual(P.respell('ˈbajɛvitʃ'), 'BAH-yeh-veech')


class Spoken(unittest.TestCase):
    def test_scorelines_are_said_like_a_narrator(self):
        self.assertEqual(spoken('3–3'), '3 all')
        self.assertEqual(spoken('0–0'), 'nil nil')
        self.assertEqual(spoken('2–0'), '2 nil')
        self.assertEqual(spoken('3–4'), '3 4')

    def test_a_span_of_years_is_not_a_score(self):
        self.assertEqual(spoken('1971–2026'), '1971 to 2026')

    def test_clock_times(self):
        self.assertEqual(spoken('19:45'), '19 45')
        self.assertEqual(spoken('20:05'), '20 oh 5')
        self.assertEqual(spoken('21:00'), "21 hundred")


if __name__ == '__main__':
    unittest.main()

"""The cartoon Shorts (owner, 8.11.2026) and the grounded research: what can be checked without a browser or a key."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from studio import deep_research  # noqa: E402
from studio.cartoon import build, scene  # noqa: E402

TEXT = ('This is the bottle that cost a goalkeeper the World Cup. He drops it. '
        'The score was three-two after penalties. Full story on FanLife.')


def words(text: str) -> list[dict]:
    out, t = [], 0.0
    for w in text.split():
        out.append({'w': w, 'start': round(t, 3), 'end': round(t + 0.3, 3)})
        t += 0.38
    return out


class Scene(unittest.TestCase):
    def test_writer_beats_are_used_only_when_they_add_up_to_the_narration(self):
        good = [{'say': 'This is the bottle that cost a goalkeeper the World Cup.', 'show': 'bottle'},
                {'say': 'He drops it. The score was three-two after penalties. Full story on FanLife.', 'show': ''}]
        self.assertEqual(len(scene.split_beats(TEXT, good)), 2)
        bad = [{'say': 'Something else entirely.', 'show': ''}]
        self.assertEqual(len(scene.split_beats(TEXT, bad)), 4)   # the sentences, never words the voice does not say

    def test_gags_land_on_their_words_and_a_score_needs_a_spoken_score(self):
        b = scene.plan(scene.split_beats(TEXT, None), words(TEXT))
        self.assertEqual(b[0]['gag'], 'bottle')
        self.assertEqual(b[2]['gag'], 'scoreboard')
        self.assertEqual(b[2]['score'], (3, 2))
        self.assertIsNone(scene.gag_of('The scoreboard was dark that night.'))
        self.assertTrue(all(x['t0'] < x['t1'] for x in b))


class Build(unittest.TestCase):
    def test_a_rival_colour_never_reaches_the_page(self):
        pal = build.palette('#D71920', '#FFFFFF', ['green'])   # an Olympiacos Short: no green, not even the pitch
        self.assertNotEqual(pal['pitch'], '#7DB36A')
        page = build.neutralize('<rect fill="#7DB36A"/><rect fill="#D71920"/>', ['green'])
        self.assertNotIn('#7DB36A', page)
        self.assertIn('#D71920', page)   # the club's own colour is never touched

    def test_the_page_is_one_composition_with_its_timeline(self):
        with tempfile.TemporaryDirectory() as d:
            try:
                html, cues = build.compose(Path(d), scene.plan(scene.split_beats(TEXT, None), words(TEXT)), words(TEXT), 7.0,
                                           build.palette('#B02D10', '#FFFBF2', ['yellow']), tag='TEST', bans=['yellow'])
            except Exception as e:  # noqa: BLE001 — gsap is installed by npm ci in studio/hyperframes
                if 'HF_NO_GSAP' in str(e):
                    self.skipTest('gsap not installed')
                raise
            page = html.read_text()
            self.assertIn('data-composition-id="main"', page)
            self.assertIn('window.__timelines["main"]', page)
            self.assertIn('data-width="1080"', page)
            self.assertTrue(any(k == 'tick' for _, k in cues))


class Grounding(unittest.TestCase):
    def test_only_facts_google_grounded_are_kept(self):
        answer = {'facts': ['Quini was kidnapped on 1 March 1981 after scoring twice against Hércules.',
                            'Quini scored a hat-trick in the 1981 cup final.']}
        response = {'candidates': [{'groundingMetadata': {
            'groundingChunks': [{'web': {'uri': 'https://g.example/r1', 'title': 'wikipedia.org'}},
                                {'web': {'uri': 'https://g.example/r2', 'title': 'theguardian.com'}}],
            'groundingSupports': [{'segment': {'text': 'Quini was kidnapped on 1 March 1981 after scoring twice against Hércules.'},
                                   'groundingChunkIndices': [0, 1]}]}}]}
        kept = deep_research.grounded_facts(answer, response, resolve=lambda u, c: u)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]['confidence'], 2)
        self.assertTrue(all(s['url'].startswith('https://') for s in kept[0]['sources']))

    def test_no_key_means_the_archive_alone(self):
        import os
        old = os.environ.pop('GEMINI_API_KEY', None)
        try:
            notes = []
            led = deep_research.enrich({'claims': []}, {'club_id': 'x'}, Path(tempfile.gettempdir()), notes.append)
            self.assertNotIn('deep_research', led)
            self.assertTrue(notes and 'archive alone' in notes[0])
        finally:
            if old is not None:
                os.environ['GEMINI_API_KEY'] = old


if __name__ == '__main__':
    unittest.main()

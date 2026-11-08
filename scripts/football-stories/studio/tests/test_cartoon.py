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


class Illustrated(unittest.TestCase):
    """The illustrated Short (owner, 8.11.2026): the owner's drawn library behind every line, never a plate twice."""

    BEATS = [{'say': 'Brazil were losing to Argentina at the World Cup.', 'show': 'nervous fans in the stand at night'},
             {'say': 'The physio handed Branco a bottle.', 'show': 'the bench, a bottle'},
             {'say': 'Minutes later he could barely stand.', 'show': 'the clock'},
             {'say': 'Then Caniggia scored.', 'show': 'the ball flies into the net'},
             {'say': 'Argentina won the match and celebrated.', 'show': 'the players celebrate'}]

    def setUp(self):
        from studio.cartoon import plates
        if not plates.has_library():
            self.skipTest('the drawn library is not in this checkout')
        self.plates = plates
        for i, b in enumerate(self.BEATS):
            b['pose'], b['expr'] = scene.pose_of(b['say'] + ' ' + b['show'], i, len(self.BEATS))
            b['gag'] = scene.gag_of(b['show']) or scene.gag_of(b['say'])

    def test_one_plate_per_line_never_twice_and_never_a_transition(self):
        keys = self.plates.pick_plates(self.BEATS, [])
        self.assertEqual(len(keys), len(self.BEATS))
        stems = [k.replace('-b-', '-').replace('-c-', '-') for k in keys]
        self.assertEqual(len(set(stems)), len(stems))
        self.assertFalse(any('/tr-' in k or '/follow-' in k for k in keys))
        self.assertEqual(keys, self.plates.pick_plates(self.BEATS, []), 'the same Short draws the same film')

    def test_a_losing_line_never_stands_on_a_celebration(self):
        keys = self.plates.pick_plates(self.BEATS, [])
        self.assertFalse(self.plates.JOY_PLATE.search(keys[0]), keys[0])
        self.assertNotEqual(self.plates.pick_figure(self.BEATS[0], [], 'x'), 'cut:common/fig-captain-cup-kr')

    def test_the_story_lines_find_their_drawings(self):
        keys = self.plates.pick_plates(self.BEATS, [])
        self.assertIn('clock', keys[2])
        self.assertRegex(keys[3], r'net|goal|header|volley')

    def test_rival_colours_keep_out_plates_that_print_them(self):
        keys = self.plates.pick_plates(self.BEATS, ['green'])
        meta = {p['key']: p for p in self.plates.catalog()}
        for k in keys:
            fam = set(meta[k].get('families') or []) - ({'red'} if meta[k].get('accent') == 'key-red' else set())
            self.assertNotIn('green', fam, k)

    def test_the_page_is_one_function_of_time_with_every_shot(self):
        from studio.cartoon import stage
        text = ' '.join(b['say'] for b in self.BEATS)
        ws = words(text)
        beats = scene.plan([{'say': b['say'], 'show': b['show']} for b in self.BEATS], ws)
        with tempfile.TemporaryDirectory() as d:
            page, cues, shots = stage.compose(Path(d), beats, ws, ws[-1]['end'] + 0.8, accent='#B02D10', bans=['yellow'],
                                              tag='FAN LIFE · TEST', gsap=Path(d) / 'g.js' if (Path(d) / 'g.js').write_text('') is not None else None)
            html_ = page.read_text()
            self.assertEqual(html_.count('class="shot"'), len(beats))
            self.assertIn('window.__timelines["main"]=tl', html_)
            self.assertTrue(all((Path(d) / 'assets' / m).exists() for m in __import__('re').findall(r'src="assets/([^"]+)"', html_)))
            self.assertEqual(len(shots), len(beats))
            self.assertTrue(any(k == 'whoosh' for _, k in cues) or any(k == 'drum' for _, k in cues))
            self.assertTrue(all(s['amb'] for s in shots))


class ShortSound(unittest.TestCase):
    def test_the_music_ducks_under_the_voice_and_the_limiter_never_clips(self):
        import numpy as np
        from studio.cartoon import sound
        sr = 8000
        v = np.zeros(sr * 3, 'float32')
        v[sr:2 * sr] = 0.3 * np.sin(np.arange(sr) / sr * 2 * np.pi * 220)
        env = sound.duck_envelope(v, sr)
        self.assertGreater(env[sr // 2], 0.95)
        self.assertLess(env[int(1.6 * sr)], 0.6)
        y = sound.limit(np.array([0.2, 0.9, 1.6, -3.0], 'float32'))
        self.assertTrue(np.all(np.abs(y) <= 0.93 + 1e-6))
        self.assertAlmostEqual(float(y[0]), 0.2, places=5)

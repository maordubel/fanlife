"""The studio system of 8.11.2026: what to make (evidence), the animated Short's Flow pack, and the narrator upgrade."""
from __future__ import annotations

import json
import unittest
from pathlib import Path
from unittest.mock import patch

from studio import flowkit, namebook, pronounce, series, voice

FACTS = ("MATCH 2024-05-29: Olympiacos 1–0 Fiorentina; UEFA Europa Conference League Final; after extra time; "
         "scorers: Ayoub El Kaabi 116'")
SCRIPT = {
    'title': 'The header in the 116th minute', 'hook_law': 'know-it-all',
    'narration': ('So Olympiacos had never won a European trophy, not once in its whole history. Then came Athens, '
                  'a final, and extra time with nothing in it. The clock said 116. Ayoub El Kaabi rose above everyone at the '
                  'near post. One nil. Piraeus did not sleep that night, and nobody there has forgotten it since.'),
    'cast_sheet': [{'id': 'kaabi', 'role': 'the striker in red and white stripes', 'look': 'Ayoub El Kaabi: short dark beard, red and white stripes'}],
    'beats': [
        {'say': 'So Olympiacos had never won a European trophy, not once in its whole history.', 'scene': 'an empty trophy cabinet in Piraeus', 'cast': []},
        {'say': 'Then came Athens, a final, and extra time with nothing in it.', 'scene': 'the UEFA Europa Conference League Final 2024 under floodlights', 'cast': []},
        {'say': 'The clock said 116.', 'scene': 'a stadium clock', 'cast': []},
        {'say': 'Ayoub El Kaabi rose above everyone at the near post.', 'scene': 'the box at a corner', 'cast': [{'id': 'kaabi', 'action': 'jumps and heads the ball', 'motion': 'jump'}]},
        {'say': 'One nil.', 'scene': 'the net bulging', 'cast': [{'id': 'kaabi', 'action': 'runs to the corner flag', 'motion': 'celebrate'}], 'stamp': 'REAL'},
        {'say': 'Piraeus did not sleep that night, and nobody there has forgotten it since.', 'scene': 'a street of flares', 'cast': [{'id': 'kaabi', 'action': 'lifts the cup', 'motion': 'celebrate'}]},
    ],
}


class FlowShort(unittest.TestCase):
    def test_a_valid_script_passes(self):
        self.assertEqual(flowkit.errors(SCRIPT, FACTS, 30), [])

    def test_a_number_the_record_lacks_fails(self):
        bad = json.loads(json.dumps(SCRIPT))
        bad['narration'] = bad['narration'].replace('116', '117')
        bad['beats'][2]['say'] = 'The clock said 117.'
        self.assertTrue(any('117' in e for e in flowkit.errors(bad, FACTS, 30)))

    def test_hype_and_exclamations_fail(self):
        bad = json.loads(json.dumps(SCRIPT))
        bad['narration'] = bad['narration'].replace('One nil.', 'One nil!')
        bad['beats'][4]['say'] = 'One nil!'
        self.assertTrue(flowkit.errors(bad, FACTS, 30))

    def test_beats_must_say_the_narration(self):
        bad = json.loads(json.dumps(SCRIPT))
        bad['beats'][0]['say'] = 'Something else entirely.'
        self.assertTrue(any('joined' in e for e in flowkit.errors(bad, FACTS, 30)))

    def test_clip_prompts_name_no_one(self):
        names = {'people': ['Ayoub El Kaabi', 'Kaabi'], 'clubs': ['Olympiacos', 'Fiorentina']}
        pack = flowkit.flow_pack(SCRIPT, names)
        text = json.dumps([c['prompt'] for c in pack['characters'] + pack['clips'] + pack['stills']])
        for word in ('Kaabi', 'Olympiacos', 'Fiorentina', '2024', 'UEFA', 'Conference League', 'Europa'):
            self.assertNotIn(word, text, word)
        self.assertNotIn('The the', text)

    def test_the_pack_is_the_edit_plan(self):
        pack = flowkit.flow_pack(SCRIPT, {})
        self.assertEqual(pack['credits'], 18 * len(pack['clips']))
        self.assertEqual([b['say'] for b in pack['story']['beats']], [b['say'] for b in SCRIPT['beats']])
        for b in pack['story']['beats']:
            self.assertEqual(('clip' in b) + ('still' in b), 1)
        self.assertEqual(pack['story']['beats'][4]['stamp'], 'REAL')
        md = flowkit.markdown(pack, SCRIPT)
        self.assertIn('clip-0.mp4', md)


class Series(unittest.TestCase):
    def test_every_series_has_its_brand(self):
        for k in ('documentary', 'classified', 'vlog', 'short', 'promo'):
            s = series.of(k)
            for f in ('name', 'tag', 'promise', 'hook', 'title', 'thumbnail', 'look', 'sound', 'length'):
                self.assertTrue(s.get(f), f'{k}.{f}')
        self.assertIn('flow_style', series.of('short'))


class Names(unittest.TestCase):
    def test_greek_names_carry_their_stress(self):
        self.assertEqual(namebook.greek_word('Giannakopoulos'), 'janakɒˈpulɒs')
        self.assertEqual(namebook.greek_word('Anatolakis'), 'anatɒˈlakis')
        self.assertEqual(namebook.greek_word('Nikolaidis'), 'nikɒlaˈidis')
        self.assertIsNone(namebook.greek_word('Derbyshire'))
        self.assertIsNone(namebook.greek_word('Galletti'))

    def test_the_language_of_a_name(self):
        self.assertEqual(namebook.lang_of('Marko Nikolić', None), 'hr')
        self.assertEqual(namebook.lang_of('Chiquinho', None), 'pt-br')
        self.assertIsNone(namebook.lang_of('Elijah Smith', None))
        self.assertIsNone(namebook.lang_of('Henrik Larsson', None))

    def test_anglicised_to_the_voice_s_sounds(self):
        self.assertEqual(namebook.anglicise('ˈχristos'), 'ˈxristos')
        self.assertEqual(pronounce.unknown_symbols(namebook.anglicise('nˈikolɪdʑ ʒˈɛʎeznˌɪtʃɑr')) - {' '}, set())

    def test_the_archive_namebook_is_said_and_the_hand_lexicon_wins(self):
        book = json.loads(pronounce.ARCHIVE.read_text())['names']
        self.assertGreater(len(book), 1000)
        for name, ipa in list(book.items())[:400]:
            self.assertFalse(pronounce.unknown_symbols(ipa) - {' '}, name)
        pr = pronounce.Pronouncer()
        hand = pronounce.lexicon()
        clash = next((n for n in hand if n in book), None)
        if clash:
            self.assertEqual(pr.ipa[clash], hand[clash])


class Prosody(unittest.TestCase):
    def test_a_name_ending_a_sentence_lands_on_its_own_beat(self):
        pr = pronounce.Pronouncer({'Gili Landau': '/ˈɡili ˈlandaʊ/'})
        self.assertEqual(voice.landing('And the man who scored, Gili Landau.', pr), ['And the man who scored,', 'Gili Landau.'])
        self.assertEqual(voice.landing('It rained, and it rained.', pr), ['It rained, and it rained.'])

    def test_repitch_keeps_the_length_the_caller_planned(self):
        import numpy as np
        a = np.sin(np.linspace(0, 200, 24000)).astype('float32')
        self.assertEqual(len(voice.repitch(a, 1.0)), 24000)
        self.assertEqual(len(voice.repitch(a, 1.03)), round(24000 / 1.03))

    def test_gemini_failure_reads_the_whole_film_with_kokoro(self):
        from studio.common import StageError
        script = {'chapters': [{'beats': [{'narration': 'One nil.'}]}]}
        calls = []
        with patch.object(voice, 'provider', return_value='gemini'), \
             patch.object(voice, 'gemini_script', side_effect=StageError('GEMINI_TTS_429', 'spent')), \
             patch.object(voice, 'kokoro_beat', side_effect=lambda t, out, x, d: (calls.append(t), voice._wav_write(out, [0.0] * 2400))[1] or {'words': [], 'voice': 'kokoro:x'}):
            import tempfile
            with tempfile.TemporaryDirectory() as d:
                v = voice.voice_script(script, Path(d) / 'o', Path(d) / 'c', lambda m: None)
        self.assertEqual(v['provider'], 'kokoro')
        self.assertEqual(calls, ['One nil.'])


if __name__ == '__main__':
    unittest.main()


class Research(unittest.TestCase):
    def test_an_answer_is_kept_only_when_it_can_be_said(self):
        from studio import name_research as R
        self.assertEqual(R.valid('Zrinjski', {'ipa': '/ˈzriɲski/', 'respell': 'ZRIN-skee'}), 'ˈzriɲski')
        self.assertEqual(R.valid('Petah Tikva', {'ipa': 'ˈpɛtaχ ˈtikva', 'respell': 'PET-akh TIK-vuh'}), 'ˈpɛtax ˈtikva')
        self.assertIsNone(R.valid('Petah Tikva', {'ipa': 'ˈpɛtax', 'respell': 'PET-akh'}))          # a word missing
        self.assertIsNone(R.valid('Celtic', {'ipa': 'ˈsɛltɪk', 'respell': 'SEL-tik-a-ra-ma-da'}))  # syllables disagree
        self.assertIsNone(R.valid('Celtic', 'SEL-tik'))

    def test_without_a_writer_the_film_goes_on(self):
        import os
        import tempfile
        from studio import name_research as R
        env = {k: v for k, v in os.environ.items() if k not in ('GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY')}
        with patch.dict(os.environ, env, clear=True), tempfile.TemporaryDirectory() as d:
            self.assertEqual(R.for_script(['Riyad Benayad scored in Casablanca.'], Path(d), lambda m: None), {})

    def test_the_research_order_puts_the_worst_clubs_first(self):
        from studio import name_research as R
        e = R.entries()
        self.assertGreater(len(e), 5000)
        players = [x for x in e if x['kind'] == 'player']
        self.assertEqual(players[0]['club'], 'Zrinjski Mostar')
        self.assertTrue(any(x.get('native') for x in e if x['club'] == 'Hapoel Petah Tikva'))

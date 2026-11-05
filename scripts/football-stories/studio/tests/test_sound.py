"""The mix (owner, 4.11.2026: "the studio makes the effects too loud"): every effect sits under the narrator, at its own
distance, and the same sound never fires twice inside its gap."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import audio  # noqa: E402


class Levels(unittest.TestCase):
    def test_every_effect_is_well_under_the_voice(self):
        rng = np.random.default_rng(1)
        t = np.arange(audio.SR * 3) / audio.SR
        voice = (np.sin(2 * np.pi * 180 * t) * 0.12).astype('float32')
        vdb = audio.speech_db(voice)
        for kind in ('paper', 'stamp', 'whoosh', 'pop', 'end'):
            for _ in range(5):
                a = audio.level_fx(kind, audio.fx(kind, rng), vdb, rng)
                w = int(0.12 * audio.SR)
                loudest = max(audio._rms_db(a[i:i + w]) for i in range(0, max(1, len(a) - w + 1), w // 4))
                self.assertLess(loudest, vdb - 8, kind)  # the loudest moment of any effect stays 8+ dB under speech

    def test_the_stamp_has_no_boom(self):
        a = audio.fx('stamp', np.random.default_rng(2))
        spec = np.abs(np.fft.rfft(a))
        f = np.fft.rfftfreq(len(a), 1 / audio.SR)
        self.assertLess(spec[f < 90].sum() / spec.sum(), 0.08)


class Density(unittest.TestCase):
    def test_no_repeat_inside_its_gap_and_no_collisions(self):
        cues = [(0, 'whoosh'), (0.45, 'stamp'), (1.0, 'stamp'), (1.1, 'paper'), (1.3, 'pop'), (1.7, 'pop'), (3.0, 'stamp')]
        kept = audio.thin_cues(cues, 10)
        self.assertEqual(kept, [(0, 'whoosh'), (0.45, 'stamp'), (1.1, 'paper'), (1.7, 'pop'), (3.0, 'stamp')])

    def test_a_minute_has_a_ceiling(self):
        cues = [(i * 0.5, 'pop') for i in range(120)]
        self.assertLessEqual(len(audio.thin_cues(cues, 60)), audio.FX_PER_MINUTE)


if __name__ == '__main__':
    unittest.main()


class MusicLevel(unittest.TestCase):
    """Owner, 5.11.2026: the background music was too loud relative to the narrator."""

    def test_a_loud_track_sits_well_under_the_voice(self):
        import numpy as np
        from studio import audio as A
        t = np.arange(A.SR * 6) / A.SR
        voice = (0.25 * np.sin(2 * np.pi * 180 * t)).astype('float32')
        voice[A.SR * 2:A.SR * 3] = 0  # a pause between lines
        music = (0.9 * np.sin(2 * np.pi * 220 * t)).astype('float32')  # a mastered track: louder than the voice
        out = A.level_music(music, A.speech_db(voice))
        self.assertAlmostEqual(A.speech_db(voice) - A.music_db(out), A.MUSIC_UNDER_VOICE_DB, delta=0.5)
        self.assertGreaterEqual(A.MUSIC_UNDER_VOICE_DB, 15)

    def test_silence_stays_silent_and_the_mix_has_no_fixed_music_gain(self):
        import inspect
        import numpy as np
        from studio import audio as A
        self.assertEqual(float(np.abs(A.level_music(np.zeros(A.SR, 'float32'), -20.0)).max()), 0.0)
        self.assertNotIn('volume=0.55', inspect.getsource(A.build_mix))

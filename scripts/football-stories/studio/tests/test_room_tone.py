import unittest
import numpy as np
from studio import audio


class RoomTone(unittest.TestCase):
    def arrays(self, quiet_from, quiet_to, n_s=20):
        n = n_s * audio.SR
        z = lambda: np.zeros(n, 'float32')
        voice = z()
        t = np.arange(n) / audio.SR
        voice[:] = 0.2 * np.sin(2 * np.pi * 220 * t)
        voice[int(quiet_from * audio.SR):int(quiet_to * audio.SR)] = 0
        return voice, z(), z(), z()

    def test_a_long_silence_gets_room_tone_and_speech_does_not(self):
        v, m, s, c = self.arrays(5, 12)
        r = audio.room_tone(v, m, s, c)
        self.assertGreater(float(np.max(np.abs(r[6 * audio.SR:11 * audio.SR]))), 0)
        self.assertEqual(float(np.max(np.abs(r[:4 * audio.SR]))), 0)
        self.assertEqual(float(np.max(np.abs(r[13 * audio.SR:]))), 0)

    def test_the_tone_is_above_the_dead_air_threshold_but_soft(self):
        v, m, s, c = self.arrays(2, 18)
        r = audio.room_tone(v, m, s, c)[4 * audio.SR:16 * audio.SR]
        db = 20 * np.log10(float(np.sqrt(np.mean(r ** 2))))
        self.assertGreater(db, -45)
        self.assertLess(db, -38)

    def test_a_short_pause_is_left_alone(self):
        v, m, s, c = self.arrays(5, 6.5)
        self.assertEqual(float(np.max(np.abs(audio.room_tone(v, m, s, c)))), 0)


if __name__ == '__main__':
    unittest.main()

"""Owner rule (5.11.2026, narrowed 15.11.2026): every film is scored only with the DubelTeam tracks the owner made."""
from __future__ import annotations

import json
import os
import unittest
from pathlib import Path

os.environ.setdefault('STORIES_MUSIC_FETCH', '0')

from studio import audio as A  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


class OwnerMusic(unittest.TestCase):
    def test_only_owner_tracks_are_ever_picked(self):
        owner = {t['id'] for t in A.owner_tracks()}
        self.assertEqual(len(owner), 8)
        self.assertTrue(all(t.startswith('dubelteam-') for t in owner), owner)
        self.assertNotIn('helland-clowns', owner)
        self.assertNotIn('pufino-rock-me-now', owner)   # retired 15.11.2026
        for t in A.owner_tracks():
            self.assertEqual(t['artist'], 'DubelTeam')
            self.assertTrue((A.MUSIC_DIR / t['file']).exists(), t['file'])
        for tags in (['laugh'], ['drive'], ['heartbreak'], ['vlog'], []):
            self.assertTrue(set(A.resolve_music('auto', tags, 'x')) <= owner)
        self.assertNotIn('helland-clowns', A.resolve_music('track:helland-clowns', ['laugh']))
        self.assertEqual(A.resolve_music('track:dubelteam-a-stand-of-thousands', ['sad'])[0], 'dubelteam-a-stand-of-thousands')
        self.assertNotEqual(A.resolve_music('track:pufino-rock-me-now', ['sad'])[0], 'pufino-rock-me-now')

    def test_mood_leads_the_choice(self):
        self.assertIn(A.resolve_music('auto', ['triumph'], 's')[0], {'dubelteam-ninety-minutes-of-glory'})
        self.assertIn(A.resolve_music('auto', ['heartbreak'], 's')[0], {'dubelteam-a-seat-by-the-exit', 'dubelteam-before-the-collapse'})
        self.assertIn(A.resolve_music('auto', ['classified'], 's')[0], {'dubelteam-under-the-iron-watch', 'dubelteam-before-the-collapse'})

    def test_free_to_use_tracks_carry_their_attribution_and_are_never_committed(self):
        idx = json.loads((A.MUSIC_DIR / 'index.json').read_text())
        for t in idx['tracks']:
            if 'freetouse' in (t.get('origin') or ''):
                self.assertTrue(t['file'].startswith('cache/'), t['id'])
                self.assertIn('freetouse.com/music', t['credit_source'])
                self.assertTrue(t.get('drive', {}).get('folder'))
        gi = (ROOT.parents[1] / '.gitignore').read_text()
        self.assertIn('scripts/football-stories/studio/kit/music/cache/', gi)

    def test_a_missing_track_falls_to_the_next_owner_track_never_the_synth(self):
        import numpy as np
        secs = [{'start': 0.0, 'end': 4.0, 'mood': 'tension'}]
        out, used = A.owner_score(secs, ['pufino-rock-me-now', 'dubelteam-under-the-iron-watch'])  # the first is on Drive only (no fetch in tests)
        self.assertEqual(used, 'dubelteam-under-the-iron-watch')
        self.assertGreater(float(np.abs(out).max()), 0)

    def test_the_description_credits_dubelteam(self):
        for t in A.owner_tracks():
            self.assertTrue(t['credit'].endswith('DubelTeam'), t['credit'])

    def test_classified_tones_name_owner_tracks(self):
        man = json.loads((ROOT / 'comic' / 'classified_manifest.json').read_text())
        owner = {t['id'] for t in A.owner_tracks()}
        for tone, v in man['tones'].items():
            self.assertIn(v['music'], owner, tone)


if __name__ == '__main__':
    unittest.main()

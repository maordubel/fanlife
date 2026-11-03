"""I WAS THERE — the survey measures, never guesses (scripts/football-stories/matchday/survey.py)."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from matchday import survey
from matchday.drive_fetch import folder_id


def clip(path: Path, size: str, created: str, extra: list[str] = ()) -> None:
    subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', f'testsrc2=s={size}:r=25:d=3', '-f', 'lavfi', '-i',
                    'sine=f=300:d=3', '-metadata', f'creation_time={created}', *extra, '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', str(path)], check=True)


@unittest.skipUnless(shutil.which('ffmpeg'), 'ffmpeg')
class SurveyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = Path(tempfile.mkdtemp())
        src = cls.d / 'in'
        (src / 'sub').mkdir(parents=True)
        clip(src / 'gate.mov', '640x360', '2026-10-25T16:40:00Z', ['-metadata', 'location=+31.9+034.7/'])
        clip(src / 'sub' / 'terrace.mp4', '360x640', '2026-10-25T21:30:00Z')   # 23:30 local, same matchday
        (src / 'broken.mp4').write_text('not a video')
        cls.inv = survey.survey(src, cls.d / 'out', sheet_frames=4)

    def test_every_clip_is_counted_or_reported(self):
        self.assertEqual(self.inv['totals']['clips'], 2)
        self.assertEqual([b['file'] for b in self.inv['unreadable']], ['broken.mp4'])

    def test_frame_shape_decides_the_format(self):
        by = {c['file']: c for c in self.inv['clips']}
        self.assertEqual(by['gate.mov']['serves'], 'wide')
        self.assertEqual(by['sub/terrace.mp4']['serves'], 'tall')

    def test_matchday_is_the_local_date(self):
        self.assertEqual(list(self.inv['matchdays']), ['2026-10-25'])

    def test_gps_is_flagged_and_not_printed_in_full(self):
        tags = {c['file']: c['identifying_tags'] for c in self.inv['clips']}['gate.mov']
        self.assertTrue(any('location' in k.lower() for k in tags))
        self.assertNotIn('+034.7', json.dumps(tags))

    def test_sheets_and_loudness_exist(self):
        for c in self.inv['clips']:
            self.assertTrue((self.d / 'out' / c['sheet']).exists())
            self.assertIsNotNone(c['audio']['lufs'])


class DriveTest(unittest.TestCase):
    def test_folder_id_from_any_link(self):
        self.assertEqual(folder_id('https://drive.google.com/drive/folders/1AbC-d_9?usp=sharing'), '1AbC-d_9')
        self.assertEqual(folder_id('1AbC-d_9'), '1AbC-d_9')


if __name__ == '__main__':
    unittest.main()
